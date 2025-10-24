import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const AdminVipUpgradeModal = ({ userId, userName, currentVipLevel, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedVipLevel, setSelectedVipLevel] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch available VIP levels
  const {
    data: vipLevelsData,
    isLoading: vipLevelsLoading,
    error: vipLevelsError
  } = useQuery({
    queryKey: ['adminVipLevels'],
    queryFn: () => adminAPI.getVipLevels(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract VIP levels with multiple fallbacks
  let vipLevels = [];
  if (Array.isArray(vipLevelsData?.data)) {
    vipLevels = vipLevelsData.data;
  } else if (Array.isArray(vipLevelsData)) {
    vipLevels = vipLevelsData;
  } else if (vipLevelsData?.success && Array.isArray(vipLevelsData.data)) {
    vipLevels = vipLevelsData.data;
  }

  // Show all VIP levels (don't filter out current one)
  const availableLevels = vipLevels;

  // Upgrade/Downgrade VIP mutation
  const upgradeVipMutation = useMutation({
    mutationFn: async (upgradeData) => {
      console.log('🚀 Making VIP upgrade request:', upgradeData);
      try {
        const response = await adminAPI.upgradeUserVip(upgradeData);
        console.log('✅ VIP upgrade response:', response);
        return response;
      } catch (error) {
        console.error('❌ VIP upgrade error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        throw error;
      }
    },
    onSuccess: (response) => {
      const action = selectedVipLevel && vipLevels.find(l => l.id === selectedVipLevel)?.amount > currentVipLevel?.amount ? 'upgraded' : 'downgraded';
      toast.success(`VIP level ${action} successfully!`);
      queryClient.invalidateQueries(['userManagement']);
      queryClient.invalidateQueries(['userVipStatus', userId]);
      queryClient.invalidateQueries(['adminVipLevels']);
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error('VIP upgrade error:', error);
      let errorMessage = 'Failed to upgrade VIP level';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in as admin.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response?.status === 404) {
        errorMessage = 'VIP upgrade endpoint not found. Please contact support.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const resetForm = () => {
    setSelectedVipLevel('');
    setAdminNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedVipLevel) {
      toast.error('Please select a VIP level');
      return;
    }

    const newVipLevel = vipLevels.find(level => level.id === selectedVipLevel);
    if (!newVipLevel) {
      toast.error('Selected VIP level not found');
      return;
    }

    // Check if it's the same VIP level
    if (currentVipLevel && newVipLevel.id === currentVipLevel.id) {
      toast.error('User already has this VIP level');
      return;
    }

    setIsProcessing(true);

    const upgradeData = {
      userId,
      newVipLevelId: selectedVipLevel,
      adminNotes: adminNotes.trim(),
      upgradedBy: 'admin',
      upgradeType: newVipLevel.amount > currentVipLevel?.amount ? 'upgrade' : 'downgrade'
    };

    upgradeVipMutation.mutate(upgradeData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getVipLevelColor = (level) => {
    const colors = {
      'Starter': 'from-gray-500 to-gray-600',
      'Bronze': 'from-yellow-600 to-yellow-700',
      'Silver': 'from-gray-400 to-gray-500',
      'Gold': 'from-yellow-500 to-yellow-600',
      'Platinum': 'from-blue-400 to-blue-500',
      'Diamond': 'from-purple-500 to-purple-600',
      'Elite': 'from-red-500 to-red-600',
      'Master': 'from-indigo-500 to-indigo-600',
      'Legend': 'from-orange-500 to-orange-600',
      'Supreme': 'from-pink-500 to-pink-600',
      'VIP': 'from-red-500 to-red-600'
    };
    return colors[level.name] || 'from-gray-500 to-gray-600';
  };

  const getUpgradeType = (level) => {
    if (!currentVipLevel) return 'assign';
    return level.amount > currentVipLevel.amount ? 'upgrade' : 'downgrade';
  };

  const getUpgradeIcon = (level) => {
    const type = getUpgradeType(level);
    switch (type) {
      case 'upgrade': return '⬆️';
      case 'downgrade': return '⬇️';
      default: return '👑';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-700 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white">Upgrade/Downgrade VIP Level</h2>
            <p className="text-gray-400 text-sm truncate">User: {userName}</p>
            {currentVipLevel && (
              <div className="mt-2">
                <span className="text-xs text-gray-300">Current VIP: </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getVipLevelColor(currentVipLevel)} text-white`}>
                  {currentVipLevel.name} (${formatCurrency(currentVipLevel.amount)})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-lg hover:shadow-xl shadow-gray-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <span className="text-sm">✕</span>
              <span>Close</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
          {vipLevelsLoading ? (
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
          ) : vipLevelsError ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">Failed to load VIP levels</div>
              <div className="text-gray-400 text-sm mb-4">
                Error: {vipLevelsError.message || 'Unknown error occurred'}
              </div>
              <Button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600">
                Retry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* VIP Levels Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Select New VIP Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.isArray(availableLevels) && availableLevels.length > 0 ? availableLevels.map((level) => {
                    const upgradeType = getUpgradeType(level);
                    const isUpgrade = upgradeType === 'upgrade';
                    const isDowngrade = upgradeType === 'downgrade';
                    
                    return (
                      <Card
                        key={level.id}
                        className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                          selectedVipLevel === level.id
                            ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-500/20 to-blue-600/20'
                            : 'hover:bg-white/10'
                        } ${isUpgrade ? 'border-green-500/30' : isDowngrade ? 'border-yellow-500/30' : 'border-white/20'}`}
                        onClick={() => setSelectedVipLevel(level.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold text-lg bg-gradient-to-r ${getVipLevelColor(level)} bg-clip-text text-transparent`}>
                                {level.name}
                              </h3>
                              <span className="text-lg">{getUpgradeIcon(level)}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedVipLevel === level.id ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                            }`}>
                              {selectedVipLevel === level.id && (
                                <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Investment:</span>
                              <span className="text-white font-semibold">{formatCurrency(level.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Daily Rate:</span>
                              <span className="text-green-400 font-semibold">{level.dailyEarning}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Type:</span>
                              <span className={`font-semibold ${
                                isUpgrade ? 'text-green-400' : isDowngrade ? 'text-yellow-400' : 'text-blue-400'
                              }`}>
                                {upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)}
                              </span>
                            </div>
                            {currentVipLevel && (
                              <div className="flex justify-between">
                                <span className="text-gray-300">Difference:</span>
                                <span className={`font-semibold ${
                                  level.amount > currentVipLevel.amount ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {level.amount > currentVipLevel.amount ? '+' : ''}{formatCurrency(level.amount - currentVipLevel.amount)}
                                </span>
                              </div>
                            )}
                            {level.id === currentVipLevel?.id && (
                              <div className="flex justify-between">
                                <span className="text-gray-300">Status:</span>
                                <span className="text-blue-400 font-semibold">Current Level</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  }) : (
                    <div className="col-span-full text-center py-8">
                      <div className="text-gray-400 mb-4">No VIP levels available</div>
                      <div className="text-gray-500 text-sm">
                        Please contact administrator to set up VIP levels
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 resize-none"
                  placeholder="Add any notes about this VIP upgrade/downgrade..."
                />
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-yellow-400">⚠️ Note:</span> This action changes the VIP level without affecting the user's wallet balance. 
                  If balance adjustments are needed, handle them separately through deposits or withdrawals.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || !selectedVipLevel}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🔄</span>
                      <span>Update VIP Level</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVipUpgradeModal;
