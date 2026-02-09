import { Router, Request, Response } from 'express';
import { getTwitterOAuthService } from '../services/twitter-oauth.js';
import { ProfileService } from '../services/profile.js';
import { ethers } from 'ethers';

export function createAuthRoutes(): Router {
  const router = Router();

  // Start Twitter OAuth flow
  router.get('/auth/twitter', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      // Validate wallet address
      if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
        res.status(400).json({
          success: false,
          error: 'Valid wallet address is required',
        });
        return;
      }

      const twitterOAuth = getTwitterOAuthService();

      if (!twitterOAuth.isConfigured()) {
        res.status(503).json({
          success: false,
          error: 'Twitter OAuth is not configured',
        });
        return;
      }

      // Ensure profile exists
      await ProfileService.upsert({ walletAddress: wallet });

      // Generate auth URL
      const { url, state } = await twitterOAuth.generateAuthUrl(wallet);

      res.json({
        success: true,
        data: {
          authUrl: url,
          state,
        },
      });
    } catch (error) {
      console.error('Error starting Twitter OAuth:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start Twitter authentication',
      });
    }
  });

  // Twitter OAuth callback
  router.get('/auth/twitter/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send(`
          <html>
            <body>
              <h1>Authentication Failed</h1>
              <p>Missing authorization code or state</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      const twitterOAuth = getTwitterOAuthService();

      if (!twitterOAuth.isConfigured()) {
        res.status(503).send(`
          <html>
            <body>
              <h1>Authentication Failed</h1>
              <p>Twitter OAuth is not configured</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      // Exchange code for tokens and get user info
      const { tokens, user, walletAddress } = await twitterOAuth.handleCallback(code, state);

      // Link Twitter to profile
      await ProfileService.linkTwitter(walletAddress, {
        twitterId: user.id,
        twitterUsername: user.username,
        twitterDisplayName: user.displayName,
        twitterProfileImage: user.profileImageUrl,
        twitterAccessToken: tokens.accessToken,
        twitterRefreshToken: tokens.refreshToken,
      });

      // Return success page that communicates with opener
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.send(`
        <html>
          <head>
            <title>Twitter Connected</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 16px;
                backdrop-filter: blur(10px);
              }
              h1 { margin-bottom: 10px; }
              p { opacity: 0.9; }
              .avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                margin-bottom: 20px;
                border: 3px solid white;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${user.profileImageUrl}" alt="Avatar" class="avatar" />
              <h1>Connected!</h1>
              <p>Welcome, @${user.username}</p>
              <p>This window will close automatically...</p>
            </div>
            <script>
              // Notify opener window
              if (window.opener) {
                window.opener.postMessage({
                  type: 'TWITTER_AUTH_SUCCESS',
                  user: {
                    username: '${user.username}',
                    displayName: '${user.displayName.replace(/'/g, "\\'")}',
                    profileImageUrl: '${user.profileImageUrl}'
                  },
                  walletAddress: '${walletAddress}'
                }, '${frontendUrl}');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error handling Twitter callback:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 16px;
                backdrop-filter: blur(10px);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Authentication Failed</h1>
              <p>Something went wrong. Please try again.</p>
              <p>This window will close automatically...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'TWITTER_AUTH_ERROR',
                  error: 'Authentication failed'
                }, '*');
              }
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    }
  });

  // Disconnect Twitter from profile
  router.post('/auth/twitter/disconnect', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      // Validate wallet address
      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({
          success: false,
          error: 'Valid wallet address is required',
        });
        return;
      }

      const profile = await ProfileService.unlinkTwitter(walletAddress);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Twitter account disconnected',
          newAvatarUrl: profile.avatarUrl,
        },
      });
    } catch (error) {
      console.error('Error disconnecting Twitter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect Twitter account',
      });
    }
  });

  // Check Twitter OAuth status
  router.get('/auth/twitter/status', (req: Request, res: Response) => {
    const twitterOAuth = getTwitterOAuthService();

    res.json({
      success: true,
      data: {
        configured: twitterOAuth.isConfigured(),
      },
    });
  });

  return router;
}
