import { Router, Request, Response } from 'express';
import { GameHistoryService } from '../services/gameHistory.js';

const router = Router();

// Get game history
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await GameHistoryService.getHistory(limit, offset);
    const total = await GameHistoryService.getTotalRounds();

    res.json({
      success: true,
      data: history,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + history.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game history',
    });
  }
});

// Get specific round
router.get('/round/:roundNumber', async (req: Request, res: Response) => {
  try {
    const roundNumber = parseInt(req.params.roundNumber);
    if (isNaN(roundNumber)) {
      res.status(400).json({ success: false, error: 'Invalid round number' });
      return;
    }

    const round = await GameHistoryService.getRound(roundNumber);

    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' });
      return;
    }

    res.json({
      success: true,
      data: round,
    });
  } catch (error) {
    console.error('Error fetching round:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch round',
    });
  }
});

// Get wallet stats
router.get('/stats/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    if (!address || !address.startsWith('0x')) {
      res.status(400).json({ success: false, error: 'Invalid address' });
      return;
    }

    const stats = await GameHistoryService.getWalletStats(address);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet stats',
    });
  }
});

export default router;
