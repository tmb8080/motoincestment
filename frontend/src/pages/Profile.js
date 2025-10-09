import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI, vipAPI, taskAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import UsdtDeposit from '../components/UsdtDeposit';
import UsdtWithdrawal from '../components/UsdtWithdrawal';
import DepositHistory from '../components/DepositHistory';
import WithdrawalHistory from '../components/WithdrawalHistory';
import WithdrawalHistoryPreview from '../components/WithdrawalHistoryPreview';
import ChangePassword from '../components/ChangePassword';
import CountdownTimer from '../components/ui/CountdownTimer';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showDepositHistory, setShowDepositHistory] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Fetch user wallet stats
  const { data: walletStats, isLoading: walletLoading } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => {
      console.log('Profile: Executing wallet stats query...');
      return walletAPI.getStats();
    },
    onSuccess: (data) => {
      console.log('Profile: Wallet stats loaded:', data);
      console.log('Profile: Balance from wallet stats:', data?.data?.data?.balance);
    },
    onError: (error) => {
      console.error('Profile: Error loading wallet stats:', error);
    },
  });

  // Fetch user transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', { limit: 10 }],
    queryFn: () => walletAPI.getTransactions({ limit: 10, page: 1 }),
  });

  // Fetch earning session status
  const { data: earningStatus, isLoading: earningStatusLoading } = useQuery({
    queryKey: ['earningStatus'],
    queryFn: taskAPI.getEarningStatus,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });



  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type) => {
    const icons = {
      'DEPOSIT': '💰',
      'WITHDRAWAL': '💸',
      'VIP_EARNINGS': '🚴',
      'REFERRAL_BONUS': '👥',
      'VIP_PAYMENT': '👑',
      'TASK_REWARD': '🎯'
    };
    return icons[type] || '📊';
  };

  const getTransactionColor = (type) => {
    const colors = {
      'DEPOSIT': 'text-green-500 bg-green-100',
      'WITHDRAWAL': 'text-red-500 bg-red-100',
      'VIP_EARNINGS': 'text-blue-500 bg-blue-100',
      'REFERRAL_BONUS': 'text-purple-500 bg-purple-100',
      'VIP_PAYMENT': 'text-yellow-500 bg-yellow-100',
      'TASK_REWARD': 'text-indigo-500 bg-indigo-100'
    };
    return colors[type] || 'text-gray-500 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-binance-dark pb-20 md:pb-0">
      {/* Binance-style Header */}
      <div className="bg-white dark:bg-binance-dark-secondary border-b border-gray-200 dark:border-binance-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-binance-yellow rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Moto Investment</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-binance-green rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Binance-style Profile Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-binance-dark-tertiary rounded-full border border-gray-200 dark:border-binance-dark-border mb-6">
            <div className="w-2 h-2 bg-binance-yellow rounded-full mr-2 animate-pulse"></div>
            <span className="text-gray-600 dark:text-binance-text-secondary text-sm font-medium">Profile Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-binance-text-secondary text-base max-w-2xl mx-auto">
            Manage your account, view earnings, and track your progress
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Account Balance */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 shadow-lg border border-gray-200 dark:border-binance-dark-border hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-binance-green rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary">Account Balance</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary">
                    {walletLoading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-binance-dark-tertiary h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.balance || 0)
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
              <button
                  onClick={() => setShowDepositModal(true)}
                className="w-full btn-primary text-sm py-2 rounded-lg"
                >
                  💰 Deposit
              </button>
              <button
                  onClick={() => setShowWithdrawalModal(true)}
                className="w-full btn-secondary text-sm py-2 rounded-lg"
                >
                  💸 Withdraw
              </button>
            </div>
          </div>

          {/* Total Deposits */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 shadow-lg border border-gray-200 dark:border-binance-dark-border hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-binance-yellow rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary">Total Deposits</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary">
                    {walletLoading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-binance-dark-tertiary h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalDeposits || 0)
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
              <button
                  onClick={() => setShowDepositHistory(true)}
                className="w-full btn-secondary text-sm py-2 rounded-lg"
                >
                  📊 View History
              </button>
            </div>
          </div>

          {/* VIP Task Earnings */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 shadow-lg border border-gray-200 dark:border-binance-dark-border hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-binance-yellow rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🚴</span>
                </div>
                <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary">Daily Task Earnings</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary">
                    {walletLoading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-binance-dark-tertiary h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalEarnings || 0)
                    )}
                </div>
                <div className="text-xs text-gray-500 dark:text-binance-text-tertiary mt-1">From VIP tasks</div>
                </div>
              </div>
              
              {/* Earnings Progress - Show when task is active */}
              {earningStatus?.data?.data?.hasActiveSession && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600 dark:text-binance-text-secondary">Session Progress</span>
                  <span className="text-xs text-binance-green font-medium">
                      {earningStatus.data.data.progress || 0}%
                    </span>
                  </div>
                <div className="w-full bg-gray-200 dark:bg-binance-dark-border rounded-full h-2">
                    <div 
                    className="bg-binance-green h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${earningStatus.data.data.progress || 0}%`,
                        animation: 'pulse 2s infinite'
                      }}
                    ></div>
                  </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-binance-text-tertiary">
                    <span>Started: {earningStatus.data.data.startTime ? new Date(earningStatus.data.data.startTime).toLocaleTimeString() : 'N/A'}</span>
                    <span>Ends: {earningStatus.data.data.endTime ? new Date(earningStatus.data.data.endTime).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="mt-2 text-center">
                  <span className="text-xs text-binance-green font-medium">
                      Earning: {formatCurrency(earningStatus.data.data.currentEarnings || 0)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
              {/* Cooldown Timer - Show when user is in cooldown */}
              {earningStatus?.data?.data?.cooldownRemaining && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                      ⏰ Next Task Available In:
                    </div>
                    <CountdownTimer
                      targetTime={new Date(Date.now() + earningStatus.data.data.cooldownRemaining.hours * 60 * 60 * 1000)}
                      size="default"
                      className="text-center"
                      showLabel={false}
                      onComplete={() => {
                        queryClient.invalidateQueries(['earningStatus']);
                        toast.success('🎉 Ready to start your next daily task!');
                      }}
                    />
                    <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      Last earnings: {formatCurrency(earningStatus.data.data.lastEarnings || 0)}
                    </div>
                  </div>
                </div>
              )}

              <button
                  onClick={() => window.location.href = '/tasks'}
                className={`w-full text-sm py-2 rounded-lg ${
                    earningStatus?.data?.data?.hasActiveSession 
                    ? 'btn-primary'
                    : earningStatus?.data?.data?.cooldownRemaining
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium'
                    : 'btn-secondary'
                  }`}
                >
                  {earningStatus?.data?.data?.hasActiveSession 
                    ? '🔄 View Progress' 
                    : earningStatus?.data?.data?.cooldownRemaining
                    ? '⏰ View Countdown'
                    : '🎯 Start Task'
                  }
              </button>
            </div>
          </div>

          {/* Referral Bonus */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 shadow-lg border border-gray-200 dark:border-binance-dark-border hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-binance-green rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary">Referral Bonus</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary">
                    {walletLoading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-binance-dark-tertiary h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalReferralBonus || 0)
                    )}
                </div>
                <div className="text-xs text-gray-500 dark:text-binance-text-tertiary mt-1">VIP commissions (L1=10%, L2=5%, L3=2%)</div>
                </div>
              </div>
              <div className="mt-4">
              <button
                  onClick={() => window.location.href = '/invite'}
                className="w-full btn-primary text-sm py-2 rounded-lg"
                >
                  👥 Invite Friends
              </button>
            </div>
          </div>

          {/* Withdrawal Statistics */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 shadow-lg border border-gray-200 dark:border-binance-dark-border hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-binance-yellow rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">💸</span>
                </div>
                <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary">Total Withdrawn</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary">
                    {walletLoading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-binance-dark-tertiary h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalWithdrawn || 0)
                    )}
                </div>
                <div className="text-xs text-gray-500 dark:text-binance-text-tertiary mt-1">All time</div>
                </div>
              </div>
              <div className="mt-4">
              <button
                  onClick={() => setShowWithdrawalHistory(true)}
                className="w-full btn-secondary text-sm py-2 rounded-lg"
                >
                  📊 View History
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Transactions */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Recent Transactions</h3>
                    <p className="text-gray-600 dark:text-binance-text-secondary">
                        Your latest account activity and earnings
                    </p>
                    </div>
                    <div className="flex space-x-2">
                    <button
                        onClick={() => setShowDepositModal(true)}
                      className="btn-primary text-sm px-3 py-1 rounded-lg"
                      >
                        💰 Deposit
                    </button>
                    <button
                        onClick={() => setShowWithdrawalModal(true)}
                      className="btn-secondary text-sm px-3 py-1 rounded-lg"
                      >
                        💸 Withdraw
                    </button>
                  </div>
                </div>
                  {transactionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 dark:bg-binance-dark-tertiary rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : transactions?.data?.transactions?.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.data.transactions.slice(0, 8).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border hover:bg-gray-100 dark:hover:bg-binance-dark-border transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getTransactionColor(transaction.type)}`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                            <div className="font-medium text-gray-900 dark:text-binance-text-primary">{transaction.description}</div>
                            <div className="text-sm text-gray-600 dark:text-binance-text-secondary">{formatDate(transaction.createdAt)}</div>
                          </div>
                          </div>
                          <div className={`font-semibold text-lg ${
                            transaction.type === 'DEPOSIT' || transaction.type === 'VIP_EARNINGS' || transaction.type === 'REFERRAL_BONUS' 
                            ? 'text-binance-green' 
                            : 'text-binance-red'
                          }`}>
                            {transaction.type === 'DEPOSIT' || transaction.type === 'VIP_EARNINGS' || transaction.type === 'REFERRAL_BONUS' ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
              </div>
            </div>

            {/* Recent Withdrawals */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Recent Withdrawals</h3>
                    <p className="text-gray-600 dark:text-binance-text-secondary">
                        Your latest withdrawal requests and their status
                    </p>
                    </div>
                  <button
                      onClick={() => setShowWithdrawalHistory(true)}
                    className="btn-secondary text-sm px-3 py-1 rounded-lg"
                    >
                      💸 View All
                  </button>
                  </div>
                  <WithdrawalHistoryPreview />
              </div>
            </div>

            {/* Account Statistics */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">Account Statistics</h3>
                <p className="text-gray-600 dark:text-binance-text-secondary mb-6">
                    Overview of your account activity and performance
                </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <div className="text-3xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">
                        {walletLoading ? '...' : formatCurrency(walletStats?.data?.data?.balance || 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-binance-text-secondary">Current Balance</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <div className="text-3xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">
                        {formatDate(user?.createdAt || new Date())}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-binance-text-secondary">Member Since</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Profile */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-6">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-2">Full Name</label>
                    <div className="p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg text-gray-900 dark:text-binance-text-primary border border-gray-200 dark:border-binance-dark-border">
                      {user?.fullName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-2">Email</label>
                    <div className="p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg text-gray-900 dark:text-binance-text-primary border border-gray-200 dark:border-binance-dark-border">
                      {user?.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-2">Phone</label>
                    <div className="p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg text-gray-900 dark:text-binance-text-primary border border-gray-200 dark:border-binance-dark-border">
                      {user?.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-2">Referral Code</label>
                    <div className="p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg text-gray-900 dark:text-binance-text-primary font-mono border border-gray-200 dark:border-binance-dark-border">
                      {user?.referralCode || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-2">Member Since</label>
                    <div className="p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg text-gray-900 dark:text-binance-text-primary border border-gray-200 dark:border-binance-dark-border">
                      {formatDate(user?.createdAt || new Date())}
                    </div>
                  </div>
                  
                  {/* Change Password Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full btn-primary rounded-lg"
                    >
                      🔐 Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>



            {/* Withdrawal History */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">Withdrawal History</h3>
                <p className="text-gray-600 dark:text-binance-text-secondary mb-6">
                    View your withdrawal requests and status
                </p>
                <button
                    onClick={() => setShowWithdrawalHistory(true)}
                  className="w-full btn-secondary rounded-lg"
                  >
                    💸 View Withdrawals
                </button>
              </div>
            </div>

            {/* Admin Access */}
            {user?.isAdmin && (
              <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
                <div className="p-6">
                  <button
                      onClick={() => window.location.href = '/admin'}
                    className="w-full btn-primary rounded-lg"
                    >
                      🔐 Admin Panel
                  </button>
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <button
                    onClick={handleLogout}
                  className="w-full btn-secondary rounded-lg"
                  >
                    🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDepositModal && (
        <UsdtDeposit
          onClose={() => setShowDepositModal(false)}
        />
      )}

      {showWithdrawalModal && (
        <UsdtWithdrawal
          onClose={() => setShowWithdrawalModal(false)}
        />
      )}

      {showDepositHistory && (
        <DepositHistory
          onClose={() => setShowDepositHistory(false)}
        />
      )}

      {showWithdrawalHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-binance-dark-border shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-binance-text-primary">Withdrawal History</h3>
                <button
                  onClick={() => setShowWithdrawalHistory(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg p-2"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <WithdrawalHistory />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Profile;
