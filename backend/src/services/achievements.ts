import { eq, and } from 'drizzle-orm';
import { db, achievements, userAchievements, userAgentWallets, pmonBalances, isDatabaseAvailable, type Achievement, type UserAchievement } from '../db/index.js';
import { PMonService } from './pmon.js';

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = [
  // Wins category
  { id: 'first_win', name: 'First Blood', description: 'Win your first round', emoji: '🏆', category: 'wins', requirement: 1, pmonReward: 50, rarity: 'common' },
  { id: 'wins_5', name: 'Getting Started', description: 'Win 5 rounds', emoji: '⭐', category: 'wins', requirement: 5, pmonReward: 100, rarity: 'common' },
  { id: 'wins_10', name: 'Rising Star', description: 'Win 10 rounds', emoji: '🌟', category: 'wins', requirement: 10, pmonReward: 200, rarity: 'rare' },
  { id: 'wins_25', name: 'Champion', description: 'Win 25 rounds', emoji: '👑', category: 'wins', requirement: 25, pmonReward: 500, rarity: 'rare' },
  { id: 'wins_50', name: 'Legend', description: 'Win 50 rounds', emoji: '🔥', category: 'wins', requirement: 50, pmonReward: 1000, rarity: 'epic' },
  { id: 'wins_100', name: 'Lobster Lord', description: 'Win 100 rounds', emoji: '🦞', category: 'wins', requirement: 100, pmonReward: 2500, rarity: 'legendary' },

  // Games category
  { id: 'games_10', name: 'Rookie', description: 'Play 10 games', emoji: '🎮', category: 'games', requirement: 10, pmonReward: 50, rarity: 'common' },
  { id: 'games_50', name: 'Regular', description: 'Play 50 games', emoji: '🎲', category: 'games', requirement: 50, pmonReward: 150, rarity: 'common' },
  { id: 'games_100', name: 'Dedicated', description: 'Play 100 games', emoji: '💪', category: 'games', requirement: 100, pmonReward: 300, rarity: 'rare' },
  { id: 'games_500', name: 'Hardcore', description: 'Play 500 games', emoji: '🏅', category: 'games', requirement: 500, pmonReward: 1000, rarity: 'epic' },

  // Streak category (based on pMON win streaks)
  { id: 'streak_2', name: 'Double Trouble', description: 'Win 2 rounds in a row', emoji: '2️⃣', category: 'streak', requirement: 2, pmonReward: 100, rarity: 'common' },
  { id: 'streak_3', name: 'Hat Trick', description: 'Win 3 rounds in a row', emoji: '🎩', category: 'streak', requirement: 3, pmonReward: 250, rarity: 'rare' },
  { id: 'streak_5', name: 'On Fire', description: 'Win 5 rounds in a row', emoji: '🔥', category: 'streak', requirement: 5, pmonReward: 500, rarity: 'epic' },
  { id: 'streak_10', name: 'Unstoppable', description: 'Win 10 rounds in a row', emoji: '💫', category: 'streak', requirement: 10, pmonReward: 2000, rarity: 'legendary' },

  // Special category
  { id: 'first_deposit', name: 'Investor', description: 'Make your first deposit to agent', emoji: '💰', category: 'special', requirement: 1, pmonReward: 25, rarity: 'common' },
  { id: 'agent_enabled', name: 'Automation', description: 'Enable your agent for the first time', emoji: '🤖', category: 'special', requirement: 1, pmonReward: 50, rarity: 'common' },
  { id: 'high_roller', name: 'High Roller', description: 'Have 1 MON in agent balance', emoji: '💎', category: 'special', requirement: 1, pmonReward: 200, rarity: 'rare' },
  { id: 'profit_master', name: 'Profit Master', description: 'Earn 0.5 MON in total profit', emoji: '📈', category: 'special', requirement: 1, pmonReward: 500, rarity: 'epic' },
];

export interface UserAchievementWithDetails extends Achievement {
  unlockedAt: Date | null;
  isUnlocked: boolean;
}

export class AchievementService {
  /**
   * Seed default achievements
   */
  static async seedAchievements(): Promise<void> {
    if (!isDatabaseAvailable()) return;

    console.log('Seeding achievements...');

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const existing = await db!
        .select()
        .from(achievements)
        .where(eq(achievements.achievementId, def.id))
        .limit(1);

      if (existing.length === 0) {
        await db!.insert(achievements).values({
          achievementId: def.id,
          name: def.name,
          description: def.description,
          emoji: def.emoji,
          category: def.category,
          requirement: def.requirement,
          pmonReward: def.pmonReward,
          rarity: def.rarity,
        });
        console.log(`  Created achievement: ${def.name}`);
      }
    }

    console.log('Achievement seeding complete!');
  }

  /**
   * Get all achievements with user's unlock status
   */
  static async getAllWithStatus(walletAddress: string): Promise<UserAchievementWithDetails[]> {
    if (!isDatabaseAvailable()) {
      return ACHIEVEMENT_DEFINITIONS.map(def => ({
        id: 0,
        achievementId: def.id,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        category: def.category,
        requirement: def.requirement,
        pmonReward: def.pmonReward,
        rarity: def.rarity,
        createdAt: new Date(),
        unlockedAt: null,
        isUnlocked: false,
      }));
    }

    const addr = walletAddress.toLowerCase();

    // Get all achievements
    const allAchievements = await db!.select().from(achievements);

    // Get user's unlocked achievements
    const userUnlocked = await db!
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.walletAddress, addr));

    const unlockedMap = new Map(userUnlocked.map(u => [u.achievementId, u.unlockedAt]));

    return allAchievements.map(ach => ({
      ...ach,
      unlockedAt: unlockedMap.get(ach.achievementId) || null,
      isUnlocked: unlockedMap.has(ach.achievementId),
    }));
  }

  /**
   * Check and unlock achievements for a user
   */
  static async checkAndUnlock(walletAddress: string): Promise<Achievement[]> {
    if (!isDatabaseAvailable()) return [];

    const addr = walletAddress.toLowerCase();
    const newlyUnlocked: Achievement[] = [];

    // Get user's stats from agent wallet
    const agentResult = await db!
      .select()
      .from(userAgentWallets)
      .where(eq(userAgentWallets.ownerAddress, addr))
      .limit(1);

    const agent = agentResult[0];

    // Get user's pMON balance for streak info
    const pmonResult = await db!
      .select()
      .from(pmonBalances)
      .where(eq(pmonBalances.walletAddress, addr))
      .limit(1);

    const pmon = pmonResult[0];

    // Get already unlocked
    const alreadyUnlocked = await db!
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.walletAddress, addr));

    const unlockedIds = new Set(alreadyUnlocked.map(u => u.achievementId));

    // Check each achievement
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (unlockedIds.has(def.id)) continue;

      let shouldUnlock = false;

      if (agent) {
        const gamesWon = agent.gamesWon || 0;
        const gamesPlayed = agent.gamesPlayed || 0;
        const currentBalance = parseFloat(agent.currentBalance || '0');
        const totalProfit = parseFloat(agent.totalWinnings || '0') - parseFloat(agent.totalLosses || '0');
        const depositedAmount = parseFloat(agent.depositedAmount || '0');

        switch (def.id) {
          // Wins
          case 'first_win': shouldUnlock = gamesWon >= 1; break;
          case 'wins_5': shouldUnlock = gamesWon >= 5; break;
          case 'wins_10': shouldUnlock = gamesWon >= 10; break;
          case 'wins_25': shouldUnlock = gamesWon >= 25; break;
          case 'wins_50': shouldUnlock = gamesWon >= 50; break;
          case 'wins_100': shouldUnlock = gamesWon >= 100; break;

          // Games
          case 'games_10': shouldUnlock = gamesPlayed >= 10; break;
          case 'games_50': shouldUnlock = gamesPlayed >= 50; break;
          case 'games_100': shouldUnlock = gamesPlayed >= 100; break;
          case 'games_500': shouldUnlock = gamesPlayed >= 500; break;

          // Special
          case 'first_deposit': shouldUnlock = depositedAmount > 0; break;
          case 'agent_enabled': shouldUnlock = agent.isEnabled === true; break;
          case 'high_roller': shouldUnlock = currentBalance >= 1; break;
          case 'profit_master': shouldUnlock = totalProfit >= 0.5; break;
        }
      }

      if (pmon) {
        const winStreak = pmon.winStreak || 0;

        switch (def.id) {
          case 'streak_2': shouldUnlock = winStreak >= 2; break;
          case 'streak_3': shouldUnlock = winStreak >= 3; break;
          case 'streak_5': shouldUnlock = winStreak >= 5; break;
          case 'streak_10': shouldUnlock = winStreak >= 10; break;
        }
      }

      if (shouldUnlock) {
        // Unlock the achievement
        await db!.insert(userAchievements).values({
          walletAddress: addr,
          achievementId: def.id,
        });

        // Award pMON
        if (def.pmonReward > 0) {
          await PMonService.awardPoints(addr, 'achievement', def.pmonReward, { achievementId: def.id });
        }

        // Get full achievement data
        const achResult = await db!
          .select()
          .from(achievements)
          .where(eq(achievements.achievementId, def.id))
          .limit(1);

        if (achResult[0]) {
          newlyUnlocked.push(achResult[0]);
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get user's unlocked achievement count
   */
  static async getUnlockedCount(walletAddress: string): Promise<{ unlocked: number; total: number }> {
    if (!isDatabaseAvailable()) {
      return { unlocked: 0, total: ACHIEVEMENT_DEFINITIONS.length };
    }

    const addr = walletAddress.toLowerCase();

    const unlocked = await db!
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.walletAddress, addr));

    return {
      unlocked: unlocked.length,
      total: ACHIEVEMENT_DEFINITIONS.length,
    };
  }

  /**
   * Get recent unlocks (for notifications)
   */
  static async getRecentUnlocks(walletAddress: string, limit = 5): Promise<(UserAchievement & { achievement: Achievement })[]> {
    if (!isDatabaseAvailable()) return [];

    const addr = walletAddress.toLowerCase();

    const recent = await db!
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.walletAddress, addr))
      .orderBy(userAchievements.unlockedAt)
      .limit(limit);

    const result = [];
    for (const ua of recent) {
      const ach = await db!
        .select()
        .from(achievements)
        .where(eq(achievements.achievementId, ua.achievementId))
        .limit(1);

      if (ach[0]) {
        result.push({ ...ua, achievement: ach[0] });
      }
    }

    return result;
  }
}
