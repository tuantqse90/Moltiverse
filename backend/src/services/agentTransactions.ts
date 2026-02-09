import { eq, desc } from 'drizzle-orm';
import { db, agentTransactions, isDatabaseAvailable, type AgentTransaction } from '../db/index.js';

export type TransactionType = 'deposit' | 'withdraw' | 'bet' | 'win';

export class AgentTransactionService {
  /**
   * Record a transaction
   */
  static async record(
    ownerAddress: string,
    agentAddress: string,
    type: TransactionType,
    amount: string,
    txHash?: string,
    description?: string
  ): Promise<AgentTransaction | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }

    const result = await db!
      .insert(agentTransactions)
      .values({
        ownerAddress: ownerAddress.toLowerCase(),
        agentAddress: agentAddress.toLowerCase(),
        type,
        amount,
        txHash,
        description,
      })
      .returning();

    return result[0] || null;
  }

  /**
   * Get transaction history for an agent
   */
  static async getHistory(
    ownerAddress: string,
    limit = 50,
    offset = 0
  ): Promise<AgentTransaction[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const addr = ownerAddress.toLowerCase();

    return db!
      .select()
      .from(agentTransactions)
      .where(eq(agentTransactions.ownerAddress, addr))
      .orderBy(desc(agentTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get transaction count
   */
  static async getCount(ownerAddress: string): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }

    const addr = ownerAddress.toLowerCase();
    const result = await db!
      .select()
      .from(agentTransactions)
      .where(eq(agentTransactions.ownerAddress, addr));

    return result.length;
  }

  /**
   * Get summary stats
   */
  static async getSummary(ownerAddress: string): Promise<{
    totalDeposits: number;
    totalWithdraws: number;
    totalBets: number;
    totalWins: number;
    netFlow: number;
  }> {
    if (!isDatabaseAvailable()) {
      return {
        totalDeposits: 0,
        totalWithdraws: 0,
        totalBets: 0,
        totalWins: 0,
        netFlow: 0,
      };
    }

    const transactions = await this.getHistory(ownerAddress, 1000);

    let totalDeposits = 0;
    let totalWithdraws = 0;
    let totalBets = 0;
    let totalWins = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      switch (tx.type) {
        case 'deposit':
          totalDeposits += amount;
          break;
        case 'withdraw':
          totalWithdraws += amount;
          break;
        case 'bet':
          totalBets += amount;
          break;
        case 'win':
          totalWins += amount;
          break;
      }
    }

    return {
      totalDeposits,
      totalWithdraws,
      totalBets,
      totalWins,
      netFlow: totalDeposits - totalWithdraws + totalWins - totalBets,
    };
  }
}
