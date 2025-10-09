import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const WelcomeModal = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-auto my-8 max-h-[90vh] overflow-y-auto ${
        isDark 
          ? 'bg-binance-dark-secondary border border-binance-dark-border' 
          : 'bg-white border border-gray-200'
      } rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b backdrop-blur supports-[backdrop-filter]:bg-white/70 ${
          isDark ? 'border-binance-dark-border bg-binance-dark-secondary' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-binance-yellow rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold ${
              isDark ? 'text-binance-text-primary' : 'text-gray-900'
            }`}>
              Welcome to Moto Investment, {user?.fullName || user?.email || 'User'}! 🎉
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark 
                ? 'text-binance-text-secondary hover:bg-binance-dark-tertiary hover:text-binance-text-primary'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`text-lg font-semibold mb-4 ${
            isDark ? 'text-binance-text-primary' : 'text-gray-900'
          }`}>
            🚀 Ready to Start Your Investment Journey!
          </div>
          
          <p className={`text-sm leading-relaxed mb-6 ${
            isDark ? 'text-binance-text-secondary' : 'text-gray-600'
          }`}>
            Great to have you on board, {user?.fullName || 'there'}! You're now part of our exclusive staking community. Start earning passive income daily by investing in our secure VIP levels. The more you invest, the higher your daily returns will be.
          </p>

          <div className={`mb-6 ${
            isDark ? 'text-binance-text-primary' : 'text-gray-900'
          }`}>
            <h3 className="font-semibold mb-3 flex items-center">
              <svg className="w-5 h-5 text-binance-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Benefits of Staking with Us:
            </h3>
            
            <ul className="space-y-3">
              <li className={`flex items-start text-sm ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Daily earnings credited directly to your account
              </li>
              <li className={`flex items-start text-sm ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Flexible packages starting from just $10 up to $200,000
              </li>
              <li className={`flex items-start text-sm ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Referral program up to 3 levels (L1=10%, L2=5%, L3=2%) to maximize your income
              </li>
              <li className={`flex items-start text-sm ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Withdraw your profit anytime, fast and secure
              </li>
            </ul>
          </div>

          {/* User Info Section */}
          <div className={`p-4 rounded-lg mb-4 ${
            isDark ? 'bg-binance-dark-tertiary border border-binance-dark-border' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              isDark ? 'text-binance-text-primary' : 'text-gray-900'
            }`}>
              Your Account Details:
            </h4>
            <div className="space-y-1 text-sm">
              <div className={`flex justify-between ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Name:</span>
                <span className="font-medium">{user?.fullName || 'Not provided'}</span>
              </div>
              <div className={`flex justify-between ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Email:</span>
                <span className="font-medium">{user?.email || 'Not provided'}</span>
              </div>
              <div className={`flex justify-between ${
                isDark ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Referral Code:</span>
                <span className="font-medium text-binance-yellow">{user?.referralCode || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg mb-6 ${
            isDark ? 'bg-binance-dark-tertiary' : 'bg-gray-50'
          }`}>
            <p className={`text-sm ${
              isDark ? 'text-binance-text-secondary' : 'text-gray-600'
            }`}>
              Your investment is protected, and our transparent system ensures you track your profit in real time. Start staking today and grow your wealth with confidence!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-binance-yellow hover:bg-yellow-500 text-binance-dark font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚀 Start Your Investment Journey
            </button>
            <button
              onClick={onClose}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                isDark 
                  ? 'bg-binance-dark-tertiary text-binance-text-secondary hover:bg-binance-dark-border hover:text-binance-text-primary'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📚 Explore VIP Levels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
