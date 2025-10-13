const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAndRestartReferrals() {
  try {
    console.log('🔄 Resetting and restarting all referral bonuses...');
    
    // Step 1: Show current state
    console.log('\n📊 Current Referral Bonus State:');
    
    const currentBonuses = await prisma.referralBonus.aggregate({
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    const currentTransactions = await prisma.transaction.count({
      where: { type: 'REFERRAL_BONUS' }
    });
    
    console.log(`💰 Total referral bonuses: $${parseFloat(currentBonuses._sum.bonusAmount || 0).toFixed(2)}`);
    console.log(`📊 Total bonus records: ${currentBonuses._count.id}`);
    console.log(`📊 Total bonus transactions: ${currentTransactions}`);
    
    // Step 2: Reset all referral bonuses
    console.log('\n🗑️  Step 1: Removing all referral bonuses...');
    
    // Delete all referral bonus records
    const deletedBonuses = await prisma.referralBonus.deleteMany();
    console.log(`✅ Deleted ${deletedBonuses.count} referral bonus records`);
    
    // Delete all referral bonus transactions
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { type: 'REFERRAL_BONUS' }
    });
    console.log(`✅ Deleted ${deletedTransactions.count} referral bonus transactions`);
    
    // Reset wallet referral bonus totals
    const resetWallets = await prisma.wallet.updateMany({
      data: { totalReferralBonus: 0 }
    });
    console.log(`✅ Reset totalReferralBonus for ${resetWallets.count} wallets`);
    
    console.log('\n✅ All referral bonuses have been removed!');
    
    // Step 3: Wait a moment for database consistency
    console.log('\n⏳ Waiting for database consistency...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Restart referral bonuses
    console.log('\n🔄 Step 2: Restarting referral bonuses...');
    
    // Get all users with referral relationships
    const usersWithReferrers = await prisma.user.findMany({
      where: {
        referredBy: {
          not: null
        }
      },
      include: {
        wallet: true,
        referrer: {
          include: {
            wallet: true
          }
        },
        userVip: {
          include: {
            vipLevel: true
          }
        }
      }
    });
    
    console.log(`Found ${usersWithReferrers.length} users with referrers`);
    
    if (usersWithReferrers.length === 0) {
      console.log('❌ No users with referrers found in the system');
      return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    let totalBonusesProcessed = 0;
    let totalAmountProcessed = 0;
    
    // Process each user's referral relationship
    for (const user of usersWithReferrers) {
      try {
        console.log(`\n👤 Processing user: ${user.email || user.phone || 'Unknown'} (ID: ${user.id})`);
        console.log(`   Referred by: ${user.referrer.email || user.referrer.phone || 'Unknown'} (ID: ${user.referrer.id})`);
        
        // Check if user has VIP level
        if (user.userVip && user.userVip.length > 0) {
          const vipLevel = user.userVip[0].vipLevel;
          console.log(`   VIP Level: ${vipLevel.name} ($${vipLevel.amount})`);
          
          // Process referral bonuses for this VIP level
          console.log(`   🔄 Processing referral bonuses for VIP level...`);
          
          const { processVipReferralBonus } = require('../services/vipReferralService');
          const results = await processVipReferralBonus(
            user.id,
            vipLevel.id,
            parseFloat(vipLevel.amount)
          );
          
          if (results && results.length > 0) {
            console.log(`   ✅ Processed ${results.length} referral bonus(es)`);
            
            // Show bonus details and calculate totals
            let userTotalAmount = 0;
            for (const result of results) {
              const bonusRecord = result.bonusRecord;
              const bonusAmount = parseFloat(bonusRecord.bonusAmount);
              userTotalAmount += bonusAmount;
              console.log(`      Level ${bonusRecord.level}: $${bonusAmount.toFixed(2)} to ${user.referrer.email || user.referrer.phone}`);
            }
            
            totalBonusesProcessed += results.length;
            totalAmountProcessed += userTotalAmount;
            processedCount++;
          } else {
            console.log(`   ❌ No referral bonuses were processed`);
            errorCount++;
          }
          
        } else {
          console.log(`   ⚠️  User has no VIP level - skipping referral bonus processing`);
          processedCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Step 5: Final summary
    console.log('\n📊 Final Summary:');
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors encountered: ${errorCount} users`);
    console.log(`📈 Total users with referrers: ${usersWithReferrers.length}`);
    console.log(`💰 Total bonuses processed: ${totalBonusesProcessed}`);
    console.log(`💵 Total amount processed: $${totalAmountProcessed.toFixed(2)}`);
    
    // Show new referral statistics
    console.log('\n📈 New Referral Statistics:');
    
    // Count total referral bonuses in system
    const newTotalBonuses = await prisma.referralBonus.aggregate({
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    console.log(`💰 Total referral bonuses paid: $${parseFloat(newTotalBonuses._sum.bonusAmount || 0).toFixed(2)}`);
    console.log(`📊 Total bonus transactions: ${newTotalBonuses._count.id}`);
    
    // Count bonuses by level
    const level1Bonuses = await prisma.referralBonus.aggregate({
      where: { level: 1 },
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    const level2Bonuses = await prisma.referralBonus.aggregate({
      where: { level: 2 },
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    const level3Bonuses = await prisma.referralBonus.aggregate({
      where: { level: 3 },
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    console.log(`\n📊 Bonuses by Level:`);
    console.log(`   Level 1 (Direct): $${parseFloat(level1Bonuses._sum.bonusAmount || 0).toFixed(2)} (${level1Bonuses._count.id} transactions)`);
    console.log(`   Level 2 (Indirect): $${parseFloat(level2Bonuses._sum.bonusAmount || 0).toFixed(2)} (${level2Bonuses._count.id} transactions)`);
    console.log(`   Level 3 (Third Level): $${parseFloat(level3Bonuses._sum.bonusAmount || 0).toFixed(2)} (${level3Bonuses._count.id} transactions)`);
    
    // Show top referrers
    console.log('\n🏆 Top Referrers:');
    const topReferrers = await prisma.user.findMany({
      where: {
        referralBonusesGiven: {
          some: {}
        }
      },
      include: {
        wallet: true,
        referralBonusesGiven: true
      },
      take: 5
    });
    
    if (topReferrers.length > 0) {
      for (const referrer of topReferrers) {
        const totalEarned = referrer.referralBonusesGiven.reduce((sum, bonus) => sum + parseFloat(bonus.bonusAmount), 0);
        console.log(`   ${referrer.email || referrer.phone}: $${totalEarned.toFixed(2)} (${referrer.referralBonusesGiven.length} bonuses)`);
      }
    } else {
      console.log('   No referrers found with bonuses');
    }
    
    console.log('\n✅ Referral bonus reset and restart completed successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting and restarting referral bonuses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to show what will be reset (dry run)
async function showResetPreview() {
  try {
    console.log('🔍 Preview: What will be reset...');
    
    const bonusCount = await prisma.referralBonus.count();
    const transactionCount = await prisma.transaction.count({
      where: { type: 'REFERRAL_BONUS' }
    });
    
    const totalBonuses = await prisma.referralBonus.aggregate({
      _sum: { bonusAmount: true }
    });
    
    const usersWithReferrers = await prisma.user.count({
      where: {
        referredBy: {
          not: null
        }
      }
    });
    
    const usersWithVip = await prisma.user.count({
      where: {
        referredBy: {
          not: null
        },
        userVip: {
          isNot: null
        }
      }
    });
    
    console.log('\n📊 Current State:');
    console.log(`💰 Total referral bonuses: $${parseFloat(totalBonuses._sum.bonusAmount || 0).toFixed(2)}`);
    console.log(`📊 Referral bonus records: ${bonusCount}`);
    console.log(`📊 Referral bonus transactions: ${transactionCount}`);
    console.log(`👥 Users with referrers: ${usersWithReferrers}`);
    console.log(`👥 Users with referrers + VIP: ${usersWithVip}`);
    
    console.log('\n🗑️  Will be deleted:');
    console.log(`- ${bonusCount} referral bonus records`);
    console.log(`- ${transactionCount} referral bonus transactions`);
    console.log(`- All users' totalReferralBonus wallet balances`);
    
    console.log('\n🔄 Will be reprocessed:');
    console.log(`- Referral bonuses for ${usersWithVip} users with VIP levels`);
    console.log(`- Up to 3 levels of referral bonuses per user`);
    console.log(`- New transaction records and wallet updates`);
    
    console.log('\n⚠️  This action cannot be undone!');
    
  } catch (error) {
    console.error('❌ Error showing reset preview:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'reset-restart':
      await resetAndRestartReferrals();
      break;
    case 'preview':
      await showResetPreview();
      break;
    default:
      console.log('🔄 Referral Bonus Reset & Restart Script');
      console.log('');
      console.log('Usage: node reset-restart-referrals.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  reset-restart  - Remove all referral bonuses and restart the system');
      console.log('  preview        - Show what will be reset (dry run)');
      console.log('');
      console.log('Examples:');
      console.log('  node reset-restart-referrals.js preview');
      console.log('  node reset-restart-referrals.js reset-restart');
      console.log('');
      console.log('⚠️  WARNING: This will delete ALL referral bonus records!');
      console.log('Make sure to backup your database before running this script.');
      break;
  }
}

// Run the script if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  resetAndRestartReferrals,
  showResetPreview
};
