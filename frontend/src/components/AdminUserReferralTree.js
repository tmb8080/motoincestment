import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const AdminUserReferralTree = ({ userId, userName, isOpen, onClose }) => {
  const [depth, setDepth] = useState(3);
  
  // Debug modal props
  console.log('🔍 Modal props:', { userId, userName, isOpen });

  const {
    data: referralTreeData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['adminUserReferralTree', userId, depth],
    queryFn: async () => {
      try {
        console.log('🚀 Making API call for userId:', userId, 'depth:', depth);
        const response = await adminAPI.getReferralTree(userId, depth);
        console.log('🔍 API Response:', response);
        // Extract the data like the VIP tab does
        return response.data?.data || response.data;
      } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
      }
    },
    enabled: isOpen && !!userId,
    keepPreviousData: false,
    staleTime: 0,
    retry: 1
  });

  // Debug logging
  console.log('🔍 Raw API response:', referralTreeData);
  console.log('🔍 Error:', error);
  console.log('🔍 Data type:', typeof referralTreeData);
  console.log('🔍 Is array:', Array.isArray(referralTreeData));
  console.log('🔍 Data length:', referralTreeData?.length);
  console.log('🔍 First user referrals:', referralTreeData?.[0]?.referrals?.length || 0);
  
  // Since queryFn now returns the extracted data directly, we don't need to access .data
  const referralTree = Array.isArray(referralTreeData) ? referralTreeData : [];
  console.log('🔍 Final referral tree:', referralTree);
  console.log('🔍 Final tree length:', referralTree.length);
  console.log('🔍 First user data:', referralTree[0]);

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

  const getLevelColor = (level) => {
    const colors = {
      1: 'border-blue-500 bg-blue-500/10',
      2: 'border-purple-500 bg-purple-500/10',
      3: 'border-orange-500 bg-orange-500/10',
      4: 'border-cyan-500 bg-cyan-500/10',
      5: 'border-pink-500 bg-pink-500/10'
    };
    return colors[level] || 'border-gray-500 bg-gray-500/10';
  };

  const renderReferralNode = (user, level = 1, isRoot = false) => {
    if (!user) return null;

    return (
      <div key={user.id} className="relative">
        {/* Referral Node Card */}
        <Card className={`backdrop-blur-xl border-2 ${getLevelColor(level)} ${isRoot ? 'ring-2 ring-yellow-400' : ''}`}>
          <div className="p-3 sm:p-4">
            {/* User Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                  {user.fullName || user.email || user.phone || 'User'}
                </h3>
                {isRoot && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">ROOT</span>}
                <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(user.isActive)}`}>
                  {user.isActive ? 'Active' : 'Suspended'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-300">Level {level}</div>
                <div className="text-sm font-bold text-white">
                  {formatCurrency(user.wallet?.balance || 0)}
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white truncate">{user.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Phone:</span>
                  <span className="text-white">{user.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Referral Code:</span>
                <span className="text-white font-mono">{user.referralCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Joined:</span>
                <span className="text-white">{formatDate(user.createdAt)}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-white/5 rounded p-2">
                <div className="text-gray-300">Deposits</div>
                <div className="text-green-400 font-semibold">
                  {formatCurrency(user.financialData?.totalDeposits || 0)}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-gray-300">Earnings</div>
                <div className="text-blue-400 font-semibold">
                  {formatCurrency(user.financialData?.totalDailyEarnings || 0)}
                </div>
              </div>
            </div>

            {/* Referral Bonuses */}
            {user.referralBonusesReceived && user.referralBonusesReceived.length > 0 && (
              <div className="mt-3 p-2 bg-purple-800/20 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300 mb-2">Referral Bonuses Earned:</div>
                <div className="space-y-1">
                  {user.referralBonusesReceived.map((bonus, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">From:</span>
                        <span className="text-white font-mono text-xs">
                          {bonus.referred?.email || bonus.referred?.phone || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-semibold">
                          {formatCurrency(bonus.bonusAmount)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(bonus.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-purple-500/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Total Bonuses:</span>
                    <span className="text-purple-400 font-bold">
                      {formatCurrency(user.referralBonusesReceived.reduce((sum, bonus) => sum + parseFloat(bonus.bonusAmount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VIP Level Info */}
            {user.userVip && (
              <div className="mt-3 p-2 bg-yellow-800/20 rounded-lg border border-yellow-500/20">
                <div className="text-xs text-yellow-300 mb-1">VIP Level:</div>
                <div className="text-yellow-400 font-semibold text-sm">
                  {user.userVip.vipLevel?.name || 'Unknown'} - {formatCurrency(user.userVip.vipLevel?.amount || 0)}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Connection Line */}
        {!isRoot && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gray-400"></div>
        )}

        {/* Children Referrals */}
        {user.referrals && user.referrals.length > 0 && (
          <div className="mt-4 ml-4 sm:ml-8">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-0 top-0 w-0.5 h-full bg-gray-400"></div>
              
              {/* Horizontal Lines and Children */}
              <div className="space-y-4">
                {user.referrals.map((referral, index) => (
                  <div key={referral.id} className="relative">
                    {/* Horizontal Line */}
                    <div className="absolute left-0 top-1/2 w-4 sm:w-8 h-0.5 bg-gray-400"></div>
                    <div className="ml-6 sm:ml-12">
                      {renderReferralNode(referral, level + 1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Mobile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-700 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white">Referral Tree</h2>
            <p className="text-gray-400 text-sm truncate">User: {userName}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 font-medium">Depth:</label>
              <select
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
              >
                <option value={1}>1 Level</option>
                <option value={2}>2 Levels</option>
                <option value={3}>3 Levels</option>
                <option value={4}>4 Levels</option>
                <option value={5}>5 Levels</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-lg hover:shadow-xl shadow-blue-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span className="text-sm">🔄</span>
                <span>Refresh</span>
              </Button>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-lg hover:shadow-xl shadow-gray-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span className="text-sm">✕</span>
                <span>Close</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="h-4 bg-white/20 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">Failed to load referral tree</div>
              <div className="text-gray-400 text-sm mb-4">
                Error: {error.message || 'Unknown error occurred'}
              </div>
              <Button onClick={() => refetch()} className="bg-blue-500 hover:bg-blue-600">
                Retry
              </Button>
            </div>
          ) : !Array.isArray(referralTree) || referralTree.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-400">No referral tree found</p>
              <div className="text-gray-500 text-sm mt-2">
                Debug: Tree length = {referralTree?.length || 0}, Is array = {Array.isArray(referralTree) ? 'Yes' : 'No'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(referralTree) && referralTree.length > 0 ? (
                <div>
                  <div className="text-green-400 text-sm mb-4">
                    ✅ Data loaded: {referralTree.length} user(s) found
                  </div>
                  {referralTree.map((user) => renderReferralNode(user, 1, true))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">No referral data available</div>
                  <div className="text-gray-500 text-sm mt-2">
                    Debug: Tree length = {referralTree?.length || 0}, Is array = {Array.isArray(referralTree) ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserReferralTree;
