const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWithdrawalBalanceTracking() {
  try {
    console.log('🔧 Fixing withdrawal balance tracking system...');
    
    // Get all users with wallets
    const users = await prisma.user.findMany({
      include: {
        wallet: true
      }
    });
    
    console.log(`Found ${users.length} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n👤 Processing user: ${user.email || user.phone || 'Unknown'} (ID: ${user.id})`);
        
        // Calculate actual earnings from transactions
        const dailyTaskEarnings = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'VIP_EARNINGS'
          },
          _sum: { amount: true }
        });
        
        const referralBonuses = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'REFERRAL_BONUS'
          },
          _sum: { amount: true }
        });
        
        const withdrawals = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'WITHDRAWAL'
          },
          _sum: { amount: true }
        });
        
        const actualEarnings = parseFloat(dailyTaskEarnings._sum.amount || 0);
        const actualBonuses = parseFloat(referralBonuses._sum.amount || 0);
        const totalWithdrawn = parseFloat(withdrawals._sum.amount || 0);
        
        const totalEarned = actualEarnings + actualBonuses;
        const availableBalance = totalEarned - totalWithdrawn;
        
        // Calculate daily earnings (proportional to total earnings)
        const currentDailyEarnings = parseFloat(user.wallet.dailyEarnings || 0);
        let adjustedDailyEarnings = currentDailyEarnings;
        
        if (actualEarnings > 0 && totalEarned > 0) {
          // Calculate what percentage of earnings have been withdrawn
          const earningsWithdrawnRatio = Math.min(totalWithdrawn / totalEarned, 1);
          const earningsDeduction = actualEarnings * earningsWithdrawnRatio;
          
          // Adjust daily earnings proportionally
          adjustedDailyEarnings = Math.max(0, currentDailyEarnings - (earningsDeduction / actualEarnings) * currentDailyEarnings);
        }
        
        console.log(`   Earnings: $${actualEarnings.toFixed(2)}`);
        console.log(`   Bonuses: $${actualBonuses.toFixed(2)}`);
        console.log(`   Daily Earnings: $${currentDailyEarnings.toFixed(2)} → $${adjustedDailyEarnings.toFixed(2)}`);
        console.log(`   Total Earned: $${totalEarned.toFixed(2)}`);
        console.log(`   Total Withdrawn: $${totalWithdrawn.toFixed(2)}`);
        console.log(`   Available Balance: $${availableBalance.toFixed(2)}`);
        
        // Update wallet with correct totals
        await prisma.wallet.update({
          where: { userId: user.id },
          data: {
            totalEarnings: actualEarnings,
            totalReferralBonus: actualBonuses,
            dailyEarnings: adjustedDailyEarnings,
            balance: Math.max(0, availableBalance) // Ensure balance doesn't go negative
          }
        });
        
        console.log(`   ✅ Updated wallet totals`);
        processedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors encountered: ${errorCount} users`);
    console.log(`📈 Total users: ${users.length}`);
    
    console.log('\n✅ Withdrawal balance tracking fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing withdrawal balance tracking:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to test withdrawal balance calculation
async function testWithdrawalBalance(userId) {
  try {
    console.log(`🧪 Testing withdrawal balance calculation for user ${userId}...`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.email || user.phone || 'Unknown'}`);
    
    // Calculate actual earnings from transactions
    const dailyTaskEarnings = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'VIP_EARNINGS'
      },
      _sum: { amount: true }
    });
    
    const referralBonuses = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'REFERRAL_BONUS'
      },
      _sum: { amount: true }
    });
    
    const withdrawals = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'WITHDRAWAL'
      },
      _sum: { amount: true }
    });
    
    const actualEarnings = parseFloat(dailyTaskEarnings._sum.amount || 0);
    const actualBonuses = parseFloat(referralBonuses._sum.amount || 0);
    const totalWithdrawn = parseFloat(withdrawals._sum.amount || 0);
    
    const totalEarned = actualEarnings + actualBonuses;
    const availableBalance = totalEarned - totalWithdrawn;
    
    console.log('\n📊 Balance Calculation:');
    console.log(`   Daily Task Earnings: $${actualEarnings.toFixed(2)}`);
    console.log(`   Referral Bonuses: $${actualBonuses.toFixed(2)}`);
    console.log(`   Total Earned: $${totalEarned.toFixed(2)}`);
    console.log(`   Total Withdrawn: $${totalWithdrawn.toFixed(2)}`);
    console.log(`   Available Balance: $${availableBalance.toFixed(2)}`);
    
    console.log('\n📊 Wallet Table Values:');
    console.log(`   Wallet Balance: $${parseFloat(user.wallet.balance).toFixed(2)}`);
    console.log(`   Total Earnings: $${parseFloat(user.wallet.totalEarnings).toFixed(2)}`);
    console.log(`   Total Referral Bonus: $${parseFloat(user.wallet.totalReferralBonus).toFixed(2)}`);
    console.log(`   Daily Earnings: $${parseFloat(user.wallet.dailyEarnings).toFixed(2)}`);
    
    console.log('\n📊 Transaction History:');
    
    // Show recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    recentTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type}: $${parseFloat(tx.amount).toFixed(2)} - ${tx.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing withdrawal balance:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  const userId = process.argv[3];
  
  switch (command) {
    case 'fix':
      await fixWithdrawalBalanceTracking();
      break;
    case 'test':
      if (!userId) {
        console.log('❌ Please provide a user ID for testing');
        console.log('Usage: node fix-withdrawal-balance.js test <userId>');
        return;
      }
      await testWithdrawalBalance(userId);
      break;
    default:
      console.log('🔧 Withdrawal Balance Fix Script');
      console.log('');
      console.log('Usage: node fix-withdrawal-balance.js <command> [userId]');
      console.log('');
      console.log('Commands:');
      console.log('  fix  - Fix withdrawal balance tracking for all users');
      console.log('  test - Test withdrawal balance calculation for specific user');
      console.log('');
      console.log('Examples:');
      console.log('  node fix-withdrawal-balance.js fix');
      console.log('  node fix-withdrawal-balance.js test user-id-here');
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
  fixWithdrawalBalanceTracking,
  testWithdrawalBalance
};
