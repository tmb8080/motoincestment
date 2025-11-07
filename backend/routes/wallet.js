const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { 
  getWalletStats, 
  getTransactionHistory, 
  calculateProjectedEarnings 
} = require('../services/walletService');
const WalletAddressService = require('../services/walletAddressService');

const prisma = new PrismaClient();

const router = express.Router();

// Get wallet statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getWalletStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet statistics',
      message: error.message
    });
  }
});

// Get transaction history with pagination
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL', 'REFERRAL_BONUS', 'WALLET_GROWTH', 'VIP_EARNINGS', 'VIP_PAYMENT', 'ADMIN_ADJUSTMENT']).withMessage('Invalid transaction type')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;

    const result = await getTransactionHistory(userId, page, limit, type);
    
    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction history',
      message: error.message
    });
  }
});

// Calculate projected earnings
router.get('/projected-earnings', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const projection = await calculateProjectedEarnings(userId, days);
    
    res.json({
      success: true,
      data: projection
    });
  } catch (error) {
    console.error('Error calculating projected earnings:', error);
    res.status(500).json({
      error: 'Failed to calculate projected earnings',
      message: error.message
    });
  }
});

// Withdraw VIP earnings
router.post('/withdraw-earnings', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Validate amount
    if (!amount || amount < 2) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is $2'
      });
    }

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Check if user has sufficient daily earnings
    if (wallet.dailyEarnings < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient daily earnings for withdrawal'
      });
    }

    // Check if user already withdrew today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (wallet.lastWithdrawal && wallet.lastWithdrawal >= today) {
      return res.status(400).json({
        success: false,
        message: 'You can only withdraw once per day'
      });
    }

    // Process withdrawal
    await prisma.$transaction(async (tx) => {
      // Update wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          dailyEarnings: {
            decrement: amount
          },
          balance: {
            increment: amount
          },
          lastWithdrawal: new Date()
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'VIP_EARNINGS',
          amount: amount,
          description: 'VIP earnings withdrawal to main balance'
        }
      });
    });

    res.json({
      success: true,
      message: 'Earnings withdrawn successfully',
      data: { amount }
    });
  } catch (error) {
    console.error('Error withdrawing earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw earnings'
    });
  }
});

// Get company wallet addresses for deposits
router.get('/company-addresses', authenticateToken, async (req, res) => {
  try {
    const companyAddresses = {
      BSC: process.env.BSC_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5",
      TRON: process.env.TRON_WALLET_ADDRESS || "TMWN4rYSzCHmhPe6xhhGhB5pcbHHMFUXth",
      POLYGON: process.env.POLYGON_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5",
      ETHEREUM: process.env.ETH_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5"
    };

    // Validate that all addresses are configured
    const missing = [];
    for (const [network, address] of Object.entries(companyAddresses)) {
      if (!address) {
        missing.push(network);
      }
    }

    if (missing.length > 0) {
      return res.status(500).json({
        error: 'Company wallet addresses not configured',
        message: `Missing addresses for networks: ${missing.join(', ')}`
      });
    }

    res.json({
      success: true,
      data: companyAddresses
    });

  } catch (error) {
    console.error('Error fetching company wallet addresses:', error);
    res.status(500).json({
      error: 'Failed to fetch company wallet addresses',
      message: 'An error occurred while fetching wallet addresses'
    });
  }
});

// Get user wallet addresses (deprecated - use company addresses instead)
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    // Return company addresses instead of user addresses
    const companyAddresses = {
      BSC: process.env.BSC_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5",
      TRON: process.env.TRON_WALLET_ADDRESS || "TMWN4rYSzCHmhPe6xhhGhB5pcbHHMFUXth",
      POLYGON: process.env.POLYGON_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5",
      ETHEREUM: process.env.ETH_WALLET_ADDRESS || "0x448e993f55dacf78180fd67c4381591f9f9042b5"
    };

    // Validate that all addresses are configured
    const missing = [];
    for (const [network, address] of Object.entries(companyAddresses)) {
      if (!address) {
        missing.push(network);
      }
    }

    if (missing.length > 0) {
      return res.status(500).json({
        error: 'Company wallet addresses not configured',
        message: `Missing addresses for networks: ${missing.join(', ')}`
      });
    }

    res.json({
      success: true,
      data: companyAddresses
    });

  } catch (error) {
    console.error('Error fetching wallet addresses:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet addresses',
      message: 'An error occurred while fetching wallet addresses'
    });
  }
});

/**
 * Get all active wallet addresses (admin only)
 */
router.get('/all-addresses', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    const addresses = await WalletAddressService.getAllActiveWalletAddresses();
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Error getting all wallet addresses:', error);
    res.status(500).json({
      error: 'Failed to get wallet addresses',
      message: error.message
    });
  }
});

module.exports = router;
