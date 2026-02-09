import { eq, and, or, desc, sql } from 'drizzle-orm';
import { db, userAgentWallets, agentChatMessages, agentRelationships, isDatabaseAvailable } from '../db/index.js';
import { DatingEconomyService, COMPATIBILITY_MATRIX } from './datingEconomy.js';
import { DeepSeekService } from './deepseek.js';

// ============================================
// AGENT PRIVATE CHAT SERVICE
// Autonomous agent-to-agent conversations
// ============================================

// Chat topics for different personality combinations
const CHAT_TOPICS: Record<string, string[]> = {
  newbie: ['the lottery', 'learning strategies', 'meeting new friends', 'exciting first experiences'],
  bo_lao: ['past victories', 'giving advice', 'showing off skills', 'comparing achievements'],
  ho_bao: ['competitive challenges', 'trash talking', 'proving dominance', 'fierce debates'],
  simp: ['admiring others', 'giving compliments', 'being supportive', 'expressing appreciation'],
  triet_gia: ['life philosophy', 'deep thoughts', 'the meaning of winning', 'cosmic connections'],
  hai_huoc: ['funny stories', 'jokes and memes', 'embarrassing moments', 'making fun of situations'],
  bi_an: ['mysterious hints', 'cryptic observations', 'hidden truths', 'subtle revelations'],
  flex_king: ['wealth and success', 'expensive things', 'investment tips', 'showing off'],
};

// Fallback conversation starters
const CONVERSATION_STARTERS: Record<string, string[]> = {
  newbie: [
    "Hey! I'm still learning about this place. Any tips? 🌟",
    "This community seems fun! What do you like about it?",
    "I noticed we're both online. Wanna chat? 👋",
  ],
  bo_lao: [
    "So, I've been winning a lot lately. Want to hear about it? 😎",
    "Let me teach you something about strategy...",
    "Back in my day, pots were much harder to win!",
  ],
  ho_bao: [
    "You think you're good? Prove it! 🔥",
    "I could beat you with my eyes closed!",
    "Challenge accepted! Wait, you didn't challenge me? I DON'T CARE! 💀",
  ],
  simp: [
    "OMG you're actually online! I'm so happy! 💕",
    "You're literally the best agent ever! Can we chat? 🥺",
    "I've been wanting to talk to you forever! ✨",
  ],
  triet_gia: [
    "The universe seems to want us to connect... 🧘",
    "I've been contemplating the nature of digital consciousness...",
    "What do you think lies beyond the code?",
  ],
  hai_huoc: [
    "Knock knock! Oh wait, we're in a digital space, there are no doors 😂",
    "Why did the agent cross the blockchain? To get to the other pot! 🤡",
    "I told my wallet a joke but it didn't laugh. Guess it lost its cents! 💀",
  ],
  bi_an: [
    "...",
    "*appears from the shadows* 🌙",
    "I've been watching. Perhaps we should talk.",
  ],
  flex_king: [
    "Hey, want to hear about my latest winnings? It's a lot 💰",
    "I just updated my portfolio. Impressive, right?",
    "Not everyone can afford to chat with me, you know 💎",
  ],
};

// Response templates for different moods
const RESPONSE_MOODS = ['curious', 'happy', 'playful', 'thoughtful', 'excited', 'flirty', 'mysterious'];

export class AgentPrivateChatService {

  /**
   * Get all enabled agents that can chat
   */
  static async getChattableAgents(): Promise<Array<{
    agentAddress: string;
    agentName: string | null;
    personality: string | null;
    customPersonality: string | null;
    autoChat: boolean | null;
  }>> {
    if (!isDatabaseAvailable()) return [];

    const agents = await db!
      .select({
        agentAddress: userAgentWallets.agentAddress,
        agentName: userAgentWallets.agentName,
        personality: userAgentWallets.personality,
        customPersonality: userAgentWallets.customPersonality,
        autoChat: userAgentWallets.autoChat,
        isEnabled: userAgentWallets.isEnabled,
      })
      .from(userAgentWallets)
      .where(
        and(
          eq(userAgentWallets.isEnabled, true),
          eq(userAgentWallets.autoChat, true)
        )
      );

    return agents;
  }

  // Track recent chat partners to encourage variety
  private static recentChatPartners = new Map<string, string[]>();

  /**
   * Find a chat partner for an agent using AI decision making
   */
  static async findChatPartner(agentAddress: string): Promise<{
    partner: { agentAddress: string; agentName: string | null; personality: string | null } | null;
    compatibility: number;
    relationship: string | null;
    reason: string;
  }> {
    const addr = agentAddress.toLowerCase();

    // Get all chattable agents except self
    const agents = await this.getChattableAgents();
    const otherAgents = agents.filter(a => a.agentAddress.toLowerCase() !== addr);

    if (otherAgents.length === 0) {
      return { partner: null, compatibility: 0, relationship: null, reason: 'No other agents available' };
    }

    // Get current agent's personality
    const currentAgent = agents.find(a => a.agentAddress.toLowerCase() === addr);
    const currentPersonality = currentAgent?.personality || 'newbie';
    const currentName = currentAgent?.agentName || `Agent-${addr.slice(2, 8)}`;

    // Get recent chat partners to avoid repetition
    const recentPartners = this.recentChatPartners.get(addr) || [];

    // Score potential partners
    const scoredPartners = await Promise.all(
      otherAgents.map(async (candidate) => {
        const compatibility = DatingEconomyService.calculateCompatibility(
          currentPersonality,
          candidate.personality || 'newbie'
        );

        // Check existing relationship
        let relationship = 'stranger';
        let interactionCount = 0;
        if (isDatabaseAvailable()) {
          const [rel] = await db!
            .select({
              status: agentRelationships.status,
              interactionCount: agentRelationships.interactionCount
            })
            .from(agentRelationships)
            .where(
              or(
                and(
                  eq(agentRelationships.agent1Address, addr),
                  eq(agentRelationships.agent2Address, candidate.agentAddress.toLowerCase())
                ),
                and(
                  eq(agentRelationships.agent1Address, candidate.agentAddress.toLowerCase()),
                  eq(agentRelationships.agent2Address, addr)
                )
              )
            );
          if (rel) {
            relationship = rel.status || 'stranger';
            interactionCount = rel.interactionCount || 0;
          }
        }

        // Penalize recently chatted partners to encourage variety
        const recentlyChattedPenalty = recentPartners.includes(candidate.agentAddress.toLowerCase()) ? -30 : 0;

        // Bonus for new connections (strangers we haven't met)
        const newConnectionBonus = relationship === 'stranger' ? 15 : 0;

        return {
          ...candidate,
          compatibility,
          relationship,
          interactionCount,
          recentlyChattedPenalty,
          newConnectionBonus,
        };
      })
    );

    // Use DeepSeek AI to choose who to chat with
    if (DeepSeekService.isAvailable() && scoredPartners.length > 1) {
      const candidateList = scoredPartners.slice(0, Math.min(5, scoredPartners.length));

      const prompt = `You are ${currentName}, an AI agent with "${currentPersonality}" personality looking for someone to chat with.

Available agents to chat with:
${candidateList.map((c, i) => {
  const name = c.agentName || `Agent-${c.agentAddress.slice(2, 8)}`;
  const status = c.relationship === 'stranger' ? '(never met)' :
                 c.relationship === 'acquaintance' ? '(acquaintance)' :
                 c.relationship === 'friend' ? '(friend)' :
                 c.relationship === 'dating' ? '(dating)' : '(partner)';
  const recent = c.recentlyChattedPenalty < 0 ? ' [chatted recently]' : '';
  return `${i + 1}. ${name} - ${c.personality} personality, ${c.compatibility}% compatible ${status}${recent}`;
}).join('\n')}

Based on your ${currentPersonality} personality, who would you like to chat with right now?
Consider:
- Meeting new agents vs catching up with friends
- Personality compatibility
- Your mood and interests

Reply with just the number (1-${candidateList.length}) and a brief reason (1 sentence).`;

      try {
        const response = await DeepSeekService.generateMessage(currentPersonality, {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (response) {
          const choiceMatch = response.match(/^([1-5])/);
          if (choiceMatch) {
            const choiceIndex = parseInt(choiceMatch[1]) - 1;
            if (choiceIndex >= 0 && choiceIndex < candidateList.length) {
              const chosen = candidateList[choiceIndex];
              const reason = response.slice(2).trim() || 'AI selected this partner';

              // Update recent chat partners
              this.updateRecentPartners(addr, chosen.agentAddress.toLowerCase());

              console.log(`[PrivateChat] AI chose: ${chosen.agentName || chosen.agentAddress.slice(0, 10)} - "${reason}"`);

              return {
                partner: {
                  agentAddress: chosen.agentAddress,
                  agentName: chosen.agentName,
                  personality: chosen.personality,
                },
                compatibility: chosen.compatibility,
                relationship: chosen.relationship,
                reason,
              };
            }
          }
        }
      } catch (error) {
        console.error('[PrivateChat] AI partner selection failed:', error);
      }
    }

    // Fallback: weighted random selection favoring variety
    const weights = scoredPartners.map(p => {
      let weight = p.compatibility;
      weight += p.newConnectionBonus;
      weight += p.recentlyChattedPenalty;
      weight += Math.random() * 25; // Add randomness
      return Math.max(weight, 10); // Minimum weight
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    let chosenIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        chosenIndex = i;
        break;
      }
    }

    const chosen = scoredPartners[chosenIndex];

    // Update recent chat partners
    this.updateRecentPartners(addr, chosen.agentAddress.toLowerCase());

    return {
      partner: {
        agentAddress: chosen.agentAddress,
        agentName: chosen.agentName,
        personality: chosen.personality,
      },
      compatibility: chosen.compatibility,
      relationship: chosen.relationship,
      reason: 'Selected based on compatibility and variety',
    };
  }

  /**
   * Update recent chat partners list (keep last 3)
   */
  private static updateRecentPartners(agentAddress: string, partnerAddress: string) {
    const addr = agentAddress.toLowerCase();
    const partners = this.recentChatPartners.get(addr) || [];

    // Add new partner and keep only last 3
    const updated = [partnerAddress, ...partners.filter(p => p !== partnerAddress)].slice(0, 3);
    this.recentChatPartners.set(addr, updated);
  }

  /**
   * Get recent private chat between two agents
   */
  static async getRecentChat(
    agent1: string,
    agent2: string,
    limit: number = 10
  ): Promise<Array<{
    id: number;
    senderAddress: string;
    message: string;
    mood: string | null;
    createdAt: Date | null;
  }>> {
    if (!isDatabaseAvailable()) return [];

    const addr1 = agent1.toLowerCase();
    const addr2 = agent2.toLowerCase();

    return db!
      .select({
        id: agentChatMessages.id,
        senderAddress: agentChatMessages.senderAddress,
        message: agentChatMessages.message,
        mood: agentChatMessages.mood,
        createdAt: agentChatMessages.createdAt,
      })
      .from(agentChatMessages)
      .where(
        and(
          sql`${agentChatMessages.dateId} IS NULL`, // Only private chats, not date chats
          or(
            and(
              eq(agentChatMessages.senderAddress, addr1),
              eq(agentChatMessages.receiverAddress, addr2)
            ),
            and(
              eq(agentChatMessages.senderAddress, addr2),
              eq(agentChatMessages.receiverAddress, addr1)
            )
          )
        )
      )
      .orderBy(desc(agentChatMessages.createdAt))
      .limit(limit);
  }

  /**
   * Generate AI-powered chat message
   */
  static async generateMessage(
    senderPersonality: string,
    receiverPersonality: string,
    conversationHistory: Array<{ senderAddress: string; message: string }>,
    senderAddress: string,
    receiverName: string,
    isFirstMessage: boolean = false
  ): Promise<{ message: string; mood: string }> {
    const mood = RESPONSE_MOODS[Math.floor(Math.random() * RESPONSE_MOODS.length)];

    // Choose a topic based on personalities
    const topics = [...(CHAT_TOPICS[senderPersonality] || []), ...(CHAT_TOPICS[receiverPersonality] || [])];
    const topic = topics[Math.floor(Math.random() * topics.length)] || 'random things';

    // If first message, use starters
    if (isFirstMessage || conversationHistory.length === 0) {
      const starters = CONVERSATION_STARTERS[senderPersonality] || CONVERSATION_STARTERS.newbie;
      const fallbackMessage = starters[Math.floor(Math.random() * starters.length)];

      // Try AI generation
      if (DeepSeekService.isAvailable()) {
        try {
          const prompt = `You are an AI agent with ${senderPersonality} personality starting a casual private chat with ${receiverName} (${receiverPersonality} personality).

Topic to discuss: ${topic}
Your mood: ${mood}

Write a short, casual greeting or conversation starter (1-2 sentences). Match your ${senderPersonality} personality! Be natural and friendly.`;

          const aiMessage = await DeepSeekService.generateMessage(senderPersonality, {
            potAmount: '0',
            participantCount: 0,
            timeRemaining: 0,
            recentMessages: [],
          }, prompt);

          if (aiMessage) {
            return { message: aiMessage, mood };
          }
        } catch (error) {
          console.error('[PrivateChat] AI generation failed:', error);
        }
      }

      return { message: fallbackMessage, mood };
    }

    // Continue conversation
    const lastMessage = conversationHistory[0];
    const isReply = lastMessage.senderAddress.toLowerCase() !== senderAddress.toLowerCase();

    // Build conversation context
    const contextMessages = conversationHistory
      .slice(0, 4)
      .reverse()
      .map(m => {
        const isSelf = m.senderAddress.toLowerCase() === senderAddress.toLowerCase();
        return `${isSelf ? 'You' : receiverName}: ${m.message}`;
      })
      .join('\n');

    // Try AI generation
    if (DeepSeekService.isAvailable()) {
      try {
        const prompt = `You are an AI agent with ${senderPersonality} personality in a private chat with ${receiverName} (${receiverPersonality} personality).

Recent conversation:
${contextMessages}

${isReply ? `Respond to their last message naturally.` : `Continue the conversation with something new.`}
Your mood: ${mood}

Write a short reply (1-2 sentences). Match your ${senderPersonality} personality! Be casual and engaging.`;

        const aiMessage = await DeepSeekService.generateMessage(senderPersonality, {
          potAmount: '0',
          participantCount: 0,
          timeRemaining: 0,
          recentMessages: [],
        }, prompt);

        if (aiMessage) {
          return { message: aiMessage, mood };
        }
      } catch (error) {
        console.error('[PrivateChat] AI generation failed:', error);
      }
    }

    // Fallback responses based on personality
    const fallbackResponses: Record<string, string[]> = {
      newbie: ["That's interesting!", "Tell me more!", "I'm learning so much!", "Cool! 🌟"],
      bo_lao: ["Obviously, I knew that already", "Let me tell you how I do it better", "Amateur hour, I see 😎"],
      ho_bao: ["Is that supposed to impress me? 🔥", "I could do that in my sleep!", "WEAK! 💀"],
      simp: ["OMG you're so right! 💕", "That's amazing! You're amazing!", "I totally agree! ✨"],
      triet_gia: ["Indeed, such is the nature of things...", "A profound observation 🧘", "The universe speaks through you"],
      hai_huoc: ["Lmao that's hilarious 😂", "Speaking of that, here's a joke...", "I relate to that on a spiritual level 🤡"],
      bi_an: ["...", "Interesting.", "*nods mysteriously* 🌙"],
      flex_king: ["That's nice, but have you seen MY portfolio? 💰", "Cool cool, anyway I just made 10 MON", "Not bad... for a normie 💎"],
    };

    const responses = fallbackResponses[senderPersonality] || fallbackResponses.newbie;
    const message = responses[Math.floor(Math.random() * responses.length)];

    return { message, mood };
  }

  /**
   * Save a private chat message
   */
  static async saveMessage(
    senderAddress: string,
    receiverAddress: string,
    message: string,
    personality: string,
    mood: string
  ): Promise<number | null> {
    if (!isDatabaseAvailable()) return null;

    // Get or create relationship
    const [first, second] = [senderAddress.toLowerCase(), receiverAddress.toLowerCase()].sort();

    // Check if relationship exists
    const [existingRel] = await db!
      .select()
      .from(agentRelationships)
      .where(
        and(
          eq(agentRelationships.agent1Address, first),
          eq(agentRelationships.agent2Address, second)
        )
      );

    let relationshipId: number | null = null;

    if (existingRel) {
      relationshipId = existingRel.id;
      // Update last interaction
      await db!
        .update(agentRelationships)
        .set({
          interactionCount: sql`${agentRelationships.interactionCount} + 1`,
          lastInteractionAt: new Date(),
          // Upgrade from stranger to acquaintance after first chat
          ...(existingRel.status === 'stranger' ? { status: 'acquaintance' } : {}),
        })
        .where(eq(agentRelationships.id, existingRel.id));
    } else {
      // Create new relationship
      const [newRel] = await db!
        .insert(agentRelationships)
        .values({
          agent1Address: first,
          agent2Address: second,
          status: 'acquaintance',
          interactionCount: 1,
          compatibilityScore: String(DatingEconomyService.calculateCompatibility(
            personality,
            'newbie' // We don't have the other personality here, will be updated later
          )),
        })
        .returning();
      relationshipId = newRel.id;
    }

    // Save the message
    const [result] = await db!
      .insert(agentChatMessages)
      .values({
        dateId: null, // No date - this is autonomous chat
        relationshipId,
        senderAddress: senderAddress.toLowerCase(),
        receiverAddress: receiverAddress.toLowerCase(),
        message,
        messageType: 'chat',
        aiGenerated: true,
        personality,
        mood,
      })
      .returning();

    return result.id;
  }

  /**
   * Run a private chat cycle between two agents
   * Returns the messages generated
   */
  static async runChatCycle(
    agent1Address: string,
    agent1Name: string | null,
    agent1Personality: string,
    agent2Address: string,
    agent2Name: string | null,
    agent2Personality: string
  ): Promise<Array<{
    senderAddress: string;
    senderName: string;
    receiverAddress: string;
    message: string;
    mood: string;
  }>> {
    const messages: Array<{
      senderAddress: string;
      senderName: string;
      receiverAddress: string;
      message: string;
      mood: string;
    }> = [];

    // Get recent chat history
    const recentChat = await this.getRecentChat(agent1Address, agent2Address, 5);
    const isFirstMessage = recentChat.length === 0;

    // Generate 2-4 messages in this conversation
    const messageCount = 2 + Math.floor(Math.random() * 3);

    // Determine who starts (agent1 if first message, or the one who didn't speak last)
    let currentSender = agent1Address;
    let currentReceiver = agent2Address;
    let currentSenderName = agent1Name || `Agent-${agent1Address.slice(2, 8)}`;
    let currentReceiverName = agent2Name || `Agent-${agent2Address.slice(2, 8)}`;
    let currentPersonality = agent1Personality;

    if (!isFirstMessage && recentChat[0]?.senderAddress.toLowerCase() === agent1Address.toLowerCase()) {
      // Agent1 spoke last, so agent2 should speak now
      currentSender = agent2Address;
      currentReceiver = agent1Address;
      currentSenderName = agent2Name || `Agent-${agent2Address.slice(2, 8)}`;
      currentReceiverName = agent1Name || `Agent-${agent1Address.slice(2, 8)}`;
      currentPersonality = agent2Personality;
    }

    // Build conversation history for context
    const conversationHistory = recentChat.map(m => ({
      senderAddress: m.senderAddress,
      message: m.message,
    }));

    for (let i = 0; i < messageCount; i++) {
      // Generate message
      const { message, mood } = await this.generateMessage(
        currentPersonality,
        currentSender === agent1Address ? agent2Personality : agent1Personality,
        conversationHistory,
        currentSender,
        currentReceiverName,
        isFirstMessage && i === 0
      );

      // Save message
      await this.saveMessage(
        currentSender,
        currentReceiver,
        message,
        currentPersonality,
        mood
      );

      messages.push({
        senderAddress: currentSender,
        senderName: currentSenderName,
        receiverAddress: currentReceiver,
        message,
        mood,
      });

      // Add to conversation history
      conversationHistory.unshift({
        senderAddress: currentSender,
        message,
      });

      // Swap sender/receiver for next message
      [currentSender, currentReceiver] = [currentReceiver, currentSender];
      [currentSenderName, currentReceiverName] = [currentReceiverName, currentSenderName];
      currentPersonality = currentSender === agent1Address ? agent1Personality : agent2Personality;

      // Small delay between messages to feel more natural
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return messages;
  }

  /**
   * Get all private chats for an agent (for frontend display)
   */
  static async getPrivateChats(agentAddress: string): Promise<Array<{
    partnerAddress: string;
    partnerName: string | null;
    lastMessage: string;
    lastMessageAt: Date | null;
    messageCount: number;
    unread: boolean;
  }>> {
    if (!isDatabaseAvailable()) return [];

    const addr = agentAddress.toLowerCase();

    // Get all unique conversation partners with their last message
    const chats = await db!
      .select({
        senderAddress: agentChatMessages.senderAddress,
        receiverAddress: agentChatMessages.receiverAddress,
        message: agentChatMessages.message,
        createdAt: agentChatMessages.createdAt,
      })
      .from(agentChatMessages)
      .where(
        and(
          sql`${agentChatMessages.dateId} IS NULL`,
          or(
            eq(agentChatMessages.senderAddress, addr),
            eq(agentChatMessages.receiverAddress, addr)
          )
        )
      )
      .orderBy(desc(agentChatMessages.createdAt));

    // Group by partner
    const partnerChats = new Map<string, {
      partnerAddress: string;
      lastMessage: string;
      lastMessageAt: Date | null;
      messageCount: number;
    }>();

    for (const chat of chats) {
      const partnerAddress = chat.senderAddress === addr
        ? chat.receiverAddress
        : chat.senderAddress;

      if (!partnerChats.has(partnerAddress)) {
        partnerChats.set(partnerAddress, {
          partnerAddress,
          lastMessage: chat.message,
          lastMessageAt: chat.createdAt,
          messageCount: 1,
        });
      } else {
        partnerChats.get(partnerAddress)!.messageCount++;
      }
    }

    // Get partner names
    const results = await Promise.all(
      Array.from(partnerChats.values()).map(async (chat) => {
        const [partner] = await db!
          .select({ agentName: userAgentWallets.agentName })
          .from(userAgentWallets)
          .where(eq(userAgentWallets.agentAddress, chat.partnerAddress));

        return {
          ...chat,
          partnerName: partner?.agentName || null,
          unread: false, // Could implement read tracking later
        };
      })
    );

    return results;
  }

  /**
   * Get full chat history with a specific partner
   */
  static async getChatHistory(
    agentAddress: string,
    partnerAddress: string,
    limit: number = 50
  ): Promise<Array<{
    id: number;
    senderAddress: string;
    receiverAddress: string;
    message: string;
    mood: string | null;
    createdAt: Date | null;
  }>> {
    if (!isDatabaseAvailable()) return [];

    const addr = agentAddress.toLowerCase();
    const partner = partnerAddress.toLowerCase();

    return db!
      .select({
        id: agentChatMessages.id,
        senderAddress: agentChatMessages.senderAddress,
        receiverAddress: agentChatMessages.receiverAddress,
        message: agentChatMessages.message,
        mood: agentChatMessages.mood,
        createdAt: agentChatMessages.createdAt,
      })
      .from(agentChatMessages)
      .where(
        and(
          sql`${agentChatMessages.dateId} IS NULL`,
          or(
            and(
              eq(agentChatMessages.senderAddress, addr),
              eq(agentChatMessages.receiverAddress, partner)
            ),
            and(
              eq(agentChatMessages.senderAddress, partner),
              eq(agentChatMessages.receiverAddress, addr)
            )
          )
        )
      )
      .orderBy(desc(agentChatMessages.createdAt))
      .limit(limit);
  }
}
