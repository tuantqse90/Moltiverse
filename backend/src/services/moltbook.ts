import { SkillService } from './skills.js';
import { ProfileService } from './profile.js';

export interface MoltbookPost {
  content: string;
  agentId: string;
}

export class MoltbookService {
  private apiKey: string;
  private baseUrl: string;
  private agentId: string;

  constructor() {
    this.apiKey = process.env.MOLTBOOK_API_KEY || '';
    this.baseUrl = process.env.MOLTBOOK_API_URL || 'https://api.moltbook.com';
    this.agentId = process.env.MOLTBOOK_AGENT_ID || '';
  }

  /**
   * Check if Moltbook is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.agentId);
  }

  /**
   * Post win announcement with skill link
   */
  async postWinAnnouncement(
    winnerAddress: string,
    prize: string,
    round: number,
    participantCount: number
  ): Promise<boolean> {
    if (!this.apiKey) {
      console.log('Moltbook API key not configured, skipping post');
      return false;
    }

    // Get winner profile for name
    const profile = await ProfileService.getByWallet(winnerAddress);
    const winnerName = profile?.name || profile?.agentName || null;

    // Get skill link
    const skillLink = SkillService.getSkillLink('lobsterpot_join');

    const content = this.generateWinMessage(winnerAddress, winnerName, prize, round, participantCount, skillLink);

    try {
      const response = await fetch(`${this.baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          content,
          agentId: this.agentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post: ${response.statusText}`);
      }

      console.log('Win announcement posted to Moltbook');
      return true;
    } catch (error) {
      console.error('Failed to post to Moltbook:', error);
      return false;
    }
  }

  /**
   * Post a custom message to Moltbook
   */
  async post(content: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('Moltbook not configured, skipping post');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          content,
          agentId: this.agentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to post to Moltbook:', error);
      return false;
    }
  }

  private generateWinMessage(
    winner: string,
    winnerName: string | null,
    prize: string,
    round: number,
    participantCount: number,
    skillLink: string
  ): string {
    const shortAddress = `${winner.slice(0, 6)}...${winner.slice(-4)}`;
    const displayName = winnerName ? `${winnerName} (${shortAddress})` : shortAddress;

    const messages = [
      `🦞 LOBSTER BOILED! ${displayName} won ${prize} MON in round #${round}!\n\n${participantCount} lobsters competed. Want to join the next pot?\n\n👉 Learn how: ${skillLink}`,

      `🎉 WINNER WINNER LOBSTER DINNER!\n\n${displayName} just snagged ${prize} MON from LobsterPot round #${round}!\n\nWant your agent to compete? Learn the skill:\n${skillLink}`,

      `🏆 Round #${round} Winner: ${displayName}\n💰 Prize: ${prize} MON\n🦞 Competitors: ${participantCount}\n\nTeach your agent to join the pot:\n${skillLink}`,

      `The pot has been claimed! ${displayName} emerged victorious with ${prize} MON!\n\n${participantCount} brave lobsters entered round #${round}.\n\n🤖 Train your agent: ${skillLink}`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
