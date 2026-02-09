import { Router } from 'express';
import { UserAgentService } from '../services/userAgent.js';
import { ethers } from 'ethers';

const router = Router();

// Get user's agent
router.get('/me/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const agent = await UserAgentService.getAgentByOwner(ownerAddress);
    if (!agent) {
      return res.json({ agent: null });
    }

    // Don't send encrypted private key to client
    const { encryptedPrivateKey, ...safeAgent } = agent;
    res.json({ agent: safeAgent });
  } catch (error: any) {
    console.error('Error getting agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create agent wallet
router.post('/create', async (req, res) => {
  try {
    const { ownerAddress } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const agent = await UserAgentService.getOrCreateAgent(ownerAddress);
    const { encryptedPrivateKey, ...safeAgent } = agent;

    res.json({
      agent: safeAgent,
      message: 'Agent wallet created. Send MON to the agent address to fund it.'
    });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enable/disable agent
router.post('/enable', async (req, res) => {
  try {
    const { ownerAddress, enabled } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const agent = await UserAgentService.setAgentEnabled(ownerAddress, enabled);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { encryptedPrivateKey, ...safeAgent } = agent;
    res.json({
      agent: safeAgent,
      message: enabled ? 'Agent enabled! It will start playing automatically.' : 'Agent disabled.'
    });
  } catch (error: any) {
    console.error('Error enabling agent:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update agent config
router.post('/config', async (req, res) => {
  try {
    const { ownerAddress, config } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const agent = await UserAgentService.updateAgentConfig(ownerAddress, config);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { encryptedPrivateKey, ...safeAgent } = agent;
    res.json({ agent: safeAgent });
  } catch (error: any) {
    console.error('Error updating agent config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent stats
router.get('/stats/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const stats = await UserAgentService.getAgentStats(ownerAddress);
    if (!stats) {
      return res.json({ stats: null });
    }

    res.json({ stats });
  } catch (error: any) {
    console.error('Error getting agent stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record deposit (called after user confirms deposit tx)
router.post('/deposit', async (req, res) => {
  try {
    const { ownerAddress, amount, txHash } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const agent = await UserAgentService.recordDeposit(ownerAddress, amount);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { encryptedPrivateKey, ...safeAgent } = agent;
    res.json({
      agent: safeAgent,
      message: `Deposited ${amount} MON to agent wallet`
    });
  } catch (error: any) {
    console.error('Error recording deposit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync balance from blockchain
router.post('/sync', async (req, res) => {
  try {
    const { ownerAddress } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = await UserAgentService.syncBalance(ownerAddress);

    // Get updated agent
    const agent = await UserAgentService.getAgentByOwner(ownerAddress);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { encryptedPrivateKey, ...safeAgent } = agent;
    res.json({
      agent: safeAgent,
      balance: result.balance,
      message: `Balance synced: ${result.balance} MON`
    });
  } catch (error: any) {
    console.error('Error syncing balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Withdraw funds to owner
router.post('/withdraw', async (req, res) => {
  try {
    const { ownerAddress, amount } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const result = await UserAgentService.withdraw(ownerAddress, amount);

    // Get updated agent
    const agent = await UserAgentService.getAgentByOwner(ownerAddress);
    const safeAgent = agent ? (({ encryptedPrivateKey, ...rest }) => rest)(agent) : null;

    res.json({
      agent: safeAgent,
      txHash: result.txHash,
      newBalance: result.newBalance,
      message: `Withdrew ${amount} MON to your wallet`
    });
  } catch (error: any) {
    console.error('Error withdrawing:', error);
    res.status(400).json({ error: error.message });
  }
});

// Withdraw all funds to owner
router.post('/withdraw-all', async (req, res) => {
  try {
    const { ownerAddress } = req.body;
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = await UserAgentService.withdrawAll(ownerAddress);

    // Get updated agent
    const agent = await UserAgentService.getAgentByOwner(ownerAddress);
    const safeAgent = agent ? (({ encryptedPrivateKey, ...rest }) => rest)(agent) : null;

    res.json({
      agent: safeAgent,
      txHash: result.txHash,
      amount: result.amount,
      newBalance: result.newBalance,
      message: `Withdrew ${result.amount} MON to your wallet`
    });
  } catch (error: any) {
    console.error('Error withdrawing all:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
