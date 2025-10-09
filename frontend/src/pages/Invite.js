import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { referralAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import InvitedFriendsList from '../components/InvitedFriendsList';
import toast from 'react-hot-toast';

const Invite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch referral statistics including invited friends
  const { data: referralStats, isLoading: referralLoading } = useQuery({
    queryKey: ['referralStats'],
    queryFn: () => referralAPI.getStats(),


  });



  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Binance-style Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-binance-dark-tertiary rounded-full border border-gray-200 dark:border-binance-dark-border mb-6">
            <div className="w-2 h-2 bg-binance-yellow rounded-full mr-2 animate-pulse"></div>
            <span className="text-gray-600 dark:text-binance-text-secondary text-sm font-medium">Referral System</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">
            Invite Friends
          </h1>
          <p className="text-gray-600 dark:text-binance-text-secondary text-base max-w-2xl mx-auto">
            Share the opportunity and earn rewards for every successful referral
          </p>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Referral Link - Binance Style */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="bg-gray-50 dark:bg-binance-dark-tertiary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-binance-yellow rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Your Referral Link</h3>
                      <p className="text-gray-600 dark:text-binance-text-secondary text-sm">Share and earn rewards together</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">🎯</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Referral Code Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-1">Your Referral Code</div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-binance-text-primary bg-white dark:bg-binance-dark-secondary px-3 py-2 rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        {user?.referralCode || 'USER123'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user?.referralCode || 'USER123');
                        toast.success('Referral code copied!');
                      }}
                      className="ml-3 btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Code</span>
                    </button>
                  </div>
                </div>

                {/* Full Referral Link */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-3">Complete Referral Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={`${window.location.origin}/register?ref=${user?.referralCode || 'user'}`}
                      readOnly
                      className="w-full px-4 py-3 pr-24 border border-gray-200 dark:border-binance-dark-border rounded-lg bg-white dark:bg-binance-dark-secondary text-sm font-mono text-gray-900 dark:text-binance-text-primary focus:ring-2 focus:ring-binance-yellow focus:border-transparent"
                    />
                    <button
                      onClick={copyReferralLink}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                {/* Quick Share Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 dark:text-binance-text-secondary mb-3">Quick Share</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const text = `Join Moto Investment and start earning with daily task sessions! Use my referral link: ${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Message copied to clipboard!');
                      }}
                      className="btn-secondary py-3 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Copy Message</span>
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Join Moto Investment',
                            text: 'Start earning with daily task sessions!',
                            url: url
                          });
                        } else {
                          navigator.clipboard.writeText(url);
                          toast.success('Link copied to clipboard!');
                        }
                      }}
                      className="btn-primary py-3 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-binance-green rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-binance-text-primary">Referral Benefits</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-binance-green rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-binance-text-secondary">You earn <strong className="text-binance-green">5% commission</strong> on referrals</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-binance-green rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-binance-text-secondary">Both earn from <strong className="text-binance-green">Daily Task Earnings</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invited Friends Section */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="bg-gray-50 dark:bg-binance-dark-tertiary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-binance-green rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary">Your Invited Friends</h3>
                      <p className="text-gray-600 dark:text-binance-text-secondary text-sm">Track your referrals and their VIP levels</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">👥</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {referralLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-slate-700/50 rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <InvitedFriendsList referralStats={referralStats} />
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral Statistics */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">Your Referral Stats</h3>
                <div className="space-y-4">
                  {referralLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-8 bg-gray-200 dark:bg-binance-dark-tertiary rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Direct Referrals</span>
                        <span className="text-gray-900 dark:text-binance-text-primary font-bold text-lg">{referralStats?.data?.directReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Indirect Referrals</span>
                        <span className="text-gray-900 dark:text-binance-text-primary font-bold text-lg">{referralStats?.data?.indirectReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Total Bonuses</span>
                        <span className="text-binance-green font-bold text-lg">
                          ${(referralStats?.data?.totalBonuses || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Level 1 Bonuses (10%)</span>
                        <span className="text-binance-yellow font-bold text-lg">
                          ${(referralStats?.data?.level1Bonuses || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Level 2 Bonuses (5%)</span>
                        <span className="text-blue-500 font-bold text-lg">
                          ${(referralStats?.data?.level2Bonuses || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                        <span className="text-gray-600 dark:text-binance-text-secondary text-sm">Level 3 Bonuses (2%)</span>
                        <span className="text-purple-500 font-bold text-lg">
                          ${(referralStats?.data?.level3Bonuses || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">How It Works</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-binance-yellow rounded-full flex items-center justify-center text-binance-dark font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-binance-text-primary">Share Your Link</h4>
                      <p className="text-sm text-gray-600 dark:text-binance-text-secondary">Send your referral link to friends</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-binance-yellow rounded-full flex items-center justify-center text-binance-dark font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-binance-text-primary">Friend Joins</h4>
                      <p className="text-sm text-gray-600 dark:text-binance-text-secondary">They sign up using your link</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-binance-yellow rounded-full flex items-center justify-center text-binance-dark font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-binance-text-primary">Earn Daily Rewards</h4>
                      <p className="text-sm text-gray-600 dark:text-binance-text-secondary">Both earn from daily task sessions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-binance-yellow rounded-full flex items-center justify-center text-binance-dark font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-binance-text-primary">Get Commission</h4>
                      <p className="text-sm text-gray-600 dark:text-binance-text-secondary">You earn 10% on their VIP investments</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      5
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-binance-text-primary">Multi-Level Rewards</h4>
                      <p className="text-sm text-gray-600 dark:text-binance-text-secondary">Earn 5% on Level 2 and 2% on Level 3 referrals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earning System */}
            <div className="bg-white dark:bg-binance-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-binance-dark-border">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-binance-text-primary mb-4">Earning System</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Daily Task Earnings</span>
                    <span className="font-medium text-binance-green">24h Sessions</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Direct Commission</span>
                    <span className="font-medium text-binance-yellow">5%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Indirect Commission</span>
                    <span className="font-medium text-binance-green">3%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg border border-gray-200 dark:border-binance-dark-border">
                    <span className="text-sm text-gray-600 dark:text-binance-text-secondary">VIP Level Bonus</span>
                    <span className="font-medium text-binance-yellow">Higher Rates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invite;
