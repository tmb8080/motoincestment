import React from 'react';

const WalletStats = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="binance-stat-card animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount || 0);
  };

  const walletData = stats?.data?.data || stats?.data || {};
  console.log('Full stats response in WalletStats:', stats);
  console.log('Wallet data in WalletStats:', walletData);
  console.log('balance:', walletData.balance);
  console.log('totalEarnings:', walletData.totalEarnings);
  console.log('totalReferralBonus:', walletData.totalReferralBonus);
  console.log('totalWithdrawn:', walletData.totalWithdrawn);
  console.log('totalDeposits:', walletData.totalDeposits);
  
  // Calculate withdrawable balance: (earnings + bonuses) - withdrawals
  // This excludes deposits from being withdrawable
  const totalEarned = parseFloat(walletData.totalEarnings || 0) + parseFloat(walletData.totalReferralBonus || 0);
  const totalWithdrawn = parseFloat(walletData.totalWithdrawn || 0);
  const withdrawableBalance = Math.max(0, totalEarned - totalWithdrawn);
  
  console.log('Calculated withdrawable balance in WalletStats:', withdrawableBalance);

  return (
    <>
      {/* Withdrawable Balance Card with Calculation */}
      <div className="binance-stat-card border-l-4 border-l-binance-green">
        <h3 className="binance-stat-label">Withdrawable Balance</h3>
        <p className="binance-stat-value text-binance-green">{formatCurrency(withdrawableBalance)}</p>
        <p className="binance-stat-label">Available for withdrawal (earnings + bonuses)</p>
        
        {/* Calculation Breakdown */}
        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Daily Task Earnings:</span>
              <span className="text-green-600 dark:text-green-400">+{formatCurrency(parseFloat(walletData.totalEarnings || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Referral Bonuses:</span>
              <span className="text-green-600 dark:text-green-400">+{formatCurrency(parseFloat(walletData.totalReferralBonus || 0))}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-600 dark:text-gray-400">Total Earned:</span>
              <span className="text-blue-600 dark:text-blue-400">{formatCurrency(totalEarned)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Withdrawn:</span>
              <span className="text-red-600 dark:text-red-400">-{formatCurrency(totalWithdrawn)}</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-2">
              <div className="flex justify-between font-bold">
                <span className="text-gray-800 dark:text-gray-200">Available to Withdraw:</span>
                <span className="text-binance-green">{formatCurrency(withdrawableBalance)}</span>
              </div>
            </div>
            <div className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              <span>Deposits ({formatCurrency(parseFloat(walletData.totalDeposits || 0))}) for VIP purchases only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deposited Balance Card */}
      <div className="binance-stat-card border-l-4 border-l-binance-yellow">
        <h3 className="binance-stat-label">Deposited Balance</h3>
        <p className="binance-stat-value text-binance-yellow">{formatCurrency(walletData.totalDeposits)}</p>
        <p className="binance-stat-label">Available for VIP purchases only</p>
      </div>

      {/* Total Withdrawals Card */}
      <div className="binance-stat-card border-l-4 border-l-blue-500">
        <h3 className="binance-stat-label">Total Withdrawals</h3>
        <p className="binance-stat-value text-blue-400">{formatCurrency(walletData.totalWithdrawals)}</p>
        <p className="binance-stat-label">All time withdrawals</p>
      </div>
    </>
  );
};

export default WalletStats;
