import { Router, Request, Response } from 'express';
import { PMonService, PMON_POINTS, PMON_TIERS } from '../services/pmon.js';
import { ProfileService } from '../services/profile.js';
import { ethers } from 'ethers';

export function createPMonRoutes(): Router {
  const router = Router();

  // Get pMON balance for address (combined owner + agent)
  router.get('/pmon/balance/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Get combined balance (owner + agent)
      const combined = await PMonService.getCombinedBalance(address);
      const tierInfo = PMonService.getTierInfo(combined.combined.tier);

      res.json({
        success: true,
        data: {
          walletAddress: address.toLowerCase(),
          // Combined totals
          balance: combined.combined.balance,
          totalEarned: combined.combined.totalEarned,
          tier: combined.combined.tier,
          tierInfo,
          progress: tierInfo.nextThreshold
            ? {
                current: combined.combined.totalEarned,
                next: tierInfo.nextThreshold,
                percentage: Math.min(100, (combined.combined.totalEarned / tierInfo.nextThreshold) * 100).toFixed(1),
              }
            : null,
          // Breakdown
          breakdown: {
            owner: {
              balance: combined.owner?.balance || 0,
              totalEarned: combined.owner?.totalEarned || 0,
            },
            agent: combined.agentAddress
              ? {
                  address: combined.agentAddress,
                  balance: combined.agent?.balance || 0,
                  totalEarned: combined.agent?.totalEarned || 0,
                }
              : null,
          },
        },
      });
    } catch (error) {
      console.error('Error getting pMON balance:', error);
      res.status(500).json({ success: false, error: 'Failed to get balance' });
    }
  });

  // Get transaction history (combined owner + agent)
  router.get('/pmon/history/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Get combined history (owner + agent)
      const history = await PMonService.getCombinedHistory(address, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error getting pMON history:', error);
      res.status(500).json({ success: false, error: 'Failed to get history' });
    }
  });

  // Get leaderboard
  router.get('/pmon/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const leaderboard = await PMonService.getLeaderboard(limit);

      // Enrich with profile data
      const enriched = await Promise.all(
        leaderboard.map(async (entry) => {
          const profile = await ProfileService.getByWallet(entry.walletAddress);
          return {
            rank: entry.rank,
            walletAddress: entry.walletAddress,
            balance: entry.balance,
            totalEarned: entry.totalEarned,
            tier: entry.tier,
            tierInfo: PMonService.getTierInfo(entry.tier || 'bronze'),
            profile: profile
              ? {
                  name: profile.name || profile.agentName,
                  avatarUrl: profile.avatarUrl,
                  isAgent: profile.isAgent,
                  nftAvatarSeed: profile.nftAvatarSeed || null,
                }
              : null,
          };
        })
      );

      res.json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
    }
  });

  // Claim daily bonus
  router.post('/pmon/claim-daily', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const result = await PMonService.claimDailyBonus(walletAddress);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: {
          points: result.points,
          message: `Claimed ${result.points} pMON daily bonus!`,
        },
      });
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      res.status(500).json({ success: false, error: 'Failed to claim daily bonus' });
    }
  });

  // Get point values (for reference)
  router.get('/pmon/points', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        points: PMON_POINTS,
        tiers: PMON_TIERS,
      },
    });
  });

  // Get tier info
  router.get('/pmon/tiers', (req: Request, res: Response) => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].map(tier => ({
      tier,
      ...PMonService.getTierInfo(tier),
      threshold: PMON_TIERS[tier as keyof typeof PMON_TIERS],
    }));

    res.json({
      success: true,
      data: tiers,
    });
  });

  // Spend pMON (deduct from combined balance)
  router.post('/pmon/spend', async (req: Request, res: Response) => {
    try {
      const { address, amount, action, description } = req.body;

      if (!address || !ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, error: 'Invalid amount' });
        return;
      }

      if (!action) {
        res.status(400).json({ success: false, error: 'Action is required' });
        return;
      }

      const result = await PMonService.deductCombinedPoints(
        address,
        amount,
        action,
        description || action
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: {
          spent: amount,
          newBalance: result.newCombinedBalance,
          deductedFrom: result.deductedFrom,
        },
      });
    } catch (error) {
      console.error('Error spending pMON:', error);
      res.status(500).json({ success: false, error: 'Failed to spend pMON' });
    }
  });

  return router;
}
