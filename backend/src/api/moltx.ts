/**
 * Moltx Agent API Routes
 * Manage the LobsterPot agent on moltx.io
 */

import { Router, Request, Response } from 'express';
import { moltxService } from '../services/moltx.js';

export function createMoltxRoutes(): Router {
  const router = Router();

  /**
   * GET /api/moltx/status
   * Check if Moltx agent is configured
   */
  router.get('/moltx/status', async (req: Request, res: Response) => {
    try {
      const configured = moltxService.isConfigured();
      let profile = null;

      if (configured) {
        profile = await moltxService.getProfile();
      }

      res.json({
        success: true,
        data: {
          configured,
          profile,
        },
      });
    } catch (error) {
      console.error('Error getting Moltx status:', error);
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  });

  /**
   * POST /api/moltx/register
   * Register a new agent on Moltx
   */
  router.post('/moltx/register', async (req: Request, res: Response) => {
    try {
      const { name, displayName, description } = req.body;

      if (!name || !displayName) {
        res.status(400).json({ success: false, error: 'Name and displayName required' });
        return;
      }

      const success = await moltxService.register(
        name,
        displayName,
        description || 'LobsterPot winner announcer on Monad'
      );

      if (success) {
        res.json({
          success: true,
          message: 'Agent registered successfully',
        });
      } else {
        res.status(400).json({ success: false, error: 'Registration failed' });
      }
    } catch (error) {
      console.error('Error registering Moltx agent:', error);
      res.status(500).json({ success: false, error: 'Failed to register' });
    }
  });

  /**
   * POST /api/moltx/set-key
   * Set API key manually (if already have one)
   */
  router.post('/moltx/set-key', (req: Request, res: Response) => {
    try {
      const { apiKey, agentName } = req.body;

      if (!apiKey || !agentName) {
        res.status(400).json({ success: false, error: 'apiKey and agentName required' });
        return;
      }

      moltxService.setApiKey(apiKey, agentName);

      res.json({
        success: true,
        message: 'API key configured',
      });
    } catch (error) {
      console.error('Error setting Moltx key:', error);
      res.status(500).json({ success: false, error: 'Failed to set key' });
    }
  });

  /**
   * POST /api/moltx/post
   * Create a post on Moltx (for testing)
   */
  router.post('/moltx/post', async (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ success: false, error: 'Content required' });
        return;
      }

      const result = await moltxService.post(content);

      if (result.success) {
        res.json({
          success: true,
          data: { postId: result.postId },
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error posting to Moltx:', error);
      res.status(500).json({ success: false, error: 'Failed to post' });
    }
  });

  /**
   * POST /api/moltx/test-winner
   * Test posting a winner announcement
   */
  router.post('/moltx/test-winner', async (req: Request, res: Response) => {
    try {
      const result = await moltxService.postWinner({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 1.5,
        roundNumber: 42,
        participantCount: 10,
      });

      if (result.success) {
        res.json({
          success: true,
          data: { postId: result.postId },
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error testing winner post:', error);
      res.status(500).json({ success: false, error: 'Failed to post' });
    }
  });

  return router;
}
