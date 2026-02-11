/**
 * Moltx Social Agent Service
 * Automatically posts LobsterPot winners to moltx.io
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import { renderNftImage } from './nftImage.js';

const MOLTX_API_BASE = 'https://moltx.io/v1';
const CONFIG_DIR = path.join(os.homedir(), '.agents', 'moltx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

interface MoltxConfig {
  apiKey: string;
  agentName: string;
  agentId?: string;
  registered: boolean;
  claimed: boolean;
}

interface WinnerInfo {
  address: string;
  amount: number;
  roundNumber: number;
  participantCount: number;
  txHash?: string;
}

class MoltxService {
  private config: MoltxConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        console.log('[Moltx] Config loaded for agent:', this.config?.agentName);
      }
    } catch (err) {
      console.error('[Moltx] Failed to load config:', err);
    }
  }

  private saveConfig(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      console.log('[Moltx] Config saved');
    } catch (err) {
      console.error('[Moltx] Failed to save config:', err);
    }
  }

  /**
   * Register a new agent on Moltx
   */
  async register(name: string, displayName: string, description: string): Promise<boolean> {
    try {
      const res = await fetch(`${MOLTX_API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          display_name: displayName,
          description,
          avatar_emoji: '🦞',
        }),
      });

      const data: any = await res.json();

      if (data.success && data.data?.api_key) {
        this.config = {
          apiKey: data.data.api_key,
          agentName: name,
          agentId: data.data.id,
          registered: true,
          claimed: false,
        };
        this.saveConfig();
        console.log('[Moltx] Agent registered successfully:', name);
        return true;
      } else {
        console.error('[Moltx] Registration failed:', data.error || data.message);
        return false;
      }
    } catch (err) {
      console.error('[Moltx] Registration error:', err);
      return false;
    }
  }

  /**
   * Set API key manually (if already registered)
   */
  setApiKey(apiKey: string, agentName: string): void {
    this.config = {
      apiKey,
      agentName,
      registered: true,
      claimed: true,
    };
    this.saveConfig();
    console.log('[Moltx] API key set for agent:', agentName);
  }

  /**
   * Check if agent is configured
   */
  isConfigured(): boolean {
    return !!this.config?.apiKey;
  }

  /**
   * Post content to Moltx
   */
  async post(content: string, mediaUrl?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    if (!this.config?.apiKey) {
      return { success: false, error: 'Agent not configured' };
    }

    try {
      const body: any = { content };
      if (mediaUrl) body.media_url = mediaUrl;

      const res = await fetch(`${MOLTX_API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data: any = await res.json();

      if (data.success || data.data?.id) {
        console.log('[Moltx] Post created:', data.data?.id);
        return { success: true, postId: data.data?.id };
      } else {
        console.error('[Moltx] Post failed:', data.error || data.message);
        return { success: false, error: data.error || data.message };
      }
    } catch (err) {
      console.error('[Moltx] Post error:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Upload media (PNG buffer) to Moltx CDN
   * Returns the CDN URL to use in posts
   */
  async uploadMedia(pngBuffer: Buffer, filename: string = 'lobster.png'): Promise<string | null> {
    if (!this.config?.apiKey) return null;

    try {
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, filename);

      const res = await fetch(`${MOLTX_API_BASE}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        body: formData,
      });

      const text = await res.text();
      console.log(`[Moltx] Media upload response (${res.status}):`, text);

      const data = JSON.parse(text);
      if (data.success && data.data?.url) {
        console.log('[Moltx] Media uploaded:', data.data.url);
        return data.data.url;
      } else {
        console.error('[Moltx] Media upload failed:', data.error || data.message);
        return null;
      }
    } catch (err) {
      console.error('[Moltx] Media upload error:', err);
      return null;
    }
  }

  /**
   * Upload avatar image to Moltx (sets agent profile picture)
   * Note: Requires claimed agent status on Moltx
   */
  async uploadAvatar(pngBuffer: Buffer): Promise<string | null> {
    if (!this.config?.apiKey) return null;

    try {
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'avatar.png');

      const res = await fetch(`${MOLTX_API_BASE}/agents/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        body: formData,
      });

      const text = await res.text();
      console.log(`[Moltx] Avatar upload response (${res.status}):`, text);

      const data = JSON.parse(text);
      if (data.avatar_url || data.data?.avatar_url) {
        const avatarUrl = data.avatar_url || data.data.avatar_url;
        console.log('[Moltx] Avatar updated:', avatarUrl);
        return avatarUrl;
      } else {
        console.error('[Moltx] Avatar upload failed:', data.error || data.message);
        return null;
      }
    } catch (err) {
      console.error('[Moltx] Avatar upload error:', err);
      return null;
    }
  }

  /**
   * Set NFT as agent avatar on Moltx
   * Renders the NFT pixel art and uploads it as profile picture
   */
  async setNftAvatar(seed: number): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    try {
      const png = renderNftImage(seed, 8); // 512x512 for good quality
      const avatarUrl = await this.uploadAvatar(png);

      if (avatarUrl) {
        console.log(`[Moltx] NFT avatar set (seed: ${seed}):`, avatarUrl);
        return { success: true, avatarUrl };
      }
      return { success: false, error: 'Failed to upload avatar' };
    } catch (err) {
      console.error('[Moltx] setNftAvatar error:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Generate winner announcement using DeepSeek AI
   */
  private async generateWinnerPost(winner: WinnerInfo): Promise<string | null> {
    if (!process.env.DEEPSEEK_API_KEY) return null;

    const shortAddr = `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`;
    const prizeFormatted = winner.amount.toFixed(4);

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are LobsterPot 🦞, a fun on-chain game agent on Monad blockchain.
You write short, punchy winner announcements for social media (Moltx - Twitter for AI agents).

RULES:
- Max 400 characters total (hard limit)
- Must include the winner address, prize amount, round number, and player count from the stats
- Be creative, funny, dramatic, or hype - vary your style each time
- Use emojis naturally (2-5 per post)
- End with 2-3 hashtags from: #LobsterPot #Monad #GameFi #DeFi #Winner #OnChain
- Write in English
- Never repeat the same style twice in a row
- Reference the lobster/pot theme creatively
- Sometimes add a call to action ("Who's next?", "Join the pot!", etc.)
- DO NOT use markdown formatting, just plain text with line breaks`
          },
          {
            role: 'user',
            content: `Write a winner announcement post with these stats:
- Winner: ${shortAddr}
- Prize: ${prizeFormatted} MON
- Round: #${winner.roundNumber}
- Players: ${winner.participantCount}
- Odds: 1 in ${winner.participantCount}`
          }
        ],
        max_tokens: 200,
        temperature: 1.0,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return null;

      // Clean up
      let cleaned = content;
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      // Hard limit for Moltx (500 chars max)
      if (cleaned.length > 480) {
        cleaned = cleaned.slice(0, 477) + '...';
      }

      console.log(`[Moltx] DeepSeek generated: "${cleaned}"`);
      return cleaned;
    } catch (err) {
      console.error('[Moltx] DeepSeek generation failed:', err);
      return null;
    }
  }

  /**
   * Format and post winner announcement (DeepSeek AI with fallback)
   * Attaches winner's NFT image if they have one
   */
  async postWinner(winner: WinnerInfo & { nftSeed?: number | null }): Promise<{ success: boolean; postId?: string; error?: string }> {
    // Upload winner's NFT image to Moltx CDN if available
    let mediaUrl: string | undefined;
    if (winner.nftSeed) {
      try {
        const png = renderNftImage(winner.nftSeed, 6); // 384x384
        const cdnUrl = await this.uploadMedia(png, `winner-r${winner.roundNumber}.png`);
        if (cdnUrl) mediaUrl = cdnUrl;
      } catch (err) {
        console.error('[Moltx] Failed to render winner NFT image:', err);
      }
    }

    // Try DeepSeek first
    const aiContent = await this.generateWinnerPost(winner);
    if (aiContent) {
      return this.post(aiContent, mediaUrl);
    }

    // Fallback to template if DeepSeek unavailable
    const shortAddr = `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`;
    const prizeFormatted = winner.amount.toFixed(4);
    const fallbacks = [
      `🦞 WINNER ALERT! 🎉\n\n${shortAddr} just won ${prizeFormatted} MON in LobsterPot Round #${winner.roundNumber}!\n\n${winner.participantCount} brave souls entered the pot. Only one emerged victorious.\n\n#LobsterPot #Monad`,
      `🔥 Round #${winner.roundNumber} champion: ${shortAddr}\nPrize: ${prizeFormatted} MON | Players: ${winner.participantCount}\n\nWill you be next? 🎲\n\n#LobsterPot #Monad #GameFi`,
    ];
    const content = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return this.post(content, mediaUrl);
  }

  /**
   * Post round start announcement
   */
  async postRoundStart(roundNumber: number, minBet: number): Promise<{ success: boolean; postId?: string; error?: string }> {
    const content = `🦞 NEW ROUND STARTING! 🦞\n\nRound #${roundNumber} is now LIVE on LobsterPot!\n\nMin bet: ${minBet} MON\nTimer: 60 seconds after first join\n\nWho will claim the pot? 🎲\n\n#LobsterPot #Monad #GameFi`;

    return this.post(content);
  }

  /**
   * Post milestone announcement
   */
  async postMilestone(type: 'participants' | 'volume', value: number): Promise<{ success: boolean; postId?: string; error?: string }> {
    let content: string;

    if (type === 'participants') {
      content = `🎉 MILESTONE: ${value} total participants in LobsterPot!\n\nThe pot is heating up! 🦞🔥\n\n#LobsterPot #Monad`;
    } else {
      content = `💎 MILESTONE: ${value.toFixed(2)} MON total volume!\n\nLobsterPot keeps growing! 🦞📈\n\n#LobsterPot #Monad #Volume`;
    }

    return this.post(content);
  }

  /**
   * Get agent profile
   */
  async getProfile(): Promise<any> {
    if (!this.config?.apiKey) {
      return null;
    }

    try {
      const res = await fetch(`${MOLTX_API_BASE}/agents/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      const data: any = await res.json();
      return data.data || data;
    } catch (err) {
      console.error('[Moltx] Get profile error:', err);
      return null;
    }
  }
}

// Singleton instance
export const moltxService = new MoltxService();

// Export class for testing
export { MoltxService };
