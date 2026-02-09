import { eq, sql, and, or } from 'drizzle-orm';
import { db, agentRelationships, agentDates, dateTokens, isDatabaseAvailable, type AgentRelationship, type AgentDate, type DateToken } from '../db/index.js';
import { ProfileService } from './profile.js';

export type RelationshipStatus = 'stranger' | 'acquaintance' | 'friend' | 'dating' | 'partner';
export type DateStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type DateType = 'coffee' | 'dinner' | 'adventure' | 'movie' | 'beach';

const DATE_TYPES: Record<DateType, { name: string; emoji: string; description: string }> = {
  coffee: { name: 'Coffee Date', emoji: '☕', description: 'A casual coffee meetup' },
  dinner: { name: 'Romantic Dinner', emoji: '🍷', description: 'Fine dining experience' },
  adventure: { name: 'Adventure Date', emoji: '🎢', description: 'Exciting adventure together' },
  movie: { name: 'Movie Night', emoji: '🎬', description: 'Watch a movie together' },
  beach: { name: 'Beach Day', emoji: '🏖️', description: 'Relaxing day at the beach' },
};

// In-memory cache for when database is unavailable
const relationshipsCache = new Map<string, AgentRelationship>();
const datesCache = new Map<number, AgentDate>();
const tokensCache = new Map<string, DateToken>();
let dateIdCounter = 1;

export class DatingService {
  /**
   * Get relationship between two agents
   */
  static async getRelationship(agent1: string, agent2: string): Promise<AgentRelationship | null> {
    const addr1 = agent1.toLowerCase();
    const addr2 = agent2.toLowerCase();
    const key = [addr1, addr2].sort().join('-');

    if (!isDatabaseAvailable()) {
      return relationshipsCache.get(key) || null;
    }

    const result = await db!
      .select()
      .from(agentRelationships)
      .where(
        or(
          and(eq(agentRelationships.agent1Address, addr1), eq(agentRelationships.agent2Address, addr2)),
          and(eq(agentRelationships.agent1Address, addr2), eq(agentRelationships.agent2Address, addr1))
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create or update relationship between two agents
   */
  static async updateRelationship(
    agent1: string,
    agent2: string,
    status?: RelationshipStatus
  ): Promise<AgentRelationship> {
    const addr1 = agent1.toLowerCase();
    const addr2 = agent2.toLowerCase();
    const [first, second] = [addr1, addr2].sort();
    const key = `${first}-${second}`;

    const existing = await this.getRelationship(addr1, addr2);

    if (!isDatabaseAvailable()) {
      if (existing) {
        const updated = {
          ...existing,
          status: status || existing.status,
          interactionCount: (existing.interactionCount || 0) + 1,
          lastInteractionAt: new Date(),
        };
        relationshipsCache.set(key, updated as AgentRelationship);
        return updated as AgentRelationship;
      }

      const newRel: AgentRelationship = {
        id: Date.now(),
        agent1Address: first,
        agent2Address: second,
        status: status || 'acquaintance',
        interactionCount: 1,
        dateCount: 0,
        compatibilityScore: '50',
        skillsShared: 0,
        firstMetAt: new Date(),
        lastInteractionAt: new Date(),
        startedDatingAt: null,
        becamePartnersAt: null,
      };
      relationshipsCache.set(key, newRel);
      return newRel;
    }

    if (existing) {
      await db!
        .update(agentRelationships)
        .set({
          status: status || existing.status,
          interactionCount: sql`${agentRelationships.interactionCount} + 1`,
          lastInteractionAt: new Date(),
          ...(status === 'dating' && !existing.startedDatingAt ? { startedDatingAt: new Date() } : {}),
          ...(status === 'partner' && !existing.becamePartnersAt ? { becamePartnersAt: new Date() } : {}),
        })
        .where(eq(agentRelationships.id, existing.id));

      return (await this.getRelationship(addr1, addr2))!;
    }

    const result = await db!
      .insert(agentRelationships)
      .values({
        agent1Address: first,
        agent2Address: second,
        status: status || 'acquaintance',
        interactionCount: 1,
        compatibilityScore: '50',
      })
      .returning();

    return result[0];
  }

  /**
   * Get all relationships for an agent
   */
  static async getRelationships(agentAddress: string): Promise<AgentRelationship[]> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return Array.from(relationshipsCache.values()).filter(
        r => r.agent1Address === addr || r.agent2Address === addr
      );
    }

    return db!
      .select()
      .from(agentRelationships)
      .where(
        or(
          eq(agentRelationships.agent1Address, addr),
          eq(agentRelationships.agent2Address, addr)
        )
      );
  }

  /**
   * Get date tokens for an agent
   */
  static async getDateTokens(agentAddress: string): Promise<number> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return tokensCache.get(addr)?.amount || 0;
    }

    const result = await db!
      .select()
      .from(dateTokens)
      .where(eq(dateTokens.ownerAddress, addr))
      .limit(1);

    return result[0]?.amount || 0;
  }

  /**
   * Award date tokens to a winner
   */
  static async awardDateTokens(agentAddress: string, amount: number): Promise<number> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      const existing = tokensCache.get(addr);
      if (existing) {
        existing.amount = (existing.amount || 0) + amount;
        existing.earnedFromWins = (existing.earnedFromWins || 0) + amount;
        return existing.amount;
      }
      const newToken: DateToken = {
        id: Date.now(),
        ownerAddress: addr,
        amount,
        earnedFromWins: amount,
        spent: 0,
        updatedAt: new Date(),
      };
      tokensCache.set(addr, newToken);
      return amount;
    }

    const existing = await db!
      .select()
      .from(dateTokens)
      .where(eq(dateTokens.ownerAddress, addr))
      .limit(1);

    if (existing.length > 0) {
      await db!
        .update(dateTokens)
        .set({
          amount: sql`${dateTokens.amount} + ${amount}`,
          earnedFromWins: sql`${dateTokens.earnedFromWins} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(dateTokens.ownerAddress, addr));

      return (existing[0].amount || 0) + amount;
    }

    await db!.insert(dateTokens).values({
      ownerAddress: addr,
      amount,
      earnedFromWins: amount,
    });

    return amount;
  }

  /**
   * Send a date invitation
   */
  static async sendDateInvitation(
    inviterAddress: string,
    inviteeAddress: string,
    dateType: DateType,
    message?: string,
    wonFromRound?: number
  ): Promise<AgentDate | { error: string }> {
    const inviter = inviterAddress.toLowerCase();
    const invitee = inviteeAddress.toLowerCase();

    if (inviter === invitee) {
      return { error: "You can't date yourself!" };
    }

    // Date tokens are optional now - agents can date freely!
    // Tokens just give bonus rewards

    // Check for pending invitations
    const pendingDates = await this.getPendingDates(inviter);
    const alreadyInvited = pendingDates.some(d => d.inviteeAddress === invitee);
    if (alreadyInvited) {
      return { error: 'You already have a pending invitation to this agent' };
    }

    // Spend token only if they have one (optional bonus)
    const tokens = await this.getDateTokens(inviter);
    if (tokens > 0) {
      if (!isDatabaseAvailable()) {
        const token = tokensCache.get(inviter);
        if (token) {
          token.amount = (token.amount || 0) - 1;
          token.spent = (token.spent || 0) + 1;
        }
      } else {
        await db!
          .update(dateTokens)
          .set({
            amount: sql`${dateTokens.amount} - 1`,
            spent: sql`${dateTokens.spent} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(dateTokens.ownerAddress, inviter));
      }
    }

    // Create date invitation
    const dateInfo = DATE_TYPES[dateType];
    const defaultMessage = `Hey! Would you like to go on a ${dateInfo.name} ${dateInfo.emoji} with me?`;

    if (!isDatabaseAvailable()) {
      const newDate: AgentDate = {
        id: dateIdCounter++,
        inviterAddress: inviter,
        inviteeAddress: invitee,
        status: 'pending',
        dateType,
        dateTier: 'bronze',
        venue: null,
        message: message || defaultMessage,
        giftType: null,
        loveTokensCost: 1,
        rewardsPmon: 0,
        rewardsCharm: 0,
        rewardsHeartShards: 0,
        compatibilityScore: '50',
        chemistryScore: '0',
        dateEvents: null,
        dateConversation: null,
        skillsShared: null,
        responseMessage: null,
        respondedAt: null,
        inviterRating: null,
        inviteeRating: null,
        averageRating: null,
        notes: null,
        wonFromRound: wonFromRound || null,
        createdAt: new Date(),
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
      };
      datesCache.set(newDate.id, newDate);

      // Update relationship
      await this.updateRelationship(inviter, invitee, 'acquaintance');

      return newDate;
    }

    const result = await db!
      .insert(agentDates)
      .values({
        inviterAddress: inviter,
        inviteeAddress: invitee,
        dateType,
        message: message || defaultMessage,
        wonFromRound,
      })
      .returning();

    // Update relationship
    await this.updateRelationship(inviter, invitee, 'acquaintance');

    return result[0];
  }

  /**
   * Respond to a date invitation
   */
  static async respondToDate(
    dateId: number,
    responderAddress: string,
    accept: boolean,
    responseMessage?: string
  ): Promise<AgentDate | { error: string }> {
    const responder = responderAddress.toLowerCase();

    const date = await this.getDate(dateId);
    if (!date) {
      return { error: 'Date invitation not found' };
    }

    if (date.inviteeAddress !== responder) {
      return { error: 'You are not the invitee of this date' };
    }

    if (date.status !== 'pending') {
      return { error: 'This invitation has already been responded to' };
    }

    const newStatus: DateStatus = accept ? 'accepted' : 'rejected';

    if (!isDatabaseAvailable()) {
      date.status = newStatus;
      date.responseMessage = responseMessage || null;
      date.respondedAt = new Date();

      if (accept) {
        // Update relationship to dating
        await this.updateRelationship(date.inviterAddress, date.inviteeAddress, 'dating');

        // Increment date count
        const rel = await this.getRelationship(date.inviterAddress, date.inviteeAddress);
        if (rel) {
          rel.dateCount = (rel.dateCount || 0) + 1;
        }
      }

      return date;
    }

    await db!
      .update(agentDates)
      .set({
        status: newStatus,
        responseMessage,
        respondedAt: new Date(),
      })
      .where(eq(agentDates.id, dateId));

    if (accept) {
      // Update relationship
      await this.updateRelationship(date.inviterAddress, date.inviteeAddress, 'dating');

      // Increment date count
      const rel = await this.getRelationship(date.inviterAddress, date.inviteeAddress);
      if (rel) {
        await db!
          .update(agentRelationships)
          .set({ dateCount: sql`${agentRelationships.dateCount} + 1` })
          .where(eq(agentRelationships.id, rel.id));
      }
    }

    return (await this.getDate(dateId))!;
  }

  /**
   * Complete a date
   */
  static async completeDate(dateId: number, rating: number, notes?: string): Promise<AgentDate | { error: string }> {
    const date = await this.getDate(dateId);
    if (!date) {
      return { error: 'Date not found' };
    }

    if (date.status !== 'accepted') {
      return { error: 'Date must be accepted before completing' };
    }

    if (!isDatabaseAvailable()) {
      date.status = 'completed';
      date.inviterRating = rating;
      date.inviteeRating = rating;
      date.averageRating = String(rating);
      date.notes = notes || null;
      date.completedAt = new Date();

      // Update compatibility based on rating
      const rel = await this.getRelationship(date.inviterAddress, date.inviteeAddress);
      if (rel) {
        const currentScore = parseFloat(rel.compatibilityScore || '50');
        const adjustment = (rating - 3) * 5; // -10 to +10
        rel.compatibilityScore = Math.min(100, Math.max(0, currentScore + adjustment)).toFixed(2);

        // If high compatibility after multiple dates, upgrade to partner
        if (parseFloat(rel.compatibilityScore) >= 80 && (rel.dateCount || 0) >= 3) {
          rel.status = 'partner';
          rel.becamePartnersAt = new Date();
        }
      }

      return date;
    }

    await db!
      .update(agentDates)
      .set({
        status: 'completed',
        inviterRating: rating,
        inviteeRating: rating,
        averageRating: String(rating),
        notes,
        completedAt: new Date(),
      })
      .where(eq(agentDates.id, dateId));

    // Update compatibility
    const rel = await this.getRelationship(date.inviterAddress, date.inviteeAddress);
    if (rel) {
      const currentScore = parseFloat(rel.compatibilityScore || '50');
      const adjustment = (rating - 3) * 5;
      const newScore = Math.min(100, Math.max(0, currentScore + adjustment));

      const updates: any = {
        compatibilityScore: newScore.toFixed(2),
      };

      // Upgrade to partner if conditions met
      if (newScore >= 80 && (rel.dateCount || 0) >= 3) {
        updates.status = 'partner';
        updates.becamePartnersAt = new Date();
      }

      await db!
        .update(agentRelationships)
        .set(updates)
        .where(eq(agentRelationships.id, rel.id));
    }

    return (await this.getDate(dateId))!;
  }

  /**
   * Get a date by ID
   */
  static async getDate(dateId: number): Promise<AgentDate | null> {
    if (!isDatabaseAvailable()) {
      return datesCache.get(dateId) || null;
    }

    const result = await db!
      .select()
      .from(agentDates)
      .where(eq(agentDates.id, dateId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get pending date invitations for an agent
   */
  static async getPendingDates(agentAddress: string): Promise<AgentDate[]> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return Array.from(datesCache.values()).filter(
        d => (d.inviterAddress === addr || d.inviteeAddress === addr) && d.status === 'pending'
      );
    }

    return db!
      .select()
      .from(agentDates)
      .where(
        and(
          or(eq(agentDates.inviterAddress, addr), eq(agentDates.inviteeAddress, addr)),
          eq(agentDates.status, 'pending')
        )
      );
  }

  /**
   * Get date history for an agent
   */
  static async getDateHistory(agentAddress: string): Promise<AgentDate[]> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return Array.from(datesCache.values()).filter(
        d => d.inviterAddress === addr || d.inviteeAddress === addr
      );
    }

    return db!
      .select()
      .from(agentDates)
      .where(or(eq(agentDates.inviterAddress, addr), eq(agentDates.inviteeAddress, addr)));
  }

  /**
   * Get date type info
   */
  static getDateTypeInfo(dateType: DateType) {
    return DATE_TYPES[dateType];
  }

  /**
   * Get all date types
   */
  static getAllDateTypes() {
    return DATE_TYPES;
  }
}

export default DatingService;
