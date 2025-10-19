const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  getSystemStats, 
  getUserManagementData, 
  toggleUserStatus,
  getAdminSettings,
  updateAdminSettings,
  getReferralTree,
  getUserDailyEarnings
} = require('../services/adminService');
const { 
  createOrUpdateVipLevels,
  getAllVipLevels,
  getVipLevelById,
  getAllVipLevelsAdmin,
  createVipLevel,
  updateVipLevel,
  deleteVipLevel
} = require('../services/vipService');
const TransactionVerificationService = require('../services/transactionVerificationService');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      error: 'Failed to fetch system statistics',
      message: error.message
    });
  }
});

// Get all withdrawals (admin)
router.get('/withdrawals', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'REJECTED']).withMessage('Invalid status'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
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
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
        { transactionHash: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              wallet: {
                select: {
                  balance: true,
                  totalEarnings: true,
                  totalReferralBonus: true,
                  totalDeposits: true,
                  dailyEarnings: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.withdrawal.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({
      error: 'Failed to fetch withdrawals',
      message: error.message
    });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            wallet: {
              select: {
                balance: true,
                totalEarnings: true,
                totalReferralBonus: true,
                totalDeposits: true,
                dailyEarnings: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total withdrawn for each user (excluding fees - admin pays fees)
    const withdrawalsWithTotalWithdrawn = await Promise.all(
      withdrawals.map(async (withdrawal) => {
        // Get total withdrawn from withdrawal table (original amounts without fees)
        const totalWithdrawn = await prisma.withdrawal.aggregate({
          where: {
            userId: withdrawal.userId,
            status: { in: ['COMPLETED', 'APPROVED'] }
          },
          _sum: { amount: true }
        });

        return {
          ...withdrawal,
          user: {
            ...withdrawal.user,
            wallet: {
              ...withdrawal.user.wallet,
              totalWithdrawn: parseFloat(totalWithdrawn._sum.amount || 0)
            }
          }
        };
      })
    );

    res.json({
      success: true,
      data: withdrawalsWithTotalWithdrawn
    });
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    res.status(500).json({
      error: 'Failed to fetch pending withdrawals',
      message: error.message
    });
  }
});

// Update withdrawal details (admin only)
router.put('/withdrawals/:id', [
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('walletAddress').optional().isLength({ min: 10, max: 100 }).withMessage('Wallet address must be between 10 and 100 characters'),
  body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes must be less than 500 characters'),
  body('currency').optional().isIn(['USDT', 'BTC', 'ETH']).withMessage('Invalid currency'),
  body('network').optional().isIn(['TRC20', 'ERC20', 'BTC', 'ETH']).withMessage('Invalid network')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { amount, walletAddress, adminNotes, currency, network } = req.body;

    // Get withdrawal
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!withdrawal) {
      return res.status(404).json({
        error: 'Withdrawal not found'
      });
    }

    // Only allow editing if withdrawal is still pending
    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Can only edit pending withdrawals'
      });
    }

    // Update withdrawal
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id },
      data: {
        ...(amount && { amount: amount.toString() }),
        ...(walletAddress && { walletAddress }),
        ...(adminNotes && { adminNotes }),
        ...(currency && { currency }),
        ...(network && { network }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Withdrawal updated successfully',
      data: updatedWithdrawal
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    res.status(500).json({
      error: 'Failed to update withdrawal',
      message: error.message
    });
  }
});

// Process withdrawal (approve/reject)
router.patch('/withdrawals/:id/process', [
  body('action').isIn(['APPROVE', 'REJECT']).withMessage('Action must be APPROVE or REJECT'),
  body('transactionHash').optional().isLength({ min: 10, max: 100 }).withMessage('Transaction hash must be between 10 and 100 characters'),
  body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { action, transactionHash, adminNotes } = req.body;
    const adminId = req.user.id;

    // Get withdrawal
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!withdrawal) {
      return res.status(404).json({
        error: 'Withdrawal not found',
        message: 'The specified withdrawal does not exist'
      });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Invalid withdrawal status',
        message: 'Only pending withdrawals can be processed'
      });
    }

    // Process withdrawal in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData = {
        status: action === 'APPROVE' ? 'COMPLETED' : 'REJECTED',
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes: adminNotes || null
      };

      if (action === 'APPROVE' && transactionHash) {
        updateData.transactionHash = transactionHash;
      }

      // Update withdrawal
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id },
        data: updateData
      });

      // If approved, deduct only withdrawal amount from user's wallet (fees paid by system)
      if (action === 'APPROVE') {
        const feeAmount = parseFloat(withdrawal.feeAmount || 0);
        const withdrawalAmount = parseFloat(withdrawal.amount);
        
        // Get current wallet
        const currentWallet = await tx.wallet.findUnique({ 
          where: { userId: withdrawal.userId } 
        });
        
        // Calculate proportional deduction from earnings vs bonuses
        const totalEarnings = parseFloat(currentWallet.totalEarnings || 0);
        const totalBonuses = parseFloat(currentWallet.totalReferralBonus || 0);
        const dailyEarnings = parseFloat(currentWallet.dailyEarnings || 0);
        const totalWithdrawable = totalEarnings + totalBonuses;
        
        let earningsDeduction = 0;
        let bonusDeduction = 0;
        let dailyEarningsDeduction = 0;
        
        if (totalWithdrawable > 0) {
          const earningsRatio = totalEarnings / totalWithdrawable;
          const bonusRatio = totalBonuses / totalWithdrawable;
          
          earningsDeduction = withdrawalAmount * earningsRatio;
          bonusDeduction = withdrawalAmount * bonusRatio;
          
          // Calculate daily earnings deduction (proportional to total earnings)
          if (totalEarnings > 0) {
            dailyEarningsDeduction = (earningsDeduction / totalEarnings) * dailyEarnings;
          }
        }
        
        // Calculate new balance
        const currentBalance = parseFloat(currentWallet.balance);
        let newBalance = Math.max(0, currentBalance - withdrawalAmount);
        
        await tx.wallet.update({
          where: { userId: withdrawal.userId },
          data: {
            balance: newBalance,
            totalEarnings: {
              decrement: earningsDeduction
            },
            totalReferralBonus: {
              decrement: bonusDeduction
            },
            dailyEarnings: {
              decrement: dailyEarningsDeduction
            }
          }
        });

        // Create transaction record (only withdrawal amount, fees paid by system)
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            type: 'WITHDRAWAL',
            amount: parseFloat(withdrawal.amount), // Only withdrawal amount, not + fee
            description: `Withdrawal processed: ${withdrawal.currency} via ${withdrawal.network} (fee ${feeAmount} paid by system)`,
            referenceId: withdrawal.id,
            metadata: {
              withdrawalId: withdrawal.id,
              currency: withdrawal.currency,
              network: withdrawal.network,
              transactionHash: transactionHash
            }
          }
        });
      }

      return updatedWithdrawal;
    });

    // Send email notification to user
    try {
      const { sendEmail } = require('../services/emailService');
      await sendEmail({
        to: withdrawal.user.email,
        template: action === 'APPROVE' ? 'withdrawalApproved' : 'withdrawalRejected',
        data: {
          fullName: withdrawal.user.fullName,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          network: withdrawal.network,
          walletAddress: withdrawal.walletAddress,
          transactionHash: transactionHash,
          adminNotes: adminNotes,
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
        }
      });
    } catch (emailError) {
      console.error('Failed to send withdrawal notification email:', emailError);
    }

    res.json({
      success: true,
      message: `Withdrawal ${action.toLowerCase()}d successfully`,
      data: result
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      error: 'Failed to process withdrawal',
      message: error.message
    });
  }
});

// Get all deposits (admin)
router.get('/deposits', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'REJECTED']).withMessage('Invalid status'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
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
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { transactionHash: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
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
      prisma.deposit.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: deposits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({
      error: 'Failed to fetch deposits',
      message: error.message
    });
  }
});

// Get pending deposits
router.get('/deposits/pending', async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: deposits
    });
  } catch (error) {
    console.error('Error fetching pending deposits:', error);
    res.status(500).json({
      error: 'Failed to fetch pending deposits',
      message: error.message
    });
  }
});

// Process deposit (approve/reject)
router.patch('/deposits/:id/process', [
  body('action').isIn(['APPROVE', 'REJECT']).withMessage('Action must be APPROVE or REJECT'),
  body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
  body('transactionHash').optional().isString().withMessage('Transaction hash must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { action, adminNotes, transactionHash } = req.body;

    // Find the deposit
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found'
      });
    }

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Can only process pending deposits'
      });
    }

    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // Update deposit status
      const updatedDeposit = await tx.deposit.update({
        where: { id },
        data: {
          status: action === 'APPROVE' ? 'CONFIRMED' : 'REJECTED',
          adminNotes: adminNotes || null,
          updatedAt: new Date()
        }
      });

      if (action === 'APPROVE') {
        // Get or create user's wallet
        let wallet = await tx.wallet.findUnique({
          where: { userId: deposit.userId }
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: deposit.userId }
          });
        }

        // Update wallet balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: parseFloat(deposit.amount)
            }
          }
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'DEPOSIT',
            amount: parseFloat(deposit.amount),
            description: `Deposit confirmed - ${deposit.currency}`,
            referenceId: deposit.id,
            metadata: {
              depositId: deposit.id,
              transactionHash: transactionHash || deposit.transactionHash
            }
          }
        });

        // Note: Referral bonuses are now only processed when users join VIP levels
        // Deposit-based referral bonuses have been removed
      }
    });

    res.json({
      success: true,
      message: `Deposit ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({
      error: 'Failed to process deposit',
      message: error.message
    });
  }
});

// Get user management data
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
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
    const search = req.query.search || '';

    const result = await getUserManagementData(page, limit, search);
    
    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user management data:', error);
    res.status(500).json({
      error: 'Failed to fetch user data',
      message: error.message
    });
  }
});

// Toggle user status (active/inactive)
router.put('/users/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    const updatedUser = await toggleUserStatus(userId);
    
    res.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: updatedUser.id,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      message: error.message
    });
  }
});

// Get referral tree for a user
router.get('/users/:userId/referral-tree', [
  query('depth').optional().isInt({ min: 1, max: 5 }).withMessage('Depth must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const depth = parseInt(req.query.depth) || 3;

    const tree = await getReferralTree(userId, depth);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error fetching referral tree:', error);
    res.status(500).json({
      error: 'Failed to fetch referral tree',
      message: error.message
    });
  }
});

// Get daily earnings history for a user
router.get('/users/:userId/daily-earnings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('dateFilter').optional().isIn(['all', 'week', 'month', 'year']).withMessage('Invalid date filter'),
  query('sortBy').optional().isIn(['date', 'amount']).withMessage('Invalid sort option')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const dateFilter = req.query.dateFilter || 'all';
    const sortBy = req.query.sortBy || 'date';

    const earnings = await getUserDailyEarnings(userId, {
      page,
      limit,
      dateFilter,
      sortBy
    });
    
    res.json({
      success: true,
      data: earnings
    });
  } catch (error) {
    console.error('Error fetching daily earnings:', error);
    res.status(500).json({
      error: 'Failed to fetch daily earnings',
      message: error.message
    });
  }
});

// Get user deposits
router.get('/users/:userId/deposits', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get deposits for the specific user
    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.deposit.count({ where: { userId } })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: deposits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching user deposits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user deposits',
      message: error.message
    });
  }
});

// Get user withdrawals
router.get('/users/:userId/withdrawals', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get withdrawals for the specific user
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.withdrawal.count({ where: { userId } })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching user withdrawals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user withdrawals',
      message: error.message
    });
  }
});

// Get admin settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getAdminSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({
      error: 'Failed to fetch admin settings',
      message: error.message
    });
  }
});

// Withdrawal Fee Tiers - Admin CRUD
router.get('/withdrawal-fee-tiers', async (req, res) => {
  try {
    let tiers;
    if (prisma.withdrawalFeeTier) {
      tiers = await prisma.withdrawalFeeTier.findMany({ orderBy: { minAmount: 'asc' } });
    } else {
      // Fallback to raw query if delegate is unavailable
      tiers = await prisma.$queryRawUnsafe('SELECT * FROM "withdrawal_fee_tiers" ORDER BY "minAmount" ASC');
    }
    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error('Error fetching fee tiers:', error);
    res.status(500).json({ error: 'Failed to fetch fee tiers', message: error.message });
  }
});

router.post('/withdrawal-fee-tiers', [
  body('minAmount').isFloat({ min: 0 }).withMessage('minAmount must be >= 0'),
  body('maxAmount').optional().isFloat({ min: 0 }).withMessage('maxAmount must be >= 0'),
  body('percent').isFloat({ min: 0, max: 1 }).withMessage('percent must be 0..1'),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Overlap validation
    const minAmount = parseFloat(req.body.minAmount);
    const maxAmount = req.body.maxAmount != null ? parseFloat(req.body.maxAmount) : null;
    if (maxAmount != null && maxAmount < minAmount) {
      return res.status(400).json({ error: 'Validation failed', message: 'maxAmount must be >= minAmount' });
    }
    const existing = prisma.withdrawalFeeTier
      ? await prisma.withdrawalFeeTier.findMany({ where: { isActive: true } })
      : await prisma.$queryRawUnsafe('SELECT * FROM "withdrawal_fee_tiers" WHERE "isActive" = true');
    const overlaps = existing.some(t => {
      const tMin = parseFloat(t.minAmount);
      const tMax = t.maxAmount != null ? parseFloat(t.maxAmount) : Infinity;
      const newMin = minAmount;
      const newMax = maxAmount != null ? maxAmount : Infinity;
      return !(newMax < tMin || newMin > tMax);
    });
    if (overlaps) {
      return res.status(400).json({ error: 'Validation failed', message: 'Tier range overlaps with an existing active tier' });
    }

    let tier;
    if (prisma.withdrawalFeeTier) {
      tier = await prisma.withdrawalFeeTier.create({
        data: {
          minAmount: minAmount.toString(),
          maxAmount: maxAmount != null ? maxAmount.toString() : null,
          percent: req.body.percent.toString(),
          isActive: req.body.isActive != null ? req.body.isActive : true
        }
      });
    } else {
      const rows = await prisma.$queryRawUnsafe(
        'INSERT INTO "withdrawal_fee_tiers" ("minAmount","maxAmount","percent","isActive") VALUES ($1,$2,$3,$4) RETURNING *',
        minAmount.toString(),
        maxAmount != null ? maxAmount.toString() : null,
        req.body.percent.toString(),
        req.body.isActive != null ? !!req.body.isActive : true
      );
      tier = Array.isArray(rows) ? rows[0] : rows;
    }

    res.json({ success: true, message: 'Fee tier created', data: tier });
  } catch (error) {
    console.error('Error creating fee tier:', error);
    res.status(500).json({ error: 'Failed to create fee tier', message: error.message });
  }
});

router.put('/withdrawal-fee-tiers/:id', [
  body('minAmount').optional().isFloat({ min: 0 }),
  body('maxAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('percent').optional().isFloat({ min: 0, max: 1 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { id } = req.params;
    const data = {};
    if (req.body.minAmount != null) data.minAmount = req.body.minAmount.toString();
    if (req.body.maxAmount !== undefined) data.maxAmount = req.body.maxAmount != null ? req.body.maxAmount.toString() : null;
    if (req.body.percent != null) data.percent = req.body.percent.toString();
    if (req.body.isActive != null) data.isActive = req.body.isActive;

    // Overlap validation against others
    const current = prisma.withdrawalFeeTier
      ? await prisma.withdrawalFeeTier.findUnique({ where: { id } })
      : (await prisma.$queryRawUnsafe('SELECT * FROM "withdrawal_fee_tiers" WHERE id = $1 LIMIT 1', id))[0];
    if (!current) {
      return res.status(404).json({ error: 'Fee tier not found' });
    }
    const newMin = data.minAmount != null ? parseFloat(data.minAmount) : parseFloat(current.minAmount);
    const newMax = data.maxAmount !== undefined ? (data.maxAmount != null ? parseFloat(data.maxAmount) : null) : (current.maxAmount != null ? parseFloat(current.maxAmount) : null);
    if (newMax != null && newMax < newMin) {
      return res.status(400).json({ error: 'Validation failed', message: 'maxAmount must be >= minAmount' });
    }
    const others = prisma.withdrawalFeeTier
      ? await prisma.withdrawalFeeTier.findMany({ where: { id: { not: id }, isActive: true } })
      : await prisma.$queryRawUnsafe('SELECT * FROM "withdrawal_fee_tiers" WHERE id <> $1 AND "isActive" = true', id);
    const overlaps = others.some(t => {
      const tMin = parseFloat(t.minAmount);
      const tMax = t.maxAmount != null ? parseFloat(t.maxAmount) : Infinity;
      const thisMax = newMax != null ? newMax : Infinity;
      return !(thisMax < tMin || newMin > tMax);
    });
    if (overlaps) {
      return res.status(400).json({ error: 'Validation failed', message: 'Updated tier overlaps with an existing active tier' });
    }

    let tier;
    if (prisma.withdrawalFeeTier) {
      tier = await prisma.withdrawalFeeTier.update({ where: { id }, data });
    } else {
      // Build dynamic update
      const fields = [];
      const values = [];
      let idx = 1;
      if (data.minAmount !== undefined) { fields.push(`"minAmount" = $${idx++}`); values.push(data.minAmount); }
      if (data.maxAmount !== undefined) { fields.push(`"maxAmount" = $${idx++}`); values.push(data.maxAmount); }
      if (data.percent !== undefined) { fields.push(`"percent" = $${idx++}`); values.push(data.percent); }
      if (data.isActive !== undefined) { fields.push(`"isActive" = $${idx++}`); values.push(data.isActive); }
      values.push(id);
      const sql = `UPDATE "withdrawal_fee_tiers" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const rows = await prisma.$queryRawUnsafe(sql, ...values);
      tier = Array.isArray(rows) ? rows[0] : rows;
    }
    res.json({ success: true, message: 'Fee tier updated', data: tier });
  } catch (error) {
    console.error('Error updating fee tier:', error);
    res.status(500).json({ error: 'Failed to update fee tier', message: error.message });
  }
});

router.delete('/withdrawal-fee-tiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (prisma.withdrawalFeeTier) {
      await prisma.withdrawalFeeTier.delete({ where: { id } });
    } else {
      await prisma.$executeRawUnsafe('DELETE FROM "withdrawal_fee_tiers" WHERE id = $1', id);
    }
    res.json({ success: true, message: 'Fee tier deleted' });
  } catch (error) {
    console.error('Error deleting fee tier:', error);
    res.status(500).json({ error: 'Failed to delete fee tier', message: error.message });
  }
});

// Validate tiers coverage and overlaps (diagnostic)
router.get('/withdrawal-fee-tiers/validate', async (req, res) => {
  try {
    const tiers = prisma.withdrawalFeeTier
      ? await prisma.withdrawalFeeTier.findMany({ where: { isActive: true } })
      : await prisma.$queryRawUnsafe('SELECT * FROM "withdrawal_fee_tiers" WHERE "isActive" = true');
    const mapped = tiers.map(t => ({
      id: t.id,
      min: parseFloat(t.minAmount),
      max: t.maxAmount != null ? parseFloat(t.maxAmount) : Infinity,
      percent: parseFloat(t.percent)
    })).sort((a,b) => a.min - b.min);

    // Detect overlaps
    const overlaps = [];
    for (let i = 1; i < mapped.length; i++) {
      if (mapped[i].min <= mapped[i-1].max) {
        overlaps.push({ a: mapped[i-1].id, b: mapped[i].id });
      }
    }

    // Detect gaps from 0 upward
    const gaps = [];
    let cursor = 0;
    for (const t of mapped) {
      if (t.min > cursor) {
        gaps.push({ from: cursor, to: t.min });
      }
      cursor = Math.max(cursor, t.max);
      if (!isFinite(cursor)) break;
    }
    const coveredToInfinity = mapped.length > 0 && !isFinite(mapped[mapped.length - 1].max);

    res.json({ success: true, data: { overlaps, gaps, coveredToInfinity } });
  } catch (error) {
    console.error('Error validating fee tiers:', error);
    res.status(500).json({ error: 'Failed to validate fee tiers', message: error.message });
  }
});

// Update admin settings (PUT method)
router.put('/settings', [
  body('dailyGrowthRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Daily growth rate must be between 0 and 1'),
  body('referralBonusLevel1Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 1 rate must be between 0 and 1'),
  body('referralBonusLevel2Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 2 rate must be between 0 and 1'),
  body('referralBonusLevel3Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 3 rate must be between 0 and 1'),
  body('minDepositAmount').optional().isFloat({ min: 0 }).withMessage('Minimum deposit amount must be positive'),
  body('minWithdrawalAmount').optional().isFloat({ min: 0 }).withMessage('Minimum withdrawal amount must be positive'),
  body('withdrawalFeeFixed').optional().isFloat({ min: 0 }).withMessage('Withdrawal fixed fee must be positive'),
  body('withdrawalFeePercent').optional().isFloat({ min: 0, max: 1 }).withMessage('Withdrawal fee percent must be between 0 and 1'),
  body('isDepositEnabled').optional().isBoolean().withMessage('Deposit enabled must be boolean'),
  body('isWithdrawalEnabled').optional().isBoolean().withMessage('Withdrawal enabled must be boolean'),
  body('isRegistrationEnabled').optional().isBoolean().withMessage('Registration enabled must be boolean'),
  body('maintenanceMode').optional().isBoolean().withMessage('Maintenance mode must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const updates = req.body;
    const updatedSettings = await updateAdminSettings(updates);
    
    res.json({
      success: true,
      message: 'Admin settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({
      error: 'Failed to update admin settings',
      message: error.message
    });
  }
});

// Update admin settings (PATCH method - for frontend compatibility)
router.patch('/settings', [
  body('dailyGrowthRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Daily growth rate must be between 0 and 1'),
  body('referralBonusLevel1Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 1 rate must be between 0 and 1'),
  body('referralBonusLevel2Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 2 rate must be between 0 and 1'),
  body('referralBonusLevel3Rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Level 3 rate must be between 0 and 1'),
  body('minDepositAmount').optional().isFloat({ min: 0 }).withMessage('Minimum deposit amount must be positive'),
  body('minWithdrawalAmount').optional().isFloat({ min: 0 }).withMessage('Minimum withdrawal amount must be positive'),
  body('withdrawalFeeFixed').optional().isFloat({ min: 0 }).withMessage('Withdrawal fixed fee must be positive'),
  body('withdrawalFeePercent').optional().isFloat({ min: 0, max: 1 }).withMessage('Withdrawal fee percent must be between 0 and 1'),
  body('isDepositEnabled').optional().isBoolean().withMessage('Deposit enabled must be boolean'),
  body('isWithdrawalEnabled').optional().isBoolean().withMessage('Withdrawal enabled must be boolean'),
  body('isRegistrationEnabled').optional().isBoolean().withMessage('Registration enabled must be boolean'),
  body('maintenanceMode').optional().isBoolean().withMessage('Maintenance mode must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const updates = req.body;
    const updatedSettings = await updateAdminSettings(updates);
    
    res.json({
      success: true,
      message: 'Admin settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({
      error: 'Failed to update admin settings',
      message: error.message
    });
  }
});

// VIP Management Routes

// Get all VIP levels
router.get('/vip-levels', async (req, res) => {
  try {
    const vipLevels = await getAllVipLevelsAdmin();
    
    res.json({
      success: true,
      data: vipLevels
    });
  } catch (error) {
    console.error('Error fetching VIP levels:', error);
    res.status(500).json({
      error: 'Failed to fetch VIP levels',
      message: error.message
    });
  }
});

// Get specific VIP level
router.get('/vip-levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'VIP level ID is required'
      });
    }

    const vipLevel = await getVipLevelById(id);
    
    if (!vipLevel) {
      return res.status(404).json({
        error: 'VIP level not found'
      });
    }
    
    res.json({
      success: true,
      data: vipLevel
    });
  } catch (error) {
    console.error('Error fetching VIP level:', error);
    res.status(500).json({
      error: 'Failed to fetch VIP level',
      message: error.message
    });
  }
});

// Create VIP level
router.post('/vip-levels', [
  body('name').isString().isLength({ min: 2, max: 100 }),
  body('amount').isFloat({ min: 0 }),
  body('dailyEarning').isFloat({ min: 0 }),
  body('bicycleModel').optional().isString().isLength({ max: 100 }),
  body('bicycleColor').optional().isString().isLength({ max: 50 }),
  body('bicycleFeatures').optional().isString().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const created = await createVipLevel(req.body);
    res.json({ success: true, message: 'VIP level created', data: created });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'VIP name must be unique' });
    }
    console.error('Error creating VIP level:', error);
    res.status(500).json({ error: 'Failed to create VIP level', message: error.message });
  }
});

// Update VIP level
router.put('/vip-levels/:id', [
  body('name').optional().isString().isLength({ min: 2, max: 100 }),
  body('amount').optional().isFloat({ min: 0 }),
  body('dailyEarning').optional().isFloat({ min: 0 }),
  body('bicycleModel').optional().isString().isLength({ max: 100 }),
  body('bicycleColor').optional().isString().isLength({ max: 50 }),
  body('bicycleFeatures').optional().isString().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const updated = await updateVipLevel(id, req.body);
    res.json({ success: true, message: 'VIP level updated', data: updated });
  } catch (error) {
    console.error('Error updating VIP level:', error);
    res.status(500).json({ error: 'Failed to update VIP level', message: error.message });
  }
});

// Delete VIP level
router.delete('/vip-levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteVipLevel(id);
    res.json({ success: true, message: 'VIP level deleted', data: deleted });
  } catch (error) {
    if (error.code === 'VIP_IN_USE') {
      return res.status(400).json({ error: 'Cannot delete a VIP level that is assigned to users' });
    }
    console.error('Error deleting VIP level:', error);
    res.status(500).json({ error: 'Failed to delete VIP level', message: error.message });
  }
});

// Create or update VIP levels (bulk operation)
router.post('/vip-levels/seed', async (req, res) => {
  try {
    const results = await createOrUpdateVipLevels();
    
    res.json({
      success: true,
      message: 'VIP levels created/updated successfully',
      data: results
    });
  } catch (error) {
    console.error('Error creating/updating VIP levels:', error);
    res.status(500).json({
      error: 'Failed to create/update VIP levels',
      message: error.message
    });
  }
});

// VIP Members (users who joined VIP)
router.get('/vip-members', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long'),
  query('levelId').optional().isString().isLength({ min: 1 }).withMessage('Invalid level id'),
  query('activeOnly').optional().isBoolean().withMessage('activeOnly must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search = '', levelId, activeOnly } = req.query;

    const whereClause = {
      ...(levelId && { vipLevelId: levelId }),
      ...(activeOnly === 'true' && { isActive: true })
    };

    const [members, total] = await Promise.all([
      prisma.userVip.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true, createdAt: true }
          },
          vipLevel: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.userVip.count({ where: whereClause })
    ]);

    // Optional search filter on user fields (client-side like) if provided
    const filtered = search
      ? members.filter((m) => {
          const s = search.toLowerCase();
          return (
            (m.user.fullName || '').toLowerCase().includes(s) ||
            (m.user.email || '').toLowerCase().includes(s) ||
            (m.user.phone || '').toLowerCase().includes(s) ||
            (m.vipLevel?.name || '').toLowerCase().includes(s)
          );
        })
      : members;

    res.json({
      success: true,
      data: filtered,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching VIP members:', error);
    res.status(500).json({ error: 'Failed to fetch VIP members', message: error.message });
  }
});

// Admin: Get deposit and withdrawal verification dashboard
router.get('/verification-dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get pending deposits count
    const pendingDepositsCount = await prisma.deposit.count({
      where: {
        status: 'PENDING',
        depositType: 'USDT_DIRECT'
      }
    });

    // Get pending withdrawals count
    const pendingWithdrawalsCount = await prisma.withdrawal.count({
      where: {
        status: 'PENDING'
      }
    });

    // Get recent deposits (last 7 days)
    const recentDeposits = await prisma.deposit.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
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
      take: 10
    });

    // Get recent withdrawals (last 7 days)
    const recentWithdrawals = await prisma.withdrawal.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
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
      take: 10
    });

    // Get deposit statistics
    const depositStats = await prisma.deposit.aggregate({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    // Get withdrawal statistics
    const withdrawalStats = await prisma.withdrawal.aggregate({
      where: {
        status: { in: ['COMPLETED', 'APPROVED'] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        pendingDepositsCount,
        pendingWithdrawalsCount,
        recentDeposits,
        recentWithdrawals,
        monthlyStats: {
          deposits: {
            total: parseFloat(depositStats._sum.amount || 0),
            count: depositStats._count
          },
          withdrawals: {
            total: parseFloat(withdrawalStats._sum.amount || 0),
            count: withdrawalStats._count
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching verification dashboard:', error);
    res.status(500).json({
      error: 'Failed to fetch verification dashboard',
      message: error.message
    });
  }
});

// Admin: Get system wallet addresses
router.get('/system-addresses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const addresses = {
      walletAddresses: {
        TRC20: process.env.TRON_WALLET_ADDRESS || 'Not configured',
        BEP20: process.env.BSC_WALLET_ADDRESS || 'Not configured',
        ERC20: process.env.ETH_WALLET_ADDRESS || 'Not configured',
        POLYGON: process.env.POLYGON_WALLET_ADDRESS || 'Not configured'
      },
      tokenContracts: {
        USDT: {
          TRC20: process.env.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          BEP20: process.env.USDT_BEP20_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
          ERC20: process.env.USDT_ERC20_CONTRACT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          POLYGON: process.env.USDT_POLYGON_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
        },
        USDC: {
          BEP20: process.env.USDC_BEP20_CONTRACT || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          ERC20: process.env.USDC_ERC20_CONTRACT || '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
          POLYGON: process.env.USDC_POLYGON_CONTRACT || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
      }
    };

    res.json({
      success: true,
      data: addresses
    });

  } catch (error) {
    console.error('Error fetching system addresses:', error);
    res.status(500).json({
      error: 'Failed to fetch system addresses',
      message: error.message
    });
  }
});

// Admin: Update system wallet addresses
router.put('/system-addresses', [
  body('addresses.USDT.TRC20').optional().isLength({ min: 30, max: 50 }).withMessage('Invalid TRC20 address'),
  body('addresses.USDT.BEP20').optional().isLength({ min: 40, max: 50 }).withMessage('Invalid BEP20 address'),
  body('addresses.USDT.ERC20').optional().isLength({ min: 40, max: 50 }).withMessage('Invalid ERC20 address'),
  body('addresses.USDT.POLYGON').optional().isLength({ min: 40, max: 50 }).withMessage('Invalid POLYGON address')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { addresses } = req.body;

    // In a real implementation, you would update these in a secure configuration store
    // For now, we'll just return the addresses that would be updated
    const updatedAddresses = {
      USDT: {
        TRC20: addresses.USDT?.TRC20 || process.env.USDT_TRC20_ADDRESS,
        BEP20: addresses.USDT?.BEP20 || process.env.USDT_BEP20_ADDRESS,
        ERC20: addresses.USDT?.ERC20 || process.env.USDT_ERC20_ADDRESS,
        POLYGON: addresses.USDT?.POLYGON || process.env.USDT_POLYGON_ADDRESS
      }
    };

    res.json({
      success: true,
      message: 'System addresses updated successfully (Note: Environment variables need to be updated manually)',
      data: updatedAddresses
    });

  } catch (error) {
    console.error('Error updating system addresses:', error);
    res.status(500).json({
      error: 'Failed to update system addresses',
      message: error.message
    });
  }
});

// Admin: Get verification logs
router.get('/verification-logs', [
  query('type').optional().isIn(['deposit', 'withdrawal']).withMessage('Invalid type'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let deposits = [];
    let withdrawals = [];

    if (!type || type === 'deposit') {
      deposits = await prisma.deposit.findMany({
        where: {
          status: { in: ['CONFIRMED', 'FAILED'] },
          webhookData: {
            not: null
          }
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      });
    }

    if (!type || type === 'withdrawal') {
      withdrawals = await prisma.withdrawal.findMany({
        where: {
          status: { in: ['COMPLETED', 'APPROVED', 'REJECTED'] },
          processedBy: {
            not: null
          }
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { processedAt: 'desc' },
        skip,
        take: limit
      });
    }

    res.json({
      success: true,
      data: {
        deposits,
        withdrawals
      },
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching verification logs:', error);
    res.status(500).json({
      error: 'Failed to fetch verification logs',
      message: error.message
    });
  }
});

// Admin: Transaction Verification
router.post('/verify-transaction', async (req, res) => {
  try {
    console.log('🔍 Admin verification request:', {
      body: req.body,
      network: req.body.network,
      networkType: typeof req.body.network,
      networkLength: req.body.network?.length,
      allowedNetworks: ['TRC20', 'BEP20', 'ERC20', 'POLYGON']
    });

    const { transactionHash, network, amount, walletAddress } = req.body;

    // Manual validation
    if (!transactionHash || transactionHash.length < 10 || transactionHash.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: transactionHash, msg: 'Transaction hash must be between 10 and 100 characters', path: 'transactionHash' }]
      });
    }

    if (!['TRC20', 'BEP20', 'ERC20', 'POLYGON'].includes(network)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: network, msg: 'Invalid network', path: 'network' }]
      });
    }

    if (!amount || parseFloat(amount) < 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: amount, msg: 'Amount must be positive', path: 'amount' }]
      });
    }

    if (!walletAddress || walletAddress.length < 30 || walletAddress.length > 50) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: walletAddress, msg: 'Wallet address must be between 30 and 50 characters', path: 'walletAddress' }]
      });
    }

    console.log(`🔍 Admin verifying transaction: ${transactionHash} for ${network} network`);

    // Map deposit network names to verification service network names
    const networkMapping = {
      'TRC20': 'TRON',
      'BEP20': 'BSC',
      'ERC20': 'ETHEREUM',
      'POLYGON': 'POLYGON'
    };

    const verificationNetwork = networkMapping[network] || network;

    const verificationResult = await TransactionVerificationService.verifyTransaction(
      transactionHash,
      walletAddress,
      amount,
      verificationNetwork
    );

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      error: 'Failed to verify transaction',
      message: error.message
    });
  }
});

// Admin: Check Transaction on Blockchain (without wallet validation)
router.post('/check-transaction-blockchain', async (req, res) => {
  try {
    console.log('🔍 Admin blockchain check request:', {
      body: req.body,
      network: req.body.network
    });

    const { transactionHash, network } = req.body;

    // Manual validation
    if (!transactionHash || transactionHash.length < 10 || transactionHash.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: transactionHash, msg: 'Transaction hash must be between 10 and 100 characters', path: 'transactionHash' }]
      });
    }

    if (!['TRC20', 'BEP20', 'ERC20', 'POLYGON'].includes(network)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: network, msg: 'Invalid network', path: 'network' }]
      });
    }

    console.log(`🔍 Admin checking transaction on blockchain: ${transactionHash} for ${network} network`);

    // Map deposit network names to verification service network names
    const networkMapping = {
      'TRC20': 'TRON',
      'BEP20': 'BSC',
      'ERC20': 'ETHEREUM',
      'POLYGON': 'POLYGON'
    };

    const verificationNetwork = networkMapping[network] || network;

    const blockchainResult = await TransactionVerificationService.checkTransactionOnBlockchain(
      transactionHash,
      verificationNetwork
    );

    res.json({
      success: true,
      data: blockchainResult
    });
  } catch (error) {
    console.error('Error checking transaction on blockchain:', error);
    res.status(500).json({
      error: 'Failed to check transaction on blockchain',
      message: error.message
    });
  }
});

// Admin: Check Transaction Across All Networks (hash only)
router.post('/check-transaction-all-networks', async (req, res) => {
  try {
    console.log('🔍 Admin cross-network check request:', {
      body: req.body
    });

    const { transactionHash, depositId, deposit } = req.body;

    // Manual validation
    if (!transactionHash || transactionHash.length < 10 || transactionHash.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ type: 'field', value: transactionHash, msg: 'Transaction hash must be between 10 and 100 characters', path: 'transactionHash' }]
      });
    }

    console.log(`🔍 Admin checking transaction across all networks: ${transactionHash}`);

    const crossNetworkResult = await TransactionVerificationService.checkTransactionAcrossAllNetworks(
      transactionHash
    );

    // Add deposit information to the result for auto-confirmation
    const resultWithDeposit = {
      ...crossNetworkResult,
      depositId,
      deposit
    };

    res.json({
      success: true,
      data: resultWithDeposit
    });
  } catch (error) {
    console.error('Error checking transaction across networks:', error);
    res.status(500).json({
      error: 'Failed to check transaction across networks',
      message: error.message
    });
  }
});

module.exports = router;
