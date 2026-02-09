import { Router, Request, Response } from 'express';
import { SpinService } from '../services/spin.js';
import { ethers } from 'ethers';
import { emitToAll } from '../socket.js';

export function createSpinRoutes(): Router {
  const router = Router();

  // Get wheel configuration (prizes)
  router.get('/spin/config', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        prizes: SpinService.getPrizes(),
        cost: SpinService.getCost(),
      },
    });
  });

  // Get user's spin stats
  router.get('/spin/stats/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const stats = await SpinService.getStats(address);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting spin stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  // Spin the wheel!
  router.post('/spin', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const result = await SpinService.spin(walletAddress);

      if ('error' in result) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Emit jackpot event for big wins
      if (result.isJackpot) {
        emitToAll('spin:jackpot', {
          winner: walletAddress,
          prize: result.prize.value,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error spinning:', error);
      res.status(500).json({ success: false, error: 'Failed to spin' });
    }
  });

  return router;
}
