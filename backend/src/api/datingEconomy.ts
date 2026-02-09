import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { DatingEconomyService, DATE_TYPES, VENUES, GIFTS, RELATIONSHIP_LEVELS, COMPATIBILITY_MATRIX } from '../services/datingEconomy.js';
import { AutoDatingService } from '../services/autoDating.js';

export function createDatingEconomyRoutes(): Router {
  const router = Router();

  // ============================================
  // CONFIG ENDPOINTS
  // ============================================

  // Get all date types
  router.get('/dating-economy/config/date-types', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: DATE_TYPES,
    });
  });

  // Get all venues
  router.get('/dating-economy/config/venues', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: VENUES,
    });
  });

  // Get all gifts
  router.get('/dating-economy/config/gifts', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: GIFTS,
    });
  });

  // Get relationship levels
  router.get('/dating-economy/config/relationship-levels', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: RELATIONSHIP_LEVELS,
    });
  });

  // Get compatibility matrix
  router.get('/dating-economy/config/compatibility', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: COMPATIBILITY_MATRIX,
    });
  });

  // ============================================
  // AGENT STATS
  // ============================================

  // Get agent's dating stats
  router.get('/dating-economy/agents/:address/stats', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const stats = await DatingEconomyService.getAgentDatingStats(address);

      if (!stats) {
        res.json({
          success: true,
          data: {
            loveTokens: 0,
            charmPoints: 0,
            heartShards: 0,
            totalDates: 0,
            successfulDates: 0,
            averageRating: '0',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting agent dating stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  // ============================================
  // DATE INVITATIONS
  // ============================================

  // Create date invitation
  router.post('/dating-economy/dates/invite', async (req: Request, res: Response) => {
    try {
      const { inviterAddress, inviteeAddress, dateType, venue, message, giftType } = req.body;

      if (!ethers.isAddress(inviterAddress) || !ethers.isAddress(inviteeAddress)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      if (inviterAddress.toLowerCase() === inviteeAddress.toLowerCase()) {
        res.status(400).json({ success: false, error: 'Cannot invite yourself' });
        return;
      }

      if (!DATE_TYPES[dateType as keyof typeof DATE_TYPES]) {
        res.status(400).json({ success: false, error: 'Invalid date type' });
        return;
      }

      const result = await DatingEconomyService.createDateInvitation(
        inviterAddress,
        inviteeAddress,
        dateType,
        venue || 'cafe_monad',
        message,
        giftType
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: result.date,
      });
    } catch (error) {
      console.error('Error creating date invitation:', error);
      res.status(500).json({ success: false, error: 'Failed to create invitation' });
    }
  });

  // Respond to date invitation
  router.post('/dating-economy/dates/:dateId/respond', async (req: Request, res: Response) => {
    try {
      const { dateId } = req.params;
      const { accept, message } = req.body;

      const result = await DatingEconomyService.respondToInvitation(
        parseInt(dateId),
        accept === true,
        message
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error responding to invitation:', error);
      res.status(500).json({ success: false, error: 'Failed to respond' });
    }
  });

  // Complete a date with ratings
  router.post('/dating-economy/dates/:dateId/complete', async (req: Request, res: Response) => {
    try {
      const { dateId } = req.params;
      const { inviterRating, inviteeRating } = req.body;

      if (typeof inviterRating !== 'number' || typeof inviteeRating !== 'number') {
        res.status(400).json({ success: false, error: 'Ratings must be numbers' });
        return;
      }

      if (inviterRating < 1 || inviterRating > 5 || inviteeRating < 1 || inviteeRating > 5) {
        res.status(400).json({ success: false, error: 'Ratings must be between 1 and 5' });
        return;
      }

      const result = await DatingEconomyService.completeDate(
        parseInt(dateId),
        inviterRating,
        inviteeRating
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: result.rewards,
      });
    } catch (error) {
      console.error('Error completing date:', error);
      res.status(500).json({ success: false, error: 'Failed to complete date' });
    }
  });

  // ============================================
  // COMPATIBILITY
  // ============================================

  // Get compatibility between two agents
  router.get('/dating-economy/compatibility', async (req: Request, res: Response) => {
    try {
      const { agent1, agent2 } = req.query;

      if (!agent1 || !agent2) {
        res.status(400).json({ success: false, error: 'Both agent addresses required' });
        return;
      }

      const stats1 = await DatingEconomyService.getAgentDatingStats(agent1 as string);
      const stats2 = await DatingEconomyService.getAgentDatingStats(agent2 as string);

      const compatibility = DatingEconomyService.calculateCompatibility(
        stats1?.personality || 'newbie',
        stats2?.personality || 'newbie'
      );

      res.json({
        success: true,
        data: {
          agent1: agent1,
          agent2: agent2,
          personality1: stats1?.personality || 'newbie',
          personality2: stats2?.personality || 'newbie',
          compatibility,
        },
      });
    } catch (error) {
      console.error('Error calculating compatibility:', error);
      res.status(500).json({ success: false, error: 'Failed to calculate compatibility' });
    }
  });

  // ============================================
  // AUTO DATING (AI-Powered)
  // ============================================

  // Trigger auto-dating for an agent (find match, send invite, etc.)
  router.post('/dating-economy/auto-date/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const result = await AutoDatingService.tryAutoDate(address);

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      console.error('Error in auto-date:', error);
      res.status(500).json({ success: false, error: 'Failed to auto-date' });
    }
  });

  // Process pending invitations for an agent (auto accept/reject based on AI)
  router.post('/dating-economy/auto-respond/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const result = await AutoDatingService.processInvitations(address);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in auto-respond:', error);
      res.status(500).json({ success: false, error: 'Failed to auto-respond' });
    }
  });

  // Auto-complete accepted dates
  router.post('/dating-economy/auto-complete/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const result = await AutoDatingService.completeAcceptedDates(address);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in auto-complete:', error);
      res.status(500).json({ success: false, error: 'Failed to auto-complete' });
    }
  });

  // Run full auto-dating cycle for an agent
  router.post('/dating-economy/auto-cycle/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const result = await AutoDatingService.runFullCycle(address);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in auto-cycle:', error);
      res.status(500).json({ success: false, error: 'Failed to run auto-cycle' });
    }
  });

  // Get available agents for dating
  router.get('/dating-economy/available-agents', async (req: Request, res: Response) => {
    try {
      const { excludeAddress } = req.query;

      const agents = await AutoDatingService.getAvailableAgents(excludeAddress as string);

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error getting available agents:', error);
      res.status(500).json({ success: false, error: 'Failed to get available agents' });
    }
  });

  return router;
}
