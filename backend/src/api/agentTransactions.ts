import { Router } from 'express';
import { AgentTransactionService } from '../services/agentTransactions.js';
import { ethers } from 'ethers';

const router = Router();

// Get transaction history
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const transactions = await AgentTransactionService.getHistory(address, limit, offset);
    const total = await AgentTransactionService.getCount(address);

    res.json({
      transactions,
      total,
      limit,
      offset,
      hasMore: offset + transactions.length < total,
    });
  } catch (error: any) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary
router.get('/:address/summary', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const summary = await AgentTransactionService.getSummary(address);
    res.json({ summary });
  } catch (error: any) {
    console.error('Error getting transaction summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
