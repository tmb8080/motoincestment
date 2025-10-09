import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/Button';
import { withdrawalAPI, walletAPI } from '../services/api';
import toast from 'react-hot-toast';

const UsdtWithdrawal = ({ onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('BEP20-USDT');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [feePreview, setFeePreview] = useState(null);
  const queryClient = useQueryClient();

  // Fetch user wallet balance
  const { data: walletStats, isLoading: walletLoading, error: walletError } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => walletAPI.getStats(),
    retry: 3,
    retryDelay: 1000,
  });

  // Static minimum withdrawal amount
  const minWithdrawalAmount = 20;
  
  // Calculate withdrawable balance (earnings + bonuses, excluding deposits)
  const walletData = walletStats?.data?.data || walletStats?.data || {};
  console.log('Full walletStats response:', walletStats);
  console.log('Wallet data in UsdtWithdrawal:', walletData);
  console.log('totalEarnings:', walletData.totalEarnings);
  console.log('totalReferralBonus:', walletData.totalReferralBonus);
  console.log('dailyEarnings:', walletData.dailyEarnings);
  
  const withdrawableBalance = parseFloat(walletData.totalEarnings || 0) + 
                             parseFloat(walletData.totalReferralBonus || 0) + 
                             parseFloat(walletData.dailyEarnings || 0);
  
  console.log('Calculated withdrawable balance:', withdrawableBalance);

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  // Withdrawal methods - network + currency combinations (TRON and Ethereum removed)
  const withdrawalMethods = [
    { key: 'BEP20-USDT', network: 'BEP20', currency: 'USDT', name: 'BEP20-USDT', color: 'bg-yellow-500', fee: 0, processingTime: '1 up to 24 hours' },
    { key: 'BEP20-USDC', network: 'BEP20', currency: 'USDC', name: 'BEP20-USDC', color: 'bg-blue-500', fee: 0.5, processingTime: '1 up to 24 hours' },
    { key: 'POL-USDT', network: 'POLYGON', currency: 'USDT', name: 'POL-USDT', color: 'bg-purple-700', fee: 0.1, processingTime: '1 up to 24 hours' },
    { key: 'POL-USDC', network: 'POLYGON', currency: 'USDC', name: 'POL-USDC', color: 'bg-blue-700', fee: 0.1, processingTime: '1 up to 24 hours' }
  ];

  // Get selected method data
  const selectedMethodData = withdrawalMethods.find(method => method.key === selectedMethod);

  // Handle method selection
  const handleMethodChange = (methodKey) => {
    setSelectedMethod(methodKey);
  };

  // Handle withdrawal submission
  const withdrawalMutation = useMutation({
    mutationFn: (data) => withdrawalAPI.requestWithdrawal(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Withdrawal request submitted successfully!');
        queryClient.invalidateQueries(['walletStats']);
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to submit withdrawal request');
      }
    },
    onError: (error) => {
      console.error('Withdrawal error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit withdrawal request';
      toast.error(errorMessage);
    }
  });

  useEffect(() => {
    const amt = parseFloat(withdrawalAmount);
    if (!isNaN(amt) && amt > 0) {
      withdrawalAPI.previewFee(amt)
        .then((res) => setFeePreview(res.data.data))
        .catch(() => setFeePreview(null));
    } else {
      setFeePreview(null);
    }
  }, [withdrawalAmount]);

  const handleWithdrawal = () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) < minWithdrawalAmount) {
      toast.error(`Please enter a valid amount (minimum $${minWithdrawalAmount})`);
      return;
    }

    if (!withdrawalAddress.trim()) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    const withdrawalData = {
      amount: parseFloat(withdrawalAmount),
      currency: selectedMethodData.currency,
      walletAddress: withdrawalAddress.trim(),
      network: selectedMethodData.network
    };

    withdrawalMutation.mutate(withdrawalData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">Withdraw Funds</h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4">
          {/* Account Balance */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">Withdrawable balance (earnings + bonuses)</span>
              {!isAuthenticated ? (
                <span className="text-sm text-red-400">Not authenticated</span>
              ) : walletLoading ? (
                <span className="text-sm text-gray-400">Loading...</span>
              ) : walletError ? (
                <span className="text-sm text-red-400">Error: {walletError.message}</span>
              ) : walletStats ? (
                <span className="text-lg font-semibold text-white">${withdrawableBalance.toFixed(4)}</span>
              ) : (
                <span className="text-sm text-gray-400">No data</span>
              )}
            </div>
          </div>

          {/* Withdrawal Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Choose withdrawal method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {withdrawalMethods.map((method) => (
                <button
                  key={method.key}
                  onClick={() => handleMethodChange(method.key)}
                  className={`p-3 rounded-lg text-center transition-all duration-200 ${
                    selectedMethod === method.key
                      ? `${method.color} text-white shadow-lg transform scale-105`
                      : 'bg-white/10 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <div className="text-sm font-medium">{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Withdrawal Amount ({selectedMethodData?.currency})
            </label>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder={`Minimum $${minWithdrawalAmount} ${selectedMethodData?.currency}`}
              min={minWithdrawalAmount}
              max={withdrawableBalance}
              step="0.01"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum withdrawal: {minWithdrawalAmount} {selectedMethodData?.currency} | Available: ${withdrawableBalance.toFixed(2)}
            </p>
          </div>

          {/* Wallet Address Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {selectedMethodData?.currency} Wallet Address
            </label>
            <input
              type="text"
              value={withdrawalAddress}
              onChange={(e) => setWithdrawalAddress(e.target.value)}
              placeholder={`Enter your ${selectedMethodData?.currency} wallet address`}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Make sure to use the correct network address
            </p>
          </div>

          {/* Fee Information */}
          {selectedMethodData && (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg p-3 mb-6">
              <div className="text-sm text-blue-300">
                <p className="font-medium">Method: {selectedMethodData.name}</p>
                {feePreview ? (
                  <>
                    <p>Processing fee: ${feePreview.fee.toFixed(4)} <span className="text-xs text-green-400">(paid by system)</span></p>
                    <p>You will receive: ${feePreview.net.toFixed(4)}</p>
                  </>
                ) : (
                  <p>Enter amount to preview fee</p>
                )}
                <p>Processing time: {selectedMethodData.processingTime}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={handleWithdrawal}
              disabled={withdrawalMutation.isLoading || !withdrawalAddress.trim() || !withdrawalAmount || parseFloat(withdrawalAmount) < minWithdrawalAmount || parseFloat(withdrawalAmount) > withdrawableBalance}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {withdrawalMutation.isLoading ? 'Creating Withdrawal...' : 'Create Withdrawal Request'}
            </Button>
            
            <Button
              onClick={onClose}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsdtWithdrawal;
