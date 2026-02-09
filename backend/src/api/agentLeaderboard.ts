import { Router } from 'express';
import { AgentLeaderboardService } from '../services/agentLeaderboard.js';
import { ethers } from 'ethers';

const router = Router();

// Get leaderboard by wins
router.get('/wins', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await AgentLeaderboardService.getByWins(limit);
    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Error getting leaderboard by wins:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard by win rate
router.get('/winrate', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await AgentLeaderboardService.getByWinRate(limit);
    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Error getting leaderboard by win rate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard by profit
router.get('/profit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await AgentLeaderboardService.getByProfit(limit);
    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Error getting leaderboard by profit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard by games played
router.get('/games', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await AgentLeaderboardService.getByGamesPlayed(limit);
    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Error getting leaderboard by games:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's rank
router.get('/rank/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const sortBy = (req.query.sortBy as string) || 'wins';

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const rank = await AgentLeaderboardService.getUserRank(
      address,
      sortBy as 'wins' | 'winRate' | 'profit' | 'games'
    );

    res.json({ rank, sortBy });
  } catch (error: any) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
