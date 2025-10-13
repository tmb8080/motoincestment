const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('./emailService');

const prisma = new PrismaClient();

// Calculate percentage
const calculatePercentage = (amount, percentage) => {
  return (parseFloat(amount) * parseFloat(percentage)) / 100;
};

// Process VIP referral bonuses for multi-level referrals
const processVipReferralBonus = async (userId, vipLevelId, vipAmount) => {
  try {
    console.log(`Processing VIP referral bonus for user ${userId}, VIP amount: ${vipAmount}`);

    // Get the user who bought VIP
    const vipUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        phone: true,
        referredBy: true 
      }
    });

    if (!vipUser) {
      throw new Error('VIP user not found');
    }

    // If user has no referrer, no bonuses to process
    if (!vipUser.referredBy) {
      console.log(`User ${userId} has no referrer, skipping referral bonus`);
      return null;
    }

    const results = [];

  // Load referral bonus level rates from admin settings (fallbacks: 10%, 5%, 2%)
  const adminSettings = await prisma.adminSettings.findFirst();
  const level1RateDecimal = parseFloat(adminSettings?.referralBonusLevel1Rate ?? 0.10);
  const level2RateDecimal = parseFloat(adminSettings?.referralBonusLevel2Rate ?? 0.05);
  const level3RateDecimal = parseFloat(adminSettings?.referralBonusLevel3Rate ?? 0.02);

  // Convert to percentage values for existing calculatePercentage function
  const level1BonusRate = level1RateDecimal * 100;
  const level2BonusRate = level2RateDecimal * 100;
  const level3BonusRate = level3RateDecimal * 100;

  // Process Level 1 (Direct) Referral
  const level1ReferrerId = vipUser.referredBy;
    const level1BonusAmount = calculatePercentage(vipAmount, level1BonusRate);

    console.log(`Processing Level 1 bonus: ${level1BonusAmount} for referrer ${level1ReferrerId}`);

    const level1Result = await processReferralBonus(
      level1ReferrerId,
      userId,
      vipAmount,
      level1BonusAmount,
      level1RateDecimal, // Store decimal rate, not percentage
      1,
      null,
      vipLevelId
    );

    if (level1Result) {
      results.push(level1Result);
    }

    // Process Level 2 (Indirect) Referral
    if (level1ReferrerId) {
      const level1Referrer = await prisma.user.findUnique({
        where: { id: level1ReferrerId },
        select: { referredBy: true }
      });

      if (level1Referrer && level1Referrer.referredBy) {
        const level2ReferrerId = level1Referrer.referredBy;
        const level2BonusAmount = calculatePercentage(vipAmount, level2BonusRate);

        console.log(`Processing Level 2 bonus: ${level2BonusAmount} for referrer ${level2ReferrerId}`);

        const level2Result = await processReferralBonus(
          level2ReferrerId,
          userId,
          vipAmount,
          level2BonusAmount,
          level2RateDecimal, // Store decimal rate, not percentage
          2,
          null,
          vipLevelId
        );

        if (level2Result) {
          results.push(level2Result);
        }

        // Process Level 3 (Third Level) Referral
        const level2Referrer = await prisma.user.findUnique({
          where: { id: level2ReferrerId },
          select: { referredBy: true }
        });

        if (level2Referrer && level2Referrer.referredBy) {
          const level3ReferrerId = level2Referrer.referredBy;
          const level3BonusAmount = calculatePercentage(vipAmount, level3BonusRate);

          console.log(`Processing Level 3 bonus: ${level3BonusAmount} for referrer ${level3ReferrerId}`);

          const level3Result = await processReferralBonus(
            level3ReferrerId,
            userId,
            vipAmount,
            level3BonusAmount,
            level3RateDecimal, // Store decimal rate, not percentage
            3,
            null,
            vipLevelId
          );

          if (level3Result) {
            results.push(level3Result);
          }
        }
      }
    }

    console.log(`VIP referral bonus processing completed. Processed ${results.length} bonuses.`);
    return results;

  } catch (error) {
    console.error('Error processing VIP referral bonus:', error);
    throw error;
  }
};

// Process individual referral bonus
const processReferralBonus = async (
  referrerId, 
  referredUserId, 
  vipAmount, 
  bonusAmount, 
  bonusRate, 
  level, 
  depositId = null, 
  vipPaymentId = null
) => {
  try {
    if (bonusAmount <= 0) {
      return null;
    }

    // Get referrer information
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      include: { wallet: true }
    });

    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { fullName: true, email: true, phone: true }
    });

    if (!referrer || !referredUser) {
      throw new Error('Referrer or referred user not found');
    }

    // Process bonus in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update referrer's wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId: referrerId },
        data: {
          balance: {
            increment: bonusAmount
          },
          totalReferralBonus: {
            increment: bonusAmount
          }
        }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: referrerId,
          type: 'REFERRAL_BONUS',
          amount: bonusAmount,
          description: `Level ${level} referral bonus from ${referredUser.fullName || referredUser.email || referredUser.phone || 'User'} (VIP payment: $${vipAmount})`,
          referenceId: referredUserId,
          metadata: {
            level: level,
            vipAmount: vipAmount,
            bonusRate: bonusRate,
            vipPaymentId: vipPaymentId
          }
        }
      });

      // Create referral bonus record
      const bonusRecord = await tx.referralBonus.create({
        data: {
          referrerId,
          referredId: referredUserId,
          depositId: depositId,
          vipPaymentId: vipPaymentId,
          bonusAmount,
          bonusRate,
          level
        }
      });

      return { updatedWallet, transaction, bonusRecord };
    });

    // Send notification email to referrer
    try {
      const totalReferrals = await prisma.user.count({
        where: { referredBy: referrerId }
      });

      await sendEmail({
        to: referrer.email,
        template: 'referralBonus',
        data: {
          fullName: referrer.fullName || referrer.email || referrer.phone || 'User',
          referredUser: referredUser.fullName || referredUser.email || referredUser.phone || 'User',
          bonusAmount: bonusAmount.toFixed(8),
          vipAmount: vipAmount.toFixed(8),
          currency: 'USD',
          totalReferrals,
          referralCode: referrer.referralCode,
          bonusRate: bonusRate.toFixed(1) + '%',
          level: level
        }
      });
    } catch (emailError) {
      console.error('Failed to send referral bonus email:', emailError);
    }

    console.log(`Level ${level} referral bonus processed: ${bonusAmount} for user ${referrerId}`);
    return result;

  } catch (error) {
    console.error(`Error processing level ${level} referral bonus:`, error);
    throw error;
  }
};

// Get referral statistics for a user
const getReferralStats = async (userId) => {
  try {
    // Get direct referrals (Level 1)
    const directReferrals = await prisma.user.count({
      where: { referredBy: userId }
    });

    // Get indirect referrals (Level 2)
    const indirectReferrals = await prisma.user.count({
      where: {
        referredBy: {
          in: await prisma.user.findMany({
            where: { referredBy: userId },
            select: { id: true }
          }).then(users => users.map(u => u.id))
        }
      }
    });

    // Get total referral bonuses earned
    const totalBonuses = await prisma.referralBonus.aggregate({
      where: { referrerId: userId },
      _sum: { bonusAmount: true }
    });

    // Get bonuses by level
    const level1Bonuses = await prisma.referralBonus.aggregate({
      where: { 
        referrerId: userId,
        level: 1
      },
      _sum: { bonusAmount: true }
    });

    const level2Bonuses = await prisma.referralBonus.aggregate({
      where: { 
        referrerId: userId,
        level: 2
      },
      _sum: { bonusAmount: true }
    });

    return {
      directReferrals,
      indirectReferrals,
      totalReferrals: directReferrals + indirectReferrals,
      totalBonuses: parseFloat(totalBonuses._sum.bonusAmount || 0),
      level1Bonuses: parseFloat(level1Bonuses._sum.bonusAmount || 0),
      level2Bonuses: parseFloat(level2Bonuses._sum.bonusAmount || 0)
    };

  } catch (error) {
    console.error('Error getting referral stats:', error);
    throw error;
  }
};

module.exports = {
  processVipReferralBonus,
  processReferralBonus,
  getReferralStats
};
