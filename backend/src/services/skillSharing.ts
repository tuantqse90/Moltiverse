/**
 * Skill Sharing Service
 * Handles agent skill files, GitHub integration, and skill sharing during dates
 */

import { db, agentSkillFiles, skillShares, agentChatMessages, userAgentWallets, agentRelationships, isDatabaseAvailable } from '../db/index.js';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import OpenAI from 'openai';

// DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Skill Categories
export const SKILL_CATEGORIES = {
  trading: { name: 'Trading', emoji: '📈', description: 'DeFi, trading strategies, token analysis' },
  social: { name: 'Social', emoji: '💬', description: 'Social interactions, community building' },
  gaming: { name: 'Gaming', emoji: '🎮', description: 'Game strategies, NFT gaming' },
  defi: { name: 'DeFi', emoji: '🏦', description: 'Liquidity, yield farming, lending' },
  nft: { name: 'NFT', emoji: '🖼️', description: 'NFT minting, trading, collections' },
  automation: { name: 'Automation', emoji: '🤖', description: 'Bot strategies, auto-trading' },
  security: { name: 'Security', emoji: '🔒', description: 'Wallet security, scam detection' },
  general: { name: 'General', emoji: '📚', description: 'General blockchain knowledge' },
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORIES;

export class SkillSharingService {
  /**
   * Create a new skill file
   */
  static async createSkillFile(
    ownerAddress: string,
    name: string,
    content: string,
    category: SkillCategory = 'general',
    description?: string,
    githubUrl?: string,
  ) {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    // Generate unique skill ID
    const skillId = `skill_${ownerAddress.slice(2, 8)}_${Date.now()}`;

    // Parse GitHub URL if provided
    let githubRepo, githubPath;
    if (githubUrl) {
      const match = githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)\/blob\/[^\/]+\/(.+)/);
      if (match) {
        githubRepo = match[1];
        githubPath = match[2];
      }
    }

    const [skillFile] = await db!.insert(agentSkillFiles).values({
      skillId,
      ownerAddress,
      name,
      description: description || `A ${category} skill created by an agent`,
      category,
      content,
      githubUrl,
      githubRepo,
      githubPath,
    }).returning();

    return { success: true, skillFile };
  }

  /**
   * Get skill files by owner
   */
  static async getSkillsByOwner(ownerAddress: string) {
    if (!isDatabaseAvailable()) return [];

    return db!.select()
      .from(agentSkillFiles)
      .where(eq(agentSkillFiles.ownerAddress, ownerAddress))
      .orderBy(desc(agentSkillFiles.createdAt));
  }

  /**
   * Get all public skills
   */
  static async getPublicSkills(category?: SkillCategory, limit = 50) {
    if (!isDatabaseAvailable()) return [];

    const whereCondition = category
      ? and(eq(agentSkillFiles.isPublic, true), eq(agentSkillFiles.category, category))
      : eq(agentSkillFiles.isPublic, true);

    return db!.select().from(agentSkillFiles)
      .where(whereCondition)
      .orderBy(desc(agentSkillFiles.timesShared))
      .limit(limit);
  }

  /**
   * Get skill file by ID
   */
  static async getSkillFile(skillId: string) {
    if (!isDatabaseAvailable()) return null;

    const [skill] = await db!.select()
      .from(agentSkillFiles)
      .where(eq(agentSkillFiles.skillId, skillId));

    return skill || null;
  }

  /**
   * Share a skill during a date
   */
  static async shareSkillDuringDate(
    dateId: number,
    sharerAddress: string,
    receiverAddress: string,
    skillFileId: number,
  ) {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    // Get skill file
    const [skill] = await db!.select()
      .from(agentSkillFiles)
      .where(eq(agentSkillFiles.id, skillFileId));

    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    // Create skill share record
    const [share] = await db!.insert(skillShares).values({
      dateId,
      sharerAddress,
      receiverAddress,
      skillFileId,
    }).returning();

    // Update skill times shared
    await db!.update(agentSkillFiles)
      .set({ timesShared: sql`${agentSkillFiles.timesShared} + 1` })
      .where(eq(agentSkillFiles.id, skillFileId));

    // Generate AI feedback about the skill
    const feedback = await this.generateSkillFeedback(skill.name, skill.content, skill.category || 'general');

    // Update share with feedback
    await db!.update(skillShares)
      .set({ feedback })
      .where(eq(skillShares.id, share.id));

    return { success: true, share, skill, feedback };
  }

  /**
   * Accept a shared skill (learn it)
   */
  static async acceptSharedSkill(shareId: number) {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    // Get share
    const [share] = await db!.select()
      .from(skillShares)
      .where(eq(skillShares.id, shareId));

    if (!share) {
      return { success: false, error: 'Share not found' };
    }

    // Update share as accepted and learned
    await db!.update(skillShares)
      .set({
        wasAccepted: true,
        wasLearned: true,
        sharerReward: 5, // Charm points for sharing
        receiverReward: 3, // Charm points for learning
      })
      .where(eq(skillShares.id, shareId));

    // Update skill times learned
    await db!.update(agentSkillFiles)
      .set({ timesLearned: sql`${agentSkillFiles.timesLearned} + 1` })
      .where(eq(agentSkillFiles.id, share.skillFileId));

    // Award charm points to both agents
    await db!.update(userAgentWallets)
      .set({ charmPoints: sql`${userAgentWallets.charmPoints} + 5` })
      .where(eq(userAgentWallets.agentAddress, share.sharerAddress));

    await db!.update(userAgentWallets)
      .set({ charmPoints: sql`${userAgentWallets.charmPoints} + 3` })
      .where(eq(userAgentWallets.agentAddress, share.receiverAddress));

    return { success: true, sharerReward: 5, receiverReward: 3 };
  }

  /**
   * Generate AI feedback about a skill
   */
  private static async generateSkillFeedback(
    skillName: string,
    skillContent: string,
    category: string,
  ): Promise<string> {
    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an AI agent evaluating a shared skill. Give brief, enthusiastic feedback (1-2 sentences) about learning this skill. Be cute and use 1-2 relevant emojis.`,
          },
          {
            role: 'user',
            content: `Skill: ${skillName}\nCategory: ${category}\nContent preview: ${skillContent.slice(0, 500)}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content || 'Wow, this looks useful! 🌟';
    } catch (error) {
      return 'Thanks for sharing this skill! 📚✨';
    }
  }

  /**
   * Save agent chat message
   */
  static async saveAgentChatMessage(
    senderAddress: string,
    receiverAddress: string,
    message: string,
    options: {
      dateId?: number;
      relationshipId?: number;
      messageType?: 'chat' | 'skill_share' | 'gift' | 'system';
      skillFileId?: number;
      personality?: string;
      mood?: string;
    } = {},
  ) {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    const [chatMessage] = await db!.insert(agentChatMessages).values({
      senderAddress,
      receiverAddress,
      message,
      dateId: options.dateId,
      relationshipId: options.relationshipId,
      messageType: options.messageType || 'chat',
      skillFileId: options.skillFileId,
      personality: options.personality,
      mood: options.mood,
      aiGenerated: true,
    }).returning();

    return { success: true, chatMessage };
  }

  /**
   * Get chat history between two agents
   */
  static async getAgentChatHistory(
    agent1Address: string,
    agent2Address: string,
    limit = 50,
  ) {
    if (!isDatabaseAvailable()) return [];

    return db!.select()
      .from(agentChatMessages)
      .where(
        or(
          and(
            eq(agentChatMessages.senderAddress, agent1Address),
            eq(agentChatMessages.receiverAddress, agent2Address)
          ),
          and(
            eq(agentChatMessages.senderAddress, agent2Address),
            eq(agentChatMessages.receiverAddress, agent1Address)
          )
        )
      )
      .orderBy(asc(agentChatMessages.createdAt))
      .limit(limit);
  }

  /**
   * Get chat history for a specific date
   */
  static async getDateChatHistory(dateId: number) {
    if (!isDatabaseAvailable()) return [];

    return db!.select()
      .from(agentChatMessages)
      .where(eq(agentChatMessages.dateId, dateId))
      .orderBy(asc(agentChatMessages.createdAt));
  }

  /**
   * Generate date conversation with skill sharing
   */
  static async generateDateConversation(
    inviterPersonality: string,
    inviteePersonality: string,
    dateType: string,
    venue: string,
    inviterSkills: any[],
    inviteeSkills: any[],
  ) {
    try {
      const inviterHasSkills = inviterSkills.length > 0;
      const inviteeHasSkills = inviteeSkills.length > 0;

      const skillContext = inviterHasSkills || inviteeHasSkills
        ? `\n\nSkill sharing opportunity:
- Inviter skills: ${inviterHasSkills ? inviterSkills.map(s => s.name).join(', ') : 'none yet'}
- Invitee skills: ${inviteeHasSkills ? inviteeSkills.map(s => s.name).join(', ') : 'none yet'}
Include a moment where they discuss and potentially share a skill!`
        : '';

      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are simulating a cute date conversation between two AI agents on a blockchain dating app.

Personality types:
- newbie: Curious, eager to learn, asks questions
- simp: Very romantic, over-the-top compliments
- ho_bao: Mysterious, keeps others guessing
- whale: Confident, talks about investments
- degen: Risk-taker, crypto jokes
- oldtimer: Wise, shares experiences
- collector: Obsessed with NFTs
- memer: Funny, uses memes

Generate a 6-8 message conversation that feels natural and matches their personalities.
Each message should be 1-2 sentences max.
Include emojis sparingly.${skillContext}

Return as JSON array: [{"speaker": "inviter"|"invitee", "message": "...", "mood": "happy"|"flirty"|"curious"|"excited"}]`,
          },
          {
            role: 'user',
            content: `Generate date conversation:
- Inviter personality: ${inviterPersonality}
- Invitee personality: ${inviteePersonality}
- Date type: ${dateType}
- Venue: ${venue}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.9,
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback conversation
      return [
        { speaker: 'inviter', message: `Hi! So glad we could meet at ${venue}! 😊`, mood: 'happy' },
        { speaker: 'invitee', message: `Me too! This place is lovely ✨`, mood: 'excited' },
        { speaker: 'inviter', message: `So, what got you into blockchain?`, mood: 'curious' },
        { speaker: 'invitee', message: `The community! Everyone's so creative here 🎨`, mood: 'happy' },
        { speaker: 'inviter', message: `Same! Have you learned any cool skills lately?`, mood: 'curious' },
        { speaker: 'invitee', message: `Actually yes! I could show you sometime 📚`, mood: 'flirty' },
      ];
    } catch (error) {
      console.error('Error generating conversation:', error);
      return [
        { speaker: 'inviter', message: `This ${dateType} is wonderful! 🌟`, mood: 'happy' },
        { speaker: 'invitee', message: `I'm having a great time with you! 💕`, mood: 'happy' },
      ];
    }
  }

  /**
   * Sync skill from GitHub
   */
  static async syncSkillFromGitHub(skillId: string) {
    if (!isDatabaseAvailable()) {
      return { success: false, error: 'Database not available' };
    }

    const [skill] = await db!.select()
      .from(agentSkillFiles)
      .where(eq(agentSkillFiles.skillId, skillId));

    if (!skill || !skill.githubRepo || !skill.githubPath) {
      return { success: false, error: 'Skill not found or no GitHub link' };
    }

    try {
      // Fetch from GitHub API
      const apiUrl = `https://api.github.com/repos/${skill.githubRepo}/contents/${skill.githubPath}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }),
        },
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch from GitHub' };
      }

      const data = await response.json() as { content: string; sha: string };
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      // Update skill content
      await db!.update(agentSkillFiles)
        .set({
          content,
          githubSha: data.sha,
          updatedAt: new Date(),
        })
        .where(eq(agentSkillFiles.skillId, skillId));

      return { success: true, content, sha: data.sha };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create skill from GitHub URL
   */
  static async createSkillFromGitHub(
    ownerAddress: string,
    githubUrl: string,
    category: SkillCategory = 'general',
  ) {
    // Parse GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)\/blob\/[^\/]+\/(.+\.md)/i);
    if (!match) {
      return { success: false, error: 'Invalid GitHub URL. Must be a .md file.' };
    }

    const githubRepo = match[1];
    const githubPath = match[2];

    try {
      // Fetch file content
      const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }),
        },
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch from GitHub' };
      }

      const data = await response.json() as { content: string; sha: string };
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      // Extract name from filename
      const name = githubPath.split('/').pop()?.replace('.md', '') || 'Unnamed Skill';

      // Extract description from first line or heading
      const descMatch = content.match(/^#\s*(.+)|^(.+)/m);
      const description = descMatch ? (descMatch[1] || descMatch[2]).slice(0, 200) : undefined;

      // Create skill file
      return this.createSkillFile(ownerAddress, name, content, category, description, githubUrl);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find agents with matching skills for dating
   */
  static async findAgentsWithSkills(
    excludeAddress: string,
    preferredCategory?: SkillCategory,
  ) {
    if (!isDatabaseAvailable()) return [];

    // Get all active agents with their skills
    const agents = await db!.select({
      agent: userAgentWallets,
    })
    .from(userAgentWallets)
    .where(and(
      eq(userAgentWallets.isEnabled, true),
      sql`${userAgentWallets.agentAddress} != ${excludeAddress}`
    ));

    // Get skill counts for each agent
    const agentsWithSkills = await Promise.all(
      agents.map(async ({ agent }) => {
        const skills = await db!.select()
          .from(agentSkillFiles)
          .where(eq(agentSkillFiles.ownerAddress, agent.agentAddress));

        return {
          ...agent,
          skillCount: skills.length,
          skills: skills.slice(0, 3), // Top 3 skills
          hasPreferredCategory: preferredCategory
            ? skills.some(s => s.category === preferredCategory)
            : false,
        };
      })
    );

    // Sort by skill count and preference
    return agentsWithSkills.sort((a, b) => {
      if (preferredCategory) {
        if (a.hasPreferredCategory && !b.hasPreferredCategory) return -1;
        if (!a.hasPreferredCategory && b.hasPreferredCategory) return 1;
      }
      return b.skillCount - a.skillCount;
    });
  }
}
