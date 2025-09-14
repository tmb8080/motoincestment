import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, walletAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import WithdrawalHistory from '../components/WithdrawalHistory';
import AdminWithdrawalHistory from '../components/AdminWithdrawalHistory';
import AdminUserManagement from '../components/AdminUserManagement';
import MobileBottomNav from '../components/MobileBottomNav';
import DesktopNav from '../components/layout/DesktopNav';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);
  const [editWithdrawalData, setEditWithdrawalData] = useState({
    amount: '',
    walletAddress: '',
    adminNotes: '',
    currency: '',
    network: ''
  });
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [depositAdminNotes, setDepositAdminNotes] = useState('');
  const [depositTransactionHash, setDepositTransactionHash] = useState('');
  const [showTransactionChecker, setShowTransactionChecker] = useState(false);
  const [transactionHashChecker, setTransactionHashChecker] = useState('');
  const [showTransactionResults, setShowTransactionResults] = useState(false);
  const [transactionResults, setTransactionResults] = useState(null);
  const [isCheckingNetworks, setIsCheckingNetworks] = useState(false);
  const [companyAddresses, setCompanyAddresses] = useState(null);

  // Handle URL parameters for tab switching
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['dashboard', 'deposits', 'withdrawals', 'withdrawal-history', 'users', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (location.pathname === '/admin' && !location.search) {
      // If we're on /admin without any search params, set to dashboard
      setActiveTab('dashboard');
    }
  }, [location.search, location.pathname]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      navigate('/admin');
    } else {
      navigate(`/admin?tab=${tabId}`);
    }
  };

  // Fetch admin data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await adminAPI.getStats();
      console.log('Stats response:', response);
      return response.data.data; // Return the nested data from the API response
    },
    enabled: !!user?.isAdmin, // Only run if user is admin
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['pendingWithdrawals'],
    queryFn: async () => {
      const response = await adminAPI.getPendingWithdrawals();
      console.log('Pending withdrawals response:', response);
      return response.data; // Return the full response data
    },
    enabled: !!user?.isAdmin, // Only run if user is admin
    refetchInterval: 15000, // Auto-refresh every 15 seconds for withdrawals
    refetchIntervalInBackground: true,
  });



  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await adminAPI.getSettings();
      console.log('Settings response:', response);
      return response.data.data || response.data; // Handle both nested and direct responses
    },
    enabled: !!user?.isAdmin, // Only run if user is admin
  });

  // Fetch company wallet addresses
  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ['companyAddresses'],
    queryFn: async () => {
      const response = await walletAPI.getCompanyWalletAddresses();
      console.log('Company addresses response:', response);
      return response.data.data || response.data;
    },
    enabled: !!user?.isAdmin,
    onSuccess: (data) => {
      setCompanyAddresses(data);
    },
  });

  // Fetch deposits data
  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ['adminDeposits'],
    queryFn: async () => {
      const response = await adminAPI.getDeposits({ page: 1, limit: 50 });
      console.log('Deposits response:', response);
      return response.data.data; // Return the nested data from the API response
    },
    enabled: !!user?.isAdmin, // Only run if user is admin
    refetchInterval: 10000, // Auto-refresh every 10 seconds for deposits
    refetchIntervalInBackground: true,
  });

  const { data: pendingDeposits, isLoading: pendingDepositsLoading } = useQuery({
    queryKey: ['pendingDeposits'],
    queryFn: async () => {
      const response = await adminAPI.getPendingDeposits();
      console.log('Pending deposits response:', response);
      return response.data.data; // Return the nested data from the API response
    },
    enabled: !!user?.isAdmin, // Only run if user is admin
    refetchInterval: 5000, // Auto-refresh every 5 seconds for pending deposits
    refetchIntervalInBackground: true,
  });

  // Mutations
  const processWithdrawalMutation = useMutation({
    mutationFn: ({ id, action, adminNotes, transactionHash }) => 
      adminAPI.processWithdrawal(id, action, { adminNotes, transactionHash }),
    onSuccess: () => {
      toast.success('Withdrawal processed successfully!');
      queryClient.invalidateQueries(['pendingWithdrawals']);
      setSelectedWithdrawal(null);
      setAdminNotes('');
      setTransactionHash('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateWithdrawal(id, data),
    onSuccess: () => {
      toast.success('Withdrawal updated successfully!');
      queryClient.invalidateQueries(['pendingWithdrawals']);
      setIsEditingWithdrawal(false);
      setEditWithdrawalData({
        amount: '',
        walletAddress: '',
        adminNotes: '',
        currency: '',
        network: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update withdrawal');
    },
  });



  const updateSettingsMutation = useMutation({
    mutationFn: (settings) => adminAPI.updateSettings(settings),
    onSuccess: () => {
      toast.success('Settings updated successfully!');
      queryClient.invalidateQueries(['adminSettings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  // Process deposit mutation
  const processDepositMutation = useMutation({
    mutationFn: ({ depositId, action, data }) => adminAPI.processDeposit(depositId, action, data),
    onSuccess: (response) => {
      toast.success(`Deposit ${response.data.action} successfully!`);
      queryClient.invalidateQueries(['adminDeposits']);
      setSelectedDeposit(null);
      setDepositAdminNotes('');
      setDepositTransactionHash('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to process deposit');
    },
  });

  // Verify transaction mutation
  const verifyTransactionMutation = useMutation({
    mutationFn: (data) => adminAPI.verifyTransaction(data),
    onSuccess: (response) => {
      const result = response.data.data;
      if (result.isValid) {
        toast.success('✅ Transaction verified successfully!');
      } else {
        toast.error(`❌ Transaction verification failed: ${result.error}`);
      }
      console.log('Verification result:', result);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to verify transaction');
    },
  });

  // Check transaction on blockchain mutation
  const checkBlockchainMutation = useMutation({
    mutationFn: (data) => adminAPI.checkTransactionBlockchain(data),
    onSuccess: (response) => {
      const result = response.data.data;
      if (result.exists) {
        toast.success('✅ Transaction found on blockchain!');
        console.log('Blockchain transaction info:', result.details);
      } else {
        toast.error(`❌ Transaction not found on blockchain: ${result.error}`);
      }
      console.log('Blockchain check result:', result);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to check transaction on blockchain');
    },
  });

  // Check transaction across all networks mutation
  const checkAllNetworksMutation = useMutation({
    mutationFn: (data) => adminAPI.checkTransactionAllNetworks(data),
    onSuccess: (response) => {
      const result = response.data.data;
      setTransactionResults(result);
      setShowTransactionResults(true);
      setIsCheckingNetworks(false);
      
      if (result.found) {
        toast.success(`✅ Transaction found on ${result.foundOnNetwork}!`);
        console.log('Cross-network check result:', result);
        
        // Check if we can auto-confirm this transaction
        if (result.depositId && canAutoConfirm(result, result.deposit)) {
          toast.success('🎯 Auto-confirmation available! Recipient and amount match.');
        }
      } else {
        toast.error('❌ Transaction not found on any network');
        console.log('Cross-network check result:', result);
      }
    },
    onError: (error) => {
      setIsCheckingNetworks(false);
      toast.error(error.response?.data?.message || 'Failed to check transaction across networks');
    },
  });

  // Redirect if not admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-binance-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You don't have admin privileges.</p>
          <Button onClick={() => logout()}>Logout</Button>
        </div>
      </div>
    );
  }

  const handleProcessWithdrawal = (action) => {
    if (!selectedWithdrawal) return;

    processWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      action: action.toUpperCase(),
      adminNotes: adminNotes || null,
      transactionHash: transactionHash || null
    });
  };

  const handleEditWithdrawal = () => {
    if (!selectedWithdrawal) return;
    
    // Populate edit form with current withdrawal data
    setEditWithdrawalData({
      amount: selectedWithdrawal.amount || '',
      walletAddress: selectedWithdrawal.walletAddress || '',
      adminNotes: selectedWithdrawal.adminNotes || '',
      currency: selectedWithdrawal.currency || '',
      network: selectedWithdrawal.network || ''
    });
    setIsEditingWithdrawal(true);
  };

  const handleUpdateWithdrawal = () => {
    if (!selectedWithdrawal) return;
    
    // Filter out empty values
    const updateData = Object.fromEntries(
      Object.entries(editWithdrawalData).filter(([_, value]) => value !== '')
    );
    
    if (Object.keys(updateData).length === 0) {
      toast.error('Please provide at least one field to update');
      return;
    }
    
    updateWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      data: updateData
    });
  };

  const handleCancelEdit = () => {
    setIsEditingWithdrawal(false);
    setEditWithdrawalData({
      amount: '',
      walletAddress: '',
      adminNotes: '',
      currency: '',
      network: ''
    });
  };

  const handleProcessDeposit = (action) => {
    if (!selectedDeposit) return;

    const data = {
      adminNotes: depositAdminNotes,
      transactionHash: depositTransactionHash
    };

    processDepositMutation.mutate({
      depositId: selectedDeposit.id,
      action,
      data
    });
  };

  const handleVerifyTransaction = (deposit) => {
    // Get the expected wallet address for the network
    const getWalletAddressForNetwork = (network) => {
      const addresses = {
        'BEP20': '0xF7c518394f7ceA4c98060ba166Fbd21928A206a0',
        'TRC20': 'TMWN4rYSzCHmhPe6xhhGhB5pcbHHMFUXth',
        'POLYGON': '0xF7c518394f7ceA4c98060ba166Fbd21928A206a0',
        'ERC20': '0xF7c518394f7ceA4c98060ba166Fbd21928A206a0'
      };
      return addresses[network] || addresses['BEP20'];
    };

    const verificationData = {
      transactionHash: deposit.transactionHash,
      network: deposit.network, // Use the network directly from deposit
      amount: deposit.amount,
      walletAddress: getWalletAddressForNetwork(deposit.network)
    };

    console.log('🔍 Verifying transaction:', verificationData);
    verifyTransactionMutation.mutate(verificationData);
  };

  const handleCheckBlockchain = (deposit) => {
    const blockchainData = {
      transactionHash: deposit.transactionHash,
      network: deposit.network
    };

    console.log('🔍 Checking transaction on blockchain:', blockchainData);
    checkBlockchainMutation.mutate(blockchainData);
  };

  const handleCheckAllNetworks = (deposit) => {
    const allNetworksData = {
      transactionHash: deposit.transactionHash,
      depositId: deposit.id,
      deposit: deposit // Pass full deposit object for auto-confirmation
    };
    console.log('🔍 Checking transaction across all networks:', allNetworksData);
    setIsCheckingNetworks(true);
    checkAllNetworksMutation.mutate(allNetworksData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper functions for transaction verification UI
  const getNetworkIcon = (network) => {
    const icons = {
      'BSC': '🟡',
      'Ethereum': '🔵',
      'Polygon': '🟣',
      'TRON': '🔴',
      'BEP20': '🟡',
      'ERC20': '🔵',
      'POLYGON': '🟣',
      'TRC20': '🔴'
    };
    return icons[network] || '🌐';
  };

  const getNetworkColor = (network) => {
    const colors = {
      'BSC': 'text-yellow-400',
      'Ethereum': 'text-blue-400',
      'Polygon': 'text-purple-400',
      'TRON': 'text-red-400',
      'BEP20': 'text-yellow-400',
      'ERC20': 'text-blue-400',
      'POLYGON': 'text-purple-400',
      'TRC20': 'text-red-400'
    };
    return colors[network] || 'text-gray-400';
  };

  const formatAmount = (amount, isTokenTransfer = false) => {
    if (!amount) return '0.000000';
    if (isTokenTransfer) {
      return parseFloat(amount).toFixed(6);
    }
    return parseFloat(amount).toFixed(6);
  };

  const formatBlockNumber = (blockNumber) => {
    if (!blockNumber) return 'N/A';
    if (typeof blockNumber === 'string' && blockNumber.startsWith('0x')) {
      return parseInt(blockNumber, 16).toLocaleString();
    }
    return blockNumber.toLocaleString();
  };

  // Helper functions for automatic confirmation
  const isRecipientMatching = (recipientAddress, network) => {
    if (!companyAddresses || !recipientAddress) return false;
    
    const networkMap = {
      'BSC': 'BSC',
      'BEP20': 'BSC',
      'Ethereum': 'ETHEREUM',
      'ERC20': 'ETHEREUM',
      'Polygon': 'POLYGON',
      'POLYGON': 'POLYGON',
      'TRON': 'TRON',
      'TRC20': 'TRON'
    };
    
    const mappedNetwork = networkMap[network];
    if (!mappedNetwork) return false;
    
    const expectedAddress = companyAddresses[mappedNetwork];
    return expectedAddress && recipientAddress.toLowerCase() === expectedAddress.toLowerCase();
  };

  const isAmountMatching = (transactionAmount, expectedAmount) => {
    if (!transactionAmount || !expectedAmount) return false;
    
    const txAmount = parseFloat(transactionAmount);
    const expAmount = parseFloat(expectedAmount);
    
    // Allow for small differences due to decimals
    const difference = Math.abs(txAmount - expAmount);
    return difference < 0.01; // Allow 0.01 difference
  };

  const canAutoConfirm = (transactionResult, deposit) => {
    if (!transactionResult || !transactionResult.found || !deposit) return false;
    
    const foundResult = transactionResult.results.find(r => r.found);
    if (!foundResult || !foundResult.details) return false;
    
    const recipientMatches = isRecipientMatching(foundResult.details.recipientAddress, foundResult.network);
    const amountMatches = isAmountMatching(foundResult.details.amount, deposit.amount);
    
    return recipientMatches && amountMatches;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'withdrawals', label: 'Pending Withdrawals', icon: '💰' },
    { id: 'withdrawal-history', label: 'Withdrawal History', icon: '📋' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-binance-dark pb-20 md:pb-0 md:pt-16">
      {/* Desktop Navigation */}
      <DesktopNav />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-300">Manage users, deposits, withdrawals, and system settings</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => setShowTransactionChecker(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              🔍 Check Transaction
            </Button>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">System Overview</h2>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries(['adminStats']);
                  queryClient.invalidateQueries(['pendingWithdrawals']);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                🔄 Refresh Data
              </Button>
            </div>
            
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white/10 rounded-lg p-6">
                      <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-white/20 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
                         ) : (
               <div className="space-y-6">
                 {/* Main Stats Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">Total Users</div>
                     <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                     <div className="text-xs text-gray-400 mt-1">
                       {stats?.activeUsers || 0} active • {stats?.todayUsers || 0} today
                     </div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">Total Deposits</div>
                     <div className="text-2xl font-bold text-white">{formatCurrency(stats?.totalDeposits || 0)}</div>
                     <div className="text-xs text-gray-400 mt-1">
                       {stats?.depositCount || 0} transactions • {formatCurrency(stats?.todayDeposits || 0)} today
                     </div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">Pending Withdrawals</div>
                     <div className="text-2xl font-bold text-yellow-400">{formatCurrency(stats?.pendingWithdrawals || 0)}</div>
                     <div className="text-xs text-gray-400 mt-1">
                       {stats?.pendingWithdrawalCount || 0} requests
                     </div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">System Balance</div>
                     <div className="text-2xl font-bold text-green-400">{formatCurrency(stats?.systemBalance || 0)}</div>
                     <div className="text-xs text-gray-400 mt-1">
                       Net position
                     </div>
                   </div>
                 </div>

                 {/* Detailed Stats Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">VIP Users</div>
                     <div className="text-xl font-bold text-purple-400">{stats?.vipUsers || 0}</div>
                     <div className="text-xs text-gray-400 mt-1">Active VIP members</div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">VIP Task Earnings</div>
                     <div className="text-xl font-bold text-blue-400">{formatCurrency(stats?.totalEarnings || 0)}</div>
                     <div className="text-xs text-gray-400 mt-1">From VIP tasks only</div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm">Referral Bonuses</div>
                     <div className="text-xl font-bold text-emerald-400">{formatCurrency(stats?.totalReferralBonus || 0)}</div>
                     <div className="text-xs text-gray-400 mt-1">Total paid</div>
                   </div>
                 </div>

                 {/* Transaction Summary */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm mb-4">Deposit Summary</div>
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Confirmed:</span>
                         <span className="text-white font-medium">{formatCurrency(stats?.confirmedDeposits || 0)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Pending:</span>
                         <span className="text-yellow-400 font-medium">{formatCurrency(stats?.pendingDeposits || 0)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Today:</span>
                         <span className="text-green-400 font-medium">{formatCurrency(stats?.todayDeposits || 0)}</span>
                       </div>
                     </div>
                   </div>
                   <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                     <div className="text-gray-300 text-sm mb-4">Withdrawal Summary</div>
                     <div className="space-y-2">
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Completed:</span>
                         <span className="text-white font-medium">{formatCurrency(stats?.completedWithdrawals || 0)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Pending:</span>
                         <span className="text-yellow-400 font-medium">{formatCurrency(stats?.pendingWithdrawals || 0)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-400 text-sm">Today:</span>
                         <span className="text-red-400 font-medium">{formatCurrency(stats?.todayWithdrawals || 0)}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Pending Withdrawals</h2>
            
            {withdrawalsLoading ? (
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
                         ) : !pendingWithdrawals?.data || pendingWithdrawals.data.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-400">No pending withdrawals</p>
              </div>
                         ) : (
               <div className="space-y-4">
                 {(Array.isArray(pendingWithdrawals?.data) ? pendingWithdrawals.data : []).map((withdrawal) => (
                  <div key={withdrawal.id} className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {withdrawal.user.fullName || withdrawal.user.email || withdrawal.user.phone || 'User'}
                          </h3>
                          <div className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                            PENDING
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          {withdrawal.user.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">📧</span>
                              <span className="text-white">{withdrawal.user.email}</span>
                            </div>
                          )}
                          {withdrawal.user.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">📱</span>
                              <span className="text-white">{withdrawal.user.phone}</span>
                            </div>
                          )}
                          {withdrawal.user.fullName && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">👤</span>
                              <span className="text-white">{withdrawal.user.fullName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xl font-bold text-white">{formatCurrency(withdrawal.amount)}</div>
                        <div className="text-sm text-gray-300">{withdrawal.currency} • {withdrawal.network}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {withdrawal.user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <span>💳</span> Wallet Address:
                        </span>
                        <p className="text-white font-mono text-sm break-all mt-1">{withdrawal.walletAddress}</p>
                      </div>
                      <div>
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <span>📅</span> Requested:
                        </span>
                        <p className="text-white mt-1">{formatDate(withdrawal.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <span>🆔</span> Withdrawal ID:
                        </span>
                        <p className="text-white font-mono text-xs mt-1">{withdrawal.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span>💰</span> Amount: {formatCurrency(withdrawal.amount)}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2"
                        >
                          🔄 Process
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            handleEditWithdrawal();
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2"
                        >
                          ✏️ Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdrawal-history' && (
          <AdminWithdrawalHistory />
        )}

        {activeTab === 'deposits' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Deposit Management</h2>
            
            {depositsLoading ? (
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
            ) : !deposits || deposits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <p className="text-gray-400">No deposits found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(deposits) ? deposits : []).map((deposit) => (
                  <div key={deposit.id} className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{deposit.user.fullName || deposit.user.email || deposit.user.phone || 'User'}</h3>
                        <p className="text-gray-300">{deposit.user.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{formatCurrency(deposit.amount)}</div>
                        <div className="text-sm text-gray-300">{deposit.currency} • {deposit.network}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          deposit.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          deposit.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {deposit.status}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-gray-300 text-sm">Transaction Hash:</span>
                        <p className="text-white font-mono text-sm break-all">{deposit.transactionHash || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-gray-300 text-sm">Submitted:</span>
                        <p className="text-white">{formatDate(deposit.createdAt)}</p>
                      </div>
                    </div>
                    
                    {deposit.adminNotes && (
                      <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <span className="text-gray-300 text-sm">Admin Notes:</span>
                        <p className="text-white text-sm mt-1">{deposit.adminNotes}</p>
                      </div>
                    )}
                    
                    {deposit.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedDeposit(deposit)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Process
                        </Button>
                        {deposit.transactionHash && (
                          <>
                            <Button
                              onClick={() => handleCheckAllNetworks(deposit)}
                              disabled={checkAllNetworksMutation.isLoading}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              {checkAllNetworksMutation.isLoading ? 'Checking...' : '🔍 Verify'}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && <AdminUserManagement />}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Settings</h2>
            
            {settingsLoading ? (
              <div className="animate-pulse">
                <div className="bg-white/10 rounded-lg p-6">
                  <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
                  <div className="space-y-4">
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                    <div className="h-3 bg-white/20 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-white/10 rounded-lg p-6 border border-white/20">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const settings = {
                    minDepositAmount: parseFloat(formData.get('minDepositAmount')),
                    minWithdrawalAmount: parseFloat(formData.get('minWithdrawalAmount')),
                    isDepositEnabled: formData.get('isDepositEnabled') === 'on',
                    isWithdrawalEnabled: formData.get('isWithdrawalEnabled') === 'on',
                  };
                  updateSettingsMutation.mutate(settings);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Deposit Amount
                      </label>
                      <input
                        type="number"
                        name="minDepositAmount"
                        defaultValue={settings?.data?.minDepositAmount || 30}
                        step="0.01"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Withdrawal Amount
                      </label>
                      <input
                        type="number"
                        name="minWithdrawalAmount"
                        defaultValue={settings?.data?.minWithdrawalAmount || 10}
                        step="0.01"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isDepositEnabled"
                          defaultChecked={settings?.data?.isDepositEnabled}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-300">Enable Deposits</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isWithdrawalEnabled"
                          defaultChecked={settings?.data?.isWithdrawalEnabled}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-300">Enable Withdrawals</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {updateSettingsMutation.isLoading ? 'Updating...' : 'Update Settings'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal Processing Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-lg border border-white/20 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {isEditingWithdrawal ? 'Edit Withdrawal' : 'Process Withdrawal'}
                </h3>
                {!isEditingWithdrawal && selectedWithdrawal.status === 'PENDING' && (
                  <Button
                    onClick={handleEditWithdrawal}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
                  >
                    ✏️ Edit
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Withdrawal Details */}
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">User:</span>
                    <span className="text-white font-medium">{selectedWithdrawal.user.fullName || selectedWithdrawal.user.email || selectedWithdrawal.user.phone || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Amount:</span>
                    <span className="text-white font-bold">{formatCurrency(selectedWithdrawal.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Currency:</span>
                    <span className="text-white">{selectedWithdrawal.currency} • {selectedWithdrawal.network}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Status:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedWithdrawal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedWithdrawal.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedWithdrawal.status}
                    </span>
                  </div>
                </div>

                {/* Edit Form (when in edit mode) */}
                {isEditingWithdrawal && (
                  <div className="space-y-4 border-t border-white/20 pt-4">
                    <h4 className="text-sm font-medium text-gray-300">Edit Withdrawal Details</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={editWithdrawalData.amount}
                        onChange={(e) => setEditWithdrawalData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter new amount"
                        step="0.01"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        value={editWithdrawalData.walletAddress}
                        onChange={(e) => setEditWithdrawalData(prev => ({ ...prev, walletAddress: e.target.value }))}
                        placeholder="Enter new wallet address"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={editWithdrawalData.currency}
                        onChange={(e) => setEditWithdrawalData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select currency</option>
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Network
                      </label>
                      <select
                        value={editWithdrawalData.network}
                        onChange={(e) => setEditWithdrawalData(prev => ({ ...prev, network: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select network</option>
                        <option value="TRC20">TRC20</option>
                        <option value="ERC20">ERC20</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Notes
                      </label>
                      <textarea
                        value={editWithdrawalData.adminNotes}
                        onChange={(e) => setEditWithdrawalData(prev => ({ ...prev, adminNotes: e.target.value }))}
                        placeholder="Optional notes about this withdrawal"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                  </div>
                )}

                {/* Process Form (when not in edit mode) */}
                {!isEditingWithdrawal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Optional notes about this withdrawal"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                )}
                
                {/* Transaction Hash (only for processing) */}
                {!isEditingWithdrawal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Transaction Hash (for approval)
                    </label>
                    <input
                      type="text"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter transaction hash if approving"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                {isEditingWithdrawal ? (
                  <>
                    <Button
                      onClick={handleUpdateWithdrawal}
                      disabled={updateWithdrawalMutation.isLoading}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {updateWithdrawalMutation.isLoading ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      disabled={updateWithdrawalMutation.isLoading}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                    >
                      Cancel Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleProcessWithdrawal('APPROVE')}
                      disabled={processWithdrawalMutation.isLoading}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleProcessWithdrawal('REJECT')}
                      disabled={processWithdrawalMutation.isLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedWithdrawal(null);
                        setAdminNotes('');
                        setTransactionHash('');
                        setIsEditingWithdrawal(false);
                        setEditWithdrawalData({
                          amount: '',
                          walletAddress: '',
                          adminNotes: '',
                          currency: '',
                          network: ''
                        });
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Processing Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md border border-white/20 shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Process Deposit</h3>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">User:</span>
                    <span className="text-white font-medium">{selectedDeposit.user.fullName || selectedDeposit.user.email || selectedDeposit.user.phone || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Amount:</span>
                    <span className="text-white font-bold">{formatCurrency(selectedDeposit.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Currency:</span>
                    <span className="text-white">{selectedDeposit.currency} • {selectedDeposit.network}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={depositAdminNotes}
                    onChange={(e) => setDepositAdminNotes(e.target.value)}
                    placeholder="Optional notes about this deposit"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transaction Hash (for approval)
                  </label>
                  <input
                    type="text"
                    value={depositTransactionHash}
                    onChange={(e) => setDepositTransactionHash(e.target.value)}
                    placeholder="Enter transaction hash if approving"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => handleProcessDeposit('approve')}
                  disabled={processDepositMutation.isLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleProcessDeposit('reject')}
                  disabled={processDepositMutation.isLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setSelectedDeposit(null);
                    setDepositAdminNotes('');
                    setDepositTransactionHash('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Checker Modal */}
      {showTransactionChecker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-md border border-white/20 shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Check Transaction Across Networks</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transaction Hash
                  </label>
                  <input
                    type="text"
                    value={transactionHashChecker}
                    onChange={(e) => setTransactionHashChecker(e.target.value)}
                    placeholder="Enter transaction hash to check"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => {
                    setShowTransactionChecker(false);
                    setTransactionHashChecker('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const data = { transactionHash: transactionHashChecker };
                    setIsCheckingNetworks(true);
                    checkAllNetworksMutation.mutate(data);
                    setShowTransactionChecker(false);
                    setTransactionHashChecker('');
                  }}
                  disabled={checkAllNetworksMutation.isLoading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  {checkAllNetworksMutation.isLoading ? 'Checking...' : 'Check Networks'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Results Modal */}
      {showTransactionResults && transactionResults && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-4xl border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Transaction Verification Results</h3>
                <button
                  onClick={() => {
                    setShowTransactionResults(false);
                    setTransactionResults(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Transaction Summary */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {transactionResults.found ? '✅' : '❌'}
                    </span>
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {transactionResults.found ? 'Transaction Found' : 'Transaction Not Found'}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {transactionResults.found 
                          ? `Found on ${transactionResults.foundOnNetwork} network`
                          : `Checked ${transactionResults.totalNetworksChecked} networks`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Transaction Hash</p>
                    <p className="text-white font-mono text-sm break-all">
                      {transactionResults.transactionHash}
                    </p>
                  </div>
                </div>
              </div>

              {/* Network Results */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-4">Network Results</h4>
                {transactionResults.results.map((result, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getNetworkIcon(result.network)}</span>
                        <span className={`font-semibold ${getNetworkColor(result.network)}`}>
                          {result.network}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.found ? (
                          <span className="text-green-400 text-sm font-medium">✅ Found</span>
                        ) : (
                          <span className="text-red-400 text-sm font-medium">❌ Not Found</span>
                        )}
                      </div>
                    </div>

                                         {result.found && result.details ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div>
                           <div className="flex items-center space-x-2">
                             <p className="text-gray-400">Recipient Address</p>
                             {isRecipientMatching(result.details.recipientAddress, result.network) && (
                               <span className="text-blue-400 text-lg">✓</span>
                             )}
                           </div>
                           <p className="text-white font-mono break-all">{result.details.recipientAddress}</p>
                         </div>
                        <div>
                          <p className="text-gray-400">Sender Address</p>
                          <p className="text-white font-mono break-all">{result.details.senderAddress}</p>
                        </div>
                                                 <div>
                           <div className="flex items-center space-x-2">
                             <p className="text-gray-400">Amount</p>
                             {transactionResults.deposit && isAmountMatching(result.details.amount, transactionResults.deposit.amount) && (
                               <span className="text-blue-400 text-lg">✓</span>
                             )}
                           </div>
                           <p className="text-white font-semibold">
                             {formatAmount(result.details.amount, result.details.isTokenTransfer)}
                             {result.details.isTokenTransfer && (
                               <span className="text-gray-400 ml-1">(Token Transfer)</span>
                             )}
                           </p>
                         </div>
                        <div>
                          <p className="text-gray-400">Block Number</p>
                          <p className="text-white">{formatBlockNumber(result.details.blockNumber)}</p>
                        </div>
                        {result.details.isTokenTransfer && (
                          <div className="md:col-span-2">
                            <p className="text-gray-400">Token Contract</p>
                            <p className="text-white font-mono break-all">{result.details.tokenContract}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-400">Status</p>
                          <p className={`font-medium ${result.details.isConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>
                            {result.details.isConfirmed ? 'Confirmed' : 'Pending'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Gas Used</p>
                          <p className="text-white">{result.details.gasUsed ? parseInt(result.details.gasUsed, 16).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-400 text-sm">
                        {result.error || 'Transaction not found on this network'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

                             <div className="flex justify-between items-center mt-6">
                 <div>
                   {transactionResults.deposit && canAutoConfirm(transactionResults, transactionResults.deposit) && (
                     <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                       <div className="flex items-center space-x-2">
                         <span className="text-green-400 text-lg">🎯</span>
                         <div>
                           <p className="text-green-400 font-medium">Auto-Confirmation Available</p>
                           <p className="text-green-300 text-sm">Recipient address and amount match our records</p>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
                 <div className="flex space-x-3">
                   {transactionResults.deposit && canAutoConfirm(transactionResults, transactionResults.deposit) && (
                     <Button
                       onClick={() => {
                         // Auto-confirm the deposit
                         const data = {
                           adminNotes: 'Auto-confirmed: Transaction verified on blockchain',
                           transactionHash: transactionResults.transactionHash
                         };
                         processDepositMutation.mutate({
                           depositId: transactionResults.deposit.id,
                           action: 'approve',
                           data
                         });
                         setShowTransactionResults(false);
                         setTransactionResults(null);
                       }}
                       disabled={processDepositMutation.isLoading}
                       className="bg-green-500 hover:bg-green-600 text-white"
                     >
                       {processDepositMutation.isLoading ? 'Confirming...' : '✅ Auto-Confirm'}
                     </Button>
                   )}
                   <Button
                     onClick={() => {
                       setShowTransactionResults(false);
                       setTransactionResults(null);
                     }}
                     className="bg-gray-500 hover:bg-gray-600 text-white"
                   >
                     Close
                   </Button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Network Checking */}
      {isCheckingNetworks && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 shadow-2xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Checking Networks</h3>
            <p className="text-gray-300">Searching for transaction across all supported networks...</p>
            <div className="mt-4 flex justify-center space-x-2">
              <div className="animate-pulse">🟡</div>
              <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>🔵</div>
              <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>🟣</div>
              <div className="animate-pulse" style={{ animationDelay: '0.6s' }}>🔴</div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default AdminPanel;
