import { db as _db } from '../db/index.js';

const db = _db!;
import { nftCollection, nftActivity } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// TRAIT DEFINITIONS (Must match frontend)
// ═══════════════════════════════════════════════════════════════

const SHELL_COLORS = [
  { name: 'Classic Red', rarity: 'common' },
  { name: 'Sunset Orange', rarity: 'common' },
  { name: 'Cyber Blue', rarity: 'uncommon' },
  { name: 'Toxic Green', rarity: 'uncommon' },
  { name: 'Royal Purple', rarity: 'rare' },
  { name: 'Bubblegum Pink', rarity: 'rare' },
  { name: 'Golden', rarity: 'epic' },
  { name: 'Shadow Chrome', rarity: 'epic' },
  { name: 'Holographic', rarity: 'legendary' },
  { name: 'Cosmic Void', rarity: 'legendary' },
];

const HEAD_SHAPES = [
  { name: 'Round Bot', rarity: 'common' },
  { name: 'Angular Mecha', rarity: 'common' },
  { name: 'Bubble Dome', rarity: 'uncommon' },
  { name: 'Skull Face', rarity: 'rare' },
  { name: 'Hammerhead', rarity: 'uncommon' },
  { name: 'Flat Top', rarity: 'common' },
  { name: 'Spike Head', rarity: 'rare' },
  { name: 'UFO Head', rarity: 'epic' },
];

const EYES = [
  { name: 'Normal', rarity: 'common' },
  { name: 'Angry', rarity: 'common' },
  { name: 'Derp', rarity: 'uncommon' },
  { name: 'Cyclops', rarity: 'rare' },
  { name: 'Heart Eyes', rarity: 'rare' },
  { name: 'X_X Dead', rarity: 'uncommon' },
  { name: 'Laser', rarity: 'epic' },
  { name: 'Anime Sparkle', rarity: 'epic' },
  { name: 'Bitcoin', rarity: 'legendary' },
  { name: 'Hypno Spiral', rarity: 'legendary' },
];

const MOUTHS = [
  { name: 'Grin', rarity: 'common' },
  { name: 'Teeth', rarity: 'common' },
  { name: 'Tongue Out', rarity: 'uncommon' },
  { name: 'Moustache', rarity: 'rare' },
  { name: 'Cigar', rarity: 'rare' },
  { name: 'Frown', rarity: 'uncommon' },
  { name: 'Blep', rarity: 'common' },
  { name: 'Scream', rarity: 'epic' },
];

const CLAWS = [
  { name: 'Classic Pincers', rarity: 'common' },
  { name: 'Tiny Arms', rarity: 'common' },
  { name: 'Mech Gauntlets', rarity: 'uncommon' },
  { name: 'Hammer Fists', rarity: 'rare' },
  { name: 'Laser Pincers', rarity: 'rare' },
  { name: 'Peace Signs', rarity: 'uncommon' },
  { name: 'Diamond Claws', rarity: 'epic' },
  { name: 'Chainsaw', rarity: 'legendary' },
];

const BODIES = [
  { name: 'Standard', rarity: 'common' },
  { name: 'Buff', rarity: 'uncommon' },
  { name: 'Slim', rarity: 'common' },
  { name: 'Tank Armor', rarity: 'rare' },
  { name: 'Mech Suit', rarity: 'epic' },
  { name: 'Noodle', rarity: 'uncommon' },
  { name: 'Crystal', rarity: 'rare' },
  { name: 'HODL Chest', rarity: 'legendary' },
];

const LEGS = [
  { name: 'Rocket Boosters', rarity: 'common' },
  { name: 'Twin Thrusters', rarity: 'common' },
  { name: 'Jet Flames', rarity: 'uncommon' },
  { name: 'Plasma Engines', rarity: 'uncommon' },
  { name: 'Nuclear Propulsion', rarity: 'rare' },
  { name: 'Ion Drives', rarity: 'rare' },
  { name: 'Quantum Thrusters', rarity: 'epic' },
  { name: 'Anti-Gravity', rarity: 'epic' },
  { name: 'Warp Drive', rarity: 'legendary' },
  { name: 'Monad Rockets', rarity: 'legendary' },
];

const HATS = [
  { name: 'None', rarity: 'common' },
  { name: 'Top Hat', rarity: 'uncommon' },
  { name: 'Beanie', rarity: 'common' },
  { name: 'Crown', rarity: 'epic' },
  { name: 'Propeller', rarity: 'uncommon' },
  { name: 'Chef Hat', rarity: 'uncommon' },
  { name: 'Devil Horns', rarity: 'rare' },
  { name: 'Halo', rarity: 'rare' },
  { name: 'Antenna', rarity: 'common' },
  { name: 'Doge Crown', rarity: 'legendary' },
];

const ACCESSORIES = [
  { name: 'None', rarity: 'common' },
  { name: 'Headphones', rarity: 'common' },
  { name: 'Sunglasses', rarity: 'common' },
  { name: 'VR Headset', rarity: 'rare' },
  { name: 'Monocle', rarity: 'uncommon' },
  { name: 'Deal With It', rarity: 'epic' },
  { name: 'Earring', rarity: 'uncommon' },
  { name: 'Scar', rarity: 'rare' },
];

const BACKGROUNDS = [
  { name: 'Sky Blue', rarity: 'common' },
  { name: 'Sunset', rarity: 'common' },
  { name: 'Neon Pink', rarity: 'uncommon' },
  { name: 'Mint', rarity: 'uncommon' },
  { name: 'Lavender', rarity: 'common' },
  { name: 'Cream', rarity: 'common' },
  { name: 'Dark Space', rarity: 'rare' },
  { name: 'Deep Ocean', rarity: 'rare' },
];

// ═══════════════════════════════════════════════════════════════
// SEEDED RANDOM (Must match frontend)
// ═══════════════════════════════════════════════════════════════

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)];
  }
}

// ═══════════════════════════════════════════════════════════════
// TRAIT GENERATION
// ═══════════════════════════════════════════════════════════════

export interface NFTTraits {
  shellColor: { name: string; rarity: string };
  headShape: { name: string; rarity: string };
  eyes: { name: string; rarity: string };
  mouth: { name: string; rarity: string };
  claws: { name: string; rarity: string };
  body: { name: string; rarity: string };
  legs: { name: string; rarity: string };
  hat: { name: string; rarity: string };
  accessory: { name: string; rarity: string };
  background: { name: string; rarity: string };
}

export function generateTraits(seed: number): NFTTraits {
  const rng = new SeededRandom(seed);
  return {
    shellColor: rng.pick(SHELL_COLORS),
    headShape: rng.pick(HEAD_SHAPES),
    eyes: rng.pick(EYES),
    mouth: rng.pick(MOUTHS),
    claws: rng.pick(CLAWS),
    body: rng.pick(BODIES),
    legs: rng.pick(LEGS),
    hat: rng.pick(HATS),
    accessory: rng.pick(ACCESSORIES),
    background: rng.pick(BACKGROUNDS),
  };
}

export function calculateRarityScore(traits: NFTTraits): { score: number; tier: string } {
  const rarityMap: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
  };

  const traitList = [
    traits.shellColor,
    traits.headShape,
    traits.eyes,
    traits.mouth,
    traits.claws,
    traits.body,
    traits.legs,
    traits.hat,
    traits.accessory,
    traits.background,
  ];

  const score = traitList.reduce((s, t) => s + (rarityMap[t.rarity] || 1), 0);

  // 10 traits: min 10 (all common), max 50 (all legendary)
  let tier = 'Common';
  if (score >= 40) tier = 'Legendary';
  else if (score >= 32) tier = 'Epic';
  else if (score >= 24) tier = 'Rare';
  else if (score >= 16) tier = 'Uncommon';

  return { score, tier };
}

// ═══════════════════════════════════════════════════════════════
// METADATA GENERATION (Magic Eden Standard)
// ═══════════════════════════════════════════════════════════════

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    rarity?: string;
  }>;
  properties: {
    files: Array<{ uri: string; type: string }>;
    category: string;
    creators: Array<{ address: string; share: number }>;
  };
  seller_fee_basis_points: number;
  symbol: string;
  collection: {
    name: string;
    family: string;
  };
}

export function generateMetadata(
  tokenId: number,
  seed: number,
  imageUrl: string,
  baseUrl: string
): NFTMetadata {
  const traits = generateTraits(seed);
  const { score, tier } = calculateRarityScore(traits);

  return {
    name: `Lobster Robot #${tokenId}`,
    description: `A unique pixel-art Lobster Robot from the LobsterPot collection on Monad. This ${tier} robot escaped from the pot and is ready for adventure! Rarity Score: ${score}/50`,
    image: imageUrl,
    external_url: `${baseUrl}/nft/${tokenId}`,
    attributes: [
      { trait_type: 'Shell Color', value: traits.shellColor.name, rarity: traits.shellColor.rarity },
      { trait_type: 'Head Shape', value: traits.headShape.name, rarity: traits.headShape.rarity },
      { trait_type: 'Eyes', value: traits.eyes.name, rarity: traits.eyes.rarity },
      { trait_type: 'Mouth', value: traits.mouth.name, rarity: traits.mouth.rarity },
      { trait_type: 'Claws', value: traits.claws.name, rarity: traits.claws.rarity },
      { trait_type: 'Body', value: traits.body.name, rarity: traits.body.rarity },
      { trait_type: 'Legs', value: traits.legs.name, rarity: traits.legs.rarity },
      { trait_type: 'Hat', value: traits.hat.name, rarity: traits.hat.rarity },
      { trait_type: 'Accessory', value: traits.accessory.name, rarity: traits.accessory.rarity },
      { trait_type: 'Background', value: traits.background.name, rarity: traits.background.rarity },
      { trait_type: 'Rarity Score', value: score.toString() },
      { trait_type: 'Rarity Tier', value: tier },
    ],
    properties: {
      files: [{ uri: imageUrl, type: 'image/png' }],
      category: 'image',
      creators: [
        { address: '0x0000000000000000000000000000000000000000', share: 100 }, // Update with actual creator
      ],
    },
    seller_fee_basis_points: 500, // 5% royalty
    symbol: 'LBSTR',
    collection: {
      name: 'Lobster Robot',
      family: 'LobsterPot',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// COLLECTION METADATA (Magic Eden Standard)
// ═══════════════════════════════════════════════════════════════

export function getCollectionMetadata(baseUrl: string) {
  return {
    name: 'Lobster Robot',
    symbol: 'LBSTR',
    description:
      'Lobster Robots are 10,000 unique pixel-art NFTs living on the Monad blockchain. Each robot escaped from the LobsterPot lottery and carries unique traits determined by their escape seed. Collect, trade, and show off your robot!',
    image: `${baseUrl}/nft/collection.png`,
    external_url: 'https://lobsterpot.io',
    seller_fee_basis_points: 500, // 5% royalty
    fee_recipient: '0x0000000000000000000000000000000000000000', // Update with actual address
    // Magic Eden specific
    primary_sale_happened: true,
    is_mutable: false,
    // Social links
    twitter: 'https://twitter.com/lobsterpot',
    discord: 'https://discord.gg/lobsterpot',
    website: 'https://lobsterpot.io',
  };
}

// ═══════════════════════════════════════════════════════════════
// NFT SERVICE
// ═══════════════════════════════════════════════════════════════

export const NFTService = {
  /**
   * Record a new mint
   */
  async recordMint(data: {
    tokenId: number;
    ownerAddress: string;
    minterAddress: string;
    seed: number;
    txHash: string;
    blockNumber?: number;
    pmonSpent?: number;
  }) {
    const traits = generateTraits(data.seed);
    const { score, tier } = calculateRarityScore(traits);

    const [nft] = await db
      .insert(nftCollection)
      .values({
        tokenId: data.tokenId,
        ownerAddress: data.ownerAddress.toLowerCase(),
        minterAddress: data.minterAddress.toLowerCase(),
        seed: data.seed,
        traits,
        rarityScore: score,
        rarityTier: tier,
        name: `Lobster Robot #${data.tokenId}`,
        description: `A unique ${tier} Lobster Robot from LobsterPot`,
        txHash: data.txHash,
        blockNumber: data.blockNumber,
        mintedAt: new Date(),
        pmonSpent: data.pmonSpent || 0,
      })
      .returning();

    // Log activity
    await db.insert(nftActivity).values({
      tokenId: data.tokenId,
      activityType: 'mint',
      toAddress: data.ownerAddress.toLowerCase(),
      txHash: data.txHash,
    });

    return nft;
  },

  /**
   * Get NFT by token ID
   */
  async getByTokenId(tokenId: number) {
    const [nft] = await db
      .select()
      .from(nftCollection)
      .where(eq(nftCollection.tokenId, tokenId));
    return nft;
  },

  /**
   * Get NFTs by owner
   */
  async getByOwner(ownerAddress: string) {
    return db
      .select()
      .from(nftCollection)
      .where(eq(nftCollection.ownerAddress, ownerAddress.toLowerCase()))
      .orderBy(desc(nftCollection.tokenId));
  },

  /**
   * Get all NFTs (paginated)
   */
  async getAll(limit = 100, offset = 0) {
    return db
      .select()
      .from(nftCollection)
      .orderBy(desc(nftCollection.tokenId))
      .limit(limit)
      .offset(offset);
  },

  /**
   * Get NFTs by rarity tier
   */
  async getByRarity(tier: string, limit = 50) {
    return db
      .select()
      .from(nftCollection)
      .where(eq(nftCollection.rarityTier, tier))
      .orderBy(desc(nftCollection.rarityScore))
      .limit(limit);
  },

  /**
   * Record transfer
   */
  async recordTransfer(
    tokenId: number,
    fromAddress: string,
    toAddress: string,
    txHash: string
  ) {
    // Update owner
    await db
      .update(nftCollection)
      .set({
        ownerAddress: toAddress.toLowerCase(),
        transferCount: 1, // This should be incremented, simplified here
        lastTransferAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nftCollection.tokenId, tokenId));

    // Log activity
    await db.insert(nftActivity).values({
      tokenId,
      activityType: 'transfer',
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      txHash,
    });
  },

  /**
   * Get activity for token
   */
  async getActivity(tokenId: number, limit = 50) {
    return db
      .select()
      .from(nftActivity)
      .where(eq(nftActivity.tokenId, tokenId))
      .orderBy(desc(nftActivity.createdAt))
      .limit(limit);
  },

  /**
   * Get collection stats
   */
  async getStats() {
    const allNfts = await db.select().from(nftCollection);

    const stats = {
      totalMinted: allNfts.length,
      uniqueOwners: new Set(allNfts.map((n) => n.ownerAddress)).size,
      rarityDistribution: {
        Common: 0,
        Uncommon: 0,
        Rare: 0,
        Epic: 0,
        Legendary: 0,
      } as Record<string, number>,
      totalPmonSpent: 0,
    };

    for (const nft of allNfts) {
      if (nft.rarityTier) {
        stats.rarityDistribution[nft.rarityTier] =
          (stats.rarityDistribution[nft.rarityTier] || 0) + 1;
      }
      stats.totalPmonSpent += nft.pmonSpent || 0;
    }

    return stats;
  },

  /**
   * Generate traits for seed
   */
  generateTraits,

  /**
   * Calculate rarity
   */
  calculateRarityScore,

  /**
   * Generate metadata
   */
  generateMetadata,

  /**
   * Get collection metadata
   */
  getCollectionMetadata,
};
