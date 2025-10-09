const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { updateWalletBalance } = require('../services/walletService');
const { sendEmail } = require('../services/emailService');
const { getNetworkFee, getAvailableNetworks } = require('../services/networkFeeService');
const { isValidCryptoAddress, generateTransactionRef } = require('../utils/helpers');
const { 
  verifyWithdrawalRequest, 
  processVerifiedWithdrawal,
  getWithdrawalStats 
} = require('../services/withdrawalVerificationService');
const { body: vbody, validationResult: vResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Public withdrawal config (min amounts, networks)
router.get('/config', async (req, res) => {
  try {
    const settings = await prisma.adminSettings.findFirst();
    const minWithdrawalAmount = parseFloat(settings?.minWithdrawalAmount || 2);
    const minUsdcWithdrawalAmount = parseFloat(settings?.minUsdcWithdrawalAmount || settings?.minWithdrawalAmount || 2);

    res.json({
      success: true,
      data: {
        minWithdrawalAmount,
        minUsdcWithdrawalAmount,
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawal config:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal config', message: error.message });
  }
});

// Request withdrawal
router.post('/request', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
  body('currency').isIn(['BTC', 'USDT', 'USDC', 'USDT_USDC']).withMessage('Invalid currency'),
  body('walletAddress').notEmpty().withMessage('Wallet address is required'),
  body('network').optional().isIn(['BEP20', 'POLYGON', 'ARBITRUM', 'OPTIMISM']).withMessage('Invalid network')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency, walletAddress, network } = req.body;
    const userId = req.user.id;

    // Check admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings || !settings.isWithdrawalEnabled) {
      return res.status(400).json({
        error: 'Withdrawals are currently disabled',
        message: 'Please try again later'
      });
    }

    // Check minimum withdrawal amount based on currency
    let minAmount;
    if (currency === 'USDC') {
      minAmount = parseFloat(settings.minUsdcWithdrawalAmount || settings.minWithdrawalAmount);
    } else if (currency === 'USDT') {
      // USDT should use the general minimum withdrawal amount (10)
      minAmount = parseFloat(settings.minWithdrawalAmount);
    } else {
      minAmount = parseFloat(settings.minWithdrawalAmount);
    }

    if (parseFloat(amount) < minAmount) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum withdrawal amount for ${currency} is ${minAmount}`
      });
    }

    // Validate crypto address
    if (!isValidCryptoAddress(walletAddress, currency)) {
      return res.status(400).json({
        error: 'Invalid wallet address',
        message: `Please provide a valid ${currency} wallet address`
      });
    }

    // Check user's wallet balance - only allow withdrawals from earnings and bonuses
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(400).json({
        error: 'Wallet not found',
        message: 'Please contact support'
      });
    }

    // Calculate withdrawable balance (earnings + bonuses, excluding deposits)
    // Use the same calculation logic as getWalletStats
    const dailyTaskEarnings = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'VIP_EARNINGS'
      },
      _sum: { amount: true }
    });

    const referralBonuses = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'REFERRAL_BONUS'
      },
      _sum: { amount: true }
    });

    console.log('Backend withdrawal validation - calculated earnings:', {
      dailyTaskEarnings: dailyTaskEarnings._sum.amount,
      referralBonuses: referralBonuses._sum.amount,
      walletTotalEarnings: wallet.totalEarnings,
      walletTotalReferralBonus: wallet.totalReferralBonus,
      walletDailyEarnings: wallet.dailyEarnings
    });
    
    const withdrawableBalance = parseFloat(dailyTaskEarnings._sum.amount || 0) + 
                               parseFloat(referralBonuses._sum.amount || 0);

    console.log('Backend calculated withdrawable balance:', withdrawableBalance);
    console.log('Requested amount:', parseFloat(amount));

    if (withdrawableBalance < parseFloat(amount)) {
      console.log('Insufficient withdrawable balance error triggered');
      return res.status(400).json({
        error: 'Insufficient withdrawable balance',
        message: `You can only withdraw from earnings and bonuses. Available: ${withdrawableBalance.toFixed(2)}, Requested: ${amount}. Deposited amounts can only be used for VIP purchases.`
      });
    }

    // Check for pending withdrawals
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    if (pendingWithdrawal) {
      return res.status(400).json({
        error: 'Pending withdrawal exists',
        message: 'You already have a pending withdrawal request'
      });
    }

    // Calculate fee based on admin settings
    // Try tiered fee first
    let computedFee = 0;
    const amountFloat = parseFloat(amount);
    const activeTiers = await prisma.withdrawalFeeTier.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' }
    });
    const matched = activeTiers.find(t => {
      const minA = parseFloat(t.minAmount);
      const maxA = t.maxAmount != null ? parseFloat(t.maxAmount) : Infinity;
      return amountFloat >= minA && amountFloat <= maxA;
    });
    if (matched) {
      computedFee = amountFloat * parseFloat(matched.percent);
    } else {
      // Fallback to global
      const feeFixed = parseFloat(settings.withdrawalFeeFixed || 0);
      const feePercent = parseFloat(settings.withdrawalFeePercent || 0);
      computedFee = amountFloat * feePercent + feeFixed;
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: parseFloat(amount),
        feeAmount: parseFloat(computedFee.toFixed(8)),
        currency,
        network: network || null,
        walletAddress,
        status: 'PENDING'
      }
    });

    // Send notification email
    try {
      await sendEmail({
        to: req.user.email,
        template: 'withdrawalRequest',
        data: {
          fullName: req.user.fullName,
        amount: amount,
        fee: computedFee,
          currency: currency,
          walletAddress: walletAddress,
          requestId: withdrawal.id
        }
      });
    } catch (emailError) {
      console.error('Failed to send withdrawal request email:', emailError);
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({
      error: 'Failed to create withdrawal request',
      message: error.message
    });
  }
});

// Get withdrawal history
router.get('/history', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED']).withMessage('Invalid status')
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
    const status = req.query.status;

    const skip = (page - 1) * limit;
    
    const whereClause = {
      userId,
      ...(status && { status })
    };

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      
      prisma.withdrawal.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({
      error: 'Failed to fetch withdrawal history',
      message: error.message
    });
  }
});

// Admin: Get all withdrawal requests
router.get('/admin/requests', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED']).withMessage('Invalid status')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const skip = (page - 1) * limit;
    
    const whereClause = status ? { status } : {};

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      
      prisma.withdrawal.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({
      error: 'Failed to fetch withdrawal requests',
      message: error.message
    });
  }
});

// Admin: Process withdrawal (approve/reject)
router.put('/admin/:withdrawalId/process', [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes too long'),
  body('transactionHash').optional().isLength({ min: 10, max: 100 }).withMessage('Invalid transaction hash')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { withdrawalId } = req.params;
    const { action, adminNotes, transactionHash } = req.body;
    const adminId = req.user.id;

    // Get withdrawal request
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!withdrawal) {
      return res.status(404).json({
        error: 'Withdrawal request not found'
      });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Withdrawal already processed',
        message: `Current status: ${withdrawal.status}`
      });
    }

    let newStatus;
    let updateData = {
      adminNotes,
      processedBy: adminId,
      processedAt: new Date()
    };

    if (action === 'approve') {
      newStatus = 'APPROVED';
      if (transactionHash) {
        updateData.transactionHash = transactionHash;
        newStatus = 'COMPLETED';
      }
    } else {
      newStatus = 'REJECTED';
      
      // If rejected, restore user's balance
      await updateWalletBalance(
        withdrawal.userId,
        withdrawal.amount,
        'ADMIN_ADJUSTMENT',
        'Withdrawal rejected - balance restored',
        withdrawalId
      );
    }

    updateData.status = newStatus;

    // Update withdrawal
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: updateData
    });

    res.json({
      success: true,
      message: `Withdrawal ${action}d successfully`,
      data: updatedWithdrawal
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      error: 'Failed to process withdrawal',
      message: error.message
    });
  }
});

// Admin: Verify withdrawal request before processing
router.post('/admin/:withdrawalId/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    // Verify the withdrawal request
    const verificationResult = await verifyWithdrawalRequest(withdrawalId);

    res.json({
      success: true,
      message: verificationResult.message,
      data: verificationResult
    });

  } catch (error) {
    console.error('Error verifying withdrawal request:', error);
    res.status(500).json({
      error: 'Failed to verify withdrawal request',
      message: error.message
    });
  }
});

// Admin: Process verified withdrawal
router.post('/admin/:withdrawalId/process-verified', [
  body('transactionHash').optional().isLength({ min: 10, max: 100 }).withMessage('Invalid transaction hash')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { withdrawalId } = req.params;
    const { transactionHash } = req.body;
    const adminId = req.user.id;

    // Process the verified withdrawal
    const result = await processVerifiedWithdrawal(withdrawalId, adminId, transactionHash);

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('Error processing verified withdrawal:', error);
    res.status(500).json({
      error: 'Failed to process verified withdrawal',
      message: error.message
    });
  }
});

// Get network fees for a currency
router.get('/network-fees/:currency', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.params;
    
    const networks = await getAvailableNetworks(currency);
    
    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    console.error('Error fetching network fees:', error);
    res.status(500).json({
      error: 'Failed to fetch network fees',
      message: error.message
    });
  }
});

// Get withdrawal statistics for user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await getWithdrawalStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({
      error: 'Failed to fetch withdrawal statistics',
      message: error.message
    });
  }
});

module.exports = router;
// Fee preview endpoint for frontend
router.post('/preview-fee', [
  vbody('amount').isFloat({ min: 0.01 }),
], authenticateToken, async (req, res) => {
  try {
    const errors = vResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const { amount } = req.body;
    const amountFloat = parseFloat(amount);
    const settings = await prisma.adminSettings.findFirst();
    const activeTiers = await prisma.withdrawalFeeTier.findMany({ where: { isActive: true }, orderBy: { minAmount: 'asc' } });
    let fee = 0;
    const matched = activeTiers.find(t => {
      const minA = parseFloat(t.minAmount);
      const maxA = t.maxAmount != null ? parseFloat(t.maxAmount) : Infinity;
      return amountFloat >= minA && amountFloat <= maxA;
    });
    if (matched) {
      fee = amountFloat * parseFloat(matched.percent);
    } else {
      const feeFixed = parseFloat(settings?.withdrawalFeeFixed || 0);
      const feePercent = parseFloat(settings?.withdrawalFeePercent || 0);
      fee = amountFloat * feePercent + feeFixed;
    }
    const net = amountFloat - fee;
    res.json({ success: true, data: { amount: amountFloat, fee: parseFloat(fee.toFixed(8)), net: parseFloat(net.toFixed(8)) } });
  } catch (error) {
    console.error('Error previewing fee:', error);
    res.status(500).json({ error: 'Failed to preview fee', message: error.message });
  }
});
