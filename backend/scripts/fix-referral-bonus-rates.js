const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixReferralBonusRates() {
  try {
    console.log('🔧 Fixing referral bonus rates in admin settings...');
    
    // Check if admin settings exist
    let adminSettings = await prisma.adminSettings.findFirst();
    
    if (!adminSettings) {
      // Create admin settings with default referral rates
      console.log('📝 Creating admin settings with default referral rates...');
      adminSettings = await prisma.adminSettings.create({
        data: {
          dailyGrowthRate: 0.01,
          minDepositAmount: 10,
          minWithdrawalAmount: 20,
          isDepositEnabled: true,
          isWithdrawalEnabled: true,
          isRegistrationEnabled: true,
          maintenanceMode: false,
          referralBonusLevel1Rate: 0.10, // 10%
          referralBonusLevel2Rate: 0.05, // 5%
          referralBonusLevel3Rate: 0.02  // 2%
        }
      });
      console.log('✅ Admin settings created with referral rates');
    } else {
      // Update existing admin settings to ensure referral rates are set
      console.log('📝 Updating existing admin settings with referral rates...');
      
      const updateData = {};
      
      // Check if referral rates are null or undefined and set defaults
      if (adminSettings.referralBonusLevel1Rate === null || adminSettings.referralBonusLevel1Rate === undefined) {
        updateData.referralBonusLevel1Rate = 0.10; // 10%
        console.log('Setting Level 1 rate to 10%');
      }
      
      if (adminSettings.referralBonusLevel2Rate === null || adminSettings.referralBonusLevel2Rate === undefined) {
        updateData.referralBonusLevel2Rate = 0.05; // 5%
        console.log('Setting Level 2 rate to 5%');
      }
      
      if (adminSettings.referralBonusLevel3Rate === null || adminSettings.referralBonusLevel3Rate === undefined) {
        updateData.referralBonusLevel3Rate = 0.02; // 2%
        console.log('Setting Level 3 rate to 2%');
      }
      
      // Only update if there are changes to make
      if (Object.keys(updateData).length > 0) {
        adminSettings = await prisma.adminSettings.update({
          where: { id: adminSettings.id },
          data: updateData
        });
        console.log('✅ Admin settings updated with referral rates');
      } else {
        console.log('✅ Admin settings already have referral rates configured');
      }
    }
    
    // Display current rates
    console.log('📊 Current referral bonus rates:');
    console.log(`Level 1 (Direct): ${(parseFloat(adminSettings.referralBonusLevel1Rate) * 100).toFixed(1)}%`);
    console.log(`Level 2 (Indirect): ${(parseFloat(adminSettings.referralBonusLevel2Rate) * 100).toFixed(1)}%`);
    console.log(`Level 3 (Third Level): ${(parseFloat(adminSettings.referralBonusLevel3Rate) * 100).toFixed(1)}%`);
    
    console.log('✅ Referral bonus rates fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing referral bonus rates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixReferralBonusRates()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixReferralBonusRates };
