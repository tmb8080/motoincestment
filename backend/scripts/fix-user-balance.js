const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserBalance(userId) {
  try {
    console.log(`Fixing balance for user: ${userId}`);
    
    // Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      console.log('Wallet not found');
      return;
    }
    
    console.log('Current wallet balance:', wallet.balance);
    
    // Calculate actual balance from transactions
    const deposits = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT'
      },
      _sum: { amount: true }
    });
    
    const vipEarnings = await prisma.transaction.aggregate({
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
    
    const withdrawals = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'WITHDRAWAL'
      },
      _sum: { amount: true }
    });
    
    const vipPayments = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'VIP_PAYMENT'
      },
      _sum: { amount: true }
    });
    
    const totalDeposits = parseFloat(deposits._sum.amount || 0);
    const totalEarnings = parseFloat(vipEarnings._sum.amount || 0);
    const totalBonuses = parseFloat(referralBonuses._sum.amount || 0);
    const totalWithdrawals = parseFloat(withdrawals._sum.amount || 0);
    const totalVipPayments = parseFloat(vipPayments._sum.amount || 0);
    
    const calculatedBalance = totalDeposits + totalEarnings + totalBonuses - totalWithdrawals - totalVipPayments;
    
    console.log('Transaction summary:');
    console.log(`- Deposits: ${totalDeposits}`);
    console.log(`- VIP Earnings: ${totalEarnings}`);
    console.log(`- Referral Bonuses: ${totalBonuses}`);
    console.log(`- Withdrawals: ${totalWithdrawals}`);
    console.log(`- VIP Payments: ${totalVipPayments}`);
    console.log(`- Calculated Balance: ${calculatedBalance}`);
    
    // Update wallet with correct balance
    await prisma.wallet.update({
      where: { userId },
      data: {
        balance: Math.max(0, calculatedBalance), // Never go below 0
        totalDeposits: totalDeposits,
        totalEarnings: totalEarnings,
        totalReferralBonus: totalBonuses
      }
    });
    
    console.log('✅ Wallet balance fixed!');
    
  } catch (error) {
    console.error('Error fixing balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node fix-user-balance.js <userId>');
  process.exit(1);
}

fixUserBalance(userId);
