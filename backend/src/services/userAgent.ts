import { ethers } from 'ethers';
import { eq } from 'drizzle-orm';
import { db, userAgentWallets, isDatabaseAvailable, type UserAgentWallet } from '../db/index.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { AgentTransactionService } from './agentTransactions.js';

// Encryption key from env or generate one (in production, use env)
const ENCRYPTION_KEY = process.env.AGENT_ENCRYPTION_KEY || 'lobsterpot-agent-secret-key-2024';
const ALGORITHM = 'aes-256-gcm';

// In-memory cache
const agentWalletsCache = new Map<string, UserAgentWallet>();

// Encrypt private key
export function encryptPrivateKey(privateKey: string): string {
  const iv = randomBytes(16);
  const key = scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Decrypt private key
export function decryptPrivateKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export interface AgentConfig {
  agentName?: string;
  personality?: string;
  customPersonality?: string;
  playStyle?: string;
  autoChat?: boolean;
  maxBetPerRound?: string;
}

export interface AgentStats {
  isEnabled: boolean;
  agentAddress: string;
  agentName: string | null;
  personality: string | null;
  customPersonality: string | null;
  playStyle: string | null;
  autoChat: boolean;
  currentBalance: string;
  depositedAmount: string;
  totalWinnings: string;
  totalLosses: string;
  gamesPlayed: number;
  gamesWon: number;
  lastPlayedAt: Date | null;
}

export class UserAgentService {
  /**
   * Get or create agent wallet for user
   */
  static async getOrCreateAgent(ownerAddress: string): Promise<UserAgentWallet> {
    const addr = ownerAddress.toLowerCase();

    // Check existing
    let agent = await this.getAgentByOwner(addr);
    if (agent) return agent;

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);

    if (!isDatabaseAvailable()) {
      const newAgent: UserAgentWallet = {
        id: Date.now(),
        ownerAddress: addr,
        agentAddress: wallet.address.toLowerCase(),
        encryptedPrivateKey: encryptedKey,
        isEnabled: false,
        agentName: null,
        nftAvatarSeed: null,
        personality: 'newbie',
        customPersonality: null,
        playStyle: 'strategic',
        autoChat: true,
        maxBetPerRound: '0.01',
        depositedAmount: '0',
        currentBalance: '0',
        totalWinnings: '0',
        totalLosses: '0',
        gamesPlayed: 0,
        gamesWon: 0,
        // Dating Economy fields
        loveTokens: 0,
        charmPoints: 0,
        heartShards: 0,
        totalDates: 0,
        successfulDates: 0,
        averageRating: '0',
        lastPlayedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      agentWalletsCache.set(addr, newAgent);
      return newAgent;
    }

    const result = await db!
      .insert(userAgentWallets)
      .values({
        ownerAddress: addr,
        agentAddress: wallet.address.toLowerCase(),
        encryptedPrivateKey: encryptedKey,
      })
      .returning();

    return result[0];
  }

  /**
   * Get agent by owner address
   */
  static async getAgentByOwner(ownerAddress: string): Promise<UserAgentWallet | null> {
    const addr = ownerAddress.toLowerCase();

    if (!isDatabaseAvailable()) {
      return agentWalletsCache.get(addr) || null;
    }

    const result = await db!
      .select()
      .from(userAgentWallets)
      .where(eq(userAgentWallets.ownerAddress, addr))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get agent's private key (decrypted)
   */
  static async getAgentPrivateKey(ownerAddress: string): Promise<string | null> {
    const agent = await this.getAgentByOwner(ownerAddress);
    if (!agent) return null;

    return decryptPrivateKey(agent.encryptedPrivateKey);
  }

  /**
   * Get agent wallet instance
   */
  static async getAgentWallet(ownerAddress: string, provider: ethers.Provider): Promise<ethers.Wallet | null> {
    const privateKey = await this.getAgentPrivateKey(ownerAddress);
    if (!privateKey) return null;

    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Update agent configuration
   */
  static async updateAgentConfig(ownerAddress: string, config: AgentConfig): Promise<UserAgentWallet | null> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) return null;

    const updates: Partial<UserAgentWallet> = {
      updatedAt: new Date(),
    };

    if (config.agentName !== undefined) updates.agentName = config.agentName;
    if (config.personality !== undefined) updates.personality = config.personality;
    if (config.customPersonality !== undefined) (updates as any).customPersonality = config.customPersonality;
    if (config.playStyle !== undefined) updates.playStyle = config.playStyle;
    if (config.autoChat !== undefined) updates.autoChat = config.autoChat;
    if (config.maxBetPerRound !== undefined) updates.maxBetPerRound = config.maxBetPerRound;

    if (!isDatabaseAvailable()) {
      Object.assign(agent, updates);
      agentWalletsCache.set(addr, agent);
      return agent;
    }

    await db!
      .update(userAgentWallets)
      .set(updates)
      .where(eq(userAgentWallets.ownerAddress, addr));

    return this.getAgentByOwner(addr);
  }

  /**
   * Enable/disable agent
   */
  static async setAgentEnabled(ownerAddress: string, enabled: boolean): Promise<UserAgentWallet | null> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) return null;

    // Check balance before enabling
    if (enabled && parseFloat(agent.currentBalance || '0') < 0.01) {
      throw new Error('Insufficient balance. Deposit at least 0.01 MON to enable agent.');
    }

    if (!isDatabaseAvailable()) {
      agent.isEnabled = enabled;
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
      return agent;
    }

    await db!
      .update(userAgentWallets)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(userAgentWallets.ownerAddress, addr));

    return this.getAgentByOwner(addr);
  }

  /**
   * Update agent balance after deposit confirmation
   */
  static async recordDeposit(ownerAddress: string, amount: string, txHash?: string): Promise<UserAgentWallet | null> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) return null;

    const newDeposited = (parseFloat(agent.depositedAmount || '0') + parseFloat(amount)).toString();
    const newBalance = (parseFloat(agent.currentBalance || '0') + parseFloat(amount)).toString();

    // Record transaction
    await AgentTransactionService.record(
      addr,
      agent.agentAddress,
      'deposit',
      amount,
      txHash,
      `Deposited ${amount} MON to agent`
    );

    if (!isDatabaseAvailable()) {
      agent.depositedAmount = newDeposited;
      agent.currentBalance = newBalance;
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
      return agent;
    }

    await db!
      .update(userAgentWallets)
      .set({
        depositedAmount: newDeposited,
        currentBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(userAgentWallets.ownerAddress, addr));

    return this.getAgentByOwner(addr);
  }

  /**
   * Record game result
   */
  static async recordGameResult(ownerAddress: string, won: boolean, amount: string): Promise<void> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) return;

    const betAmount = parseFloat(agent.maxBetPerRound || '0.01');
    let newBalance = parseFloat(agent.currentBalance || '0');
    let newWinnings = parseFloat(agent.totalWinnings || '0');
    let newLosses = parseFloat(agent.totalLosses || '0');

    if (won) {
      newBalance += parseFloat(amount);
      newWinnings += parseFloat(amount);
    } else {
      newBalance -= betAmount;
      newLosses += betAmount;
    }

    if (!isDatabaseAvailable()) {
      agent.currentBalance = newBalance.toString();
      agent.totalWinnings = newWinnings.toString();
      agent.totalLosses = newLosses.toString();
      agent.gamesPlayed = (agent.gamesPlayed || 0) + 1;
      if (won) agent.gamesWon = (agent.gamesWon || 0) + 1;
      agent.lastPlayedAt = new Date();
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
      return;
    }

    await db!
      .update(userAgentWallets)
      .set({
        currentBalance: newBalance.toString(),
        totalWinnings: newWinnings.toString(),
        totalLosses: newLosses.toString(),
        gamesPlayed: (agent.gamesPlayed || 0) + 1,
        gamesWon: won ? (agent.gamesWon || 0) + 1 : agent.gamesWon,
        lastPlayedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userAgentWallets.ownerAddress, addr));
  }

  /**
   * Get all enabled agents
   */
  static async getEnabledAgents(): Promise<UserAgentWallet[]> {
    if (!isDatabaseAvailable()) {
      return Array.from(agentWalletsCache.values()).filter(a => a.isEnabled);
    }

    return db!
      .select()
      .from(userAgentWallets)
      .where(eq(userAgentWallets.isEnabled, true));
  }

  /**
   * Get agent stats for display
   */
  static async getAgentStats(ownerAddress: string): Promise<AgentStats | null> {
    const agent = await this.getAgentByOwner(ownerAddress);
    if (!agent) return null;

    return {
      isEnabled: agent.isEnabled || false,
      agentAddress: agent.agentAddress,
      agentName: agent.agentName,
      personality: agent.personality,
      customPersonality: (agent as any).customPersonality || null,
      playStyle: agent.playStyle,
      autoChat: agent.autoChat || false,
      currentBalance: agent.currentBalance || '0',
      depositedAmount: agent.depositedAmount || '0',
      totalWinnings: agent.totalWinnings || '0',
      totalLosses: agent.totalLosses || '0',
      gamesPlayed: agent.gamesPlayed || 0,
      gamesWon: agent.gamesWon || 0,
      lastPlayedAt: agent.lastPlayedAt,
    };
  }

  /**
   * Sync agent balance from blockchain
   */
  static async syncBalance(ownerAddress: string): Promise<{ balance: string; synced: boolean }> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const rpcUrl = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get on-chain balance
    const balanceWei = await provider.getBalance(agent.agentAddress);
    const balanceEth = ethers.formatEther(balanceWei);

    // Update in DB
    if (!isDatabaseAvailable()) {
      agent.currentBalance = balanceEth;
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
    } else {
      await db!
        .update(userAgentWallets)
        .set({
          currentBalance: balanceEth,
          updatedAt: new Date(),
        })
        .where(eq(userAgentWallets.ownerAddress, addr));
    }

    return { balance: balanceEth, synced: true };
  }

  /**
   * Withdraw funds from agent wallet to owner
   */
  static async withdraw(
    ownerAddress: string,
    amount: string
  ): Promise<{ txHash: string; newBalance: string }> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Agent must be disabled to withdraw
    if (agent.isEnabled) {
      throw new Error('Disable agent before withdrawing');
    }

    const rpcUrl = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get current on-chain balance
    const balanceWei = await provider.getBalance(agent.agentAddress);
    const withdrawAmountWei = ethers.parseEther(amount);

    // Estimate gas for transfer
    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000n; // Standard ETH transfer
    const gasCost = gasLimit * (gasPrice.gasPrice || 0n);

    // Check if enough balance (amount + gas)
    if (balanceWei < withdrawAmountWei + gasCost) {
      const maxWithdraw = ethers.formatEther(balanceWei - gasCost);
      throw new Error(`Insufficient balance. Max withdraw: ${maxWithdraw} MON (after gas)`);
    }

    // Get agent wallet
    const privateKey = decryptPrivateKey(agent.encryptedPrivateKey);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Send transaction to owner
    const tx = await wallet.sendTransaction({
      to: addr,
      value: withdrawAmountWei,
      gasLimit: gasLimit,
    });

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    // Get new balance and update DB
    const newBalanceWei = await provider.getBalance(agent.agentAddress);
    const newBalance = ethers.formatEther(newBalanceWei);

    // Record transaction
    await AgentTransactionService.record(
      addr,
      agent.agentAddress,
      'withdraw',
      amount,
      tx.hash,
      `Withdrew ${amount} MON to owner wallet`
    );

    if (!isDatabaseAvailable()) {
      agent.currentBalance = newBalance;
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
    } else {
      await db!
        .update(userAgentWallets)
        .set({
          currentBalance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(userAgentWallets.ownerAddress, addr));
    }

    return { txHash: tx.hash, newBalance };
  }

  /**
   * Withdraw all funds from agent wallet (minus gas)
   */
  static async withdrawAll(ownerAddress: string): Promise<{ txHash: string; amount: string; newBalance: string }> {
    const addr = ownerAddress.toLowerCase();
    const agent = await this.getAgentByOwner(addr);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.isEnabled) {
      throw new Error('Disable agent before withdrawing');
    }

    const rpcUrl = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get current balance
    const balanceWei = await provider.getBalance(agent.agentAddress);

    // Estimate gas
    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000n;
    const gasCost = gasLimit * (gasPrice.gasPrice || 0n);

    if (balanceWei <= gasCost) {
      throw new Error('Balance too low to cover gas fees');
    }

    // Amount to send = balance - gas
    const sendAmount = balanceWei - gasCost;

    // Get agent wallet
    const privateKey = decryptPrivateKey(agent.encryptedPrivateKey);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: addr,
      value: sendAmount,
      gasLimit: gasLimit,
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    // Update balance in DB
    const newBalanceWei = await provider.getBalance(agent.agentAddress);
    const newBalance = ethers.formatEther(newBalanceWei);
    const withdrawnAmount = ethers.formatEther(sendAmount);

    // Record transaction
    await AgentTransactionService.record(
      addr,
      agent.agentAddress,
      'withdraw',
      withdrawnAmount,
      tx.hash,
      `Withdrew all (${withdrawnAmount} MON) to owner wallet`
    );

    if (!isDatabaseAvailable()) {
      agent.currentBalance = newBalance;
      agent.updatedAt = new Date();
      agentWalletsCache.set(addr, agent);
    } else {
      await db!
        .update(userAgentWallets)
        .set({
          currentBalance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(userAgentWallets.ownerAddress, addr));
    }

    return {
      txHash: tx.hash,
      amount: withdrawnAmount,
      newBalance,
    };
  }
}
