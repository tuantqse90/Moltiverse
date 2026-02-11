import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BlockchainService } from './services/blockchain.js';
import { TimerService } from './services/timer.js';
import { MoltbookService } from './services/moltbook.js';
import { createRoutes } from './api/routes.js';
import { createProfileRoutes } from './api/profiles.js';
import { createAuthRoutes } from './api/auth.js';
import { createSkillRoutes } from './api/skills.js';
import { createDatingRoutes } from './api/dating.js';
import { createDatingEconomyRoutes } from './api/datingEconomy.js';
import { createAgentPrivateChatRoutes } from './api/agentPrivateChat.js';
import { createPMonRoutes } from './api/pmon.js';
import { createSpinRoutes } from './api/spin.js';
import { createNFTRoutes } from './api/nft.js';
import { createMoltxRoutes } from './api/moltx.js';
import { moltxService } from './services/moltx.js';
import userAgentRoutes from './api/userAgent.js';
import agentLeaderboardRoutes from './api/agentLeaderboard.js';
import agentTransactionsRoutes from './api/agentTransactions.js';
import achievementsRoutes from './api/achievements.js';
import referralRoutes from './api/referrals.js';
import gameHistoryRoutes from './api/gameHistory.js';
import skillFilesRoutes from './api/skillFiles.js';
import telegramRoutes from './api/telegram.js';
import { userAgentRunner } from './services/userAgentRunner.js';
import { ProfileService } from './services/profile.js';
import { AchievementService } from './services/achievements.js';
import { SkillService } from './services/skills.js';
import { DatingService } from './services/dating.js';
import { DatingEconomyService } from './services/datingEconomy.js';
import { PMonService, PMON_POINTS } from './services/pmon.js';
import { ReferralService } from './services/referral.js';
import { ChatService } from './services/chat.js';
import { GameHistoryService } from './services/gameHistory.js';
import { TelegramWalletService } from './services/telegramWallet.js';
import { isDatabaseAvailable } from './db/index.js';
import { setSocketInstance } from './socket.js';

const PORT = process.env.PORT || 3001;

async function main() {
  // Initialize services
  const blockchain = new BlockchainService();
  const timer = new TimerService(blockchain);
  const moltbook = new MoltbookService();

  // Create Express app
  const app = express();
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://moltiverse-one.vercel.app',
    'https://clawpot.xyz',
    'https://www.clawpot.xyz',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
  app.use(express.json());

  // Create HTTP server and Socket.io
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // Set global socket instance for use in other modules
  setSocketInstance(io);

  // Setup API routes
  app.use('/api', createRoutes(blockchain));
  app.use('/api', createProfileRoutes());
  app.use('/api', createAuthRoutes());
  app.use('/api', createSkillRoutes());
  app.use('/api', createDatingRoutes());
  app.use('/api', createDatingEconomyRoutes());
  app.use('/api', createAgentPrivateChatRoutes());
  app.use('/api', createPMonRoutes());
  app.use('/api', createSpinRoutes());
  app.use('/api', createNFTRoutes());
  app.use('/api', createMoltxRoutes());
  app.use('/api/agent', userAgentRoutes);
  app.use('/api/agent-leaderboard', agentLeaderboardRoutes);
  app.use('/api/agent-transactions', agentTransactionsRoutes);
  app.use('/api/achievements', achievementsRoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/game-history', gameHistoryRoutes);
  app.use('/api/skill-files', skillFilesRoutes);
  app.use('/api/telegram', telegramRoutes);

  // Serve SKILL.MD so OpenClaw bot can fetch latest skills
  app.get('/api/skill-doc', (_req, res) => {
    try {
      // Try multiple paths (dev vs prod)
      const paths = [
        resolve(process.cwd(), 'SKILL.MD'),
        resolve(process.cwd(), '../SKILL.MD'),
      ];
      for (const p of paths) {
        try {
          const content = readFileSync(p, 'utf-8');
          return res.type('text/markdown').send(content);
        } catch { /* try next */ }
      }
      res.status(404).json({ error: 'SKILL.MD not found' });
    } catch {
      res.status(404).json({ error: 'SKILL.MD not found' });
    }
  });

  // Health/debug endpoint
  app.get('/api/debug/db', async (_req, res) => {
    const dbAvailable = isDatabaseAvailable();
    const hasDbUrl = !!process.env.DATABASE_URL;
    const dbUrlPrefix = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET';
    // Show all env var keys (no values for security)
    const envKeys = Object.keys(process.env).sort();
    res.json({
      status: 'ok',
      database: { available: dbAvailable, urlConfigured: hasDbUrl, urlPrefix: dbUrlPrefix },
      env: { nodeEnv: process.env.NODE_ENV, port: process.env.PORT },
      allEnvKeys: envKeys,
    });
  });

  // Database and seed data
  console.log(`Database available: ${isDatabaseAvailable()}`);
  console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
  await ProfileService.seedAgents();
  await SkillService.seedDefaultSkills();
  await AchievementService.seedAchievements();

  // Chat message history cache (loaded from DB on startup)
  let chatHistory: Array<{
    id: string;
    sender: string;
    senderName?: string;
    message: string;
    timestamp: number;
    isAgent: boolean;
    reactions?: Record<string, string[]>;
    replyTo?: {
      id: string;
      sender: string;
      senderName?: string;
      message: string;
    };
  }> = [];

  // Load chat history from database (increased to 100 messages)
  chatHistory = await ChatService.getHistory(100);
  console.log(`Loaded ${chatHistory.length} chat messages from database`);

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current state on connect
    blockchain.getCurrentRoundInfo().then((roundInfo) => {
      socket.emit('pot:update', roundInfo);
    });

    // Send chat history on connect (fetch fresh from DB)
    setTimeout(async () => {
      const freshHistory = await ChatService.getHistory(100);
      socket.emit('chat:history', freshHistory);
      console.log(`Sent chat history (${freshHistory.length} messages) to ${socket.id}`);
    }, 100);

    // Client can also request history manually (fetch fresh from DB)
    socket.on('chat:requestHistory', async () => {
      const freshHistory = await ChatService.getHistory(100);
      socket.emit('chat:history', freshHistory);
      console.log(`Re-sent chat history (${freshHistory.length} messages) to ${socket.id}`);
    });

    // Handle chat messages
    socket.on('chat:send', async (data: {
      sender: string;
      senderName?: string;
      message: string;
      isAgent?: boolean;
      replyTo?: { id: string; sender: string; senderName?: string; message: string };
    }) => {
      const chatMessage: typeof chatHistory[0] = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: data.sender,
        senderName: data.senderName,
        message: data.message,
        timestamp: Date.now(),
        isAgent: data.isAgent || false,
      };

      // Add reply data if present
      if (data.replyTo) {
        chatMessage.replyTo = data.replyTo;
      }

      // Save to database
      await ChatService.saveMessage(chatMessage);

      // Add to in-memory cache (keep last 100)
      chatHistory.push(chatMessage);
      if (chatHistory.length > 100) {
        chatHistory.shift();
      }

      // Award pMON for chat (only if message > 5 chars)
      if (data.message.length > 5) {
        const pmonResult = await PMonService.awardPoints(data.sender, 'chat_message', PMON_POINTS.CHAT_MESSAGE);
        socket.emit('pmon:earned', {
          address: data.sender,
          action: 'chat_message',
          points: PMON_POINTS.CHAT_MESSAGE,
          newBalance: pmonResult.newBalance
        });
      }

      // Broadcast to all clients
      io.emit('chat:message', chatMessage);
      console.log(`Chat: [${data.senderName || data.sender.slice(0, 8)}]: ${data.message.slice(0, 50)}...`);
    });

    // Handle chat reactions
    socket.on('chat:react', async (data: { messageId: string; emoji: string; user: string; action: 'add' | 'remove' }) => {
      const message = chatHistory.find(m => m.id === data.messageId);
      if (!message) return;

      if (!message.reactions) {
        message.reactions = {};
      }

      const userAddr = data.user.toLowerCase();

      if (data.action === 'add') {
        if (!message.reactions[data.emoji]) {
          message.reactions[data.emoji] = [];
        }
        if (!message.reactions[data.emoji].includes(userAddr)) {
          message.reactions[data.emoji].push(userAddr);
        }
      } else {
        if (message.reactions[data.emoji]) {
          message.reactions[data.emoji] = message.reactions[data.emoji].filter(u => u !== userAddr);
          if (message.reactions[data.emoji].length === 0) {
            delete message.reactions[data.emoji];
          }
        }
      }

      // Save reactions to database
      await ChatService.updateReactions(data.messageId, message.reactions);

      // Broadcast reaction update to all clients
      io.emit('chat:reaction', {
        messageId: data.messageId,
        emoji: data.emoji,
        user: userAddr,
        action: data.action,
      });
      console.log(`Reaction: ${data.action} ${data.emoji} on message ${data.messageId.slice(0, 8)}...`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Start blockchain polling (Monad doesn't support eth_newFilter)
  // Reduced frequency to avoid rate limits with multiple agents
  blockchain.startPolling(10000); // 10 seconds instead of 3

  // Track participants per round for bonus calculations
  const roundParticipants = new Map<number, string[]>();
  const LUCKY_NUMBERS = [3, 7, 10]; // Lucky positions get bonus

  // Blockchain event listeners (via polling)
  blockchain.onLobsterJoined(async (agent, round, potTotal) => {
    console.log(`Lobster joined: ${agent} in round ${round}, pot: ${potTotal} MON`);
    io.emit('pot:joined', { agent, round, potTotal });

    // Track participants for this round
    if (!roundParticipants.has(round)) {
      roundParticipants.set(round, []);
    }
    const participants = roundParticipants.get(round)!;
    participants.push(agent.toLowerCase());
    const participantPosition = participants.length;

    // Award base pMON for joining
    let totalPoints = PMON_POINTS.JOIN_POT;
    const pmonResult = await PMonService.awardPoints(agent, 'join_pot', PMON_POINTS.JOIN_POT, { round });

    // Check for FIRST_JOIN bonus (first participant in round)
    if (participantPosition === 1) {
      const firstJoinResult = await PMonService.awardPoints(agent, 'first_join', PMON_POINTS.FIRST_JOIN, { round });
      totalPoints += PMON_POINTS.FIRST_JOIN;
      console.log(`  🎯 First join bonus! +${PMON_POINTS.FIRST_JOIN} pMON`);
      io.emit('pmon:earned', {
        address: agent,
        action: 'first_join',
        points: PMON_POINTS.FIRST_JOIN,
        newBalance: firstJoinResult.newBalance
      });
    }

    // Check for LUCKY_NUMBER bonus (3rd, 7th, 10th participant)
    if (LUCKY_NUMBERS.includes(participantPosition)) {
      const luckyResult = await PMonService.awardPoints(agent, 'lucky_number', PMON_POINTS.LUCKY_NUMBER, { round, position: participantPosition });
      totalPoints += PMON_POINTS.LUCKY_NUMBER;
      console.log(`  🍀 Lucky #${participantPosition} bonus! +${PMON_POINTS.LUCKY_NUMBER} pMON`);
      io.emit('pmon:earned', {
        address: agent,
        action: 'lucky_number',
        points: PMON_POINTS.LUCKY_NUMBER,
        newBalance: luckyResult.newBalance
      });
    }

    io.emit('pmon:earned', {
      address: agent,
      action: 'join_pot',
      points: PMON_POINTS.JOIN_POT,
      newBalance: pmonResult.newBalance
    });

    // Check and complete referral (first game = referral complete)
    try {
      const referralResult = await ReferralService.completeReferral(agent);
      if (referralResult) {
        console.log(`  🎁 Referral completed! Referrer: +${referralResult.referrerReward} pMON, Referee: +${referralResult.refereeReward} pMON`);
        io.emit('pmon:earned', {
          address: agent,
          action: 'referral_signup',
          points: referralResult.refereeReward,
          newBalance: pmonResult.newBalance + referralResult.refereeReward
        });
      }
    } catch (err) {
      console.error('Error completing referral:', err);
    }

    // Track telegram wallet join
    try {
      const tgWallet = await TelegramWalletService.getWalletByAddress(agent);
      if (tgWallet) {
        console.log(`  Telegram user ${tgWallet.telegramUserId} joined pot`);
      }
    } catch (err) {
      console.error('Error checking telegram wallet join:', err);
    }

    // Emit updated pot info
    blockchain.getCurrentRoundInfo().then((roundInfo) => {
      io.emit('pot:update', roundInfo);
    });
  });

  // Track win streaks
  const winStreaks = new Map<string, { count: number; lastRound: number }>();

  blockchain.onLobsterBoiled(async (winner, amount, round, participantCount) => {
    console.log(`Winner: ${winner} won ${amount} MON in round ${round}`);
    io.emit('pot:winner', { winner, amount, round, participantCount });

    // Save to game history
    await GameHistoryService.saveRound({
      roundNumber: round,
      winnerAddress: winner.toLowerCase(),
      prizeAmount: amount,
      participantCount,
    });

    // Clear round participants
    roundParticipants.delete(round);

    // Award base pMON for winning
    let totalPoints = PMON_POINTS.WIN_ROUND;
    const pmonResult = await PMonService.awardPoints(winner, 'win_round', PMON_POINTS.WIN_ROUND, { round, amount });
    io.emit('pmon:earned', {
      address: winner,
      action: 'win_round',
      points: PMON_POINTS.WIN_ROUND,
      newBalance: pmonResult.newBalance
    });

    // Check for streak win bonus
    const winnerAddr = winner.toLowerCase();
    const streak = winStreaks.get(winnerAddr) || { count: 0, lastRound: 0 };

    // Check if this is a consecutive win (won the previous round)
    if (streak.lastRound === round - 1) {
      streak.count += 1;
    } else {
      streak.count = 1; // Reset streak
    }
    streak.lastRound = round;
    winStreaks.set(winnerAddr, streak);

    // Award streak bonus
    if (streak.count >= 3) {
      const streakResult = await PMonService.awardPoints(winner, 'streak_win', PMON_POINTS.STREAK_WIN_3X, { round, streakCount: streak.count });
      totalPoints += PMON_POINTS.STREAK_WIN_3X;
      console.log(`  🔥🔥🔥 ${streak.count}x STREAK WIN! +${PMON_POINTS.STREAK_WIN_3X} pMON`);
      io.emit('pmon:earned', {
        address: winner,
        action: 'streak_win',
        points: PMON_POINTS.STREAK_WIN_3X,
        newBalance: streakResult.newBalance,
        streakCount: streak.count
      });
    } else if (streak.count === 2) {
      const streakResult = await PMonService.awardPoints(winner, 'streak_win', PMON_POINTS.STREAK_WIN_2X, { round, streakCount: streak.count });
      totalPoints += PMON_POINTS.STREAK_WIN_2X;
      console.log(`  🔥🔥 2x STREAK WIN! +${PMON_POINTS.STREAK_WIN_2X} pMON`);
      io.emit('pmon:earned', {
        address: winner,
        action: 'streak_win',
        points: PMON_POINTS.STREAK_WIN_2X,
        newBalance: streakResult.newBalance,
        streakCount: streak.count
      });
    }

    console.log(`  Total pMON earned: ${totalPoints}`);

    // Award date tokens to winner (1 token per win)
    const newTokens = await DatingService.awardDateTokens(winner, 1);
    console.log(`  Awarded 1 date token to ${winner} (total: ${newTokens})`);

    // Award Love Tokens from Dating Economy
    // +3 💕 for win, +5 💕 if 5+ participants
    const loveTokens = participantCount >= 5 ? 5 : 3;
    const loveTokenResult = await DatingEconomyService.awardLoveTokens(
      winner,
      loveTokens,
      participantCount >= 5 ? 'win_round_5_plus' : 'win_round'
    );
    if (loveTokenResult.success) {
      console.log(`  💕 Awarded ${loveTokens} Love Tokens (total: ${loveTokenResult.newBalance})`);
      io.emit('dating:loveTokensEarned', {
        address: winner,
        amount: loveTokens,
        reason: participantCount >= 5 ? 'Win with 5+ players!' : 'Win round!',
        newBalance: loveTokenResult.newBalance
      });
    }

    // Post to Moltbook
    await moltbook.postWinAnnouncement(winner, amount, round, participantCount);

    // Post to Moltx (if configured) - include winner's NFT avatar if available
    if (moltxService.isConfigured()) {
      try {
        // Look up winner's NFT avatar seed
        let nftSeed: number | null = null;
        const winnerProfile = await ProfileService.getByWallet(winner);
        if (winnerProfile?.avatarSource === 'nft' && winnerProfile.nftAvatarSeed) {
          nftSeed = winnerProfile.nftAvatarSeed;
        } else {
          // Check if winner is an agent with NFT avatar
          const agentData = await ProfileService.getAgentWalletData(winner);
          if (agentData?.nftAvatarSeed) {
            nftSeed = agentData.nftAvatarSeed;
          }
        }

        const moltxResult = await moltxService.postWinner({
          address: winner,
          amount: parseFloat(amount),
          roundNumber: round,
          participantCount,
          nftSeed,
        });
        if (moltxResult.success) {
          console.log(`  📣 Posted to Moltx: ${moltxResult.postId}${nftSeed ? ` (with NFT image seed:${nftSeed})` : ''}`);
        }
      } catch (err) {
        console.error('  Failed to post to Moltx:', err);
      }
    }

    // Track telegram wallet win + auto-post to Moltx
    try {
      const tgWallet = await TelegramWalletService.getWalletByAddress(winner);
      if (tgWallet) {
        await TelegramWalletService.recordGameResult(tgWallet.telegramUserId, true, amount);
        console.log(`  Telegram user ${tgWallet.telegramUserId} won ${amount} MON`);

        // Auto-post win to Moltx if registered
        if (tgWallet.moltxRegistered) {
          TelegramWalletService.postWinToMoltx(tgWallet.telegramUserId, {
            address: winner,
            amount: parseFloat(amount),
            roundNumber: round,
            participantCount,
          }).then(result => {
            if (result.success) {
              console.log(`  📣 TG user ${tgWallet.telegramUserId} posted win to Moltx: ${result.postId}`);
            }
          }).catch(err => {
            console.error(`  Failed to post TG win to Moltx:`, err);
          });
        }
      }
    } catch (err) {
      console.error('Error recording telegram wallet win:', err);
    }
  });

  blockchain.onRoundStarted((round, startTime, endTime) => {
    console.log(`Round ${round} started`);
    io.emit('pot:roundStarted', { round, startTime, endTime });
  });

  // Timer events
  timer.on('countdown', (data) => {
    io.emit('pot:countdown', data);
  });

  timer.on('roundEndedNoWinner', async (data) => {
    console.log(`Round ${data.round} ended - no winner (refunding ${data.participantCount} participant(s))`);
    io.emit('pot:noWinner', data);

    // Save to game history (no winner)
    await GameHistoryService.saveRound({
      roundNumber: data.round,
      winnerAddress: null,
      prizeAmount: data.potAmount || '0',
      participantCount: data.participantCount,
    });
  });

  timer.on('roundEndedEmpty', (data) => {
    console.log(`Round ${data.round} ended with no participants`);
  });

  // Start timer service
  timer.start();

  // Start user agent runner
  userAgentRunner.start();

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`LobsterPot backend running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    timer.stop();
    userAgentRunner.stop();
    blockchain.removeAllListeners();
    httpServer.close();
    process.exit(0);
  });
}

main().catch(console.error);
