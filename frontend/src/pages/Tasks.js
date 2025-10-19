import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import CountdownTimer from '../components/ui/CountdownTimer';
import toast from 'react-hot-toast';

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [lastEarnings, setLastEarnings] = useState(null);

  // Update current time every second for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch earning session status
  const { data: earningStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['earningStatus'],
    queryFn: taskAPI.getEarningStatus,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Check for completed task and show congratulations
  useEffect(() => {
    if (earningStatus?.data?.data?.lastEarnings && !showCongratulations) {
      setLastEarnings(earningStatus.data.data.lastEarnings);
      setShowCongratulations(true);
    }
  }, [earningStatus?.data?.data?.lastEarnings, showCongratulations]);

  // Fetch available tasks
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['availableTasks'],
    queryFn: taskAPI.getAvailableTasks,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch task history
  const { data: taskHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['taskHistory'],
    queryFn: taskAPI.getTaskHistory,
  });

  // Start earning session mutation
  const startEarningMutation = useMutation({
    mutationFn: taskAPI.startEarning,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.data.message);
        queryClient.invalidateQueries(['earningStatus']);
        queryClient.invalidateQueries(['walletStats']);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      // Check if error is about no VIP level and redirect
      if (error.response?.data?.message?.includes('No active VIP level')) {
        toast.error('Please join a VIP level first to start earning');
        navigate('/vip-selection');
      } else {
        toast.error('Failed to start earning session');
      }
    }
  });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: ({ taskId }) => taskAPI.startTask(taskId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.data.message);
        queryClient.invalidateQueries(['availableTasks']);
        queryClient.invalidateQueries(['earningStatus']);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to start task');
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-binance-dark pb-20 md:pb-0">
      {/* Binance-style Header */}
      <div className="bg-white dark:bg-binance-dark-secondary border-b border-gray-200 dark:border-binance-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-binance-yellow rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Moto Investment</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-binance-green rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 md:pb-8">
        {/* Binance-style Page Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 dark:bg-binance-dark-tertiary rounded-full border border-gray-200 dark:border-binance-dark-border mb-4 sm:mb-6">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-binance-yellow rounded-full mr-1.5 sm:mr-2 animate-pulse"></div>
            <span className="text-gray-600 dark:text-binance-text-secondary text-xs sm:text-sm font-medium">Daily Task Earnings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-binance-text-primary mb-3 sm:mb-4">
            Daily Earning Task
          </h1>
          <p className="text-gray-600 dark:text-binance-text-secondary text-sm sm:text-base max-w-2xl mx-auto px-4">
            Start your daily 1-hour earning session to earn based on your VIP level's daily earning rate. Earnings are deposited immediately when you start the task!
          </p>
        </div>

        <div className="space-y-8">
          {/* Binance-style Daily Earning Session */}
          <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg ${earningStatus?.data?.data?.hasActiveSession ? 'bg-binance-green' : 'bg-binance-yellow'}`}>
                    {earningStatus?.data?.data?.hasActiveSession ? (
                      <span className={`text-lg sm:text-xl text-white ${earningStatus?.data?.data?.hasActiveSession ? 'animate-bounce' : ''}`}>🚴</span>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-binance-text-primary mb-1 sm:mb-2">
                      Daily Earning Session
                    </h3>
                    <p className="text-gray-600 dark:text-binance-text-secondary text-sm sm:text-base">
                      Start your 1-hour earning cycle to accumulate profits automatically
                    </p>
                  </div>
                </div>
              </div>
              {statusLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 sm:space-x-4 animate-pulse">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-binance-dark-tertiary rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-binance-dark-tertiary rounded w-1/3 mb-2"></div>
                      <div className="h-2 sm:h-3 bg-gray-200 dark:bg-binance-dark-tertiary rounded w-1/2"></div>
                    </div>
                    <div className="h-8 sm:h-10 bg-gray-200 dark:bg-binance-dark-tertiary rounded w-24 sm:w-32"></div>
                  </div>
                </div>
              ) : earningStatus?.data?.data?.hasActiveSession ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gray-50 dark:bg-binance-dark-tertiary border border-gray-200 dark:border-binance-dark-border rounded-lg p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-binance-green rounded-lg flex items-center justify-center shadow-lg">
                          <span className="text-2xl sm:text-3xl lg:text-4xl animate-bounce">🚴</span>
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-binance-text-primary mb-1 sm:mb-2">Earning Session Active</h3>
                          <p className="text-binance-green font-semibold text-sm sm:text-base lg:text-lg">
                            Earnings: {formatCurrency(earningStatus.data.data.totalEarnings || earningStatus.data.data.dailyEarningRate)} (already deposited)
                          </p>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-binance-green mb-1 sm:mb-2">
                          {earningStatus.data.data.remainingTime.minutes}m {earningStatus.data.data.remainingTime.seconds}s
                        </div>
                        <div className="text-gray-600 dark:text-binance-text-secondary text-sm sm:text-base">Time Remaining</div>
                      </div>
                    </div>
                    
                    <div className="mb-6 sm:mb-8">
                      <div className="flex justify-between text-sm sm:text-base text-gray-600 dark:text-binance-text-secondary mb-3 sm:mb-4">
                        <span className="font-semibold">Session Progress</span>
                        <span className="font-bold text-binance-green">{earningStatus.data.data.progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-binance-dark-border rounded-lg h-4 sm:h-6">
                        <div 
                          className="bg-binance-green h-4 sm:h-6 rounded-lg transition-all duration-500 shadow-lg relative overflow-hidden"
                          style={{ width: `${earningStatus.data.data.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                    </div>

                    <div className="text-gray-600 dark:text-binance-text-secondary text-sm sm:text-base text-center">
                      Started: {new Date(earningStatus.data.data.startTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ) : earningStatus?.data?.data?.cooldownRemaining ? (
                <div className="text-center py-8 sm:py-16">
                  <div className="relative mb-8 sm:mb-12">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gray-100 dark:bg-binance-dark-tertiary rounded-full flex items-center justify-center mx-auto shadow-lg border border-gray-200 dark:border-binance-dark-border">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-yellow-500 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-binance-text-primary mb-4 sm:mb-6">Task Completed! 🎉</h3>
                  <p className="text-gray-600 dark:text-binance-text-secondary mb-8 sm:mb-12 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed px-4">
                    {earningStatus?.data?.data?.message || 'Great job! You have completed your daily task. You can start a new task once the cooldown period is over.'}
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="mb-8 sm:mb-12">
                    <CountdownTimer
                      targetTime={new Date(Date.now() + earningStatus.data.data.cooldownRemaining.hours * 60 * 60 * 1000)}
                      size="xl"
                      className="text-center"
                      onComplete={() => {
                        queryClient.invalidateQueries(['earningStatus']);
                        toast.success('🎉 Ready to start your next daily task!');
                      }}
                    />
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 max-w-md mx-auto">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-green-600 dark:text-green-400 text-lg">💰</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">Last Earnings</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(earningStatus.data.data.lastEarnings || 0)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Successfully deposited to your wallet
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-16">
                  <div className="relative mb-8 sm:mb-12">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gray-100 dark:bg-binance-dark-tertiary rounded-full flex items-center justify-center mx-auto shadow-lg border border-gray-200 dark:border-binance-dark-border">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-binance-yellow rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-binance-text-primary mb-4 sm:mb-6">Ready to Start Daily Task</h3>
                  <p className="text-gray-600 dark:text-binance-text-secondary mb-8 sm:mb-12 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed px-4">
                    {earningStatus?.data?.data?.message || 'Click the button below to start your 1-hour earning cycle based on your VIP level. Earnings will be deposited to your wallet immediately!'}
                  </p>
                  
                  <button
                    onClick={() => startEarningMutation.mutate()}
                    disabled={startEarningMutation.isLoading}
                    className="btn-primary px-6 sm:px-8 lg:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-lg shadow-lg font-bold transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    {startEarningMutation.isLoading ? 'Starting...' : '🚀 Start Daily Task'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Available Daily Task */}
          {tasksData?.data?.length > 0 && (
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">Daily Earning Task</h3>
                <p className="text-gray-600 dark:text-binance-text-secondary mb-6">
                  Start your daily earning session to earn based on your VIP level's daily earning rate
                </p>
                {tasksLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-24 bg-gray-200 dark:bg-binance-dark-tertiary rounded-lg"></div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tasksData.data.map((task) => (
                      <div
                        key={task.id}
                        className={`p-6 rounded-lg border transition-all duration-200 ${
                          task.status === 'IN_PROGRESS' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                            : task.status === 'WEEKEND_RESTRICTED'
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                            : 'bg-gray-50 dark:bg-binance-dark-tertiary border-gray-200 dark:border-binance-dark-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">🚴</div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-binance-text-primary">{task.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-binance-text-secondary">{task.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-binance-green">
                              VIP Level Based
                            </div>
                            <div className={`text-xs font-medium ${
                              task.status === 'IN_PROGRESS' 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : task.status === 'WEEKEND_RESTRICTED'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-binance-green'
                            }`}>
                              {task.status === 'IN_PROGRESS' 
                                ? 'ACTIVE' 
                                : task.status === 'WEEKEND_RESTRICTED'
                                ? 'WEEKEND RESTRICTED'
                                : 'READY'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 dark:text-binance-text-tertiary">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-binance-dark-border text-gray-600 dark:text-binance-text-secondary text-xs">
                              🔄 Daily Task
                            </span>
                          </div>
                          <div className="space-x-2">
                            {task.canStart && (
                              <button
                                onClick={() => startTaskMutation.mutate({ taskId: task.id })}
                                disabled={startTaskMutation.isLoading}
                                className="btn-primary text-sm px-3 py-1 rounded-lg"
                              >
                                Start Task
                              </button>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                                ⏳ In Progress
                              </span>
                            )}
                            {task.status === 'WEEKEND_RESTRICTED' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs">
                                🚫 Weekend Restricted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task History */}
          {taskHistory?.data?.tasks?.length > 0 && (
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">Daily Task History</h3>
                <p className="text-gray-600 dark:text-binance-text-secondary mb-6">
                  Your completed daily earning sessions
                </p>
                <div className="space-y-3">
                  {taskHistory.data.tasks.slice(0, 5).map((userTask) => (
                    <div
                      key={userTask.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-binance-dark-tertiary border border-gray-200 dark:border-binance-dark-border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">🚴</div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-binance-text-primary">{userTask.task.title}</div>
                          <div className="text-sm text-gray-600 dark:text-binance-text-secondary">
                            Completed: {new Date(userTask.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-binance-green">
                          +{formatCurrency(userTask.rewardEarned || 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-binance-text-tertiary">Deposited when started</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Congratulations Modal */}
      {showCongratulations && lastEarnings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-binance-dark-secondary border border-gray-200 dark:border-binance-dark-border rounded-lg p-8 max-w-md w-full text-center shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <div className="w-20 h-20 bg-binance-green rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-binance-text-primary mb-2">Congratulations!</h2>
              <p className="text-gray-600 dark:text-binance-text-secondary mb-6">Your daily task has been completed successfully! Earnings were deposited when you started the task.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-binance-dark-tertiary border border-gray-200 dark:border-binance-dark-border rounded-lg p-6 mb-6">
              <div className="text-3xl font-bold text-binance-green mb-2">
                +{formatCurrency(lastEarnings)}
              </div>
              <div className="text-gray-600 dark:text-binance-text-secondary text-sm">Added to your wallet</div>
            </div>
            
            {earningStatus?.data?.data?.cooldownRemaining && (
              <div className="mb-6">
                <div className="text-gray-600 dark:text-binance-text-secondary text-sm mb-3">
                  Your next daily task will be available in:
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <CountdownTimer
                    targetTime={new Date(Date.now() + earningStatus.data.data.cooldownRemaining.hours * 60 * 60 * 1000)}
                    size="large"
                    className="text-center"
                    showLabel={false}
                    onComplete={() => {
                      queryClient.invalidateQueries(['earningStatus']);
                      toast.success('🎉 Ready to start your next daily task!');
                      setShowCongratulations(false);
                    }}
                  />
                </div>
            </div>
            )}
            
            <button
              onClick={() => setShowCongratulations(false)}
              className="btn-primary px-8 py-3 rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Awesome! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
