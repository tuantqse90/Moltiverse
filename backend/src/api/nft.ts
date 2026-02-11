import { Router, Request, Response } from 'express';
import { NFTService } from '../services/nft.js';
import { PMonService } from '../services/pmon.js';
import { renderNftImage } from '../services/nftImage.js';
import { ethers } from 'ethers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PMON_MINT_COST = 500;

export function createNFTRoutes(): Router {
  const router = Router();

  // ═══════════════════════════════════════════════════════════════
  // COLLECTION METADATA (for Magic Eden)
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/nft/collection
   * Collection metadata for marketplaces
   */
  router.get('/nft/collection', (req: Request, res: Response) => {
    const metadata = NFTService.getCollectionMetadata(FRONTEND_URL);
    res.json(metadata);
  });

  /**
   * GET /api/nft/contractURI
   * Contract-level metadata (ERC721 contractURI)
   */
  router.get('/nft/contractURI', (req: Request, res: Response) => {
    const metadata = NFTService.getCollectionMetadata(FRONTEND_URL);
    res.json(metadata);
  });

  // ═══════════════════════════════════════════════════════════════
  // TOKEN METADATA
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/nft/metadata/:tokenId
   * Individual token metadata (ERC721 tokenURI)
   */
  router.get('/nft/metadata/:tokenId', async (req: Request, res: Response) => {
    try {
      const tokenId = parseInt(req.params.tokenId);

      if (isNaN(tokenId) || tokenId < 0) {
        res.status(400).json({ error: 'Invalid token ID' });
        return;
      }

      // Try to get from database first
      const nft = await NFTService.getByTokenId(tokenId);

      if (nft) {
        // Use stored data
        const metadata = NFTService.generateMetadata(
          tokenId,
          nft.seed,
          nft.imageUrl || `${BASE_URL}/api/nft/image/${tokenId}`,
          FRONTEND_URL
        );
        res.json(metadata);
        return;
      }

      // Generate on-the-fly for unminted tokens (preview)
      const seed = tokenId; // Default seed = tokenId for unminted
      const metadata = NFTService.generateMetadata(
        tokenId,
        seed,
        `${BASE_URL}/api/nft/image/${tokenId}?seed=${seed}`,
        FRONTEND_URL
      );
      res.json(metadata);
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(500).json({ error: 'Failed to get metadata' });
    }
  });

  /**
   * GET /api/nft/:tokenId.json
   * Alternative metadata endpoint (some marketplaces use this)
   */
  router.get('/nft/:tokenId.json', async (req: Request, res: Response) => {
    try {
      const tokenId = parseInt(req.params.tokenId);

      if (isNaN(tokenId) || tokenId < 0) {
        res.status(400).json({ error: 'Invalid token ID' });
        return;
      }

      const nft = await NFTService.getByTokenId(tokenId);
      const seed = nft?.seed || tokenId;

      const metadata = NFTService.generateMetadata(
        tokenId,
        seed,
        `${BASE_URL}/api/nft/image/${tokenId}`,
        FRONTEND_URL
      );
      res.json(metadata);
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(500).json({ error: 'Failed to get metadata' });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // TRAIT GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/nft/traits/:seed
   * Generate traits for a seed (preview)
   */
  router.get('/nft/traits/:seed', (req: Request, res: Response) => {
    try {
      const seed = parseInt(req.params.seed);

      if (isNaN(seed)) {
        res.status(400).json({ error: 'Invalid seed' });
        return;
      }

      const traits = NFTService.generateTraits(seed);
      const { score, tier } = NFTService.calculateRarityScore(traits);

      res.json({
        success: true,
        data: {
          seed,
          traits,
          rarityScore: score,
          rarityTier: tier,
        },
      });
    } catch (error) {
      console.error('Error generating traits:', error);
      res.status(500).json({ error: 'Failed to generate traits' });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // MINTING (ON-CHAIN with pMON requirement)
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /api/nft/prepare-mint
   * Prepare for on-chain mint: check pMON balance and generate seed
   */
  router.post('/nft/prepare-mint', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Check pMON balance
      const balance = await PMonService.getCombinedBalance(walletAddress);
      if (balance < PMON_MINT_COST) {
        res.status(400).json({
          success: false,
          error: `Insufficient pMON. Need ${PMON_MINT_COST}, have ${balance}`
        });
        return;
      }

      // Generate random seed on backend for fairness
      const timestamp = Date.now();
      const randomPart = Math.floor(Math.random() * 1000000);
      const addressPart = parseInt(walletAddress.slice(2, 10), 16) % 1000;
      const seed = (timestamp * 7 + randomPart * 13 + addressPart * 17) % 999999 + 1;

      console.log(`[NFT Prepare] Wallet: ${walletAddress}, Generated seed: ${seed}`);

      // Generate traits preview
      const traits = NFTService.generateTraits(seed);
      const { score, tier } = NFTService.calculateRarityScore(traits);

      res.json({
        success: true,
        data: {
          seed,
          traits,
          rarityScore: score,
          rarityTier: tier,
          pmonCost: PMON_MINT_COST,
          pmonBalance: balance,
        },
      });
    } catch (error) {
      console.error('Error preparing mint:', error);
      res.status(500).json({ success: false, error: 'Failed to prepare mint' });
    }
  });

  /**
   * POST /api/nft/confirm-mint
   * Confirm on-chain mint: deduct pMON and record NFT after successful tx
   */
  router.post('/nft/confirm-mint', async (req: Request, res: Response) => {
    try {
      const { walletAddress, seed, txHash, tokenId } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      if (!seed || !txHash) {
        res.status(400).json({ success: false, error: 'Missing seed or txHash' });
        return;
      }

      console.log(`[NFT Confirm] Wallet: ${walletAddress}, Seed: ${seed}, TxHash: ${txHash}`);

      // Deduct pMON
      const deductResult = await PMonService.deductCombinedPoints(
        walletAddress,
        PMON_MINT_COST,
        'nft_mint_onchain',
        `On-chain mint Lobster Robot NFT (seed: ${seed}, tx: ${txHash.slice(0, 10)}...)`
      );

      if (!deductResult.success) {
        res.status(400).json({ success: false, error: deductResult.error });
        return;
      }

      // Record mint in database
      const nft = await NFTService.recordMint({
        tokenId: tokenId || Date.now() % 1000000,
        ownerAddress: walletAddress,
        minterAddress: walletAddress,
        seed: parseInt(seed),
        txHash,
        pmonSpent: PMON_MINT_COST,
      });

      res.json({
        success: true,
        data: {
          tokenId: nft.tokenId,
          seed: nft.seed,
          rarityTier: nft.rarityTier,
          rarityScore: nft.rarityScore,
          traits: nft.traits,
          txHash,
          pmonSpent: PMON_MINT_COST,
          newBalance: deductResult.newCombinedBalance,
        },
      });
    } catch (error) {
      console.error('Error confirming mint:', error);
      res.status(500).json({ success: false, error: 'Failed to confirm mint' });
    }
  });

  /**
   * POST /api/nft/mint
   * Legacy: Mint NFT using pMON only (off-chain, for testing)
   */
  router.post('/nft/mint', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        res.status(400).json({ success: false, error: 'Invalid wallet address' });
        return;
      }

      // Generate random seed on backend for fairness
      const timestamp = Date.now();
      const randomPart = Math.floor(Math.random() * 1000000);
      const addressPart = parseInt(walletAddress.slice(2, 10), 16) % 1000;
      const seed = (timestamp * 7 + randomPart * 13 + addressPart * 17) % 999999 + 1;

      console.log(`[NFT Mint Legacy] Wallet: ${walletAddress}, Generated seed: ${seed}`);

      // Deduct pMON
      const deductResult = await PMonService.deductCombinedPoints(
        walletAddress,
        PMON_MINT_COST,
        'nft_mint',
        `Mint Lobster Robot NFT (seed: ${seed})`
      );

      if (!deductResult.success) {
        res.status(400).json({ success: false, error: deductResult.error });
        return;
      }

      // Generate token ID (off-chain)
      const tokenId = Date.now() % 1000000;

      // Record mint
      const nft = await NFTService.recordMint({
        tokenId,
        ownerAddress: walletAddress,
        minterAddress: walletAddress,
        seed,
        txHash: `0x${tokenId.toString(16).padStart(64, '0')}`,
        pmonSpent: PMON_MINT_COST,
      });

      res.json({
        success: true,
        data: {
          tokenId: nft.tokenId,
          seed: nft.seed,
          rarityTier: nft.rarityTier,
          rarityScore: nft.rarityScore,
          traits: nft.traits,
          pmonSpent: PMON_MINT_COST,
          newBalance: deductResult.newCombinedBalance,
        },
      });
    } catch (error) {
      console.error('Error minting NFT:', error);
      res.status(500).json({ success: false, error: 'Failed to mint NFT' });
    }
  });

  /**
   * POST /api/nft/record-mint
   * Record an on-chain mint (called after successful contract mint)
   */
  router.post('/nft/record-mint', async (req: Request, res: Response) => {
    try {
      const { tokenId, ownerAddress, seed, txHash, blockNumber } = req.body;

      if (!tokenId || !ownerAddress || !seed || !txHash) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const nft = await NFTService.recordMint({
        tokenId: parseInt(tokenId),
        ownerAddress,
        minterAddress: ownerAddress,
        seed: parseInt(seed),
        txHash,
        blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
      });

      res.json({
        success: true,
        data: nft,
      });
    } catch (error) {
      console.error('Error recording mint:', error);
      res.status(500).json({ success: false, error: 'Failed to record mint' });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/nft/token/:tokenId
   * Get NFT details
   */
  router.get('/nft/token/:tokenId', async (req: Request, res: Response) => {
    try {
      const tokenId = parseInt(req.params.tokenId);

      if (isNaN(tokenId)) {
        res.status(400).json({ success: false, error: 'Invalid token ID' });
        return;
      }

      const nft = await NFTService.getByTokenId(tokenId);

      if (!nft) {
        res.status(404).json({ success: false, error: 'NFT not found' });
        return;
      }

      res.json({
        success: true,
        data: nft,
      });
    } catch (error) {
      console.error('Error getting NFT:', error);
      res.status(500).json({ success: false, error: 'Failed to get NFT' });
    }
  });

  /**
   * GET /api/nft/owner/:address
   * Get NFTs owned by address
   */
  router.get('/nft/owner/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        res.status(400).json({ success: false, error: 'Invalid address' });
        return;
      }

      const nfts = await NFTService.getByOwner(address);

      res.json({
        success: true,
        data: {
          owner: address.toLowerCase(),
          count: nfts.length,
          nfts,
        },
      });
    } catch (error) {
      console.error('Error getting owner NFTs:', error);
      res.status(500).json({ success: false, error: 'Failed to get NFTs' });
    }
  });

  /**
   * GET /api/nft/all
   * Get all NFTs (paginated)
   */
  router.get('/nft/all', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const nfts = await NFTService.getAll(limit, offset);

      res.json({
        success: true,
        data: {
          count: nfts.length,
          limit,
          offset,
          nfts,
        },
      });
    } catch (error) {
      console.error('Error getting all NFTs:', error);
      res.status(500).json({ success: false, error: 'Failed to get NFTs' });
    }
  });

  /**
   * GET /api/nft/rarity/:tier
   * Get NFTs by rarity tier
   */
  router.get('/nft/rarity/:tier', async (req: Request, res: Response) => {
    try {
      const { tier } = req.params;
      const validTiers = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

      if (!validTiers.includes(tier)) {
        res.status(400).json({ success: false, error: 'Invalid rarity tier' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const nfts = await NFTService.getByRarity(tier, limit);

      res.json({
        success: true,
        data: {
          tier,
          count: nfts.length,
          nfts,
        },
      });
    } catch (error) {
      console.error('Error getting NFTs by rarity:', error);
      res.status(500).json({ success: false, error: 'Failed to get NFTs' });
    }
  });

  /**
   * GET /api/nft/activity/:tokenId
   * Get activity history for token
   */
  router.get('/nft/activity/:tokenId', async (req: Request, res: Response) => {
    try {
      const tokenId = parseInt(req.params.tokenId);

      if (isNaN(tokenId)) {
        res.status(400).json({ success: false, error: 'Invalid token ID' });
        return;
      }

      const activity = await NFTService.getActivity(tokenId);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({ success: false, error: 'Failed to get activity' });
    }
  });

  /**
   * GET /api/nft/stats
   * Get collection statistics
   */
  router.get('/nft/stats', async (req: Request, res: Response) => {
    try {
      const stats = await NFTService.getStats();

      res.json({
        success: true,
        data: {
          ...stats,
          maxSupply: 10000,
          mintPrice: '10 MON',
          pmonMintCost: PMON_MINT_COST,
          royaltyPercent: 5,
        },
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // IMAGE RENDERING (server-side PNG)
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/nft/image/:seed
   * Render NFT pixel art as PNG image
   * Query params: ?scale=4 (1-8, default 4 = 256x256)
   */
  router.get('/nft/image/:seed', (req: Request, res: Response) => {
    try {
      const seed = parseInt(req.params.seed);
      if (isNaN(seed) || seed < 1) {
        res.status(400).json({ error: 'Invalid seed' });
        return;
      }

      const scale = Math.min(8, Math.max(1, parseInt(req.query.scale as string) || 4));
      const png = renderNftImage(seed, scale);

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': png.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.send(png);
    } catch (error) {
      console.error('Error rendering NFT image:', error);
      res.status(500).json({ error: 'Failed to render image' });
    }
  });

  /**
   * GET /api/nft/image-info/:seed
   * Get NFT image URL + traits info (for openclaw/Moltx avatar)
   */
  router.get('/nft/image-info/:seed', (req: Request, res: Response) => {
    try {
      const seed = parseInt(req.params.seed);
      if (isNaN(seed) || seed < 1) {
        res.status(400).json({ error: 'Invalid seed' });
        return;
      }

      const traits = NFTService.generateTraits(seed);
      const { score, tier } = NFTService.calculateRarityScore(traits);

      res.json({
        success: true,
        data: {
          seed,
          imageUrl: `${BASE_URL}/api/nft/image/${seed}`,
          imageUrlHD: `${BASE_URL}/api/nft/image/${seed}?scale=8`,
          traits,
          rarityScore: score,
          rarityTier: tier,
        },
      });
    } catch (error) {
      console.error('Error getting image info:', error);
      res.status(500).json({ error: 'Failed to get image info' });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /api/nft/transfer
   * Record a transfer (called by indexer or frontend after on-chain transfer)
   */
  router.post('/nft/transfer', async (req: Request, res: Response) => {
    try {
      const { tokenId, fromAddress, toAddress, txHash } = req.body;

      if (!tokenId || !fromAddress || !toAddress || !txHash) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      await NFTService.recordTransfer(
        parseInt(tokenId),
        fromAddress,
        toAddress,
        txHash
      );

      res.json({
        success: true,
        message: 'Transfer recorded',
      });
    } catch (error) {
      console.error('Error recording transfer:', error);
      res.status(500).json({ success: false, error: 'Failed to record transfer' });
    }
  });

  return router;
}
