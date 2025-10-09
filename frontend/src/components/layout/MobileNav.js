import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle.js';
import Logo from '../ui/Logo';

const MobileNav = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isAdminActive = (tab) => {
    if (location.pathname !== '/admin') return false;
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tab === 'dashboard' && !tabParam) return true;
    return tabParam === tab;
  };

  // Admin navigation items
  const adminNavItems = [
    {
      path: '/admin',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      path: '/admin?tab=deposits',
      label: 'Deposits',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      path: '/admin?tab=withdrawals',
      label: 'Withdrawals',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      path: '/admin?tab=withdrawal-history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      path: '/admin?tab=users',
      label: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    }
  ];

  // Regular user navigation items
  const userNavItems = [
    {
      path: '/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/tasks',
      label: 'Tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      path: '/vip-selection',
      label: 'VIP',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      path: '/invite',
      label: 'Invite',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  // Determine if we're in admin panel
  const isAdminPanel = location.pathname === '/admin';
  const navItems = isAdminPanel ? adminNavItems : userNavItems;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleNavigation = () => {
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMenu();
  };

  return (
    <>
      {/* Mobile Header */}
      <nav className={`md:hidden fixed top-0 left-0 right-0 z-50 ${
        isAdminPanel 
          ? 'bg-binance-dark/95 backdrop-blur-md border-b border-binance-dark-border' 
          : 'bg-white/95 dark:bg-binance-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-binance-dark-border shadow-lg'
      }`}>
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Logo className="h-8 w-8" />
            <h1 className={`text-lg font-bold ${
              isAdminPanel ? 'text-binance-text-primary' : 'text-gray-900 dark:text-binance-text-primary'
            }`}>
              {isAdminPanel ? 'Admin Panel' : 'Moto Investment'}
            </h1>
          </div>

          {/* Menu Button */}
          <button
            onClick={toggleMenu}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isAdminPanel
                ? 'text-binance-text-secondary hover:bg-binance-dark-tertiary hover:text-binance-text-primary'
                : 'text-gray-600 dark:text-binance-text-secondary hover:bg-gray-50 dark:hover:bg-binance-dark-tertiary hover:text-gray-900 dark:hover:text-binance-text-primary'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className={`absolute top-16 left-0 right-0 ${
            isAdminPanel 
              ? 'bg-binance-dark-secondary border-b border-binance-dark-border' 
              : 'bg-white dark:bg-binance-dark-secondary border-b border-gray-200 dark:border-binance-dark-border'
          } shadow-xl`}>
            <div className="px-4 py-6">
              {/* User Info */}
              <div className={`mb-6 p-4 rounded-lg ${
                isAdminPanel 
                  ? 'bg-binance-dark-tertiary' 
                  : 'bg-gray-50 dark:bg-binance-dark-tertiary'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isAdminPanel ? 'bg-binance-yellow' : 'bg-binance-green'
                  }`}>
                    <svg className="w-5 h-5 text-binance-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-medium ${
                      isAdminPanel ? 'text-binance-text-primary' : 'text-gray-900 dark:text-binance-text-primary'
                    }`}>
                      {user?.fullName || user?.username}
                    </p>
                    <p className={`text-sm ${
                      isAdminPanel ? 'text-binance-text-secondary' : 'text-gray-600 dark:text-binance-text-secondary'
                    }`}>
                      {isAdminPanel ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2 mb-6">
                {navItems.map((item) => {
                  const isItemActive = isAdminPanel 
                    ? isAdminActive(item.path.includes('?tab=') ? item.path.split('?tab=')[1] : 'dashboard')
                    : isActive(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigation}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isAdminPanel
                          ? isItemActive
                            ? 'bg-binance-yellow text-binance-dark shadow-lg'
                            : 'text-binance-text-secondary hover:bg-binance-dark-tertiary hover:text-binance-text-primary'
                          : isItemActive
                            ? 'bg-binance-yellow text-binance-dark shadow-lg'
                            : 'text-gray-600 dark:text-binance-text-secondary hover:bg-gray-50 dark:hover:bg-binance-dark-tertiary hover:text-gray-900 dark:hover:text-binance-text-primary'
                      }`}
                    >
                      <span className={isAdminPanel
                        ? isItemActive ? 'text-accent-400' : 'text-gray-300'
                        : isItemActive ? 'text-accent-600' : 'text-gray-500 dark:text-gray-400'
                      }>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

                             {/* Theme Toggle and Logout */}
               <div className="space-y-3">
                 <div className={`flex items-center justify-between p-4 rounded-lg ${
                   isAdminPanel 
                     ? 'bg-binance-dark-tertiary' 
                     : 'bg-gray-50 dark:bg-binance-dark-tertiary'
                 }`}>
                   <span className={`text-sm font-medium ${
                     isAdminPanel ? 'text-binance-text-primary' : 'text-gray-900 dark:text-binance-text-primary'
                   }`}>
                     Theme
                   </span>
                   <ThemeToggle size="sm" />
                 </div>
                 
                 <button
                   onClick={() => {
                     closeMenu();
                     logout();
                   }}
                   className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                     isAdminPanel
                       ? 'bg-red-500 hover:bg-red-600 text-white'
                       : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                   }`}
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                   </svg>
                   <span>Logout</span>
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
