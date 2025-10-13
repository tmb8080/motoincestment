# 🔄 Referral Bonus Reset & Restart Script

## Quick Start

To remove all referral bonuses and restart the referral system:

```bash
cd backend
npm run referrals:reset-restart
```

## What This Script Does

### Step 1: Reset (Remove All Bonuses)
✅ **Deletes all referral bonus records**  
✅ **Deletes all referral bonus transactions**  
✅ **Resets all users' totalReferralBonus wallet balances**  
✅ **Gives you a clean slate**  

### Step 2: Restart (Reassign Bonuses)
✅ **Finds all users with referral relationships**  
✅ **Processes referral bonuses for VIP users**  
✅ **Updates wallet balances**  
✅ **Creates new transaction records**  
✅ **Shows detailed statistics**  

## Available Commands

| Command | Purpose | Safety Level |
|---------|---------|--------------|
| `npm run referrals:preview` | Show what will be reset (dry run) | ✅ Safe |
| `npm run referrals:reset-restart` | Reset and restart all bonuses | ⚠️ Destructive |

## Example Output

```
🔄 Resetting and restarting all referral bonuses...

📊 Current Referral Bonus State:
💰 Total referral bonuses: $200.10
📊 Total bonus records: 2
📊 Total bonus transactions: 2

🗑️  Step 1: Removing all referral bonuses...
✅ Deleted 2 referral bonus records
✅ Deleted 2 referral bonus transactions
✅ Reset totalReferralBonus for 5 wallets

✅ All referral bonuses have been removed!

🔄 Step 2: Restarting referral bonuses...
Found 1 users with referrers

👤 Processing user: 0789028283
   Referred by: habaruremajules@gmail.com
   VIP Level: Starter ($1)
   ✅ Processed 1 referral bonus(es)
      Level 1: $0.10 to habaruremajules@gmail.com

📊 Final Summary:
✅ Successfully processed: 1 users
💰 Total bonuses processed: 1
💵 Total amount processed: $0.10

📈 New Referral Statistics:
💰 Total referral bonuses paid: $0.10
📊 Total bonus transactions: 1

✅ Referral bonus reset and restart completed successfully!
```

## When to Use

🔄 **Use `referrals:reset-restart` when:**
- You want to start fresh with referral bonuses
- There are issues with existing referral bonus calculations
- You've changed referral rates and want to recalculate all bonuses
- You need to clean up corrupted referral bonus data
- After major changes to the referral system

🔍 **Use `referrals:preview` when:**
- You want to see what will be reset before running the actual command
- You want to check the current state of referral bonuses
- You want to verify the impact before making changes

## Safety Features

- ✅ **Preview Mode**: See what will be reset before running
- ✅ **Detailed Logging**: Shows exactly what's happening
- ✅ **Error Handling**: Continues processing even if individual users fail
- ✅ **Statistics**: Provides comprehensive before/after reporting
- ✅ **Database Consistency**: Waits for database consistency between operations

## Important Warnings

⚠️ **This script will:**
- Delete ALL existing referral bonus records
- Delete ALL existing referral bonus transactions  
- Reset ALL users' totalReferralBonus wallet balances
- This action CANNOT be undone

⚠️ **Make sure to:**
- Backup your database before running this script
- Test in a development environment first
- Verify that referral rates are properly configured
- Ensure VIP levels are properly seeded

## Referral Bonus Rates

The system uses these default rates (configurable in admin panel):
- **Level 1 (Direct)**: 10% of VIP amount
- **Level 2 (Indirect)**: 5% of VIP amount  
- **Level 3 (Third Level)**: 2% of VIP amount

## Troubleshooting

### If the script shows errors:
1. Run `npm run referrals:preview` to check current state
2. Run `npm run fix:referral-rates` to ensure rates are configured
3. Check that VIP levels are properly seeded
4. Verify users have valid referral relationships

### If no bonuses are processed:
- Users might not have VIP levels yet
- Check admin settings for referral rates
- Verify referral relationships are properly established

## Comparison with Other Scripts

| Script | Purpose | Safety |
|--------|---------|--------|
| `referrals:restart` | Process bonuses for users who haven't received them | ✅ Safe |
| `referrals:reset-restart` | Delete all bonuses and restart from scratch | ⚠️ Destructive |
| `referrals:validate` | Check referral data integrity | ✅ Safe |

## Support

If you encounter issues:
1. Check database connection
2. Ensure admin settings exist
3. Verify VIP levels are seeded
4. Check server logs for detailed errors

---

**Ready to reset and restart your referral system? Run:**
```bash
npm run referrals:preview    # See what will be reset
npm run referrals:reset-restart  # Reset and restart
```
