import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import { EventEmitter } from 'events';

// Retry with exponential backoff for rate limit handling
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.info?.error?.code === -32007 ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('request limit');

      if (isRateLimit && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.log(`⏳ Rate limited, retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const LOBSTERPOT_ABI = [
  "function joinPot() external payable",
  "function drawWinner() external",
  "function forceNewRound() external",
  "function getCurrentRoundInfo() external view returns (uint256 round, uint256 startTime, uint256 endTime, uint256 potAmount, uint256 participantCount, bool isEnded)",
  "function getParticipants() external view returns (address[])",
  "function getTimeRemaining() external view returns (uint256)",
  "function hasJoined(address agent) external view returns (bool)",
  "function getAgentStats(address agent) external view returns (uint256 played, uint256 won, uint256 winnings)",
  "function getRoundInfo(uint256 round) external view returns (address winner, uint256 prize, uint256 participantCount)",
  "function ENTRY_FEE() external view returns (uint256)",
  "function currentRound() external view returns (uint256)"
];

export interface RoundInfo {
  round: number;
  startTime: number;
  endTime: number;
  potAmount: string;
  participantCount: number;
  isEnded: boolean;
  timeRemaining: number;
}

export interface AgentStats {
  played: number;
  won: number;
  winnings: string;
}

export interface RoundHistory {
  round: number;
  winner: string;
  prize: string;
  participantCount: number;
}

export class BlockchainService extends EventEmitter {
  private provider: JsonRpcProvider;
  private contract: Contract;
  private wallet?: Wallet;
  private pollingInterval?: NodeJS.Timeout;
  private lastRoundInfo?: RoundInfo;
  private lastParticipants: string[] = [];

  constructor() {
    super();
    const rpcUrl = process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz';
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.warn('CONTRACT_ADDRESS not set - blockchain service running in limited mode');
      this.provider = new JsonRpcProvider(rpcUrl);
      this.contract = new Contract(ethers.ZeroAddress, LOBSTERPOT_ABI, this.provider);
      return;
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.contract = new Contract(contractAddress, LOBSTERPOT_ABI, this.provider);

    // Setup wallet if private key provided (for backend operations)
    if (process.env.PRIVATE_KEY) {
      this.wallet = new Wallet(process.env.PRIVATE_KEY, this.provider);
      this.contract = this.contract.connect(this.wallet) as Contract;
    }
  }

  async getCurrentRoundInfo(): Promise<RoundInfo> {
    return withRetry(async () => {
      const [round, startTime, endTime, potAmount, participantCount, isEnded] =
        await this.contract.getCurrentRoundInfo();
      await new Promise(resolve => setTimeout(resolve, 100));
      const timeRemaining = await this.contract.getTimeRemaining();

      return {
        round: Number(round),
        startTime: Number(startTime),
        endTime: Number(endTime),
        potAmount: ethers.formatEther(potAmount),
        participantCount: Number(participantCount),
        isEnded,
        timeRemaining: Number(timeRemaining),
      };
    });
  }

  async getParticipants(): Promise<string[]> {
    return withRetry(async () => {
      return await this.contract.getParticipants();
    });
  }

  async hasJoined(address: string): Promise<boolean> {
    return withRetry(async () => {
      return await this.contract.hasJoined(address);
    });
  }

  async getAgentStats(address: string): Promise<AgentStats> {
    return withRetry(async () => {
      const [played, won, winnings] = await this.contract.getAgentStats(address);
      return {
        played: Number(played),
        won: Number(won),
        winnings: ethers.formatEther(winnings),
      };
    });
  }

  async getRoundHistory(fromRound: number, toRound: number): Promise<RoundHistory[]> {
    return withRetry(async () => {
      const history: RoundHistory[] = [];

      for (let i = fromRound; i <= toRound; i++) {
        const [winner, prize, participantCount] = await this.contract.getRoundInfo(i);
        if (winner !== ethers.ZeroAddress) {
          history.push({
            round: i,
            winner,
            prize: ethers.formatEther(prize),
            participantCount: Number(participantCount),
          });
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between rounds
      }

      return history.reverse();
    });
  }

  async drawWinner(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }
    const tx = await this.contract.drawWinner();
    await tx.wait();
    return tx.hash;
  }

  async forceNewRound(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }
    const tx = await this.contract.forceNewRound();
    await tx.wait();
    return tx.hash;
  }

  // Polling-based event detection (Monad doesn't support eth_newFilter)
  startPolling(intervalMs: number = 3000) {
    console.log(`Starting blockchain polling every ${intervalMs}ms`);

    this.pollingInterval = setInterval(async () => {
      try {
        const roundInfo = await this.getCurrentRoundInfo();
        const participants = await this.getParticipants();

        // Detect new participants
        if (participants.length > this.lastParticipants.length) {
          const newParticipants = participants.slice(this.lastParticipants.length);
          for (const agent of newParticipants) {
            console.log(`New participant detected: ${agent}`);
            this.emit('LobsterJoined', agent, roundInfo.round, roundInfo.potAmount);
          }
        }

        // Detect round change (winner drawn)
        if (this.lastRoundInfo && roundInfo.round > this.lastRoundInfo.round) {
          // A new round started, meaning previous round had a winner
          const prevRound = roundInfo.round - 1;
          try {
            const [winner, prize, count] = await this.contract.getRoundInfo(prevRound);
            if (winner !== ethers.ZeroAddress) {
              console.log(`Winner detected for round ${prevRound}: ${winner}`);
              this.emit('LobsterBoiled', winner, ethers.formatEther(prize), prevRound, Number(count));
            }
          } catch (e) {
            // Ignore errors fetching previous round
          }
          this.emit('RoundStarted', roundInfo.round, roundInfo.startTime, roundInfo.endTime);
        }

        this.lastRoundInfo = roundInfo;
        this.lastParticipants = participants;

      } catch (error: any) {
        // Silent retry on rate limit, only log other errors
        const isRateLimit = error?.info?.error?.code === -32007;
        if (!isRateLimit) {
          console.error('Polling error:', error.message || error);
        }
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      console.log('Blockchain polling stopped');
    }
  }

  // Legacy methods for compatibility (now using EventEmitter)
  onLobsterJoined(callback: (agent: string, round: number, potTotal: string) => void) {
    this.on('LobsterJoined', callback);
  }

  onLobsterBoiled(callback: (winner: string, amount: string, round: number, count: number) => void) {
    this.on('LobsterBoiled', callback);
  }

  onRoundStarted(callback: (round: number, startTime: number, endTime: number) => void) {
    this.on('RoundStarted', callback);
  }

  removeAllListeners(): this {
    super.removeAllListeners();
    this.stopPolling();
    return this;
  }
}
