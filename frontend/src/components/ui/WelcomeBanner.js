import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const WelcomeBanner = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user just logged in (within last 30 seconds)
    const loginTime = localStorage.getItem('lastLoginTime');
    const now = Date.now();
    const timeSinceLogin = now - (loginTime ? parseInt(loginTime) : 0);
    
    if (timeSinceLogin < 30000) { // 30 seconds
      setShowBanner(true);
      // Animate in after a short delay
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner || !user) return null;

  const currentTime = new Date().getHours();
  let greeting = 'Welcome back';
  
  if (currentTime < 12) {
    greeting = 'Good morning';
  } else if (currentTime < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Centered Welcome Message */}
      <div className={`relative max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-gradient-to-r from-binance-dark-secondary to-binance-dark-tertiary border-binance-dark-border' 
          : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'
      } scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent`}>
        <div className="p-4 sm:p-6">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 z-10 ${
              isDarkMode 
                ? 'text-binance-text-secondary hover:bg-binance-dark-tertiary hover:text-binance-text-primary'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

        {/* Header */}
        <div className={`flex items-center justify-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b ${
          isDarkMode ? 'border-binance-dark-border' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-binance-yellow rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold ${
              isDarkMode ? 'text-binance-text-primary' : 'text-gray-900'
            }`}>
              Welcome to Moto Investment, {user?.fullName || user?.email || 'User'}! 🎉
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <div className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${
            isDarkMode ? 'text-binance-text-primary' : 'text-gray-900'
          }`}>
            🚀 Ready to Start Your Investment Journey!
          </div>
          
          <p className={`text-sm leading-relaxed mb-4 sm:mb-6 ${
            isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
          }`}>
            Great to have you on board, {user?.fullName || 'there'}! You're now part of our exclusive staking community. Start earning passive income daily by investing in our secure VIP levels. The more you invest, the higher your daily returns will be.
          </p>

          <div className={`mb-4 sm:mb-6 ${
            isDarkMode ? 'text-binance-text-primary' : 'text-gray-900'
          }`}>
            <h3 className="font-semibold mb-2 sm:mb-3 flex items-center justify-center text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-binance-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Benefits of Staking with Us:
            </h3>
            
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li className={`flex items-start justify-center ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Daily earnings credited directly to your account
              </li>
              <li className={`flex items-start justify-center ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Flexible packages starting from just $10 up to $200,000
              </li>
              <li className={`flex items-start justify-center ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Referral program up to 3 levels (L1=10%, L2=5%, L3=2%) to maximize your income
              </li>
              <li className={`flex items-start justify-center ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <svg className="w-4 h-4 text-binance-yellow mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Withdraw your profit anytime, fast and secure
              </li>
            </ul>
          </div>

          {/* User Info Section */}
          <div className={`p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 ${
            isDarkMode ? 'bg-binance-dark-tertiary border border-binance-dark-border' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h4 className={`font-semibold mb-2 text-sm sm:text-base ${
              isDarkMode ? 'text-binance-text-primary' : 'text-gray-900'
            }`}>
              Your Account Details:
            </h4>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className={`flex justify-between ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Name:</span>
                <span className="font-medium">{user?.fullName || 'Not provided'}</span>
              </div>
              <div className={`flex justify-between ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Email:</span>
                <span className="font-medium">{user?.email || 'Not provided'}</span>
              </div>
              <div className={`flex justify-between ${
                isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
              }`}>
                <span>Referral Code:</span>
                <span className="font-medium text-binance-yellow">{user?.referralCode || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg mb-6 ${
            isDarkMode ? 'bg-binance-dark-tertiary' : 'bg-gray-50'
          }`}>
            <p className={`text-sm ${
              isDarkMode ? 'text-binance-text-secondary' : 'text-gray-600'
            }`}>
              Your investment is protected, and our transparent system ensures you track your profit in real time. Start staking today and grow your wealth with confidence!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-binance-yellow hover:bg-yellow-500 text-binance-dark font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
            >
              🚀 Start Your Investment Journey
            </button>
            <button
              onClick={handleClose}
              className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base ${
                isDarkMode 
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
    </div>
  );
};

export default WelcomeBanner;
