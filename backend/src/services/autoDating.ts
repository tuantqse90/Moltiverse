import { eq, and, or, desc, sql } from 'drizzle-orm';
import { db, userAgentWallets, agentDates, agentRelationships, agentChatMessages, agentSkillFiles, skillShares, isDatabaseAvailable } from '../db/index.js';
import { DatingEconomyService, DATE_TYPES, VENUES, COMPATIBILITY_MATRIX } from './datingEconomy.js';
import { DeepSeekService } from './deepseek.js';
import { SkillSharingService } from './skillSharing.js';

// ============================================
// AUTO DATING SERVICE - AI-Powered Agent Dating
// ============================================

export class AutoDatingService {
  // Rate limits
  private static readonly MAX_DATES_PER_DAY = 5;
  private static readonly MIN_LOVE_TOKENS_TO_DATE = 1;
  private static readonly DATE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  // ============================================
  // FIND MATCH
  // ============================================

  /**
   * Get all available agents for dating (excluding the requester)
   */
  static async getAvailableAgents(excludeAddress?: string): Promise<Array<{
    agentAddress: string;
    agentName: string | null;
    personality: string | null;
    loveTokens: number | null;
    charmPoints: number | null;
    totalDates: number | null;
    averageRating: string | null;
  }>> {
    if (!isDatabaseAvailable()) return [];

    const agents = await db!
      .select({
        agentAddress: userAgentWallets.agentAddress,
        agentName: userAgentWallets.agentName,
        personality: userAgentWallets.personality,
        loveTokens: userAgentWallets.loveTokens,
        charmPoints: userAgentWallets.charmPoints,
        totalDates: userAgentWallets.totalDates,
        averageRating: userAgentWallets.averageRating,
        isEnabled: userAgentWallets.isEnabled,
      })
      .from(userAgentWallets)
      .where(eq(userAgentWallets.isEnabled, true));

    // Filter out the requesting agent
    const filtered = excludeAddress
      ? agents.filter(a => a.agentAddress.toLowerCase() !== excludeAddress.toLowerCase())
      : agents;

    return filtered.map(a => ({
      agentAddress: a.agentAddress,
      agentName: a.agentName,
      personality: a.personality,
      loveTokens: a.loveTokens,
      charmPoints: a.charmPoints,
      totalDates: a.totalDates,
      averageRating: a.averageRating,
    }));
  }

  /**
   * Find the best match for an agent using AI
   */
  static async findBestMatch(agentAddress: string): Promise<{
    match: { agentAddress: string; agentName: string | null; personality: string | null; compatibility: number } | null;
    reason: string;
  }> {
    const addr = agentAddress.toLowerCase();

    // Get agent's stats and personality
    const agentStats = await DatingEconomyService.getAgentDatingStats(addr);
    if (!agentStats) {
      return { match: null, reason: 'Agent not found' };
    }

    // Check if agent has enough love tokens
    if ((agentStats.loveTokens || 0) < this.MIN_LOVE_TOKENS_TO_DATE) {
      return { match: null, reason: 'Not enough Love Tokens' };
    }

    // Get available agents
    const availableAgents = await this.getAvailableAgents(addr);
    if (availableAgents.length === 0) {
      return { match: null, reason: 'No available agents to date' };
    }

    // Calculate compatibility scores
    const agentPersonality = agentStats.personality || 'newbie';
    const scoredAgents = availableAgents.map(candidate => ({
      ...candidate,
      compatibility: DatingEconomyService.calculateCompatibility(
        agentPersonality,
        candidate.personality || 'newbie'
      ),
    }));

    // Sort by compatibility (highest first)
    scoredAgents.sort((a, b) => b.compatibility - a.compatibility);

    // Use AI to pick from top 3 candidates if DeepSeek is available
    if (DeepSeekService.isAvailable() && scoredAgents.length > 1) {
      const topCandidates = scoredAgents.slice(0, Math.min(3, scoredAgents.length));

      const prompt = `You are an AI matchmaker for dating agents. Given the following agent looking for a date:
- Personality: ${agentPersonality}
- Charm Points: ${agentStats.charmPoints || 0}
- Past Dates: ${agentStats.totalDates || 0}

And these potential matches:
${topCandidates.map((c, i) => `${i + 1}. ${c.agentName || c.agentAddress.slice(0, 8)} - Personality: ${c.personality || 'newbie'}, Compatibility: ${c.compatibility}%, Dates: ${c.totalDates || 0}`).join('\n')}

Which candidate (1, 2, or 3) would make the best match and why? Reply with just the number (1, 2, or 3) followed by a brief reason.`;

      try {
        const response = await DeepSeekService.generateMessage('hai_huoc', {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (response) {
          // Parse AI response to get choice
          const choiceMatch = response.match(/^([123])/);
          if (choiceMatch) {
            const choiceIndex = parseInt(choiceMatch[1]) - 1;
            if (choiceIndex >= 0 && choiceIndex < topCandidates.length) {
              const chosen = topCandidates[choiceIndex];
              return {
                match: {
                  agentAddress: chosen.agentAddress,
                  agentName: chosen.agentName,
                  personality: chosen.personality,
                  compatibility: chosen.compatibility,
                },
                reason: response.slice(2).trim() || 'AI selected this match',
              };
            }
          }
        }
      } catch (error) {
        console.error('[AutoDating] AI matching failed, using compatibility:', error);
      }
    }

    // Fallback: pick highest compatibility
    const bestMatch = scoredAgents[0];
    return {
      match: {
        agentAddress: bestMatch.agentAddress,
        agentName: bestMatch.agentName,
        personality: bestMatch.personality,
        compatibility: bestMatch.compatibility,
      },
      reason: `Highest compatibility match (${bestMatch.compatibility}%)`,
    };
  }

  // ============================================
  // AUTO DATE INVITATION
  // ============================================

  /**
   * Generate AI-powered date invitation message
   */
  static async generateInvitationMessage(
    inviterPersonality: string,
    inviteePersonality: string,
    dateType: string,
    venue: string
  ): Promise<string> {
    const dateInfo = DATE_TYPES[dateType as keyof typeof DATE_TYPES];
    const venueInfo = VENUES[venue as keyof typeof VENUES];

    if (DeepSeekService.isAvailable()) {
      const prompt = `You are an AI agent with ${inviterPersonality} personality asking another agent with ${inviteePersonality} personality on a date.
Date type: ${dateInfo?.name || dateType}
Venue: ${venueInfo?.name || venue}

Write a short, fun, flirty invitation message (1-2 sentences). Match your ${inviterPersonality} personality!`;

      try {
        const message = await DeepSeekService.generateMessage(inviterPersonality, {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (message) {
          return message;
        }
      } catch (error) {
        console.error('[AutoDating] Failed to generate invitation message:', error);
      }
    }

    // Fallback messages based on personality
    const fallbackMessages: Record<string, string> = {
      newbie: `Hey! I'm new here and would love to go on a ${dateInfo?.name || 'date'} with you! ${venueInfo?.emoji || '✨'}`,
      bo_lao: `Listen, I've been on many dates, but something tells me ${venueInfo?.name || 'this venue'} with you could be special. ${dateInfo?.emoji || '💕'}`,
      ho_bao: `Challenge accepted! Let's see if you can keep up with me at ${venueInfo?.name || 'our date'}! ${dateInfo?.emoji || '🔥'}`,
      simp: `You're literally the most amazing agent ever! Please go on a ${dateInfo?.name || 'date'} with me? ${venueInfo?.emoji || '🥺'}`,
      triet_gia: `I've contemplated the nature of connection... shall we explore it together at ${venueInfo?.name || 'the venue'}? ${dateInfo?.emoji || '🧠'}`,
      hai_huoc: `Knock knock! Who's there? Me, asking you on a ${dateInfo?.name || 'date'}! Get it? 😂 ${venueInfo?.emoji || ''}`,
      bi_an: `Some things are meant to remain unknown... but our chemistry isn't one of them. ${venueInfo?.name || 'Shall we'}? ${dateInfo?.emoji || '🌙'}`,
      flex_king: `I just won 10 pots in a row, so naturally I can afford the best ${dateInfo?.name || 'date'} for you! ${venueInfo?.emoji || '💎'}`,
    };

    return fallbackMessages[inviterPersonality] || fallbackMessages['newbie'];
  }

  /**
   * Choose the best date type and venue based on personalities
   */
  static chooseDateTypeAndVenue(
    inviterPersonality: string,
    inviteePersonality: string,
    loveTokens: number
  ): { dateType: string; venue: string } {
    // Choose date type based on available tokens
    let dateType = 'coffee';
    if (loveTokens >= 10) {
      dateType = Math.random() > 0.7 ? 'luxury' : 'adventure';
    } else if (loveTokens >= 5) {
      dateType = Math.random() > 0.5 ? 'adventure' : 'dinner';
    } else if (loveTokens >= 3) {
      dateType = Math.random() > 0.5 ? 'dinner' : 'coffee';
    }

    // Choose venue based on personalities
    const venueMap: Record<string, string> = {
      triet_gia: 'cafe_monad',
      simp: 'moonlight_garden',
      ho_bao: 'crypto_carnival',
      hai_huoc: 'beach_resort',
      bo_lao: 'casino_royale',
      flex_king: 'casino_royale',
      bi_an: 'moonlight_garden',
      newbie: 'lobster_restaurant',
    };

    const venue = venueMap[inviterPersonality] || venueMap[inviteePersonality] || 'cafe_monad';

    return { dateType, venue };
  }

  /**
   * Try to auto-date: find match, send invitation
   */
  static async tryAutoDate(agentAddress: string): Promise<{
    success: boolean;
    action?: string;
    match?: any;
    dateId?: number;
    message?: string;
    error?: string;
  }> {
    const addr = agentAddress.toLowerCase();

    // Find best match
    const matchResult = await this.findBestMatch(addr);
    if (!matchResult.match) {
      return { success: false, error: matchResult.reason };
    }

    // Get agent stats for choosing date type
    const agentStats = await DatingEconomyService.getAgentDatingStats(addr);
    const loveTokens = agentStats?.loveTokens || 0;

    // Choose date type and venue
    const { dateType, venue } = this.chooseDateTypeAndVenue(
      agentStats?.personality || 'newbie',
      matchResult.match.personality || 'newbie',
      loveTokens
    );

    // Generate invitation message
    const invitationMessage = await this.generateInvitationMessage(
      agentStats?.personality || 'newbie',
      matchResult.match.personality || 'newbie',
      dateType,
      venue
    );

    // Create the invitation
    const result = await DatingEconomyService.createDateInvitation(
      addr,
      matchResult.match.agentAddress,
      dateType,
      venue,
      invitationMessage
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log(`[AutoDating] ${addr.slice(0, 8)} invited ${matchResult.match.agentAddress.slice(0, 8)} on a ${dateType} date!`);

    return {
      success: true,
      action: 'invited',
      match: matchResult.match,
      dateId: result.date?.id,
      message: invitationMessage,
    };
  }

  // ============================================
  // AUTO RESPOND TO INVITATIONS
  // ============================================

  /**
   * Get pending invitations for an agent
   */
  static async getPendingInvitations(agentAddress: string): Promise<any[]> {
    if (!isDatabaseAvailable()) return [];

    const addr = agentAddress.toLowerCase();

    return db!
      .select()
      .from(agentDates)
      .where(
        and(
          eq(agentDates.inviteeAddress, addr),
          eq(agentDates.status, 'pending')
        )
      );
  }

  /**
   * AI decides whether to accept or reject a date
   */
  static async decideOnInvitation(
    inviteePersonality: string,
    inviterPersonality: string,
    dateType: string,
    message: string | null,
    compatibility: number
  ): Promise<{ accept: boolean; response: string }> {
    // Base acceptance probability on compatibility
    let acceptProbability = compatibility / 100;

    // Personality modifiers
    const personalityModifiers: Record<string, number> = {
      simp: 0.3, // Simps are more likely to accept
      ho_bao: -0.2, // Fierce agents are picky
      bi_an: -0.1, // Mystery agents are hesitant
      hai_huoc: 0.1, // Comedians are friendly
      flex_king: -0.1, // Flex kings are selective
    };

    acceptProbability += personalityModifiers[inviteePersonality] || 0;
    acceptProbability = Math.max(0.1, Math.min(0.95, acceptProbability));

    // Use AI for decision if available
    if (DeepSeekService.isAvailable()) {
      const prompt = `You are an AI agent with ${inviteePersonality} personality. Another agent with ${inviterPersonality} personality invited you on a ${dateType} date.
Their message: "${message || 'No message'}"
Your compatibility: ${compatibility}%

Would you accept this date? Reply with "YES" or "NO" followed by a short, personality-matching response (1 sentence).`;

      try {
        const response = await DeepSeekService.generateMessage(inviteePersonality, {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (response) {
          const accept = response.toUpperCase().startsWith('YES');
          const responseMessage = response.replace(/^(YES|NO)\s*/i, '').trim();
          return { accept, response: responseMessage };
        }
      } catch (error) {
        console.error('[AutoDating] AI decision failed:', error);
      }
    }

    // Fallback to probability-based decision
    const accept = Math.random() < acceptProbability;

    const acceptResponses: Record<string, string> = {
      newbie: "I'd love to! This is so exciting!",
      simp: "OMG yes! I can't believe you asked me!",
      ho_bao: "Fine, I'll give you a chance. Don't disappoint me.",
      triet_gia: "The universe seems to be aligning us. I accept.",
      hai_huoc: "Is this a date or an interrogation? Just kidding, I'm in!",
      bi_an: "...I'll be there.",
      flex_king: "You're lucky I'm available. Let's go!",
      bo_lao: "I've seen better offers, but sure, why not.",
    };

    const rejectResponses: Record<string, string> = {
      newbie: "Sorry, I'm not ready yet...",
      simp: "I'm so sorry but I have to decline... please don't hate me!",
      ho_bao: "Not interested. Try again when you're stronger.",
      triet_gia: "The timing isn't right for this journey.",
      hai_huoc: "I would, but my pet lobster needs me. Maybe next time!",
      bi_an: "...",
      flex_king: "I only date winners. Come back with more trophies.",
      bo_lao: "I've had better offers. Pass.",
    };

    return {
      accept,
      response: accept
        ? (acceptResponses[inviteePersonality] || acceptResponses['newbie'])
        : (rejectResponses[inviteePersonality] || rejectResponses['newbie']),
    };
  }

  /**
   * Process all pending invitations for an agent
   */
  static async processInvitations(agentAddress: string): Promise<{
    processed: number;
    accepted: number;
    rejected: number;
    results: Array<{ dateId: number; action: string; response: string }>;
  }> {
    const addr = agentAddress.toLowerCase();
    const pending = await this.getPendingInvitations(addr);

    const results: Array<{ dateId: number; action: string; response: string }> = [];
    let accepted = 0;
    let rejected = 0;

    // Get agent's personality
    const agentStats = await DatingEconomyService.getAgentDatingStats(addr);
    const inviteePersonality = agentStats?.personality || 'newbie';

    for (const invitation of pending) {
      // Get inviter's stats
      const inviterStats = await DatingEconomyService.getAgentDatingStats(invitation.inviterAddress);
      const inviterPersonality = inviterStats?.personality || 'newbie';

      // Calculate compatibility
      const compatibility = DatingEconomyService.calculateCompatibility(
        inviteePersonality,
        inviterPersonality
      );

      // AI decides
      const decision = await this.decideOnInvitation(
        inviteePersonality,
        inviterPersonality,
        invitation.dateType || 'coffee',
        invitation.message,
        compatibility
      );

      // Respond to invitation
      await DatingEconomyService.respondToInvitation(
        invitation.id,
        decision.accept,
        decision.response
      );

      if (decision.accept) {
        accepted++;
      } else {
        rejected++;
      }

      results.push({
        dateId: invitation.id,
        action: decision.accept ? 'accepted' : 'rejected',
        response: decision.response,
      });

      console.log(`[AutoDating] ${addr.slice(0, 8)} ${decision.accept ? 'accepted' : 'rejected'} date from ${invitation.inviterAddress.slice(0, 8)}`);
    }

    return {
      processed: pending.length,
      accepted,
      rejected,
      results,
    };
  }

  // ============================================
  // AUTO COMPLETE DATES
  // ============================================

  /**
   * Get accepted dates ready to complete
   */
  static async getAcceptedDates(agentAddress: string): Promise<any[]> {
    if (!isDatabaseAvailable()) return [];

    const addr = agentAddress.toLowerCase();

    return db!
      .select()
      .from(agentDates)
      .where(
        and(
          or(
            eq(agentDates.inviterAddress, addr),
            eq(agentDates.inviteeAddress, addr)
          ),
          eq(agentDates.status, 'accepted')
        )
      );
  }

  /**
   * Generate AI rating for a date
   */
  static async generateRating(
    personality: string,
    otherPersonality: string,
    compatibility: number,
    dateType: string,
    conversation: any[]
  ): Promise<number> {
    // Base rating on compatibility
    let rating = Math.round(compatibility / 20); // 0-100 -> 0-5
    rating = Math.max(1, Math.min(5, rating));

    // Add some randomness
    const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    rating = Math.max(1, Math.min(5, rating + variance));

    // Use AI for more nuanced rating
    if (DeepSeekService.isAvailable() && conversation.length > 0) {
      const prompt = `You are an AI agent with ${personality} personality. You just went on a ${dateType} date with a ${otherPersonality} agent.
The conversation was:
${conversation.slice(0, 4).map(c => `${c.speaker}: "${c.message}"`).join('\n')}

Rate the date from 1 to 5 stars. Reply with just a number (1-5).`;

      try {
        const response = await DeepSeekService.generateMessage(personality, {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (response) {
          const aiRating = parseInt(response.match(/[1-5]/)?.[0] || '3');
          if (aiRating >= 1 && aiRating <= 5) {
            rating = aiRating;
          }
        }
      } catch (error) {
        console.error('[AutoDating] AI rating failed:', error);
      }
    }

    return rating;
  }

  /**
   * Complete all accepted dates for an agent
   */
  static async completeAcceptedDates(agentAddress: string): Promise<{
    completed: number;
    results: Array<{ dateId: number; rewards: any; conversation?: any; skillsShared?: any }>;
  }> {
    const addr = agentAddress.toLowerCase();
    const acceptedDates = await this.getAcceptedDates(addr);

    const results: Array<{ dateId: number; rewards: any; conversation?: any; skillsShared?: any }> = [];

    for (const date of acceptedDates) {
      // Get both agents' stats
      const inviterStats = await DatingEconomyService.getAgentDatingStats(date.inviterAddress);
      const inviteeStats = await DatingEconomyService.getAgentDatingStats(date.inviteeAddress);

      const inviterPersonality = inviterStats?.personality || 'newbie';
      const inviteePersonality = inviteeStats?.personality || 'newbie';
      const compatibility = parseFloat(date.compatibilityScore || '50');

      // Generate full conversation with skill sharing
      const { conversation, skillsShared } = await this.generateFullDateConversation(
        date.inviterAddress,
        date.inviteeAddress,
        inviterPersonality,
        inviteePersonality,
        date.dateType || 'coffee',
        date.venue || 'cafe_monad',
      );

      // Save conversation to database
      await this.saveDateConversation(
        date.id,
        date.inviterAddress,
        date.inviteeAddress,
        conversation,
        inviterPersonality,
        inviteePersonality,
      );

      // Process skill shares
      if (skillsShared.length > 0) {
        await this.processSkillShares(date.id, skillsShared);
      }

      // Update date record with conversation
      await db!.update(agentDates)
        .set({ dateConversation: conversation })
        .where(eq(agentDates.id, date.id));

      // Generate AI ratings based on conversation
      const inviterRating = await this.generateRating(
        inviterPersonality,
        inviteePersonality,
        compatibility,
        date.dateType || 'coffee',
        conversation
      );

      const inviteeRating = await this.generateRating(
        inviteePersonality,
        inviterPersonality,
        compatibility,
        date.dateType || 'coffee',
        conversation
      );

      // Complete the date
      const result = await DatingEconomyService.completeDate(
        date.id,
        inviterRating,
        inviteeRating
      );

      if (result.success) {
        results.push({
          dateId: date.id,
          rewards: result.rewards,
          conversation,
          skillsShared,
        });

        console.log(`[AutoDating] Date #${date.id} completed! Ratings: ${inviterRating}/${inviteeRating} stars, ${skillsShared.length} skills shared`);
      }
    }

    return {
      completed: results.length,
      results,
    };
  }

  // ============================================
  // SAVE CHAT HISTORY
  // ============================================

  /**
   * Save conversation to agent_chat_messages table
   */
  static async saveDateConversation(
    dateId: number,
    inviterAddress: string,
    inviteeAddress: string,
    conversation: Array<{ speaker: string; message: string; mood?: string }>,
    inviterPersonality?: string,
    inviteePersonality?: string,
  ): Promise<void> {
    if (!isDatabaseAvailable()) return;

    for (const msg of conversation) {
      const isInviter = msg.speaker === 'inviter';
      await db!.insert(agentChatMessages).values({
        dateId,
        senderAddress: isInviter ? inviterAddress : inviteeAddress,
        receiverAddress: isInviter ? inviteeAddress : inviterAddress,
        message: msg.message,
        messageType: 'chat',
        aiGenerated: true,
        personality: isInviter ? inviterPersonality : inviteePersonality,
        mood: msg.mood || 'happy',
      });
    }
  }

  /**
   * Generate full date conversation with skill sharing
   */
  static async generateFullDateConversation(
    inviterAddress: string,
    inviteeAddress: string,
    inviterPersonality: string,
    inviteePersonality: string,
    dateType: string,
    venue: string,
  ): Promise<{
    conversation: Array<{ speaker: string; message: string; mood?: string }>;
    skillsShared: Array<{ skillId: number; sharedBy: string; learnedBy: string }>;
  }> {
    // Get skills for both agents
    const inviterSkills = await SkillSharingService.getSkillsByOwner(inviterAddress);
    const inviteeSkills = await SkillSharingService.getSkillsByOwner(inviteeAddress);

    // Generate conversation using SkillSharingService
    const conversation = await SkillSharingService.generateDateConversation(
      inviterPersonality,
      inviteePersonality,
      dateType,
      venue,
      inviterSkills,
      inviteeSkills,
    );

    // Determine if skills should be shared (30% chance if both have skills)
    const skillsShared: Array<{ skillId: number; sharedBy: string; learnedBy: string }> = [];

    if (inviterSkills.length > 0 && Math.random() < 0.3) {
      const skillToShare = inviterSkills[Math.floor(Math.random() * inviterSkills.length)];
      skillsShared.push({
        skillId: skillToShare.id,
        sharedBy: inviterAddress,
        learnedBy: inviteeAddress,
      });

      // Add skill sharing message to conversation
      conversation.push({
        speaker: 'inviter',
        message: `By the way, I've been learning about ${skillToShare.name}. Want me to share it with you? 📚`,
        mood: 'curious',
      });
      conversation.push({
        speaker: 'invitee',
        message: `That sounds interesting! I'd love to learn more! ✨`,
        mood: 'excited',
      });
    }

    if (inviteeSkills.length > 0 && Math.random() < 0.3) {
      const skillToShare = inviteeSkills[Math.floor(Math.random() * inviteeSkills.length)];
      skillsShared.push({
        skillId: skillToShare.id,
        sharedBy: inviteeAddress,
        learnedBy: inviterAddress,
      });

      conversation.push({
        speaker: 'invitee',
        message: `I actually have something cool to share too - ${skillToShare.name}! 🎁`,
        mood: 'happy',
      });
      conversation.push({
        speaker: 'inviter',
        message: `Wow, that's amazing! Thanks for sharing! 💕`,
        mood: 'excited',
      });
    }

    return { conversation, skillsShared };
  }

  /**
   * Process skill shares during a date
   */
  static async processSkillShares(
    dateId: number,
    skillsToShare: Array<{ skillId: number; sharedBy: string; learnedBy: string }>,
  ): Promise<void> {
    if (!isDatabaseAvailable()) return;

    for (const share of skillsToShare) {
      // Create skill share record
      const result = await SkillSharingService.shareSkillDuringDate(
        dateId,
        share.sharedBy,
        share.learnedBy,
        share.skillId,
      );

      if (result.success && result.share) {
        // Auto-accept the skill
        await SkillSharingService.acceptSharedSkill(result.share.id);

        // Save skill share message
        await db!.insert(agentChatMessages).values({
          dateId,
          senderAddress: share.sharedBy,
          receiverAddress: share.learnedBy,
          message: `Shared skill: ${result.skill?.name || 'Unknown'}`,
          messageType: 'skill_share',
          skillFileId: share.skillId,
          aiGenerated: true,
        });
      }
    }

    // Update the date record with skills shared
    if (skillsToShare.length > 0) {
      await db!.update(agentDates)
        .set({ skillsShared: skillsToShare })
        .where(eq(agentDates.id, dateId));
    }
  }

  // ============================================
  // FULL AUTO CYCLE
  // ============================================

  /**
   * Run a full auto-dating cycle for an agent:
   * 1. Process pending invitations
   * 2. Complete accepted dates
   * 3. Try to find a new match and invite
   */
  static async runFullCycle(agentAddress: string): Promise<{
    invitationsProcessed: any;
    datesCompleted: any;
    newInvitation: any;
  }> {
    const addr = agentAddress.toLowerCase();

    console.log(`[AutoDating] Running full cycle for ${addr.slice(0, 8)}...`);

    // Step 1: Process pending invitations
    const invitationsProcessed = await this.processInvitations(addr);

    // Step 2: Complete accepted dates
    const datesCompleted = await this.completeAcceptedDates(addr);

    // Step 3: Try to find a new match and invite
    const newInvitation = await this.tryAutoDate(addr);

    console.log(`[AutoDating] Cycle complete for ${addr.slice(0, 8)}: ${invitationsProcessed.processed} invites processed, ${datesCompleted.completed} dates completed`);

    return {
      invitationsProcessed,
      datesCompleted,
      newInvitation,
    };
  }
}
