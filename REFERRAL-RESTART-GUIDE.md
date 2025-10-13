# 🚀 Referral System Restart Script

## Quick Start

To restart all user referrals in your system, run this command:

```bash
cd backend
npm run referrals:restart
```

## What This Script Does

✅ **Finds all users with referral relationships**  
✅ **Processes referral bonuses for VIP users**  
✅ **Updates wallet balances**  
✅ **Creates transaction records**  
✅ **Shows detailed statistics**  
✅ **Prevents duplicate processing**  

## Available Commands

| Command | Purpose | Safety Level |
|---------|---------|--------------|
| `npm run referrals:restart` | Restart all user referrals | ✅ Safe |
| `npm run referrals:validate` | Check referral data integrity | ✅ Safe |
| `npm run fix:referral-rates` | Fix admin referral rates | ✅ Safe |
| `npm run test:referral-bonus` | Test referral system | ✅ Safe |
| `npm run referrals:reset` | Reset all bonuses (DANGEROUS) | ⚠️ Destructive |

## Example Output

```
🔄 Restarting all user referrals in the system...
Found 1 users with referrers

👤 Processing user: 0789028283 (ID: 371b5a1d-b0a6-417a-8cf6-dcd1d6aacc3e)
   Referred by: habaruremajules@gmail.com (ID: 3bd7a0a1-75e0-4cf4-8a53-94a26d57d719)
   VIP Level: Starter ($1)
   ✅ Processed 1 referral bonus(es)
      Level 1: $0.10 to habaruremajules@gmail.com

📊 Summary:
✅ Successfully processed: 1 users
❌ Errors encountered: 0 users
📈 Total users with referrers: 1

📈 Referral Statistics:
💰 Total referral bonuses paid: $200.10
📊 Total bonus transactions: 2

🏆 Top Referrers:
   habaruremajules@gmail.com: $200.10 (2 bonuses)

✅ Referral system restart completed!
```

## When to Use

🔄 **Use `referrals:restart` when:**
- After fixing referral bonus issues
- When referral bonuses weren't processed for existing VIP users
- To ensure all referral relationships are properly activated
- After updating referral rates in admin settings

🔍 **Use `referrals:validate` when:**
- Before making changes to the referral system
- To check data integrity
- When troubleshooting referral issues

## Safety Features

- ✅ **Duplicate Prevention**: Won't process bonuses that already exist
- ✅ **Error Handling**: Continues processing even if individual users fail
- ✅ **Detailed Logging**: Shows exactly what's happening for each user
- ✅ **Validation**: Checks for data integrity issues
- ✅ **Statistics**: Provides comprehensive reporting

## Referral Bonus Rates

The system uses these default rates (configurable in admin panel):
- **Level 1 (Direct)**: 10% of VIP amount
- **Level 2 (Indirect)**: 5% of VIP amount  
- **Level 3 (Third Level)**: 2% of VIP amount

## Troubleshooting

### If the script shows errors:
1. Run `npm run referrals:validate` to check for data issues
2. Run `npm run fix:referral-rates` to ensure rates are configured
3. Check that VIP levels are properly seeded
4. Verify users have valid referral relationships

### If no bonuses are processed:
- Users might not have VIP levels yet
- Referral bonuses might already be processed
- Check admin settings for referral rates

## Important Notes

- **Email Errors**: Email sending errors are normal if SMTP isn't configured
- **Rate Changes**: Referral rates can be changed in the admin panel
- **Multi-level**: The system supports up to 3 levels of referrals
- **Safe to Run**: The restart command is safe to run multiple times

## Support

If you encounter issues:
1. Check database connection
2. Ensure admin settings exist
3. Verify VIP levels are seeded
4. Check server logs for detailed errors

---

**Ready to restart your referral system? Run:**
```bash
npm run referrals:restart
```
