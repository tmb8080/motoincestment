import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletAPI, depositAPI } from '../services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { toast } from 'react-hot-toast';

const UsdtDeposit = ({ onClose, vipToJoin }) => {
  const [selectedMethod, setSelectedMethod] = useState('BEP20-USDT');
  const [transactionHash, setTransactionHash] = useState('');
  const [amount, setAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectResult, setAutoDetectResult] = useState(null);
  const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch company wallet addresses
  const { data: addresses, isLoading: addressesLoading, error: addressesError } = useQuery({
    queryKey: ['companyWalletAddresses'],
    queryFn: () => walletAPI.getCompanyWalletAddresses(),
    onSuccess: (data) => {
      console.log('✅ Addresses loaded successfully:', data);
    },
    onError: (error) => {
      console.log('❌ Error loading addresses:', error);
    }
  });

  // Deposit methods (TRON and Ethereum removed)
  const depositMethods = [
    { key: 'BEP20-USDT', name: 'BEP20-USDT', network: 'BEP20', currency: 'USDT', color: 'bg-yellow-500' },
    { key: 'BEP20-USDC', name: 'BEP20-USDC', network: 'BEP20', currency: 'USDC', color: 'bg-blue-500' },
    { key: 'POL-USDT', name: 'POL-USDT', network: 'POLYGON', currency: 'USDT', color: 'bg-purple-700' },
    { key: 'POL-USDC', name: 'POL-USDC', network: 'POLYGON', currency: 'USDC', color: 'bg-blue-700' }
  ];

  const selectedMethodData = depositMethods.find(method => method.key === selectedMethod);

  const copyToClipboard = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const getAddressForNetwork = (network) => {
    console.log('🔍 getAddressForNetwork called with network:', network);
    console.log('🔍 Network type:', typeof network);
    console.log('🔍 Network length:', network?.length);
    
    // Check if addresses exist and have the correct structure
    if (!addresses?.data?.data) {
      console.log('❌ No addresses data available');
      console.log('📦 Full addresses object:', addresses);
      return null;
    }
    
    // Access the actual addresses data
    const addressesData = addresses.data.data;
    
    console.log('📋 Available addresses:', addressesData);
    console.log('🔑 Available keys:', Object.keys(addressesData));
    console.log('🎯 Looking for network:', network);
    
    // Check if the network exists (case-insensitive)
    const networkKeys = Object.keys(addressesData);
    const foundKey = networkKeys.find(key => key.toUpperCase() === network.toUpperCase());
    
    if (foundKey) {
      console.log('✅ Found network (case-insensitive):', foundKey, '->', addressesData[foundKey]);
      return addressesData[foundKey];
    }
    
    // If no direct match, try alternative mappings
    console.log('❌ No direct match, trying alternative mappings');
    let mappedNetwork = null;
    
    switch (network) {
      case 'BEP20':
        mappedNetwork = 'BSC';
        break;
      case 'POLYGON':
        mappedNetwork = 'POLYGON';
        break;
      default:
        console.log('❌ No mapping found for network:', network);
        return null;
    }
    
    console.log('🔍 Trying mapped network:', mappedNetwork);
    
    if (mappedNetwork && addressesData[mappedNetwork]) {
      console.log('✅ Found mapped network:', mappedNetwork, '->', addressesData[mappedNetwork]);
      return addressesData[mappedNetwork];
    }
    
    console.log('❌ No mapping found for network:', network);
    console.log('🔍 Available networks in data:', Object.keys(addressesData));
    console.log('🔍 Network comparison:', {
      input: network,
      inputType: typeof network,
      available: Object.keys(addressesData),
      hasProperty: addressesData.hasOwnProperty(network),
      directAccess: addressesData[network]
    });
    return null;
  };

  const selectedAddress = getAddressForNetwork(selectedMethodData?.network);

  console.log('🎯 Selected method:', selectedMethod);
  console.log('📊 Selected method data:', selectedMethodData);
  console.log('📍 Selected address:', selectedAddress);
  console.log('⏳ Addresses loading:', addressesLoading);
  console.log('❌ Addresses error:', addressesError);
  console.log('📦 Full addresses response:', addresses);

  // Check transaction across all networks mutation (user-facing)
  const checkAllNetworksMutation = useMutation({
    mutationFn: (data) => depositAPI.getTransactionDetails(data),
    onSuccess: (response) => {
      const result = response.data.data;
      console.log('✅ Check all networks response:', result);
      
      // Handle transaction details response format
      const foundResult = result.results?.find(r => r.found);
      
      if (foundResult) {
        const processedData = {
          found: true,
          foundOnNetwork: foundResult.network,
          suggestedNetwork: foundResult.network,
          suggestedAmount: foundResult.details?.amount || 'N/A',
          recipientAddress: foundResult.details?.recipientAddress || 'N/A',
          senderAddress: foundResult.details?.senderAddress || 'N/A',
          blockNumber: foundResult.details?.blockNumber || 'N/A',
          isConfirmed: foundResult.details?.isConfirmed || false,
          isTokenTransfer: foundResult.details?.isTokenTransfer || false,
          companyAddresses: result.companyAddresses || {},
          networkResults: result.results || [],
          isRecipientMatching: false // Will be calculated below
        };
        
        // Check if recipient matches (handle case sensitivity)
        console.log('🔍 Checking recipient matching (cross-network):');
        console.log('  - Recipient Address:', processedData.recipientAddress);
        console.log('  - Company Addresses:', processedData.companyAddresses);
        
        const isRecipientMatching = processedData.recipientAddress && processedData.companyAddresses && 
          Object.values(processedData.companyAddresses).some(companyAddr => {
            const matches = companyAddr.toLowerCase() === processedData.recipientAddress.toLowerCase();
            console.log(`  - Comparing: ${companyAddr.toLowerCase()} === ${processedData.recipientAddress.toLowerCase()} = ${matches}`);
            return matches;
          });
        
        console.log('  - Final isRecipientMatching:', isRecipientMatching);
        
        // Update the result with the corrected matching status
        const updatedResult = {
          ...processedData,
          isRecipientMatching: isRecipientMatching
        };
        
        setAutoDetectResult(updatedResult);
        setIsAutoDetecting(false);
        
        if (isRecipientMatching) {
          toast.success(`✅ Transaction found and verified on ${foundResult.network}!`);
        } else {
          toast.warning(`⚠️ Transaction found on ${foundResult.network}, but recipient doesn't match our address`);
        }
        console.log('Cross-network check result:', updatedResult);
        
        // Automatically open the enhanced detection modal with full data
        setShowAutoDetectModal(true);
      } else {
        // Show details even when not found
        toast.warning(`⚠️ Transaction not found on any network, but showing response details for debugging`);
        console.log('Cross-network check result (not found):', result);
        
        // Set the result to show the "not found" details
        setAutoDetectResult({
          ...result,
          found: false,
          isRecipientMatching: false,
          // Add some default values for display
          suggestedAmount: 'N/A',
          suggestedNetwork: 'N/A',
          recipientAddress: 'N/A',
          senderAddress: 'N/A',
          blockNumber: 'N/A'
        });
        
        // Automatically open the enhanced detection modal to show debug information
        setShowAutoDetectModal(true);
      }
    },
    onError: (error) => {
      setIsAutoDetecting(false);
      toast.error(error.response?.data?.message || 'Failed to check transaction across networks');
    },
  });

  // Create deposit mutation
  const createDepositMutation = useMutation({
    mutationFn: (data) => {
      console.log('🚀 Creating deposit with data:', data);
      return depositAPI.createUsdtDeposit(data);
    },
    onSuccess: (response) => {
      console.log('✅ Deposit created successfully:', response);
      
      if (response.data?.autoConfirmed) {
        toast.success(`🎉 Deposit automatically confirmed! Amount has been added to your wallet.`);
        // Close modal after auto-confirmation
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
      toast.success('Deposit created successfully!');
      }
      
      queryClient.invalidateQueries(['deposits']);
      queryClient.invalidateQueries(['wallet']); // Refresh wallet balance
    },
    onError: (error) => {
      console.error('❌ Deposit creation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create deposit');
    },
  });

  // Function to check transaction across all networks
  const checkAllNetworks = (hash) => {
    if (hash && /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(hash)) {
      setIsAutoDetecting(true);
      checkAllNetworksMutation.mutate({ transactionHash: hash });
    } else {
      toast.error('Please enter a valid transaction hash');
    }
  };

  // Handle transaction hash change with auto-detection
  const handleTransactionHashChange = (e) => {
    const hash = e.target.value.trim();
    setTransactionHash(hash);
    
    // Clear results if hash is empty or too short
    if (!hash || hash.length < 10) {
      setAutoDetectResult(null);
      return;
    }
    
    // Auto-trigger when a valid hash is entered (64 characters with or without 0x prefix)
    if (/^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(hash)) {
      console.log('✅ Valid hash detected, calling checkAllNetworks (same as button)');
      // Use the same function as the Auto Detect button
      checkAllNetworks(hash);
    } else if (hash.length >= 64) {
      // If hash is 64+ characters but doesn't match pattern, show error
      console.log('❌ Invalid hash format detected');
      setAutoDetectResult({
        found: false,
        isRecipientMatching: false,
        suggestedAmount: 'N/A',
        suggestedNetwork: 'N/A',
        recipientAddress: 'N/A',
        senderAddress: 'N/A',
        blockNumber: 'N/A',
        error: 'Invalid transaction hash format'
      });
    }
  };

  const handleSubmit = () => {
    // Check if we have a valid transaction detected
    if (!autoDetectResult || !autoDetectResult.found) {
      toast.error('Please paste a valid transaction hash first');
      return;
    }

    // Check if recipient is valid
    if (!autoDetectResult.isRecipientMatching) {
      toast.error('❌ Invalid recipient address. This transaction was not sent to our wallet address.');
      return;
    }

    // Use the auto-detected amount
    const detectedAmount = autoDetectResult.suggestedAmount;
    if (!detectedAmount || detectedAmount === 'N/A' || parseFloat(detectedAmount) <= 0) {
      toast.error('Invalid transaction amount (must be greater than 0)');
      return;
    }

    if (!transactionHash.trim()) {
      toast.error('Please enter the transaction hash');
      return;
    }

    // Determine if this should be auto-confirmed based on recipient matching
    const shouldAutoConfirm = autoDetectResult.isRecipientMatching;

    const depositData = {
      amount: parseFloat(detectedAmount),
      currency: selectedMethodData.currency,
      network: selectedMethodData.network,
      transactionHash: transactionHash.trim(),
      status: shouldAutoConfirm ? 'CONFIRMED' : 'PENDING',
      autoConfirmed: shouldAutoConfirm
    };

    console.log('🚀 Creating deposit with auto-detected data:', depositData);
    console.log('🔍 Auto-confirmation check:', {
      isRecipientMatching: autoDetectResult.isRecipientMatching,
      shouldAutoConfirm,
      status: depositData.status,
      autoConfirmed: depositData.autoConfirmed
    });

    createDepositMutation.mutate(depositData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 sticky top-0 bg-white/5 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">USDT</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Deposit Methods */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Select Deposit Method</h3>
            <div className="space-y-2">
              {depositMethods.map((method) => (
                <button
                  key={method.key}
                  onClick={() => setSelectedMethod(method.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedMethod === method.key
                      ? `${method.color} text-white border-transparent shadow-lg`
                      : 'bg-white/10 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-white/20 border-white/20'
                  }`}
                >
                  <span className="font-medium">{method.name}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {addressesLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-gray-300 mt-2">Loading wallet addresses...</p>
            </div>
          )}

          {/* Error State */}
          {addressesError && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg p-4">
              <p className="text-red-300">Error loading wallet addresses. Please try again.</p>
            </div>
          )}

          {/* QR Code and Address */}
          {!addressesLoading && !addressesError && selectedAddress && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Recharge QR Code</h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20">
                {/* QR Code */}
                <div className="mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedAddress}`}
                    alt={`QR Code for ${selectedMethodData?.name}`}
                    className="mx-auto border border-white/20 rounded-lg bg-white"
                  />
                </div>

                {/* Wallet Address */}
                <div className="mb-4">
                  <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                    <span className="font-mono text-sm text-purple-300 break-all">
                      {selectedAddress}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedAddress)}
                      className={`ml-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        copiedAddress
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                          : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30'
                      }`}
                    >
                      {copiedAddress ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Address Available */}
          {!addressesLoading && !addressesError && !selectedAddress && addresses?.data && (
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-4">
              <p className="text-yellow-300">
                No wallet address available for {selectedMethodData?.name}. Please select a different method.
              </p>
            </div>
          )}

          {/* Deposit Instructions */}
          {selectedAddress && (
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-3">📋 Deposit Instructions</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Select Network & Copy Address</p>
                    <p className="text-xs text-blue-200">Choose {selectedMethodData?.name} and copy the wallet address above</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Send Funds from Your Wallet</p>
                    <p className="text-xs text-blue-200">Open your crypto wallet (MetaMask, Trust Wallet, etc.) and send any amount of {selectedMethodData?.currency} to the copied address</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Get Transaction Hash</p>
                    <p className="text-xs text-blue-200">
                      <strong>Where to find Transaction Hash:</strong><br/>
                      • <strong>MetaMask:</strong> Click on the transaction → Copy "Transaction Hash"<br/>
                      • <strong>Trust Wallet:</strong> Tap transaction → Copy "TxID" or "Hash"<br/>
                      • <strong>Binance:</strong> Withdrawal history → Copy "Transaction ID"<br/>
                      • <strong>Other wallets:</strong> Look for "Tx Hash", "Transaction ID", or "Hash"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Paste Hash & Submit</p>
                    <p className="text-xs text-blue-200">Paste the transaction hash below to auto-detect amount and network, then click "Submit Deposit"</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
            
            {/* Auto-Detected Amount Display */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount ({selectedMethodData?.currency})
              </label>
              <div className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white">
                {autoDetectResult && autoDetectResult.found && autoDetectResult.suggestedAmount && autoDetectResult.suggestedAmount !== 'N/A' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {autoDetectResult.suggestedAmount} {selectedMethodData?.currency}
                    </span>
                    <span className="text-green-400 text-sm">✅ Auto-detected</span>
                  </div>
                ) : (
                  <span className="text-gray-400">
                    {autoDetectResult && autoDetectResult.found ? 'Amount will be auto-filled from verified transaction' : 'Paste transaction hash to auto-detect amount'}
                  </span>
                )}
              </div>
            </div>

            {/* Transaction Hash Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction Hash
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
              <input
                type="text"
                value={transactionHash}
                    onChange={handleTransactionHashChange}
                    placeholder="Paste or type transaction hash from your wallet"
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      transactionHash && transactionHash.length >= 64
                        ? /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(transactionHash)
                          ? 'border-green-400 focus:ring-green-500'
                          : 'border-red-400 focus:ring-red-500'
                        : 'border-white/20'
                    }`}
                  />
                  {transactionHash && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {transactionHash.length >= 64 ? (
                        /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(transactionHash) ? (
                          <span className="text-green-400 text-sm">✅</span>
                        ) : (
                          <span className="text-red-400 text-sm">❌</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">{transactionHash.length}/64</span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => checkAllNetworks(transactionHash)}
                  loading={checkAllNetworksMutation.isPending}
                  disabled={!transactionHash}
                  className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 border-0 shadow-lg"
                >
                  {checkAllNetworksMutation.isPending ? 'Checking...' : '🔍 Auto Detect'}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Find this in your wallet's transaction history or blockchain explorer
              </p>
              
              {/* Auto-detection Status */}
              {isAutoDetecting && (
                <div className="mt-2 p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm text-blue-300">Detecting transaction across networks...</span>
                  </div>
                </div>
              )}

              {/* Auto-detection Results */}
              {autoDetectResult && (
                <div className={`mt-2 p-3 rounded-lg border ${
                  autoDetectResult.found 
                    ? (autoDetectResult.isRecipientMatching 
                        ? 'bg-green-500/20 border-green-400/30' 
                        : 'bg-yellow-500/20 border-yellow-400/30')
                    : 'bg-red-500/20 border-red-400/30'
                }`}>
                  {autoDetectResult.found && autoDetectResult.isRecipientMatching && createDepositMutation.isLoading && (
                    <div className="mb-2 p-2 bg-green-500/30 border border-green-400/50 rounded">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                        <span className="text-green-300 text-sm font-medium">🔄 Auto-confirming deposit...</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-lg ${
                      autoDetectResult.found 
                        ? (autoDetectResult.isRecipientMatching ? 'text-green-400' : 'text-yellow-400')
                        : 'text-red-400'
                    }`}>
                      {autoDetectResult.found 
                        ? (autoDetectResult.isRecipientMatching ? '✅' : '⚠️')
                        : '❌'
                      }
                    </span>
                    <span className={`text-sm font-medium ${
                      autoDetectResult.found 
                        ? (autoDetectResult.isRecipientMatching ? 'text-green-300' : 'text-yellow-300')
                        : 'text-red-300'
                    }`}>
                      {autoDetectResult.found ? 'Transaction Detected' : 'Transaction Not Found'}
                    </span>
                  </div>
                  <div className={`text-xs space-y-1 ${
                    autoDetectResult.found 
                      ? (autoDetectResult.isRecipientMatching ? 'text-green-200' : 'text-yellow-200')
                      : 'text-red-200'
                  }`}>
                    <div>Network: {autoDetectResult.foundOnNetwork || autoDetectResult.suggestedNetwork || 'N/A'}</div>
                    <div>Amount: {autoDetectResult.suggestedAmount || 'N/A'} USDT</div>
                    <div>Status: {autoDetectResult.found 
                      ? (autoDetectResult.isRecipientMatching ? 'Valid Recipient' : 'Invalid Recipient')
                      : 'Not Found'
                    }</div>
                    {autoDetectResult.found && (
                      <>
                        <div>Recipient: {autoDetectResult.recipientAddress?.substring(0, 10)}...{autoDetectResult.recipientAddress?.substring(-8)}</div>
                        <div>Sender: {autoDetectResult.senderAddress?.substring(0, 10)}...{autoDetectResult.senderAddress?.substring(-8)}</div>
                      </>
                    )}
                    {!autoDetectResult.found && (
                      <div className="text-xs text-red-300 mt-2">
                        🔍 Check the enhanced detection modal for detailed debugging information
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Important Notes:</h4>
            <ul className="text-sm text-yellow-200 space-y-1 list-disc list-inside">
              <li>Paste transaction hash to auto-detect amount and network</li>
              <li>Any amount from verified transaction will be accepted</li>
              <li>Use only {selectedMethodData?.name} network - wrong network = lost funds</li>
              <li>Transaction hash is required for verification</li>
              <li>Amount will be automatically filled from detected transaction</li>
              <li>✅ Valid recipient transactions are auto-confirmed instantly</li>
              <li>⚠️ Invalid recipient transactions cannot be submitted</li>
              <li>Auto-confirmed deposits are added to wallet immediately</li>
              <li>Keep your transaction hash for support if needed</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              createDepositMutation.isLoading || 
              !autoDetectResult || 
              !autoDetectResult.found || 
              !autoDetectResult.isRecipientMatching || 
              !transactionHash.trim()
            }
            className={`w-full py-3 rounded-lg font-medium ${
              autoDetectResult && autoDetectResult.found && !autoDetectResult.isRecipientMatching
                ? 'bg-red-500 hover:bg-red-600 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {createDepositMutation.isLoading ? (
              'Creating Deposit...'
            ) : autoDetectResult && autoDetectResult.found && autoDetectResult.isRecipientMatching && autoDetectResult.suggestedAmount ? (
              `Submit Deposit (${autoDetectResult.suggestedAmount} ${selectedMethodData?.currency})`
            ) : autoDetectResult && autoDetectResult.found && !autoDetectResult.isRecipientMatching ? (
              '❌ Invalid Recipient - Cannot Submit'
            ) : (
              'Submit Deposit'
            )}
          </Button>

          {/* Enhanced Detection Button */}
          <Button
            onClick={() => setShowAutoDetectModal(true)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-lg font-medium"
          >
            🔍 Enhanced Transaction Detection
          </Button>
        </div>
      </div>

      {/* Enhanced Automatic Detection Modal */}
      {showAutoDetectModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAutoDetectModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {autoDetectResult ? 'Transaction Results' : 'Enhanced Transaction Detection'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {autoDetectResult 
                      ? 'Detailed analysis of your transaction hash'
                      : 'Paste any transaction hash to automatically detect details'
                    }
                  </p>
                </div>
              </div>
                <button
                  onClick={() => setShowAutoDetectModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Transaction Hash Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Transaction Hash *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Paste or type transaction hash to auto-detect details"
                        value={transactionHash}
                        onChange={(e) => {
                          const hash = e.target.value.trim();
                          setTransactionHash(hash);
                          
                          // Clear results if hash is empty or too short
                          if (!hash || hash.length < 10) {
                            setAutoDetectResult(null);
                            return;
                          }
                          
                          // Auto-trigger when a valid hash is entered (64 characters with or without 0x prefix)
                          if (/^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(hash)) {
                            console.log('✅ Valid hash detected in modal, calling checkAllNetworks');
                            checkAllNetworks(hash);
                          } else if (hash.length >= 64) {
                            // If hash is 64+ characters but doesn't match pattern, show error
                            console.log('❌ Invalid hash format detected in modal');
                            setAutoDetectResult({
                              found: false,
                              isRecipientMatching: false,
                              suggestedAmount: 'N/A',
                              suggestedNetwork: 'N/A',
                              recipientAddress: 'N/A',
                              senderAddress: 'N/A',
                              blockNumber: 'N/A',
                              error: 'Invalid transaction hash format'
                            });
                          }
                        }}
                        className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          transactionHash && transactionHash.length >= 64
                            ? /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(transactionHash)
                              ? 'border-green-400 focus:ring-green-500'
                              : 'border-red-400 focus:ring-red-500'
                            : 'border-gray-200'
                        }`}
                      />
                      {transactionHash && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {transactionHash.length >= 64 ? (
                            /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(transactionHash) ? (
                              <span className="text-green-600 text-sm">✅</span>
                            ) : (
                              <span className="text-red-600 text-sm">❌</span>
                            )
                          ) : (
                            <span className="text-gray-500 text-sm">{transactionHash.length}/64</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => checkAllNetworks(transactionHash)}
                      loading={checkAllNetworksMutation.isPending}
                      disabled={!transactionHash}
                      className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 border-0 shadow-lg"
                    >
                      {checkAllNetworksMutation.isPending ? 'Checking...' : '🔍 Check All'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    🔍 Paste transaction hash to automatically detect network, amount, and verify recipient. Any verified amount will be accepted.
                  </p>
                </div>

                {/* Loading State */}
                {isAutoDetecting && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Searching Transaction</p>
                        <p className="text-xs text-blue-600">Checking across all supported networks...</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center space-x-2">
                      <div className="animate-pulse">🟡</div>
                      <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>🔵</div>
                      <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>🟣</div>
                      <div className="animate-pulse" style={{ animationDelay: '0.6s' }}>🔴</div>
                    </div>
                  </div>
                )}

                {/* Auto-detection Results */}
                {autoDetectResult && (
                  <div className={`border rounded-lg p-4 ${
                    autoDetectResult.found
                      ? (autoDetectResult.isRecipientMatching 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200')
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`text-lg ${
                        autoDetectResult.found
                          ? (autoDetectResult.isRecipientMatching ? 'text-green-600' : 'text-yellow-600')
                          : 'text-red-600'
                      }`}>
                        {autoDetectResult.found 
                          ? (autoDetectResult.isRecipientMatching ? '✅' : '⚠️')
                          : '❌'
                        }
                      </span>
                      <h4 className={`text-sm font-medium ${
                        autoDetectResult.found
                          ? (autoDetectResult.isRecipientMatching ? 'text-green-800' : 'text-yellow-800')
                          : 'text-red-800'
                      }`}>
                        {autoDetectResult.found ? 'Transaction Auto-Detected' : 'Transaction Not Found - Debug Info'}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Network:</span>
                        <span className={`ml-2 font-medium ${autoDetectResult.isRecipientMatching ? 'text-green-900' : 'text-yellow-900'}`}>
                          {autoDetectResult.foundOnNetwork || autoDetectResult.suggestedNetwork}
                        </span>
                      </div>
                      <div>
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Amount:</span>
                        <span className={`ml-2 font-medium ${autoDetectResult.isRecipientMatching ? 'text-green-900' : 'text-yellow-900'}`}>
                          {autoDetectResult.suggestedAmount} USDT
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Recipient:</span>
                        <div className={`mt-1 font-mono text-xs break-all p-2 rounded border ${
                          autoDetectResult.isRecipientMatching ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {autoDetectResult.recipientAddress}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Sender:</span>
                        <div className={`mt-1 font-mono text-xs break-all p-2 rounded border ${
                          autoDetectResult.isRecipientMatching ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {autoDetectResult.senderAddress}
                        </div>
                      </div>
                      <div>
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Block:</span>
                        <span className={`ml-2 font-medium ${autoDetectResult.isRecipientMatching ? 'text-green-900' : 'text-yellow-900'}`}>
                          {autoDetectResult.blockNumber}
                        </span>
                      </div>
                      <div>
                        <span className={autoDetectResult.isRecipientMatching ? 'text-green-700' : 'text-yellow-700'}>Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          autoDetectResult.isRecipientMatching 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {autoDetectResult.isRecipientMatching ? '✓ Valid Recipient' : '✗ Invalid Recipient'}
                        </span>
                        {!autoDetectResult.isRecipientMatching && (
                          <div className="mt-1 text-xs text-red-600">
                            ⚠️ Transaction found but recipient doesn't match our addresses. Check the address analysis below.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Matching Information */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2 text-xs">
                        
                        
                        {/* Transaction Details */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transaction Hash:</span>
                          <span className="font-mono text-gray-800">{autoDetectResult.transactionHash}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Found Status:</span>
                          <span className={`font-medium ${autoDetectResult.found ? 'text-green-600' : 'text-red-600'}`}>
                            {autoDetectResult.found ? '✓ FOUND' : '✗ NOT FOUND'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Found On Network:</span>
                          <span className="font-mono text-gray-800">{autoDetectResult.foundOnNetwork || 'N/A'}</span>
                        </div>
                        
                        {/* Only show matching details if transaction was found */}
                        {autoDetectResult.found && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Transaction Recipient:</span>
                              <span className="font-mono text-gray-800">{autoDetectResult.recipientAddress}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Our Company Addresses:</span>
                              <div className="text-right">
                                {autoDetectResult.companyAddresses && Object.entries(autoDetectResult.companyAddresses).map(([network, address]) => (
                                  <div key={network} className="font-mono text-gray-800">
                                    {network}: {address}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Matching Result:</span>
                              <span className={`font-medium ${autoDetectResult.isRecipientMatching ? 'text-green-600' : 'text-red-600'}`}>
                                {autoDetectResult.isRecipientMatching ? '✓ MATCH FOUND' : '✗ NO MATCH'}
                              </span>
                            </div>
                            {autoDetectResult.companyAddresses && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <div className="font-medium text-gray-700 mb-1">Address Comparison:</div>
                                {Object.entries(autoDetectResult.companyAddresses).map(([network, address]) => {
                                  const matches = address.toLowerCase() === autoDetectResult.recipientAddress?.toLowerCase();
                                  return (
                                    <div key={network} className={`flex justify-between ${matches ? 'text-green-600' : 'text-gray-500'}`}>
                                      <span>{network}:</span>
                                      <span className="font-mono">{matches ? '✓ MATCH' : '✗ NO MATCH'}</span>
    </div>
  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Network Check Results */}
                        {autoDetectResult.networkResults && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <div className="font-medium text-blue-700 mb-1">Network Check Results:</div>
                            {Object.entries(autoDetectResult.networkResults).map(([network, result]) => (
                              <div key={network} className={`flex justify-between ${result.found ? 'text-green-600' : 'text-gray-500'}`}>
                                <span>{network}:</span>
                                <span className="font-mono">{result.found ? '✓ FOUND' : '✗ NOT FOUND'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Detailed Recipient Analysis */}
                        {autoDetectResult.recipientAddress && autoDetectResult.companyAddresses && (
                          <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                            <div className="font-medium text-orange-700 mb-1">Recipient Address Analysis:</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-orange-600">Transaction Recipient:</span>
                                <span className="font-mono text-orange-800 break-all">
                                  {autoDetectResult.recipientAddress}
                                </span>
                              </div>
                              <div className="text-orange-600 font-medium">Company Addresses:</div>
                              {Object.entries(autoDetectResult.companyAddresses).map(([network, address]) => {
                                const matches = address.toLowerCase() === autoDetectResult.recipientAddress?.toLowerCase();
                                return (
                                  <div key={network} className={`flex justify-between ${matches ? 'text-green-600' : 'text-orange-500'}`}>
                                    <span>{network}:</span>
                                    <div className="text-right">
                                      <div className="font-mono text-xs break-all">{address}</div>
                                      <div className={`text-xs ${matches ? 'text-green-600' : 'text-orange-500'}`}>
                                        {matches ? '✓ MATCH' : '✗ NO MATCH'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAutoDetectModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      // Auto-fill the form if we have transaction details
                      if (autoDetectResult) {
                        // Auto-fill amount and network
                        if (autoDetectResult.suggestedAmount && !isNaN(autoDetectResult.suggestedAmount)) {
                          setAmount(autoDetectResult.suggestedAmount.toString());
                        }
                        
                        if (autoDetectResult.suggestedNetwork) {
                          const networkMapping = {
                            'BEP20': 'BEP20-USDT',
                            'TRC20': 'TRC20-USDT',
                            'ERC20': 'ERC20-USDT',
                            'POLYGON': 'POL-USDT'
                          };
                          const mappedMethod = networkMapping[autoDetectResult.suggestedNetwork];
                          if (mappedMethod) {
                            setSelectedMethod(mappedMethod);
                          }
                        }
                        
                        setShowAutoDetectModal(false);
                        toast.success(`✅ Form auto-filled with detected transaction details!`);
                      }
                    }}
                    disabled={!autoDetectResult || (autoDetectResult && !autoDetectResult.isRecipientMatching)}
                    className={`${
                      autoDetectResult?.isRecipientMatching 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : autoDetectResult && !autoDetectResult.isRecipientMatching
                        ? 'bg-red-500 hover:bg-red-600 cursor-not-allowed'
                        : 'bg-yellow-500 hover:bg-yellow-600'
                    } text-white`}
                  >
                    {autoDetectResult?.isRecipientMatching 
                      ? 'Use Valid Transaction' 
                      : autoDetectResult && !autoDetectResult.isRecipientMatching
                      ? '❌ Invalid Recipient - Cannot Use'
                      : 'Use Detected Transaction'
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsdtDeposit;
