import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const AdminUserWithdrawalHistory = ({ userId, userName, isOpen, onClose }) => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: withdrawalsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['adminUserWithdrawals', userId, page],
    queryFn: async () => {
      const response = await adminAPI.getUserWithdrawals(userId, { page, limit });
      return response;
    },
    enabled: isOpen && !!userId,
    keepPreviousData: true,
    staleTime: 0
  });

  const withdrawals = withdrawalsData?.data?.data || withdrawalsData?.data || [];
  const pagination = withdrawalsData?.data?.pagination || withdrawalsData?.pagination || null;

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'APPROVED':
        return 'bg-blue-500/20 text-blue-400';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return '⏳';
      case 'APPROVED':
        return '✅';
      case 'COMPLETED':
        return '🎉';
      case 'REJECTED':
        return '❌';
      default:
        return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Mobile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-700 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white">Withdrawal History</h2>
            <p className="text-gray-400 text-sm truncate">User: {userName}</p>
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

        {/* Mobile Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="h-4 bg-white/20 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">Failed to load withdrawals</div>
              <div className="text-gray-400 text-sm mb-4">
                Error: {error.message || 'Unknown error occurred'}
              </div>
              <Button onClick={() => refetch()} className="bg-blue-500 hover:bg-blue-600">
                Retry
              </Button>
            </div>
          ) : !Array.isArray(withdrawals) || withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="text-gray-400">No withdrawals found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="backdrop-blur-xl bg-white/10 border border-white/20">
                  <div className="p-3">
                    {/* Mobile Withdrawal Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white">
                          {formatCurrency(withdrawal.amount)} {withdrawal.currency}
                        </h3>
                        <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)} {withdrawal.status}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Withdrawal Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Address:</span>
                          <span className="text-white font-mono text-xs truncate">
                            {withdrawal.walletAddress || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Network:</span>
                          <span className="text-white text-xs">{withdrawal.network || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Fee:</span>
                          <span className="text-white text-xs">
                            {formatCurrency(withdrawal.fee || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Net:</span>
                          <span className="text-white text-xs">
                            {formatCurrency(withdrawal.netAmount || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Requested:</span>
                          <span className="text-white text-xs">{formatDate(withdrawal.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Updated:</span>
                          <span className="text-white text-xs">{formatDate(withdrawal.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {withdrawal.adminNotes && (
                      <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-300 mb-1">Admin Notes:</div>
                        <div className="text-white text-xs">{withdrawal.adminNotes}</div>
                      </div>
                    )}

                    {withdrawal.transactionHash && (
                      <div className="mt-3 p-2 bg-green-800/20 rounded-lg border border-green-500/20">
                        <div className="text-xs text-green-300 mb-1">Transaction Hash:</div>
                        <div className="text-green-400 font-mono text-xs break-all">{withdrawal.transactionHash}</div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="bg-white/10 hover:bg-white/20 text-white px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm"
              >
                Prev
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 2, page - 1)) + i;
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm ${
                        pageNum === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="bg-white/10 hover:bg-white/20 text-white px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserWithdrawalHistory;
