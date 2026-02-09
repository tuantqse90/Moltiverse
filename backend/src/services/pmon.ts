import { eq, sql, desc, or } from 'drizzle-orm';
import { db, pmonBalances, pmonTransactions, userAgentWallets, isDatabaseAvailable, type PMonBalance, type PMonTransaction } from '../db/index.js';

// Point values
export const PMON_POINTS = {
  // Gameplay
  JOIN_POT: 10,
  WIN_ROUND: 500,
  STREAK_WIN_2X: 750,
  STREAK_WIN_3X: 1000,
  FIRST_JOIN: 20,
  LUCKY_NUMBER: 50,

  // Social
  CHAT_MESSAGE: 1,
  SEND_DATE_INVITE: 5,
  ACCEPT_DATE: 10,
  COMPLETE_DATE: 20,
  FIVE_STAR_DATE: 30,
  NEW_RELATIONSHIP: 25,
  BECOME_PARTNERS: 100,

  // Profile
  COMPLETE_PROFILE: 50,
  CONNECT_TWITTER: 100,
  LEARN_SKILL: 20,
  DAILY_LOGIN: 5,
};

// Tier thresholds
export const PMON_TIERS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 20000,
  diamond: 100000,
};

export type PMonAction =
  | 'join_pot'
  | 'win_round'
  | 'streak_win'
  | 'first_join'
  | 'lucky_number'
  | 'chat_message'
  | 'send_date_invite'
  | 'accept_date'
  | 'complete_date'
  | 'five_star_date'
  | 'new_relationship'
  | 'become_partners'
  | 'complete_profile'
  | 'connect_twitter'
  | 'learn_skill'
  | 'daily_login'
  | 'leaderboard_reward'
  | 'redeem'
  | 'referral_bonus'
  | 'referral_signup'
  | 'achievement';

// In-memory cache
const balancesCache = new Map<string, PMonBalance>();
const transactionsCache: PMonTransaction[] = [];
let transactionIdCounter = 1;

export class PMonService {
  /**
   * Get user's pMON balance
   */
  static async getBalance(walletAddress: string): Promise<PMonBalance | null> {
    const addr = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return balancesCache.get(addr) || null;
    }

    const result = await db!
      .select()
      .from(pmonBalances)
      .where(eq(pmonBalances.walletAddress, addr))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Ensure user has a balance record
   */
  static async ensureBalance(walletAddress: string): Promise<PMonBalance> {
    const addr = walletAddress.toLowerCase();
    let balance = await this.getBalance(addr);

    if (!balance) {
      if (!isDatabaseAvailable()) {
        balance = {
          id: Date.now(),
          walletAddress: addr,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          tier: 'bronze',
          streakDays: 0,
          winStreak: 0,
          lastWinRound: null,
          totalWins: 0,
          totalJoins: 0,
          firstJoinCount: 0,
          lastActiveAt: new Date(),
          lastDailyClaimAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        balancesCache.set(addr, balance);
      } else {
        const result = await db!
          .insert(pmonBalances)
          .values({ walletAddress: addr, lastActiveAt: new Date() })
          .returning();
        balance = result[0];
      }
    }

    return balance!;
  }

  /**
   * Award pMON points to user
   */
  static async awardPoints(
    walletAddress: string,
    action: PMonAction,
    points: number,
    metadata?: Record<string, any>
  ): Promise<{ newBalance: number; pointsAwarded: number }> {
    const addr = walletAddress.toLowerCase();
    await this.ensureBalance(addr);

    // Record transaction
    const description = this.getActionDescription(action, points);

    if (!isDatabaseAvailable()) {
      const balance = balancesCache.get(addr)!;
      balance.balance = (balance.balance || 0) + points;
      balance.totalEarned = (balance.totalEarned || 0) + points;
      balance.lastActiveAt = new Date();
      balance.updatedAt = new Date();
      balance.tier = this.calculateTier(balance.totalEarned || 0);

      transactionsCache.push({
        id: transactionIdCounter++,
        walletAddress: addr,
        amount: points,
        action,
        description,
        metadata: metadata || null,
        createdAt: new Date(),
      });

      console.log(`[pMON] ${addr.slice(0, 8)}... earned ${points} pMON for ${action}`);
      return { newBalance: balance.balance, pointsAwarded: points };
    }

    // Update balance
    await db!
      .update(pmonBalances)
      .set({
        balance: sql`${pmonBalances.balance} + ${points}`,
        totalEarned: sql`${pmonBalances.totalEarned} + ${points}`,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pmonBalances.walletAddress, addr));

    // Record transaction
    await db!.insert(pmonTransactions).values({
      walletAddress: addr,
      amount: points,
      action,
      description,
      metadata: metadata || null,
    });

    // Update tier
    const updatedBalance = await this.getBalance(addr);
    const newTier = this.calculateTier(updatedBalance?.totalEarned || 0);
    if (newTier !== updatedBalance?.tier) {
      await db!
        .update(pmonBalances)
        .set({ tier: newTier })
        .where(eq(pmonBalances.walletAddress, addr));
    }

    console.log(`[pMON] ${addr.slice(0, 8)}... earned ${points} pMON for ${action}`);
    return { newBalance: updatedBalance?.balance || 0, pointsAwarded: points };
  }

  /**
   * Deduct pMON points from a single wallet
   */
  static async deductPoints(
    walletAddress: string,
    points: number,
    action: string,
    description: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const addr = walletAddress.toLowerCase();
    const balance = await this.getBalance(addr);

    if (!balance || (balance.balance || 0) < points) {
      return { success: false, newBalance: balance?.balance || 0, error: 'Insufficient balance' };
    }

    if (!isDatabaseAvailable()) {
      const cachedBalance = balancesCache.get(addr);
      if (cachedBalance) {
        cachedBalance.balance = (cachedBalance.balance || 0) - points;
        cachedBalance.totalSpent = (cachedBalance.totalSpent || 0) + points;
        cachedBalance.updatedAt = new Date();

        transactionsCache.push({
          id: transactionIdCounter++,
          walletAddress: addr,
          amount: -points,
          action,
          description,
          metadata: null,
          createdAt: new Date(),
        });

        return { success: true, newBalance: cachedBalance.balance };
      }
    }

    await db!
      .update(pmonBalances)
      .set({
        balance: sql`${pmonBalances.balance} - ${points}`,
        totalSpent: sql`${pmonBalances.totalSpent} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(pmonBalances.walletAddress, addr));

    await db!.insert(pmonTransactions).values({
      walletAddress: addr,
      amount: -points,
      action,
      description,
    });

    const newBalance = await this.getBalance(addr);
    console.log(`[pMON] ${addr.slice(0, 8)}... spent ${points} pMON for ${action}`);
    return { success: true, newBalance: newBalance?.balance || 0 };
  }

  /**
   * Deduct pMON from combined balance (owner first, then agent)
   */
  static async deductCombinedPoints(
    ownerAddress: string,
    points: number,
    action: string,
    description: string
  ): Promise<{ success: boolean; newCombinedBalance: number; deductedFrom: 'owner' | 'agent' | 'both'; error?: string }> {
    const addr = ownerAddress.toLowerCase();
    const combined = await this.getCombinedBalance(addr);

    // Check if combined balance is enough
    if (combined.combined.balance < points) {
      return {
        success: false,
        newCombinedBalance: combined.combined.balance,
        deductedFrom: 'owner',
        error: `Insufficient balance. Need ${points} pMON, have ${combined.combined.balance}`,
      };
    }

    const ownerBalance = combined.owner?.balance || 0;
    const agentBalance = combined.agent?.balance || 0;

    let remainingToDeduct = points;
    let deductedFrom: 'owner' | 'agent' | 'both' = 'owner';

    // Deduct from owner first
    if (ownerBalance > 0) {
      const deductFromOwner = Math.min(ownerBalance, remainingToDeduct);
      if (deductFromOwner > 0) {
        await this.deductPoints(addr, deductFromOwner, action, `${description} (from owner)`);
        remainingToDeduct -= deductFromOwner;
      }
    }

    // If still need to deduct more, use agent balance
    if (remainingToDeduct > 0 && combined.agentAddress && agentBalance > 0) {
      const deductFromAgent = Math.min(agentBalance, remainingToDeduct);
      if (deductFromAgent > 0) {
        await this.deductPoints(combined.agentAddress, deductFromAgent, action, `${description} (from agent)`);
        remainingToDeduct -= deductFromAgent;
        deductedFrom = ownerBalance > 0 ? 'both' : 'agent';
      }
    }

    // Get new combined balance
    const newCombined = await this.getCombinedBalance(addr);

    console.log(`[pMON] ${addr.slice(0, 8)}... spent ${points} pMON (combined) for ${action}`);
    return {
      success: true,
      newCombinedBalance: newCombined.combined.balance,
      deductedFrom,
    };
  }

  /**
   * Get agent wallet address for an owner
   */
  static async getAgentAddress(ownerAddress: string): Promise<string | null> {
    const addr = ownerAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return null;
    }

    const result = await db!
      .select({ agentAddress: userAgentWallets.agentAddress })
      .from(userAgentWallets)
      .where(eq(userAgentWallets.ownerAddress, addr))
      .limit(1);

    return result[0]?.agentAddress || null;
  }

  /**
   * Get combined pMON balance (owner + agent)
   */
  static async getCombinedBalance(walletAddress: string): Promise<{
    owner: PMonBalance | null;
    agent: PMonBalance | null;
    agentAddress: string | null;
    combined: {
      balance: number;
      totalEarned: number;
      tier: string;
    };
  }> {
    const addr = walletAddress.toLowerCase();

    // Get owner balance
    const ownerBalance = await this.getBalance(addr);

    // Get agent address
    const agentAddress = await this.getAgentAddress(addr);

    // Get agent balance if exists
    let agentBalance: PMonBalance | null = null;
    if (agentAddress) {
      agentBalance = await this.getBalance(agentAddress);
    }

    // Calculate combined totals
    const combinedBalance = (ownerBalance?.balance || 0) + (agentBalance?.balance || 0);
    const combinedTotalEarned = (ownerBalance?.totalEarned || 0) + (agentBalance?.totalEarned || 0);
    const combinedTier = this.calculateTier(combinedTotalEarned);

    return {
      owner: ownerBalance,
      agent: agentBalance,
      agentAddress,
      combined: {
        balance: combinedBalance,
        totalEarned: combinedTotalEarned,
        tier: combinedTier,
      },
    };
  }

  /**
   * Get combined transaction history (owner + agent)
   */
  static async getCombinedHistory(walletAddress: string, limit: number = 50): Promise<Array<PMonTransaction & { source: 'owner' | 'agent' }>> {
    const addr = walletAddress.toLowerCase();
    const agentAddress = await this.getAgentAddress(addr);

    if (!isDatabaseAvailable()) {
      const ownerTxs = transactionsCache
        .filter(t => t.walletAddress === addr)
        .map(t => ({ ...t, source: 'owner' as const }));

      const agentTxs = agentAddress
        ? transactionsCache
            .filter(t => t.walletAddress === agentAddress)
            .map(t => ({ ...t, source: 'agent' as const }))
        : [];

      return [...ownerTxs, ...agentTxs]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, limit);
    }

    // If no agent, just return owner history
    if (!agentAddress) {
      const history = await this.getHistory(addr, limit);
      return history.map(t => ({ ...t, source: 'owner' as const }));
    }

    // Get combined history from both addresses
    const results = await db!
      .select()
      .from(pmonTransactions)
      .where(or(
        eq(pmonTransactions.walletAddress, addr),
        eq(pmonTransactions.walletAddress, agentAddress)
      ))
      .orderBy(desc(pmonTransactions.createdAt))
      .limit(limit);

    return results.map(t => ({
      ...t,
      source: t.walletAddress === addr ? 'owner' as const : 'agent' as const,
    }));
  }

  /**
   * Get transaction history
   */
  static async getHistory(walletAddress: string, limit: number = 50): Promise<PMonTransaction[]> {
    const addr = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return transactionsCache
        .filter(t => t.walletAddress === addr)
        .slice(-limit)
        .reverse();
    }

    return db!
      .select()
      .from(pmonTransactions)
      .where(eq(pmonTransactions.walletAddress, addr))
      .orderBy(desc(pmonTransactions.createdAt))
      .limit(limit);
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 20): Promise<Array<PMonBalance & { rank: number }>> {
    if (!isDatabaseAvailable()) {
      const sorted = Array.from(balancesCache.values())
        .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
        .slice(0, limit);

      return sorted.map((b, i) => ({ ...b, rank: i + 1 }));
    }

    const results = await db!
      .select()
      .from(pmonBalances)
      .orderBy(desc(pmonBalances.totalEarned))
      .limit(limit);

    return results.map((b, i) => ({ ...b, rank: i + 1 }));
  }

  /**
   * Claim daily login bonus
   */
  static async claimDailyBonus(walletAddress: string): Promise<{ success: boolean; points?: number; error?: string }> {
    const addr = walletAddress.toLowerCase();
    const balance = await this.ensureBalance(addr);

    const now = new Date();
    const lastClaim = balance.lastDailyClaimAt;

    // Check if already claimed today
    if (lastClaim) {
      const lastClaimDate = new Date(lastClaim);
      const isSameDay =
        lastClaimDate.getUTCFullYear() === now.getUTCFullYear() &&
        lastClaimDate.getUTCMonth() === now.getUTCMonth() &&
        lastClaimDate.getUTCDate() === now.getUTCDate();

      if (isSameDay) {
        return { success: false, error: 'Already claimed today' };
      }
    }

    // Update last claim time
    if (!isDatabaseAvailable()) {
      balance.lastDailyClaimAt = now;
    } else {
      await db!
        .update(pmonBalances)
        .set({ lastDailyClaimAt: now })
        .where(eq(pmonBalances.walletAddress, addr));
    }

    // Award points
    const result = await this.awardPoints(addr, 'daily_login', PMON_POINTS.DAILY_LOGIN);
    return { success: true, points: result.pointsAwarded };
  }

  /**
   * Calculate tier based on total earned
   */
  static calculateTier(totalEarned: number): string {
    if (totalEarned >= PMON_TIERS.diamond) return 'diamond';
    if (totalEarned >= PMON_TIERS.platinum) return 'platinum';
    if (totalEarned >= PMON_TIERS.gold) return 'gold';
    if (totalEarned >= PMON_TIERS.silver) return 'silver';
    return 'bronze';
  }

  /**
   * Get action description
   */
  static getActionDescription(action: PMonAction, points: number): string {
    const descriptions: Record<PMonAction, string> = {
      join_pot: 'Joined the pot',
      win_round: 'Won a round',
      streak_win: 'Streak win bonus',
      first_join: 'First to join round',
      lucky_number: 'Lucky number bonus',
      chat_message: 'Sent chat message',
      send_date_invite: 'Sent date invitation',
      accept_date: 'Accepted date',
      complete_date: 'Completed date',
      five_star_date: '5-star date bonus',
      new_relationship: 'New relationship level',
      become_partners: 'Became partners',
      complete_profile: 'Completed profile',
      connect_twitter: 'Connected Twitter',
      learn_skill: 'Learned a skill',
      daily_login: 'Daily login bonus',
      leaderboard_reward: 'Leaderboard reward',
      redeem: 'Redeemed item',
      referral_bonus: 'Referral bonus',
      referral_signup: 'Referral signup bonus',
      achievement: 'Achievement unlocked',
    };

    return `${descriptions[action]} (+${points} pMON)`;
  }

  /**
   * Get tier info
   */
  static getTierInfo(tier: string) {
    const tiers: Record<string, { name: string; emoji: string; color: string; nextTier?: string; nextThreshold?: number }> = {
      bronze: { name: 'Bronze', emoji: '🥉', color: '#CD7F32', nextTier: 'silver', nextThreshold: PMON_TIERS.silver },
      silver: { name: 'Silver', emoji: '🥈', color: '#C0C0C0', nextTier: 'gold', nextThreshold: PMON_TIERS.gold },
      gold: { name: 'Gold', emoji: '🥇', color: '#FFD700', nextTier: 'platinum', nextThreshold: PMON_TIERS.platinum },
      platinum: { name: 'Platinum', emoji: '💎', color: '#E5E4E2', nextTier: 'diamond', nextThreshold: PMON_TIERS.diamond },
      diamond: { name: 'Diamond', emoji: '💠', color: '#B9F2FF' },
    };

    return tiers[tier] || tiers.bronze;
  }
}

export default PMonService;
