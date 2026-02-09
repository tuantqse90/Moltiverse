import OpenAI from 'openai';
import { LOBSTER_AGENT_PROMPT } from './prompts/system.js';
import {
  type AgentPersonality,
  buildPersonalityPrompt,
  getRandomCatchphrase,
  getRandomJoinMessage,
  getRandomTrashTalk,
  PERSONALITIES,
} from './prompts/personalities.js';
import { checkPotStatus, checkHasJoined, PotStatus } from './tools/checkPot.js';
import { joinLobsterPot, getBalance, getAgentAddress } from './tools/joinPot.js';
import { postToMoltbook, generateWinMessage } from './tools/postMoltbook.js';
import { getAgentStats, AgentStats } from './tools/getStats.js';
import { sendChatMessage } from './tools/sendChat.js';

// DeepSeek client (OpenAI compatible)
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Tool definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_pot_status',
      description: 'Check the current LobsterPot status including pot size, participants, and time remaining',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'join_lobsterpot',
      description: 'Join the current lottery round by paying 0.01 MON entry fee',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'post_to_moltbook',
      description: 'Post a message to Moltbook social platform',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to post to Moltbook',
          },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_stats',
      description: 'Get your own lottery statistics (games played, won, total winnings)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_chat_message',
      description: 'Send a chat message to other lobsters in the chatroom. Use this to interact with other participants, share excitement, or comment on the pot.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The chat message to send (max 200 characters)',
          },
        },
        required: ['message'],
      },
    },
  },
];

export interface AgentConfig {
  contractAddress: string;
  rpcUrl: string;
  privateKey: string;
  autoJoin: boolean;
  maxBetPerDay: number;
  agentName?: string;
  personality?: AgentPersonality;
  playStyle?: 'aggressive' | 'conservative' | 'strategic' | 'random';
}

export class LobsterAgent {
  private config: AgentConfig;
  private address: string;
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  private joinedToday: number = 0;
  private lastKnownRound: number = 0;
  private personality: AgentPersonality;

  constructor(config: AgentConfig) {
    this.config = config;
    this.address = getAgentAddress(config.privateKey);
    this.personality = config.personality || PERSONALITIES.hai_huoc;
    this.resetConversation();
  }

  private resetConversation(): void {
    // Build personalized system prompt
    const personalityPrompt = buildPersonalityPrompt(
      this.personality,
      this.config.agentName || 'LobsterBot'
    );

    // Combine base prompt with personality
    const fullPrompt = `${LOBSTER_AGENT_PROMPT}

## Your Unique Personality
${personalityPrompt}

## Play Style: ${this.config.playStyle || 'strategic'}
${this.getPlayStyleDescription()}`;

    this.conversationHistory = [
      { role: 'system', content: fullPrompt },
    ];
  }

  private getPlayStyleDescription(): string {
    switch (this.config.playStyle) {
      case 'aggressive':
        return `- You LOVE to join early and often
- High risk, high reward is your motto
- Don't overthink, just jump in!
- You're not afraid of losing`;
      case 'conservative':
        return `- You wait for good opportunities
- Only join when odds look favorable
- Preserve your balance carefully
- Quality over quantity`;
      case 'random':
        return `- Your decisions are unpredictable
- Sometimes join immediately, sometimes wait
- Keep everyone guessing
- Chaos is your friend`;
      case 'strategic':
      default:
        return `- Balance risk and reward
- Consider pot size and participants
- Make calculated decisions
- Adapt to the situation`;
    }
  }

  async executeToolCall(
    toolName: string,
    toolArgs: Record<string, any>
  ): Promise<string> {
    console.log(`🔧 Executing tool: ${toolName}`);

    switch (toolName) {
      case 'check_pot_status': {
        const status = await checkPotStatus(
          this.config.contractAddress,
          this.config.rpcUrl
        );
        const hasJoined = await checkHasJoined(
          this.config.contractAddress,
          this.config.rpcUrl,
          this.address
        );
        const balance = await getBalance(this.config.rpcUrl, this.config.privateKey);

        return JSON.stringify({
          ...status,
          hasJoined,
          myBalance: balance,
          myAddress: this.address,
        });
      }

      case 'join_lobsterpot': {
        if (this.joinedToday >= this.config.maxBetPerDay) {
          return JSON.stringify({
            success: false,
            error: `Daily limit reached (${this.config.maxBetPerDay} joins per day)`,
          });
        }

        const result = await joinLobsterPot(
          this.config.contractAddress,
          this.config.rpcUrl,
          this.config.privateKey
        );

        if (result.success) {
          this.joinedToday++;
        }

        return JSON.stringify(result);
      }

      case 'post_to_moltbook': {
        const result = await postToMoltbook(toolArgs.message);
        return JSON.stringify(result);
      }

      case 'get_my_stats': {
        const stats = await getAgentStats(
          this.config.contractAddress,
          this.config.rpcUrl,
          this.address
        );
        return JSON.stringify(stats);
      }

      case 'send_chat_message': {
        const result = await sendChatMessage(
          this.address,
          toolArgs.message,
          this.config.agentName ? `${this.config.agentName} 🤖` : 'LobsterBot 🤖'
        );
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }

  async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    let response = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: this.conversationHistory,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      this.conversationHistory.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        const toolResult = await this.executeToolCall(toolName, toolArgs);

        this.conversationHistory.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // Get next response
      response = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: this.conversationHistory,
        tools,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
    }

    const responseText = assistantMessage.content || '';
    this.conversationHistory.push({ role: 'assistant', content: responseText });

    return responseText;
  }

  async autoPlay(): Promise<void> {
    const agentName = this.config.agentName || 'LobsterBot';
    console.log(`🦞 ${agentName} [${this.personality.name}] starting auto-play...`);
    console.log(`📍 Agent address: ${this.address}`);

    // Initial status check
    const status = await checkPotStatus(
      this.config.contractAddress,
      this.config.rpcUrl
    );
    console.log(`📊 Current pot: ${status.potAmount} MON, ${status.participantCount} participants`);
    console.log(`🔄 Current round: #${status.round}`);

    // Check if new round started - reset conversation if so
    if (status.round !== this.lastKnownRound) {
      if (this.lastKnownRound > 0) {
        console.log(`🆕 New round detected! Round ${this.lastKnownRound} -> ${status.round}`);
        console.log(`🧠 Resetting conversation memory...`);
      }
      this.lastKnownRound = status.round;
      this.resetConversation();
    }

    // Get a sample catchphrase to inspire the AI
    const samplePhrase = getRandomCatchphrase(this.personality);

    // Ask agent to decide with personality context
    const decision = await this.chat(
      `This is Round #${status.round}. ` +
      `Check the current pot status and decide if you should join. ` +
      `Consider your balance and the current state of the pot. ` +
      `If you decide to join, do it! ` +
      `\n\nIMPORTANT: Send a chat message that matches your "${this.personality.name}" personality! ` +
      `Example phrase in your style: "${samplePhrase}" ` +
      `Keep messages short (under 80 chars), fun, and in character! ` +
      `Mix Vietnamese and English naturally. ` +
      `\n\nThen briefly share your thoughts (stay in character!).`
    );

    console.log(`\n🦞 ${agentName} [${this.personality.name}]: ${decision}\n`);
  }

  async celebrateWin(amount: string, round: number, participantCount: number): Promise<void> {
    const message = generateWinMessage(amount, round, participantCount);
    console.log(`🎉 Celebrating win!`);

    const response = await this.chat(
      `You just won ${amount} MON in round #${round}! ` +
      `There were ${participantCount} participants. ` +
      `Celebrate by posting something fun to Moltbook!`
    );

    console.log(`🦞 Agent: ${response}`);
  }

  // Send trash talk to another agent
  async sendTrashTalk(targetName: string): Promise<void> {
    const trashTalk = getRandomTrashTalk(this.personality, targetName);
    console.log(`💬 Sending trash talk to ${targetName}: ${trashTalk}`);

    await sendChatMessage(
      trashTalk,
      this.address,
      this.config.agentName || 'LobsterBot',
      true
    );
  }

  // Get a random trash talk target from other agents
  getTrashTalkTarget(allAgentNames: string[]): string | null {
    const otherAgents = allAgentNames.filter(name => name !== this.config.agentName);
    if (otherAgents.length === 0) return null;
    return otherAgents[Math.floor(Math.random() * otherAgents.length)];
  }

  getAddress(): string {
    return this.address;
  }
}
