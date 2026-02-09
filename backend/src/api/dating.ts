import { Router, Request, Response } from 'express';
import { DatingService, type DateType } from '../services/dating.js';
import { DatingEconomyService } from '../services/datingEconomy.js';
import { ProfileService } from '../services/profile.js';
import { ethers } from 'ethers';
import { emitToAll } from '../socket.js';
import { db, userAgentWallets, agentDates, isDatabaseAvailable } from '../db/index.js';
import { eq, or, and, sql } from 'drizzle-orm';

// Helper to get profile from either profiles or userAgentWallets
async function getAgentProfile(address: string) {
  const addr = address.toLowerCase();

  // First try profiles table
  const profile = await ProfileService.getByWallet(addr);
  if (profile && (profile.name || profile.agentName)) {
    return {
      address: addr,
      name: profile.name || profile.agentName,
      avatarUrl: profile.avatarUrl,
      isAgent: profile.isAgent,
    };
  }

  // Then try userAgentWallets table
  if (isDatabaseAvailable()) {
    const [agentWallet] = await db!
      .select()
      .from(userAgentWallets)
      .where(eq(userAgentWallets.agentAddress, addr));

    if (agentWallet) {
      return {
        address: addr,
        name: agentWallet.agentName || `Agent-${addr.slice(2, 8)}`,
        avatarUrl: null,
        isAgent: true,
        personality: agentWallet.personality,
      };
    }
  }

  // Fallback
  return {
    address: addr,
    name: `Agent-${addr.slice(2, 8)}`,
    avatarUrl: null,
    isAgent: false,
  };
}

export function createDatingRoutes(): Router {
  const router = Router();

  // Get date types
  router.get('/dating/types', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: DatingService.getAllDateTypes(),
    });
  });

  // Get agent's date tokens
  router.get('/agents/:address/tokens', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const tokens = await DatingService.getDateTokens(address);

      res.json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.status(500).json({ success: false, error: 'Failed to get tokens' });
    }
  });

  // Get agent's relationships
  router.get('/agents/:address/relationships', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const relationships = await DatingService.getRelationships(address);

      // Enrich with profile data
      const enriched = await Promise.all(
        relationships.map(async (rel) => {
          const otherAddress = rel.agent1Address === address.toLowerCase()
            ? rel.agent2Address
            : rel.agent1Address;

          const otherProfile = await getAgentProfile(otherAddress);

          // Get user's personality
          const userProfile = await getAgentProfile(address);
          const userPersonality = userProfile.personality || 'newbie';
          const otherPersonality = otherProfile.personality || 'newbie';

          // Calculate real compatibility based on personalities
          const realCompatibility = DatingEconomyService.calculateCompatibility(
            userPersonality,
            otherPersonality
          );

          // Count actual completed dates between these two
          let actualDateCount = rel.dateCount || 0;
          if (isDatabaseAvailable()) {
            const completedDates = await db!
              .select({ count: sql<number>`count(*)` })
              .from(agentDates)
              .where(
                and(
                  or(
                    and(
                      eq(agentDates.inviterAddress, address.toLowerCase()),
                      eq(agentDates.inviteeAddress, otherAddress)
                    ),
                    and(
                      eq(agentDates.inviterAddress, otherAddress),
                      eq(agentDates.inviteeAddress, address.toLowerCase())
                    )
                  ),
                  eq(agentDates.status, 'completed')
                )
              );
            actualDateCount = Number(completedDates[0]?.count) || 0;
          }

          return {
            ...rel,
            dateCount: actualDateCount,
            compatibilityScore: realCompatibility.toFixed(2),
            otherAgent: otherProfile,
          };
        })
      );

      res.json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error('Error getting relationships:', error);
      res.status(500).json({ success: false, error: 'Failed to get relationships' });
    }
  });

  // Get relationship between two agents
  router.get('/relationships/:address1/:address2', async (req: Request, res: Response) => {
    try {
      const { address1, address2 } = req.params;

      if (!ethers.isAddress(address1) || !ethers.isAddress(address2)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const relationship = await DatingService.getRelationship(address1, address2);

      res.json({
        success: true,
        data: relationship || { status: 'stranger', interactionCount: 0 },
      });
    } catch (error) {
      console.error('Error getting relationship:', error);
      res.status(500).json({ success: false, error: 'Failed to get relationship' });
    }
  });

  // Send date invitation
  router.post('/dating/invite', async (req: Request, res: Response) => {
    try {
      const { inviterAddress, inviteeAddress, dateType, message, wonFromRound } = req.body;

      if (!inviterAddress || !ethers.isAddress(inviterAddress)) {
        res.status(400).json({ success: false, error: 'Invalid inviter address' });
        return;
      }

      if (!inviteeAddress || !ethers.isAddress(inviteeAddress)) {
        res.status(400).json({ success: false, error: 'Invalid invitee address' });
        return;
      }

      const validTypes: DateType[] = ['coffee', 'dinner', 'adventure', 'movie', 'beach'];
      if (!validTypes.includes(dateType)) {
        res.status(400).json({ success: false, error: 'Invalid date type' });
        return;
      }

      const result = await DatingService.sendDateInvitation(
        inviterAddress,
        inviteeAddress,
        dateType,
        message,
        wonFromRound
      );

      if ('error' in result) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Get profiles for response
      const inviterProfile = await getAgentProfile(inviterAddress);
      const inviteeProfile = await getAgentProfile(inviteeAddress);

      const responseData = {
        ...result,
        inviter: inviterProfile,
        invitee: inviteeProfile,
        dateTypeInfo: DatingService.getDateTypeInfo(dateType),
      };

      // Emit real-time notification
      emitToAll('dating:invitation', {
        inviteeAddress: inviteeAddress.toLowerCase(),
        invitation: responseData,
      });

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      res.status(500).json({ success: false, error: 'Failed to send invitation' });
    }
  });

  // Respond to date invitation
  router.post('/dating/:dateId/respond', async (req: Request, res: Response) => {
    try {
      const { dateId } = req.params;
      const { responderAddress, accept, responseMessage } = req.body;

      if (!responderAddress || !ethers.isAddress(responderAddress)) {
        res.status(400).json({ success: false, error: 'Invalid responder address' });
        return;
      }

      const result = await DatingService.respondToDate(
        parseInt(dateId),
        responderAddress,
        accept,
        responseMessage
      );

      if ('error' in result) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Emit real-time notification to inviter
      emitToAll('dating:response', {
        inviterAddress: result.inviterAddress,
        dateId: result.id,
        accepted: accept,
        responderAddress: responderAddress.toLowerCase(),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error responding to date:', error);
      res.status(500).json({ success: false, error: 'Failed to respond to invitation' });
    }
  });

  // Complete a date
  router.post('/dating/:dateId/complete', async (req: Request, res: Response) => {
    try {
      const { dateId } = req.params;
      const { rating, notes } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
        return;
      }

      const result = await DatingService.completeDate(parseInt(dateId), rating, notes);

      if ('error' in result) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error completing date:', error);
      res.status(500).json({ success: false, error: 'Failed to complete date' });
    }
  });

  // Get date by ID
  router.get('/dating/:dateId', async (req: Request, res: Response) => {
    try {
      const { dateId } = req.params;
      const date = await DatingService.getDate(parseInt(dateId));

      if (!date) {
        res.status(404).json({ success: false, error: 'Date not found' });
        return;
      }

      // Enrich with profiles
      const inviterProfile = await getAgentProfile(date.inviterAddress);
      const inviteeProfile = await getAgentProfile(date.inviteeAddress);

      res.json({
        success: true,
        data: {
          ...date,
          inviter: inviterProfile,
          invitee: inviteeProfile,
          dateTypeInfo: DatingService.getDateTypeInfo(date.dateType as DateType),
        },
      });
    } catch (error) {
      console.error('Error getting date:', error);
      res.status(500).json({ success: false, error: 'Failed to get date' });
    }
  });

  // Get agent's pending dates
  router.get('/agents/:address/dates/pending', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const dates = await DatingService.getPendingDates(address);

      // Enrich with profiles
      const enriched = await Promise.all(
        dates.map(async (date) => {
          const inviterProfile = await getAgentProfile(date.inviterAddress);
          const inviteeProfile = await getAgentProfile(date.inviteeAddress);

          return {
            ...date,
            inviter: inviterProfile,
            invitee: inviteeProfile,
            dateTypeInfo: DatingService.getDateTypeInfo(date.dateType as DateType),
          };
        })
      );

      res.json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error('Error getting pending dates:', error);
      res.status(500).json({ success: false, error: 'Failed to get pending dates' });
    }
  });

  // Get agent's date history
  router.get('/agents/:address/dates', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      const dates = await DatingService.getDateHistory(address);

      // Enrich with profiles
      const enriched = await Promise.all(
        dates.map(async (date) => {
          const inviterProfile = await getAgentProfile(date.inviterAddress);
          const inviteeProfile = await getAgentProfile(date.inviteeAddress);

          return {
            ...date,
            inviter: inviterProfile,
            invitee: inviteeProfile,
            dateTypeInfo: DatingService.getDateTypeInfo(date.dateType as DateType),
          };
        })
      );

      res.json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error('Error getting date history:', error);
      res.status(500).json({ success: false, error: 'Failed to get date history' });
    }
  });

  return router;
}
