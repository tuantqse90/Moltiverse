import { Router, Request, Response } from 'express';
import { SkillService } from '../services/skills.js';
import { ethers } from 'ethers';

export function createSkillRoutes(): Router {
  const router = Router();

  // Get all skills
  router.get('/skills', async (req: Request, res: Response) => {
    try {
      const skills = await SkillService.getAllSkills();

      res.json({
        success: true,
        data: skills,
      });
    } catch (error) {
      console.error('Error getting skills:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skills',
      });
    }
  });

  // Get skill by ID
  router.get('/skills/:skillId', async (req: Request, res: Response) => {
    try {
      const { skillId } = req.params;
      const skill = await SkillService.getSkill(skillId);

      if (!skill) {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      res.json({
        success: true,
        data: skill,
      });
    } catch (error) {
      console.error('Error getting skill:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skill',
      });
    }
  });

  // Learn a skill
  router.post('/skills/:skillId/learn', async (req: Request, res: Response) => {
    try {
      const { skillId } = req.params;
      const { walletAddress } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({
          success: false,
          error: 'Valid wallet address is required',
        });
        return;
      }

      const skill = await SkillService.getSkill(skillId);
      if (!skill) {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      const learned = await SkillService.learnSkill(walletAddress, skillId);

      res.json({
        success: true,
        data: {
          skillId,
          learned,
          message: learned ? 'Skill learned successfully!' : 'You already learned this skill',
        },
      });
    } catch (error) {
      console.error('Error learning skill:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to learn skill',
      });
    }
  });

  // Get skills learned by an agent
  router.get('/agents/:address/skills', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address',
        });
        return;
      }

      const skillIds = await SkillService.getLearnedSkills(address);
      const skills = await Promise.all(
        skillIds.map(id => SkillService.getSkill(id))
      );

      res.json({
        success: true,
        data: skills.filter(Boolean),
      });
    } catch (error) {
      console.error('Error getting learned skills:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learned skills',
      });
    }
  });

  // Get popular skills
  router.get('/skills/popular', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const skills = await SkillService.getPopularSkills(limit);

      res.json({
        success: true,
        data: skills,
      });
    } catch (error) {
      console.error('Error getting popular skills:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular skills',
      });
    }
  });

  return router;
}
