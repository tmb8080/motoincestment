const { PrismaClient } = require('@prisma/client');
const { processVipReferralBonus } = require('../services/vipReferralService');

const prisma = new PrismaClient();

async function testReferralBonus() {
  try {
    console.log('🧪 Testing referral bonus system...');
    
    // Check if we have users with referral relationships
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
        }
      },
      take: 5
    });
    
    console.log(`Found ${usersWithReferrers.length} users with referrers`);
    
    if (usersWithReferrers.length === 0) {
      console.log('❌ No users with referrers found. Creating test data...');
      
      // Create test users
      const referrer = await prisma.user.create({
        data: {
          email: 'referrer@test.com',
          fullName: 'Test Referrer',
          phone: '+1234567890',
          password: 'hashedpassword',
          referralCode: 'TESTREF001',
          wallet: {
            create: {
              balance: 0,
              totalDeposits: 0,
              totalWithdrawals: 0,
              totalEarnings: 0,
              totalReferralBonus: 0,
              dailyEarnings: 0
            }
          }
        },
        include: {
          wallet: true
        }
      });
      
      const referredUser = await prisma.user.create({
        data: {
          email: 'referred@test.com',
          fullName: 'Test Referred User',
          phone: '+1234567891',
          password: 'hashedpassword',
          referralCode: 'TESTREF002',
          referredBy: referrer.id,
          wallet: {
            create: {
              balance: 0,
              totalDeposits: 0,
              totalWithdrawals: 0,
              totalEarnings: 0,
              totalReferralBonus: 0,
              dailyEarnings: 0
            }
          }
        },
        include: {
          wallet: true,
          referredBy: {
            include: {
              wallet: true
            }
          }
        }
      });
      
      console.log('✅ Test users created');
      console.log(`Referrer: ${referrer.email} (ID: ${referrer.id})`);
      console.log(`Referred: ${referredUser.email} (ID: ${referredUser.id})`);
      
      // Test referral bonus processing
      console.log('🧪 Testing referral bonus processing...');
      const vipLevel = await prisma.vipLevel.findFirst({
        where: { isActive: true },
        orderBy: { amount: 'asc' }
      });
      
      if (vipLevel) {
        console.log(`Using VIP level: ${vipLevel.name} ($${vipLevel.amount})`);
        
        const results = await processVipReferralBonus(
          referredUser.id,
          vipLevel.id,
          parseFloat(vipLevel.amount)
        );
        
        if (results && results.length > 0) {
          console.log('✅ Referral bonus processed successfully!');
          console.log(`Processed ${results.length} bonus(es)`);
          
          // Check referrer's wallet
          const updatedReferrer = await prisma.user.findUnique({
            where: { id: referrer.id },
            include: { wallet: true }
          });
          
          console.log(`Referrer's total referral bonus: $${updatedReferrer.wallet.totalReferralBonus}`);
          console.log(`Referrer's balance: $${updatedReferrer.wallet.balance}`);
          
          // Check referral bonus records
          const bonusRecords = await prisma.referralBonus.findMany({
            where: { referrerId: referrer.id },
            include: {
              referred: {
                select: { email: true, fullName: true }
              }
            }
          });
          
          console.log(`Found ${bonusRecords.length} referral bonus records:`);
          bonusRecords.forEach((record, index) => {
            console.log(`  ${index + 1}. Level ${record.level}: $${record.bonusAmount} from ${record.referred.email}`);
          });
          
        } else {
          console.log('❌ No referral bonuses were processed');
        }
      } else {
        console.log('❌ No VIP levels found');
      }
      
      // Clean up test data
      console.log('🧹 Cleaning up test data...');
      await prisma.referralBonus.deleteMany({
        where: {
          OR: [
            { referrerId: referrer.id },
            { referredId: referredUser.id }
          ]
        }
      });
      
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { userId: referrer.id },
            { userId: referredUser.id }
          ]
        }
      });
      
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [referrer.id, referredUser.id]
          }
        }
      });
      
      console.log('✅ Test data cleaned up');
      
    } else {
      console.log('✅ Found existing users with referrers');
      
      // Test with existing data
      const testUser = usersWithReferrers[0];
      console.log(`Testing with user: ${testUser.email} (referred by: ${testUser.referrer.email})`);
      
      const vipLevel = await prisma.vipLevel.findFirst({
        where: { isActive: true },
        orderBy: { amount: 'asc' }
      });
      
      if (vipLevel) {
        console.log(`Using VIP level: ${vipLevel.name} ($${vipLevel.amount})`);
        
        const results = await processVipReferralBonus(
          testUser.id,
          vipLevel.id,
          parseFloat(vipLevel.amount)
        );
        
        if (results && results.length > 0) {
          console.log('✅ Referral bonus processed successfully!');
          console.log(`Processed ${results.length} bonus(es)`);
        } else {
          console.log('❌ No referral bonuses were processed');
        }
      }
    }
    
    console.log('✅ Referral bonus test completed!');
    
  } catch (error) {
    console.error('❌ Error testing referral bonus:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testReferralBonus()
    .then(() => {
      console.log('🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testReferralBonus };
