import { PMonService } from './pmon.js';
import { DatingService } from './dating.js';

export interface SpinPrize {
  id: string;
  name: string;
  emoji: string;
  type: 'pmon' | 'date_token' | 'nothing' | 'jackpot';
  value: number;
  probability: number; // Weight for random selection
  color: string;
}

// Spin wheel prizes configuration
export const SPIN_PRIZES: SpinPrize[] = [
  { id: 'pmon_50', name: '50 pMON', emoji: '💎', type: 'pmon', value: 50, probability: 20, color: '#3B82F6' },
  { id: 'pmon_100', name: '100 pMON', emoji: '💎', type: 'pmon', value: 100, probability: 15, color: '#8B5CF6' },
  { id: 'pmon_200', name: '200 pMON', emoji: '💰', type: 'pmon', value: 200, probability: 10, color: '#EC4899' },
  { id: 'pmon_500', name: '500 pMON', emoji: '🤑', type: 'pmon', value: 500, probability: 5, color: '#F59E0B' },
  { id: 'date_token', name: 'Date Token', emoji: '💕', type: 'date_token', value: 1, probability: 10, color: '#EF4444' },
  { id: 'nothing_1', name: 'Try Again', emoji: '🦞', type: 'nothing', value: 0, probability: 15, color: '#6B7280' },
  { id: 'nothing_2', name: 'Almost!', emoji: '😅', type: 'nothing', value: 0, probability: 15, color: '#374151' },
  { id: 'jackpot', name: 'JACKPOT 2000', emoji: '🎰', type: 'jackpot', value: 2000, probability: 2, color: '#FBBF24' },
  { id: 'pmon_25', name: '25 pMON', emoji: '✨', type: 'pmon', value: 25, probability: 8, color: '#10B981' },
];

// Cost to spin
export const SPIN_COST = 100; // pMON

export interface SpinResult {
  prize: SpinPrize;
  prizeIndex: number;
  newPmonBalance: number;
  isJackpot: boolean;
}

// In-memory spin history for rate limiting
const spinHistory = new Map<string, number[]>(); // address -> timestamps
const SPIN_COOLDOWN = 5000; // 5 seconds between spins

export class SpinService {
  /**
   * Get all prizes for the wheel
   */
  static getPrizes(): SpinPrize[] {
    return SPIN_PRIZES;
  }

  /**
   * Get spin cost
   */
  static getCost(): number {
    return SPIN_COST;
  }

  /**
   * Check if user can spin (uses combined owner + agent balance)
   */
  static async canSpin(walletAddress: string): Promise<{ canSpin: boolean; reason?: string; combinedBalance?: number }> {
    const addr = walletAddress.toLowerCase();

    // Check cooldown
    const history = spinHistory.get(addr) || [];
    const now = Date.now();
    const recentSpins = history.filter(t => now - t < SPIN_COOLDOWN);

    if (recentSpins.length > 0) {
      const waitTime = Math.ceil((SPIN_COOLDOWN - (now - recentSpins[0])) / 1000);
      return { canSpin: false, reason: `Please wait ${waitTime}s before spinning again` };
    }

    // Check combined balance (owner + agent)
    const combined = await PMonService.getCombinedBalance(addr);
    const totalBalance = combined.combined.balance;
    if (totalBalance < SPIN_COST) {
      return { canSpin: false, reason: `Need ${SPIN_COST} pMON to spin (you have ${totalBalance})`, combinedBalance: totalBalance };
    }

    return { canSpin: true, combinedBalance: totalBalance };
  }

  /**
   * Spin the wheel! (uses combined owner + agent balance)
   */
  static async spin(walletAddress: string): Promise<SpinResult | { error: string }> {
    const addr = walletAddress.toLowerCase();

    // Check if can spin
    const check = await this.canSpin(addr);
    if (!check.canSpin) {
      return { error: check.reason! };
    }

    // Deduct spin cost from combined balance (owner first, then agent)
    const deductResult = await PMonService.deductCombinedPoints(addr, SPIN_COST, 'spin', 'Lucky Spin');
    if (!deductResult.success) {
      return { error: deductResult.error || 'Failed to deduct pMON' };
    }

    // Record spin time
    const history = spinHistory.get(addr) || [];
    history.push(Date.now());
    // Keep only last 10 entries
    if (history.length > 10) history.shift();
    spinHistory.set(addr, history);

    // Calculate winning prize based on probability
    const prize = this.selectPrize();
    const prizeIndex = SPIN_PRIZES.findIndex(p => p.id === prize.id);

    // Award prize (always to owner wallet)
    let newCombinedBalance = deductResult.newCombinedBalance;

    if (prize.type === 'pmon' || prize.type === 'jackpot') {
      await PMonService.awardPoints(addr, 'leaderboard_reward', prize.value, { prize: prize.name, source: 'spin' });
      newCombinedBalance += prize.value;
    } else if (prize.type === 'date_token') {
      await DatingService.awardDateTokens(addr, prize.value);
    }

    return {
      prize,
      prizeIndex,
      newPmonBalance: newCombinedBalance,
      isJackpot: prize.type === 'jackpot',
    };
  }

  /**
   * Select a prize based on weighted probability
   */
  private static selectPrize(): SpinPrize {
    const totalWeight = SPIN_PRIZES.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;

    for (const prize of SPIN_PRIZES) {
      random -= prize.probability;
      if (random <= 0) {
        return prize;
      }
    }

    // Fallback to last prize
    return SPIN_PRIZES[SPIN_PRIZES.length - 1];
  }

  /**
   * Get user's spin stats (uses combined owner + agent balance)
   */
  static async getStats(walletAddress: string): Promise<{
    balance: number;
    ownerBalance: number;
    agentBalance: number;
    canSpin: boolean;
    spinCost: number;
    cooldownRemaining: number;
  }> {
    const addr = walletAddress.toLowerCase();
    const combined = await PMonService.getCombinedBalance(addr);
    const check = await this.canSpin(addr);

    // Calculate cooldown
    const history = spinHistory.get(addr) || [];
    const now = Date.now();
    const lastSpin = history[history.length - 1];
    const cooldownRemaining = lastSpin ? Math.max(0, SPIN_COOLDOWN - (now - lastSpin)) : 0;

    return {
      balance: combined.combined.balance,
      ownerBalance: combined.owner?.balance || 0,
      agentBalance: combined.agent?.balance || 0,
      canSpin: check.canSpin,
      spinCost: SPIN_COST,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
    };
  }
}
