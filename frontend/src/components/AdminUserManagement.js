import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';
import AdminUserDepositHistory from './AdminUserDepositHistory';
import AdminUserWithdrawalHistory from './AdminUserWithdrawalHistory';
import AdminUserReferralTree from './AdminUserReferralTree';
import AdminUserDailyEarningsHistory from './AdminUserDailyEarningsHistory';

const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showReferralTreeModal, setShowReferralTreeModal] = useState(false);
  const [showDailyEarningsModal, setShowDailyEarningsModal] = useState(false);

  const {
    data: usersData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['adminUsers', page, searchTerm],
    queryFn: async () => {
      const params = { 
        page, 
        limit: 20
      };
      
      if (searchTerm) params.search = searchTerm;
      
      const response = await adminAPI.getUsers(params);
      console.log('AdminUserManagement - API response:', response);
      return response;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Extract data from API response with robust handling
  const users = useMemo(() => {
    if (!usersData) return [];
    
    // Handle different possible response structures
    if (Array.isArray(usersData)) {
      return usersData;
    }
    
    if (usersData.data && Array.isArray(usersData.data)) {
      return usersData.data;
    }
    
    if (usersData.data && usersData.data.data && Array.isArray(usersData.data.data)) {
      return usersData.data.data;
    }
    
    return [];
  }, [usersData]);
  
  const pagination = usersData?.pagination || usersData?.data?.pagination || null;

  const toggleUserStatusMutation = useMutation({
    mutationFn: (userId) => adminAPI.toggleUserStatus(userId),
    onSuccess: (data) => {
      toast.success(data?.data?.message || 'User status updated successfully!');
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user status');
      console.error('Error toggling user status:', error);
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400' 
      : 'bg-red-500/20 text-red-400';
  };

  const getVerificationStatus = (user) => {
    const emailVerified = user.isEmailVerified ? '✅' : '❌';
    const phoneVerified = user.isPhoneVerified ? '✅' : '❌';
    return { emailVerified, phoneVerified };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="h-4 bg-white/20 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">Failed to load users</div>
        <div className="text-gray-400 text-sm mb-4">
          Error: {error.message || 'Unknown error occurred'}
        </div>
        <Button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">User Management</h2>
          <Button
            onClick={() => {
              queryClient.invalidateQueries(['adminUsers']);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 w-fit"
          >
            🔄 Refresh
          </Button>
        </div>
        
        {/* Search */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {pagination && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Total Users</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.totalItems}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Current Page</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.currentPage}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Total Pages</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.totalPages}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Items Per Page</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.itemsPerPage}</div>
          </div>
        </div>
      )}

      {/* Users List */}
      {!Array.isArray(users) || users.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-gray-400">
            {!Array.isArray(users) ? 'Loading users...' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const { emailVerified, phoneVerified } = getVerificationStatus(user);
            return (
              <Card key={user.id} className="backdrop-blur-xl bg-white/10 border border-white/20">
                <div className="p-4">
                  {/* Mobile Header */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                          {user.fullName || user.email || user.phone || 'User'}
                        </h3>
                        <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(user.isActive)}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-300">Balance</div>
                        <div className="text-lg sm:text-xl font-bold text-white">
                          {formatCurrency(user.wallet?.balance || 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile User Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Email:</span>
                          <span className="text-white truncate">{user.email || 'N/A'}</span>
                          <span>{emailVerified}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Phone:</span>
                          <span className="text-white">{user.phone || 'N/A'}</span>
                          <span>{phoneVerified}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Referral:</span>
                          <span className="text-white font-mono text-xs">{user.referralCode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Joined:</span>
                          <span className="text-white text-xs">{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">First Task:</span>
                        <span className="text-white text-xs">
                          {user.financialData?.firstDailyTaskDate 
                            ? formatDate(user.financialData.firstDailyTaskDate)
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Mobile Financial Summary */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/5 rounded p-2">
                        <div className="text-gray-300">Deposits</div>
                        <div className="text-green-400 font-semibold">
                          {formatCurrency(user.financialData?.totalDeposits || 0)}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <div className="text-gray-300">Earnings</div>
                        <div className="text-blue-400 font-semibold">
                          {formatCurrency(user.financialData?.dailyEarnings || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    {/* Suspend/Activate Button */}
                    <Button
                      onClick={() => toggleUserStatusMutation.mutate(user.id)}
                      disabled={toggleUserStatusMutation.isLoading}
                      className={`${
                        user.isActive 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/25'
                      } text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]`}
                    >
                      {toggleUserStatusMutation.isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="text-sm">{user.isActive ? '⏸️' : '▶️'}</span>
                          <span className="hidden sm:inline">{user.isActive ? 'Suspend' : 'Activate'}</span>
                          <span className="sm:hidden">{user.isActive ? 'Suspend' : 'Activate'}</span>
                        </>
                      )}
                    </Button>
                    
                    {/* Details Button */}
                    <Button
                      onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl shadow-blue-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span className="text-sm">📋</span>
                      <span className="hidden sm:inline">{selectedUser?.id === user.id ? 'Hide' : 'Details'}</span>
                      <span className="sm:hidden">{selectedUser?.id === user.id ? 'Hide' : 'Details'}</span>
                    </Button>
                    
                    {/* Deposits Button */}
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDepositModal(true);
                      }}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl shadow-emerald-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span className="text-sm">💰</span>
                      <span className="hidden sm:inline">Deposits</span>
                      <span className="sm:hidden">Deposits</span>
                    </Button>
                    
                    {/* Withdrawals Button */}
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowWithdrawalModal(true);
                      }}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl shadow-orange-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span className="text-sm">💸</span>
                      <span className="hidden sm:inline">Withdrawals</span>
                      <span className="sm:hidden">Withdrawals</span>
                    </Button>
                    
                    {/* Referrals Button */}
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowReferralTreeModal(true);
                      }}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl shadow-purple-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span className="text-sm">🌳</span>
                      <span className="hidden sm:inline">Referrals</span>
                      <span className="sm:hidden">Referrals</span>
                    </Button>
                    
                    {/* Daily Earnings Button */}
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDailyEarningsModal(true);
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-lg shadow-lg hover:shadow-xl shadow-cyan-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span className="text-sm">📈</span>
                      <span className="hidden sm:inline">Earnings</span>
                      <span className="sm:hidden">Earnings</span>
                    </Button>
                  </div>
                  
                  {/* User Details (Expandable) */}
                  {selectedUser?.id === user.id && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {/* Mobile Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                          <div className="text-xs text-green-400">Deposits</div>
                          <div className="text-sm font-bold text-green-400">
                            {formatCurrency(user.financialData?.totalDeposits || 0)}
                          </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                          <div className="text-xs text-red-400">Withdrawals</div>
                          <div className="text-sm font-bold text-red-400">
                            {formatCurrency(user.financialData?.totalWithdrawals || 0)}
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                          <div className="text-xs text-blue-400">Today's Earnings</div>
                          <div className="text-sm font-bold text-blue-400">
                            {formatCurrency(user.financialData?.dailyEarnings || 0)}
                          </div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                          <div className="text-xs text-purple-400">Referral</div>
                          <div className="text-sm font-bold text-purple-400">
                            {formatCurrency(user.financialData?.referralEarnings || 0)}
                          </div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                          <div className="text-xs text-orange-400">Total Daily</div>
                          <div className="text-sm font-bold text-orange-400">
                            {formatCurrency(user.financialData?.totalDailyEarnings || 0)}
                          </div>
                        </div>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2">
                          <div className="text-xs text-cyan-400">First Task</div>
                          <div className="text-xs font-bold text-cyan-400">
                            {user.financialData?.firstDailyTaskDate 
                              ? formatDate(user.financialData.firstDailyTaskDate).split(',')[0]
                              : 'Never'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Mobile Detailed Sections */}
                      <div className="space-y-4">
                        {/* Financial Summary - Mobile */}
                        <div className="bg-white/5 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Financial Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Deposits:</span>
                              <span className="text-green-400 font-semibold">
                                {formatCurrency(user.financialData?.totalDeposits || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Withdrawals:</span>
                              <span className="text-red-400 font-semibold">
                                {formatCurrency(user.financialData?.totalWithdrawals || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Today's Earnings:</span>
                              <span className="text-blue-400 font-semibold">
                                {formatCurrency(user.financialData?.dailyEarnings || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referral Earnings:</span>
                              <span className="text-purple-400 font-semibold">
                                {formatCurrency(user.financialData?.referralEarnings || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Daily Earnings:</span>
                              <span className="text-orange-400 font-semibold">
                                {formatCurrency(user.financialData?.totalDailyEarnings || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">First Daily Task:</span>
                              <span className="text-cyan-400 font-semibold text-xs">
                                {user.financialData?.firstDailyTaskDate 
                                  ? formatDate(user.financialData.firstDailyTaskDate)
                                  : 'Never'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Counts */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Transaction Counts</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Deposits:</span>
                              <span className="text-white font-semibold">
                                {user.financialData?.totalDepositsCount || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Withdrawals:</span>
                              <span className="text-white font-semibold">
                                {user.financialData?.totalWithdrawalsCount || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referrals:</span>
                              <span className="text-white font-semibold">
                                {user._count?.referrals || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Net Profit:</span>
                              <span className={`font-semibold ${
                                parseFloat(user.financialData?.totalDeposits || 0) - parseFloat(user.financialData?.totalWithdrawals || 0) >= 0 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {formatCurrency(parseFloat(user.financialData?.totalDeposits || 0) - parseFloat(user.financialData?.totalWithdrawals || 0))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Referral Information */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Referral Info</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referral Code:</span>
                              <span className="text-white font-mono text-xs">{user.referralCode}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referred By:</span>
                              <span className="text-white">
                                {user.referrer ? (
                                  <div className="text-right">
                                    <div>{user.referrer.fullName || 'N/A'}</div>
                                    <div className="text-xs text-gray-400">
                                      {user.referrer.email || user.referrer.phone || 'N/A'}
                                    </div>
                                  </div>
                                ) : (
                                  'None'
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referrer ID:</span>
                              <span className="text-white font-mono text-xs">
                                {user.referrer?.id || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Account Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">User ID:</span>
                              <span className="text-white font-mono text-xs">{user.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Wallet ID:</span>
                              <span className="text-white font-mono text-xs">{user.wallet?.id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Joined:</span>
                              <span className="text-white">{formatDate(user.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Updated:</span>
                              <span className="text-white">{formatDate(user.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div className="mt-6 pt-4 border-t border-white/20">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Transaction Summary</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Transactions:</span>
                                <span className="text-white">
                                  {(user.financialData?.totalDepositsCount || 0) + (user.financialData?.totalWithdrawalsCount || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Success Rate:</span>
                                <span className="text-green-400">
                                  {(() => {
                                    const totalDeposits = user.financialData?.totalDepositsCount || 0;
                                    const totalWithdrawals = user.financialData?.totalWithdrawalsCount || 0;
                                    const totalTransactions = totalDeposits + totalWithdrawals;
                                    if (totalTransactions === 0) return 'N/A';
                                    const successRate = Math.round((totalDeposits / totalTransactions) * 100);
                                    return `${successRate}%`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Earnings Summary</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Earnings:</span>
                                <span className="text-blue-400">
                                  {formatCurrency(parseFloat(user.financialData?.totalDailyEarnings || 0) + parseFloat(user.financialData?.referralEarnings || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Today's Earnings:</span>
                                <span className="text-green-400">
                                  {formatCurrency((user.financialData?.dailyEarnings || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Daily Earnings:</span>
                                <span className="text-orange-400">
                                  {formatCurrency((user.financialData?.totalDailyEarnings || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Account Health</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span className={`${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                  {user.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Verification:</span>
                                <span className={`${user.isEmailVerified && user.isPhoneVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {user.isEmailVerified && user.isPhoneVerified ? 'Complete' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded ${
                    pageNum === page
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
          >
            Next
          </Button>
        </div>
      )}

      {/* Deposit History Modal */}
      <AdminUserDepositHistory
        userId={selectedUser?.id}
        userName={selectedUser?.fullName || selectedUser?.email || selectedUser?.phone || 'User'}
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />

      {/* Withdrawal History Modal */}
      <AdminUserWithdrawalHistory
        userId={selectedUser?.id}
        userName={selectedUser?.fullName || selectedUser?.email || selectedUser?.phone || 'User'}
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
      />

      {/* Referral Tree Modal */}
      <AdminUserReferralTree
        userId={selectedUser?.id}
        userName={selectedUser?.fullName || selectedUser?.email || selectedUser?.phone || 'User'}
        isOpen={showReferralTreeModal}
        onClose={() => setShowReferralTreeModal(false)}
      />

      {/* Daily Earnings History Modal */}
      <AdminUserDailyEarningsHistory
        userId={selectedUser?.id}
        userName={selectedUser?.fullName || selectedUser?.email || selectedUser?.phone || 'User'}
        isOpen={showDailyEarningsModal}
        onClose={() => setShowDailyEarningsModal(false)}
      />
    </div>
  );
};

export default AdminUserManagement;
