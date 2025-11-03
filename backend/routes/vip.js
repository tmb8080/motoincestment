const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
// Auto-complete task functionality removed - only daily earning tasks available
const { processVipReferralBonus } = require('../services/vipReferralService');

const router = express.Router();
const prisma = new PrismaClient();

// Public endpoint: Get all VIP levels (for landing page)
router.get('/public/levels', async (req, res) => {
  try {
    const vipLevels = await prisma.vipLevel.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        dailyEarning: true,
        bicycleModel: true,
        bicycleColor: true,
        bicycleFeatures: true
      }
    });

    // Convert Decimal values to numbers for frontend compatibility
    const formattedVipLevels = vipLevels.map(level => ({
      ...level,
      amount: parseFloat(level.amount),
      dailyEarning: parseFloat(level.dailyEarning)
    }));

    res.json({
      success: true,
      data: formattedVipLevels
    });
  } catch (error) {
    console.error('Error fetching public VIP levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VIP levels'
    });
  }
});

// Public endpoint: Get tokenomics data (for landing page)
router.get('/public/tokenomics', async (req, res) => {
  try {
    // Default tokenomics distribution
    const defaultTokenomics = {
      stakingRewards: 40,
      teamAdvisors: 20,
      communityIncentives: 20,
      partnerships: 10,
      reserveLiquidity: 10
    };

    res.json({
      success: true,
      data: defaultTokenomics
    });
  } catch (error) {
    console.error('Error fetching tokenomics data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tokenomics data'
    });
  }
});

// Public endpoint: Get referral bonus rates (for landing page)
router.get('/public/referral-rates', async (req, res) => {
  try {
    const adminSettings = await prisma.adminSettings.findFirst({
      select: {
        referralBonusLevel1Rate: true,
        referralBonusLevel2Rate: true,
        referralBonusLevel3Rate: true
      }
    });

    // Default rates if no settings found or rates are null
    const defaultRates = {
      level1Rate: 0.10, // 10%
      level2Rate: 0.05, // 5%
      level3Rate: 0.02  // 2%
    };

    let finalRates = defaultRates;

    if (adminSettings) {
      // Safely parse rates, fallback to defaults if null/undefined/NaN
      const level1 = adminSettings.referralBonusLevel1Rate;
      const level2 = adminSettings.referralBonusLevel2Rate;
      const level3 = adminSettings.referralBonusLevel3Rate;

      finalRates = {
        level1Rate: (level1 !== null && level1 !== undefined) ? parseFloat(level1) : defaultRates.level1Rate,
        level2Rate: (level2 !== null && level2 !== undefined) ? parseFloat(level2) : defaultRates.level2Rate,
        level3Rate: (level3 !== null && level3 !== undefined) ? parseFloat(level3) : defaultRates.level3Rate
      };

      // Double check for NaN values and replace with defaults
      if (isNaN(finalRates.level1Rate)) finalRates.level1Rate = defaultRates.level1Rate;
      if (isNaN(finalRates.level2Rate)) finalRates.level2Rate = defaultRates.level2Rate;
      if (isNaN(finalRates.level3Rate)) finalRates.level3Rate = defaultRates.level3Rate;
    }

    console.log('Referral rates being sent:', finalRates);

    res.json({
      success: true,
      data: finalRates
    });
  } catch (error) {
    console.error('Error fetching public referral rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral rates'
    });
  }
});

// Get all VIP levels (authenticated)
router.get('/levels', authenticateToken, async (req, res) => {
  try {
    const vipLevels = await prisma.vipLevel.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' }
    });

    // Convert Decimal values to numbers for frontend compatibility
    const formattedVipLevels = vipLevels.map(level => ({
      ...level,
      amount: parseFloat(level.amount),
      dailyEarning: parseFloat(level.dailyEarning),
      bicycleModel: level.bicycleModel,
      bicycleColor: level.bicycleColor,
      bicycleFeatures: level.bicycleFeatures
    }));

    res.json({
      success: true,
      data: formattedVipLevels
    });
  } catch (error) {
    console.error('Error fetching VIP levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VIP levels'
    });
  }
});

// Join VIP level (new user or upgrade)
router.post('/join', authenticateToken, async (req, res) => {
  try {
    console.log('VIP join request received:', req.body);
    console.log('User ID:', req.user.id);
    const { vipLevelId } = req.body;
    const userId = req.user.id;

    // Get user details to check verification status
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    console.log('User details:', {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    });

    // Check if user already has VIP
    const existingVip = await prisma.userVip.findUnique({
      where: { userId },
      include: {
        vipLevel: true
      }
    });

    console.log('Existing VIP check:', existingVip);

    // Get VIP level details
    const vipLevel = await prisma.vipLevel.findUnique({
      where: { id: vipLevelId }
    });

    if (!vipLevel) {
      return res.status(404).json({
        success: false,
        message: 'VIP level not found'
      });
    }

    // Check if user has sufficient deposited balance for VIP upgrade
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    const vipAmount = parseFloat(vipLevel.amount);
    const totalDeposits = parseFloat(wallet?.totalDeposits || 0);
    const totalBalance = parseFloat(wallet?.balance || 0);

    console.log('Initial wallet check for VIP purchase:', { 
      wallet: wallet ? 'exists' : 'not found', 
      totalDeposits, 
      totalBalance,
      vipAmount,
      walletDetails: wallet ? {
        id: wallet.id,
        balance: wallet.balance,
        totalDeposits: wallet.totalDeposits,
        totalEarnings: wallet.totalEarnings,
        totalReferralBonus: wallet.totalReferralBonus
      } : null
    });

    if (!wallet) {
      console.log('Creating wallet for user:', userId);
      // Create wallet for user if it doesn't exist
      await prisma.wallet.create({
        data: {
          userId: userId
        }
      });
      
      // Fetch the newly created wallet
      const newWallet = await prisma.wallet.findUnique({
        where: { userId }
      });
      
      console.log('New wallet created:', newWallet);
      
      if (!newWallet) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create wallet. Please try again.'
        });
      }
      
      // Update wallet reference
      wallet = newWallet;
    }

    // Calculate payment amount based on whether user is upgrading or joining new
    let paymentAmount = vipAmount;
    let isUpgrade = false;
    let currentVipLevel = null;

    if (existingVip) {
      // User is upgrading - calculate the difference
      isUpgrade = true;
      currentVipLevel = existingVip.vipLevel;
      const currentVipAmount = parseFloat(existingVip.totalPaid);
      paymentAmount = vipAmount - currentVipAmount;
      
      console.log('Upgrade calculation:', {
        currentVipLevel: currentVipLevel.name,
        currentVipAmount,
        newVipAmount: vipAmount,
        paymentAmount,
        isUpgrade
      });

      if (paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot downgrade to a lower VIP level'
        });
      }
    }

    // Recalculate deposited balance after potential wallet creation
    const finalTotalDeposits = parseFloat(wallet.totalDeposits || 0);
    const finalTotalBalance = parseFloat(wallet.balance || 0);
    
    console.log('VIP purchase validation:', {
      isUpgrade,
      paymentAmount,
      finalTotalDeposits,
      finalTotalBalance,
      canPurchaseWithDeposits: finalTotalDeposits >= paymentAmount,
      hasSufficientBalance: finalTotalBalance >= paymentAmount,
      vipLevelName: vipLevel.name,
      currentVipName: currentVipLevel?.name || 'none'
    });
    
    // Check if user has sufficient total deposits to purchase VIP
    // VIP can only be purchased using deposited funds, not earnings or referral bonuses
    if (finalTotalDeposits < paymentAmount) {
      const message = isUpgrade 
        ? `Insufficient deposited balance for upgrade. You have $${finalTotalDeposits} in total deposits but need $${paymentAmount} to upgrade from ${currentVipLevel.name} to ${vipLevel.name}. Daily earnings and referral bonuses cannot be used for VIP upgrades.`
        : `Insufficient deposited balance. You have $${finalTotalDeposits} in total deposits but need $${paymentAmount} to join this VIP level. Daily earnings and referral bonuses cannot be used for VIP upgrades.`;
      
      return res.status(400).json({
        success: false,
        message,
        details: {
          availableDeposits: finalTotalDeposits,
          totalBalance: finalTotalBalance,
          requiredAmount: paymentAmount,
          canUseDeposits: finalTotalDeposits >= paymentAmount
        }
      });
    }
    
    // Also check if user has sufficient balance to make the payment
    // Balance should be >= paymentAmount to complete the transaction
    if (finalTotalBalance < paymentAmount) {
      const message = isUpgrade
        ? `Insufficient balance for upgrade. You have $${finalTotalBalance} available but need $${paymentAmount} to upgrade from ${currentVipLevel.name} to ${vipLevel.name}. Please ensure you have sufficient balance from your deposits.`
        : `Insufficient balance. You have $${finalTotalBalance} available but need $${paymentAmount} to join this VIP level. Please ensure you have sufficient balance from your deposits.`;
      
      return res.status(400).json({
        success: false,
        message,
        details: {
          availableDeposits: finalTotalDeposits,
          totalBalance: finalTotalBalance,
          requiredAmount: paymentAmount,
          canUseDeposits: finalTotalDeposits >= paymentAmount,
          hasSufficientBalance: finalTotalBalance >= paymentAmount
        }
      });
    }

    // Start transaction
    console.log('Starting VIP join/upgrade transaction...');
    const result = await prisma.$transaction(async (tx) => {
      console.log('Deducting payment amount from wallet...');
      // Deduct payment amount from wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: paymentAmount
          }
        }
      });

      if (isUpgrade) {
        console.log('Updating existing VIP membership...');
        // Update existing VIP membership
        const userVip = await tx.userVip.update({
          where: { userId },
          data: {
            vipLevelId,
            totalPaid: vipLevel.amount,
            updatedAt: new Date()
          }
        });

        console.log('Creating upgrade transaction record...');
        // Create transaction record for upgrade
        await tx.transaction.create({
          data: {
            userId,
            type: 'VIP_PAYMENT',
            amount: paymentAmount,
            description: `VIP upgrade from ${currentVipLevel.name} to ${vipLevel.name} (difference: $${paymentAmount})`
          }
        });

        console.log('Upgrade transaction completed successfully');
        return userVip;
      } else {
        console.log('Creating new VIP membership...');
        // Create new VIP membership
        const userVip = await tx.userVip.create({
          data: {
            userId,
            vipLevelId,
            totalPaid: vipLevel.amount
          }
        });

        console.log('Creating new membership transaction record...');
        // Create transaction record for new membership
        await tx.transaction.create({
          data: {
            userId,
            type: 'VIP_PAYMENT',
            amount: paymentAmount,
            description: `VIP ${vipLevel.name} membership payment`
          }
        });

        console.log('New membership transaction completed successfully');
        return userVip;
      }
    });

    // Process referral bonuses for VIP purchase (only for new memberships, not upgrades)
    if (!isUpgrade) {
      try {
        console.log('Processing VIP referral bonuses...');
        const vipAmount = parseFloat(vipLevel.amount);
        await processVipReferralBonus(userId, vipLevelId, vipAmount);
        console.log('VIP referral bonuses processed successfully');
      } catch (referralError) {
        console.error('Error processing VIP referral bonuses:', referralError);
        // Don't fail VIP join if referral bonus processing fails
      }
    } else {
      console.log('Skipping referral bonuses for VIP upgrade');
    }

    // Note: Auto-complete task functionality removed - only daily earning tasks are available

    res.json({
      success: true,
      message: isUpgrade 
        ? `Successfully upgraded to ${vipLevel.name} VIP level! You paid $${paymentAmount} (difference from your current level)`
        : 'Successfully joined VIP level',
      data: {
        ...result,
        isUpgrade,
        paymentAmount,
        totalPaid: vipLevel.amount
      }
    });
  } catch (error) {
    console.error('Error joining VIP:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to join VIP level',
      error: error.message
    });
  }
});

// Get user VIP status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userVip = await prisma.userVip.findUnique({
      where: { userId },
      include: {
        vipLevel: true
      }
    });

    // Get current active session
    const activeSession = await prisma.earningsSession.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expectedEndTime: {
          gt: new Date()
        }
      }
    });

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEarnings = await prisma.earningsSession.aggregate({
      where: {
        userId,
        startTime: {
          gte: today,
          lt: tomorrow
        },
        status: 'COMPLETED'
      },
      _sum: {
        totalEarnings: true
      }
    });

    res.json({
      success: true,
      data: {
        userVip: userVip ? {
          ...userVip,
          totalPaid: parseFloat(userVip.totalPaid),
          vipLevel: userVip.vipLevel ? {
            ...userVip.vipLevel,
            amount: parseFloat(userVip.vipLevel.amount),
            dailyEarning: parseFloat(userVip.vipLevel.dailyEarning),
            bicycleModel: userVip.vipLevel.bicycleModel,
            bicycleColor: userVip.vipLevel.bicycleColor,
            bicycleFeatures: userVip.vipLevel.bicycleFeatures
          } : null
        } : null,
        activeSession: activeSession ? {
          ...activeSession,
          totalEarnings: parseFloat(activeSession.totalEarnings || 0)
        } : null,
        todayEarnings: parseFloat(todayEarnings._sum.totalEarnings || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching VIP status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VIP status'
    });
  }
});

// Start earning session
router.post('/start-earning', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has VIP membership
    const userVip = await prisma.userVip.findUnique({
      where: { userId },
      include: { vipLevel: true }
    });

    if (!userVip || !userVip.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active VIP membership found'
      });
    }

    // Check if there's already an active session
    const activeSession = await prisma.earningsSession.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expectedEndTime: {
          gt: new Date()
        }
      }
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active earning session'
      });
    }

    // Create new earning session (24 hours)
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    const session = await prisma.earningsSession.create({
      data: {
        userId,
        vipLevelId: userVip.vipLevelId,
        startTime: startTime,
        expectedEndTime: endTime,
        dailyEarningRate: userVip.vipLevel.dailyEarning,
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      message: 'Earning session started successfully',
      data: session
    });
  } catch (error) {
    console.error('Error starting earning session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start earning session'
    });
  }
});

// Process completed earning sessions (called by cron job)
router.post('/process-earnings', authenticateToken, async (req, res) => {
  try {
    console.log('Manual earnings processing requested...');
    
    // Find completed sessions that haven't been paid yet
    const completedSessions = await prisma.earningsSession.findMany({
      where: {
        status: 'COMPLETED',
        totalEarnings: {
          not: null
        }
      },
      include: {
        user: {
          include: {
            wallet: true
          }
        },
        vipLevel: true
      }
    });

    console.log(`Found ${completedSessions.length} completed sessions to process manually`);

    const results = [];

    for (const session of completedSessions) {
      try {
        // Check if this session has already been processed (by checking if a transaction exists)
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: session.userId,
            type: 'VIP_EARNINGS',
            referenceId: session.id
          }
        });

        if (existingTransaction) {
          console.log(`Session ${session.id} already processed, skipping...`);
          results.push({
            sessionId: session.id,
            userId: session.userId,
            status: 'skipped',
            message: 'Already processed'
          });
          continue;
        }

        const earningsAmount = parseFloat(session.totalEarnings);
        console.log(`Processing session ${session.id} for user ${session.userId}, amount: ${earningsAmount}`);

        await prisma.$transaction(async (tx) => {
          // Add earnings to wallet - update both balance and dailyEarnings
          await tx.wallet.update({
            where: { userId: session.userId },
            data: {
              balance: {
                increment: earningsAmount
              },
              dailyEarnings: {
                increment: earningsAmount
              },
              totalEarnings: {
                increment: earningsAmount
              }
            }
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: session.userId,
              type: 'VIP_EARNINGS',
              amount: earningsAmount,
              description: `Daily VIP earnings completed - ${session.vipLevel?.name || 'VIP'} level`,
              referenceId: session.id
            }
          });
        });

        results.push({
          sessionId: session.id,
          userId: session.userId,
          amount: earningsAmount,
          status: 'success'
        });

        console.log(`✅ Successfully paid ${earningsAmount} to user ${session.userId} for session ${session.id}`);
      } catch (error) {
        console.error(`❌ Error processing session ${session.id}:`, error);
        results.push({
          sessionId: session.id,
          userId: session.userId,
          status: 'error',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`📊 Manual processing completed: ${successCount} successful, ${skippedCount} skipped, ${errorCount} failed`);

    res.json({
      success: true,
      message: `Processed ${successCount} earning sessions (${skippedCount} skipped, ${errorCount} failed)`,
      data: results
    });
  } catch (error) {
    console.error('❌ Error processing earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process earnings',
      error: error.message
    });
  }
});

module.exports = router;
