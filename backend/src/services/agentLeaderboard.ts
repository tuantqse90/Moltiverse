import { desc, sql } from 'drizzle-orm';
import { db, userAgentWallets, isDatabaseAvailable } from '../db/index.js';

export interface LeaderboardEntry {
  rank: number;
  ownerAddress: string;
  agentAddress: string;
  agentName: string | null;
  personality: string | null;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalProfit: number;
  currentBalance: string;
  isEnabled: boolean;
}

export class AgentLeaderboardService {
  /**
   * Get leaderboard sorted by wins
   */
  static async getByWins(limit = 20): Promise<LeaderboardEntry[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const agents = await db!
      .select()
      .from(userAgentWallets)
      .orderBy(desc(userAgentWallets.gamesWon))
      .limit(limit);

    return agents.map((agent, index) => this.toLeaderboardEntry(agent, index + 1));
  }

  /**
   * Get leaderboard sorted by win rate (min 5 games)
   */
  static async getByWinRate(limit = 20): Promise<LeaderboardEntry[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const agents = await db!
      .select()
      .from(userAgentWallets)
      .where(sql`${userAgentWallets.gamesPlayed} >= 5`)
      .orderBy(
        desc(sql`CASE WHEN ${userAgentWallets.gamesPlayed} > 0
          THEN ${userAgentWallets.gamesWon}::float / ${userAgentWallets.gamesPlayed}::float
          ELSE 0 END`)
      )
      .limit(limit);

    return agents.map((agent, index) => this.toLeaderboardEntry(agent, index + 1));
  }

  /**
   * Get leaderboard sorted by profit
   */
  static async getByProfit(limit = 20): Promise<LeaderboardEntry[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const agents = await db!
      .select()
      .from(userAgentWallets)
      .orderBy(
        desc(sql`(${userAgentWallets.totalWinnings}::numeric - ${userAgentWallets.totalLosses}::numeric)`)
      )
      .limit(limit);

    return agents.map((agent, index) => this.toLeaderboardEntry(agent, index + 1));
  }

  /**
   * Get leaderboard sorted by games played
   */
  static async getByGamesPlayed(limit = 20): Promise<LeaderboardEntry[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const agents = await db!
      .select()
      .from(userAgentWallets)
      .orderBy(desc(userAgentWallets.gamesPlayed))
      .limit(limit);

    return agents.map((agent, index) => this.toLeaderboardEntry(agent, index + 1));
  }

  /**
   * Get user's rank
   */
  static async getUserRank(ownerAddress: string, sortBy: 'wins' | 'winRate' | 'profit' | 'games' = 'wins'): Promise<number | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }

    const addr = ownerAddress.toLowerCase();
    let leaderboard: LeaderboardEntry[];

    switch (sortBy) {
      case 'winRate':
        leaderboard = await this.getByWinRate(1000);
        break;
      case 'profit':
        leaderboard = await this.getByProfit(1000);
        break;
      case 'games':
        leaderboard = await this.getByGamesPlayed(1000);
        break;
      default:
        leaderboard = await this.getByWins(1000);
    }

    const userIndex = leaderboard.findIndex(e => e.ownerAddress === addr);
    return userIndex >= 0 ? userIndex + 1 : null;
  }

  /**
   * Convert agent record to leaderboard entry
   */
  private static toLeaderboardEntry(agent: any, rank: number): LeaderboardEntry {
    const gamesPlayed = agent.gamesPlayed || 0;
    const gamesWon = agent.gamesWon || 0;
    const totalWinnings = parseFloat(agent.totalWinnings || '0');
    const totalLosses = parseFloat(agent.totalLosses || '0');

    return {
      rank,
      ownerAddress: agent.ownerAddress,
      agentAddress: agent.agentAddress,
      agentName: agent.agentName,
      personality: agent.personality,
      gamesPlayed,
      gamesWon,
      winRate: gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0,
      totalProfit: totalWinnings - totalLosses,
      currentBalance: agent.currentBalance || '0',
      isEnabled: agent.isEnabled || false,
    };
  }
}
