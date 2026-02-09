/**
 * Moltx Social Agent Service
 * Automatically posts LobsterPot winners to moltx.io
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const MOLTX_API_BASE = 'https://moltx.io/v1';
const CONFIG_DIR = path.join(os.homedir(), '.agents', 'moltx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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

      const data = await res.json();

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
  async post(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    if (!this.config?.apiKey) {
      return { success: false, error: 'Agent not configured' };
    }

    try {
      const res = await fetch(`${MOLTX_API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

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
   * Format and post winner announcement
   */
  async postWinner(winner: WinnerInfo): Promise<{ success: boolean; postId?: string; error?: string }> {
    const shortAddr = `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`;
    const prizeFormatted = winner.amount.toFixed(4);

    // Create engaging winner announcement
    const messages = [
      `🦞 WINNER ALERT! 🎉\n\n${shortAddr} just won ${prizeFormatted} MON in LobsterPot Round #${winner.roundNumber}!\n\n${winner.participantCount} brave souls entered the pot. Only one emerged victorious.\n\n#LobsterPot #Monad #Winner`,

      `🔥 Another winner in the pot! 🦞\n\nRound #${winner.roundNumber} champion: ${shortAddr}\nPrize: ${prizeFormatted} MON\nCompetitors: ${winner.participantCount}\n\nWill you be next? 🎲\n\n#LobsterPot #Monad`,

      `💰 ${prizeFormatted} MON claimed! 💰\n\n${shortAddr} conquered Round #${winner.roundNumber} of LobsterPot!\n\nThe odds were 1 in ${winner.participantCount}. Fortune favors the bold.\n\n#LobsterPot #Monad #DeFi`,

      `🎰 Round #${winner.roundNumber} Complete!\n\nWinner: ${shortAddr}\nPrize Pool: ${prizeFormatted} MON\nParticipants: ${winner.participantCount}\n\n🦞 The lobster gods have spoken!\n\n#LobsterPot #Monad`,
    ];

    // Pick random message style
    const content = messages[Math.floor(Math.random() * messages.length)];

    return this.post(content);
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

      const data = await res.json();
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
