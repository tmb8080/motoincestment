import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const AdminVipAssignmentModal = ({ userId, userName, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedVipLevel, setSelectedVipLevel] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
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

  // Fetch current user VIP status
  const {
    data: userVipData,
    isLoading: userVipLoading
  } = useQuery({
    queryKey: ['userVipStatus', userId],
    queryFn: () => adminAPI.getUserVipStatus(userId),
    enabled: isOpen && !!userId,
    staleTime: 0,
  });

  // Debug logging
  console.log('🔍 VIP Levels Data:', vipLevelsData);
  console.log('🔍 VIP Levels Data Type:', typeof vipLevelsData);
  console.log('🔍 VIP Levels Data.data:', vipLevelsData?.data);
  console.log('🔍 VIP Levels Data.data Type:', typeof vipLevelsData?.data);
  console.log('🔍 Is Array:', Array.isArray(vipLevelsData?.data));
  console.log('🔍 VIP Levels Length:', vipLevelsData?.data?.length);

  // Extract VIP levels with multiple fallbacks
  let vipLevels = [];
  if (Array.isArray(vipLevelsData?.data)) {
    vipLevels = vipLevelsData.data;
  } else if (Array.isArray(vipLevelsData)) {
    vipLevels = vipLevelsData;
  } else if (vipLevelsData?.success && Array.isArray(vipLevelsData.data)) {
    vipLevels = vipLevelsData.data;
  }
  
  console.log('🔍 Final VIP Levels:', vipLevels);
  console.log('🔍 Final VIP Levels Length:', vipLevels.length);
  const currentUserVip = userVipData?.data;

  // Assign VIP mutation
  const assignVipMutation = useMutation({
    mutationFn: async (assignmentData) => {
      return await adminAPI.assignVipToUser(assignmentData);
    },
    onSuccess: (response) => {
      toast.success('VIP level assigned successfully!');
      queryClient.invalidateQueries(['userManagement']);
      queryClient.invalidateQueries(['userVipStatus', userId]);
      queryClient.invalidateQueries(['adminVipLevels']);
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error('VIP assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to assign VIP level');
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const resetForm = () => {
    setSelectedVipLevel('');
    setPaymentAmount('');
    setAdminNotes('');
  };

  const handleVipLevelChange = (vipLevelId) => {
    setSelectedVipLevel(vipLevelId);
    const selectedLevel = vipLevels.find(level => level.id === vipLevelId);
    if (selectedLevel) {
      setPaymentAmount(selectedLevel.amount.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedVipLevel) {
      toast.error('Please select a VIP level');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsProcessing(true);

    const assignmentData = {
      userId,
      vipLevelId: selectedVipLevel,
      paymentAmount: parseFloat(paymentAmount),
      adminNotes: adminNotes.trim(),
      assignedBy: 'admin' // Indicates this was assigned by admin
    };

    assignVipMutation.mutate(assignmentData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getVipLevelColor = (level) => {
    // Add null/undefined check
    if (!level || !level.name) {
      return 'from-gray-500 to-gray-600';
    }
    
    const colors = {
      'Bronze': 'from-yellow-600 to-yellow-700',
      'Silver': 'from-gray-400 to-gray-500',
      'Gold': 'from-yellow-500 to-yellow-600',
      'Platinum': 'from-blue-400 to-blue-500',
      'Diamond': 'from-purple-500 to-purple-600',
      'VIP': 'from-red-500 to-red-600'
    };
    return colors[level.name] || 'from-gray-500 to-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-700 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white">Assign VIP Level</h2>
            <p className="text-gray-400 text-sm truncate">User: {userName}</p>
            {currentUserVip && currentUserVip.vipLevel && (
              <div className="mt-2">
                <span className="text-xs text-gray-300">Current VIP: </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getVipLevelColor(currentUserVip.vipLevel)} text-white`}>
                  {currentUserVip.vipLevel.name}
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
                  Select VIP Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.isArray(vipLevels) && vipLevels.length > 0 ? vipLevels.filter(level => level && level.id && level.name).map((level) => (
                    <Card
                      key={level.id}
                      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                        selectedVipLevel === level.id
                          ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-500/20 to-blue-600/20'
                          : 'hover:bg-white/10'
                      }`}
                      onClick={() => handleVipLevelChange(level.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-bold text-lg bg-gradient-to-r ${getVipLevelColor(level)} bg-clip-text text-transparent`}>
                            {level.name}
                          </h3>
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
                            <span className="text-gray-300">Duration:</span>
                            <span className="text-white">{level.duration} days</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center py-8">
                      <div className="text-gray-400 mb-4">No VIP levels available</div>
                      <div className="text-gray-500 text-sm">
                        Please contact administrator to set up VIP levels
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  placeholder="Enter payment amount"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  This amount will be added to the user's wallet as a deposit
                </p>
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
                  placeholder="Add any notes about this VIP assignment..."
                />
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
                  disabled={isProcessing || !selectedVipLevel || !paymentAmount}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Assigning VIP...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">👑</span>
                      <span>Assign VIP Level</span>
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

export default AdminVipAssignmentModal;
