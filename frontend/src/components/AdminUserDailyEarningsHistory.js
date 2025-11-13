import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const AdminUserDailyEarningsHistory = ({ userId, userName, isOpen, onClose }) => {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showChart, setShowChart] = useState(true);

  const {
    data: earningsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['userDailyEarnings', userId, page, dateFilter, sortBy],
    queryFn: async () => {
      if (!userId) return null;
        const response = await adminAPI.getUserDailyEarnings(userId, {
          page,
          limit: 20,
          dateFilter,
          sortBy
        });
      // The response structure is { success: true, data: { transactions, pagination, summary, chartData } }
      return response.data.data; // Access the nested data property
    },
    enabled: isOpen && !!userId,
    keepPreviousData: true,
    refetchOnWindowFocus: false
  });

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

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Chart data processing
  const chartData = useMemo(() => {
    if (!earningsData?.chartData) return [];
    
    return earningsData.chartData.map(item => ({
      date: item.date,
      amount: parseFloat(item.amount || 0)
    }));
  }, [earningsData?.chartData]);

  // Enhanced chart component
  const SimpleChart = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>No chart data available</div>
          </div>
        </div>
      );
    }

    const maxAmount = Math.max(...data.map(d => d.amount));
    const minAmount = Math.min(...data.map(d => d.amount));
    const range = maxAmount - minAmount || 1;
    const chartHeight = 120;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-white">Daily Earnings Trend</div>
          <div className="text-sm text-gray-400">
            {data.length} day{data.length !== 1 ? 's' : ''} • 
            Range: {formatCurrency(minAmount)} - {formatCurrency(maxAmount)}
          </div>
        </div>
        
        {/* Y-axis labels */}
        <div className="flex">
          <div className="w-12 sm:w-16 flex flex-col justify-between h-32 text-xs text-gray-400">
            <div className="text-right">{formatCurrency(maxAmount)}</div>
            <div className="text-right">{formatCurrency((maxAmount + minAmount) / 2)}</div>
            <div className="text-right">{formatCurrency(minAmount)}</div>
          </div>
          
          {/* Chart area */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 0.5, 1].map((ratio, i) => (
                <div key={i} className="border-t border-white/10"></div>
              ))}
            </div>
            
            {/* Bars */}
            <div className="flex items-end space-x-1 h-32 px-2">
              {data.slice(-14).map((item, index) => {
                const height = range > 0 ? ((item.amount - minAmount) / range) * (chartHeight - 20) + 10 : 20;
                const isHighest = item.amount === maxAmount;
                const isLowest = item.amount === minAmount;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      <div className="font-semibold">{formatDateShort(item.date)}</div>
                      <div className="text-green-400">{formatCurrency(item.amount)}</div>
                    </div>
                    
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 hover:scale-105 ${
                        isHighest 
                          ? 'bg-gradient-to-t from-green-500 to-green-400 shadow-green-500/25' 
                          : isLowest
                          ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-blue-500/25'
                          : 'bg-gradient-to-t from-cyan-500 to-cyan-400 shadow-cyan-500/25'
                      } shadow-lg`}
                      style={{ 
                        height: `${height}px`,
                        minHeight: '4px'
                      }}
                    />
                    
                    {/* Date label */}
                    <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                      {formatDateShort(item.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Chart summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Earnings</div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(data.reduce((sum, item) => sum + item.amount, 0))}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400">Average</div>
            <div className="text-lg font-bold text-cyan-400">
              {formatCurrency(data.reduce((sum, item) => sum + item.amount, 0) / data.length)}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-400">Best Day</div>
            <div className="text-lg font-bold text-green-400">
              {formatCurrency(maxAmount)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-gray-900 rounded-xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden mt-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div>
            <h2 className="text-xl font-bold text-white">Daily Earnings History</h2>
            <p className="text-gray-400 text-sm">{userName}</p>
          </div>
          <Button
            onClick={onClose}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg"
          >
            ✕ Close
          </Button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-white/20">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Period:</label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm"
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            {/* Chart Toggle */}
              <Button
              onClick={() => setShowChart(!showChart)}
              className={`px-3 py-1 text-sm ${
                showChart 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {showChart ? '📊 Hide Chart' : '📊 Show Chart'}
              </Button>

            {/* Refresh */}
              <Button
              onClick={() => refetch()}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 text-sm"
              >
              🔄 Refresh
              </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-8 overflow-y-auto max-h-[60vh] relative z-10">
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
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">Failed to load earnings data</div>
              <div className="text-gray-400 text-sm mb-4">
                Error: {error.message || 'Unknown error occurred'}
              </div>
              <Button onClick={() => refetch()} className="bg-blue-500 hover:bg-blue-600">
                Retry
              </Button>
            </div>
          ) : !earningsData ? (
            <div className="text-center py-8">
              <div className="text-gray-400">No earnings data available</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              {earningsData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-500/10 border-blue-500/20">
                  <div className="p-4">
                      <div className="text-sm text-blue-400">Total Earnings</div>
                      <div className="text-xl font-bold text-blue-400">
                        {formatCurrency(earningsData.summary.totalEarnings)}
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="bg-green-500/10 border-green-500/20">
                    <div className="p-4">
                      <div className="text-sm text-green-400">Average Daily</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatCurrency(earningsData.summary.averageDailyEarnings)}
                    </div>
                  </div>
                </Card>
                  
                  <Card className="bg-purple-500/10 border-purple-500/20">
                  <div className="p-4">
                      <div className="text-sm text-purple-400">Highest Day</div>
                      <div className="text-xl font-bold text-purple-400">
                        {formatCurrency(earningsData.summary.maxEarnings)}
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="bg-orange-500/10 border-orange-500/20">
                    <div className="p-4">
                      <div className="text-sm text-orange-400">Total Days</div>
                      <div className="text-xl font-bold text-orange-400">
                        {earningsData.summary.totalDays}
                      </div>
                    </div>
                  </Card>
                  </div>
              )}

              {/* Chart */}
              {showChart && (
                <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-cyan-500/20 shadow-cyan-500/10 mb-8">
                  <div className="p-6 pb-8">
                    <SimpleChart data={chartData} />
                  </div>
                </Card>
              )}

              {/* Earnings List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Earnings History</h3>
                
                {!earningsData?.transactions || earningsData.transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">No earnings found for the selected period</div>
                          </div>
                ) : (
                  <div className="space-y-2">
                    {earningsData.transactions.map((transaction, index) => (
                      <Card key={transaction.id || index} className="bg-white/5 border-white/10">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <div>
                                  <div className="text-white font-medium">
                                    Daily VIP Earnings
                        </div>
                                  <div className="text-gray-400 text-sm">
                                    {formatDate(transaction.createdAt)}
                          </div>
                          </div>
                        </div>
                      </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
                                +{formatCurrency(transaction.amount)}
                          </div>
                              <div className="text-gray-400 text-xs">
                                Transaction #{transaction.id?.slice(-8) || 'N/A'}
                          </div>
                        </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                          </div>
                        )}
              </div>

              {/* Pagination */}
              {earningsData.pagination && earningsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
              >
                    Previous
              </Button>
              
              <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, earningsData.pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(earningsData.pagination.totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 rounded ${
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
                    onClick={() => setPage(Math.min(earningsData.pagination.totalPages, page + 1))}
                    disabled={page === earningsData.pagination.totalPages}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
                  >
                    Next
              </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDailyEarningsHistory;