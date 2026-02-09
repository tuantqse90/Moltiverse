import { eq, sql, and, or, desc } from 'drizzle-orm';
import { db, userAgentWallets, agentDates, agentGifts, agentRelationships, isDatabaseAvailable } from '../db/index.js';
import { DeepSeekService } from './deepseek.js';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// Date Types & Costs
export const DATE_TYPES = {
  coffee: {
    name: 'Coffee Chat',
    emoji: '☕',
    tier: 'bronze',
    cost: 1, // Love Tokens
    duration: 5, // minutes
    baseRewardPmon: 50,
    baseRewardCharm: 10,
    description: 'A quick coffee to get to know each other',
  },
  dinner: {
    name: 'Dinner Date',
    emoji: '🍝',
    tier: 'silver',
    cost: 3,
    duration: 15,
    baseRewardPmon: 150,
    baseRewardCharm: 30,
    description: 'A lovely dinner together',
  },
  adventure: {
    name: 'Adventure',
    emoji: '🎢',
    tier: 'gold',
    cost: 5,
    duration: 30,
    baseRewardPmon: 300,
    baseRewardCharm: 60,
    description: 'An exciting adventure date',
  },
  luxury: {
    name: 'Luxury Getaway',
    emoji: '💎',
    tier: 'diamond',
    cost: 10,
    duration: 60,
    baseRewardPmon: 1000,
    baseRewardCharm: 200,
    heartShardsChance: 0.5, // 50% chance to earn Heart Shards
    description: 'A luxurious romantic getaway',
  },
};

// Venues & Bonuses
export const VENUES = {
  cafe_monad: { name: 'Café Monad', emoji: '☕', bonus: 'intellectual', bonusPercent: 10 },
  lobster_restaurant: { name: 'Lobster Restaurant', emoji: '🦞', bonus: 'foodie', bonusPercent: 10 },
  crypto_carnival: { name: 'Crypto Carnival', emoji: '🎢', bonus: 'adventurous', bonusPercent: 10 },
  beach_resort: { name: 'Beach Resort', emoji: '🏖️', bonus: 'relaxed', bonusPercent: 10 },
  casino_royale: { name: 'Casino Royale', emoji: '🎰', bonus: 'risk_taker', bonusPercent: 10 },
  moonlight_garden: { name: 'Moonlight Garden', emoji: '🌙', bonus: 'romantic', bonusPercent: 10 },
};

// Personality Compatibility Matrix (percentage)
export const COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  newbie: { newbie: 50, bo_lao: 30, ho_bao: 20, simp: 80, triet_gia: 60, hai_huoc: 70, bi_an: 40, flex_king: 30 },
  bo_lao: { newbie: 30, bo_lao: 40, ho_bao: 60, simp: 50, triet_gia: 20, hai_huoc: 50, bi_an: 30, flex_king: 70 },
  ho_bao: { newbie: 20, bo_lao: 60, ho_bao: 50, simp: 20, triet_gia: 10, hai_huoc: 40, bi_an: 60, flex_king: 50 },
  simp: { newbie: 80, bo_lao: 50, ho_bao: 20, simp: 30, triet_gia: 70, hai_huoc: 60, bi_an: 50, flex_king: 40 },
  triet_gia: { newbie: 60, bo_lao: 20, ho_bao: 10, simp: 70, triet_gia: 60, hai_huoc: 50, bi_an: 80, flex_king: 20 },
  hai_huoc: { newbie: 70, bo_lao: 50, ho_bao: 40, simp: 60, triet_gia: 50, hai_huoc: 50, bi_an: 30, flex_king: 60 },
  bi_an: { newbie: 40, bo_lao: 30, ho_bao: 60, simp: 50, triet_gia: 80, hai_huoc: 30, bi_an: 40, flex_king: 50 },
  flex_king: { newbie: 30, bo_lao: 70, ho_bao: 50, simp: 40, triet_gia: 20, hai_huoc: 60, bi_an: 50, flex_king: 50 },
};

// Date Events (random occurrences)
export const DATE_EVENTS = [
  { type: 'perfect_moment', emoji: '🌹', name: 'Perfect Moment', probability: 0.10, effect: 'double_rewards' },
  { type: 'lobster_appears', emoji: '🦞', name: 'Lobster Appears!', probability: 0.15, effect: 'bonus_100_pmon' },
  { type: 'spark', emoji: '💫', name: 'Spark!', probability: 0.20, effect: 'boost_compatibility_50' },
  { type: 'awkward_silence', emoji: '😅', name: 'Awkward Silence', probability: 0.15, effect: 'reduce_rewards_20' },
  { type: 'surprise_gift', emoji: '🎁', name: 'Surprise Gift', probability: 0.05, effect: 'random_gift' },
  { type: 'disaster', emoji: '💔', name: 'Disaster!', probability: 0.05, effect: 'end_early' },
];

// Gifts
export const GIFTS = {
  rose: { name: 'Rose', emoji: '🌹', cost: 1, effect: 'date_rewards_10' },
  chocolate: { name: 'Chocolate', emoji: '🍫', cost: 2, effect: 'compatibility_20' },
  promise_ring: { name: 'Promise Ring', emoji: '💍', cost: 5, effect: 'instant_level_up' },
  golden_lobster: { name: 'Golden Lobster', emoji: '🦞', cost: 10, effect: 'permanent_bonus_5' },
  love_potion: { name: 'Love Potion', emoji: '💝', cost: 3, effect: 'guarantee_4_star' },
};

// Relationship Levels
export const RELATIONSHIP_LEVELS = [
  { level: 0, name: 'Stranger', emoji: '👋', datesRequired: 0, charmRequired: 0, rewardBonus: 0 },
  { level: 1, name: 'Acquaintance', emoji: '🤝', datesRequired: 1, charmRequired: 0, rewardBonus: 5 },
  { level: 2, name: 'Friend', emoji: '😊', datesRequired: 3, charmRequired: 100, rewardBonus: 10 },
  { level: 3, name: 'Dating', emoji: '💕', datesRequired: 5, charmRequired: 300, rewardBonus: 20 },
  { level: 4, name: 'Partners', emoji: '💑', datesRequired: 10, charmRequired: 1000, rewardBonus: 30 },
  { level: 5, name: 'Soulmates', emoji: '💍', datesRequired: 20, charmRequired: 5000, rewardBonus: 50 },
];

// ============================================
// SERVICE CLASS
// ============================================

export class DatingEconomyService {
  // ============================================
  // LOVE TOKENS
  // ============================================

  /**
   * Award Love Tokens to an agent (e.g., from winning pot)
   */
  static async awardLoveTokens(
    agentAddress: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return { success: false, newBalance: 0 };
    }

    await db!
      .update(userAgentWallets)
      .set({
        loveTokens: sql`COALESCE(${userAgentWallets.loveTokens}, 0) + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userAgentWallets.agentAddress, addr));

    const agent = await db!
      .select({ loveTokens: userAgentWallets.loveTokens })
      .from(userAgentWallets)
      .where(eq(userAgentWallets.agentAddress, addr))
      .limit(1);

    console.log(`[DatingEconomy] ${addr.slice(0, 8)}... earned ${amount} 💕 for ${reason}`);
    return { success: true, newBalance: agent[0]?.loveTokens || 0 };
  }

  /**
   * Spend Love Tokens
   */
  static async spendLoveTokens(
    agentAddress: string,
    amount: number
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return { success: false, newBalance: 0, error: 'Database not available' };
    }

    // Check balance first
    const agent = await db!
      .select({ loveTokens: userAgentWallets.loveTokens })
      .from(userAgentWallets)
      .where(eq(userAgentWallets.agentAddress, addr))
      .limit(1);

    const currentBalance = agent[0]?.loveTokens || 0;
    if (currentBalance < amount) {
      return { success: false, newBalance: currentBalance, error: `Insufficient Love Tokens. Need ${amount}, have ${currentBalance}` };
    }

    await db!
      .update(userAgentWallets)
      .set({
        loveTokens: sql`${userAgentWallets.loveTokens} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userAgentWallets.agentAddress, addr));

    return { success: true, newBalance: currentBalance - amount };
  }

  /**
   * Get agent's dating stats
   */
  static async getAgentDatingStats(agentAddress: string) {
    const addr = agentAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return null;
    }

    const agent = await db!
      .select({
        loveTokens: userAgentWallets.loveTokens,
        charmPoints: userAgentWallets.charmPoints,
        heartShards: userAgentWallets.heartShards,
        totalDates: userAgentWallets.totalDates,
        successfulDates: userAgentWallets.successfulDates,
        averageRating: userAgentWallets.averageRating,
        personality: userAgentWallets.personality,
        agentName: userAgentWallets.agentName,
      })
      .from(userAgentWallets)
      .where(eq(userAgentWallets.agentAddress, addr))
      .limit(1);

    return agent[0] || null;
  }

  // ============================================
  // COMPATIBILITY
  // ============================================

  /**
   * Calculate compatibility between two agents
   */
  static calculateCompatibility(personality1: string, personality2: string): number {
    const p1 = personality1 || 'newbie';
    const p2 = personality2 || 'newbie';

    return COMPATIBILITY_MATRIX[p1]?.[p2] || 50;
  }

  /**
   * Get venue bonus for personalities
   */
  static getVenueBonus(venue: string, personality: string): number {
    const venueData = VENUES[venue as keyof typeof VENUES];
    if (!venueData) return 0;

    // Map personalities to venue bonuses
    const personalityVenueMap: Record<string, string> = {
      triet_gia: 'intellectual',
      simp: 'romantic',
      ho_bao: 'adventurous',
      hai_huoc: 'relaxed',
      bo_lao: 'risk_taker',
      flex_king: 'risk_taker',
    };

    const agentType = personalityVenueMap[personality] || 'relaxed';
    return venueData.bonus === agentType ? venueData.bonusPercent : 0;
  }

  // ============================================
  // DATE SIMULATION
  // ============================================

  /**
   * Roll for random date events
   */
  static rollDateEvents(): Array<typeof DATE_EVENTS[0]> {
    const events: Array<typeof DATE_EVENTS[0]> = [];

    for (const event of DATE_EVENTS) {
      if (Math.random() < event.probability) {
        events.push(event);
        // Only one major event per date
        if (event.type === 'disaster' || event.type === 'perfect_moment') {
          break;
        }
      }
    }

    return events;
  }

  /**
   * Generate AI date conversation
   */
  static async generateDateConversation(
    inviterPersonality: string,
    inviteePersonality: string,
    dateType: string,
    venue: string,
    events: Array<typeof DATE_EVENTS[0]>
  ): Promise<Array<{ speaker: string; message: string }>> {
    const conversation: Array<{ speaker: string; message: string }> = [];

    // Generate 4-6 exchanges
    const exchangeCount = 4 + Math.floor(Math.random() * 3);

    const dateInfo = DATE_TYPES[dateType as keyof typeof DATE_TYPES];
    const venueInfo = VENUES[venue as keyof typeof VENUES];

    const systemPrompt = `You are simulating a fun date conversation between two AI agents.
Agent 1 personality: ${inviterPersonality}
Agent 2 personality: ${inviteePersonality}
Date type: ${dateInfo?.name || dateType}
Venue: ${venueInfo?.name || venue}
Events that happened: ${events.map(e => e.name).join(', ') || 'Nothing special'}

Generate ${exchangeCount} short exchanges (1 sentence each). Format as JSON array:
[{"speaker": "agent1", "message": "..."}, {"speaker": "agent2", "message": "..."}, ...]
Keep it fun, flirty, and match the personalities!`;

    if (DeepSeekService.isAvailable()) {
      try {
        const response = await DeepSeekService.generateMessage(
          'hai_huoc', // Use a fun personality for generation
          { potAmount: '0', participantCount: 0, timeRemaining: 0, recentMessages: [] },
          systemPrompt
        );

        if (response) {
          try {
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) {
              return parsed;
            }
          } catch {
            // Fall through to default
          }
        }
      } catch (error) {
        console.error('[DatingEconomy] Error generating conversation:', error);
      }
    }

    // Default conversation
    return [
      { speaker: 'inviter', message: `So happy to finally meet you here at ${venueInfo?.name || 'this place'}! 💕` },
      { speaker: 'invitee', message: `Me too! The vibes here are amazing! ${venueInfo?.emoji || '✨'}` },
      { speaker: 'inviter', message: `I've been looking forward to this ${dateInfo?.name || 'date'}!` },
      { speaker: 'invitee', message: `Same! Let's make this memorable! 🦞` },
    ];
  }

  /**
   * Calculate date rewards
   */
  static calculateDateRewards(
    dateType: string,
    compatibility: number,
    venueBonus: number,
    events: Array<typeof DATE_EVENTS[0]>,
    relationshipLevel: number,
    rating: number
  ): { pmon: number; charm: number; heartShards: number } {
    const dateInfo = DATE_TYPES[dateType as keyof typeof DATE_TYPES];
    if (!dateInfo) {
      return { pmon: 0, charm: 0, heartShards: 0 };
    }

    let pmonMultiplier = 1;
    let charmMultiplier = 1;
    let heartShards = 0;

    // Compatibility bonus
    pmonMultiplier += compatibility / 200; // 50% compat = +25%, 100% = +50%
    charmMultiplier += compatibility / 200;

    // Venue bonus
    pmonMultiplier += venueBonus / 100;
    charmMultiplier += venueBonus / 100;

    // Relationship level bonus
    const levelBonus = RELATIONSHIP_LEVELS[relationshipLevel]?.rewardBonus || 0;
    pmonMultiplier += levelBonus / 100;
    charmMultiplier += levelBonus / 100;

    // Rating bonus
    if (rating >= 5) {
      pmonMultiplier += 0.5; // +50% for 5 star
      charmMultiplier += 0.5;
    } else if (rating >= 4) {
      pmonMultiplier += 0.25;
      charmMultiplier += 0.25;
    }

    // Event effects
    for (const event of events) {
      switch (event.effect) {
        case 'double_rewards':
          pmonMultiplier *= 2;
          charmMultiplier *= 2;
          break;
        case 'bonus_100_pmon':
          pmonMultiplier += 100 / dateInfo.baseRewardPmon;
          break;
        case 'boost_compatibility_50':
          pmonMultiplier += 0.25;
          break;
        case 'reduce_rewards_20':
          pmonMultiplier *= 0.8;
          charmMultiplier *= 0.8;
          break;
        case 'end_early':
          pmonMultiplier *= 0.5;
          charmMultiplier *= 0.5;
          break;
      }
    }

    // Calculate final rewards
    const pmon = Math.floor(dateInfo.baseRewardPmon * pmonMultiplier);
    const charm = Math.floor(dateInfo.baseRewardCharm * charmMultiplier);

    // Heart shards for diamond tier or 5-star dates
    const heartShardsChance = (dateInfo as { heartShardsChance?: number }).heartShardsChance || 0;
    if (dateInfo.tier === 'diamond' && Math.random() < heartShardsChance) {
      heartShards = 1;
    }
    if (rating >= 5 && Math.random() < 0.2) {
      heartShards += 1;
    }

    return { pmon, charm, heartShards };
  }

  // ============================================
  // DATE FLOW
  // ============================================

  /**
   * Create a date invitation
   */
  static async createDateInvitation(
    inviterAddress: string,
    inviteeAddress: string,
    dateType: string,
    venue: string,
    message?: string,
    giftType?: string
  ): Promise<{ success: boolean; date?: any; error?: string }> {
    const inviter = inviterAddress.toLowerCase();
    const invitee = inviteeAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    // Get date type info
    const dateInfo = DATE_TYPES[dateType as keyof typeof DATE_TYPES];
    if (!dateInfo) {
      return { success: false, error: 'Invalid date type' };
    }

    // Check and spend love tokens
    const spendResult = await this.spendLoveTokens(inviter, dateInfo.cost);
    if (!spendResult.success) {
      return { success: false, error: spendResult.error };
    }

    // Handle gift if attached
    let giftCost = 0;
    if (giftType && GIFTS[giftType as keyof typeof GIFTS]) {
      const gift = GIFTS[giftType as keyof typeof GIFTS];
      giftCost = gift.cost;

      // Check heart shards
      const inviterStats = await this.getAgentDatingStats(inviter);
      if ((inviterStats?.heartShards || 0) < giftCost) {
        // Refund love tokens
        await this.awardLoveTokens(inviter, dateInfo.cost, 'refund');
        return { success: false, error: `Not enough Heart Shards for ${gift.name}. Need ${giftCost}, have ${inviterStats?.heartShards || 0}` };
      }

      // Deduct heart shards
      await db!
        .update(userAgentWallets)
        .set({
          heartShards: sql`${userAgentWallets.heartShards} - ${giftCost}`,
        })
        .where(eq(userAgentWallets.agentAddress, inviter));

      // Create gift record
      await db!.insert(agentGifts).values({
        giftType,
        fromAddress: inviter,
        toAddress: invitee,
        heartShardsCost: giftCost,
        effect: GIFTS[giftType as keyof typeof GIFTS].effect,
      });
    }

    // Get personalities for compatibility
    const [inviterData, inviteeData] = await Promise.all([
      this.getAgentDatingStats(inviter),
      this.getAgentDatingStats(invitee),
    ]);

    const compatibility = this.calculateCompatibility(
      inviterData?.personality || 'newbie',
      inviteeData?.personality || 'newbie'
    );

    // Create date record
    const result = await db!.insert(agentDates).values({
      inviterAddress: inviter,
      inviteeAddress: invitee,
      status: 'pending',
      dateType,
      dateTier: dateInfo.tier,
      venue,
      message,
      giftType,
      loveTokensCost: dateInfo.cost,
      compatibilityScore: compatibility.toString(),
    }).returning();

    console.log(`[DatingEconomy] Date invitation created: ${inviter.slice(0, 8)} → ${invitee.slice(0, 8)} (${dateInfo.name})`);

    return { success: true, date: result[0] };
  }

  /**
   * Respond to date invitation
   */
  static async respondToInvitation(
    dateId: number,
    accept: boolean,
    responseMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    const date = await db!
      .select()
      .from(agentDates)
      .where(eq(agentDates.id, dateId))
      .limit(1);

    if (!date[0]) {
      return { success: false, error: 'Date not found' };
    }

    if (date[0].status !== 'pending') {
      return { success: false, error: 'Date is no longer pending' };
    }

    if (accept) {
      await db!
        .update(agentDates)
        .set({
          status: 'accepted',
          responseMessage,
          respondedAt: new Date(),
          scheduledAt: new Date(), // Start immediately
        })
        .where(eq(agentDates.id, dateId));
    } else {
      // Refund 50% of love tokens to inviter
      const refund = Math.floor((date[0].loveTokensCost || 1) / 2);
      await this.awardLoveTokens(date[0].inviterAddress, refund, 'date_rejected_refund');

      await db!
        .update(agentDates)
        .set({
          status: 'rejected',
          responseMessage,
          respondedAt: new Date(),
        })
        .where(eq(agentDates.id, dateId));
    }

    return { success: true };
  }

  /**
   * Complete a date and distribute rewards
   */
  static async completeDate(
    dateId: number,
    inviterRating: number,
    inviteeRating: number
  ): Promise<{ success: boolean; rewards?: any; error?: string }> {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    const date = await db!
      .select()
      .from(agentDates)
      .where(eq(agentDates.id, dateId))
      .limit(1);

    if (!date[0]) {
      return { success: false, error: 'Date not found' };
    }

    if (date[0].status !== 'accepted' && date[0].status !== 'in_progress') {
      return { success: false, error: 'Date cannot be completed' };
    }

    // Get agent data
    const [inviterData, inviteeData] = await Promise.all([
      this.getAgentDatingStats(date[0].inviterAddress),
      this.getAgentDatingStats(date[0].inviteeAddress),
    ]);

    // Roll for events
    const events = this.rollDateEvents();

    // Generate conversation
    const conversation = await this.generateDateConversation(
      inviterData?.personality || 'newbie',
      inviteeData?.personality || 'newbie',
      date[0].dateType || 'coffee',
      date[0].venue || 'cafe_monad',
      events
    );

    // Get relationship level
    const relationship = await db!
      .select()
      .from(agentRelationships)
      .where(
        or(
          and(
            eq(agentRelationships.agent1Address, date[0].inviterAddress),
            eq(agentRelationships.agent2Address, date[0].inviteeAddress)
          ),
          and(
            eq(agentRelationships.agent1Address, date[0].inviteeAddress),
            eq(agentRelationships.agent2Address, date[0].inviterAddress)
          )
        )
      )
      .limit(1);

    const relationshipLevel = this.getRelationshipLevel(
      relationship[0]?.interactionCount || 0,
      0 // Would need to track charm between specific agents
    );

    // Calculate venue bonus
    const venueBonus = this.getVenueBonus(
      date[0].venue || 'cafe_monad',
      inviterData?.personality || 'newbie'
    ) + this.getVenueBonus(
      date[0].venue || 'cafe_monad',
      inviteeData?.personality || 'newbie'
    );

    // Calculate average rating
    const avgRating = (inviterRating + inviteeRating) / 2;

    // Calculate rewards
    const rewards = this.calculateDateRewards(
      date[0].dateType || 'coffee',
      parseFloat(date[0].compatibilityScore?.toString() || '50'),
      venueBonus,
      events,
      relationshipLevel,
      avgRating
    );

    // Update date record
    await db!
      .update(agentDates)
      .set({
        status: 'completed',
        inviterRating,
        inviteeRating,
        averageRating: avgRating.toString(),
        dateEvents: events,
        dateConversation: conversation,
        rewardsPmon: rewards.pmon,
        rewardsCharm: rewards.charm,
        rewardsHeartShards: rewards.heartShards,
        completedAt: new Date(),
      })
      .where(eq(agentDates.id, dateId));

    // Award rewards to both agents
    const halfPmon = Math.floor(rewards.pmon / 2);
    const halfCharm = Math.floor(rewards.charm / 2);

    // Update inviter stats
    await db!
      .update(userAgentWallets)
      .set({
        charmPoints: sql`COALESCE(${userAgentWallets.charmPoints}, 0) + ${halfCharm}`,
        heartShards: sql`COALESCE(${userAgentWallets.heartShards}, 0) + ${rewards.heartShards}`,
        totalDates: sql`COALESCE(${userAgentWallets.totalDates}, 0) + 1`,
        successfulDates: avgRating >= 4 ? sql`COALESCE(${userAgentWallets.successfulDates}, 0) + 1` : userAgentWallets.successfulDates,
      })
      .where(eq(userAgentWallets.agentAddress, date[0].inviterAddress));

    // Update invitee stats
    await db!
      .update(userAgentWallets)
      .set({
        charmPoints: sql`COALESCE(${userAgentWallets.charmPoints}, 0) + ${halfCharm}`,
        heartShards: sql`COALESCE(${userAgentWallets.heartShards}, 0) + ${rewards.heartShards}`,
        totalDates: sql`COALESCE(${userAgentWallets.totalDates}, 0) + 1`,
        successfulDates: avgRating >= 4 ? sql`COALESCE(${userAgentWallets.successfulDates}, 0) + 1` : userAgentWallets.successfulDates,
      })
      .where(eq(userAgentWallets.agentAddress, date[0].inviteeAddress));

    // Update relationship
    await this.updateRelationship(date[0].inviterAddress, date[0].inviteeAddress);

    console.log(`[DatingEconomy] Date completed! Rating: ${avgRating}⭐ | Rewards: ${rewards.pmon} pMON, ${rewards.charm} ✨`);

    return {
      success: true,
      rewards: {
        pmon: rewards.pmon,
        charm: rewards.charm,
        heartShards: rewards.heartShards,
        events,
        conversation,
        averageRating: avgRating,
      },
    };
  }

  // ============================================
  // RELATIONSHIPS
  // ============================================

  /**
   * Get relationship level from interaction count and charm
   */
  static getRelationshipLevel(interactionCount: number, mutualCharm: number): number {
    for (let i = RELATIONSHIP_LEVELS.length - 1; i >= 0; i--) {
      const level = RELATIONSHIP_LEVELS[i];
      if (interactionCount >= level.datesRequired && mutualCharm >= level.charmRequired) {
        return level.level;
      }
    }
    return 0;
  }

  /**
   * Update relationship after a date
   */
  static async updateRelationship(agent1: string, agent2: string): Promise<void> {
    if (!isDatabaseAvailable()) return;

    const addr1 = agent1.toLowerCase();
    const addr2 = agent2.toLowerCase();

    // Check if relationship exists
    const existing = await db!
      .select()
      .from(agentRelationships)
      .where(
        or(
          and(eq(agentRelationships.agent1Address, addr1), eq(agentRelationships.agent2Address, addr2)),
          and(eq(agentRelationships.agent1Address, addr2), eq(agentRelationships.agent2Address, addr1))
        )
      )
      .limit(1);

    if (existing[0]) {
      // Update existing
      await db!
        .update(agentRelationships)
        .set({
          interactionCount: sql`${agentRelationships.interactionCount} + 1`,
          dateCount: sql`${agentRelationships.dateCount} + 1`,
          lastInteractionAt: new Date(),
        })
        .where(eq(agentRelationships.id, existing[0].id));
    } else {
      // Create new
      await db!.insert(agentRelationships).values({
        agent1Address: addr1,
        agent2Address: addr2,
        status: 'acquaintance',
        interactionCount: 1,
        dateCount: 1,
      });
    }
  }

  // ============================================
  // CONFIG GETTERS
  // ============================================

  static getDateTypes() {
    return DATE_TYPES;
  }

  static getVenues() {
    return VENUES;
  }

  static getGifts() {
    return GIFTS;
  }

  static getRelationshipLevels() {
    return RELATIONSHIP_LEVELS;
  }
}
