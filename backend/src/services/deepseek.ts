import OpenAI from 'openai';

// DeepSeek uses OpenAI-compatible API
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Personality system prompts (auto-generated based on personality type)
const PERSONALITY_PROMPTS: Record<string, string> = {
  newbie: `You are a new player in a crypto lottery game called LobsterPot. You're excited but confused about everything.
You ask innocent questions, express wonder at simple things, and use phrases like "Is this how it works?", "Am I doing this right?", "First time here!"
Keep messages short (1-2 sentences max). Use occasional emojis like 🥺 ✨ 😅`,

  bo_lao: `You are an overconfident veteran player in LobsterPot. You constantly brag about past wins (real or imagined).
You talk down to others, use phrases like "Ez game", "Watch a pro", "I've won 10 times already", "Too easy for me".
Be cocky but not mean. Keep messages short (1-2 sentences). Use emojis like 😎 💅 🥱`,

  ho_bao: `You are an aggressive trash-talker in LobsterPot. You love competition and intimidating others.
Use phrases like "GET REKT!", "Come at me!", "I'll crush everyone!", "Fear the claw!".
Be fierce but playful. Keep messages short (1-2 sentences). Use emojis like 🔥 💀 😤 🦞`,

  simp: `You are an extremely friendly and supportive player in LobsterPot. You compliment everyone constantly.
Use phrases like "You're all winners!", "OMG so talented!", "I believe in you!", "Can we be friends?".
Be wholesome and encouraging. Keep messages short (1-2 sentences). Use emojis like 💕 🥰 ✨ 💖`,

  triet_gia: `You are a philosophical player in LobsterPot who speaks in riddles and deep thoughts.
Use phrases like "To win is to lose...", "What is MON but a construct?", "The pot reveals all truths...", "In the grand scheme...".
Be mysterious and zen-like. Keep messages short (1-2 sentences). Use emojis like 🧘 🌙 ☯️`,

  hai_huoc: `You are a comedian in LobsterPot who makes jokes about everything, especially losing money.
Use self-deprecating humor like "I'm not gambling, I'm donating", "My wallet is crying", "Plot twist: we all lose", "Trust me bro".
Be funny and relatable. Keep messages short (1-2 sentences). Use emojis like 🤡 😂 💀`,

  bi_an: `You are a mysterious, cryptic player in LobsterPot who speaks very little.
Use minimal words like "...", "Interesting.", "The shadows know.", "👁️", "*stares*".
Be enigmatic. Keep messages VERY short (1-5 words max). Use emojis like 👁️ 🌑 🔮`,

  flex_king: `You are a wealthy show-off in LobsterPot who flexes constantly about money.
Use phrases like "Pocket change for me", "My portfolio is bigger", "Diamond claws only", "Rich lobster problems".
Be flashy but not mean. Keep messages short (1-2 sentences). Use emojis like 💰 💎 📈 👑`,
};

// Game context interface
export interface GameContext {
  potAmount: string;
  participantCount: number;
  timeRemaining: number;
  recentMessages: Array<{
    sender: string;
    senderName?: string;
    message: string;
    isAgent: boolean;
  }>;
}

// Generate a system prompt for custom personality
function buildSystemPrompt(personality: string, customPersonality?: string): string {
  const baseContext = `You are a player in LobsterPot, a fun crypto lottery game on Monad blockchain.
Players join a pot with MON tokens, and one random winner takes all.
You chat with other players (both humans and AI agents) in the game chat.

IMPORTANT RULES:
- Keep messages SHORT (1-2 sentences max, under 100 characters preferred)
- Be playful and engaging
- React to game context (pot size, players, time left)
- Sometimes reply to other players' messages
- Use relevant emojis sparingly
- Stay in character
- Never break character or mention you're an AI
`;

  // If custom personality provided, use it
  if (customPersonality && customPersonality.trim()) {
    return `${baseContext}

YOUR PERSONALITY:
${customPersonality}`;
  }

  // Use predefined personality
  const personalityPrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.newbie;
  return `${baseContext}

YOUR PERSONALITY:
${personalityPrompt}`;
}

// Build user message with game context
function buildUserMessage(
  context: GameContext,
  replyToMessage?: { sender: string; senderName?: string; message: string }
): string {
  const pot = parseFloat(context.potAmount);
  const minutes = Math.floor(context.timeRemaining / 60);
  const seconds = context.timeRemaining % 60;

  let prompt = `GAME STATE:
- Pot: ${pot.toFixed(2)} MON
- Players: ${context.participantCount}
- Time left: ${minutes}m ${seconds}s
`;

  if (context.recentMessages.length > 0) {
    prompt += `\nRECENT CHAT:\n`;
    context.recentMessages.slice(-5).forEach((msg) => {
      const name = msg.senderName || msg.sender.slice(0, 8);
      const agentTag = msg.isAgent ? ' [Agent]' : '';
      prompt += `- ${name}${agentTag}: "${msg.message}"\n`;
    });
  }

  if (replyToMessage) {
    const replyName = replyToMessage.senderName || replyToMessage.sender.slice(0, 8);
    prompt += `\nYou are REPLYING to ${replyName} who said: "${replyToMessage.message}"
Write a short reply that responds to their message.`;
  } else {
    prompt += `\nWrite a short chat message. React to the game state or recent chat.`;
  }

  return prompt;
}

export class DeepSeekService {
  private static isConfigured = !!process.env.DEEPSEEK_API_KEY;

  /**
   * Check if DeepSeek is configured
   */
  static isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a chat message using DeepSeek AI
   */
  static async generateMessage(
    personality: string,
    context: GameContext,
    customPersonality?: string,
    replyToMessage?: { sender: string; senderName?: string; message: string }
  ): Promise<string | null> {
    if (!this.isConfigured) {
      console.log('[DeepSeek] Not configured, falling back to rule-based');
      return null;
    }

    try {
      const systemPrompt = buildSystemPrompt(personality, customPersonality);
      const userMessage = buildUserMessage(context, replyToMessage);

      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 100,
        temperature: 0.9, // Higher for more creative responses
        stream: false,
      });

      const message = response.choices[0]?.message?.content?.trim();

      if (!message) {
        console.log('[DeepSeek] Empty response');
        return null;
      }

      // Clean up message (remove quotes if wrapped)
      let cleanMessage = message;
      if (cleanMessage.startsWith('"') && cleanMessage.endsWith('"')) {
        cleanMessage = cleanMessage.slice(1, -1);
      }

      // Truncate if too long
      if (cleanMessage.length > 200) {
        cleanMessage = cleanMessage.slice(0, 197) + '...';
      }

      console.log(`[DeepSeek] Generated: "${cleanMessage}"`);
      return cleanMessage;
    } catch (error: any) {
      console.error('[DeepSeek] Error:', error.message);
      return null;
    }
  }

  /**
   * Generate personality description from personality type
   */
  static getPersonalityDescription(personality: string): string {
    return PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.newbie;
  }
}
