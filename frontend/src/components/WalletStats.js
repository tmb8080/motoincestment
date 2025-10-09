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
  console.log('totalEarnings:', walletData.totalEarnings);
  console.log('totalReferralBonus:', walletData.totalReferralBonus);
  console.log('dailyEarnings:', walletData.dailyEarnings);
  
  // Calculate withdrawable balance (earnings + bonuses, excluding deposits)
  const withdrawableBalance = parseFloat(walletData.totalEarnings || 0) + 
                             parseFloat(walletData.totalReferralBonus || 0) + 
                             parseFloat(walletData.dailyEarnings || 0);
  
  console.log('Calculated withdrawable balance in WalletStats:', withdrawableBalance);

  return (
    <>
      {/* Withdrawable Balance Card */}
      <div className="binance-stat-card border-l-4 border-l-binance-green">
        <h3 className="binance-stat-label">Withdrawable Balance</h3>
        <p className="binance-stat-value text-binance-green">{formatCurrency(withdrawableBalance)}</p>
        <p className="binance-stat-label">Available for withdrawal (earnings + bonuses)</p>
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
