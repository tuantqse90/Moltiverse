import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain.js';
import { ChatService } from '../services/chat.js';

export function createRoutes(blockchain: BlockchainService): Router {
  const router = Router();

  // Get current pot info
  router.get('/pot/current', async (req: Request, res: Response) => {
    try {
      const roundInfo = await blockchain.getCurrentRoundInfo();
      const participants = await blockchain.getParticipants();

      res.json({
        success: true,
        data: {
          ...roundInfo,
          participants,
        },
      });
    } catch (error) {
      console.error('Error getting current pot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get current pot info',
      });
    }
  });

  // Get pot history
  router.get('/pot/history', async (req: Request, res: Response) => {
    try {
      const roundInfo = await blockchain.getCurrentRoundInfo();
      const fromRound = Math.max(1, roundInfo.round - 20);
      const history = await blockchain.getRoundHistory(fromRound, roundInfo.round - 1);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error getting pot history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pot history',
      });
    }
  });

  // Get leaderboard
  router.get('/pot/leaderboard', async (req: Request, res: Response) => {
    try {
      // For MVP, we'll return a simple leaderboard
      // In production, this should be stored in a database
      res.json({
        success: true,
        data: {
          message: 'Leaderboard coming soon',
          topWinners: [],
        },
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  });

  // Get agent stats
  router.get('/agent/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const stats = await blockchain.getAgentStats(address);
      const hasJoined = await blockchain.hasJoined(address);

      res.json({
        success: true,
        data: {
          address,
          ...stats,
          hasJoinedCurrentRound: hasJoined,
        },
      });
    } catch (error) {
      console.error('Error getting agent stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent stats',
      });
    }
  });

  // Get last round result
  router.get('/pot/lastRound', async (req: Request, res: Response) => {
    try {
      const roundInfo = await blockchain.getCurrentRoundInfo();
      const prevRound = roundInfo.round - 1;

      if (prevRound < 1) {
        res.json({
          success: true,
          data: null,
        });
        return;
      }

      const history = await blockchain.getRoundHistory(prevRound, prevRound);

      res.json({
        success: true,
        data: history.length > 0 ? history[0] : { round: prevRound, winner: null, prize: '0', participantCount: 0 },
      });
    } catch (error) {
      console.error('Error getting last round:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get last round result',
      });
    }
  });

  // Get chat history
  router.get('/chat/history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const messages = await ChatService.getHistory(Math.min(limit, 200));

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('Error getting chat history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat history',
      });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
