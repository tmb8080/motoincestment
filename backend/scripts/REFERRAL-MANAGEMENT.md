# Referral System Management Scripts

This directory contains scripts to manage and maintain the referral system in the Moto Investment platform.

## Available Scripts

### 1. Restart All User Referrals
**Command:** `npm run referrals:restart`

This script processes referral bonuses for all users who have VIP levels but may not have received their referral bonuses yet.

**What it does:**
- Finds all users with referral relationships
- Checks if they have VIP levels
- Processes referral bonuses for users who haven't received them yet
- Shows detailed statistics and summary

**Use when:**
- After fixing referral bonus issues
- When referral bonuses weren't processed for existing VIP users
- To ensure all referral relationships are properly activated

### 2. Validate Referral Relationships
**Command:** `npm run referrals:validate`

This script validates the integrity of referral relationships in the system.

**What it does:**
- Checks for orphaned referral relationships (users referring to non-existent users)
- Detects circular referrals (A refers B, B refers A)
- Shows validation summary

**Use when:**
- Before making changes to the referral system
- To check data integrity
- When troubleshooting referral issues

### 3. Reset All Referral Bonuses (DANGEROUS)
**Command:** `npm run referrals:reset`

⚠️ **WARNING: This will delete ALL referral bonus records!**

**What it does:**
- Deletes all referral bonus records
- Deletes all referral bonus transactions
- Resets all users' totalReferralBonus wallet balances

**Use when:**
- Starting fresh with referral system
- After major data corruption
- **ONLY** when you're sure you want to lose all referral bonus history

### 4. Fix Referral Rates
**Command:** `npm run fix:referral-rates`

Ensures admin settings have proper referral bonus rates configured.

### 5. Test Referral Bonus System
**Command:** `npm run test:referral-bonus`

Tests the referral bonus system with sample data.

## Usage Examples

```bash
# Restart all user referrals (most common use case)
npm run referrals:restart

# Validate referral relationships
npm run referrals:validate

# Fix referral rates in admin settings
npm run fix:referral-rates

# Test referral bonus system
npm run test:referral-bonus

# Reset all referral bonuses (DANGEROUS!)
npm run referrals:reset
```

## What Happens When You Restart Referrals

1. **Scan Users**: Finds all users who have referrers
2. **Check VIP Status**: Verifies if users have active VIP levels
3. **Process Bonuses**: Calculates and processes referral bonuses for:
   - Level 1 (Direct referrals): 10% by default
   - Level 2 (Indirect referrals): 5% by default  
   - Level 3 (Third-level referrals): 2% by default
4. **Update Wallets**: Adds bonus amounts to referrers' wallets
5. **Create Records**: Creates transaction and bonus records
6. **Show Statistics**: Displays comprehensive summary

## Safety Features

- **Duplicate Prevention**: Won't process bonuses that already exist
- **Error Handling**: Continues processing even if individual users fail
- **Detailed Logging**: Shows exactly what's happening for each user
- **Validation**: Checks for data integrity issues
- **Statistics**: Provides comprehensive reporting

## Troubleshooting

### If referrals aren't working:
1. Run `npm run referrals:validate` to check for data issues
2. Run `npm run fix:referral-rates` to ensure rates are configured
3. Run `npm run referrals:restart` to process existing referrals
4. Run `npm run test:referral-bonus` to test the system

### If you see errors:
- Check that the database is running
- Ensure admin settings exist
- Verify VIP levels are properly seeded
- Check that users have valid referral relationships

## Important Notes

- **Backup First**: Always backup your database before running reset commands
- **Test Environment**: Test these scripts in a development environment first
- **Email Errors**: Email sending errors are normal if SMTP isn't configured
- **Rate Changes**: Referral rates can be changed in the admin panel
- **Multi-level**: The system supports up to 3 levels of referrals

## Support

If you encounter issues with these scripts, check:
1. Database connection
2. Admin settings configuration
3. VIP levels seeding
4. User referral relationships
5. Server logs for detailed error messages
