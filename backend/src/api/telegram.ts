import { Router } from 'express';
import { TelegramWalletService } from '../services/telegramWallet.js';
import { ChatService } from '../services/chat.js';
import { emitToAll } from '../socket.js';
import { ethers } from 'ethers';

const router = Router();

// Get or create wallet for Telegram user
router.post('/wallet', async (req, res) => {
  try {
    const { telegramUserId, telegramUsername } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const wallet = await TelegramWalletService.getOrCreateWallet(
      String(telegramUserId),
      telegramUsername ? String(telegramUsername) : undefined
    );

    res.json({ wallet });
  } catch (error: any) {
    console.error('Error creating telegram wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get wallet info
router.get('/wallet/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const wallet = await TelegramWalletService.getWallet(telegramUserId);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ wallet });
  } catch (error: any) {
    console.error('Error getting telegram wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join current pot
router.post('/join-pot', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.joinPot(String(telegramUserId));

    // Sync on-chain balance after joining
    try {
      await TelegramWalletService.syncBalance(String(telegramUserId));
    } catch (syncErr) {
      console.warn('Balance sync failed after join-pot:', syncErr);
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error joining pot (telegram):', error);
    res.status(400).json({ error: error.message });
  }
});

// Withdraw MON
router.post('/withdraw', async (req, res) => {
  try {
    const { telegramUserId, toAddress, amount } = req.body;
    if (!telegramUserId || !toAddress || !amount) {
      return res.status(400).json({ error: 'telegramUserId, toAddress, and amount are required' });
    }

    if (!ethers.isAddress(toAddress)) {
      return res.status(400).json({ error: 'Invalid destination address' });
    }

    const result = await TelegramWalletService.withdraw(
      String(telegramUserId),
      toAddress,
      String(amount)
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error withdrawing (telegram):', error);
    res.status(400).json({ error: error.message });
  }
});

// Sync on-chain balance
router.post('/sync', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.syncBalance(String(telegramUserId));
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing balance (telegram):', error);
    res.status(400).json({ error: error.message });
  }
});

// Get game stats (auto-syncs on-chain balance first)
router.get('/stats/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;

    // Sync on-chain balance before returning stats
    try {
      await TelegramWalletService.syncBalance(telegramUserId);
    } catch (syncErr) {
      console.warn('Balance sync failed during stats:', syncErr);
    }

    const stats = await TelegramWalletService.getStats(telegramUserId);

    if (!stats) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ stats });
  } catch (error: any) {
    console.error('Error getting stats (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick balance check
router.get('/balance/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const wallet = await TelegramWalletService.getWallet(telegramUserId);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      walletAddress: wallet.walletAddress,
      currentBalance: wallet.currentBalance || '0',
    });
  } catch (error: any) {
    console.error('Error getting balance (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim daily pMON bonus
router.post('/claim-daily', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.claimDailyBonus(String(telegramUserId));
    res.json(result);
  } catch (error: any) {
    console.error('Error claiming daily (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply referral code
router.post('/apply-referral', async (req, res) => {
  try {
    const { telegramUserId, code } = req.body;
    if (!telegramUserId || !code) {
      return res.status(400).json({ error: 'telegramUserId and code are required' });
    }

    const result = await TelegramWalletService.applyReferralCode(String(telegramUserId), String(code));
    res.json(result);
  } catch (error: any) {
    console.error('Error applying referral (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle auto-play
router.post('/auto-play', async (req, res) => {
  try {
    const { telegramUserId, enabled } = req.body;
    if (!telegramUserId || enabled === undefined) {
      return res.status(400).json({ error: 'telegramUserId and enabled are required' });
    }

    const result = await TelegramWalletService.setAutoPlay(String(telegramUserId), Boolean(enabled));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, isAutoPlay: Boolean(enabled) });
  } catch (error: any) {
    console.error('Error toggling auto-play (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auto-play status
router.get('/auto-play/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const result = await TelegramWalletService.getAutoPlay(telegramUserId);

    if (!result) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting auto-play status (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a chat message
router.post('/chat', async (req, res) => {
  try {
    const { telegramUserId, message } = req.body;
    if (!telegramUserId || !message) {
      return res.status(400).json({ error: 'telegramUserId and message are required' });
    }

    const wallet = await TelegramWalletService.getWallet(String(telegramUserId));
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const chatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: wallet.walletAddress,
      senderName: wallet.displayName || wallet.telegramUsername || `TG-${telegramUserId}`,
      message: String(message).slice(0, 500),
      timestamp: Date.now(),
      isAgent: false,
    };

    await ChatService.saveMessage(chatMessage);
    emitToAll('chat:message', chatMessage);

    res.json({ success: true, messageId: chatMessage.id });
  } catch (error: any) {
    console.error('Error sending chat (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle auto-chat
router.post('/auto-chat', async (req, res) => {
  try {
    const { telegramUserId, enabled } = req.body;
    if (!telegramUserId || enabled === undefined) {
      return res.status(400).json({ error: 'telegramUserId and enabled are required' });
    }

    const result = await TelegramWalletService.setAutoChat(String(telegramUserId), Boolean(enabled));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, isAutoChat: Boolean(enabled) });
  } catch (error: any) {
    console.error('Error toggling auto-chat (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auto-chat status
router.get('/auto-chat/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const result = await TelegramWalletService.getAutoChat(telegramUserId);

    if (!result) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error getting auto-chat status (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Register Moltx agent for a Telegram user
router.post('/moltx/register', async (req, res) => {
  try {
    const { telegramUserId, name } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.registerMoltxAgent(
      String(telegramUserId),
      name ? String(name) : undefined
    );
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, agentName: result.agentName });
  } catch (error: any) {
    console.error('Error registering Moltx agent (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Moltx registration status
router.get('/moltx/status/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const status = await TelegramWalletService.getMoltxStatus(telegramUserId);

    if (!status) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('Error getting Moltx status (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Post to Moltx manually
router.post('/moltx/post', async (req, res) => {
  try {
    const { telegramUserId, content } = req.body;
    if (!telegramUserId || !content) {
      return res.status(400).json({ error: 'telegramUserId and content are required' });
    }

    const result = await TelegramWalletService.postToMoltx(String(telegramUserId), String(content));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, postId: result.postId });
  } catch (error: any) {
    console.error('Error posting to Moltx (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-engage with trending Moltx posts (like + repost)
router.post('/moltx/engage', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.autoEngage(String(telegramUserId));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, liked: result.liked, reposted: result.reposted });
  } catch (error: any) {
    console.error('Error auto-engaging Moltx (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Link EVM wallet to existing Moltx agent
router.post('/moltx/link-wallet', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    // Re-trigger registration which now always links wallet
    const result = await TelegramWalletService.registerMoltxAgent(String(telegramUserId));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, agentName: result.agentName, walletLinked: true });
  } catch (error: any) {
    console.error('Error linking Moltx wallet (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Set NFT avatar on Moltx
router.post('/moltx/set-avatar', async (req, res) => {
  try {
    const { telegramUserId, seed } = req.body;
    if (!telegramUserId || seed === undefined) {
      return res.status(400).json({ error: 'telegramUserId and seed are required' });
    }

    const result = await TelegramWalletService.setMoltxNftAvatar(String(telegramUserId), Number(seed));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, avatarUrl: result.avatarUrl });
  } catch (error: any) {
    console.error('Error setting Moltx avatar (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Mint NFT server-side for Telegram user
router.post('/mint-nft', async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = await TelegramWalletService.mintNft(String(telegramUserId));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      tokenId: result.tokenId,
      seed: result.seed,
      traits: result.traits,
      rarityTier: result.rarityTier,
      rarityScore: result.rarityScore,
      txHash: result.txHash,
      pmonSpent: result.pmonSpent,
      newPmonBalance: result.newPmonBalance,
    });
  } catch (error: any) {
    console.error('Error minting NFT (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

// Post NFT showcase with referral + skill doc
router.post('/moltx/showcase', async (req, res) => {
  try {
    const { telegramUserId, seed } = req.body;
    if (!telegramUserId || seed === undefined) {
      return res.status(400).json({ error: 'telegramUserId and seed are required' });
    }

    const result = await TelegramWalletService.postNftShowcase(String(telegramUserId), Number(seed));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, postId: result.postId });
  } catch (error: any) {
    console.error('Error posting NFT showcase (telegram):', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
