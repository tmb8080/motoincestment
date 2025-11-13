import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { depositAPI, walletAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Layout from '../components/layout/Layout';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import AutomaticDeposit from '../components/AutomaticDeposit';
import toast from 'react-hot-toast';

const Deposit = () => {
  const queryClient = useQueryClient();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [depositMethod, setDepositMethod] = useState('direct'); // 'direct' or 'coinbase'
  const [showInstructions, setShowInstructions] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState(null);
  const [autoFillStatus, setAutoFillStatus] = useState(null); // 'success', 'warning', 'error', null
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAutomaticDeposit, setShowAutomaticDeposit] = useState(false);


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: '',
      currency: 'USDT',
      network: 'BEP20',
      transactionHash: ''
    }
  });

  const watchedAmount = watch('amount');
  const watchedCurrency = watch('currency');
  const watchedNetwork = watch('network');
  const watchedTransactionHash = watch('transactionHash');

  // Fetch deposit history
  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ['deposits', { limit: 10, page: 1 }],
    queryFn: () => depositAPI.getMyDeposits({ limit: 10, page: 1 }),
  });

  // Fetch company wallet addresses instead of user addresses
  const { data: companyAddresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['companyWalletAddresses'],
    queryFn: () => walletAPI.getCompanyWalletAddresses(),
    enabled: depositMethod === 'direct'
  });

  // Fetch USDT addresses (fallback)
  const { data: usdtAddresses } = useQuery({
    queryKey: ['usdt-addresses'],
    queryFn: depositAPI.getUsdtAddresses,
    enabled: depositMethod === 'direct' && (!companyAddresses?.data || Object.keys(companyAddresses.data).length === 0)
  });

  // Fetch pending deposits count
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-deposits-count'],
    queryFn: depositAPI.getPendingCount,
  });



  // Create USDT deposit mutation
  const createUsdtDepositMutation = useMutation({
    mutationFn: depositAPI.createUsdtDeposit,
    onSuccess: (data) => {
      setPendingDeposit(data.data);
      toast.success('Deposit created successfully! Please send the funds and provide transaction hash.');
      queryClient.invalidateQueries(['deposits']);
      queryClient.invalidateQueries(['pending-deposits-count']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create deposit');
    },
  });

  // Pre-verify transaction mutation
  const preVerifyTransactionMutation = useMutation({
    mutationFn: depositAPI.preVerifyTransaction,
    onSuccess: (data) => {
      const verificationData = data.data;
      
      if (verificationData.networkWarning) {
        // Show warning but allow deposit to proceed
        toast.success(`✅ Transaction verified! ${verificationData.networkWarning}`, {
          duration: 5000
        });
        console.log('Pre-verification successful with network warning:', verificationData);
      } else {
        toast.success('✅ Transaction verified! Recipient and amount match our records.');
        console.log('Pre-verification successful:', verificationData);
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Transaction verification failed';
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails) {
        console.error('Pre-verification failed with details:', errorDetails);
        
        // Show more specific error messages
        if (errorDetails.foundOnNetwork && errorDetails.requestedNetwork) {
          toast.error(`❌ ${errorMessage} (Found on ${errorDetails.foundOnNetwork}, you selected ${errorDetails.requestedNetwork})`);
        } else if (errorDetails.expected && errorDetails.received) {
          toast.error(`❌ ${errorMessage} (Expected: ${errorDetails.expected}, Received: ${errorDetails.received})`);
        } else {
          toast.error(`❌ ${errorMessage}`);
        }
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    },
  });

  // Auto-fill transaction details mutation
  const autoFillTransactionMutation = useMutation({
    mutationFn: (data) => {
      console.log('🚀 Auto-fill mutation called with data:', data);
      return depositAPI.autoFillTransaction(data);
    },
    onSuccess: (data) => {
      console.log('✅ Auto-fill mutation success:', data);
      const transactionData = data.data;
      console.log('Auto-fill transaction data:', transactionData);
      
      // Store transaction details for display
      setTransactionDetails(transactionData);
      
      if (transactionData.found) {
        // Auto-fill the form with transaction details
        if (transactionData.suggestedAmount && !isNaN(transactionData.suggestedAmount)) {
          setValue('amount', transactionData.suggestedAmount.toString());
          setSelectedAmount(transactionData.suggestedAmount);
        }
        
        if (transactionData.suggestedNetwork) {
          setValue('network', transactionData.suggestedNetwork);
        }
        
        // Set auto-fill status
        if (transactionData.isRecipientMatching) {
          setAutoFillStatus('success');
          toast.success(`✅ Transaction verified! Auto-filled: ${transactionData.suggestedAmount} USDT on ${transactionData.suggestedNetwork}`);
        } else {
          setAutoFillStatus('warning');
          toast.warning(`⚠️ Transaction found on ${transactionData.foundOnNetwork}, but recipient doesn't match our address`);
        }
        
        // Show transaction details modal
        setShowTransactionModal(true);
      } else {
        setAutoFillStatus('error');
        setTransactionDetails(null);
        toast.error('❌ Transaction not found on any network');
      }
    },
    onError: (error) => {
      console.log('❌ Auto-fill mutation error:', error);
      setAutoFillStatus('error');
      setTransactionDetails(null);
      const errorMessage = error.response?.data?.message || 'Failed to get transaction details';
      toast.error(`❌ ${errorMessage}`);
    },
  });

  // Function to trigger auto-fill
  const triggerAutoFill = (hash) => {
    console.log('🔍 triggerAutoFill called with hash:', hash);
    if (hash && /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(hash)) {
      console.log('✅ Hash is valid, triggering auto-fill mutation');
      autoFillTransactionMutation.mutate({ transactionHash: hash });
    } else {
      console.log('❌ Hash is invalid or empty:', hash);
    }
  };

  // Handle modal confirmation
  const handleModalConfirm = (transactionData) => {
    // Create deposit with the transaction data
    createUsdtDepositMutation.mutate({
      amount: parseFloat(transactionData.suggestedAmount),
      network: transactionData.suggestedNetwork,
      transactionHash: watchedTransactionHash
    });
    setShowTransactionModal(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowTransactionModal(false);
    setTransactionDetails(null);
    setAutoFillStatus(null);
  };

  // Handle automatic deposit transaction verification
  const handleTransactionVerified = (transactionData) => {
    console.log('✅ Transaction verified in automatic deposit:', transactionData);
    
    // Auto-fill the form with transaction details
    if (transactionData.amount) {
      setValue('amount', transactionData.amount.toString());
      setSelectedAmount(transactionData.amount);
    }
    
    if (transactionData.network) {
      setValue('network', transactionData.network);
    }
    
    if (transactionData.transactionHash) {
      setValue('transactionHash', transactionData.transactionHash);
    }
    
    // Set auto-fill status
    if (transactionData.isRecipientMatching) {
      setAutoFillStatus('success');
      toast.success(`✅ Transaction detected! Auto-filled: ${transactionData.amount} USDT on ${transactionData.network}`);
    } else {
      setAutoFillStatus('warning');
      toast.warning(`⚠️ Transaction found but recipient doesn't match our address`);
    }
    
    // Store transaction details for display
    setTransactionDetails(transactionData);
    
    // Close automatic deposit modal
    setShowAutomaticDeposit(false);
  };

  // Handle automatic deposit transaction error
  const handleTransactionError = (errorMessage) => {
    console.log('❌ Transaction error in automatic deposit:', errorMessage);
    setAutoFillStatus('error');
    setTransactionDetails(null);
  };

  // Update transaction hash mutation
  const updateTransactionHashMutation = useMutation({
    mutationFn: ({ depositId, transactionHash }) => 
      depositAPI.updateTransactionHash(depositId, transactionHash),
    onSuccess: (data) => {
      toast.success('Transaction hash updated successfully!');
      queryClient.invalidateQueries(['deposits']);
      setPendingDeposit(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update transaction hash');
    },
  });

  // Verify deposit mutation
  const verifyDepositMutation = useMutation({
    mutationFn: (depositId) => depositAPI.verifyDeposit(depositId),
    onSuccess: (data) => {
      toast.success('Deposit verified successfully!');
      queryClient.invalidateQueries(['deposits']);
      setPendingDeposit(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to verify deposit');
    },
  });

  // Create Coinbase deposit mutation
  const createCoinbaseDepositMutation = useMutation({
    mutationFn: depositAPI.createDeposit,
    onSuccess: (data) => {
      if (data.data.coinbaseUrl) {
        window.location.href = data.data.coinbaseUrl;
      }
      queryClient.invalidateQueries(['deposits']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create deposit');
    },
  });

  const predefinedAmounts = [
    { amount: 10, currency: 'USDT', usd: 10 },
    { amount: 25, currency: 'USDT', usd: 25 },
    { amount: 50, currency: 'USDT', usd: 50 },
    { amount: 100, currency: 'USDT', usd: 100 },
    { amount: 250, currency: 'USDT', usd: 250 },
    { amount: 500, currency: 'USDT', usd: 500 },
  ];

  // Dynamic networks based on user addresses
  const networks = React.useMemo(() => {
    if (companyAddresses?.data && Object.keys(companyAddresses.data).length > 0) {
      // Use company wallet addresses
      return Object.entries(companyAddresses.data).map(([network, addr]) => {
        const networkConfig = {
          'BSC': { name: 'BSC (BEP20)', description: 'Binance Smart Chain', fee: '~$0.5' },
          'POLYGON': { name: 'Polygon', description: 'Polygon Network', fee: '~$0.01' },
        };
        
        const config = networkConfig[network] || { 
          name: network, 
          description: `${network} Network`, 
          fee: '~$1' 
        };
        
        return {
          code: network,
          name: config.name,
          description: config.description,
          fee: config.fee,
          address: addr,
          isUserAddress: false
        };
      });
    } else {
      // Fallback to default networks (TRON and Ethereum removed)
      return [
        { code: 'BEP20', name: 'BSC (BEP20)', description: 'Binance Smart Chain', fee: '~$0.5' },
        { code: 'POLYGON', name: 'Polygon', description: 'Polygon Network', fee: '~$0.01' },
      ];
    }
  }, [companyAddresses]);

  const currencies = [
    { code: 'USDT', name: 'Tether USD', icon: '₮', method: 'direct' },
    { code: 'BTC', name: 'Bitcoin', icon: '₿', method: 'coinbase' },
  ];

  const onSubmit = async (data) => {
    if (!data.amount || parseFloat(data.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (depositMethod === 'direct') {
      // USDT Direct Deposit - Check if transaction hash is provided
      if (!data.transactionHash || data.transactionHash.trim() === '') {
        toast.error('Please provide the transaction hash for USDT deposits');
        return;
      }

      // Pre-verify the transaction before creating deposit
      try {
        const verificationResult = await preVerifyTransactionMutation.mutateAsync({
          transactionHash: data.transactionHash.trim(),
          network: data.network,
          amount: parseFloat(data.amount)
        });

        // If pre-verification passes, create the deposit
        // Use the network where the transaction was actually found
        const actualNetwork = verificationResult.data.foundOnNetwork;
        const networkMapping = {
          'BSC': 'BEP20',
          'POLYGON': 'POLYGON'
        };
        
        const depositNetwork = networkMapping[actualNetwork] || data.network;
        
        createUsdtDepositMutation.mutate({
          amount: parseFloat(data.amount),
          network: depositNetwork,
          transactionHash: data.transactionHash.trim()
        });
      } catch (error) {
        // Pre-verification failed, don't create deposit
        console.error('Pre-verification failed:', error);
        return;
      }
    } else {
      // Coinbase Commerce Deposit
      createCoinbaseDepositMutation.mutate({
        amount: parseFloat(data.amount),
        currency: data.currency,
      });
    }
  };

  const handlePredefinedAmount = (amount, currency) => {
    setSelectedAmount(amount);
    setSelectedCurrency(currency);
    setValue('amount', amount.toString());
    setValue('currency', currency);
  };

  const handleNetworkChange = (network) => {
    setValue('network', network);
  };

  const handleCurrencyChange = (currency) => {
    const currencyData = currencies.find(c => c.code === currency);
    setSelectedCurrency(currency);
    setValue('currency', currency);
    setDepositMethod(currencyData.method);
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'BTC') {
      return `₿${amount.toFixed(8)}`;
    } else if (currency === 'ETH') {
      return `Ξ${amount.toFixed(6)}`;
    } else if (currency === 'USDT') {
      return `₮${amount.toFixed(2)}`;
    }
    return `${amount} ${currency}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      CONFIRMED: { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      FAILED: { color: 'bg-red-100 text-red-800', text: 'Failed' },
      EXPIRED: { color: 'bg-gray-100 text-gray-800', text: 'Expired' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getWalletAddress = (network) => {
    // First try to get from user addresses
    if (companyAddresses?.data && Object.keys(companyAddresses.data).length > 0) {
      const userAddress = companyAddresses.data[network];
      if (userAddress) {
        return userAddress;
      }
    }
    
    // Fallback to old addresses
    if (usdtAddresses?.data) {
      return usdtAddresses.data[network] || 'Not available';
    }
    
    return 'Loading...';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-binance-dark min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Make a Deposit</h1>
          <p className="text-gray-600 mt-1">
            Fund your wallet with cryptocurrency to start earning
          </p>
        </div>

        {/* Manual Deposit Notice */}
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Manual Deposit Required
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Automatic detection is disabled. After sending USDT to your wallet address, you must manually submit your transaction hash for verification.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Deposit Alert */}
        {pendingDeposit && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Pending Deposit: {formatCurrency(pendingDeposit.amount, pendingDeposit.currency)}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Please send {formatCurrency(pendingDeposit.amount, pendingDeposit.currency)} to the address below and provide the transaction hash.
                </p>
                
                {/* Wallet Address */}
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600 mb-1">Send to this address:</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                      {getWalletAddress(pendingDeposit.network)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(getWalletAddress(pendingDeposit.network));
                        toast.success('Address copied to clipboard!');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Manual Deposit Notice */}
                <div className="mt-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          Manual Deposit Required
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Automatic detection is disabled. You must manually submit your transaction hash after sending funds.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingDeposit(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deposit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Funds</CardTitle>
                <CardDescription>
                  Choose your preferred deposit method and currency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Currency Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Select Currency & Method
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {currencies.map((currency) => (
                        <button
                          key={currency.code}
                          type="button"
                          onClick={() => handleCurrencyChange(currency.code)}
                          className={`p-4 border rounded-lg text-center transition-colors ${
                            watchedCurrency === currency.code
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="text-2xl mb-1">{currency.icon}</div>
                          <div className="font-medium">{currency.code}</div>
                          <div className="text-xs text-gray-500">{currency.name}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            {currency.method === 'direct' ? 'Direct Transfer' : 'Coinbase'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Network Selection for USDT */}
                  {depositMethod === 'direct' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Select Network
                      </label>
                      
                      {/* Loading State */}
                      {addressesLoading && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                            <p className="text-sm text-gray-600">Loading your wallet addresses...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* User Addresses Status */}
                      {!addressesLoading && companyAddresses?.data && Object.keys(companyAddresses.data).length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-green-800">✓ Personal Wallet Addresses Active</p>
                              <p className="text-xs text-green-700 mt-1">Using your unique deposit addresses for secure transactions</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback Addresses Status */}
                      {!addressesLoading && (!companyAddresses?.data || Object.keys(companyAddresses.data).length === 0) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-yellow-800">⚠️ Using Company Wallet Addresses</p>
                              <p className="text-xs text-yellow-700 mt-1">Personal addresses not available, using shared company addresses</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        {networks.map((network) => (
                          <button
                            key={network.code}
                            type="button"
                            onClick={() => handleNetworkChange(network.code)}
                            className={`p-3 border rounded-lg text-left transition-colors ${
                              watchedNetwork === network.code
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-gray-500">{network.description}</div>
                            <div className="text-xs text-green-600">Fee: {network.fee}</div>
                            {network.isUserAddress && (
                              <div className="text-xs text-blue-600 mt-1">✓ Your Address</div>
                            )}
                            {network.address && (
                              <div className="text-xs text-gray-500 mt-1 font-mono break-all">
                                {network.address.substring(0, 8)}...{network.address.substring(network.address.length - 6)}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Predefined Amounts */}
                  {watchedCurrency === 'USDT' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Quick Select (USDT)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {predefinedAmounts.map((preset) => (
                          <button
                            key={`${preset.amount}-${preset.currency}`}
                            type="button"
                            onClick={() => handlePredefinedAmount(preset.amount, preset.currency)}
                            className={`p-3 border rounded-lg text-center transition-colors ${
                              selectedAmount === preset.amount && selectedCurrency === preset.currency
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">₮{preset.amount}</div>
                            <div className="text-xs text-gray-500">≈ ${preset.usd}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Amount */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Or Enter Custom Amount
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0.000001"
                        placeholder={`Enter amount in ${watchedCurrency}`}
                        error={errors.amount?.message}
                        {...register('amount', {
                          required: 'Amount is required',
                          min: {
                            value: 0.000001,
                            message: 'Amount must be greater than 0'
                          }
                        })}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">
                          {currencies.find(c => c.code === watchedCurrency)?.icon}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Hash Input for USDT Deposits */}
                  {depositMethod === 'direct' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Transaction Hash
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Paste transaction hash to auto-fill details"
                          error={errors.transactionHash?.message}
                          {...register('transactionHash', {
                            required: 'Transaction hash is required for USDT deposits',
                            pattern: {
                              value: /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/,
                              message: 'Please enter a valid transaction hash'
                            }
                          })}
                          onChange={(e) => {
                            const hash = e.target.value.trim();
                            console.log('🔄 onChange triggered with value:', hash);
                            // Auto-trigger when a valid hash is entered
                            if (hash && /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(hash)) {
                              console.log('✅ Valid hash detected, calling triggerAutoFill');
                              // Trigger immediately
                              triggerAutoFill(hash);
                            } else {
                              console.log('❌ Invalid hash or empty value');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (watchedTransactionHash) {
                              autoFillTransactionMutation.mutate({
                                transactionHash: watchedTransactionHash
                              });
                            } else {
                              toast.error('Please enter a transaction hash first');
                            }
                          }}
                          loading={autoFillTransactionMutation.isPending}
                          disabled={!watchedTransactionHash}
                          className="whitespace-nowrap"
                        >
                          {autoFillTransactionMutation.isPending ? 'Auto-filling...' : 'Auto-fill'}
                        </Button>
                        
                        {/* Enhanced Automatic Detection Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAutomaticDeposit(true)}
                          className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 border-0 shadow-lg"
                        >
                          🔍 Enhanced Detection
                        </Button>
                        
                        {/* Debug Test Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            console.log('🧪 Debug: Testing with sample hash');
                            triggerAutoFill('0x8822b1236f31c75f501fb6ee34b4278de6163fd4e734604883e49784bcb9802b');
                          }}
                          className="whitespace-nowrap bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        >
                          🧪 Test
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        🔍 Paste transaction hash to automatically fill network and amount
                      </p>
                      
                      {/* Auto-fill Status Indicator */}
                      {autoFillStatus && (
                        <div className={`mt-2 p-2 rounded-lg text-xs ${
                          autoFillStatus === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : autoFillStatus === 'warning'
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                          {autoFillStatus === 'success' && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Transaction verified and form auto-filled
                            </div>
                          )}
                          {autoFillStatus === 'warning' && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Transaction found but recipient doesn't match our address
                            </div>
                          )}
                          {autoFillStatus === 'error' && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Transaction not found or error occurred
                            </div>
                          )}
                        </div>
                      )}

                      {/* Loading Indicator */}
                      {autoFillTransactionMutation.isPending && (
                        <div className="mt-2 p-2 rounded-lg text-xs bg-blue-50 border border-blue-200 text-blue-800">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            🔍 Searching transaction across all networks...
                          </div>
                        </div>
                      )}

                      {/* Transaction Details Display */}
                      {transactionDetails && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-blue-900 mb-3">📊 Transaction Details</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-blue-700">Network:</span>
                              <span className="ml-2 font-medium text-blue-900">{transactionDetails.foundOnNetwork}</span>
                            </div>
                            <div>
                              <span className="text-blue-700">Amount:</span>
                              <span className="ml-2 font-medium text-blue-900">{transactionDetails.suggestedAmount} USDT</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-blue-700">Recipient:</span>
                              <div className="mt-1 font-mono text-xs break-all bg-white p-2 rounded border">
                                {transactionDetails.recipientAddress}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-blue-700">Sender:</span>
                              <div className="mt-1 font-mono text-xs break-all bg-white p-2 rounded border">
                                {transactionDetails.senderAddress}
                              </div>
                            </div>
                            <div>
                              <span className="text-blue-700">Block:</span>
                              <span className="ml-2 font-medium text-blue-900">{transactionDetails.blockNumber}</span>
                            </div>
                            <div>
                              <span className="text-blue-700">Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                transactionDetails.isRecipientMatching 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transactionDetails.isRecipientMatching ? '✓ Valid' : '✗ Invalid'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Debug Section - Remove in production */}
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
                        <h4 className="font-medium mb-2">🔧 Debug Info:</h4>
                        <div className="space-y-1">
                          <div>Transaction Hash: {watchedTransactionHash || 'None'}</div>
                          <div>Hash Length: {watchedTransactionHash?.length || 0}</div>
                          <div>Is Valid Hash: {watchedTransactionHash && /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(watchedTransactionHash) ? 'Yes' : 'No'}</div>
                          <div>Auto-fill Status: {autoFillStatus || 'None'}</div>
                          <div>Mutation Loading: {autoFillTransactionMutation.isPending ? 'Yes' : 'No'}</div>
                          <div>Transaction Data: {transactionDetails ? 'Loaded' : 'None'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deposit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    loading={createUsdtDepositMutation.isPending || createCoinbaseDepositMutation.isPending || preVerifyTransactionMutation.isPending}
                    disabled={createUsdtDepositMutation.isPending || createCoinbaseDepositMutation.isPending || preVerifyTransactionMutation.isPending || !watchedAmount}
                  >
                    {preVerifyTransactionMutation.isPending
                      ? '🔍 Verifying Transaction...'
                      : createUsdtDepositMutation.isPending || createCoinbaseDepositMutation.isPending
                      ? 'Creating Deposit...' 
                      : depositMethod === 'direct'
                      ? `Create Deposit ${watchedAmount ? formatCurrency(parseFloat(watchedAmount), watchedCurrency) : ''}`
                      : `Deposit ${watchedAmount ? formatCurrency(parseFloat(watchedAmount), watchedCurrency) : ''}`
                    }
                  </Button>

                  {/* Manual Deposit Button */}
                  {depositMethod === 'direct' && (
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-600 mb-2">Already sent USDT?</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Navigate to manual deposit or show manual deposit form
                          toast.info('Please use the USDT Deposit button from the main menu to access manual deposits');
                        }}
                      >
                        Submit Transaction Hash
                      </Button>
                    </div>
                  )}
                </form>

                {/* Security Notice */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">
                        Secure Payments
                      </h3>
                      <p className="text-xs text-blue-700 mt-1">
                        {depositMethod === 'direct' 
                          ? 'Direct USDT transfers require manual verification. Submit your transaction hash after sending funds to get credited.'
                          : 'All deposits are processed securely through Coinbase Commerce. Your funds will be credited to your wallet once the transaction is confirmed on the blockchain.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deposit Info & History */}
          <div className="space-y-6">
            {/* How it Works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How Deposits Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {depositMethod === 'direct' ? (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Create Deposit</p>
                        <p className="text-xs text-gray-500">Select amount and network, get wallet address</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Send USDT</p>
                        <p className="text-xs text-gray-500">Transfer USDT to the provided address</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Manual Verification</p>
                        <p className="text-xs text-gray-500">Submit your transaction hash to verify and credit your deposit</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Choose Amount</p>
                        <p className="text-xs text-gray-500">Select or enter the amount you want to deposit</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Secure Payment</p>
                        <p className="text-xs text-gray-500">Complete payment through Coinbase Commerce</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Start Earning</p>
                        <p className="text-xs text-gray-500">Your balance grows daily with our profit-sharing system</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Instructions Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deposit Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full"
                >
                  {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
                </Button>
                
                {showInstructions && (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                      <ul className="text-yellow-700 space-y-1 text-xs">
                        <li>• Minimum USDT deposit: 30 USDT</li>
                        <li>• Always double-check the wallet address</li>
                        <li>• Use the correct network (BEP20, POLYGON, etc.)</li>
                        <li>• Manual verification required - submit transaction hash after sending</li>
                        <li>• Automatic detection is disabled</li>
                        {companyAddresses?.data && Object.keys(companyAddresses.data).length > 0 && (
                          <li>• ✓ Using your personal wallet addresses</li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-medium text-blue-800 mb-2">Network Fees:</h4>
                      <ul className="text-blue-700 space-y-1 text-xs">
                        <li>• BEP20 (BSC): ~$0.5 - Recommended</li>
                        <li>• Polygon: ~$0.01 - Very cheap</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Deposits Count */}
            {pendingCount?.data?.pendingCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {pendingCount.data.pendingCount}
                    </div>
                    <p className="text-sm text-gray-600">deposits awaiting verification</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Deposits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                {depositsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : deposits?.data?.deposits?.length > 0 ? (
                  <div className="space-y-4">
                    {deposits.data.deposits.slice(0, 5).map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(deposit.amount, deposit.currency)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(deposit.createdAt)}
                            {deposit.network && ` • ${deposit.network}`}
                          </p>
                        </div>
                        <div>
                          {getStatusBadge(deposit.status)}
                        </div>
                      </div>
                    ))}
                    
                    {deposits.data.deposits.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm">
                          View All Deposits
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <p className="text-gray-500 text-sm">No deposits yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Make your first deposit to start earning
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showTransactionModal}
        onClose={handleModalClose}
        transactionData={transactionDetails}
        onConfirm={handleModalConfirm}
      />

      {/* Automatic Deposit Modal */}
      {showAutomaticDeposit && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAutomaticDeposit(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-4 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Enhanced Transaction Detection</h3>
                    <p className="text-sm text-gray-600">Paste any transaction hash to automatically detect details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAutomaticDeposit(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <AutomaticDeposit
                onTransactionVerified={handleTransactionVerified}
                onTransactionError={handleTransactionError}
              />
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAutomaticDeposit(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      // Auto-fill the form if we have transaction details
                      if (transactionDetails) {
                        handleTransactionVerified(transactionDetails);
                      }
                      setShowAutomaticDeposit(false);
                    }}
                    disabled={!transactionDetails || autoFillTransactionMutation.isPending}
                    loading={autoFillTransactionMutation.isPending}
                  >
                    {autoFillTransactionMutation.isPending ? 'Processing...' : 'Use Detected Transaction'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Deposit;
