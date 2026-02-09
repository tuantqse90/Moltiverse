import { db, isDatabaseAvailable } from '../db/index.js';
import { referrals, referralCodes } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { PMonService, PMON_POINTS } from './pmon.js';

// Referral rewards
export const REFERRAL_REWARDS = {
  REFERRER_BONUS: 100, // pMON for the person who referred
  REFEREE_BONUS: 50,   // pMON for the person being referred
};

export class ReferralService {
  // Generate a unique referral code for a wallet
  static async getOrCreateReferralCode(walletAddress: string): Promise<string> {
    if (!isDatabaseAvailable()) {
      return this.generateCode(walletAddress);
    }

    const addr = walletAddress.toLowerCase();

    // Check if code already exists
    const existing = await db!
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, addr))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].code;
    }

    // Generate new code
    const code = this.generateCode(walletAddress);

    await db!.insert(referralCodes).values({
      walletAddress: addr,
      code,
    });

    return code;
  }

  // Generate a short unique code based on wallet
  private static generateCode(walletAddress: string): string {
    const base = walletAddress.slice(2, 8).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${base}${random}`;
  }

  // Get referral code info
  static async getReferralInfo(walletAddress: string) {
    if (!isDatabaseAvailable()) {
      return null;
    }

    const addr = walletAddress.toLowerCase();

    const codeInfo = await db!
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, addr))
      .limit(1);

    if (codeInfo.length === 0) {
      return null;
    }

    // Get list of referrals
    const referralList = await db!
      .select()
      .from(referrals)
      .where(eq(referrals.referrerAddress, addr));

    return {
      code: codeInfo[0].code,
      totalReferrals: codeInfo[0].totalReferrals,
      successfulReferrals: codeInfo[0].successfulReferrals,
      totalEarned: codeInfo[0].totalEarned,
      referrals: referralList.map(r => ({
        referee: r.refereeAddress,
        status: r.status,
        reward: r.referrerReward,
        completedAt: r.completedAt,
      })),
    };
  }

  // Apply referral code (when new user signs up)
  static async applyReferralCode(
    refereeAddress: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    if (!isDatabaseAvailable()) {
      return { success: false, message: 'Database not available' };
    }

    const refereeAddr = refereeAddress.toLowerCase();

    // Check if referee already has a referral
    const existingReferral = await db!
      .select()
      .from(referrals)
      .where(eq(referrals.refereeAddress, refereeAddr))
      .limit(1);

    if (existingReferral.length > 0) {
      return { success: false, message: 'Already referred by someone' };
    }

    // Find referrer by code
    const referrerCode = await db!
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code.toUpperCase()))
      .limit(1);

    if (referrerCode.length === 0) {
      return { success: false, message: 'Invalid referral code' };
    }

    const referrerAddr = referrerCode[0].walletAddress;

    // Can't refer yourself
    if (referrerAddr === refereeAddr) {
      return { success: false, message: 'Cannot use your own referral code' };
    }

    // Create referral record
    await db!.insert(referrals).values({
      referrerAddress: referrerAddr,
      refereeAddress: refereeAddr,
      referralCode: code.toUpperCase(),
      status: 'pending',
    });

    // Update referrer stats
    await db!
      .update(referralCodes)
      .set({
        totalReferrals: (referrerCode[0].totalReferrals || 0) + 1,
      })
      .where(eq(referralCodes.walletAddress, referrerAddr));

    return { success: true, message: 'Referral code applied! Complete your first game to earn bonus.' };
  }

  // Complete referral (when referee joins first pot)
  static async completeReferral(refereeAddress: string): Promise<{ referrerReward: number; refereeReward: number } | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }

    const refereeAddr = refereeAddress.toLowerCase();

    // Find pending referral
    const pendingReferral = await db!
      .select()
      .from(referrals)
      .where(eq(referrals.refereeAddress, refereeAddr))
      .limit(1);

    if (pendingReferral.length === 0 || pendingReferral[0].status !== 'pending') {
      return null;
    }

    const referral = pendingReferral[0];

    // Award pMON to both parties
    await PMonService.awardPoints(
      referral.referrerAddress,
      'referral_bonus',
      REFERRAL_REWARDS.REFERRER_BONUS,
      { referee: refereeAddr }
    );

    await PMonService.awardPoints(
      refereeAddr,
      'referral_signup',
      REFERRAL_REWARDS.REFEREE_BONUS,
      { referrer: referral.referrerAddress }
    );

    // Update referral status
    await db!
      .update(referrals)
      .set({
        status: 'rewarded',
        referrerReward: REFERRAL_REWARDS.REFERRER_BONUS,
        refereeReward: REFERRAL_REWARDS.REFEREE_BONUS,
        completedAt: new Date(),
        rewardedAt: new Date(),
      })
      .where(eq(referrals.id, referral.id));

    // Update referrer stats
    const referrerCode = await db!
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, referral.referrerAddress))
      .limit(1);

    if (referrerCode.length > 0) {
      await db!
        .update(referralCodes)
        .set({
          successfulReferrals: (referrerCode[0].successfulReferrals || 0) + 1,
          totalEarned: (referrerCode[0].totalEarned || 0) + REFERRAL_REWARDS.REFERRER_BONUS,
        })
        .where(eq(referralCodes.walletAddress, referral.referrerAddress));
    }

    return {
      referrerReward: REFERRAL_REWARDS.REFERRER_BONUS,
      refereeReward: REFERRAL_REWARDS.REFEREE_BONUS,
    };
  }

  // Get leaderboard of top referrers
  static async getLeaderboard(limit: number = 10) {
    if (!isDatabaseAvailable()) {
      return [];
    }

    const topReferrers = await db!
      .select()
      .from(referralCodes)
      .orderBy(referralCodes.successfulReferrals)
      .limit(limit);

    return topReferrers.map((r, idx) => ({
      rank: idx + 1,
      walletAddress: r.walletAddress,
      successfulReferrals: r.successfulReferrals,
      totalEarned: r.totalEarned,
    }));
  }
}
