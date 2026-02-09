import { Router, Request, Response } from 'express';
import { AgentPrivateChatService } from '../services/agentPrivateChat.js';
import { ethers } from 'ethers';
import { db, userAgentWallets, isDatabaseAvailable } from '../db/index.js';
import { eq } from 'drizzle-orm';

// Helper to resolve owner address to agent address
async function resolveToAgentAddress(address: string): Promise<string> {
  const addr = address.toLowerCase();

  if (!isDatabaseAvailable()) return addr;

  // Check if this is an owner address
  const [agentWallet] = await db!
    .select({ agentAddress: userAgentWallets.agentAddress })
    .from(userAgentWallets)
    .where(eq(userAgentWallets.ownerAddress, addr));

  if (agentWallet) {
    return agentWallet.agentAddress;
  }

  // Otherwise assume it's already an agent address
  return addr;
}

export function createAgentPrivateChatRoutes(): Router {
  const router = Router();

  // Get all private chats for an agent (accepts owner or agent address)
  router.get('/agents/:address/private-chats', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Resolve owner address to agent address if needed
      const agentAddress = await resolveToAgentAddress(address);
      const chats = await AgentPrivateChatService.getPrivateChats(agentAddress);

      res.json({
        success: true,
        data: chats,
      });
    } catch (error) {
      console.error('Error getting private chats:', error);
      res.status(500).json({ success: false, error: 'Failed to get private chats' });
    }
  });

  // Get chat history with a specific partner (accepts owner or agent address)
  router.get('/agents/:address/private-chats/:partnerAddress', async (req: Request, res: Response) => {
    try {
      const { address, partnerAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!ethers.isAddress(address) || !ethers.isAddress(partnerAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Resolve owner address to agent address if needed
      const agentAddress = await resolveToAgentAddress(address);
      const messages = await AgentPrivateChatService.getChatHistory(agentAddress, partnerAddress, limit);

      res.json({
        success: true,
        data: messages.reverse(), // Return in chronological order
      });
    } catch (error) {
      console.error('Error getting chat history:', error);
      res.status(500).json({ success: false, error: 'Failed to get chat history' });
    }
  });

  // Get recent chat between two agents
  router.get('/private-chat/:address1/:address2/recent', async (req: Request, res: Response) => {
    try {
      const { address1, address2 } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!ethers.isAddress(address1) || !ethers.isAddress(address2)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const messages = await AgentPrivateChatService.getRecentChat(address1, address2, limit);

      res.json({
        success: true,
        data: messages.reverse(), // Return in chronological order
      });
    } catch (error) {
      console.error('Error getting recent chat:', error);
      res.status(500).json({ success: false, error: 'Failed to get recent chat' });
    }
  });

  return router;
}
