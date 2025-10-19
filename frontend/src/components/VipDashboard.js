import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vipAPI, walletAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

const VipDashboard = () => {
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Fetch VIP status
  const { data: vipStatus, isLoading: vipLoading } = useQuery({
    queryKey: ['vipStatus'],
    queryFn: () => vipAPI.getStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch VIP levels for upgrade options
  const { data: vipLevels, isLoading: vipLevelsLoading } = useQuery({
    queryKey: ['vipLevels'],
    queryFn: () => vipAPI.getLevels(),
  });

  // Fetch wallet stats to check balance
  const { data: walletStats, isLoading: walletLoading } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => walletAPI.getStats(),
  });

  // Calculate withdrawable balance: (earnings + bonuses) - withdrawals
  // This excludes deposits from being withdrawable
  const walletData = walletStats?.data?.data || walletStats?.data || {};
  const totalEarned = parseFloat(walletData.totalEarnings || 0) + parseFloat(walletData.totalReferralBonus || 0);
  const totalWithdrawn = parseFloat(walletData.totalWithdrawn || 0);
  const withdrawableBalance = Math.max(0, totalEarned - totalWithdrawn);

  // Start earning mutation
  const startEarningMutation = useMutation({
    mutationFn: () => vipAPI.startEarning(),
    onSuccess: () => {
      toast.success('Earning session started! You will earn in 24 hours.');
      queryClient.invalidateQueries(['vipStatus']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to start earning session');
    },
  });

  // Withdraw earnings mutation
  const withdrawEarningsMutation = useMutation({
    mutationFn: (amount) => walletAPI.withdrawEarnings(amount),
    onSuccess: () => {
      toast.success('Earnings withdrawn to main balance!');
      setWithdrawAmount('');
      queryClient.invalidateQueries(['vipStatus']);
      queryClient.invalidateQueries(['walletStats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to withdraw earnings');
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount);
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Completed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  const handleWithdrawEarnings = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount < 2) {
      toast.error('Minimum withdrawal amount is $2');
      return;
    }
    withdrawEarningsMutation.mutate(amount);
  };

  // Calculate upgrade options
  const getUpgradeOptions = () => {
    if (!vipLevels?.data?.data || !userVip) return [];
    
    const currentVipAmount = parseFloat(userVip.totalPaid);
    const totalDeposits = parseFloat(walletStats?.data?.data?.totalDeposits) || 0;
    const totalBalance = parseFloat(walletStats?.data?.data?.balance) || 0;
    
    return vipLevels.data.data
      .filter(level => parseFloat(level.amount) > currentVipAmount)
      .map(level => {
        const fullVipCost = parseFloat(level.amount);
        const upgradeCost = fullVipCost - currentVipAmount;
        const amountNeededForFullVip = Math.max(0, fullVipCost - totalDeposits);
        const canAfford = totalDeposits >= fullVipCost;
        
        return {
          ...level,
          upgradeCost,
          fullVipCost,
          amountNeededForFullVip,
          canAfford,
          missingAmount: Math.max(0, upgradeCost - totalDeposits),
          totalDeposits,
          totalBalance
        };
      })
      .sort((a, b) => a.upgradeCost - b.upgradeCost);
  };

  if (vipLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const vipData = vipStatus?.data?.data;

  if (!vipData?.userVip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VIP Membership</CardTitle>
          <CardDescription>Join a VIP level to start earning daily income</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-semibold mb-2">No VIP Membership</h3>
            <p className="text-gray-600 mb-4">
              Join a VIP level to unlock daily earnings and grow your income automatically.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl mr-2">🚲</span>
                <span className="font-semibold text-blue-800">Exclusive Bicycle Included!</span>
              </div>
              <p className="text-sm text-blue-700">
                Every VIP level comes with a premium bicycle model with advanced features
              </p>
            </div>
            <Button onClick={() => window.location.href = '/vip-selection'}>
              Choose VIP Level
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userVip, activeSession, todayEarnings } = vipData;
  const canStartEarning = !activeSession && vipData.canStartEarning;

  return (
    <div className="space-y-6">
      {/* VIP Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>VIP {userVip.vipLevel.name}</span>
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Active
            </span>
          </CardTitle>
          <CardDescription>
            Daily earning potential: {formatCurrency(userVip.vipLevel.dailyEarning)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Investment</p>
              <p className="text-2xl font-bold">{formatCurrency(userVip.vipLevel.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Daily Earning</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(userVip.vipLevel.dailyEarning)}
              </p>
            </div>
          </div>
          
          {/* Next Upgrade Preview */}
          {getUpgradeOptions().length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Next Upgrade</p>
                  <p className="text-xs text-blue-600">
                    {getUpgradeOptions()[0].name} - {formatCurrency(getUpgradeOptions()[0].dailyEarning)}/day
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-800">
                    {formatCurrency(getUpgradeOptions()[0].upgradeCost)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {getUpgradeOptions()[0].canAfford ? 'Can afford' : `Need ${formatCurrency(getUpgradeOptions()[0].missingAmount)} more`}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Bicycle Information */}
          {userVip.vipLevel.bicycleModel && (
            <div className="border-t pt-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🚲</span>
                <h4 className="font-semibold text-blue-600">Your VIP Bicycle</h4>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Model</p>
                    <p className="font-semibold text-blue-800">{userVip.vipLevel.bicycleModel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Color</p>
                    <p className="font-semibold">{userVip.vipLevel.bicycleColor}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Features</p>
                  <p className="text-sm text-blue-800">{userVip.vipLevel.bicycleFeatures}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earning Session Card */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Earning Session</CardTitle>
          <CardDescription>
            Start your 24-hour earning session to receive daily income
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">Session Active</p>
                  <p className="text-sm text-green-600">
                    Earning {formatCurrency(userVip.vipLevel.dailyEarning)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-800">
                    {formatTimeRemaining(activeSession.endsAt)}
                  </p>
                  <p className="text-xs text-green-600">Until completion</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, 
                      ((new Date() - new Date(activeSession.startedAt)) / 
                       (new Date(activeSession.endsAt) - new Date(activeSession.startedAt))) * 100
                    ))}%`
                  }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              {canStartEarning ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Ready to start your daily earning session
                  </p>
                  <Button 
                    onClick={() => startEarningMutation.mutate()}
                    disabled={startEarningMutation.isLoading}
                    className="px-8 py-3"
                  >
                    {startEarningMutation.isLoading ? 'Starting...' : 'Start Earning'}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    You can start earning again tomorrow
                  </p>
                  <p className="text-sm text-gray-500">
                    Each VIP level allows one earning session per day
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawable Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawable Balance</CardTitle>
          <CardDescription>
            Withdraw your earned income and bonuses to your main balance (minimum $2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm text-gray-600">Available to Withdraw</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {walletLoading ? 'Loading...' : formatCurrency(withdrawableBalance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Earned</p>
                  <p className="font-semibold">
                    {walletLoading ? 'Loading...' : formatCurrency(totalEarned)}
                  </p>
                </div>
              </div>
              
              {/* Calculation Breakdown */}
              {!walletLoading && (
                <div className="text-xs text-gray-600 space-y-1 bg-white/50 p-3 rounded">
                  <div className="flex justify-between">
                    <span>Daily Task Earnings:</span>
                    <span className="text-green-600">+{formatCurrency(parseFloat(walletData.totalEarnings || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Referral Bonuses:</span>
                    <span className="text-green-600">+{formatCurrency(parseFloat(walletData.totalReferralBonus || 0))}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Earned:</span>
                    <span className="text-blue-600">{formatCurrency(totalEarned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Withdrawn:</span>
                    <span className="text-red-600">-{formatCurrency(totalWithdrawn)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Available to Withdraw:</span>
                      <span className="text-blue-800">{formatCurrency(withdrawableBalance)}</span>
                    </div>
                  </div>
                  <div className="text-gray-500 mt-2 text-center">
                    <span>Deposits ({formatCurrency(parseFloat(walletData.totalDeposits || 0))}) for VIP purchases only</span>
                  </div>
                </div>
              )}
            </div>

            {withdrawableBalance >= 2 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Withdrawal Amount ($)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount (min $2)"
                    min="2"
                    max={withdrawableBalance}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  onClick={handleWithdrawEarnings}
                  disabled={withdrawEarningsMutation.isLoading || !withdrawAmount || parseFloat(withdrawAmount) < 2 || parseFloat(withdrawAmount) > withdrawableBalance}
                  className="w-full"
                >
                  {withdrawEarningsMutation.isLoading ? 'Processing...' : 'Withdraw to Main Balance'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">
                  Minimum $2 withdrawable balance required for withdrawal
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* VIP Upgrade Options */}
      {userVip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>VIP Upgrade Options</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {getUpgradeOptions().length} Available
              </span>
            </CardTitle>
            <CardDescription>
              Upgrade to higher VIP levels for increased daily earnings
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                <strong>Note:</strong> Only deposited funds can be used for VIP upgrades. Daily earnings and referral bonuses are not eligible.
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vipLevelsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ) : getUpgradeOptions().length > 0 ? (
              <div className="space-y-3">
                {getUpgradeOptions().slice(0, 3).map((upgrade) => (
                  <div 
                    key={upgrade.id}
                    className={`p-4 rounded-lg border ${
                      upgrade.canAfford 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">💎</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{upgrade.name}</h4>
                          <p className="text-sm text-gray-600">
                            Daily: {formatCurrency(upgrade.dailyEarning)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(upgrade.upgradeCost)}
                        </div>
                        <div className="text-xs text-gray-500">Upgrade Cost</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Current VIP:</span> {formatCurrency(userVip.totalPaid)}
                        <span className="mx-2">→</span>
                        <span className="font-medium">New Total:</span> {formatCurrency(upgrade.amount)}
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div>Deposits: {formatCurrency(upgrade.totalDeposits)}</div>
                        <div>Total Balance: {formatCurrency(upgrade.totalBalance)}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                        {upgrade.canAfford ? (
                          <Button
                            size="sm"
                            onClick={() => window.location.href = '/vip-selection'}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Upgrade Now
                          </Button>
                        ) : (
                          <div className="text-right">
                            <div className="text-sm text-orange-600 font-medium">
                              Need {formatCurrency(upgrade.missingAmount)} more in deposits
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              (Daily earnings & bonuses not eligible)
                            </div>
                            <Button
                              size="sm"
                              onClick={() => window.location.href = '/deposit'}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              Deposit
                            </Button>
                          </div>
                        )}
                      </div>
                  </div>
                ))}
                
                {getUpgradeOptions().length > 3 && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = '/vip-selection'}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      View All {getUpgradeOptions().length} Upgrade Options
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Maximum VIP Level Reached!</h3>
                <p className="text-gray-600">
                  You're already at the highest available VIP level. Congratulations!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VipDashboard;
