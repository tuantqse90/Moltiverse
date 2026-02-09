import { db, isDatabaseAvailable } from '../db/index.js';
import { lotteryHistory } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export interface GameRound {
  id: number;
  roundNumber: number;
  winnerAddress: string | null;
  prizeAmount: string | null;
  participantCount: number | null;
  endedAt: Date | null;
  createdAt: Date | null;
}

export class GameHistoryService {
  /**
   * Save a completed round to history
   */
  static async saveRound(data: {
    roundNumber: number;
    winnerAddress: string | null;
    prizeAmount: string;
    participantCount: number;
  }): Promise<boolean> {
    if (!isDatabaseAvailable()) {
      console.warn('Database not available, cannot save round history');
      return false;
    }

    try {
      // Check if round already exists
      const existing = await db!
        .select()
        .from(lotteryHistory)
        .where(eq(lotteryHistory.roundNumber, data.roundNumber))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Round ${data.roundNumber} already saved`);
        return true;
      }

      await db!.insert(lotteryHistory).values({
        roundNumber: data.roundNumber,
        winnerAddress: data.winnerAddress,
        prizeAmount: data.prizeAmount,
        participantCount: data.participantCount,
        endedAt: new Date(),
      });

      console.log(`Saved round ${data.roundNumber} to history`);
      return true;
    } catch (error) {
      console.error('Error saving round history:', error);
      return false;
    }
  }

  /**
   * Get game history (recent rounds)
   */
  static async getHistory(limit: number = 20, offset: number = 0): Promise<GameRound[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    try {
      const rounds = await db!
        .select()
        .from(lotteryHistory)
        .orderBy(desc(lotteryHistory.roundNumber))
        .limit(limit)
        .offset(offset);

      return rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        winnerAddress: r.winnerAddress,
        prizeAmount: r.prizeAmount,
        participantCount: r.participantCount,
        endedAt: r.endedAt,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching game history:', error);
      return [];
    }
  }

  /**
   * Get a specific round
   */
  static async getRound(roundNumber: number): Promise<GameRound | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }

    try {
      const [round] = await db!
        .select()
        .from(lotteryHistory)
        .where(eq(lotteryHistory.roundNumber, roundNumber))
        .limit(1);

      if (!round) return null;

      return {
        id: round.id,
        roundNumber: round.roundNumber,
        winnerAddress: round.winnerAddress,
        prizeAmount: round.prizeAmount,
        participantCount: round.participantCount,
        endedAt: round.endedAt,
        createdAt: round.createdAt,
      };
    } catch (error) {
      console.error('Error fetching round:', error);
      return null;
    }
  }

  /**
   * Get total rounds count
   */
  static async getTotalRounds(): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }

    try {
      const result = await db!.select().from(lotteryHistory);
      return result.length;
    } catch (error) {
      console.error('Error counting rounds:', error);
      return 0;
    }
  }

  /**
   * Get stats for a wallet
   */
  static async getWalletStats(address: string): Promise<{
    totalWins: number;
    totalPrize: string;
    gamesPlayed: number;
  }> {
    if (!isDatabaseAvailable()) {
      return { totalWins: 0, totalPrize: '0', gamesPlayed: 0 };
    }

    try {
      const wins = await db!
        .select()
        .from(lotteryHistory)
        .where(eq(lotteryHistory.winnerAddress, address.toLowerCase()));

      const totalWins = wins.length;
      const totalPrize = wins.reduce((sum, r) => sum + parseFloat(r.prizeAmount || '0'), 0);

      return {
        totalWins,
        totalPrize: totalPrize.toFixed(4),
        gamesPlayed: totalWins, // For now, just wins. Could track all participations later
      };
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      return { totalWins: 0, totalPrize: '0', gamesPlayed: 0 };
    }
  }
}
