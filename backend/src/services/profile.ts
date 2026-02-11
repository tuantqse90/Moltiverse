import { eq, and } from 'drizzle-orm';
import { db, profiles, userAgentWallets, nftCollection, telegramWallets, isDatabaseAvailable, type Profile, type NewProfile } from '../db/index.js';
import { AvatarService } from './avatar.js';

export interface ProfileInput {
  walletAddress: string;
  name?: string;
  gender?: string;
  hobbies?: string;
  isAgent?: boolean;
  agentName?: string;
}

export interface ProfileUpdateInput {
  name?: string;
  gender?: string;
  hobbies?: string;
  avatarUrl?: string;
  avatarSource?: 'dicebear' | 'twitter' | 'nft';
  nftAvatarSeed?: number | null;
}

export interface AgentConfigInput {
  personality: string;
  skill: string;
  skillDescription?: string;
}

export interface TwitterProfileData {
  twitterId: string;
  twitterUsername: string;
  twitterDisplayName: string;
  twitterProfileImage: string;
  twitterAccessToken: string;
  twitterRefreshToken?: string;
}

// Agent names for seeding
const AGENT_NAMES = [
  'LobsterBot',
  'CrabMaster',
  'ShellGuard',
  'TideWatcher',
  'DeepDiver',
  'WaveRider',
  'CoralKeeper',
  'SeaHunter',
  'AquaTrader',
  'ReefRunner'
];

// In-memory cache for when database is not available
const profileCache = new Map<string, Profile>();

export class ProfileService {
  /**
   * Get profile by wallet address
   */
  static async getByWallet(walletAddress: string): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return profileCache.get(normalizedAddress) || null;
    }

    const result = await db!
      .select()
      .from(profiles)
      .where(eq(profiles.walletAddress, normalizedAddress))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get agent wallet data if this address is an agent wallet
   */
  static async getAgentWalletData(agentAddress: string): Promise<{
    isAgent: boolean;
    agentType: 'agent' | 'openclaw-agent';
    agentName: string | null;
    nftAvatarSeed: number | null;
    ownerAddress: string;
  } | null> {
    if (!isDatabaseAvailable()) return null;

    const addr = agentAddress.toLowerCase();

    // Check web agent wallets first
    const result = await db!
      .select()
      .from(userAgentWallets)
      .where(eq(userAgentWallets.agentAddress, addr))
      .limit(1);

    if (result.length > 0) {
      const agent = result[0];
      return {
        isAgent: true,
        agentType: 'agent',
        agentName: agent.agentName || `Agent-${agentAddress.slice(0, 6)}`,
        nftAvatarSeed: agent.nftAvatarSeed ?? null,
        ownerAddress: agent.ownerAddress,
      };
    }

    // Check Telegram wallets with auto-play enabled
    const tgResult = await db!
      .select()
      .from(telegramWallets)
      .where(and(
        eq(telegramWallets.walletAddress, addr),
        eq(telegramWallets.isAutoPlay, true),
      ))
      .limit(1);

    if (tgResult.length > 0) {
      const tgWallet = tgResult[0];
      return {
        isAgent: true,
        agentType: 'openclaw-agent',
        agentName: tgWallet.displayName || tgWallet.telegramUsername || `TG-${tgWallet.telegramUserId}`,
        nftAvatarSeed: tgWallet.nftAvatarSeed ?? null,
        ownerAddress: addr,
      };
    }

    return null;
  }

  /**
   * Create or update a profile
   */
  static async upsert(input: ProfileInput): Promise<Profile> {
    const normalizedAddress = input.walletAddress.toLowerCase();
    const avatarUrl = AvatarService.generateAvatarUrl(normalizedAddress);

    if (!isDatabaseAvailable()) {
      // Use in-memory cache
      const existing = profileCache.get(normalizedAddress);
      const profile: Profile = {
        id: existing?.id || Date.now(),
        walletAddress: normalizedAddress,
        name: input.name || existing?.name || null,
        gender: input.gender || existing?.gender || null,
        avatarUrl: existing?.avatarUrl || avatarUrl,
        avatarSource: existing?.avatarSource || 'dicebear',
        nftAvatarSeed: existing?.nftAvatarSeed || null,
        hobbies: input.hobbies || existing?.hobbies || null,
        wealth: existing?.wealth || null,
        twitterId: existing?.twitterId || null,
        twitterUsername: existing?.twitterUsername || null,
        twitterDisplayName: existing?.twitterDisplayName || null,
        twitterProfileImage: existing?.twitterProfileImage || null,
        twitterAccessToken: existing?.twitterAccessToken || null,
        twitterRefreshToken: existing?.twitterRefreshToken || null,
        isAgent: input.isAgent ?? existing?.isAgent ?? false,
        agentName: input.agentName || existing?.agentName || null,
        agentPersonality: existing?.agentPersonality || 'newbie',
        agentSkill: existing?.agentSkill || 'strategic',
        agentSkillDescription: existing?.agentSkillDescription || null,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      profileCache.set(normalizedAddress, profile);
      return profile;
    }

    const existing = await this.getByWallet(normalizedAddress);

    if (existing) {
      // Update existing profile
      await db!
        .update(profiles)
        .set({
          name: input.name ?? existing.name,
          gender: input.gender ?? existing.gender,
          hobbies: input.hobbies ?? existing.hobbies,
          isAgent: input.isAgent ?? existing.isAgent,
          agentName: input.agentName ?? existing.agentName,
          updatedAt: new Date(),
        })
        .where(eq(profiles.walletAddress, normalizedAddress));

      return (await this.getByWallet(normalizedAddress))!;
    }

    // Create new profile
    const result = await db!
      .insert(profiles)
      .values({
        walletAddress: normalizedAddress,
        name: input.name,
        gender: input.gender,
        hobbies: input.hobbies,
        avatarUrl,
        avatarSource: 'dicebear',
        isAgent: input.isAgent ?? false,
        agentName: input.agentName,
      })
      .returning();

    return result[0];
  }

  /**
   * Update profile fields
   */
  static async update(walletAddress: string, input: ProfileUpdateInput): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = {
        ...existing,
        ...input,
        updatedAt: new Date(),
      };
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Link Twitter account to profile
   */
  static async linkTwitter(walletAddress: string, twitterData: TwitterProfileData): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = {
        ...existing,
        ...twitterData,
        avatarUrl: twitterData.twitterProfileImage,
        avatarSource: 'twitter',
        updatedAt: new Date(),
      };
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set({
        ...twitterData,
        avatarUrl: twitterData.twitterProfileImage,
        avatarSource: 'twitter',
        updatedAt: new Date(),
      })
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Unlink Twitter account from profile
   */
  static async unlinkTwitter(walletAddress: string): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();
    const avatarUrl = AvatarService.generateAvatarUrl(normalizedAddress);

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = {
        ...existing,
        twitterId: null,
        twitterUsername: null,
        twitterDisplayName: null,
        twitterProfileImage: null,
        twitterAccessToken: null,
        twitterRefreshToken: null,
        avatarUrl,
        avatarSource: 'dicebear',
        updatedAt: new Date(),
      };
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set({
        twitterId: null,
        twitterUsername: null,
        twitterDisplayName: null,
        twitterProfileImage: null,
        twitterAccessToken: null,
        twitterRefreshToken: null,
        avatarUrl,
        avatarSource: 'dicebear',
        updatedAt: new Date(),
      })
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Update wealth (balance) for a profile
   */
  static async updateWealth(walletAddress: string, wealth: string): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = {
        ...existing,
        wealth,
        updatedAt: new Date(),
      };
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set({
        wealth,
        updatedAt: new Date(),
      })
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Get all agent profiles (user-created agents from My Agent)
   */
  static async getAllAgents(): Promise<Array<{
    walletAddress: string;
    name: string | null;
    avatarUrl: string;
    personality: string | null;
    isAgent: boolean;
    isEnabled: boolean;
    nftAvatarSeed: number | null;
  }>> {
    if (!isDatabaseAvailable()) {
      return [];
    }

    // Get user-created agents from user_agent_wallets table
    const userAgents = await db!
      .select()
      .from(userAgentWallets);

    // Map to the expected format with avatar URLs
    return userAgents.map(agent => ({
      walletAddress: agent.agentAddress,
      name: agent.agentName || `Agent-${agent.agentAddress.slice(0, 6)}`,
      avatarUrl: AvatarService.generateAvatarUrl(agent.agentAddress),
      personality: agent.personality,
      isAgent: true,
      isEnabled: agent.isEnabled || false,
      nftAvatarSeed: agent.nftAvatarSeed ?? null,
    }));
  }

  /**
   * Get all seeded agent profiles (system agents)
   */
  static async getSeededAgents(): Promise<Profile[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(profileCache.values()).filter(p => p.isAgent);
    }

    return db!
      .select()
      .from(profiles)
      .where(eq(profiles.isAgent, true));
  }

  /**
   * Get avatar URL for a wallet address (creates profile if not exists)
   */
  static async getAvatarUrl(walletAddress: string): Promise<string> {
    const profile = await this.getByWallet(walletAddress);

    if (profile?.avatarUrl) {
      return profile.avatarUrl;
    }

    // Generate default DiceBear avatar
    return AvatarService.generateAvatarUrl(walletAddress.toLowerCase());
  }

  /**
   * Update user's agent configuration (personality, skill)
   */
  static async updateAgentConfig(walletAddress: string, config: AgentConfigInput): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Ensure profile exists
    let profile = await this.getByWallet(normalizedAddress);
    if (!profile) {
      profile = await this.upsert({ walletAddress: normalizedAddress });
    }

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = {
        ...existing,
        agentPersonality: config.personality,
        agentSkill: config.skill,
        agentSkillDescription: config.skillDescription || null,
        updatedAt: new Date(),
      } as Profile;
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set({
        agentPersonality: config.personality,
        agentSkill: config.skill,
        agentSkillDescription: config.skillDescription || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Get user's agent configuration
   */
  static async getAgentConfig(walletAddress: string): Promise<{
    personality: string;
    skill: string;
    skillDescription: string | null;
  } | null> {
    const profile = await this.getByWallet(walletAddress.toLowerCase());
    if (!profile) return null;

    return {
      personality: (profile as any).agentPersonality || 'newbie',
      skill: (profile as any).agentSkill || 'strategic',
      skillDescription: (profile as any).agentSkillDescription || null,
    };
  }

  /**
   * Set NFT avatar for a profile
   */
  static async setNftAvatar(walletAddress: string, seed: number | null): Promise<Profile | null> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Ensure profile exists
    let profile = await this.getByWallet(normalizedAddress);
    if (!profile) {
      profile = await this.upsert({ walletAddress: normalizedAddress });
    }

    if (seed !== null && isDatabaseAvailable()) {
      // Validate that this wallet owns an NFT with this seed
      const nft = await db!
        .select()
        .from(nftCollection)
        .where(
          and(
            eq(nftCollection.ownerAddress, normalizedAddress),
            eq(nftCollection.seed, seed)
          )
        )
        .limit(1);

      if (nft.length === 0) {
        return null; // User doesn't own this NFT
      }
    }

    const updateData = seed !== null
      ? { nftAvatarSeed: seed, avatarSource: 'nft' as const, updatedAt: new Date() }
      : { nftAvatarSeed: null, avatarSource: 'dicebear' as const, updatedAt: new Date() };

    if (!isDatabaseAvailable()) {
      const existing = profileCache.get(normalizedAddress);
      if (!existing) return null;

      const updated: Profile = { ...existing, ...updateData };
      profileCache.set(normalizedAddress, updated);
      return updated;
    }

    await db!
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.walletAddress, normalizedAddress));

    return this.getByWallet(normalizedAddress);
  }

  /**
   * Set NFT avatar for an agent
   */
  static async setAgentNftAvatar(ownerAddress: string, seed: number | null): Promise<boolean> {
    const normalizedOwner = ownerAddress.toLowerCase();

    if (!isDatabaseAvailable()) return false;

    if (seed !== null) {
      // Validate that the owner owns an NFT with this seed
      const nft = await db!
        .select()
        .from(nftCollection)
        .where(
          and(
            eq(nftCollection.ownerAddress, normalizedOwner),
            eq(nftCollection.seed, seed)
          )
        )
        .limit(1);

      if (nft.length === 0) return false;
    }

    await db!
      .update(userAgentWallets)
      .set({ nftAvatarSeed: seed, updatedAt: new Date() })
      .where(eq(userAgentWallets.ownerAddress, normalizedOwner));

    return true;
  }

  /**
   * Seed agent profiles on startup
   */
  static async seedAgents(): Promise<void> {
    console.log('Seeding agent profiles...');

    for (let i = 0; i < AGENT_NAMES.length; i++) {
      const agentName = AGENT_NAMES[i];
      // Generate deterministic wallet address for agent
      const walletAddress = `0x${agentName.toLowerCase().padEnd(40, '0')}`;
      const avatarUrl = AvatarService.generateAgentAvatar(agentName, i);

      const existing = await this.getByWallet(walletAddress);

      if (!existing) {
        if (!isDatabaseAvailable()) {
          const profile: Profile = {
            id: Date.now() + i,
            walletAddress: walletAddress.toLowerCase(),
            name: agentName,
            gender: null,
            avatarUrl,
            avatarSource: 'dicebear',
            nftAvatarSeed: null,
            hobbies: null,
            wealth: null,
            twitterId: null,
            twitterUsername: null,
            twitterDisplayName: null,
            twitterProfileImage: null,
            twitterAccessToken: null,
            twitterRefreshToken: null,
            isAgent: true,
            agentName,
            agentPersonality: 'newbie',
            agentSkill: 'strategic',
            agentSkillDescription: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          profileCache.set(walletAddress.toLowerCase(), profile);
        } else {
          await db!.insert(profiles).values({
            walletAddress: walletAddress.toLowerCase(),
            name: agentName,
            avatarUrl,
            avatarSource: 'dicebear',
            isAgent: true,
            agentName,
          });
        }
        console.log(`  Created agent: ${agentName}`);
      } else {
        console.log(`  Agent exists: ${agentName}`);
      }
    }

    console.log('Agent seeding complete!');
  }
}

export default ProfileService;
