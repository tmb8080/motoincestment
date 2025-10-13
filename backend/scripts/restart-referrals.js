const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restartAllUserReferrals() {
  try {
    console.log('🔄 Restarting all user referrals in the system...');
    
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
    
    // Process each user's referral relationship
    for (const user of usersWithReferrers) {
      try {
        console.log(`\n👤 Processing user: ${user.email || user.phone || 'Unknown'} (ID: ${user.id})`);
        console.log(`   Referred by: ${user.referrer.email || user.referrer.phone || 'Unknown'} (ID: ${user.referrer.id})`);
        
        // Check if user has VIP level
        if (user.userVip && user.userVip.length > 0) {
          const vipLevel = user.userVip[0].vipLevel;
          console.log(`   VIP Level: ${vipLevel.name} ($${vipLevel.amount})`);
          
          // Check if referral bonuses were already processed for this VIP
          const existingBonuses = await prisma.referralBonus.findMany({
            where: {
              referredId: user.id,
              vipPaymentId: user.userVip[0].id
            }
          });
          
          if (existingBonuses.length > 0) {
            console.log(`   ⚠️  Referral bonuses already processed (${existingBonuses.length} bonuses found)`);
            console.log(`   💰 Total bonuses: $${existingBonuses.reduce((sum, bonus) => sum + parseFloat(bonus.bonusAmount), 0)}`);
            processedCount++;
            continue;
          }
          
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
            
            // Show bonus details
            for (const result of results) {
              const bonusRecord = result.bonusRecord;
              console.log(`      Level ${bonusRecord.level}: $${bonusRecord.bonusAmount} to ${user.referrer.email || user.referrer.phone}`);
            }
            
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
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors encountered: ${errorCount} users`);
    console.log(`📈 Total users with referrers: ${usersWithReferrers.length}`);
    
    // Show referral statistics
    console.log('\n📈 Referral Statistics:');
    
    // Count total referral bonuses in system
    const totalBonuses = await prisma.referralBonus.aggregate({
      _sum: { bonusAmount: true },
      _count: { id: true }
    });
    
    console.log(`💰 Total referral bonuses paid: $${parseFloat(totalBonuses._sum.bonusAmount || 0).toFixed(2)}`);
    console.log(`📊 Total bonus transactions: ${totalBonuses._count.id}`);
    
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
    
    for (const referrer of topReferrers) {
      const totalEarned = referrer.referralBonusesGiven.reduce((sum, bonus) => sum + parseFloat(bonus.bonusAmount), 0);
      console.log(`   ${referrer.email || referrer.phone}: $${totalEarned.toFixed(2)} (${referrer.referralBonusesGiven.length} bonuses)`);
    }
    
    console.log('\n✅ Referral system restart completed!');
    
  } catch (error) {
    console.error('❌ Error restarting referral system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to reset all referral bonuses (use with caution)
async function resetAllReferralBonuses() {
  try {
    console.log('⚠️  WARNING: This will delete ALL referral bonus records!');
    console.log('This action cannot be undone. Are you sure? (y/N)');
    
    // In a real script, you'd want to add confirmation
    // For now, we'll just show what would be deleted
    
    const bonusCount = await prisma.referralBonus.count();
    const transactionCount = await prisma.transaction.count({
      where: { type: 'REFERRAL_BONUS' }
    });
    
    console.log(`Would delete:`);
    console.log(`- ${bonusCount} referral bonus records`);
    console.log(`- ${transactionCount} referral bonus transactions`);
    console.log(`- Reset all users' totalReferralBonus wallet balances`);
    
    console.log('\nTo actually reset, uncomment the reset code in the script');
    
    // Uncomment these lines to actually perform the reset:
    /*
    console.log('🗑️  Deleting all referral bonus records...');
    await prisma.referralBonus.deleteMany();
    
    console.log('🗑️  Deleting all referral bonus transactions...');
    await prisma.transaction.deleteMany({
      where: { type: 'REFERRAL_BONUS' }
    });
    
    console.log('🔄 Resetting wallet referral bonus totals...');
    await prisma.wallet.updateMany({
      data: { totalReferralBonus: 0 }
    });
    
    console.log('✅ All referral bonuses reset!');
    */
    
  } catch (error) {
    console.error('❌ Error resetting referral bonuses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to validate referral relationships
async function validateReferralRelationships() {
  try {
    console.log('🔍 Validating referral relationships...');
    
    // Check for orphaned referral relationships
    const orphanedReferrals = await prisma.user.findMany({
      where: {
        referredBy: {
          not: null
        },
        referrer: null
      }
    });
    
    if (orphanedReferrals.length > 0) {
      console.log(`⚠️  Found ${orphanedReferrals.length} orphaned referral relationships:`);
      orphanedReferrals.forEach(user => {
        console.log(`   User ${user.email || user.phone} (ID: ${user.id}) refers to non-existent user ${user.referredBy}`);
      });
    } else {
      console.log('✅ No orphaned referral relationships found');
    }
    
    // Check for circular referrals
    const users = await prisma.user.findMany({
      where: {
        referredBy: {
          not: null
        }
      },
      include: {
        referrer: true
      }
    });
    
    let circularCount = 0;
    for (const user of users) {
      if (user.referrer && user.referrer.referredBy === user.id) {
        console.log(`⚠️  Circular referral detected: ${user.email || user.phone} ↔ ${user.referrer.email || user.referrer.phone}`);
        circularCount++;
      }
    }
    
    if (circularCount === 0) {
      console.log('✅ No circular referrals found');
    }
    
    console.log(`\n📊 Validation Summary:`);
    console.log(`   Total users with referrers: ${users.length}`);
    console.log(`   Orphaned relationships: ${orphanedReferrals.length}`);
    console.log(`   Circular referrals: ${circularCount}`);
    
  } catch (error) {
    console.error('❌ Error validating referral relationships:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main function to run all referral system operations
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'restart':
      await restartAllUserReferrals();
      break;
    case 'reset':
      await resetAllReferralBonuses();
      break;
    case 'validate':
      await validateReferralRelationships();
      break;
    default:
      console.log('🔄 Referral System Management Script');
      console.log('');
      console.log('Usage: node restart-referrals.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  restart  - Restart all user referrals (process bonuses for existing VIP users)');
      console.log('  reset    - Reset all referral bonuses (DANGEROUS - deletes all bonus records)');
      console.log('  validate - Validate referral relationships (check for orphaned/circular refs)');
      console.log('');
      console.log('Examples:');
      console.log('  node restart-referrals.js restart');
      console.log('  node restart-referrals.js validate');
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
  restartAllUserReferrals,
  resetAllReferralBonuses,
  validateReferralRelationships
};
