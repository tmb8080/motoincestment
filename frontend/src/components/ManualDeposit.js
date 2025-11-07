import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/Button';
import { depositAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const ManualDeposit = ({ onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('BEP20-USDT');
  const [depositAmount, setDepositAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const queryClient = useQueryClient();

  // Fetch company wallet addresses
  const { data: companyAddresses, isLoading: addressesLoading, error: addressesError } = useQuery({
    queryKey: ['companyAddresses'],
    queryFn: depositAPI.getCompanyAddresses,
    onError: (error) => {
      console.error('Error fetching company addresses:', error);
      toast.error('Failed to load wallet addresses');
    }
  });

  // Fallback addresses if API fails (TRON and Ethereum removed)
  const fallbackAddresses = {
    BEP20: { address: '0x448e993f55dacf78180fd67c4381591f9f9042b5', name: 'BEP20-USDT', fee: 0.5, minAmount: 0.000001, supportedTokens: ['USDT', 'USDC'] },
    POLYGON: { address: '0x448e993f55dacf78180fd67c4381591f9f9042b5', name: 'POL-USDT', fee: 0.1, minAmount: 0.000001, supportedTokens: ['USDT', 'USDC'] }
  };

  // Use API data or fallback
  const effectiveAddresses = companyAddresses?.data || fallbackAddresses;

  // Deposit methods - network + currency combinations (TRON and Ethereum removed)
  const depositMethods = [
    { key: 'BEP20-USDT', network: 'BEP20', currency: 'USDT', name: 'BEP20-USDT', color: 'bg-yellow-500', fee: 0.5, processingTime: '5-15 minutes' },
    { key: 'BEP20-USDC', network: 'BEP20', currency: 'USDC', name: 'BEP20-USDC', color: 'bg-blue-500', fee: 0.5, processingTime: '5-15 minutes' },
    { key: 'POL-USDT', network: 'POLYGON', currency: 'USDT', name: 'POL-USDT', color: 'bg-purple-700', fee: 0.1, processingTime: '2-5 minutes' },
    { key: 'POL-USDC', network: 'POLYGON', currency: 'USDC', name: 'POL-USDC', color: 'bg-blue-700', fee: 0.1, processingTime: '2-5 minutes' }
  ];

  // Get selected method data
  const selectedMethodData = depositMethods.find(method => method.key === selectedMethod);

  // Get the corresponding address for the selected method
  const getSelectedAddress = () => {
    const network = selectedMethodData?.network;
    if (network === 'BEP20') return effectiveAddresses.BEP20;
    if (network === 'POLYGON') return effectiveAddresses.POLYGON;
    return null;
  };

  const selectedAddress = getSelectedAddress();

  // Handle method selection
  const handleMethodChange = (methodKey) => {
    setSelectedMethod(methodKey);
  };

  // Create manual deposit mutation
  const createDepositMutation = useMutation({
    mutationFn: (data) => depositAPI.createUsdtDeposit(data),
    onSuccess: (response) => {
      toast.success('Deposit record created successfully!');
      queryClient.invalidateQueries(['userDeposits']);
      if (onSuccess) onSuccess(response.data);
      onClose();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create deposit record';
      toast.error(message);
    }
  });

  // Update transaction hash mutation
  const updateTransactionHashMutation = useMutation({
    mutationFn: ({ depositId, transactionHash }) => 
      depositAPI.updateTransactionHash(depositId, transactionHash),
    onSuccess: (response) => {
      toast.success('Transaction hash updated successfully!');
      queryClient.invalidateQueries(['userDeposits']);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update transaction hash';
      toast.error(message);
    }
  });

  // Verify deposit mutation
  const verifyDepositMutation = useMutation({
    mutationFn: (depositId) => depositAPI.verifyDeposit(depositId),
    onSuccess: (response) => {
      toast.success('Deposit verification initiated!');
      queryClient.invalidateQueries(['userDeposits']);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to verify deposit';
      toast.error(message);
    }
  });

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (!transactionHash.trim()) {
      toast.error('Please enter the transaction hash');
      return;
    }

    if (!selectedMethodData) {
      toast.error('Please select a deposit method');
      return;
    }

    try {
      // First create the deposit record
      const depositResponse = await createDepositMutation.mutateAsync({
        amount: parseFloat(depositAmount),
        network: selectedMethodData.network,
        transactionHash: transactionHash.trim()
      });

      if (!depositResponse?.data?.depositId) {
        toast.error('Failed to create deposit record');
        return;
      }

      const depositId = depositResponse.data.depositId;
      
      // Add a small delay to ensure the deposit is fully committed to the database
      toast.success('Deposit record created successfully! Waiting for verification...');
      
      // Wait 2 seconds before attempting verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then verify the deposit
      try {
        await verifyDepositMutation.mutateAsync(depositId);
        toast.success('Deposit verification initiated successfully!');
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        // Don't fail the whole process if verification fails
        toast.warning('Deposit created but verification failed. Please contact support.');
      }

      // Close the modal on success
      onClose();

    } catch (error) {
      console.error('Error in manual deposit process:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create deposit';
      toast.error(errorMessage);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  if (addressesLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Loading wallet addresses...</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't render until we have addresses (either from API or fallback)
  if (!effectiveAddresses || Object.keys(effectiveAddresses).length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md border border-white/20 shadow-2xl p-8">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-2">Error Loading Addresses</div>
            <p className="text-gray-400 text-sm">Unable to load wallet addresses. Please try again later.</p>
            <button
              onClick={onClose}
              className="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="text-lg font-semibold text-white">Deposit Funds</h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4">
          {/* Deposit Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Choose deposit method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {depositMethods.map((method) => (
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

          {/* QR Code and Address Section */}
          {selectedAddress && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg p-4">
                <h3 className="text-white font-semibold text-lg mb-3 text-center">Recharge QR Code</h3>
                
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={selectedAddress.address} size={150} />
                  </div>
                </div>
                
                {/* Wallet Address */}
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <p className="text-purple-400 font-mono text-sm break-all flex-1 mr-2">
                    {selectedAddress.address}
                  </p>
                  <button
                    onClick={() => copyToClipboard(selectedAddress.address)}
                    className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deposit Amount ({selectedMethodData?.currency})
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder={`Enter amount in ${selectedMethodData?.currency}`}
              min="0.000001"
              step="0.01"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Any positive amount is accepted. Network fees may apply.
            </p>
          </div>

          {/* Transaction Hash Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transaction Hash
            </label>
            <input
              type="text"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              placeholder="Enter transaction hash after sending USDT"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the transaction hash from your wallet after sending USDT
            </p>
          </div>

          {/* Method Information */}
          {selectedMethodData && (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg p-3 mb-6">
              <div className="text-sm text-blue-300">
                <p className="font-medium">Method: {selectedMethodData.name}</p>
                <p>Fee: ${selectedMethodData.fee} {selectedMethodData.currency}</p>
                <p>Processing time: {selectedMethodData.processingTime}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={handleDeposit}
              disabled={createDepositMutation.isLoading || !depositAmount || !transactionHash.trim() || parseFloat(depositAmount) <= 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createDepositMutation.isLoading ? 'Creating Deposit...' : 'Create Deposit Request'}
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

export default ManualDeposit;
