import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../services/api';

const ReferralBenefits = ({ className = "" }) => {
  // Fetch referral rates dynamically
  const { data: referralRatesData, isLoading: referralLoading, error: referralError } = useQuery({
    queryKey: ['publicReferralRates'],
    queryFn: publicAPI.getReferralRates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Extract rates from API response
  const rates = referralRatesData?.data?.data || referralRatesData?.data || {};
  const level1Rate = rates.level1Rate || 0.10; // Default to 10%
  const level2Rate = rates.level2Rate || 0.05; // Default to 5%
  const level3Rate = rates.level3Rate || 0.02; // Default to 2%

  // Convert decimal rates to percentage for display
  const formatRate = (rate) => Math.round(rate * 100);

  if (referralLoading) {
    return (
      <div className={`bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border ${className}`}>
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
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded animate-pulse w-32"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded animate-pulse w-40"></div>
          </div>
        </div>
      </div>
    );
  }

  if (referralError) {
    // Fallback to default rates if API fails
    return (
      <div className={`bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border ${className}`}>
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
            <span className="text-sm text-gray-700 dark:text-binance-text-secondary">
              You earn <strong className="text-binance-green">{formatRate(level1Rate)}% commission</strong> on referrals
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-binance-green rounded-full"></div>
            <span className="text-sm text-gray-700 dark:text-binance-text-secondary">
              Both earn from <strong className="text-binance-green">Daily Task Earnings</strong>
            </span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-binance-text-tertiary">
          Multi-level: L1={formatRate(level1Rate)}%, L2={formatRate(level2Rate)}%, L3={formatRate(level3Rate)}%
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border ${className}`}>
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
          <span className="text-sm text-gray-700 dark:text-binance-text-secondary">
            You earn <strong className="text-binance-green">{formatRate(level1Rate)}% commission</strong> on referrals
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-binance-green rounded-full"></div>
          <span className="text-sm text-gray-700 dark:text-binance-text-secondary">
            Both earn from <strong className="text-binance-green">Daily Task Earnings</strong>
          </span>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-binance-text-tertiary">
        Multi-level: L1={formatRate(level1Rate)}%, L2={formatRate(level2Rate)}%, L3={formatRate(level3Rate)}%
      </div>
    </div>
  );
};

export default ReferralBenefits;
