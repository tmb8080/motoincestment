import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../services/api';

const InvitedFriendsList = ({ referralStats }) => {
  // Fetch referral rates dynamically
  const { data: referralRatesData } = useQuery({
    queryKey: ['publicReferralRates'],
    queryFn: publicAPI.getReferralRates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Extract rates from API response
  const rates = referralRatesData?.data?.data || referralRatesData?.data || {};
  const level1Rate = rates.level1Rate || 0.10; // Default to 10%
  const level2Rate = rates.level2Rate || 0.05; // Default to 5%
  const level3Rate = rates.level3Rate || 0.02; // Default to 2%

  // Convert decimal rates to percentage for display
  const formatRate = (rate) => Math.round(rate * 100);

  // Axios shape is { data: { success, data: {...} } }
  const payload = referralStats?.data?.data || referralStats?.data || {};
  console.log('🔍 InvitedFriendsList - payload:', payload);
  console.log('🔍 InvitedFriendsList - directReferralList:', payload?.directReferralList);
  console.log('🔍 InvitedFriendsList - indirectReferralList:', payload?.indirectReferralList);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVipLevelColor = (vipLevel) => {
    if (!vipLevel) return 'text-gray-400 bg-gray-400/20';
    
    const colors = {
      'BRONZE': 'text-orange-400 bg-orange-400/20',
      'SILVER': 'text-gray-400 bg-gray-400/20',
      'GOLD': 'text-yellow-400 bg-yellow-400/20',
      'PLATINUM': 'text-blue-400 bg-blue-400/20',
      'DIAMOND': 'text-purple-400 bg-purple-400/20',
      'VIP': 'text-green-400 bg-green-400/20',
      'STARTER': 'text-green-400 bg-green-400/20'
    };
    
    return colors[vipLevel.name?.toUpperCase()] || 'text-gray-400 bg-gray-400/20';
  };

  const getVipLevelIcon = (vipLevel) => {
    if (!vipLevel) return '👤';
    
    const icons = {
      'BRONZE': '🥉',
      'SILVER': '🥈',
      'GOLD': '🥇',
      'PLATINUM': '💎',
      'DIAMOND': '💎',
      'VIP': '👑',
      'STARTER': '🚴'
    };
    
    return icons[vipLevel.name?.toUpperCase()] || '👤';
  };

  const directReferrals = payload?.directReferralList || [];
  const indirectReferrals = payload?.indirectReferralList || [];
  const allReferrals = [...directReferrals, ...indirectReferrals];

  console.log('🔍 InvitedFriendsList - directReferrals:', directReferrals);
  console.log('🔍 InvitedFriendsList - indirectReferrals:', indirectReferrals);
  console.log('🔍 InvitedFriendsList - allReferrals:', allReferrals);

  // Test message to see if component is rendering
  console.log('🔍 InvitedFriendsList - Component is rendering');

  if (allReferrals.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">👥</div>
        <div className="text-gray-400 text-lg font-medium mb-2">No Friends Invited Yet</div>
        <div className="text-gray-500 text-sm mb-6">Share your referral link to start earning commissions</div>
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
          <div className="text-blue-300 text-sm">
            <div className="font-medium mb-1">💡 Tip:</div>
            <div>Share your referral link on social media, messaging apps, or directly with friends to start building your referral network!</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
          <div className="text-blue-300 text-sm font-medium">Direct Referrals</div>
          <div className="text-2xl font-bold text-white">{directReferrals.length}</div>
          <div className="text-blue-200 text-xs">Level 1 (5% commission)</div>
        </div>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-400/30">
          <div className="text-green-300 text-sm font-medium">Indirect Referrals</div>
          <div className="text-2xl font-bold text-white">{indirectReferrals.length}</div>
          <div className="text-green-200 text-xs">Level 2 (3% commission)</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30">
          <div className="text-purple-300 text-sm font-medium">Total Referrals</div>
          <div className="text-2xl font-bold text-white">{allReferrals.length}</div>
          <div className="text-purple-200 text-xs">All levels combined</div>
        </div>
      </div>

      {/* Friends List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Your Referral Network</h4>
          <div className="text-sm text-gray-400">
            Showing {allReferrals.length} friends
          </div>
        </div>

        {allReferrals.map((friend, index) => {
          const isDirectReferral = directReferrals.some(dr => dr.id === friend.id);
          // Handle both array and object formats for userVip
          const userVipData = Array.isArray(friend.userVip) ? friend.userVip[0] : friend.userVip;
          const currentVip = userVipData?.isActive ? userVipData.vipLevel : null;
          
          return (
            <div key={friend.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30 hover:bg-slate-700/50 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {(friend.fullName?.charAt(0) || friend.phone?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  
                  {/* Friend Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="font-medium text-white">
                        {friend.fullName || friend.phone || 'Anonymous User'}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${isDirectReferral ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                        {isDirectReferral ? 'Direct' : 'Indirect'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-1">
                      Joined {formatDate(friend.createdAt)}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Deposits: {formatCurrency(friend.wallet?.totalDeposits || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Balance: {formatCurrency(friend.wallet?.balance || 0)}
                    </div>
                    <div className="text-xs text-yellow-300">
                      Your bonus from this user: {formatCurrency(friend.referralBonusFromUser || 0)}
                    </div>
                  </div>
                </div>
                
                {/* VIP Status */}
                <div className="text-right">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${getVipLevelColor(currentVip)}`}>
                    <span className="text-lg">{getVipLevelIcon(currentVip)}</span>
                    <span className="text-sm font-medium">
                      {currentVip ? currentVip.name : 'No VIP'}
                    </span>
                  </div>
                  
                  {currentVip && (
                    <div className="text-xs text-gray-400 mt-1">
                      {currentVip.dailyEarning || 0}% daily
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commission Info */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30 mt-6">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-2xl">💰</span>
          <div className="text-yellow-300 font-medium">Commission Structure</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-gray-300">Level 1 (Direct):</span>
            <span className="text-yellow-300 font-medium">{formatRate(level1Rate)}% commission</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300">Level 2 (Indirect):</span>
            <span className="text-yellow-300 font-medium">{formatRate(level2Rate)}% commission</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="text-gray-300">Level 3 (Third):</span>
            <span className="text-yellow-300 font-medium">{formatRate(level3Rate)}% commission</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center">
          Earn commissions when your referrals join VIP levels
        </div>
      </div>
    </div>
  );
};

export default InvitedFriendsList;
