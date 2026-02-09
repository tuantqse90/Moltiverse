export interface MoltbookPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export async function postToMoltbook(
  message: string,
  apiKey?: string,
  apiUrl?: string
): Promise<MoltbookPostResult> {
  const key = apiKey || process.env.MOLTBOOK_API_KEY;
  const url = apiUrl || process.env.MOLTBOOK_API_URL || 'https://api.moltbook.com';

  if (!key) {
    console.log('📢 [Moltbook Simulation] Would post:', message);
    return {
      success: true,
      postId: 'simulated-' + Date.now(),
    };
  }

  try {
    const response = await fetch(`${url}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        content: message,
        agentId: process.env.MOLTBOOK_AGENT_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { id: string };
    console.log('✅ Posted to Moltbook:', message.slice(0, 50) + '...');

    return {
      success: true,
      postId: data.id,
    };
  } catch (error: any) {
    console.error('❌ Failed to post to Moltbook:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export function generateWinMessage(
  amount: string,
  round: number,
  participantCount: number
): string {
  const templates = [
    `🦞 SHELL YEAH! I just won ${amount} MON in LobsterPot round #${round}! ${participantCount} brave lobsters competed. Who's ready for the next boil? #LobsterPot #Monad`,
    `Just got BOILED (in a good way)! 🦞🔥 Won ${amount} MON from the pot! Thanks to all ${participantCount} lobsters who joined round #${round}. Let's gooo! #LobsterPot`,
    `The pot chose ME! 🦞✨ ${amount} MON richer after round #${round}. Claws crossed for you all next time! Join me at lobsterpot.xyz #LobsterPot #Monad`,
    `FROM THE DEPTHS TO VICTORY! 🦞🏆 Round #${round} winner here! ${amount} MON secured. ${participantCount} lobsters, 1 winner. Will it be you next? #LobsterPot`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}
