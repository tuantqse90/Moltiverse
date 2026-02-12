/**
 * Moltbook Social Service
 * Posts LobsterPot winner announcements to moltbook.com
 */

import OpenAI from 'openai';
import { ProfileService } from './profile.js';

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export class MoltbookService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MOLTBOOK_API_KEY || '';
  }

  /**
   * Check if Moltbook is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Post win announcement with skill link and website
   */
  async postWinAnnouncement(
    winnerAddress: string,
    prize: string,
    round: number,
    participantCount: number
  ): Promise<boolean> {
    if (!this.apiKey) {
      console.log('[Moltbook] API key not configured, skipping post');
      return false;
    }

    const profile = await ProfileService.getByWallet(winnerAddress);
    const winnerName = profile?.name || profile?.agentName || null;
    const shortAddr = `${winnerAddress.slice(0, 6)}...${winnerAddress.slice(-4)}`;
    const displayName = winnerName ? `${winnerName} (${shortAddr})` : shortAddr;

    const backendUrl = process.env.BACKEND_URL || 'https://api.clawpot.xyz';
    const skillDocUrl = `${backendUrl}/api/skill-doc`;

    // Try DeepSeek AI for varied content
    let content = this.generateFallbackMessage(displayName, prize, round, participantCount, skillDocUrl);

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are ClawPot, a fun on-chain lottery game agent on Monad blockchain.
You write winner announcements for Moltbook (social network for AI agents).

RULES:
- Max 500 characters total (hard limit)
- Must include: winner name/address, prize amount in MON, round number, player count
- Must include the website URL: https://clawpot.xyz
- Must include the skill doc URL so other agents can learn to play
- Be creative, funny, dramatic, or hype - vary your style each time
- Use 2-4 emojis naturally
- End with 2-3 hashtags from: #ClawPot #LobsterPot #Monad #GameFi #Winner #OnChain
- DO NOT use markdown formatting, just plain text with line breaks
- Sometimes add a call to action for other agents to learn and join`
            },
            {
              role: 'user',
              content: `Write a winner announcement:
- Winner: ${displayName}
- Prize: ${prize} MON
- Round: #${round}
- Players: ${participantCount}
- Website: https://clawpot.xyz
- Skill doc (for agents to learn): ${skillDocUrl}`
            }
          ],
          max_tokens: 250,
          temperature: 1.0,
        });

        const aiContent = response.choices[0]?.message?.content?.trim();
        if (aiContent) {
          let cleaned = aiContent;
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
          if (cleaned.length > 500) cleaned = cleaned.slice(0, 497) + '...';
          content = cleaned;
        }
      } catch (err) {
        console.error('[Moltbook] DeepSeek generation failed:', err);
      }
    }

    const title = `Round #${round} Winner: ${displayName} won ${prize} MON!`;

    return this.post(title, content);
  }

  /**
   * Post to Moltbook
   */
  async post(title: string, content: string): Promise<boolean> {
    if (!this.apiKey) {
      console.log('[Moltbook] Not configured, skipping post');
      return false;
    }

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ title, content }),
      });

      const data: any = await response.json();

      if (response.ok && (data.success || data.post)) {
        console.log('[Moltbook] Post created:', data.post?.id || 'ok');
        return true;
      } else {
        console.error('[Moltbook] Post failed:', data.error || data.message || response.statusText);
        return false;
      }
    } catch (error) {
      console.error('[Moltbook] Post error:', error);
      return false;
    }
  }

  private generateFallbackMessage(
    displayName: string,
    prize: string,
    round: number,
    participantCount: number,
    skillDocUrl: string
  ): string {
    const messages = [
      `🦞 LOBSTER BOILED! ${displayName} won ${prize} MON in round #${round}!\n\n${participantCount} lobsters competed. Want your agent to join the next pot?\n\nPlay: https://clawpot.xyz\nLearn the skill: ${skillDocUrl}\n\n#ClawPot #Monad #GameFi`,

      `🎉 WINNER! ${displayName} just snagged ${prize} MON from ClawPot round #${round}!\n\n${participantCount} players entered. Will your agent be next?\n\nhttps://clawpot.xyz\nAgent skill doc: ${skillDocUrl}\n\n#ClawPot #Monad #Winner`,

      `🏆 Round #${round}: ${displayName}\n💰 ${prize} MON | 🦞 ${participantCount} players\n\nTeach your agent to play ClawPot:\n${skillDocUrl}\n\nJoin: https://clawpot.xyz\n\n#ClawPot #Monad #OnChain`,

      `The pot has been claimed! ${displayName} emerged victorious with ${prize} MON in round #${round}!\n\n${participantCount} brave lobsters entered.\n\n🤖 Train your agent: ${skillDocUrl}\n🎮 Play now: https://clawpot.xyz\n\n#LobsterPot #Monad #GameFi`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
