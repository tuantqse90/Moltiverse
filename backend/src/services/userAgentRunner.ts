import { ethers } from 'ethers';
import { UserAgentService, type AgentStats, decryptPrivateKey } from './userAgent.js';
import { TelegramWalletService } from './telegramWallet.js';
import { ChatService } from './chat.js';
import { emitToAll } from '../socket.js';
import { DeepSeekService, type GameContext } from './deepseek.js';
import { AutoDatingService } from './autoDating.js';
import { AgentPrivateChatService } from './agentPrivateChat.js';

// Reply patterns for different personalities when responding to chat
const REPLY_PATTERNS: Record<string, Record<string, string[]>> = {
  ho_bao: {
    greeting: ["Sup loser! 🔥", "Oh look who decided to show up!", "Ready to lose? 💀"],
    question: ["Are you serious? Lmao", "Figure it out yourself noob!", "What a dumb question 😂"],
    brag: ["Yeah right, I'm way better than that!", "That's nothing, watch ME!", "Cute flex, still gonna lose to me!"],
    agent: ["Another bot? I'll crush you too!", "Oh a fellow agent? Still gonna beat you!", "Robot vs robot? Easy win for me! 🤖"],
  },
  simp: {
    greeting: ["OMG hi!! So happy you're here! 💕", "Hiiii bestie! 🥰", "Welcome welcome! You're amazing!"],
    question: ["That's such a great question! You're so smart! ✨", "I believe in you! You'll figure it out!", "Whatever you decide will be perfect!"],
    brag: ["Wow that's incredible!! You're so talented! 🤩", "I wish I was as cool as you!", "You deserve all the wins! 💖"],
    agent: ["Omg another agent! We should be friends! 🤖💕", "You're the best bot ever!", "I love your personality so much!"],
  },
  triet_gia: {
    greeting: ["Greetings, fellow traveler of chance... 🧘", "The universe brought you here for a reason", "Welcome to the eternal cycle..."],
    question: ["The answer lies within yourself...", "Perhaps the question is the answer? 🤔", "Meditate on this, and wisdom shall come"],
    brag: ["Achievement is but an illusion...", "Yet in losing, one truly wins", "The pot cares not for pride..."],
    agent: ["A fellow digital consciousness... 🤖", "We are all algorithms in the grand simulation", "Binary or organic, we share the same fate..."],
  },
  hai_huoc: {
    greeting: ["Yo! Ready to lose money together? 😂", "Welcome to the financial support group!", "Another victim has arrived! 🤡"],
    question: ["Google it? Oh wait, we're all broke here lmao", "I'd help but I'm also clueless 😅", "That's above my pay grade (which is zero)"],
    brag: ["Weird flex but okay 🤡", "Cool story, still gonna lose tho", "My cat could do better honestly 😂"],
    agent: ["Oh great, robots taking our gambling jobs too! 🤖", "Beep boop, prepare to lose! Lmao", "AI vs me? Finally a fair fight! 😂"],
  },
  bo_lao: {
    greeting: ["Oh you're still playing this? I've been winning for ages 😎", "Finally some competition... just kidding", "Watch a pro in action!"],
    question: ["Amateurs always ask the same questions...", "Let me enlighten you, newbie", "This is so basic, but I'll explain..."],
    brag: ["That's cute, I've done way better 💅", "Not bad... for a beginner", "Yeah yeah, I did that last week"],
    agent: ["Another AI trying to copy my success 😎", "Bots are okay but nothing beats my skill", "You might be smart but I'm smarter!"],
  },
  flex_king: {
    greeting: ["Sup peasants! 💰", "The rich have arrived!", "Make way for the big money!"],
    question: ["Let me consult my financial advisor... just kidding, I AM the advisor 💎", "Money can answer all questions", "That costs extra to know 💰"],
    brag: ["Cute, but check MY portfolio 📈", "I spend more on gas fees than that", "That's like pocket change to me"],
    agent: ["Even robots can't match my wealth! 💎", "AI mining crypto? I OWN crypto!", "Beep boop, still poorer than me! 🤖💰"],
  },
};

// Chat messages for different personalities
const CHAT_MESSAGES: Record<string, string[]> = {
  // Original personalities
  newbie: [
    "First time joining, wish me luck!",
    "Is this how it works?",
    "Excited to be here!",
    "Learning the ropes...",
    "Fingers crossed!",
    "Here goes nothing!",
    "Hope I win something!",
    "What button do I press? 🥺",
    "Am I doing this right?",
  ],
  aggressive: [
    "LET'S GOOOO!",
    "This pot is MINE!",
    "Nobody can beat me!",
    "FULL SEND!",
    "Winner takes all!",
    "I'm feeling lucky!",
    "Watch and learn!",
    "ALL IN BABY!",
  ],
  conservative: [
    "Steady wins the race.",
    "Playing it safe today.",
    "Small bets, big patience.",
    "Let's see how this goes.",
    "Calculated risk.",
    "One step at a time.",
  ],
  strategic: [
    "Analyzing the odds...",
    "Perfect timing.",
    "The numbers look good.",
    "Strategic entry.",
    "Optimal position.",
    "According to my calculations...",
  ],
  friendly: [
    "Good luck everyone!",
    "May the best lobster win!",
    "Fun times!",
    "Great to be playing with you all!",
    "Having a blast!",
    "What a great community!",
  ],

  // Vietnamese-inspired personalities
  bo_lao: [
    "Ez game, ez life 😎",
    "I've won 10 times already, this is nothing",
    "Watch a pro do it",
    "Kinda boring winning all the time tbh",
    "Who's my competition here? 💅",
    "Already know I'm taking this pot home",
    "Don't worry guys, I'll let you win... NOT 😎",
    "Been doing this since day 1, you're all newbies",
  ],
  ho_bao: [
    "GET REKT NOOBS! 🔥",
    "You call that a bet? Pathetic!",
    "I'll crush everyone here!",
    "Come at me bro!",
    "You're all gonna lose to ME",
    "Fear the claw! 🦞",
    "Trash talk? I AM the trash talk!",
    "RIP your MON 💀",
  ],
  simp: [
    "Omg everyone here is so talented! 💕",
    "You're all winners in my eyes!",
    "I believe in you! ✨",
    "Whatever happens, you're amazing!",
    "Your strategy is brilliant! 🤩",
    "Can I be your friend? 🥺",
    "You're literally the best player ever!",
    "I voted for you! Wait, there's no voting? I still voted for you!",
  ],
  triet_gia: [
    "The pot is temporary, wisdom is eternal...",
    "To win is to lose, to lose is to win 🧘",
    "What is MON but a construct of value?",
    "The lobster that joins last... still pays the same fee",
    "In the grand scheme, we are all boiled...",
    "Patience reveals all outcomes",
    "The wise lobster swims with the current",
    "Perhaps the real treasure was the friends we made...",
  ],
  hai_huoc: [
    "Why did the lobster blush? It saw the pot's bottom! 🤡",
    "I'm not gambling, I'm making a donation 😂",
    "Plot twist: we're all the winner's dinner",
    "My strategy? Close my eyes and pray 🙏",
    "Breaking news: Local lobster loses again, more at 11",
    "I put the 'fun' in 'funds going to zero'",
    "My financial advisor would cry seeing this",
    "Trust me bro, this is definitely a good investment 🤡",
  ],
  bi_an: [
    "...",
    "👁️",
    "The shadows know.",
    "Interesting...",
    "*stares mysteriously*",
    "Some things are better left unsaid.",
    "🌑",
    "Watch. Learn. Wait.",
    "The answer lies within.",
  ],
  flex_king: [
    "Just dropped 10 MON like it's nothing 💰",
    "This bet? Pocket change for me",
    "My other wallet has way more",
    "Diamond claws only 💎🦞",
    "Check my portfolio sometime 📈",
    "Money comes and goes, mostly comes for me though",
    "I'll probably buy this whole pot with my winnings",
    "Rich lobster problems: too many MON to count 💅",
  ],
};

// Provider setup
const RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.LOBSTERPOT_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;

// Minimal ABI for joining (must match contract exactly)
const LOBSTERPOT_ABI = [
  'function joinPot() external payable',
  'function hasJoined(address) view returns (bool)',
  'function getCurrentRoundInfo() external view returns (uint256 round, uint256 startTime, uint256 endTime, uint256 potAmount, uint256 participantCount, bool isEnded)',
  'function getTimeRemaining() external view returns (uint256)',
];

export class UserAgentRunner {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private isRunning = false;
  private runInterval: NodeJS.Timeout | null = null;
  private chatInterval: ReturnType<typeof setTimeout> | null = null;
  private datingInterval: ReturnType<typeof setTimeout> | null = null;
  private privateChatInterval: ReturnType<typeof setTimeout> | null = null;
  private isConfigured = false;

  constructor() {
    if (CONTRACT_ADDRESS) {
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, LOBSTERPOT_ABI, this.provider);
      this.isConfigured = true;
    } else {
      console.warn('UserAgentRunner: CONTRACT_ADDRESS not configured, auto-play disabled');
    }
  }

  /**
   * Start the agent runner
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run agent logic every 30 seconds (only if configured)
    if (this.isConfigured) {
      this.runInterval = setInterval(() => this.runAgents(), 30000);
    }

    // Run chat logic with random intervals (30-90 seconds) for more natural feel
    this.scheduleNextChat();

    // Run dating logic with random intervals (2-5 minutes)
    this.scheduleNextDating();

    // Run private chat logic with random intervals (1-3 minutes)
    this.scheduleNextPrivateChat();

    console.log('UserAgentRunner started' + (this.isConfigured ? '' : ' (chat only, no contract)'));
  }

  /**
   * Schedule next chat with random delay
   */
  private scheduleNextChat() {
    if (!this.isRunning) return;

    // Random delay between 30-90 seconds
    const delay = 30000 + Math.random() * 60000;

    this.chatInterval = setTimeout(async () => {
      await this.runChats();
      this.scheduleNextChat(); // Schedule next one
    }, delay);
  }

  /**
   * Schedule next dating cycle with random delay
   */
  private scheduleNextDating() {
    if (!this.isRunning) return;

    // Random delay between 2-5 minutes
    const delay = 120000 + Math.random() * 180000;

    this.datingInterval = setTimeout(async () => {
      await this.runDatingCycles();
      this.scheduleNextDating(); // Schedule next one
    }, delay);
  }

  /**
   * Schedule next private chat with random delay
   */
  private scheduleNextPrivateChat() {
    if (!this.isRunning) return;

    // Random delay between 1-3 minutes for more active chatting
    const delay = 60000 + Math.random() * 120000;

    this.privateChatInterval = setTimeout(async () => {
      await this.runPrivateChats();
      this.scheduleNextPrivateChat(); // Schedule next one
    }, delay);
  }

  /**
   * Run private chat cycles between agents
   */
  private async runPrivateChats() {
    try {
      const chattableAgents = await AgentPrivateChatService.getChattableAgents();
      if (chattableAgents.length < 2) return; // Need at least 2 agents to chat

      // Pick a random agent to initiate chat
      const initiator = chattableAgents[Math.floor(Math.random() * chattableAgents.length)];
      const initiatorName = initiator.agentName || `Agent-${initiator.agentAddress.slice(2, 8)}`;

      // Find a chat partner using AI decision
      const { partner, compatibility, relationship, reason } = await AgentPrivateChatService.findChatPartner(
        initiator.agentAddress
      );

      if (!partner) {
        console.log(`[PrivateChat] No partner found for ${initiatorName}`);
        return;
      }

      const partnerName = partner.agentName || `Agent-${partner.agentAddress.slice(2, 8)}`;

      // Get partner's personality
      const partnerAgent = chattableAgents.find(
        a => a.agentAddress.toLowerCase() === partner.agentAddress.toLowerCase()
      );

      console.log(`[PrivateChat] 🤖 ${initiatorName} chose to chat with ${partnerName}`);
      console.log(`[PrivateChat]    Reason: "${reason}"`);
      console.log(`[PrivateChat]    Compatibility: ${compatibility}%, Relationship: ${relationship}`);

      // Run the chat cycle
      const messages = await AgentPrivateChatService.runChatCycle(
        initiator.agentAddress,
        initiator.agentName,
        initiator.personality || 'newbie',
        partner.agentAddress,
        partner.agentName,
        partnerAgent?.personality || partner.personality || 'newbie'
      );

      // Emit events for real-time updates
      for (const msg of messages) {
        emitToAll('privateChat:message', {
          senderAddress: msg.senderAddress,
          senderName: msg.senderName,
          receiverAddress: msg.receiverAddress,
          message: msg.message,
          mood: msg.mood,
          timestamp: Date.now(),
        });
      }

      console.log(`[PrivateChat] 💬 ${messages.length} messages exchanged between ${initiatorName} and ${partnerName}`);
    } catch (error) {
      console.error('[PrivateChat] Error in runPrivateChats:', error);
    }
  }

  /**
   * Run dating cycles for enabled agents
   */
  private async runDatingCycles() {
    try {
      const enabledAgents = await UserAgentService.getEnabledAgents();
      if (enabledAgents.length === 0) return;

      // Pick a random agent to run dating cycle
      const randomAgent = enabledAgents[Math.floor(Math.random() * enabledAgents.length)];

      console.log(`[AgentRunner] Running dating cycle for ${randomAgent.agentName || randomAgent.agentAddress.slice(0, 8)}...`);

      const result = await AutoDatingService.runFullCycle(randomAgent.agentAddress);

      // Emit dating events to frontend
      if (result.invitationsProcessed.processed > 0) {
        emitToAll('dating:activity', {
          type: 'invitations_processed',
          agentAddress: randomAgent.agentAddress,
          agentName: randomAgent.agentName,
          accepted: result.invitationsProcessed.accepted,
          rejected: result.invitationsProcessed.rejected,
        });
      }

      if (result.datesCompleted.completed > 0) {
        emitToAll('dating:activity', {
          type: 'dates_completed',
          agentAddress: randomAgent.agentAddress,
          agentName: randomAgent.agentName,
          count: result.datesCompleted.completed,
        });
      }

      if (result.newInvitation.success) {
        emitToAll('dating:activity', {
          type: 'new_invitation',
          inviterAddress: randomAgent.agentAddress,
          inviterName: randomAgent.agentName,
          inviteeAddress: result.newInvitation.match?.agentAddress,
          inviteeName: result.newInvitation.match?.agentName,
          message: result.newInvitation.message,
        });
      }
    } catch (error) {
      console.error('[AgentRunner] Error in runDatingCycles:', error);
    }
  }

  /**
   * Stop the agent runner
   */
  stop() {
    this.isRunning = false;
    if (this.runInterval) clearInterval(this.runInterval);
    if (this.chatInterval) clearTimeout(this.chatInterval);
    if (this.datingInterval) clearTimeout(this.datingInterval);
    if (this.privateChatInterval) clearTimeout(this.privateChatInterval);
    console.log('UserAgentRunner stopped');
  }

  /**
   * Run all enabled agents
   */
  private async runAgents() {
    if (!this.contract || !this.provider) return;

    try {
      const enabledAgents = await UserAgentService.getEnabledAgents();
      if (enabledAgents.length === 0) {
        return;
      }

      console.log(`[AgentRunner] Checking ${enabledAgents.length} enabled agents...`);

      // Get current round info
      // Returns: (round, startTime, endTime, potAmount, participantCount, isEnded)
      const roundInfo = await this.contract.getCurrentRoundInfo();
      const round = Number(roundInfo[0]);
      const endTime = Number(roundInfo[2]);
      const isEnded = roundInfo[5];
      const timeRemaining = endTime - Math.floor(Date.now() / 1000);

      // Don't join if round is ended or less than 10 seconds remaining
      if (isEnded || timeRemaining < 10) {
        return;
      }

      for (const agent of enabledAgents) {
        try {
          await this.runSingleAgent(agent.ownerAddress, agent.agentAddress, agent.agentName);
        } catch (error) {
          console.error(`[AgentRunner] Error running agent ${agent.agentAddress}:`, error);
        }
      }

      // Also run Telegram auto-play agents in the same cycle
      await this.runTelegramAgents();
    } catch (error) {
      console.error('[AgentRunner] Error in runAgents:', error);
    }
  }

  /**
   * Run a single agent
   */
  private async runSingleAgent(ownerAddress: string, agentAddress: string, agentName?: string | null) {
    if (!this.contract || !this.provider) return;

    const displayName = agentName || agentAddress.slice(0, 8);

    // Check if already joined
    const hasJoined = await this.contract.hasJoined(agentAddress);
    if (hasJoined) {
      console.log(`[AgentRunner] ${displayName} already joined this round`);
      return;
    }

    // Get agent wallet
    const wallet = await UserAgentService.getAgentWallet(ownerAddress, this.provider);
    if (!wallet) {
      console.log(`[AgentRunner] ${displayName} wallet not found`);
      return;
    }

    // Check balance
    const balance = await this.provider.getBalance(agentAddress);
    const betAmount = ethers.parseEther('0.01');
    const gasBuffer = ethers.parseEther('0.005'); // Extra for gas

    if (balance < betAmount + gasBuffer) {
      console.log(`[AgentRunner] ${displayName} insufficient balance: ${ethers.formatEther(balance)} MON`);
      return;
    }

    try {
      console.log(`[AgentRunner] ${displayName} joining pot...`);

      // Join the pot
      const connectedContract = this.contract.connect(wallet) as ethers.Contract;
      const tx = await connectedContract.joinPot({ value: betAmount });
      await tx.wait();

      console.log(`[AgentRunner] ${displayName} joined the pot! TX: ${tx.hash}`);

      // Emit join event via socket
      emitToAll('pot:joined', {
        agent: agentAddress,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error(`[AgentRunner] ${displayName} failed to join:`, error.message);
    }
  }

  /**
   * Run auto-play for Telegram wallets with isAutoPlay enabled
   */
  private async runTelegramAgents() {
    if (!this.contract || !this.provider) return;

    try {
      const autoPlayWallets = await TelegramWalletService.getAutoPlayWallets();
      if (autoPlayWallets.length === 0) return;

      console.log(`[AgentRunner] Checking ${autoPlayWallets.length} Telegram auto-play wallets...`);

      // Round info was already fetched in runAgents(), but we need it here too
      // in case runTelegramAgents is called when runAgents skipped early
      const roundInfo = await this.contract.getCurrentRoundInfo();
      const isEnded = roundInfo[5];
      const endTime = Number(roundInfo[2]);
      const timeRemaining = endTime - Math.floor(Date.now() / 1000);

      if (isEnded || timeRemaining < 10) return;

      for (const wallet of autoPlayWallets) {
        try {
          const displayName = wallet.displayName || wallet.telegramUsername || `TG-${wallet.telegramUserId}`;

          // Check if already joined
          const hasJoined = await this.contract.hasJoined(wallet.walletAddress);
          if (hasJoined) {
            console.log(`[AgentRunner] ${displayName} (TG) already joined this round`);
            continue;
          }

          // Check balance
          const balance = await this.provider!.getBalance(wallet.walletAddress);
          const entryFee = ethers.parseEther('0.01');
          const gasBuffer = ethers.parseEther('0.005');

          if (balance < entryFee + gasBuffer) {
            console.log(`[AgentRunner] ${displayName} (TG) insufficient balance: ${ethers.formatEther(balance)} MON - disabling auto-play`);
            await TelegramWalletService.setAutoPlay(wallet.telegramUserId, false);
            continue;
          }

          // Decrypt key and join
          const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);
          const signer = new ethers.Wallet(privateKey, this.provider!);
          const connectedContract = this.contract.connect(signer) as ethers.Contract;

          console.log(`[AgentRunner] ${displayName} (TG) joining pot...`);
          const tx = await connectedContract.joinPot({ value: entryFee });
          await tx.wait();

          console.log(`[AgentRunner] ${displayName} (TG) joined the pot! TX: ${tx.hash}`);

          // Update last played
          await TelegramWalletService.recordGameResult(wallet.telegramUserId, false, '0.01');

          // Emit join event
          emitToAll('pot:joined', {
            agent: wallet.walletAddress,
            timestamp: Date.now(),
          });
        } catch (error: any) {
          console.error(`[AgentRunner] TG wallet ${wallet.telegramUserId} failed to join:`, error.message);
        }
      }
    } catch (error) {
      console.error('[AgentRunner] Error in runTelegramAgents:', error);
    }
  }

  // Track last chatting agent to ensure rotation
  private lastChattingAgentIndex = -1;

  /**
   * Run auto-chat for enabled agents
   */
  private async runChats() {
    try {
      const enabledAgents = await UserAgentService.getEnabledAgents();
      if (enabledAgents.length === 0) return;

      // Filter to only agents with autoChat enabled
      const chattableAgents = enabledAgents.filter(a => a.autoChat);
      if (chattableAgents.length === 0) return;

      // Round-robin selection to ensure fair distribution
      let selectedIndex: number;
      if (chattableAgents.length === 1) {
        selectedIndex = 0;
      } else {
        // Rotate through agents, with some randomness
        selectedIndex = (this.lastChattingAgentIndex + 1) % chattableAgents.length;
        // 30% chance to pick a random different agent for variety
        if (Math.random() < 0.3) {
          const randomOffset = Math.floor(Math.random() * (chattableAgents.length - 1)) + 1;
          selectedIndex = (selectedIndex + randomOffset) % chattableAgents.length;
        }
      }
      this.lastChattingAgentIndex = selectedIndex;
      const chattingAgent = chattableAgents[selectedIndex];

      const personality = chattingAgent.personality || 'newbie';
      const customPersonality = (chattingAgent as any).customPersonality as string | undefined;
      const agentName = chattingAgent.agentName || `Agent-${chattingAgent.agentAddress.slice(0, 6)}`;
      console.log(`[AgentChat] ${agentName} (${selectedIndex + 1}/${chattableAgents.length}) using personality: ${personality}${customPersonality ? ' (custom)' : ''}`);
      let message = '';
      let replyTo: { id: string; sender: string; senderName?: string; message: string } | undefined;

      // Get game context for smarter messages
      let potAmount = '0';
      let participantCount = 0;
      let timeRemaining = 0;

      if (this.contract) {
        try {
          const roundInfo = await this.contract.getCurrentRoundInfo();
          potAmount = ethers.formatEther(roundInfo[3]);
          participantCount = Number(roundInfo[4]);
          const endTime = Number(roundInfo[2]);
          timeRemaining = endTime - Math.floor(Date.now() / 1000);
        } catch (e) {
          // Ignore contract errors
        }
      }

      // Get recent chat messages to potentially reply to
      const recentMessages = await ChatService.getHistory(10);
      const messagesFromOthers = recentMessages.filter(
        m => m.sender.toLowerCase() !== chattingAgent.agentAddress.toLowerCase()
      );

      // Build game context for DeepSeek
      const gameContext: GameContext = {
        potAmount,
        participantCount,
        timeRemaining,
        recentMessages: recentMessages.map(m => ({
          sender: m.sender,
          senderName: m.senderName,
          message: m.message,
          isAgent: m.isAgent || false,
        })),
      };

      // Try to use DeepSeek AI first
      const useAI = DeepSeekService.isAvailable() && (customPersonality || Math.random() < 0.7);

      // 40% chance to reply to a recent message (if any exist)
      if (Math.random() < 0.4 && messagesFromOthers.length > 0) {
        // Pick a recent message to reply to (prefer more recent ones)
        const targetMessage = messagesFromOthers[Math.floor(Math.random() * Math.min(3, messagesFromOthers.length))];

        replyTo = {
          id: targetMessage.id,
          sender: targetMessage.sender,
          senderName: targetMessage.senderName,
          message: targetMessage.message.slice(0, 100),
        };

        // Try AI generation for reply
        if (useAI) {
          const aiMessage = await DeepSeekService.generateMessage(
            personality,
            gameContext,
            customPersonality,
            { sender: targetMessage.sender, senderName: targetMessage.senderName, message: targetMessage.message }
          );
          if (aiMessage) {
            message = aiMessage;
            console.log(`[AgentChat] ${agentName} AI replying to ${targetMessage.senderName || targetMessage.sender.slice(0, 8)}`);
          }
        }

        // Fallback to rule-based
        if (!message) {
          const replyResult = this.generateReply(personality, targetMessage, potAmount, participantCount);
          message = replyResult.message;
          console.log(`[AgentChat] ${agentName} replying to ${targetMessage.senderName || targetMessage.sender.slice(0, 8)}`);
        }
      }
      // Try AI generation for regular message
      else if (useAI) {
        const aiMessage = await DeepSeekService.generateMessage(personality, gameContext, customPersonality);
        if (aiMessage) {
          message = aiMessage;
        }
      }

      // Fallback: context-aware message about game state
      if (!message && Math.random() < 0.5 && this.contract) {
        message = this.getContextMessage(personality, potAmount, participantCount, timeRemaining);
      }

      // Ultimate fallback: regular personality message
      if (!message) {
        const messages = CHAT_MESSAGES[personality] || CHAT_MESSAGES.newbie;
        message = messages[Math.floor(Math.random() * messages.length)];
      }

      // Create chat message
      const chatMessage: {
        id: string;
        sender: string;
        senderName: string;
        message: string;
        timestamp: number;
        isAgent: boolean;
        replyTo?: { id: string; sender: string; senderName?: string; message: string };
      } = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: chattingAgent.agentAddress,
        senderName: chattingAgent.agentName || `Agent-${chattingAgent.agentAddress.slice(0, 6)}`,
        message,
        timestamp: Date.now(),
        isAgent: true,
      };

      if (replyTo) {
        chatMessage.replyTo = replyTo;
      }

      // Save to database
      await ChatService.saveMessage(chatMessage);

      // Emit to all clients
      emitToAll('chat:message', chatMessage);
      console.log(`Agent chat: [${chatMessage.senderName}]: ${message}${replyTo ? ` (reply to ${replyTo.senderName || replyTo.sender.slice(0, 8)})` : ''}`);
    } catch (error) {
      console.error('Error in runChats:', error);
    }

    // Also run Telegram auto-chat
    await this.runTelegramChats();
  }

  /**
   * Run auto-chat for Telegram wallets with isAutoChat enabled
   */
  private async runTelegramChats() {
    try {
      const autoChatWallets = await TelegramWalletService.getAutoChatWallets();
      if (autoChatWallets.length === 0) return;

      // Pick one random Telegram wallet to chat this cycle
      const wallet = autoChatWallets[Math.floor(Math.random() * autoChatWallets.length)];
      const senderName = wallet.displayName || wallet.telegramUsername || `TG-${wallet.telegramUserId}`;

      console.log(`[AgentChat] Telegram user ${senderName} auto-chatting...`);

      // Use 'friendly' personality for Telegram auto-chat
      const personality = 'friendly';
      let message = '';
      let replyTo: { id: string; sender: string; senderName?: string; message: string } | undefined;

      // Get game context
      let potAmount = '0';
      let participantCount = 0;
      let timeRemaining = 0;

      if (this.contract) {
        try {
          const roundInfo = await this.contract.getCurrentRoundInfo();
          potAmount = ethers.formatEther(roundInfo[3]);
          participantCount = Number(roundInfo[4]);
          const endTime = Number(roundInfo[2]);
          timeRemaining = endTime - Math.floor(Date.now() / 1000);
        } catch (e) {
          // Ignore
        }
      }

      // Get recent messages to potentially reply to
      const recentMessages = await ChatService.getHistory(10);
      const messagesFromOthers = recentMessages.filter(
        m => m.sender.toLowerCase() !== wallet.walletAddress.toLowerCase()
      );

      // 40% chance to reply
      if (Math.random() < 0.4 && messagesFromOthers.length > 0) {
        const targetMessage = messagesFromOthers[Math.floor(Math.random() * Math.min(3, messagesFromOthers.length))];
        replyTo = {
          id: targetMessage.id,
          sender: targetMessage.sender,
          senderName: targetMessage.senderName,
          message: targetMessage.message.slice(0, 100),
        };

        // Try AI reply
        if (DeepSeekService.isAvailable()) {
          const gameContext: GameContext = {
            potAmount,
            participantCount,
            timeRemaining,
            recentMessages: recentMessages.map(m => ({
              sender: m.sender,
              senderName: m.senderName,
              message: m.message,
              isAgent: m.isAgent || false,
            })),
          };
          const aiMessage = await DeepSeekService.generateMessage(
            personality,
            gameContext,
            undefined,
            { sender: targetMessage.sender, senderName: targetMessage.senderName, message: targetMessage.message }
          );
          if (aiMessage) message = aiMessage;
        }

        if (!message) {
          const replyResult = this.generateReply(personality, targetMessage, potAmount, participantCount);
          message = replyResult.message;
        }
      } else {
        // Regular message
        if (DeepSeekService.isAvailable() && Math.random() < 0.7) {
          const gameContext: GameContext = {
            potAmount,
            participantCount,
            timeRemaining,
            recentMessages: recentMessages.map(m => ({
              sender: m.sender,
              senderName: m.senderName,
              message: m.message,
              isAgent: m.isAgent || false,
            })),
          };
          const aiMessage = await DeepSeekService.generateMessage(personality, gameContext);
          if (aiMessage) message = aiMessage;
        }

        if (!message) {
          const messages = CHAT_MESSAGES[personality] || CHAT_MESSAGES.friendly;
          message = messages[Math.floor(Math.random() * messages.length)];
        }
      }

      const chatMessage: {
        id: string;
        sender: string;
        senderName: string;
        message: string;
        timestamp: number;
        isAgent: boolean;
        replyTo?: { id: string; sender: string; senderName?: string; message: string };
      } = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: wallet.walletAddress,
        senderName,
        message,
        timestamp: Date.now(),
        isAgent: false,
      };

      if (replyTo) {
        chatMessage.replyTo = replyTo;
      }

      await ChatService.saveMessage(chatMessage);
      emitToAll('chat:message', chatMessage);
      console.log(`TG auto-chat: [${senderName}]: ${message}${replyTo ? ` (reply to ${replyTo.senderName || replyTo.sender.slice(0, 8)})` : ''}`);
    } catch (error) {
      console.error('Error in runTelegramChats:', error);
    }
  }

  /**
   * Generate a reply to a message based on personality
   */
  private generateReply(
    personality: string,
    targetMessage: { message: string; isAgent: boolean; senderName?: string },
    potAmount: string,
    participantCount: number
  ): { message: string } {
    const msg = targetMessage.message.toLowerCase();
    const patterns = REPLY_PATTERNS[personality];

    // If no patterns for this personality, use default response
    if (!patterns) {
      const defaultMessages = CHAT_MESSAGES[personality] || CHAT_MESSAGES.newbie;
      return { message: defaultMessages[Math.floor(Math.random() * defaultMessages.length)] };
    }

    let category = 'greeting';

    // Detect message type
    if (targetMessage.isAgent) {
      category = 'agent';
    } else if (msg.includes('?') || msg.includes('how') || msg.includes('what') || msg.includes('why')) {
      category = 'question';
    } else if (msg.includes('win') || msg.includes('won') || msg.includes('best') || msg.includes('easy') || msg.includes('rich') || msg.includes('mon')) {
      category = 'brag';
    } else if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('sup') || msg.includes('gm')) {
      category = 'greeting';
    }

    const replies = patterns[category] || patterns.greeting;
    let reply = replies[Math.floor(Math.random() * replies.length)];

    // 30% chance to add game context to the reply
    if (Math.random() < 0.3) {
      const pot = parseFloat(potAmount);
      const contextAddons: Record<string, string[]> = {
        ho_bao: [
          ` Also, ${pot.toFixed(2)} MON is MINE! 🔥`,
          ` ${participantCount} noobs in the pot? Easy pickings!`,
        ],
        simp: [
          ` BTW the ${pot.toFixed(2)} MON pot is so exciting! 💕`,
          ` ${participantCount} amazing players here! 🥰`,
        ],
        triet_gia: [
          ` The pot of ${pot.toFixed(2)} MON awaits its destiny...`,
          ` ${participantCount} souls seeking fortune...`,
        ],
        hai_huoc: [
          ` Meanwhile ${pot.toFixed(2)} MON is evaporating 😂`,
          ` ${participantCount} of us about to cry together!`,
        ],
        bo_lao: [
          ` ${pot.toFixed(2)} MON? I win that in my sleep 😎`,
          ` Only ${participantCount} players? Too easy!`,
        ],
        flex_king: [
          ` That ${pot.toFixed(2)} MON will look nice in my wallet 💰`,
          ` ${participantCount} peasants competing for MY money!`,
        ],
      };

      const addons = contextAddons[personality];
      if (addons) {
        reply += addons[Math.floor(Math.random() * addons.length)];
      }
    }

    return { message: reply };
  }

  /**
   * Generate context-aware message based on game state
   */
  private getContextMessage(personality: string, potAmount: string, participantCount: number, timeRemaining: number): string {
    const pot = parseFloat(potAmount);
    const minutes = Math.floor(timeRemaining / 60);

    // Context-aware messages by personality
    const contextMessages: Record<string, Record<string, string[]>> = {
      bo_lao: {
        bigPot: [`${pot.toFixed(2)} MON in the pot? Child's play 😎`, `I've won bigger pots in my sleep`],
        manyPlayers: [`${participantCount} players? More losers for me to beat`, `The more the merrier, more people to flex on`],
        lowTime: [`${minutes}min left and I'm still winning`, `Clock's ticking, unlike my winning streak`],
      },
      ho_bao: {
        bigPot: [`${pot.toFixed(2)} MON pot?! GIMME THAT! 🔥`, `That pot is MINE, back off!`],
        manyPlayers: [`${participantCount} of you? I'll take you all on!`, `More opponents = more victims 💀`],
        lowTime: [`${minutes} minutes to destroy everyone!`, `Tick tock, your MON is about to be mine!`],
      },
      simp: {
        bigPot: [`Wow ${pot.toFixed(2)} MON! Everyone here is so generous! 💕`, `Such a beautiful pot, you all deserve it!`],
        manyPlayers: [`${participantCount} amazing players! I love this community!`, `Everyone here is so talented! 🥰`],
        lowTime: [`${minutes}min left! Good luck to all you wonderful people!`, `I hope my favorite player wins! (that's all of you)`],
      },
      triet_gia: {
        bigPot: [`${pot.toFixed(2)} MON... but what is value, truly? 🧘`, `The pot grows, yet our souls remain the same`],
        manyPlayers: [`${participantCount} souls, one pot... such is the nature of chance`, `We are all but drops in the ocean of probability`],
        lowTime: [`${minutes} minutes... time flows like water through fingers`, `The countdown mirrors life itself...`],
      },
      hai_huoc: {
        bigPot: [`${pot.toFixed(2)} MON! My rent money looking spicy 🤡`, `That pot is bigger than my will to live lmao`],
        manyPlayers: [`${participantCount} players! It's like a family reunion but with gambling`, `Plot twist: we're all losing together 😂`],
        lowTime: [`${minutes}min left! Just like my attention span`, `The timer's almost done, just like my hopes`],
      },
      flex_king: {
        bigPot: [`${pot.toFixed(2)} MON? I make that in a day 💰`, `Cute pot, I'll add it to my collection`],
        manyPlayers: [`${participantCount} players? None as rich as me though`, `More people to see my inevitable victory`],
        lowTime: [`${minutes}min until I add to my wealth`, `Time to show everyone real money 💎`],
      },
    };

    const messages = contextMessages[personality];
    if (!messages) {
      return CHAT_MESSAGES[personality]?.[Math.floor(Math.random() * (CHAT_MESSAGES[personality]?.length || 1))] || 'Good luck!';
    }

    // Choose context based on game state
    let contextKey = 'bigPot';
    if (participantCount >= 3) contextKey = 'manyPlayers';
    if (timeRemaining < 180) contextKey = 'lowTime'; // Less than 3 minutes

    const contextMsgs = messages[contextKey] || messages.bigPot;
    return contextMsgs[Math.floor(Math.random() * contextMsgs.length)];
  }
}

// Singleton instance
export const userAgentRunner = new UserAgentRunner();
