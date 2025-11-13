import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { depositAPI } from '../services/api';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const DepositHistory = ({ onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [newTransactionHash, setNewTransactionHash] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch user's deposits
  const { data: depositsData, isLoading, error } = useQuery({
    queryKey: ['myDeposits'],
    queryFn: async () => {
      const response = await depositAPI.getMyDeposits({ 
        page, 
        limit: 10,
        ...(statusFilter && { status: statusFilter })
      });
      return response.data; // Return the actual response data
    },
    enabled: !!user, // Only run query if user is authenticated
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching deposits:', error);
    }
  });

  // Fetch pending count
  const { data: pendingCountData } = useQuery({
    queryKey: ['pendingDepositsCount'],
    queryFn: async () => {
      const response = await depositAPI.getPendingCount();
      return response.data; // Return the actual response data
    },
    enabled: !!user, // Only run query if user is authenticated
    onError: (error) => {
      console.error('Error fetching pending count:', error);
    }
  });

  // Handle API response structure - deposits and pending count are separate
  const deposits = depositsData?.success && Array.isArray(depositsData?.data) 
    ? depositsData.data 
    : [];
  const pagination = depositsData?.pagination || {};
  const pendingCount = pendingCountData?.data?.pendingCount || 0;

  // Handle transaction hash update
  const handleUpdateTransactionHash = async (depositId) => {
    if (!newTransactionHash.trim()) {
      toast.error('Please enter a transaction hash');
      return;
    }

    try {
      setIsUpdating(true);
      const response = await depositAPI.updateTransactionHash(depositId, newTransactionHash);
      
      if (response.data.success) {
        toast.success('Transaction hash updated successfully!');
        setEditingDeposit(null);
        setNewTransactionHash('');
        queryClient.invalidateQueries(['myDeposits']);
      } else {
        toast.error(response.data.message || 'Failed to update transaction hash');
      }
    } catch (error) {
      console.error('Error updating transaction hash:', error);
      toast.error('Failed to update transaction hash');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500 text-yellow-900';
      case 'CONFIRMED':
        return 'bg-green-500 text-white';
      case 'FAILED':
        return 'bg-red-500 text-white';
      case 'EXPIRED':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'CONFIRMED':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'FAILED':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
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

  const formatAmount = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="binance-section w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6">
            <div className="text-center text-red-400">
              <p>Authentication required</p>
              <p className="text-sm text-gray-400 mt-2">
                Please log in to view your deposit history
              </p>
              <Button onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="binance-section w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6">
            <div className="text-center text-red-400">
              <p>Error loading deposit history</p>
              <p className="text-sm text-gray-400 mt-2">
                {error.response?.data?.message || error.message || 'Please try again later'}
              </p>
              <Button onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-binance-text-primary">Deposit History</h2>
            {pendingCount > 0 && (
              <p className="text-sm text-yellow-400 mt-1">
                {pendingCount} pending deposit{pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-white/20 rounded-full text-white transition-colors ml-2"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">

          {/* Status Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === '' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'PENDING' 
                    ? 'bg-yellow-500 text-yellow-900' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'CONFIRMED' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setStatusFilter('FAILED')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'FAILED' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          {/* Deposits List */}
          {isLoading ? (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400">No deposits found</p>
              {statusFilter && (
                <p className="text-sm text-gray-500 mt-1">
                  Try changing the filter or create a new deposit
                </p>
              )}
              {depositsData && depositsData.success && (
                <p className="text-sm text-blue-400 mt-1">
                  API returned success but no deposits in array
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4" key={`deposits-${page}-${statusFilter}`}>
              {deposits.map((deposit) => (
                <div key={deposit.id} className="binance-list-item">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(deposit.status)}`}>
                          {getStatusIcon(deposit.status)}
                          <span>{deposit.status}</span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {formatDate(deposit.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="text-gray-400 sm:mr-2">Amount:</span>
                          <span className="text-white font-medium">
                            {formatAmount(deposit.amount)} {deposit.currency}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="text-gray-400 sm:mr-2">Network:</span>
                          <span className="text-white font-medium">
                            {deposit.network || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:col-span-2 lg:col-span-1">
                          <span className="text-gray-400 sm:mr-2">Type:</span>
                          <span className="text-white font-medium">
                            {deposit.depositType || 'USDT'}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Hash Section */}
                      <div className="mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-gray-400 text-sm">Transaction Hash:</span>
                          {editingDeposit === deposit.id ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                              <input
                                type="text"
                                value={newTransactionHash}
                                onChange={(e) => setNewTransactionHash(e.target.value)}
                                placeholder="Enter transaction hash"
                                className="w-full sm:w-64 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleUpdateTransactionHash(deposit.id)}
                                  disabled={isUpdating}
                                  className="flex-1 sm:flex-none px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50 transition-colors"
                                >
                                  {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDeposit(null);
                                    setNewTransactionHash('');
                                  }}
                                  className="flex-1 sm:flex-none px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                              <span className="text-white font-mono text-sm break-all max-w-full sm:max-w-xs">
                                {deposit.transactionHash || 'Not provided'}
                              </span>
                              {deposit.status === 'PENDING' && (
                                <button
                                  onClick={() => {
                                    setEditingDeposit(deposit.id);
                                    setNewTransactionHash(deposit.transactionHash || '');
                                  }}
                                  className="w-full sm:w-auto px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                                >
                                  Edit Hash
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/20">
              <div className="text-sm text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositHistory;
