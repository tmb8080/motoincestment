const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDailyEarningsForExistingUsers() {
  try {
    console.log('🔧 Fixing daily earnings for existing users...');
    
    // Get all users with VIP earnings
    const usersWithEarnings = await prisma.user.findMany({
      include: {
        wallet: true,
        userVip: {
          include: {
            vipLevel: true
          }
        }
      }
    });
    
    console.log(`Found ${usersWithEarnings.length} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithEarnings) {
      try {
        console.log(`\n👤 Processing user: ${user.email || user.phone || 'Unknown'} (ID: ${user.id})`);
        
        // Get total VIP earnings from transactions
        const vipEarnings = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'VIP_EARNINGS'
          },
          _sum: { amount: true }
        });
        
        const totalVipEarnings = parseFloat(vipEarnings._sum.amount || 0);
        const currentDailyEarnings = parseFloat(user.wallet.dailyEarnings || 0);
        
        console.log(`   Current Daily Earnings: $${currentDailyEarnings.toFixed(2)}`);
        console.log(`   Total VIP Earnings: $${totalVipEarnings.toFixed(2)}`);
        
        if (totalVipEarnings > 0) {
          // Set daily earnings to match total VIP earnings
          await prisma.wallet.update({
            where: { userId: user.id },
            data: {
              dailyEarnings: totalVipEarnings
            }
          });
          
          console.log(`   ✅ Updated daily earnings to $${totalVipEarnings.toFixed(2)}`);
          processedCount++;
        } else {
          console.log(`   ⚠️  No VIP earnings found - skipping`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors encountered: ${errorCount} users`);
    console.log(`📈 Total users: ${usersWithEarnings.length}`);
    
    console.log('\n✅ Daily earnings fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing daily earnings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to test daily earnings for a specific user
async function testDailyEarnings(userId) {
  try {
    console.log(`🧪 Testing daily earnings for user ${userId}...`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.email || user.phone || 'Unknown'}`);
    
    // Get VIP earnings from transactions
    const vipEarnings = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'VIP_EARNINGS'
      },
      _sum: { amount: true }
    });
    
    const totalVipEarnings = parseFloat(vipEarnings._sum.amount || 0);
    const currentDailyEarnings = parseFloat(user.wallet.dailyEarnings || 0);
    
    console.log('\n📊 Daily Earnings Analysis:');
    console.log(`   Total VIP Earnings (from transactions): $${totalVipEarnings.toFixed(2)}`);
    console.log(`   Current Daily Earnings (wallet field): $${currentDailyEarnings.toFixed(2)}`);
    console.log(`   Match: ${totalVipEarnings === currentDailyEarnings ? '✅ Yes' : '❌ No'}`);
    
    if (totalVipEarnings !== currentDailyEarnings) {
      console.log(`   💡 Recommendation: Run fix script to sync daily earnings`);
    }
    
  } catch (error) {
    console.error('❌ Error testing daily earnings:', error);
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
      await fixDailyEarningsForExistingUsers();
      break;
    case 'test':
      if (!userId) {
        console.log('❌ Please provide a user ID for testing');
        console.log('Usage: node fix-daily-earnings.js test <userId>');
        return;
      }
      await testDailyEarnings(userId);
      break;
    default:
      console.log('🔧 Daily Earnings Fix Script');
      console.log('');
      console.log('Usage: node fix-daily-earnings.js <command> [userId]');
      console.log('');
      console.log('Commands:');
      console.log('  fix  - Fix daily earnings for all existing users');
      console.log('  test - Test daily earnings for specific user');
      console.log('');
      console.log('Examples:');
      console.log('  node fix-daily-earnings.js fix');
      console.log('  node fix-daily-earnings.js test user-id-here');
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
  fixDailyEarningsForExistingUsers,
  testDailyEarnings
};
