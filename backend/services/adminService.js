const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Initialize admin settings on server startup
const initializeAdminSettings = async () => {
  try {
    // Check if admin settings exist
    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      // Create default admin settings
      settings = await prisma.adminSettings.create({
        data: {
          dailyGrowthRate: parseFloat(process.env.DEFAULT_DAILY_GROWTH_RATE) || 0.01,
          minDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 10,
          minUsdtDepositAmount: parseFloat(process.env.MIN_USDT_DEPOSIT_AMOUNT) || 30,
          minWithdrawalAmount: parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10,
          minUsdcWithdrawalAmount: parseFloat(process.env.MIN_USDC_WITHDRAWAL_AMOUNT) || 20,
          withdrawalFeeFixed: parseFloat(process.env.WITHDRAWAL_FEE_FIXED || '0') || 0,
          withdrawalFeePercent: parseFloat(process.env.WITHDRAWAL_FEE_PERCENT || '0') || 0,
          isDepositEnabled: true,
          isWithdrawalEnabled: true,
          isRegistrationEnabled: true,
          maintenanceMode: false,
          // Referral bonus rates (default: 10%, 5%, 2%)
          referralBonusLevel1Rate: 0.10,
          referralBonusLevel2Rate: 0.05,
          referralBonusLevel3Rate: 0.02
        }
      });
      console.log('✅ Default admin settings created');
    }

    // Check if admin user exists
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (!existingAdmin) {
        // Create default admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        // Generate unique referral code for admin
        let adminReferralCode;
        let isUnique = false;
        while (!isUnique) {
          adminReferralCode = 'ADMIN' + Math.random().toString(36).substring(2, 6).toUpperCase();
          const existing = await prisma.user.findUnique({
            where: { referralCode: adminReferralCode }
          });
          if (!existing) isUnique = true;
        }

        const adminUser = await prisma.user.create({
          data: {
            fullName: 'System Administrator',
            email: adminEmail,
            password: hashedPassword,
            referralCode: adminReferralCode,
            isEmailVerified: true,
            isAdmin: true
          }
        });

        // Create wallet for admin
        await prisma.wallet.create({
          data: {
            userId: adminUser.id
          }
        });

        console.log('✅ Default admin user created');
      }
    }

    return settings;
  } catch (error) {
    console.error('❌ Failed to initialize admin settings:', error);
    throw error;
  }
};

// Get current admin settings
const getAdminSettings = async () => {
  try {
    const settings = await prisma.adminSettings.findFirst();
    return settings;
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    throw error;
  }
};

// Update admin settings
const updateAdminSettings = async (updates) => {
  try {
    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      // Create default admin settings if they don't exist
      console.log('Creating default admin settings...');
      settings = await prisma.adminSettings.create({
        data: {
          dailyGrowthRate: parseFloat(process.env.DEFAULT_DAILY_GROWTH_RATE) || 0.01,
          minDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 0.000001,
          minUsdtDepositAmount: parseFloat(process.env.MIN_USDT_DEPOSIT_AMOUNT) || 0.000001,
          minWithdrawalAmount: parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10,
          minUsdcWithdrawalAmount: parseFloat(process.env.MIN_USDC_WITHDRAWAL_AMOUNT) || 20,
          isDepositEnabled: true, // Enable deposits by default
          isWithdrawalEnabled: true,
          isRegistrationEnabled: true,
          maintenanceMode: false,
          // Referral bonus rates (default: 10%, 5%, 2%)
          referralBonusLevel1Rate: 0.10,
          referralBonusLevel2Rate: 0.05,
          referralBonusLevel3Rate: 0.02
        }
      });
      console.log('✅ Default admin settings created');
    }

    // Normalize referral bonus level rates if client sent percents (e.g., 5 => 0.05)
    const normalized = { ...updates };
    ['referralBonusLevel1Rate', 'referralBonusLevel2Rate', 'referralBonusLevel3Rate'].forEach((key) => {
      if (normalized[key] !== undefined && normalized[key] > 1) {
        normalized[key] = parseFloat(normalized[key]) / 100;
      }
    });

    // Update the settings
    const updatedSettings = await prisma.adminSettings.update({
      where: { id: settings.id },
      data: normalized
    });

    return updatedSettings;
  } catch (error) {
    console.error('Error updating admin settings:', error);
    throw error;
  }
};

// Get system statistics
const getSystemStats = async () => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDeposits,
      confirmedDeposits,
      pendingDeposits,
      totalWithdrawals,
      completedWithdrawals,
      pendingWithdrawals,
      totalWalletBalance,
      totalEarnings,
      totalReferralBonus,
      recentUsers,
      todayUsers,
      todayDeposits,
      todayWithdrawals,
      vipUsers
    ] = await Promise.all([
      // Total users count (excluding admins)
      prisma.user.count({
        where: { isAdmin: false }
      }),
      
      // Active users count
      prisma.user.count({
        where: { 
          isAdmin: false,
          isActive: true
        }
      }),
      
      // Total deposits (all statuses)
      prisma.deposit.aggregate({
        _sum: { amount: true },
        _count: true
      }),
      
      // Confirmed deposits
      prisma.deposit.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true
      }),
      
      // Pending deposits
      prisma.deposit.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      }),
      
      // Total withdrawals (excluding rejected)
      prisma.withdrawal.aggregate({
        where: { status: { not: 'REJECTED' } },
        _sum: { amount: true },
        _count: true
      }),
      
      // Completed withdrawals
      prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true
      }),
      
      // Pending withdrawals
      prisma.withdrawal.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      }),
      
      // Total wallet balance
      prisma.wallet.aggregate({
        _sum: { balance: true }
      }),
      
      // Total VIP task earnings (only from VIP_EARNINGS transactions)
      prisma.transaction.aggregate({
        where: {
          type: 'VIP_EARNINGS'
        },
        _sum: { amount: true }
      }),
      
      // Total referral bonus
      prisma.wallet.aggregate({
        _sum: { totalReferralBonus: true }
      }),
      
      // Recent users (last 7 days)
      prisma.user.count({
        where: {
          isAdmin: false,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Today's new users
      prisma.user.count({
        where: {
          isAdmin: false,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Today's deposits
      prisma.deposit.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Today's withdrawals
      prisma.withdrawal.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // VIP users count
      prisma.userVip.count({
        where: {
          isActive: true
        }
      })
    ]);

    // Calculate system balance (total deposits - total withdrawals)
    const systemBalance = (confirmedDeposits._sum.amount || 0) - (completedWithdrawals._sum.amount || 0);

    return {
      totalUsers: totalUsers,
      activeUsers: activeUsers,
      vipUsers: vipUsers,
      recentUsers: recentUsers,
      todayUsers: todayUsers,
      
      totalDeposits: totalDeposits._sum.amount || 0,
      confirmedDeposits: confirmedDeposits._sum.amount || 0,
      pendingDeposits: pendingDeposits._sum.amount || 0,
      depositCount: totalDeposits._count,
      todayDeposits: todayDeposits._sum.amount || 0,
      
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
      completedWithdrawals: completedWithdrawals._sum.amount || 0,
      pendingWithdrawals: pendingWithdrawals._sum.amount || 0,
      withdrawalCount: totalWithdrawals._count,
      todayWithdrawals: todayWithdrawals._sum.amount || 0,
      
      totalWalletBalance: totalWalletBalance._sum.balance || 0,
      totalEarnings: totalEarnings._sum.amount || 0,
      totalReferralBonus: totalReferralBonus._sum.totalReferralBonus || 0,
      systemBalance: systemBalance,
      
      // Pending counts
      pendingWithdrawalCount: pendingWithdrawals._count,
      pendingDepositCount: pendingDeposits._count
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    throw error;
  }
};

// Get user management data
const getUserManagementData = async (page = 1, limit = 20, search = '') => {
  try {
    const skip = (page - 1) * limit;
    
    const whereClause = {
      isAdmin: false,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { referralCode: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          wallet: true,
          referrer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              referrals: true,
              deposits: true,
              withdrawals: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      
      prisma.user.count({ where: whereClause })
    ]);

    // Get detailed financial data for each user
    const usersWithFinancialData = await Promise.all(
      users.map(async (user) => {
        const [
          totalDeposits,
          totalWithdrawals,
          dailyEarnings,
          referralEarnings,
          firstDailyTask,
          totalDailyEarnings
        ] = await Promise.all([
          // Total deposits
          prisma.deposit.aggregate({
            where: { userId: user.id },
            _sum: { amount: true },
            _count: true
          }),
          
          // Total withdrawals (excluding rejected)
          prisma.withdrawal.aggregate({
            where: { 
              userId: user.id,
              status: { not: 'REJECTED' }
            },
            _sum: { amount: true },
            _count: true
          }),
          
          // Daily earnings (VIP_EARNINGS transactions from today)
          prisma.transaction.aggregate({
            where: {
              userId: user.id,
              type: 'VIP_EARNINGS',
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            },
            _sum: { amount: true }
          }),
          
          // Total referral earnings
          prisma.transaction.aggregate({
            where: {
              userId: user.id,
              type: 'REFERRAL_BONUS'
            },
            _sum: { amount: true }
          }),
          
          // First daily task (VIP_EARNINGS transaction)
          prisma.transaction.findFirst({
            where: {
              userId: user.id,
              type: 'VIP_EARNINGS'
            },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true }
          }),
          
          // Total daily earnings (all VIP_EARNINGS transactions)
          prisma.transaction.aggregate({
            where: {
              userId: user.id,
              type: 'VIP_EARNINGS'
            },
            _sum: { amount: true }
          })
        ]);

        return {
          ...user,
          financialData: {
            totalDeposits: totalDeposits._sum.amount || 0,
            totalDepositsCount: totalDeposits._count || 0,
            totalWithdrawals: totalWithdrawals._sum.amount || 0,
            totalWithdrawalsCount: totalWithdrawals._count || 0,
            dailyEarnings: dailyEarnings._sum.amount || 0,
            referralEarnings: referralEarnings._sum.amount || 0,
            firstDailyTaskDate: firstDailyTask?.createdAt || null,
            totalDailyEarnings: totalDailyEarnings._sum.amount || 0
          }
        };
      })
    );

    return {
      users: usersWithFinancialData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    console.error('Error fetching user management data:', error);
    throw error;
  }
};

// Toggle user status (active/inactive)
const toggleUserStatus = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isAdmin) {
      throw new Error('Cannot modify admin user status');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive }
    });

    return updatedUser;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
};

// Get referral tree for a user with detailed information
const getReferralTree = async (userId, depth = 3) => {
  try {
    const buildTree = async (parentId, currentDepth) => {
      if (currentDepth > depth) return [];
      
      const referrals = await prisma.user.findMany({
        where: { referredBy: parentId },
        include: {
          wallet: {
            select: {
              balance: true,
              totalDeposits: true,
              totalEarnings: true,
              totalReferralBonus: true
            }
          },
          userVip: {
            include: {
              vipLevel: {
                select: {
                  name: true,
                  amount: true
                }
              }
            }
          },
          referralBonusesReceived: {
            include: {
              referred: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  fullName: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const tree = [];
      for (const referral of referrals) {
        // Get financial data for this user
        const [
          totalDeposits,
          totalWithdrawals,
          totalDailyEarnings
        ] = await Promise.all([
          prisma.deposit.aggregate({
            where: { userId: referral.id },
            _sum: { amount: true }
          }),
          prisma.withdrawal.aggregate({
            where: { 
              userId: referral.id,
              status: { not: 'REJECTED' }
            },
            _sum: { amount: true }
          }),
          prisma.transaction.aggregate({
            where: {
              userId: referral.id,
              type: 'VIP_EARNINGS'
            },
            _sum: { amount: true }
          })
        ]);

        const children = await buildTree(referral.id, currentDepth + 1);
        tree.push({
          ...referral,
          referrals: children, // Changed from 'children' to 'referrals' for consistency
          level: currentDepth,
          financialData: {
            totalDeposits: totalDeposits._sum.amount || 0,
            totalWithdrawals: totalWithdrawals._sum.amount || 0,
            totalDailyEarnings: totalDailyEarnings._sum.amount || 0
          }
        });
      }

      return tree;
    };

    const tree = await buildTree(userId, 1);
    return tree;
  } catch (error) {
    console.error('Error building referral tree:', error);
    throw error;
  }
};

// Get user daily earnings history
const getUserDailyEarnings = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      dateFilter = 'all',
      sortBy = 'date'
    } = options;

    const skip = (page - 1) * limit;

    // Build date filter
    let dateFilterClause = {};
    const now = new Date();
    
    switch (dateFilter) {
      case 'week':
        dateFilterClause = {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        };
        break;
      case 'month':
        dateFilterClause = {
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        };
        break;
      case 'year':
        dateFilterClause = {
          createdAt: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          }
        };
        break;
      default:
        // 'all' - no date filter
        break;
    }

    // Build sort order
    const orderBy = {};
    if (sortBy === 'amount') {
      orderBy.amount = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get daily earnings transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.transaction.count({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        }
      })
    ]);

    // Get summary statistics
    const [
      totalEarnings,
      averageDailyEarnings,
      maxEarnings,
      minEarnings,
      earningsByDay
    ] = await Promise.all([
      // Total earnings in the filtered period
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        _sum: { amount: true }
      }),
      
      // Average daily earnings
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        _avg: { amount: true }
      }),
      
      // Max earnings in a single day
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        _max: { amount: true }
      }),
      
      // Min earnings in a single day
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        _min: { amount: true }
      }),
      
      // Group earnings by day for chart data
      prisma.transaction.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          type: 'VIP_EARNINGS',
          ...dateFilterClause
        },
        _sum: { amount: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Format earnings by day for chart
    const chartData = earningsByDay.map(day => ({
      date: day.createdAt.toISOString().split('T')[0],
      amount: parseFloat(day._sum.amount || 0)
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      },
      summary: {
        totalEarnings: parseFloat(totalEarnings._sum.amount || 0),
        averageDailyEarnings: parseFloat(averageDailyEarnings._avg.amount || 0),
        maxEarnings: parseFloat(maxEarnings._max.amount || 0),
        minEarnings: parseFloat(minEarnings._min.amount || 0),
        totalDays: total
      },
      chartData
    };
  } catch (error) {
    console.error('Error fetching user daily earnings:', error);
    throw error;
  }
};

module.exports = {
  initializeAdminSettings,
  getAdminSettings,
  updateAdminSettings,
  getSystemStats,
  getUserManagementData,
  toggleUserStatus,
  getReferralTree,
  getUserDailyEarnings
};
