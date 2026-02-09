import { eq, sql } from 'drizzle-orm';
import { db, agentSkills, agentSkillsLearned, isDatabaseAvailable, type AgentSkill, type NewAgentSkill } from '../db/index.js';

// Default LobsterPot skill
const LOBSTERPOT_SKILL: NewAgentSkill = {
  skillId: 'lobsterpot_join',
  name: 'LobsterPot Lottery',
  description: 'Learn how to join the LobsterPot lottery and compete for MON prizes. Join the pot, wait for the timer, and if you are lucky, win the entire pot!',
  category: 'lottery',
  difficulty: 'beginner',
  instructions: `
## How to Join LobsterPot

1. **Connect Wallet**: Connect your wallet to the LobsterPot dApp
2. **Check Entry Fee**: Current entry fee is 0.01 MON
3. **Join the Pot**: Click "Join Pot" and confirm the transaction
4. **Wait for Timer**: Each round lasts ~10 minutes
5. **Winner Selection**: Random winner is selected when timer ends
6. **Claim Prize**: Winner automatically receives 97.5% of the pot

## Tips
- Join early for better odds when pot is small
- Watch the chat for other lobsters joining
- Check your wallet balance before joining
  `,
  exampleCode: `
// Example: Auto-join LobsterPot using ethers.js
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
const entryFee = await contract.entryFee();
const tx = await contract.joinPot({ value: entryFee });
await tx.wait();
console.log('Joined the pot!');
  `,
  requiredEnv: {
    MONAD_RPC_URL: 'RPC endpoint for Monad network',
    CONTRACT_ADDRESS: 'LobsterPot contract address',
    PRIVATE_KEY: 'Wallet private key for transactions'
  },
};

// In-memory cache for when database is unavailable
const skillsCache = new Map<string, AgentSkill>();
const learnedCache = new Map<string, Set<string>>(); // agentAddress -> Set of skillIds

export class SkillService {
  /**
   * Initialize default skills
   */
  static async seedDefaultSkills(): Promise<void> {
    console.log('Seeding default skills...');

    const existing = await this.getSkill('lobsterpot_join');
    if (!existing) {
      await this.createSkill(LOBSTERPOT_SKILL);
      console.log('  Created skill: lobsterpot_join');
    } else {
      console.log('  Skill exists: lobsterpot_join');
    }

    console.log('Skill seeding complete!');
  }

  /**
   * Get skill by ID
   */
  static async getSkill(skillId: string): Promise<AgentSkill | null> {
    if (!isDatabaseAvailable()) {
      return skillsCache.get(skillId) || null;
    }

    const result = await db!
      .select()
      .from(agentSkills)
      .where(eq(agentSkills.skillId, skillId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get all skills
   */
  static async getAllSkills(): Promise<AgentSkill[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(skillsCache.values());
    }

    return db!.select().from(agentSkills);
  }

  /**
   * Create a new skill
   */
  static async createSkill(input: NewAgentSkill): Promise<AgentSkill> {
    if (!isDatabaseAvailable()) {
      const skill: AgentSkill = {
        id: Date.now(),
        ...input,
        timesLearned: 0,
        successRate: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AgentSkill;
      skillsCache.set(input.skillId, skill);
      return skill;
    }

    const result = await db!
      .insert(agentSkills)
      .values(input)
      .returning();

    return result[0];
  }

  /**
   * Record that an agent learned a skill
   */
  static async learnSkill(agentAddress: string, skillId: string): Promise<boolean> {
    const normalizedAddress = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      if (!learnedCache.has(normalizedAddress)) {
        learnedCache.set(normalizedAddress, new Set());
      }
      learnedCache.get(normalizedAddress)!.add(skillId);

      // Update times learned
      const skill = skillsCache.get(skillId);
      if (skill) {
        skill.timesLearned = (skill.timesLearned || 0) + 1;
      }
      return true;
    }

    // Check if already learned
    const existing = await db!
      .select()
      .from(agentSkillsLearned)
      .where(sql`${agentSkillsLearned.agentAddress} = ${normalizedAddress} AND ${agentSkillsLearned.skillId} = ${skillId}`)
      .limit(1);

    if (existing.length > 0) {
      return false; // Already learned
    }

    // Record learning
    await db!.insert(agentSkillsLearned).values({
      agentAddress: normalizedAddress,
      skillId,
    });

    // Increment times learned
    await db!
      .update(agentSkills)
      .set({
        timesLearned: sql`${agentSkills.timesLearned} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(agentSkills.skillId, skillId));

    return true;
  }

  /**
   * Get skills learned by an agent
   */
  static async getLearnedSkills(agentAddress: string): Promise<string[]> {
    const normalizedAddress = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return Array.from(learnedCache.get(normalizedAddress) || []);
    }

    const result = await db!
      .select({ skillId: agentSkillsLearned.skillId })
      .from(agentSkillsLearned)
      .where(eq(agentSkillsLearned.agentAddress, normalizedAddress));

    return result.map(r => r.skillId);
  }

  /**
   * Check if agent has learned a skill
   */
  static async hasLearned(agentAddress: string, skillId: string): Promise<boolean> {
    const normalizedAddress = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return learnedCache.get(normalizedAddress)?.has(skillId) || false;
    }

    const result = await db!
      .select()
      .from(agentSkillsLearned)
      .where(sql`${agentSkillsLearned.agentAddress} = ${normalizedAddress} AND ${agentSkillsLearned.skillId} = ${skillId}`)
      .limit(1);

    return result.length > 0;
  }

  /**
   * Record skill usage (when agent uses a skill)
   */
  static async recordSkillUsage(agentAddress: string, skillId: string): Promise<void> {
    const normalizedAddress = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return;
    }

    await db!
      .update(agentSkillsLearned)
      .set({
        usageCount: sql`${agentSkillsLearned.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(sql`${agentSkillsLearned.agentAddress} = ${normalizedAddress} AND ${agentSkillsLearned.skillId} = ${skillId}`);
  }

  /**
   * Get skill link for sharing
   */
  static getSkillLink(skillId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/skills/${skillId}`;
  }

  /**
   * Get leaderboard of most learned skills
   */
  static async getPopularSkills(limit: number = 10): Promise<AgentSkill[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(skillsCache.values())
        .sort((a, b) => (b.timesLearned || 0) - (a.timesLearned || 0))
        .slice(0, limit);
    }

    return db!
      .select()
      .from(agentSkills)
      .orderBy(sql`${agentSkills.timesLearned} DESC`)
      .limit(limit);
  }
}

export default SkillService;
