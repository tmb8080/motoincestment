const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { updateWalletBalance } = require('./walletService');
const { sendEmail } = require('./emailService');

const prisma = new PrismaClient();

// Verify withdrawal request before processing
const verifyWithdrawalRequest = async (withdrawalId) => {
  try {
    console.log(`Verifying withdrawal request ${withdrawalId}`);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isEmailVerified: true,
            isPhoneVerified: true
          }
        }
      }
    });

    if (!withdrawal) {
      throw new Error(`Withdrawal ${withdrawalId} not found`);
    }

    if (withdrawal.status !== 'PENDING') {
      return {
        verified: false,
        message: `Withdrawal already processed with status: ${withdrawal.status}`
      };
    }

    // Note: Email verification check removed - users without email can make withdrawals

    // Check wallet address validity
    const addressValidation = await validateCryptoAddress(
      withdrawal.walletAddress,
      withdrawal.currency,
      withdrawal.network
    );

    if (!addressValidation.valid) {
      return {
        verified: false,
        message: `Invalid wallet address: ${addressValidation.message}`
      };
    }

    // Check user's wallet balance (amount + fee)
    const wallet = await prisma.wallet.findUnique({
      where: { userId: withdrawal.userId }
    });

    const totalDebit = parseFloat(withdrawal.amount) + parseFloat(withdrawal.feeAmount || 0);
    if (!wallet || parseFloat(wallet.balance) < totalDebit) {
      return {
        verified: false,
        message: 'Insufficient balance for withdrawal including fees'
      };
    }

    // Check for suspicious activity
    const suspiciousActivity = await checkSuspiciousActivity(withdrawal.userId, withdrawal.amount);
    if (suspiciousActivity.suspicious) {
      return {
        verified: false,
        message: `Suspicious activity detected: ${suspiciousActivity.reason}`,
        requiresManualReview: true
      };
    }

    // Check withdrawal limits
    const limitCheck = await checkWithdrawalLimits(withdrawal.userId, withdrawal.amount, withdrawal.currency);
    if (!limitCheck.allowed) {
      return {
        verified: false,
        message: `Withdrawal limit exceeded: ${limitCheck.message}`
      };
    }

    return {
      verified: true,
      message: 'Withdrawal request verified successfully',
      withdrawal,
      wallet,
      addressValidation,
      limitCheck
    };

  } catch (error) {
    console.error(`Error verifying withdrawal request ${withdrawalId}:`, error);
    throw error;
  }
};

// Validate crypto address
const validateCryptoAddress = async (address, currency, network) => {
  try {
    // Basic format validation
    const validationResult = {
      valid: false,
      message: '',
      addressType: '',
      network: network
    };

    switch (currency) {
      case 'USDT':
        return await validateUsdtAddress(address, network);
      case 'BTC':
        return await validateBitcoinAddress(address);
      case 'ETH':
        return await validateEthereumAddress(address);
      case 'USDC':
        return await validateUsdcAddress(address, network);
      default:
        validationResult.message = `Unsupported currency: ${currency}`;
        return validationResult;
    }

  } catch (error) {
    console.error('Error validating crypto address:', error);
    return {
      valid: false,
      message: 'Address validation failed',
      addressType: '',
      network: network
    };
  }
};

// Validate USDT address based on network
const validateUsdtAddress = async (address, network) => {
  const validationResult = {
    valid: false,
    message: '',
    addressType: 'USDT',
    network: network
  };

  try {
    switch (network) {
      case 'BEP20':
      case 'POLYGON':
        // Ethereum-style address validation (0x followed by 40 hex characters)
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          validationResult.message = 'Invalid Ethereum-style address format';
          return validationResult;
        }
        break;

      default:
        validationResult.message = `Unsupported network for USDT: ${network}`;
        return validationResult;
    }

    // Additional validation using blockchain APIs
    const apiValidation = await validateAddressOnBlockchain(address, network);
    if (!apiValidation.valid) {
      validationResult.message = apiValidation.message;
      return validationResult;
    }

    validationResult.valid = true;
    validationResult.message = 'Address validated successfully';
    return validationResult;

  } catch (error) {
    console.error('Error validating USDT address:', error);
    validationResult.message = 'Address validation failed';
    return validationResult;
  }
};

// Validate Bitcoin address
const validateBitcoinAddress = async (address) => {
  const validationResult = {
    valid: false,
    message: '',
    addressType: 'BTC',
    network: 'BTC'
  };

  try {
    // Basic Bitcoin address format validation
    // Legacy (1...), SegWit (3...), Native SegWit (bc1...)
    const btcRegex = /^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    
    if (!btcRegex.test(address)) {
      validationResult.message = 'Invalid Bitcoin address format';
      return validationResult;
    }

    // Additional validation using Bitcoin API
    const apiValidation = await validateBitcoinAddressOnChain(address);
    if (!apiValidation.valid) {
      validationResult.message = apiValidation.message;
      return validationResult;
    }

    validationResult.valid = true;
    validationResult.message = 'Bitcoin address validated successfully';
    return validationResult;

  } catch (error) {
    console.error('Error validating Bitcoin address:', error);
    validationResult.message = 'Bitcoin address validation failed';
    return validationResult;
  }
};

// Validate Ethereum address
const validateEthereumAddress = async (address) => {
  const validationResult = {
    valid: false,
    message: '',
    addressType: 'ETH',
    network: 'ETH'
  };

  try {
    // Ethereum address format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      validationResult.message = 'Invalid Ethereum address format';
      return validationResult;
    }

    // Check if address is a contract (optional)
    const isContract = await checkIfEthereumContract(address);
    if (isContract) {
      validationResult.message = 'Address is a contract, not a wallet address';
      return validationResult;
    }

    validationResult.valid = true;
    validationResult.message = 'Ethereum address validated successfully';
    return validationResult;

  } catch (error) {
    console.error('Error validating Ethereum address:', error);
    validationResult.message = 'Ethereum address validation failed';
    return validationResult;
  }
};

// Validate USDC address
const validateUsdcAddress = async (address, network) => {
  const validationResult = {
    valid: false,
    message: '',
    addressType: 'USDC',
    network: network
  };

  try {
    // USDC uses the same address format as USDT for most networks
    return await validateUsdtAddress(address, network);

  } catch (error) {
    console.error('Error validating USDC address:', error);
    validationResult.message = 'USDC address validation failed';
    return validationResult;
  }
};

// Validate address on blockchain
const validateAddressOnBlockchain = async (address, network) => {
  try {
    switch (network) {
      case 'BEP20':
        return await validateBscAddress(address);
      case 'POLYGON':
        return await validateEthereumAddressOnChain(address, network);
      default:
        return { valid: false, message: `Unsupported network: ${network}` };
    }
  } catch (error) {
    console.error('Error validating address on blockchain:', error);
    return { valid: false, message: 'Blockchain validation failed' };
  }
};


// Validate BSC address
const validateBscAddress = async (address) => {
  try {
    const apiKey = process.env.BSCSCAN_API_KEY;
    const response = await axios.get(
      `https://api.bscscan.com/api?module=account&action=balance&address=${address}&apikey=${apiKey}`
    );

    if (response.data.status === '1') {
      return { valid: true, message: 'BSC address validated' };
    } else {
      return { valid: false, message: 'Invalid BSC address' };
    }
  } catch (error) {
    console.error('Error validating BSC address:', error);
    return { valid: false, message: 'BSC address validation failed' };
  }
};

// Validate Ethereum address on chain
const validateEthereumAddressOnChain = async (address, network) => {
  try {
    let apiUrl;
    let apiKey;

    if (network === 'POLYGON') {
      apiKey = process.env.POLYGONSCAN_API_KEY;
      apiUrl = `https://api.polygonscan.com/api?module=account&action=balance&address=${address}&apikey=${apiKey}`;
    } else {
      apiKey = process.env.ETHERSCAN_API_KEY;
      apiUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&apikey=${apiKey}`;
    }

    const response = await axios.get(apiUrl);

    if (response.data.status === '1') {
      return { valid: true, message: `${network} address validated` };
    } else {
      return { valid: false, message: `Invalid ${network} address` };
    }
  } catch (error) {
    console.error(`Error validating ${network} address:`, error);
    return { valid: false, message: `${network} address validation failed` };
  }
};

// Validate Bitcoin address on chain
const validateBitcoinAddressOnChain = async (address) => {
  try {
    const response = await axios.get(`https://blockstream.info/api/address/${address}`);
    
    if (response.status === 200) {
      return { valid: true, message: 'Bitcoin address validated' };
    } else {
      return { valid: false, message: 'Invalid Bitcoin address' };
    }
  } catch (error) {
    console.error('Error validating Bitcoin address:', error);
    return { valid: false, message: 'Bitcoin address validation failed' };
  }
};

// Check if Ethereum address is a contract
const checkIfEthereumContract = async (address) => {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const response = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${apiKey}`
    );

    return response.data.status === '1' && response.data.result.length > 0;
  } catch (error) {
    console.error('Error checking if address is contract:', error);
    return false;
  }
};

// Check for suspicious activity
const checkSuspiciousActivity = async (userId, amount) => {
  try {
    const suspiciousActivity = {
      suspicious: false,
      reason: ''
    };

    // Check recent withdrawal attempts
    const recentWithdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // Check for multiple failed attempts
    const failedAttempts = recentWithdrawals.filter(w => w.status === 'REJECTED').length;
    if (failedAttempts >= 3) {
      suspiciousActivity.suspicious = true;
      suspiciousActivity.reason = 'Multiple failed withdrawal attempts in 24 hours';
      return suspiciousActivity;
    }

    // Check for unusual withdrawal amount
    const userDeposits = await prisma.deposit.findMany({
      where: {
        userId,
        status: 'CONFIRMED'
      }
    });

    const totalDeposits = userDeposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
    const withdrawalPercentage = (parseFloat(amount) / totalDeposits) * 100;

    if (withdrawalPercentage > 90 && totalDeposits > 100) {
      suspiciousActivity.suspicious = true;
      suspiciousActivity.reason = 'Attempting to withdraw more than 90% of total deposits';
      return suspiciousActivity;
    }

    // Check for rapid withdrawals after deposit
    const recentDeposits = await prisma.deposit.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    if (recentDeposits.length > 0 && parseFloat(amount) > totalDeposits * 0.5) {
      suspiciousActivity.suspicious = true;
      suspiciousActivity.reason = 'Large withdrawal attempt shortly after deposit';
      return suspiciousActivity;
    }

    return suspiciousActivity;

  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    return { suspicious: false, reason: 'Unable to check suspicious activity' };
  }
};

// Check withdrawal limits
const checkWithdrawalLimits = async (userId, amount, currency) => {
  try {
    const limitCheck = {
      allowed: false,
      message: '',
      limits: {}
    };

    // Get admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings) {
      limitCheck.message = 'System settings not configured';
      return limitCheck;
    }

    // Check minimum withdrawal amount
    let minAmount;
    if (currency === 'USDC') {
      minAmount = parseFloat(settings.minUsdcWithdrawalAmount || settings.minWithdrawalAmount);
    } else {
      minAmount = parseFloat(settings.minWithdrawalAmount);
    }

    if (parseFloat(amount) < minAmount) {
      limitCheck.message = `Amount below minimum withdrawal limit of ${minAmount} ${currency}`;
      return limitCheck;
    }

    // Check daily withdrawal limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyWithdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'APPROVED'] },
        createdAt: {
          gte: today
        }
      }
    });

    const dailyTotal = dailyWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const dailyLimit = 1000; // $1000 daily limit (configurable)

    if (dailyTotal + parseFloat(amount) > dailyLimit) {
      limitCheck.message = `Daily withdrawal limit exceeded. Daily total: ${dailyTotal}, Limit: ${dailyLimit}`;
      return limitCheck;
    }

    // Check monthly withdrawal limit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyWithdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'APPROVED'] },
        createdAt: {
          gte: monthStart
        }
      }
    });

    const monthlyTotal = monthlyWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const monthlyLimit = 10000; // $10,000 monthly limit (configurable)

    if (monthlyTotal + parseFloat(amount) > monthlyLimit) {
      limitCheck.message = `Monthly withdrawal limit exceeded. Monthly total: ${monthlyTotal}, Limit: ${monthlyLimit}`;
      return limitCheck;
    }

    limitCheck.allowed = true;
    limitCheck.message = 'Withdrawal within limits';
    limitCheck.limits = {
      daily: { used: dailyTotal, limit: dailyLimit },
      monthly: { used: monthlyTotal, limit: monthlyLimit }
    };

    return limitCheck;

  } catch (error) {
    console.error('Error checking withdrawal limits:', error);
    return { allowed: false, message: 'Unable to check withdrawal limits' };
  }
};

// Process verified withdrawal
const processVerifiedWithdrawal = async (withdrawalId, adminId, transactionHash = null) => {
  try {
    console.log(`Processing verified withdrawal ${withdrawalId}`);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!withdrawal) {
      throw new Error(`Withdrawal ${withdrawalId} not found`);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Withdrawal already processed with status: ${withdrawal.status}`);
    }

    // Process withdrawal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      const updateData = {
        status: transactionHash ? 'COMPLETED' : 'APPROVED',
        processedBy: adminId,
        processedAt: new Date()
      };

      if (transactionHash) {
        updateData.transactionHash = transactionHash;
      }

      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: updateData
      });

      // Deduct only the withdrawal amount from user's wallet balance (fees paid by system)
      const withdrawalAmount = parseFloat(withdrawal.amount);
      const feeAmount = parseFloat(withdrawal.feeAmount || 0);
      
      // Get current wallet to check withdrawable balance
      const wallet = await tx.wallet.findUnique({
        where: { userId: withdrawal.userId }
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Calculate actual earnings from transactions (not wallet table fields)
      const dailyTaskEarnings = await tx.transaction.aggregate({
        where: {
          userId: withdrawal.userId,
          type: 'VIP_EARNINGS'
        },
        _sum: { amount: true }
      });

      const referralBonuses = await tx.transaction.aggregate({
        where: {
          userId: withdrawal.userId,
          type: 'REFERRAL_BONUS'
        },
        _sum: { amount: true }
      });

      const actualEarnings = parseFloat(dailyTaskEarnings._sum.amount || 0);
      const actualBonuses = parseFloat(referralBonuses._sum.amount || 0);
      const withdrawableBalance = actualEarnings + actualBonuses;
      
      if (withdrawableBalance < withdrawalAmount) {
        throw new Error('Insufficient withdrawable balance for withdrawal');
      }
      
      // Calculate proportional deductions based on actual earnings
      const earningsRatio = withdrawableBalance > 0 ? actualEarnings / withdrawableBalance : 0;
      const bonusRatio = withdrawableBalance > 0 ? actualBonuses / withdrawableBalance : 0;
      
      const earningsDeduction = withdrawalAmount * earningsRatio;
      const bonusDeduction = withdrawalAmount * bonusRatio;
      
      // Update wallet with deductions (only withdrawal amount, ensure balance never goes negative)
      const currentBalance = parseFloat(wallet.balance);
      
      // Always set balance to 0 if withdrawal would make it negative
      // System covers any shortfall
      let newBalance = 0;
      if (currentBalance >= withdrawalAmount) {
        newBalance = currentBalance - withdrawalAmount;
      }
      
      console.log(`Withdrawal processing: Current balance ${currentBalance}, Withdrawal ${withdrawalAmount}, New balance ${newBalance}`);
      
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          balance: newBalance,
          totalEarnings: {
            decrement: earningsDeduction
          },
          totalReferralBonus: {
            decrement: bonusDeduction
          }
        }
      });
      
      // Create transaction record (only withdrawal amount)
      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          amount: withdrawalAmount,
          description: `Withdrawal processed - ${withdrawal.amount} ${withdrawal.currency} (fee ${feeAmount} paid by system)`,
          referenceId: withdrawalId
        }
      });

      return updatedWithdrawal;
    });

    // Send confirmation email
    try {
      await sendEmail({
        to: withdrawal.user.email,
        template: 'withdrawalProcessed',
        data: {
          fullName: withdrawal.user.fullName,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          walletAddress: withdrawal.walletAddress,
          transactionHash: transactionHash,
          withdrawalId: withdrawalId
        }
      });
    } catch (emailError) {
      console.error('Failed to send withdrawal confirmation email:', emailError);
    }

    return {
      success: true,
      message: 'Withdrawal processed successfully',
      withdrawal: result
    };

  } catch (error) {
    console.error(`Error processing withdrawal ${withdrawalId}:`, error);
    throw error;
  }
};

// Get withdrawal statistics
const getWithdrawalStats = async (userId) => {
  try {
    const stats = await prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { in: ['COMPLETED', 'APPROVED'] }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    const pendingWithdrawals = await prisma.withdrawal.count({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    return {
      totalWithdrawals: parseFloat(stats._sum.amount || 0),
      withdrawalCount: stats._count,
      pendingCount: pendingWithdrawals
    };

  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    throw error;
  }
};

module.exports = {
  verifyWithdrawalRequest,
  validateCryptoAddress,
  checkSuspiciousActivity,
  checkWithdrawalLimits,
  processVerifiedWithdrawal,
  getWithdrawalStats
};
