const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAllWalletData() {
  try {
    console.log('🔄 Synchronizing wallet data for all users...');
    
    const users = await prisma.user.findMany({
      include: { wallet: true }
    });
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      if (!user.wallet) {
        console.log(`⚠️  User ${user.email || user.phone} has no wallet - skipping`);
        continue;
      }
      
      try {
        // Get transaction data
        const vipEarnings = await prisma.transaction.aggregate({
          where: { userId: user.id, type: 'VIP_EARNINGS' },
          _sum: { amount: true }
        });
        
        const referralBonuses = await prisma.transaction.aggregate({
          where: { userId: user.id, type: 'REFERRAL_BONUS' },
          _sum: { amount: true }
        });
        
        const withdrawals = await prisma.withdrawal.aggregate({
          where: { 
            userId: user.id, 
            status: { in: ['COMPLETED', 'APPROVED'] } 
          },
          _sum: { amount: true }
        });
        
        const totalEarnings = parseFloat(vipEarnings._sum.amount || 0);
        const totalReferralBonus = parseFloat(referralBonuses._sum.amount || 0);
        const totalWithdrawn = parseFloat(withdrawals._sum.amount || 0);
        const withdrawableBalance = Math.max(0, totalEarnings + totalReferralBonus - totalWithdrawn);
        
        // Update wallet with correct data
        await prisma.wallet.update({
          where: { userId: user.id },
          data: {
            totalEarnings: totalEarnings,
            totalReferralBonus: totalReferralBonus
          }
        });
        
        console.log(`✅ ${user.email || user.phone}: Earnings $${totalEarnings.toFixed(2)}, Bonuses $${totalReferralBonus.toFixed(2)}, Withdrawn $${totalWithdrawn.toFixed(2)}, Available $${withdrawableBalance.toFixed(2)}`);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.email || user.phone}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors encountered: ${errorCount} users`);
    console.log(`📈 Total users: ${users.length}`);
    console.log('\n✅ Wallet data synchronization completed!');
    
  } catch (error) {
    console.error('❌ Error in syncAllWalletData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function syncUserWalletData(userId) {
  try {
    console.log(`🔄 Synchronizing wallet data for user ${userId}...`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });
    
    if (!user || !user.wallet) {
      console.log('❌ User or wallet not found.');
      return;
    }
    
    // Get transaction data
    const vipEarnings = await prisma.transaction.aggregate({
      where: { userId, type: 'VIP_EARNINGS' },
      _sum: { amount: true }
    });
    
    const referralBonuses = await prisma.transaction.aggregate({
      where: { userId, type: 'REFERRAL_BONUS' },
      _sum: { amount: true }
    });
    
    const withdrawals = await prisma.withdrawal.aggregate({
      where: { 
        userId, 
        status: { in: ['COMPLETED', 'APPROVED'] } 
      },
      _sum: { amount: true }
    });
    
    const totalEarnings = parseFloat(vipEarnings._sum.amount || 0);
    const totalReferralBonus = parseFloat(referralBonuses._sum.amount || 0);
    const totalWithdrawn = parseFloat(withdrawals._sum.amount || 0);
    const withdrawableBalance = Math.max(0, totalEarnings + totalReferralBonus - totalWithdrawn);
    
    // Update wallet with correct data
    await prisma.wallet.update({
      where: { userId },
      data: {
        totalEarnings: totalEarnings,
        totalReferralBonus: totalReferralBonus
      }
    });
    
    console.log(`✅ User: ${user.email || user.phone}`);
    console.log(`   Total Earnings: $${totalEarnings.toFixed(2)}`);
    console.log(`   Total Referral Bonus: $${totalReferralBonus.toFixed(2)}`);
    console.log(`   Total Withdrawn: $${totalWithdrawn.toFixed(2)}`);
    console.log(`   Available to Withdraw: $${withdrawableBalance.toFixed(2)}`);
    console.log('\n✅ Wallet data synchronized!');
    
  } catch (error) {
    console.error('❌ Error in syncUserWalletData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const action = process.argv[2];
const userId = process.argv[3];

if (action === 'all') {
  syncAllWalletData().catch(console.error);
} else if (action === 'user' && userId) {
  syncUserWalletData(userId).catch(console.error);
} else {
  console.log('Usage: node scripts/sync-wallet-data.js [all|user <userId>]');
}
