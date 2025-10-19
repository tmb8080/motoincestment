const { PrismaClient } = require('@prisma/client');
const { calculatePercentage } = require('../utils/helpers');
const { sendEmail } = require('./emailService');
const prisma = new PrismaClient();

// Process daily wallet growth for all users
// DISABLED: Only VIP task earnings are allowed
/*
const processWalletGrowth = async () => {
  try {
    console.log('Starting wallet growth processing...');
    
    // Get admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings) {
      throw new Error('Admin settings not found');
    }

    const dailyGrowthRate = parseFloat(settings.dailyGrowthRate);
    
    // Get all wallets with positive balance
    const wallets = await prisma.wallet.findMany({
      where: {
        balance: {
          gt: 0
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
      }
    });

    console.log(`Processing growth for ${wallets.length} wallets...`);

    const results = [];
    
    for (const wallet of wallets) {
      try {
        // Calculate growth amount
        const currentBalance = parseFloat(wallet.balance);
        const growthAmount = parseFloat(calculatePercentage(currentBalance, dailyGrowthRate));
        
        if (growthAmount > 0) {
          // Update wallet in transaction
          const result = await prisma.$transaction(async (tx) => {
            // Update wallet balance and earnings
            const updatedWallet = await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: {
                  increment: growthAmount
                },
                totalEarnings: {
                  increment: growthAmount
                },
                lastGrowthUpdate: new Date()
              }
            });

            // Create transaction record
            await tx.transaction.create({
              data: {
                userId: wallet.userId,
                type: 'WALLET_GROWTH',
                amount: growthAmount,
                description: `Daily wallet growth (${(dailyGrowthRate * 100).toFixed(2)}%)`
              }
            });

            return updatedWallet;
          });

          results.push({
            userId: wallet.userId,
            userName: wallet.user.fullName || wallet.user.email || wallet.user.phone || 'User',
            previousBalance: currentBalance,
            growthAmount,
            newBalance: parseFloat(result.balance),
            success: true
          });
        }
      } catch (error) {
        console.error(`Error processing growth for wallet ${wallet.id}:`, error);
        results.push({
          userId: wallet.userId,
          userName: wallet.user.fullName || wallet.user.email || wallet.user.phone || 'User',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalGrowth = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.growthAmount, 0);

    console.log(`Wallet growth processing completed. ${successCount} wallets updated. Total growth: $${totalGrowth.toFixed(2)}`);
    
    return {
      success: true,
      processed: wallets.length,
      successful: successCount,
      totalGrowth,
      results
    };
  } catch (error) {
    console.error('Error in processWalletGrowth:', error);
    throw error;
  }
};
*/

// DISABLED: Only VIP task earnings are allowed
const processWalletGrowth = async () => {
  console.log('Wallet growth processing is DISABLED. Only VIP task earnings are allowed.');
  return {
    success: true,
    processed: 0,
    successful: 0,
    totalGrowth: 0,
    results: [],
    message: 'Wallet growth is disabled. Only VIP task earnings are allowed.'
  };
};

// Get wallet balance and statistics
const getWalletStats = async (userId) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            referralCode: true,
            createdAt: true
          }
        }
      }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get transaction history
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get referral statistics
    const referralStats = await prisma.user.aggregate({
      where: { referredBy: userId },
      _count: true
    });

    const referralBonuses = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'REFERRAL_BONUS'
      },
      _sum: { amount: true }
    });

    // Calculate totalEarnings only from VIP_EARNINGS (daily task earnings)
    const dailyTaskEarnings = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'VIP_EARNINGS'
      },
      _sum: { amount: true }
    });

    // Calculate total withdrawals from withdrawal table (excluding fees - admin pays fees)
    const totalWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { in: ['COMPLETED', 'APPROVED'] }
      },
      _sum: { amount: true }
    });

    return {
      balance: parseFloat(wallet.balance),
      totalDeposits: parseFloat(wallet.totalDeposits),
      totalEarnings: parseFloat(dailyTaskEarnings._sum.amount || 0), // Only daily task earnings
      totalReferralBonus: parseFloat(referralBonuses._sum.amount || 0), // Use calculated value from transactions
      totalWithdrawn: parseFloat(totalWithdrawals._sum.amount || 0), // Total completed withdrawals
      lastGrowthUpdate: wallet.lastGrowthUpdate,
      referralCode: wallet.user.referralCode,
      referralCount: referralStats._count,
      totalReferralEarnings: parseFloat(referralBonuses._sum.amount || 0),
      recentTransactions: transactions,
      memberSince: wallet.user.createdAt
    };
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    throw error;
  }
};

// Note: processReferralBonus function removed - referral bonuses are now only processed when users join VIP levels

// Update wallet balance (for deposits/withdrawals)
const updateWalletBalance = async (userId, amount, type, description, referenceId = null) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updateData = {
        balance: {
          [amount > 0 ? 'increment' : 'decrement']: Math.abs(amount)
        }
      };

      // Update specific totals based on type
      if (type === 'DEPOSIT') {
        updateData.totalDeposits = {
          increment: Math.abs(amount)
        };
      } else if (type === 'VIP_EARNINGS') {
        updateData.totalEarnings = {
          increment: Math.abs(amount)
        };
        updateData.dailyEarnings = {
          increment: Math.abs(amount)
        };
      } else if (type === 'REFERRAL_BONUS') {
        updateData.totalReferralBonus = {
          increment: Math.abs(amount)
        };
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: updateData
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          amount: Math.abs(amount),
          description,
          referenceId
        }
      });

      return { updatedWallet, transaction };
    });

    return result;
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    throw error;
  }
};

// Get transaction history with pagination
const getTransactionHistory = async (userId, page = 1, limit = 20, type = null) => {
  try {
    const skip = (page - 1) * limit;
    
    const whereClause = {
      userId,
      ...(type && { type })
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      
      prisma.transaction.count({ where: whereClause })
    ]);

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw error;
  }
};

// Calculate projected earnings
const calculateProjectedEarnings = async (userId, days = 30) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const settings = await prisma.adminSettings.findFirst();
    if (!settings) {
      throw new Error('Admin settings not found');
    }

    const currentBalance = parseFloat(wallet.balance);
    const dailyRate = parseFloat(settings.dailyGrowthRate);
    
    // Calculate compound growth
    const projectedBalance = currentBalance * Math.pow(1 + dailyRate, days);
    const totalEarnings = projectedBalance - currentBalance;

    return {
      currentBalance,
      projectedBalance,
      totalEarnings,
      dailyRate: dailyRate * 100, // Convert to percentage
      days
    };
  } catch (error) {
    console.error('Error calculating projected earnings:', error);
    throw error;
  }
};

module.exports = {
  processWalletGrowth,
  getWalletStats,
  updateWalletBalance,
  getTransactionHistory,
  calculateProjectedEarnings
};
