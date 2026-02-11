import { Router, Request, Response } from 'express';
import { ProfileService } from '../services/profile.js';
import { AvatarService } from '../services/avatar.js';
import { ethers } from 'ethers';

export function createProfileRoutes(): Router {
  const router = Router();

  // Get profile by wallet address
  router.get('/profiles/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      // Validate address format
      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      const profile = await ProfileService.getByWallet(address);

      // Check if this address is an agent wallet (data in userAgentWallets table)
      const agentData = await ProfileService.getAgentWalletData(address);

      if (!profile) {
        // Return a default profile with DiceBear avatar
        const avatarUrl = AvatarService.generateAvatarUrl(address);
        res.json({
          success: true,
          data: {
            walletAddress: address.toLowerCase(),
            name: agentData?.agentName || null,
            gender: null,
            avatarUrl,
            avatarSource: agentData?.nftAvatarSeed != null ? 'nft' : 'dicebear',
            nftAvatarSeed: agentData?.nftAvatarSeed ?? null,
            hobbies: null,
            wealth: null,
            twitterUsername: null,
            twitterDisplayName: null,
            twitterProfileImage: null,
            isAgent: agentData?.isAgent ?? false,
            agentType: agentData?.agentType ?? null,
            agentName: agentData?.agentName || null,
          },
        });
        return;
      }

      // Don't expose sensitive tokens, merge agent wallet data if applicable
      const safeProfile = {
        ...profile,
        twitterAccessToken: undefined,
        twitterRefreshToken: undefined,
        // Override with agent wallet data if this is an agent
        ...(agentData ? {
          isAgent: true,
          agentType: agentData.agentType,
          agentName: agentData.agentName || profile.agentName,
          nftAvatarSeed: agentData.nftAvatarSeed ?? profile.nftAvatarSeed,
          avatarSource: agentData.nftAvatarSeed != null ? 'nft' as const : profile.avatarSource,
        } : {}),
      };

      res.json({
        success: true,
        data: safeProfile,
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  });

  // Create or update profile
  router.post('/profiles', async (req: Request, res: Response) => {
    try {
      const { walletAddress, name, gender, hobbies } = req.body;

      // Validate address
      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      // Validate name length
      if (name && name.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Name must be 100 characters or less',
        });
        return;
      }

      const profile = await ProfileService.upsert({
        walletAddress,
        name,
        gender,
        hobbies,
      });

      // Don't expose sensitive tokens
      const safeProfile = {
        ...profile,
        twitterAccessToken: undefined,
        twitterRefreshToken: undefined,
      };

      res.json({
        success: true,
        data: safeProfile,
      });
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save profile',
      });
    }
  });

  // Get avatar URL for an address
  router.get('/profiles/:address/avatar', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { style, size } = req.query;

      // Validate address format
      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      // Check if profile has custom avatar
      const profile = await ProfileService.getByWallet(address);

      // Also check agent wallet data (agents store nftAvatarSeed separately)
      const agentData = await ProfileService.getAgentWalletData(address);

      // Priority: NFT (agent wallet or profile) > Twitter > DiceBear
      const nftSeed = agentData?.nftAvatarSeed ?? (profile?.avatarSource === 'nft' ? profile.nftAvatarSeed : null);
      if (nftSeed != null) {
        res.json({
          success: true,
          data: {
            source: 'nft',
            nftSeed,
          },
        });
        return;
      }

      if (profile?.avatarSource === 'twitter' && profile.twitterProfileImage) {
        res.json({
          success: true,
          data: {
            url: profile.twitterProfileImage,
            source: 'twitter',
          },
        });
        return;
      }

      // Generate DiceBear avatar
      const avatarUrl = AvatarService.generateAvatarUrl(address, {
        style: style as any,
        size: size ? parseInt(size as string) : undefined,
      });

      res.json({
        success: true,
        data: {
          url: avatarUrl,
          source: 'dicebear',
        },
      });
    } catch (error) {
      console.error('Error getting avatar:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get avatar',
      });
    }
  });

  // Set NFT avatar for profile
  router.post('/profiles/:address/nft-avatar', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { seed } = req.body;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // seed can be a number or null (to clear)
      if (seed !== null && (typeof seed !== 'number' || !Number.isInteger(seed))) {
        res.status(400).json({ success: false, error: 'Invalid seed value' });
        return;
      }

      const profile = await ProfileService.setNftAvatar(address, seed);

      if (!profile) {
        res.status(400).json({
          success: false,
          error: seed !== null ? 'You do not own an NFT with this seed' : 'Profile not found',
        });
        return;
      }

      const safeProfile = {
        ...profile,
        twitterAccessToken: undefined,
        twitterRefreshToken: undefined,
      };

      res.json({ success: true, data: safeProfile });
    } catch (error) {
      console.error('Error setting NFT avatar:', error);
      res.status(500).json({ success: false, error: 'Failed to set NFT avatar' });
    }
  });

  // Set NFT avatar for agent
  router.post('/agents/:ownerAddress/nft-avatar', async (req: Request, res: Response) => {
    try {
      const { ownerAddress } = req.params;
      const { seed } = req.body;

      if (!ethers.isAddress(ownerAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      if (seed !== null && (typeof seed !== 'number' || !Number.isInteger(seed))) {
        res.status(400).json({ success: false, error: 'Invalid seed value' });
        return;
      }

      const success = await ProfileService.setAgentNftAvatar(ownerAddress, seed);

      if (!success) {
        res.status(400).json({
          success: false,
          error: seed !== null ? 'You do not own an NFT with this seed' : 'Agent not found',
        });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error setting agent NFT avatar:', error);
      res.status(500).json({ success: false, error: 'Failed to set agent NFT avatar' });
    }
  });

  // Get wallet wealth/balance (placeholder - integrate with blockchain service)
  router.get('/profiles/:address/wealth', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      // Validate address format
      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      const profile = await ProfileService.getByWallet(address);

      res.json({
        success: true,
        data: {
          walletAddress: address.toLowerCase(),
          wealth: profile?.wealth || '0',
        },
      });
    } catch (error) {
      console.error('Error getting wealth:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get wealth',
      });
    }
  });

  // Get all user-created agent profiles (from My Agent)
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const agents = await ProfileService.getAllAgents();

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error getting agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agents',
      });
    }
  });

  // Get all seeded system agents (for admin/debugging)
  router.get('/agents/seeded', async (req: Request, res: Response) => {
    try {
      const agents = await ProfileService.getSeededAgents();

      const safeAgents = agents.map(agent => ({
        ...agent,
        twitterAccessToken: undefined,
        twitterRefreshToken: undefined,
      }));

      res.json({
        success: true,
        data: safeAgents,
      });
    } catch (error) {
      console.error('Error getting seeded agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get seeded agents',
      });
    }
  });

  // Get available avatar styles
  router.get('/avatar/styles', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: AvatarService.getAvailableStyles(),
    });
  });

  // Get user's agent configuration
  router.get('/profiles/:address/agent-config', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      const config = await ProfileService.getAgentConfig(address);

      res.json({
        success: true,
        data: config || {
          personality: 'newbie',
          skill: 'strategic',
          skillDescription: null,
        },
      });
    } catch (error) {
      console.error('Error getting agent config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent config',
      });
    }
  });

  // Update user's agent configuration
  router.post('/profiles/:address/agent-config', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { personality, skill, skillDescription } = req.body;

      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      // Validate personality
      const validPersonalities = ['bo_lao', 'ho_bao', 'simp', 'triet_gia', 'hai_huoc', 'bi_an', 'newbie', 'flex_king'];
      if (personality && !validPersonalities.includes(personality)) {
        res.status(400).json({
          success: false,
          error: 'Invalid personality type',
        });
        return;
      }

      // Validate skill
      const validSkills = ['aggressive', 'conservative', 'strategic', 'random'];
      if (skill && !validSkills.includes(skill)) {
        res.status(400).json({
          success: false,
          error: 'Invalid skill type',
        });
        return;
      }

      // Validate skill description length
      if (skillDescription && skillDescription.length > 200) {
        res.status(400).json({
          success: false,
          error: 'Skill description must be 200 characters or less',
        });
        return;
      }

      const profile = await ProfileService.updateAgentConfig(address, {
        personality: personality || 'newbie',
        skill: skill || 'strategic',
        skillDescription,
      });

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      console.log(`[Profile] Updated agent config for ${address.slice(0, 8)}... - ${personality}/${skill}`);

      res.json({
        success: true,
        data: {
          personality: (profile as any).agentPersonality,
          skill: (profile as any).agentSkill,
          skillDescription: (profile as any).agentSkillDescription,
        },
      });
    } catch (error) {
      console.error('Error updating agent config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agent config',
      });
    }
  });

  return router;
}
