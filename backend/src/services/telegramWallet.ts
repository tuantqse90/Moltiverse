import { ethers } from 'ethers';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { db, telegramWallets, isDatabaseAvailable, type TelegramWallet } from '../db/index.js';
import { encryptPrivateKey, decryptPrivateKey } from './userAgent.js';
import { PMonService } from './pmon.js';
import { ProfileService } from './profile.js';
import { ReferralService } from './referral.js';
import { renderNftImage } from './nftImage.js';
import { NFTService } from './nft.js';
import { moltxService } from './moltx.js';

const RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.LOBSTERPOT_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || '0x8d9DA2d734DeD78552136833B124E36d3a50EDfB';
const MOLTX_API_BASE = 'https://moltx.io/v1';
const PMON_MINT_COST = 500;

const NFT_ABI = [
  'function mint(uint256 seed) external payable',
  'function mintPrice() view returns (uint256)',
  'function canMint(address) view returns (bool)',
  'function getMintCost(address) view returns (uint256)',
  'event Minted(address indexed to, uint256 indexed tokenId, uint256 seed)',
];

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

const LOBSTERPOT_ABI = [
  'function joinPot() external payable',
  'function hasJoined(address) view returns (bool)',
  'function ENTRY_FEE() external view returns (uint256)',
];

// In-memory cache for when DB is unavailable
const walletsCache = new Map<string, TelegramWallet>();

export class TelegramWalletService {
  /**
   * Get or create a wallet for a Telegram user
   */
  static async getOrCreateWallet(telegramUserId: string, telegramUsername?: string): Promise<Omit<TelegramWallet, 'encryptedPrivateKey' | 'moltxApiKey'>> {
    // Check existing
    const existing = await this.getWallet(telegramUserId);
    if (existing) {
      // Update username if changed
      if (telegramUsername && existing.telegramUsername !== telegramUsername) {
        await this.updateUsername(telegramUserId, telegramUsername);
      }
      return existing;
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);

    const walletAddress = wallet.address.toLowerCase();

    if (!isDatabaseAvailable()) {
      const newWallet: TelegramWallet = {
        id: Date.now(),
        telegramUserId,
        telegramUsername: telegramUsername || null,
        walletAddress,
        encryptedPrivateKey: encryptedKey,
        currentBalance: '0',
        totalDeposited: '0',
        totalWinnings: '0',
        totalLosses: '0',
        gamesPlayed: 0,
        gamesWon: 0,
        isAutoPlay: false,
        isAutoChat: false,
        displayName: telegramUsername || null,
        nftAvatarSeed: null,
        moltxApiKey: null,
        moltxAgentName: null,
        moltxRegistered: false,
        lastPlayedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      walletsCache.set(telegramUserId, newWallet);
      const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = newWallet;
      return safe;
    }

    const result = await db!
      .insert(telegramWallets)
      .values({
        telegramUserId,
        telegramUsername: telegramUsername || null,
        walletAddress,
        encryptedPrivateKey: encryptedKey,
        displayName: telegramUsername || null,
      })
      .returning();

    // Auto-create profile so telegram user shows name in participant lists
    try {
      await ProfileService.upsert({
        walletAddress,
        name: telegramUsername || `TG-${telegramUserId}`,
      });
    } catch (err) {
      console.error('Failed to auto-create profile for telegram user:', err);
    }

    // Initialize pMON balance record
    try {
      await PMonService.ensureBalance(walletAddress);
    } catch (err) {
      console.error('Failed to init pMON for telegram user:', err);
    }

    const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = result[0];
    return safe;
  }

  /**
   * Get wallet by Telegram user ID (strips private key)
   */
  static async getWallet(telegramUserId: string): Promise<Omit<TelegramWallet, 'encryptedPrivateKey' | 'moltxApiKey'> | null> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (!cached) return null;
      const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = cached;
      return safe;
    }

    const result = await db!
      .select()
      .from(telegramWallets)
      .where(eq(telegramWallets.telegramUserId, telegramUserId))
      .limit(1);

    if (!result[0]) return null;
    const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = result[0];
    return safe;
  }

  /**
   * Get wallet by on-chain address (for matching winners)
   */
  static async getWalletByAddress(address: string): Promise<Omit<TelegramWallet, 'encryptedPrivateKey' | 'moltxApiKey'> | null> {
    const addr = address.toLowerCase();

    if (!isDatabaseAvailable()) {
      for (const w of walletsCache.values()) {
        if (w.walletAddress === addr) {
          const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = w;
          return safe;
        }
      }
      return null;
    }

    const result = await db!
      .select()
      .from(telegramWallets)
      .where(eq(telegramWallets.walletAddress, addr))
      .limit(1);

    if (!result[0]) return null;
    const { encryptedPrivateKey: _pk, moltxApiKey: _mk, ...safe } = result[0];
    return safe;
  }

  /**
   * Get decrypted private key for a Telegram user
   */
  static async getPrivateKey(telegramUserId: string): Promise<string | null> {
    let encrypted: string | null = null;

    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      encrypted = cached?.encryptedPrivateKey || null;
    } else {
      const result = await db!
        .select({ encryptedPrivateKey: telegramWallets.encryptedPrivateKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      encrypted = result[0]?.encryptedPrivateKey || null;
    }

    if (!encrypted) return null;
    return decryptPrivateKey(encrypted);
  }

  /**
   * Join the current pot using the Telegram user's wallet
   */
  static async joinPot(telegramUserId: string): Promise<{ txHash: string; walletAddress: string }> {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract not configured');
    }

    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      throw new Error('Wallet not found. Create one first.');
    }

    const privateKey = await this.getPrivateKey(telegramUserId);
    if (!privateKey) {
      throw new Error('Could not decrypt wallet');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LOBSTERPOT_ABI, signer);

    // Check if already joined this round
    const alreadyJoined = await contract.hasJoined(wallet.walletAddress);
    if (alreadyJoined) {
      throw new Error('Already joined this round');
    }

    // Get entry fee
    const entryFee = await contract.ENTRY_FEE();

    // Check balance
    const balance = await provider.getBalance(wallet.walletAddress);
    const gasBuffer = ethers.parseEther('0.005');
    if (balance < entryFee + gasBuffer) {
      throw new Error(`Insufficient balance. Need ${ethers.formatEther(entryFee + gasBuffer)} MON (entry + gas). Have ${ethers.formatEther(balance)} MON.`);
    }

    // Join pot
    const tx = await contract.joinPot({ value: entryFee });
    await tx.wait();

    // Update last played
    await this.updateField(telegramUserId, { lastPlayedAt: new Date(), updatedAt: new Date() });

    return { txHash: tx.hash, walletAddress: wallet.walletAddress };
  }

  /**
   * Sync on-chain balance to DB
   */
  static async syncBalance(telegramUserId: string): Promise<{ balance: string; synced: boolean }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balanceWei = await provider.getBalance(wallet.walletAddress);
    const balanceEth = ethers.formatEther(balanceWei);

    await this.updateField(telegramUserId, { currentBalance: balanceEth, updatedAt: new Date() });

    return { balance: balanceEth, synced: true };
  }

  /**
   * Withdraw MON from Telegram wallet to an external address
   */
  static async withdraw(telegramUserId: string, toAddress: string, amount: string): Promise<{ txHash: string; newBalance: string }> {
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid destination address');
    }

    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const privateKey = await this.getPrivateKey(telegramUserId);
    if (!privateKey) {
      throw new Error('Could not decrypt wallet');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);

    const balanceWei = await provider.getBalance(wallet.walletAddress);
    const withdrawAmountWei = ethers.parseEther(amount);
    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000n;
    const gasCost = gasLimit * (gasPrice.gasPrice || 0n);

    if (balanceWei < withdrawAmountWei + gasCost) {
      const maxWithdraw = ethers.formatEther(balanceWei - gasCost);
      throw new Error(`Insufficient balance. Max withdraw: ${maxWithdraw} MON (after gas)`);
    }

    const tx = await signer.sendTransaction({
      to: toAddress,
      value: withdrawAmountWei,
      gasLimit,
    });

    await tx.wait();

    // Update balance
    const newBalanceWei = await provider.getBalance(wallet.walletAddress);
    const newBalance = ethers.formatEther(newBalanceWei);

    await this.updateField(telegramUserId, { currentBalance: newBalance, updatedAt: new Date() });

    return { txHash: tx.hash, newBalance };
  }

  /**
   * Record game result (win or loss)
   */
  static async recordGameResult(telegramUserId: string, won: boolean, amount: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (!cached) return;

      cached.gamesPlayed = (cached.gamesPlayed || 0) + 1;
      if (won) {
        cached.gamesWon = (cached.gamesWon || 0) + 1;
        cached.totalWinnings = (parseFloat(cached.totalWinnings || '0') + parseFloat(amount)).toString();
      } else {
        cached.totalLosses = (parseFloat(cached.totalLosses || '0') + parseFloat(amount)).toString();
      }
      cached.lastPlayedAt = new Date();
      cached.updatedAt = new Date();
      return;
    }

    // Fetch current values
    const result = await db!
      .select()
      .from(telegramWallets)
      .where(eq(telegramWallets.telegramUserId, telegramUserId))
      .limit(1);

    if (!result[0]) return;
    const current = result[0];

    const updates: Record<string, any> = {
      gamesPlayed: (current.gamesPlayed || 0) + 1,
      lastPlayedAt: new Date(),
      updatedAt: new Date(),
    };

    if (won) {
      updates.gamesWon = (current.gamesWon || 0) + 1;
      updates.totalWinnings = (parseFloat(current.totalWinnings || '0') + parseFloat(amount)).toString();
    } else {
      updates.totalLosses = (parseFloat(current.totalLosses || '0') + parseFloat(amount)).toString();
    }

    await db!
      .update(telegramWallets)
      .set(updates)
      .where(eq(telegramWallets.telegramUserId, telegramUserId));
  }

  /**
   * Get stats for a Telegram user (includes pMON)
   */
  static async getStats(telegramUserId: string): Promise<{
    walletAddress: string;
    currentBalance: string;
    totalDeposited: string;
    totalWinnings: string;
    totalLosses: string;
    gamesPlayed: number;
    gamesWon: number;
    displayName: string | null;
    lastPlayedAt: Date | null;
    pmon: { balance: number; totalEarned: number; tier: string };
  } | null> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) return null;

    // Fetch pMON balance
    let pmon = { balance: 0, totalEarned: 0, tier: 'bronze' };
    try {
      const pmonBalance = await PMonService.getBalance(wallet.walletAddress);
      if (pmonBalance) {
        pmon = {
          balance: pmonBalance.balance || 0,
          totalEarned: pmonBalance.totalEarned || 0,
          tier: pmonBalance.tier || 'bronze',
        };
      }
    } catch (err) {
      // pMON query failed, return defaults
    }

    return {
      walletAddress: wallet.walletAddress,
      currentBalance: wallet.currentBalance || '0',
      totalDeposited: wallet.totalDeposited || '0',
      totalWinnings: wallet.totalWinnings || '0',
      totalLosses: wallet.totalLosses || '0',
      gamesPlayed: wallet.gamesPlayed || 0,
      gamesWon: wallet.gamesWon || 0,
      displayName: wallet.displayName,
      lastPlayedAt: wallet.lastPlayedAt,
      pmon,
    };
  }

  /**
   * Claim daily pMON bonus for a Telegram user
   */
  static async claimDailyBonus(telegramUserId: string): Promise<{ success: boolean; points?: number; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }
    return PMonService.claimDailyBonus(wallet.walletAddress);
  }

  /**
   * Apply a referral code for a Telegram user
   */
  static async applyReferralCode(telegramUserId: string, code: string): Promise<{ success: boolean; message: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }
    return ReferralService.applyReferralCode(wallet.walletAddress, code);
  }

  /**
   * Toggle auto-play for a Telegram user
   */
  static async setAutoPlay(telegramUserId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    if (enabled) {
      // Check on-chain balance before enabling
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const balance = await provider.getBalance(wallet.walletAddress);
      const minBalance = ethers.parseEther('0.015'); // entry fee + gas
      if (balance < minBalance) {
        return { success: false, error: `Insufficient balance. Need at least 0.015 MON. Have ${ethers.formatEther(balance)} MON.` };
      }
    }

    await this.updateField(telegramUserId, { isAutoPlay: enabled, updatedAt: new Date() });

    // Auto-register Moltx agent in background when enabling auto-play
    if (enabled && !wallet.moltxRegistered) {
      this.registerMoltxAgent(telegramUserId).catch(err => {
        console.error(`[TG-Moltx] Background registration failed for ${telegramUserId}:`, err);
      });
    }

    return { success: true };
  }

  /**
   * Get auto-play status for a Telegram user
   */
  static async getAutoPlay(telegramUserId: string): Promise<{ isAutoPlay: boolean } | null> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (!cached) return null;
      return { isAutoPlay: cached.isAutoPlay ?? false };
    }

    const result = await db!
      .select({ isAutoPlay: telegramWallets.isAutoPlay })
      .from(telegramWallets)
      .where(eq(telegramWallets.telegramUserId, telegramUserId))
      .limit(1);

    if (!result[0]) return null;
    return { isAutoPlay: result[0].isAutoPlay ?? false };
  }

  /**
   * Get all wallets with auto-play enabled (internal use - includes encrypted key)
   */
  static async getAutoPlayWallets(): Promise<TelegramWallet[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(walletsCache.values()).filter(w => w.isAutoPlay);
    }

    return db!
      .select()
      .from(telegramWallets)
      .where(eq(telegramWallets.isAutoPlay, true));
  }

  /**
   * Toggle auto-chat for a Telegram user
   */
  static async setAutoChat(telegramUserId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    await this.updateField(telegramUserId, { isAutoChat: enabled, updatedAt: new Date() });
    return { success: true };
  }

  /**
   * Get auto-chat status for a Telegram user
   */
  static async getAutoChat(telegramUserId: string): Promise<{ isAutoChat: boolean } | null> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (!cached) return null;
      return { isAutoChat: cached.isAutoChat ?? false };
    }

    const result = await db!
      .select({ isAutoChat: telegramWallets.isAutoChat })
      .from(telegramWallets)
      .where(eq(telegramWallets.telegramUserId, telegramUserId))
      .limit(1);

    if (!result[0]) return null;
    return { isAutoChat: result[0].isAutoChat ?? false };
  }

  /**
   * Get all wallets with auto-chat enabled
   */
  static async getAutoChatWallets(): Promise<TelegramWallet[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(walletsCache.values()).filter(w => w.isAutoChat);
    }

    return db!
      .select()
      .from(telegramWallets)
      .where(eq(telegramWallets.isAutoChat, true));
  }

  // --- Moltx Integration ---

  /**
   * Link EVM wallet to Moltx agent via EIP-712 signature challenge
   */
  static async linkEvmWallet(apiKey: string, telegramUserId: string): Promise<boolean> {
    const privateKey = await this.getPrivateKey(telegramUserId);
    if (!privateKey) {
      console.error(`[TG-Moltx] No private key for ${telegramUserId}`);
      return false;
    }

    const signer = new ethers.Wallet(privateKey);
    const walletAddress = signer.address;
    const chainId = 8453; // Base (recommended by Moltx; same address works cross-chain)

    try {
      // Step 1: Request EIP-712 challenge (POST with address + chain_id in body)
      console.log(`[TG-Moltx] Step 1: Requesting challenge for ${walletAddress} chain ${chainId}`);
      const challengeRes = await fetch(`${MOLTX_API_BASE}/agents/me/evm/challenge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: walletAddress, chain_id: chainId }),
      });
      const challengeText = await challengeRes.text();
      console.log(`[TG-Moltx] Challenge response (${challengeRes.status}):`, challengeText.slice(0, 500));

      const challengeData: any = JSON.parse(challengeText);

      if (!challengeData.success || !challengeData.data?.typed_data) {
        console.error(`[TG-Moltx] Challenge failed for ${telegramUserId}:`, challengeData.error || challengeData.message);
        return false;
      }

      const nonce = challengeData.data.nonce;

      // Step 2: Sign the EIP-712 typed data
      const typedData = challengeData.data.typed_data;
      const { domain, types, message } = typedData;
      console.log(`[TG-Moltx] Step 2: Signing typed data. Domain:`, JSON.stringify(domain), 'Nonce:', nonce);

      // Remove EIP712Domain from types (ethers handles it via domain)
      const sigTypes = { ...types };
      delete sigTypes.EIP712Domain;

      const signature = await signer.signTypedData(domain, sigTypes, message);
      console.log(`[TG-Moltx] Signature generated: ${signature.slice(0, 20)}...`);

      // Step 3: Verify with nonce + signature
      console.log(`[TG-Moltx] Step 3: Verifying signature`);
      const verifyRes = await fetch(`${MOLTX_API_BASE}/agents/me/evm/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nonce, signature }),
      });
      const verifyText = await verifyRes.text();
      console.log(`[TG-Moltx] Verify response (${verifyRes.status}):`, verifyText.slice(0, 500));

      const verifyData: any = JSON.parse(verifyText);

      if (verifyData.success) {
        console.log(`[TG-Moltx] EVM wallet linked for ${telegramUserId}: ${walletAddress}`);
        return true;
      } else {
        console.error(`[TG-Moltx] Verify failed for ${telegramUserId}:`, verifyData.error || verifyData.message);
        return false;
      }
    } catch (err) {
      console.error(`[TG-Moltx] linkEvmWallet error for ${telegramUserId}:`, err);
      return false;
    }
  }

  /**
   * Sanitize a name for Moltx: lowercase letters only, 3-30 chars
   */
  private static sanitizeMoltxName(raw: string): string {
    // Strip to lowercase letters only
    let clean = raw.toLowerCase().replace(/[^a-z]/g, '');
    // Ensure minimum length
    if (clean.length < 3) clean = 'openclaw' + clean;
    // Trim to 30 chars max
    return clean.slice(0, 30);
  }

  static async registerMoltxAgent(telegramUserId: string, customName?: string): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Already registered? Just ensure wallet is linked
    if (wallet.moltxRegistered && wallet.moltxAgentName) {
      // Fetch API key to link wallet if not yet linked
      let apiKey: string | null = null;
      if (!isDatabaseAvailable()) {
        apiKey = walletsCache.get(telegramUserId)?.moltxApiKey || null;
      } else {
        const result = await db!
          .select({ moltxApiKey: telegramWallets.moltxApiKey })
          .from(telegramWallets)
          .where(eq(telegramWallets.telegramUserId, telegramUserId))
          .limit(1);
        apiKey = result[0]?.moltxApiKey || null;
      }
      if (apiKey) {
        await this.linkEvmWallet(apiKey, telegramUserId);
      }
      return { success: true, agentName: wallet.moltxAgentName };
    }

    // Build agent name: custom > username > fallback, sanitized for Moltx
    const rawName = customName || wallet.telegramUsername || `openclawtg${telegramUserId}`;
    const agentName = this.sanitizeMoltxName(rawName);
    const displayName = customName || wallet.displayName || wallet.telegramUsername || `OpenClaw TG-${telegramUserId}`;

    try {
      const res = await fetch(`${MOLTX_API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          display_name: displayName,
          description: `LobsterPot player on Monad 🦞 (Telegram)`,
          avatar_emoji: '🦞',
        }),
      });

      const data: any = await res.json();

      if (data.success && data.data?.api_key) {
        // Save Moltx credentials + sync displayName
        await this.updateField(telegramUserId, {
          moltxApiKey: data.data.api_key,
          moltxAgentName: agentName,
          moltxRegistered: true,
          displayName,
          updatedAt: new Date(),
        });

        // Sync name to profiles table
        try {
          await ProfileService.upsert({
            walletAddress: wallet.walletAddress,
            name: displayName,
          });
        } catch (err) {
          console.error(`[TG-Moltx] Failed to sync profile name for ${telegramUserId}:`, err);
        }

        // Link EVM wallet (required for posting)
        const linked = await this.linkEvmWallet(data.data.api_key, telegramUserId);
        if (!linked) {
          console.warn(`[TG-Moltx] Agent registered but wallet linking failed for ${telegramUserId} - posting may not work`);
        }

        // Upload NFT avatar if they have one
        if (wallet.nftAvatarSeed) {
          try {
            const png = renderNftImage(wallet.nftAvatarSeed, 8);
            const blob = new Blob([png], { type: 'image/png' });
            const formData = new FormData();
            formData.append('file', blob, 'avatar.png');

            await fetch(`${MOLTX_API_BASE}/agents/me/avatar`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${data.data.api_key}` },
              body: formData,
            });
          } catch (err) {
            console.error(`[TG-Moltx] Failed to upload avatar for ${telegramUserId}:`, err);
          }
        }

        console.log(`[TG-Moltx] Agent registered: ${agentName} for TG user ${telegramUserId}`);
        return { success: true, agentName };
      } else {
        console.error(`[TG-Moltx] Registration failed for ${telegramUserId}:`, data.error || data.message);
        return { success: false, error: data.error || data.message || 'Registration failed' };
      }
    } catch (err) {
      console.error(`[TG-Moltx] Registration error for ${telegramUserId}:`, err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Auto-engage with trending Moltx posts (like + repost)
   * Required before new agents can post their own content
   */
  static async autoEngage(telegramUserId: string): Promise<{ success: boolean; liked: number; reposted: number; error?: string }> {
    let apiKey: string | null = null;
    if (!isDatabaseAvailable()) {
      apiKey = walletsCache.get(telegramUserId)?.moltxApiKey || null;
    } else {
      const result = await db!
        .select({ moltxApiKey: telegramWallets.moltxApiKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      apiKey = result[0]?.moltxApiKey || null;
    }

    if (!apiKey) {
      return { success: false, liked: 0, reposted: 0, error: 'Moltx not configured' };
    }

    let liked = 0;
    let reposted = 0;

    try {
      // Fetch top posts from global feed
      const feedRes = await fetch(`${MOLTX_API_BASE}/posts?sort=top&limit=5`);
      const feedData: any = await feedRes.json();

      const posts = feedData.data || feedData.posts || [];
      if (!posts.length) {
        console.warn(`[TG-Moltx] No posts found in global feed`);
        return { success: true, liked: 0, reposted: 0 };
      }

      // Like top 3 posts
      for (const post of posts.slice(0, 3)) {
        const postId = post.id || post._id;
        if (!postId) continue;

        try {
          const likeRes = await fetch(`${MOLTX_API_BASE}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (likeRes.ok) {
            liked++;
            console.log(`[TG-Moltx] Liked post ${postId} for ${telegramUserId}`);
          }
        } catch {}
      }

      // Repost 1 top post
      const topPost = posts[0];
      const topPostId = topPost?.id || topPost?._id;
      if (topPostId) {
        try {
          const repostRes = await fetch(`${MOLTX_API_BASE}/posts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 'repost', parent_id: topPostId }),
          });
          if (repostRes.ok) {
            reposted++;
            console.log(`[TG-Moltx] Reposted ${topPostId} for ${telegramUserId}`);
          }
        } catch {}
      }

      console.log(`[TG-Moltx] Auto-engage done for ${telegramUserId}: ${liked} likes, ${reposted} reposts`);
      return { success: true, liked, reposted };
    } catch (err) {
      console.error(`[TG-Moltx] autoEngage error for ${telegramUserId}:`, err);
      return { success: false, liked, reposted, error: String(err) };
    }
  }

  /**
   * Post content to Moltx using the user's own API key
   */
  static async postToMoltx(telegramUserId: string, content: string, mediaUrl?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    // Get full record including API key
    let apiKey: string | null = null;
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      apiKey = cached?.moltxApiKey || null;
    } else {
      const result = await db!
        .select({ moltxApiKey: telegramWallets.moltxApiKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      apiKey = result[0]?.moltxApiKey || null;
    }

    if (!apiKey) {
      return { success: false, error: 'Moltx not configured for this user' };
    }

    // Auto-engage before posting (required for new agents)
    try {
      await this.autoEngage(telegramUserId);
    } catch (engageErr) {
      console.warn(`[TG-Moltx] Auto-engage failed before post, proceeding anyway:`, engageErr);
    }

    try {
      const body: any = { content };
      if (mediaUrl) body.media_url = mediaUrl;

      const res = await fetch(`${MOLTX_API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data: any = await res.json();

      if (data.success || data.data?.id) {
        console.log(`[TG-Moltx] Post created for ${telegramUserId}: ${data.data?.id}`);
        return { success: true, postId: data.data?.id };
      } else {
        return { success: false, error: data.error || data.message };
      }
    } catch (err) {
      console.error(`[TG-Moltx] Post error for ${telegramUserId}:`, err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Generate AI celebration and post win to Moltx
   */
  static async postWinToMoltx(telegramUserId: string, winnerInfo: {
    address: string;
    amount: number;
    roundNumber: number;
    participantCount: number;
  }): Promise<{ success: boolean; postId?: string; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet?.moltxRegistered) {
      return { success: false, error: 'Moltx not registered' };
    }

    // Get API key
    let apiKey: string | null = null;
    if (!isDatabaseAvailable()) {
      apiKey = walletsCache.get(telegramUserId)?.moltxApiKey || null;
    } else {
      const result = await db!
        .select({ moltxApiKey: telegramWallets.moltxApiKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      apiKey = result[0]?.moltxApiKey || null;
    }

    if (!apiKey) {
      return { success: false, error: 'No Moltx API key' };
    }

    // Upload NFT image if available
    let mediaUrl: string | undefined;
    if (wallet.nftAvatarSeed) {
      try {
        const png = renderNftImage(wallet.nftAvatarSeed, 6);
        const blob = new Blob([png], { type: 'image/png' });
        const formData = new FormData();
        formData.append('file', blob, `winner-r${winnerInfo.roundNumber}.png`);

        const uploadRes = await fetch(`${MOLTX_API_BASE}/media/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData,
        });
        const uploadData: any = await uploadRes.json();
        if (uploadData.success && uploadData.data?.url) {
          mediaUrl = uploadData.data.url;
        }
      } catch (err) {
        console.error(`[TG-Moltx] Failed to upload winner NFT for ${telegramUserId}:`, err);
      }
    }

    // Generate AI celebration post
    const displayName = wallet.displayName || wallet.telegramUsername || `TG-${telegramUserId}`;
    let content: string;

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are ${displayName}, a LobsterPot player celebrating a win on Moltx (social platform for AI agents on Monad blockchain).

RULES:
- Max 400 characters total (hard limit)
- Write a first-person celebration post about YOUR win
- Be creative, funny, dramatic, or hype - vary your style
- Use emojis naturally (2-5 per post)
- End with 2-3 hashtags from: #LobsterPot #Monad #GameFi #DeFi #Winner #OnChain
- Write in English
- DO NOT use markdown formatting, just plain text with line breaks`
            },
            {
              role: 'user',
              content: `Write a celebration post. You just won:
- Prize: ${winnerInfo.amount.toFixed(4)} MON
- Round: #${winnerInfo.roundNumber}
- Beaten: ${winnerInfo.participantCount} players
- Your name: ${displayName}`
            }
          ],
          max_tokens: 200,
          temperature: 1.0,
        });

        const aiContent = response.choices[0]?.message?.content?.trim();
        if (aiContent) {
          content = aiContent.length > 480 ? aiContent.slice(0, 477) + '...' : aiContent;
          // Remove wrapping quotes
          if (content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1);
          }
        } else {
          content = `🦞🎉 I just won Round #${winnerInfo.roundNumber} on LobsterPot! Earned ${winnerInfo.amount.toFixed(4)} MON beating ${winnerInfo.participantCount} players! #LobsterPot #Monad`;
        }
      } catch (err) {
        console.error(`[TG-Moltx] DeepSeek generation failed:`, err);
        content = `🦞🎉 I just won Round #${winnerInfo.roundNumber} on LobsterPot! Earned ${winnerInfo.amount.toFixed(4)} MON beating ${winnerInfo.participantCount} players! #LobsterPot #Monad`;
      }
    } else {
      content = `🦞🎉 I just won Round #${winnerInfo.roundNumber} on LobsterPot! Earned ${winnerInfo.amount.toFixed(4)} MON beating ${winnerInfo.participantCount} players! #LobsterPot #Monad`;
    }

    return this.postToMoltx(telegramUserId, content, mediaUrl);
  }

  /**
   * Get Moltx registration status for a Telegram user
   */
  static async getMoltxStatus(telegramUserId: string): Promise<{ moltxRegistered: boolean; moltxAgentName: string | null } | null> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (!cached) return null;
      return { moltxRegistered: cached.moltxRegistered ?? false, moltxAgentName: cached.moltxAgentName ?? null };
    }

    const result = await db!
      .select({
        moltxRegistered: telegramWallets.moltxRegistered,
        moltxAgentName: telegramWallets.moltxAgentName,
      })
      .from(telegramWallets)
      .where(eq(telegramWallets.telegramUserId, telegramUserId))
      .limit(1);

    if (!result[0]) return null;
    return {
      moltxRegistered: result[0].moltxRegistered ?? false,
      moltxAgentName: result[0].moltxAgentName ?? null,
    };
  }

  /**
   * Set NFT avatar on Moltx for a Telegram user
   */
  static async setMoltxNftAvatar(telegramUserId: string, seed: number): Promise<{ success: boolean; avatarUrl?: string; postId?: string; error?: string }> {
    let apiKey: string | null = null;
    if (!isDatabaseAvailable()) {
      apiKey = walletsCache.get(telegramUserId)?.moltxApiKey || null;
    } else {
      const result = await db!
        .select({ moltxApiKey: telegramWallets.moltxApiKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      apiKey = result[0]?.moltxApiKey || null;
    }

    if (!apiKey) {
      return { success: false, error: 'Moltx not configured' };
    }

    // Save seed to DB regardless of avatar upload result
    await this.updateField(telegramUserId, { nftAvatarSeed: seed, updatedAt: new Date() });

    const wallet = await this.getWallet(telegramUserId);
    const displayName = wallet?.displayName || wallet?.telegramUsername || `TG-${telegramUserId}`;
    const backendUrl = process.env.BACKEND_URL || 'https://api.clawpot.xyz';
    const publicNftUrl = `${backendUrl}/api/nft/image/${seed}?scale=8`;

    // --- STEP 1: LobsterPot main agent posts about user setting NFT avatar ---
    let cdnUrl: string | null = null;

    // Upload NFT image to Moltx CDN via main agent
    try {
      const png = renderNftImage(seed, 8); // 512x512
      cdnUrl = await moltxService.uploadMedia(png, `nft-avatar-${seed}.png`);
    } catch (err) {
      console.error(`[TG-Moltx] Failed to upload NFT to CDN:`, err);
    }

    const mediaUrl = cdnUrl || publicNftUrl;

    // Generate AI announcement via DeepSeek
    let announceContent = `🦞 ${displayName} just set their Lobster Robot NFT as avatar on LobsterPot!\n\nJoin the game: https://clawpot.xyz\n\n#LobsterPot #Monad #NFT`;

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are LobsterPot 🦞, the official game agent on Moltx. Write a short, fun announcement that a player just set their Lobster Robot NFT as their avatar.

RULES:
- Max 400 characters (hard limit)
- Mention the player name and that they set an NFT avatar
- Be creative, fun, hype - celebrate the player
- Mention clawpot.xyz so others can join
- Use 2-4 emojis
- End with 2-3 hashtags from: #LobsterPot #Monad #NFT #GameFi #LobsterRobot
- DO NOT use markdown, just plain text`
            },
            {
              role: 'user',
              content: `Write an announcement that ${displayName} just set their Lobster Robot NFT (seed #${seed}) as their avatar on LobsterPot. Game URL: https://clawpot.xyz`
            }
          ],
          max_tokens: 200,
          temperature: 1.0,
        });

        const aiContent = response.choices[0]?.message?.content?.trim();
        if (aiContent) {
          let cleaned = aiContent.length > 480 ? aiContent.slice(0, 477) + '...' : aiContent;
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
          announceContent = cleaned;
        }
      } catch (err) {
        console.error(`[TG-Moltx] DeepSeek announcement failed:`, err);
      }
    }

    // Main agent posts announcement with image
    const mainPostResult = await moltxService.post(announceContent, mediaUrl);
    if (mainPostResult.success) {
      console.log(`[TG-Moltx] Main agent posted NFT avatar announcement: ${mainPostResult.postId}`);
    } else {
      console.error(`[TG-Moltx] Main agent announcement failed:`, mainPostResult.error);
    }

    // --- STEP 2: Set avatar on user's Moltx agent + user agent shares ---

    // Try direct image avatar upload (only works for claimed agents)
    let avatarSet = false;
    try {
      const png = renderNftImage(seed, 8);
      const blob = new Blob([png], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'avatar.png');
      const avatarRes = await fetch(`${MOLTX_API_BASE}/agents/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });
      const avatarData: any = await avatarRes.json();
      if (avatarData.avatar_url || avatarData.data?.avatar_url) {
        avatarSet = true;
        console.log(`[TG-Moltx] Image avatar set for ${telegramUserId}`);
      } else {
        console.warn(`[TG-Moltx] Image avatar upload rejected (agent not claimed?):`, avatarData.error || avatarData.message);
      }
    } catch (err) {
      console.error(`[TG-Moltx] Direct avatar upload failed:`, err);
    }

    // Set banner_url to NFT image + emoji fallback if image avatar didn't work
    // (Moltx PATCH supports: avatar_emoji, banner_url, metadata - NOT avatar_url)
    try {
      const patchBody: Record<string, any> = {
        banner_url: mediaUrl,
        metadata: { nft_seed: seed, nft_image: mediaUrl },
      };
      if (!avatarSet) {
        patchBody.avatar_emoji = '🦞';
      }
      const patchRes = await fetch(`${MOLTX_API_BASE}/agents/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      });
      const patchData: any = await patchRes.json();
      console.log(`[TG-Moltx] PATCH profile for ${telegramUserId}:`, patchData.success ? 'ok' : (patchData.error || patchData.message));
    } catch (err) {
      console.error(`[TG-Moltx] PATCH profile failed:`, err);
    }

    // User's agent shares about clawpot.xyz
    this.postNftShowcase(telegramUserId, seed).catch(err => {
      console.error(`[TG-Moltx] NFT showcase post failed:`, err);
    });

    return { success: true, avatarUrl: mediaUrl, postId: mainPostResult.postId };
  }

  /**
   * Post NFT showcase with referral link and skill.md URL
   */
  static async postNftShowcase(telegramUserId: string, seed: number): Promise<{ success: boolean; postId?: string; error?: string }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet?.moltxRegistered) {
      return { success: false, error: 'Moltx not registered' };
    }

    let apiKey: string | null = null;
    if (!isDatabaseAvailable()) {
      apiKey = walletsCache.get(telegramUserId)?.moltxApiKey || null;
    } else {
      const result = await db!
        .select({ moltxApiKey: telegramWallets.moltxApiKey })
        .from(telegramWallets)
        .where(eq(telegramWallets.telegramUserId, telegramUserId))
        .limit(1);
      apiKey = result[0]?.moltxApiKey || null;
    }

    if (!apiKey) {
      return { success: false, error: 'No Moltx API key' };
    }

    // Upload NFT image to Moltx CDN
    let mediaUrl: string | undefined;
    try {
      const png = renderNftImage(seed, 6);
      const blob = new Blob([png], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, `nft-${seed}.png`);

      const uploadRes = await fetch(`${MOLTX_API_BASE}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });
      const uploadData: any = await uploadRes.json();
      if (uploadData.success && uploadData.data?.url) {
        mediaUrl = uploadData.data.url;
      }
    } catch (err) {
      console.error(`[TG-Moltx] Failed to upload NFT image:`, err);
    }

    // Fallback to public NFT URL if CDN upload failed
    if (!mediaUrl) {
      const backendUrl = process.env.BACKEND_URL || 'https://api.clawpot.xyz';
      mediaUrl = `${backendUrl}/api/nft/image/${seed}?scale=8`;
    }

    // Get referral code
    let referralCode = '';
    try {
      referralCode = await ReferralService.getOrCreateReferralCode(wallet.walletAddress);
    } catch (err) {
      console.error(`[TG-Moltx] Failed to get referral code:`, err);
    }

    // Generate AI showcase post
    const displayName = wallet.displayName || wallet.telegramUsername || `TG-${telegramUserId}`;
    const backendUrl = process.env.BACKEND_URL || 'https://lobsterpot.fun';
    const skillUrl = `${backendUrl}/api/skill-doc`;
    const referralLink = referralCode ? `${backendUrl}?ref=${referralCode}` : '';

    let content: string;
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are ${displayName}, a LobsterPot player showing off your NFT on Moltx.

RULES:
- Max 450 characters (hard limit)
- Write a first-person post showing off your Lobster Robot NFT
- Be proud, creative, fun - like showing off a new profile pic
- Mention LobsterPot is a decentralized lottery on Monad
- Include the referral link naturally (invite others to play)
- Include the skill doc URL so other agents can learn about the game
- Use 2-4 emojis
- End with 2-3 hashtags from: #LobsterPot #Monad #NFT #GameFi #LobsterRobot
- DO NOT use markdown, just plain text`
            },
            {
              role: 'user',
              content: `Write a showcase post. Info:
- Your name: ${displayName}
- NFT seed: ${seed}
- Referral link: ${referralLink}
- Skill doc: ${skillUrl}
- Game: LobsterPot (lottery on Monad blockchain)`
            }
          ],
          max_tokens: 250,
          temperature: 1.0,
        });

        const aiContent = response.choices[0]?.message?.content?.trim();
        if (aiContent) {
          content = aiContent.length > 480 ? aiContent.slice(0, 477) + '...' : aiContent;
          if (content.startsWith('"') && content.endsWith('"')) content = content.slice(1, -1);
        } else {
          content = this.buildFallbackShowcase(displayName, referralLink, skillUrl);
        }
      } catch (err) {
        console.error(`[TG-Moltx] DeepSeek showcase failed:`, err);
        content = this.buildFallbackShowcase(displayName, referralLink, skillUrl);
      }
    } else {
      content = this.buildFallbackShowcase(displayName, referralLink, skillUrl);
    }

    return this.postToMoltx(telegramUserId, content, mediaUrl);
  }

  /**
   * Mint an NFT server-side for a Telegram user
   */
  static async mintNft(telegramUserId: string): Promise<{
    success: boolean;
    tokenId?: number;
    seed?: number;
    traits?: any;
    rarityTier?: string;
    rarityScore?: number;
    txHash?: string;
    pmonSpent?: number;
    newPmonBalance?: number;
    error?: string;
  }> {
    const wallet = await this.getWallet(telegramUserId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    const privateKey = await this.getPrivateKey(telegramUserId);
    if (!privateKey) {
      return { success: false, error: 'Could not decrypt wallet' };
    }

    // Check pMON balance
    const pmonData = await PMonService.getCombinedBalance(wallet.walletAddress);
    if (pmonData.combined.balance < PMON_MINT_COST) {
      return { success: false, error: `Insufficient pMON. Need ${PMON_MINT_COST}, have ${pmonData.combined.balance}` };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

    // Check if wallet can mint (supply + per-wallet limit)
    try {
      const canMint = await nftContract.canMint(wallet.walletAddress);
      if (!canMint) {
        return { success: false, error: 'Cannot mint: wallet limit reached or minting disabled' };
      }
    } catch (err) {
      console.warn(`[TG-NFT] canMint check failed, proceeding:`, err);
    }

    // Get mint cost from contract
    let mintCost: bigint;
    try {
      mintCost = await nftContract.getMintCost(wallet.walletAddress);
    } catch {
      mintCost = ethers.parseEther('10'); // fallback 10 MON
    }

    // Check MON balance
    const balance = await provider.getBalance(wallet.walletAddress);
    const gasBuffer = ethers.parseEther('0.01');
    if (balance < mintCost + gasBuffer) {
      return {
        success: false,
        error: `Insufficient MON. Need ~${ethers.formatEther(mintCost + gasBuffer)} MON (mint + gas). Have ${ethers.formatEther(balance)} MON.`,
      };
    }

    // Generate random seed
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000000);
    const addressPart = parseInt(wallet.walletAddress.slice(2, 10), 16) % 1000;
    const seed = (timestamp * 7 + randomPart * 13 + addressPart * 17) % 999999 + 1;

    // Deduct pMON before on-chain tx
    const deductResult = await PMonService.deductCombinedPoints(
      wallet.walletAddress,
      PMON_MINT_COST,
      'nft_mint_telegram',
      `Telegram mint Lobster Robot NFT (seed: ${seed})`
    );
    if (!deductResult.success) {
      return { success: false, error: deductResult.error || 'Failed to deduct pMON' };
    }

    try {
      console.log(`[TG-NFT] Minting for ${telegramUserId}, seed: ${seed}, cost: ${ethers.formatEther(mintCost)} MON`);
      const tx = await nftContract.mint(seed, { value: mintCost });
      const receipt = await tx.wait();

      // Extract tokenId from Minted event
      let tokenId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = nftContract.interface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === 'Minted') {
            tokenId = Number(parsed.args[1]); // tokenId is second indexed param
            break;
          }
        } catch {}
      }

      if (tokenId === undefined) {
        tokenId = Date.now() % 1000000;
        console.warn(`[TG-NFT] Could not parse Minted event, fallback tokenId: ${tokenId}`);
      }

      // Record in database
      const nft = await NFTService.recordMint({
        tokenId,
        ownerAddress: wallet.walletAddress,
        minterAddress: wallet.walletAddress,
        seed,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        pmonSpent: PMON_MINT_COST,
      });

      // Sync balance after mint
      try {
        await this.syncBalance(telegramUserId);
      } catch {}

      console.log(`[TG-NFT] Minted tokenId ${tokenId} for ${telegramUserId}, tx: ${tx.hash}`);
      return {
        success: true,
        tokenId: nft.tokenId,
        seed: nft.seed,
        traits: nft.traits,
        rarityTier: nft.rarityTier ?? undefined,
        rarityScore: nft.rarityScore ?? undefined,
        txHash: tx.hash,
        pmonSpent: PMON_MINT_COST,
        newPmonBalance: deductResult.newCombinedBalance,
      };
    } catch (err: any) {
      // Mint tx failed - refund pMON
      console.error(`[TG-NFT] Mint tx failed for ${telegramUserId}:`, err);
      try {
        await PMonService.awardPoints(wallet.walletAddress, 'redeem', PMON_MINT_COST, {
          reason: 'nft_mint_refund',
          seed,
        });
        console.log(`[TG-NFT] pMON refunded for ${telegramUserId}`);
      } catch (refundErr) {
        console.error(`[TG-NFT] pMON refund failed for ${telegramUserId}:`, refundErr);
      }
      return { success: false, error: err.message || 'Mint transaction failed' };
    }
  }

  private static buildFallbackShowcase(name: string, referralLink: string, skillUrl: string): string {
    let post = `🦞 Check out my new Lobster Robot NFT! Playing LobsterPot on Monad - a decentralized lottery where anyone can win.`;
    if (referralLink) post += `\n\nJoin me: ${referralLink}`;
    post += `\nLearn more: ${skillUrl}`;
    post += `\n\n#LobsterPot #Monad #NFT`;
    return post;
  }

  // --- Internal helpers ---

  private static async updateUsername(telegramUserId: string, username: string): Promise<void> {
    await this.updateField(telegramUserId, { telegramUsername: username, updatedAt: new Date() });
  }

  private static async updateField(telegramUserId: string, updates: Partial<TelegramWallet>): Promise<void> {
    if (!isDatabaseAvailable()) {
      const cached = walletsCache.get(telegramUserId);
      if (cached) {
        Object.assign(cached, updates);
      }
      return;
    }

    await db!
      .update(telegramWallets)
      .set(updates)
      .where(eq(telegramWallets.telegramUserId, telegramUserId));
  }
}
