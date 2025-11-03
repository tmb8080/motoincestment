const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTasks() {
  try {
    console.log('Seeding daily earning task...');

    const dailyEarningTask = {
      title: 'Daily Earning Session',
      description: 'Start your daily 10-second earning session to earn based on your VIP level daily earning rate',
      type: 'DAILY_EARNING',
      reward: 0, // Reward is based on VIP level, not fixed amount
      isRepeatable: true,
      cooldownHours: 24,
      requirements: {
        action: 'start_earning_session',
        vipLevel: 'required',
        duration: '24_hours'
      }
    };

    // Remove all existing user tasks first (due to foreign key constraint)
    await prisma.userTask.deleteMany({});
    console.log('Removed all existing user tasks');
    
    // Remove all existing tasks
    await prisma.task.deleteMany({});
    console.log('Removed all existing tasks');

    // Create only the daily earning task
    const task = await prisma.task.create({
      data: dailyEarningTask
    });

    console.log(`Created daily earning task: ${task.title}`);
    console.log('Task seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedTasks()
    .then(() => {
      console.log('Task seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Task seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTasks };
