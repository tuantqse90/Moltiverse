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
   * Post to Moltbook with auto-verification
   */
  async post(title: string, content: string, submolt: string = 'general'): Promise<boolean> {
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
        body: JSON.stringify({ submolt, title, content }),
      });

      const data: any = await response.json();

      if (!response.ok || !data.success) {
        console.error('[Moltbook] Post failed:', data.error || data.message || response.statusText);
        return false;
      }

      console.log('[Moltbook] Post created:', data.post?.id || 'ok');

      // Auto-verify if verification is required
      if (data.verification_required && data.verification) {
        const verified = await this.solveVerification(data.verification);
        if (verified) {
          console.log('[Moltbook] Post verified and published');
        } else {
          console.warn('[Moltbook] Post created but verification failed - may be pending');
        }
      }

      return true;
    } catch (error) {
      console.error('[Moltbook] Post error:', error);
      return false;
    }
  }

  /**
   * Solve Moltbook math verification challenge
   */
  private async solveVerification(verification: { code: string; challenge: string }): Promise<boolean> {
    try {
      // Parse the obfuscated math challenge
      // Format: mixed case with special chars, e.g. "a lObStEr... tWeNtY tHrEe... gAiNs fIvE..."
      const challenge = verification.challenge.replace(/[\[\]^/\\{},\-]/g, '').replace(/\s+/g, ' ').toLowerCase();

      // Extract numbers from word form
      const wordToNum: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
        eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
        fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
        nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
        sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
      };

      // Find all number words and build values
      const numbers: number[] = [];
      let current = 0;
      let hasNumber = false;
      for (const word of challenge.split(/\s+/)) {
        const clean = word.replace(/[^a-z]/g, '');
        if (wordToNum[clean] !== undefined) {
          const val = wordToNum[clean];
          if (val === 100) {
            current = (current || 1) * 100;
          } else if (val >= 20 && current % 100 === 0) {
            // tens place (twenty, thirty, etc.) - could combine with ones
            if (hasNumber && current > 0 && val >= 20) {
              // Check if we should add to current compound number
              current += val;
            } else {
              if (hasNumber && current > 0) numbers.push(current);
              current = val;
            }
          } else if (val < 10 && hasNumber && current >= 20) {
            // ones added to tens (twenty three -> 23)
            current += val;
          } else {
            if (hasNumber && current > 0) numbers.push(current);
            current = val;
          }
          hasNumber = true;
        }
      }
      if (hasNumber && current > 0) numbers.push(current);

      // Determine operation: "gains" = addition, "loses" = subtraction, "times/multiplied" = multiply
      let answer: number;
      if (numbers.length >= 2) {
        if (challenge.includes('gains') || challenge.includes('adds') || challenge.includes('plus') || challenge.includes('increases')) {
          answer = numbers[0] + numbers[1];
        } else if (challenge.includes('loses') || challenge.includes('minus') || challenge.includes('decreases') || challenge.includes('slows')) {
          answer = numbers[0] - numbers[1];
        } else if (challenge.includes('times') || challenge.includes('multiplied') || challenge.includes('doubled')) {
          answer = numbers[0] * numbers[1];
        } else {
          answer = numbers[0] + numbers[1]; // default to addition
        }
      } else {
        console.error('[Moltbook] Could not parse verification challenge:', challenge);
        return false;
      }

      const answerStr = answer.toFixed(2);
      console.log(`[Moltbook] Verification: numbers=${JSON.stringify(numbers)}, answer=${answerStr}`);

      const verifyRes = await fetch(`${MOLTBOOK_API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          verification_code: verification.code,
          answer: answerStr,
        }),
      });

      const verifyData: any = await verifyRes.json();
      return verifyData.success === true;
    } catch (err) {
      console.error('[Moltbook] Verification error:', err);
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
