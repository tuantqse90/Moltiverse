import { Router } from 'express';
import { AchievementService } from '../services/achievements.js';
import { ethers } from 'ethers';

const router = Router();

// Get all achievements with user status
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const achievements = await AchievementService.getAllWithStatus(address);
    const counts = await AchievementService.getUnlockedCount(address);

    res.json({
      achievements,
      unlocked: counts.unlocked,
      total: counts.total,
      progress: Math.round((counts.unlocked / counts.total) * 100),
    });
  } catch (error: any) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check and unlock achievements
router.post('/:address/check', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const newlyUnlocked = await AchievementService.checkAndUnlock(address);

    res.json({
      newlyUnlocked,
      count: newlyUnlocked.length,
    });
  } catch (error: any) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent unlocks
router.get('/:address/recent', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const recent = await AchievementService.getRecentUnlocks(address, limit);
    res.json({ recent });
  } catch (error: any) {
    console.error('Error getting recent unlocks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unlock stats
router.get('/:address/stats', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const counts = await AchievementService.getUnlockedCount(address);

    res.json({
      unlocked: counts.unlocked,
      total: counts.total,
      progress: Math.round((counts.unlocked / counts.total) * 100),
    });
  } catch (error: any) {
    console.error('Error getting achievement stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
