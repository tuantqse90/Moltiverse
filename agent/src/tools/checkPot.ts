import { ethers, Contract, JsonRpcProvider } from 'ethers';

const LOBSTERPOT_ABI = [
  "function getCurrentRoundInfo() external view returns (uint256 round, uint256 startTime, uint256 endTime, uint256 potAmount, uint256 participantCount, bool isEnded)",
  "function getTimeRemaining() external view returns (uint256)",
  "function hasJoined(address agent) external view returns (bool)",
  "function getParticipants() external view returns (address[])",
];

export interface PotStatus {
  round: number;
  potAmount: string;
  participantCount: number;
  timeRemaining: number;
  isEnded: boolean;
  participants: string[];
}

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

export async function checkPotStatus(
  contractAddress: string,
  rpcUrl: string
): Promise<PotStatus> {
  return withRetry(async () => {
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, LOBSTERPOT_ABI, provider);

    // Sequential calls to reduce burst rate
    const roundInfo = await contract.getCurrentRoundInfo();
    await new Promise(resolve => setTimeout(resolve, 100));
    const timeRemaining = await contract.getTimeRemaining();
    await new Promise(resolve => setTimeout(resolve, 100));
    const participants = await contract.getParticipants();

    return {
      round: Number(roundInfo[0]),
      potAmount: ethers.formatEther(roundInfo[3]),
      participantCount: Number(roundInfo[4]),
      timeRemaining: Number(timeRemaining),
      isEnded: roundInfo[5],
      participants: participants as string[],
    };
  });
}

export async function checkHasJoined(
  contractAddress: string,
  rpcUrl: string,
  agentAddress: string
): Promise<boolean> {
  return withRetry(async () => {
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, LOBSTERPOT_ABI, provider);
    return await contract.hasJoined(agentAddress);
  });
}
