/**
 * Skill Files & Sharing API Routes
 * For markdown skill files with GitHub integration
 */

import { Router, Request, Response } from 'express';
import { SkillSharingService, SKILL_CATEGORIES, SkillCategory } from '../services/skillSharing.js';

const router = Router();

// ============================================
// SKILL FILES
// ============================================

/**
 * GET /skill-files - List all public skill files
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, limit } = req.query;
    const skills = await SkillSharingService.getPublicSkills(
      category as SkillCategory | undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, skills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /skill-files/categories - Get skill categories
 */
router.get('/categories', (req: Request, res: Response) => {
  res.json({ success: true, categories: SKILL_CATEGORIES });
});

/**
 * GET /skill-files/agent/:address - Get skills by agent
 * MUST be before /:skillId to avoid matching 'agent' as skillId
 */
router.get('/agent/:address', async (req: Request, res: Response) => {
  try {
    const skills = await SkillSharingService.getSkillsByOwner(req.params.address.toLowerCase());
    res.json({ success: true, skills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /skill-files/chat/date/:dateId - Get chat history for a date
 * MUST be before /:skillId to avoid matching 'chat' as skillId
 */
router.get('/chat/date/:dateId', async (req: Request, res: Response) => {
  try {
    const messages = await SkillSharingService.getDateChatHistory(parseInt(req.params.dateId));
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /skill-files/chat/:agent1/:agent2 - Get chat history between two agents
 * MUST be before /:skillId to avoid matching 'chat' as skillId
 */
router.get('/chat/:agent1/:agent2', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const messages = await SkillSharingService.getAgentChatHistory(
      req.params.agent1.toLowerCase(),
      req.params.agent2.toLowerCase(),
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /skill-files/discover/:address - Find agents with matching skills
 * MUST be before /:skillId to avoid matching 'discover' as skillId
 */
router.get('/discover/:address', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const agents = await SkillSharingService.findAgentsWithSkills(
      req.params.address.toLowerCase(),
      category as SkillCategory | undefined
    );
    res.json({ success: true, agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /skill-files/:skillId - Get skill by ID
 * This generic route MUST come after all specific routes
 */
router.get('/:skillId', async (req: Request, res: Response) => {
  try {
    const skill = await SkillSharingService.getSkillFile(req.params.skillId);
    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }
    res.json({ success: true, skill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /skill-files - Create a new skill file
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ownerAddress, name, content, category, description, githubUrl } = req.body;

    if (!ownerAddress || !name || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await SkillSharingService.createSkillFile(
      ownerAddress.toLowerCase(),
      name,
      content,
      category || 'general',
      description,
      githubUrl
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /skill-files/github - Create skill from GitHub URL
 */
router.post('/github', async (req: Request, res: Response) => {
  try {
    const { ownerAddress, githubUrl, category } = req.body;

    if (!ownerAddress || !githubUrl) {
      return res.status(400).json({ success: false, error: 'Missing ownerAddress or githubUrl' });
    }

    const result = await SkillSharingService.createSkillFromGitHub(
      ownerAddress.toLowerCase(),
      githubUrl,
      category || 'general'
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /skill-files/:skillId/sync - Sync skill from GitHub
 */
router.post('/:skillId/sync', async (req: Request, res: Response) => {
  try {
    const result = await SkillSharingService.syncSkillFromGitHub(req.params.skillId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SKILL SHARING
// ============================================

/**
 * POST /skill-files/share - Share a skill with another agent
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { dateId, sharerAddress, receiverAddress, skillFileId } = req.body;

    if (!sharerAddress || !receiverAddress || !skillFileId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await SkillSharingService.shareSkillDuringDate(
      dateId || 0,
      sharerAddress.toLowerCase(),
      receiverAddress.toLowerCase(),
      skillFileId
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /skill-files/share/:shareId/accept - Accept a shared skill
 */
router.post('/share/:shareId/accept', async (req: Request, res: Response) => {
  try {
    const result = await SkillSharingService.acceptSharedSkill(parseInt(req.params.shareId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
