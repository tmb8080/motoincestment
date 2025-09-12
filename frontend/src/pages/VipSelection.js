import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { vipAPI, walletAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import UsdtDeposit from '../components/UsdtDeposit';
import VipUpgradeProgress from '../components/VipUpgradeProgress';
import { formatCurrency, getVipColor } from '../utils/vipCalculations';
import toast from 'react-hot-toast';

const VipSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVip, setSelectedVip] = useState(null);
  const [showUsdtDeposit, setShowUsdtDeposit] = useState(false);
  const [vipToJoin, setVipToJoin] = useState(null);

  // Fetch VIP levels
  const { data: vipLevels, isLoading: vipLoading, error: vipError, refetch: refetchVipLevels } = useQuery({
    queryKey: ['vipLevels'],
    queryFn: () => vipAPI.getLevels(),
    onSuccess: (data) => {
      console.log('VIP levels loaded:', data);
      console.log('VIP levels data structure:', data?.data);
      console.log('VIP levels array:', data?.data?.data);
      console.log('Full response structure:', JSON.stringify(data, null, 2));
    },
    onError: (error) => {
      console.error('Error loading VIP levels:', error);
    },
  });

  // Fetch wallet stats to check balance
  const { data: walletStats, error: walletError, refetch: refetchWalletStats, isLoading: walletLoading } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => {
      console.log('Executing wallet stats query...');
      return walletAPI.getStats();
    },
    onSuccess: (data) => {
      console.log('Wallet stats loaded:', data);
      console.log('Balance from wallet stats:', data?.data?.data?.balance);
      console.log('Full wallet stats response:', JSON.stringify(data, null, 2));
    },
    onError: (error) => {
      console.error('Error loading wallet stats:', error);
    },
    // Ensure fresh data
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch current VIP status
  const { data: vipStatus, isLoading: vipStatusLoading } = useQuery({
    queryKey: ['vipStatus'],
    queryFn: () => vipAPI.getStatus(),
    onSuccess: (data) => {
      console.log('VIP status loaded:', data);
    },
    onError: (error) => {
      console.error('Error loading VIP status:', error);
    },
  });

  // Join VIP mutation
  const joinVipMutation = useMutation({
    mutationFn: (vipLevelId) => vipAPI.joinVip(vipLevelId),
    onSuccess: (data) => {
      const message = data?.data?.isUpgrade 
        ? `Successfully upgraded to ${data.data.vipLevel?.name || 'VIP level'}!`
        : 'Successfully joined VIP level!';
      toast.success(message);
      queryClient.invalidateQueries(['walletStats']);
      queryClient.invalidateQueries(['vipStatus']);
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error('VIP join error details:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to join VIP level';
      toast.error(errorMessage);
    },
  });

  const handleJoinVip = (vipLevel) => {
    const totalDeposits = parseFloat(walletStats?.data?.data?.totalDeposits) || 0;
    const totalBalance = parseFloat(walletStats?.data?.data?.balance) || 0;
    const levelAmount = parseFloat(vipLevel?.amount) || 0;
    const currentVip = vipStatus?.data?.data?.userVip;
    
    // Calculate if this is an upgrade
    let isUpgrade = false;
    let paymentAmount = levelAmount;
    let currentVipAmount = 0;
    
    if (currentVip) {
      isUpgrade = true;
      currentVipAmount = parseFloat(currentVip.totalPaid);
      paymentAmount = levelAmount - currentVipAmount;
      
      console.log('Upgrade calculation:', {
        currentVipLevel: currentVip.vipLevel.name,
        currentVipAmount,
        newVipAmount: levelAmount,
        paymentAmount,
        isUpgrade
      });
      
      if (paymentAmount <= 0) {
        toast.error(`Cannot downgrade from ${currentVip.vipLevel.name} to ${vipLevel.name}`);
        return;
      }
    }
    
    console.log('VIP join/upgrade attempt:', {
      totalDeposits,
      totalBalance,
      levelAmount,
      paymentAmount,
      isUpgrade,
      currentVipAmount,
      walletStats: walletStats?.data?.data,
      vipLevel
    });
    
    if (totalDeposits < paymentAmount) {
      // Show deposit prompt for insufficient deposited balance
      const message = isUpgrade 
        ? `You need ${formatCurrency(paymentAmount - totalDeposits)} more in deposits to upgrade from ${currentVip.vipLevel.name} to ${vipLevel.name}.\n\nDaily earnings and referral bonuses cannot be used for VIP upgrades.\n\nWould you like to deposit funds to your wallet?`
        : `You need ${formatCurrency(levelAmount - totalDeposits)} more in deposits to join ${vipLevel.name}.\n\nDaily earnings and referral bonuses cannot be used for VIP upgrades.\n\nWould you like to deposit funds to your wallet?`;
      
      const shouldDeposit = window.confirm(message);
      
      if (shouldDeposit) {
        setVipToJoin(vipLevel);
        setShowUsdtDeposit(true);
      }
      return;
    }
    
    setSelectedVip({ ...vipLevel, isUpgrade, paymentAmount, currentVipAmount });
  };

  const confirmJoinVip = () => {
    if (selectedVip) {
      joinVipMutation.mutate(selectedVip.id);
      setSelectedVip(null);
    }
  };



  if (vipLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-binance-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-binance-yellow mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-binance-text-secondary">Loading VIP levels...</p>
        </div>
      </div>
    );
  }

  if (vipError) {
    return (
      <div className="min-h-screen bg-white dark:bg-binance-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-binance-text-primary mb-2">Error Loading VIP Levels</h3>
          <p className="text-gray-600 dark:text-binance-text-secondary mb-4">{vipError.message || 'Failed to load VIP levels'}</p>
          <button onClick={() => refetchVipLevels()} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-binance-dark pb-20 md:pb-0">
      {/* Binance-style Header */}
      <div className="bg-white dark:bg-binance-dark-secondary border-b border-gray-200 dark:border-binance-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-binance-yellow rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">NovaStaking</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-binance-green rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Binance-style Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-binance-dark-tertiary rounded-full border border-gray-200 dark:border-binance-dark-border mb-6">
            <div className="w-2 h-2 bg-binance-yellow rounded-full mr-2 animate-pulse"></div>
            <span className="text-gray-600 dark:text-binance-text-secondary text-sm font-medium">VIP Selection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">
            Choose Your VIP Level
          </h1>
          <p className="text-gray-600 dark:text-binance-text-secondary text-base max-w-3xl mx-auto px-4 mb-6">
            Join a VIP level to start earning daily income. Each level offers guaranteed daily returns on your investment.
          </p>
          
          {/* Bicycle Benefits Highlight */}
          <div className="bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-2">
              <span className="text-3xl mr-3">🚲</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-binance-text-primary">Exclusive Bicycle Included!</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-binance-text-secondary text-center">
              Every VIP level comes with a premium bicycle model. Higher levels include more advanced features and luxury options.
            </p>
          </div>
          <div className="mt-6 p-4 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg inline-block border border-gray-200 dark:border-binance-dark-border">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-gray-900 dark:text-binance-text-primary font-medium text-base">
                  Your Deposits: {walletLoading ? 'Loading...' : formatCurrency(walletStats?.data?.data?.totalDeposits || 0)}
                </p>
                <p className="text-gray-600 dark:text-binance-text-secondary text-sm">
                  Total Balance: {walletLoading ? 'Loading...' : formatCurrency(walletStats?.data?.data?.balance || 0)}
                </p>
                <p className="text-binance-yellow text-xs mt-1">
                  ⚠️ Only deposits can be used for VIP upgrades
                </p>
              </div>
              <button 
                onClick={() => {
                  refetchWalletStats();
                  refetchVipLevels();
                }}
                className="px-3 py-1 text-xs btn-primary"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* VIP Upgrade Progress Section */}
        {vipStatus?.data?.data?.userVip ? (
          <div className="mb-8">
            <VipUpgradeProgress 
              vipLevels={vipLevels?.data?.data || []}
              currentVip={vipStatus.data.data.userVip}
              totalDeposits={parseFloat(walletStats?.data?.data?.totalDeposits) || 0}
              onUpgradeClick={(nextLevel) => handleJoinVip(nextLevel)}
              showUpgradeButton={true}
            />
          </div>
        ) : (
          <div className="mb-8">
            <VipUpgradeProgress 
              vipLevels={vipLevels?.data?.data || []}
              currentVip={null}
              totalDeposits={parseFloat(walletStats?.data?.data?.totalDeposits) || 0}
              onUpgradeClick={(nextLevel) => handleJoinVip(nextLevel)}
              showUpgradeButton={true}
            />
          </div>
        )}

        {/* VIP Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {vipLevels?.data?.data && Array.isArray(vipLevels.data.data) && vipLevels.data.data.length > 0 ? vipLevels.data.data.map((vip) => {
            const currentVip = vipStatus?.data?.data?.userVip;
            const totalDeposits = parseFloat(walletStats?.data?.data?.totalDeposits) || 0;
            const totalBalance = parseFloat(walletStats?.data?.data?.balance) || 0;
            const levelAmount = parseFloat(vip.amount);
            
            // Calculate VIP cost and amount needed
            let isUpgrade = false;
            let fullVipCost = levelAmount;
            let amountNeeded = Math.max(0, fullVipCost - totalDeposits);
            let canAfford = totalDeposits >= fullVipCost;
            let isLowerLevel = false;
            
            if (currentVip) {
              isUpgrade = true;
              const currentVipAmount = parseFloat(currentVip.totalPaid);
              const upgradeCost = levelAmount - currentVipAmount;
              isLowerLevel = upgradeCost <= 0;
              // For upgrade, we still use the full VIP cost for display
              amountNeeded = Math.max(0, fullVipCost - totalDeposits);
              canAfford = totalDeposits >= fullVipCost && !isLowerLevel;
            }
            
            const dailyReturn = ((vip.dailyEarning / vip.amount) * 100).toFixed(2);
            
            return (
              <div 
                key={vip.id} 
                className={`relative overflow-hidden transition-all duration-300 bg-white dark:bg-binance-dark-secondary rounded-lg border ${
                  currentVip && currentVip.vipLevel.id === vip.id 
                    ? 'border-binance-green shadow-lg shadow-binance-green/20 hover:scale-105' 
                    : isLowerLevel 
                      ? 'border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed' 
                      : 'border-gray-200 dark:border-binance-dark-border hover:scale-105 hover:shadow-lg'
                }`}
              >
                <div className="relative p-4 md:p-6">
                  {/* Current VIP Level Badge */}
                  {currentVip && currentVip.vipLevel.id === vip.id && (
                    <div className="absolute top-2 right-2 bg-binance-green text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
                      Current VIP
                    </div>
                  )}
                  
                  {/* Lower Level Badge */}
                  {isLowerLevel && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10">
                      Lower Level
                    </div>
                  )}
                  
                  <div className="text-lg md:text-xl font-bold text-center text-gray-900 dark:text-binance-text-primary mb-4">
                    {vip.name}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-binance-yellow mb-2">
                      {formatCurrency(vip.amount)}
                    </div>
                    <div className="text-base md:text-lg font-semibold text-binance-green">
                      {formatCurrency(vip.dailyEarning)}/day
                    </div>
                    
                    {/* Bicycle Information */}
                    {vip.bicycleModel && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-2xl mr-2">🚲</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-binance-text-primary">Included Bicycle</span>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900 dark:text-binance-text-primary mb-1">
                            {vip.bicycleModel}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-binance-text-secondary">
                            {vip.bicycleColor}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative p-4 md:p-6">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-binance-text-secondary">Daily Return:</span>
                      <span className="font-semibold text-binance-green text-sm md:text-base">{dailyReturn}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-binance-text-secondary">Monthly Earning:</span>
                      <span className="font-semibold text-gray-900 dark:text-binance-text-primary text-sm md:text-base">{formatCurrency(vip.dailyEarning * 30)}</span>
                    </div>
                    <div className="pt-3 md:pt-4">
                      <button 
                        className={`w-full text-sm md:text-base px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isLowerLevel
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
                            : canAfford 
                              ? 'btn-primary' 
                              : 'btn-secondary'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLowerLevel) {
                            handleJoinVip(vip);
                          }
                        }}
                        disabled={isLowerLevel}
                      >
                        {isLowerLevel 
                          ? 'Lower Level'
                          : isUpgrade 
                            ? (canAfford ? 'Upgrade VIP' : 'Deposit & Upgrade')
                            : (canAfford ? 'Join VIP' : 'Deposit & Join')
                        }
                      </button>
                    </div>
                    
                    {/* Upgrade Info */}
                    {isUpgrade && !isLowerLevel && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-binance-dark-border bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-2 md:p-3">
                        <div className="text-center mb-2">
                          <div className="text-xs text-gray-600 dark:text-binance-text-secondary font-semibold">VIP Upgrade</div>
                          <div className="text-xs text-gray-600 dark:text-binance-text-secondary">
                            From {currentVip.vipLevel.name} to {vip.name}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <div className="text-gray-600 dark:text-binance-text-secondary">Your Deposits</div>
                            <div className="font-bold text-binance-green">
                              {formatCurrency(totalDeposits)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-binance-text-secondary">VIP Level Cost</div>
                            <div className="font-bold text-gray-900 dark:text-binance-text-primary">
                              {formatCurrency(fullVipCost)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600 dark:text-binance-text-secondary">Amount Needed</div>
                            <div className="font-bold text-binance-yellow">
                              {formatCurrency(amountNeeded)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Lower Level Message */}
                    {isLowerLevel && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-binance-dark-border bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-2 md:p-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-600 dark:text-binance-text-secondary font-semibold mb-1">Cannot Downgrade</div>
                          <div className="text-xs text-gray-500 dark:text-binance-text-tertiary">
                            You cannot downgrade from {currentVip.vipLevel.name} to {vip.name}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Balance Info for Unaffordable Levels */}
                    {!canAfford && !isLowerLevel && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-binance-dark-border bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-2 md:p-3">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <div className="text-gray-600 dark:text-binance-text-secondary">Your Deposits</div>
                            <div className="font-bold text-gray-900 dark:text-binance-text-primary">
                              {formatCurrency(totalDeposits)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600 dark:text-binance-text-secondary">Amount Needed</div>
                            <div className="font-bold text-binance-yellow">
                              {formatCurrency(amountNeeded)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-8 md:py-12">
              <div className="text-4xl md:text-6xl mb-3 md:mb-4">💎</div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-binance-text-primary mb-2">No VIP Levels Available</h3>
              <p className="text-gray-600 dark:text-binance-text-secondary text-sm md:text-base">VIP levels are currently being configured.</p>
              <div className="mt-4">
                <button onClick={() => refetchVipLevels()} className="btn-primary">
                  Refresh VIP Levels
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bicycle Comparison Section */}
        <div className="mt-12 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">🚲 Bicycle Progression</h2>
            <p className="text-gray-600 dark:text-binance-text-secondary">See how bicycle quality improves with VIP levels</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {vipLevels?.data?.data?.slice(0, 6).map((vip, index) => (
              <div key={vip.id} className="bg-white dark:bg-binance-dark-secondary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">🚲</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-binance-text-primary">{vip.name}</div>
                    <div className="text-sm text-binance-yellow">{vip.bicycleModel}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-binance-text-secondary space-y-1">
                  <div><span className="text-binance-yellow">Color:</span> {vip.bicycleColor}</div>
                  <div className="text-xs text-gray-500 dark:text-binance-text-tertiary line-clamp-2">{vip.bicycleFeatures}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skip VIP Option */}
        <div className="text-center space-y-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn-secondary px-6 md:px-8 py-2 md:py-3 text-sm md:text-base"
          >
            Skip for Now
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedVip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-4 md:p-6 max-w-md w-full border border-gray-200 dark:border-binance-dark-border">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-binance-text-primary">Confirm VIP Purchase</h3>
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600 dark:text-binance-text-secondary">VIP Level:</span>
                <span className="font-semibold text-gray-900 dark:text-binance-text-primary">{selectedVip.name}</span>
              </div>
              
              {selectedVip.isUpgrade && (
                <>
                  <div className="bg-gray-50 dark:bg-binance-dark-tertiary p-3 rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <div className="text-sm font-semibold text-gray-900 dark:text-binance-text-primary mb-2">VIP Upgrade</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-binance-text-secondary">Current VIP:</span>
                        <span className="font-semibold text-binance-green">{formatCurrency(selectedVip.currentVipAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-binance-text-secondary">Upgrade Cost:</span>
                        <span className="font-semibold text-binance-green">{formatCurrency(selectedVip.paymentAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-binance-text-secondary">New Total:</span>
                        <span className="font-semibold text-binance-green">{formatCurrency(selectedVip.amount)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600 dark:text-binance-text-secondary">{selectedVip.isUpgrade ? 'Upgrade Cost:' : 'Cost:'}</span>
                <span className="font-semibold text-gray-900 dark:text-binance-text-primary">{formatCurrency(selectedVip.isUpgrade ? selectedVip.paymentAmount : selectedVip.amount)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600 dark:text-binance-text-secondary">Daily Earning:</span>
                <span className="font-semibold text-binance-green">{formatCurrency(selectedVip.dailyEarning)}</span>
              </div>
              
              {/* Bicycle Information */}
              {selectedVip.bicycleModel && (
                <>
                  <div className="border-t border-gray-200 dark:border-binance-dark-border pt-3 mt-3">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-2">🚲</span>
                      <span className="font-semibold text-gray-900 dark:text-binance-text-primary">Included Bicycle</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-binance-text-secondary">Model:</span>
                        <span className="font-semibold text-binance-yellow">{selectedVip.bicycleModel}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-binance-text-secondary">Color:</span>
                        <span className="font-semibold text-gray-900 dark:text-binance-text-primary">{selectedVip.bicycleColor}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-binance-dark-tertiary p-3 rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <div className="text-xs text-gray-600 dark:text-binance-text-secondary mb-1">Features:</div>
                        <div className="text-sm text-gray-900 dark:text-binance-text-primary">{selectedVip.bicycleFeatures}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600 dark:text-binance-text-secondary">Your Balance After:</span>
                <span className="font-semibold text-gray-900 dark:text-binance-text-primary">
                  {formatCurrency((walletStats?.data?.data?.balance || 0) - (selectedVip.isUpgrade ? selectedVip.paymentAmount : selectedVip.amount))}
                </span>
              </div>
            </div>
            <div className="flex space-x-2 md:space-x-3">
              <button 
                onClick={() => setSelectedVip(null)}
                className="flex-1 text-sm md:text-base btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={confirmJoinVip}
                disabled={joinVipMutation.isLoading}
                className="flex-1 text-sm md:text-base btn-primary"
              >
                {joinVipMutation.isLoading ? 'Processing...' : (selectedVip.isUpgrade ? 'Confirm Upgrade' : 'Confirm Purchase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USDT Deposit Modal */}
      {showUsdtDeposit && (
        <UsdtDeposit
          onClose={() => {
            setShowUsdtDeposit(false);
            setVipToJoin(null);
          }}
          vipLevel={vipToJoin}
        />
      )}
    </div>
  );
};

export default VipSelection;
