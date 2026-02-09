import { Router } from 'express';
import { ReferralService, REFERRAL_REWARDS } from '../services/referral.js';

const router = Router();

// Get or create referral code for a wallet
router.get('/code/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const code = await ReferralService.getOrCreateReferralCode(address);

    res.json({
      success: true,
      data: {
        code,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?ref=${code}`,
      },
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral code' });
  }
});

// Get referral info and stats for a wallet
router.get('/info/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const info = await ReferralService.getReferralInfo(address);

    if (!info) {
      // Create code if not exists
      const code = await ReferralService.getOrCreateReferralCode(address);
      return res.json({
        success: true,
        data: {
          code,
          totalReferrals: 0,
          successfulReferrals: 0,
          totalEarned: 0,
          referrals: [],
          rewards: REFERRAL_REWARDS,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...info,
        rewards: REFERRAL_REWARDS,
      },
    });
  } catch (error) {
    console.error('Error getting referral info:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral info' });
  }
});

// Apply referral code
router.post('/apply', async (req, res) => {
  try {
    const { refereeAddress, code } = req.body;

    if (!refereeAddress || !refereeAddress.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    if (!code || code.length < 6) {
      return res.status(400).json({ success: false, error: 'Invalid referral code' });
    }

    const result = await ReferralService.applyReferralCode(refereeAddress, code);

    res.json(result);
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({ success: false, error: 'Failed to apply referral code' });
  }
});

// Get referral leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const leaderboard = await ReferralService.getLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting referral leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

export default router;
