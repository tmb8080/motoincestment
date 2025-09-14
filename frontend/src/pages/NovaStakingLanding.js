import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useTheme } from '../contexts/ThemeContext';

const NovaStakingLanding = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const { theme, isDark, isLight, isSystem, toggleTheme, setSystemMode } = useTheme();
  
  // Refs for smooth scrolling
  const heroRef = useRef(null);
  const problemRef = useRef(null);
  const solutionRef = useRef(null);
  const earningsRef = useRef(null);
  const referralRef = useRef(null);
  const technologyRef = useRef(null);
  const roadmapRef = useRef(null);
  const tokenomicsRef = useRef(null);
  const teamRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Smooth scroll function
  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsMobileMenuOpen(false);
  };

  // Navigation items
  const navigationItems = [
    { id: 'hero', label: 'Home', ref: heroRef },
    { id: 'problem', label: 'Problem', ref: problemRef },
    { id: 'solution', label: 'Solution', ref: solutionRef },
    { id: 'earnings', label: 'Earnings', ref: earningsRef },
    { id: 'referral', label: 'Referral', ref: referralRef },
    { id: 'technology', label: 'Technology', ref: technologyRef },
    { id: 'roadmap', label: 'Roadmap', ref: roadmapRef },
    { id: 'tokenomics', label: 'Tokenomics', ref: tokenomicsRef },
    { id: 'team', label: 'Team', ref: teamRef }
  ];

  // Intersection Observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section');
            if (sectionId) {
              setActiveSection(sectionId);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    navigationItems.forEach((item) => {
      if (item.ref.current) {
        item.ref.current.setAttribute('data-section', item.id);
        observer.observe(item.ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  const earningsData = [
    { investment: '$10', dailyRate: '10%', dailyEarnings: '$1.00', monthlyEarnings: '$30.00' },
    { investment: '$50', dailyRate: '10%', dailyEarnings: '$5.00', monthlyEarnings: '$150.00' },
    { investment: '$100', dailyRate: '10%', dailyEarnings: '$10.00', monthlyEarnings: '$300.00' },
    { investment: '$150', dailyRate: '11%', dailyEarnings: '$16.50', monthlyEarnings: '$495.00' },
    { investment: '$250', dailyRate: '11%', dailyEarnings: '$27.50', monthlyEarnings: '$825.00' },
    { investment: '$300', dailyRate: '11%', dailyEarnings: '$33.00', monthlyEarnings: '$990.00' },
    { investment: '$500', dailyRate: '11%', dailyEarnings: '$55.00', monthlyEarnings: '$1,650.00' },
    { investment: '$650', dailyRate: '11.5%', dailyEarnings: '$74.75', monthlyEarnings: '$2,242.50' },
    { investment: '$900', dailyRate: '12%', dailyEarnings: '$108.00', monthlyEarnings: '$3,240.00' },
    { investment: '$1,000', dailyRate: '12%', dailyEarnings: '$120.00', monthlyEarnings: '$3,600.00' },
    { investment: '$1,500', dailyRate: '12.5%', dailyEarnings: '$187.50', monthlyEarnings: '$5,625.00' },
    { investment: '$10,000', dailyRate: '12.5%', dailyEarnings: '$1,250.00', monthlyEarnings: '$37,500.00' },
    { investment: '$50,000', dailyRate: '13%', dailyEarnings: '$6,500.00', monthlyEarnings: '$195,000.00' },
    { investment: '$200,000', dailyRate: '13%', dailyEarnings: '$26,000.00', monthlyEarnings: '$780,000.00' }
  ];

  const referralData = [
    { level: 'Level 1 (Direct)', bonus: '10%', investment100: '$10', investment500: '$50', investment1000: '$100' },
    { level: 'Level 2', bonus: '5%', investment100: '$5', investment500: '$25', investment1000: '$50' },
    { level: 'Level 3', bonus: '2%', investment100: '$2', investment500: '$10', investment1000: '$20' }
  ];

  const roadmapData = [
    { quarter: 'Q1 2025', title: 'Platform Launch & Community Building', items: ['Launch Nova Staking Platform', 'Build initial community', 'Establish partnerships'] },
    { quarter: 'Q2 2025', title: 'Partnerships & User Education', items: ['Strategic partnerships', 'Referral campaigns', 'Educational content'] },
    { quarter: 'Q3 2025', title: 'Mobile App & Global Expansion', items: ['Mobile application', 'Multi-language support', 'Third-party security audits'] },
    { quarter: 'Q4 2025', title: 'Token Integration & Global Reach', items: ['Nova Token integration', 'Exchange listings', 'Global partnerships'] }
  ];

  const teamData = [
    { name: 'Alice M.', role: 'Founder & CEO', expertise: 'Blockchain Enthusiast' },
    { name: 'Brian K.', role: 'CTO', expertise: 'Smart Contracts Specialist' },
    { name: 'Clara N.', role: 'CMO', expertise: 'Marketing & Growth Expert' },
    { name: 'Daniel T.', role: 'Security Lead', expertise: 'Cybersecurity Professional' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-binance-dark' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-binance-dark-secondary/95 border-binance-dark-border' : 'bg-white/95 border-gray-200'} backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Logo className="h-12 w-auto" />
              <h1 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Nova Staking</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigationItems.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.ref)}
                  className={`text-sm font-medium transition-colors duration-300 hover:scale-105 ${
                    activeSection === item.id
                      ? isDark ? 'text-binance-yellow' : 'text-primary-600'
                      : isDark ? 'text-binance-text-secondary hover:text-binance-text-primary' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                    isDark ? 'bg-binance-dark-tertiary hover:bg-binance-dark-border' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? (
                    <svg className="w-5 h-5 text-binance-yellow" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
                
                {/* System Mode Indicator */}
                {isSystem && (
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    isDark ? 'bg-binance-dark-tertiary text-binance-text-tertiary' : 'bg-gray-200 text-gray-500'
                  }`}>
                    Auto
                  </div>
                )}
              </div>

              {/* Time Display */}
              <div className={`text-sm hidden md:block transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                <div className={`${isDark ? 'text-binance-text-tertiary' : 'text-gray-500'}`}>Current Time</div>
                <div className="font-mono">{currentTime.toLocaleTimeString()}</div>
              </div>

              {/* CTA Button */}
              <Link to="/login">
                <Button variant="default" className="transition-all duration-300 hover:scale-105">
                  Get Started
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${
                  isDark ? 'bg-binance-dark-tertiary hover:bg-binance-dark-border' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className={`lg:hidden border-t transition-all duration-300 ${
              isDark ? 'border-binance-dark-border bg-binance-dark-secondary' : 'border-gray-200 bg-white'
            }`}>
              <nav className="py-4 space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.ref)}
                    className={`block w-full text-left px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                      activeSection === item.id
                        ? isDark ? 'bg-binance-yellow/20 text-binance-yellow' : 'bg-primary-100 text-primary-600'
                        : isDark ? 'text-binance-text-secondary hover:text-binance-text-primary hover:bg-binance-dark-tertiary' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className={`text-5xl md:text-7xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>
              Nova Staking
            </h1>
            <p className={`text-xl md:text-2xl mb-8 max-w-4xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-yellow' : 'text-primary-600'}`}>
              The Next-Generation Staking Platform Launching September 2025
            </p>
            <p className={`text-lg mb-12 max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Empower your investments with daily earnings and financial freedom. 
              Start with as little as $10, enjoy stable daily rewards up to 13%, 
              and withdraw profits anytime.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
              <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-binance-green' : 'text-success-600'}`}>$10</div>
              <div className={`font-medium transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Minimum Investment</div>
            </div>
            <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
              <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-binance-yellow' : 'text-warning-600'}`}>13%</div>
              <div className={`font-medium transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Maximum Daily Returns</div>
            </div>
            <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
              <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>24/7</div>
              <div className={`font-medium transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Withdrawal Access</div>
            </div>
          </div>

          <Link to="/register">
            <Button variant="success" className="px-12 py-4 text-xl font-bold transform hover:scale-105 transition-all duration-300">
              Start Earning Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Problem Statement */}
      <section ref={problemRef} className={`py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-binance-dark-tertiary' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>The Problem We Solve</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              The cryptocurrency market offers many staking opportunities, but common problems persist
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Low Returns', description: 'Inconsistent and low returns across platforms', icon: '📉' },
              { title: 'Lack of Transparency', description: 'Hidden fees and unclear profit structures', icon: '🔍' },
              { title: 'Withdrawal Issues', description: 'Difficulty withdrawing funds when needed', icon: '🚫' },
              { title: 'No Community Growth', description: 'Absence of community-driven growth opportunities', icon: '👥' }
            ].map((problem, index) => (
              <div key={index} className={`${isDark ? 'bg-binance-red/10 border-binance-red/20' : 'bg-red-50 border-red-200'} border rounded-xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                <div className="text-4xl mb-4">{problem.icon}</div>
                <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{problem.title}</h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Solution */}
      <section ref={solutionRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Our Solution: Nova Staking</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              A transparent and easy-to-use platform where investors can start with $10, 
              earn up to 13% daily, withdraw anytime, and earn through a 3-level referral program.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Transparent Returns', description: 'Clear, consistent daily returns up to 13%', icon: '💰' },
              { title: 'Easy Access', description: 'Start with just $10, no complex requirements', icon: '🚀' },
              { title: 'Flexible Withdrawals', description: 'Withdraw your profits anytime, 24/7', icon: '💳' },
              { title: 'Referral Rewards', description: 'Earn through our 3-level referral system', icon: '🎯' }
            ].map((solution, index) => (
              <div key={index} className={`${isDark ? 'bg-binance-green/10 border-binance-green/20' : 'bg-green-50 border-green-200'} border rounded-xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                <div className="text-4xl mb-4">{solution.icon}</div>
                <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{solution.title}</h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>{solution.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staking Model & Earnings */}
      <section ref={earningsRef} className={`py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-binance-dark-tertiary' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Staking Model & Earnings</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Flexible packages with returns ranging from 10% to 13% daily. 
              Start small and scale up for bigger rewards.
            </p>
          </div>
          
          <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-2xl p-8 border shadow-lg overflow-x-auto transition-all duration-300`}>
            <table className={`w-full transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>
              <thead>
                <tr className={`border-b transition-colors duration-300 ${isDark ? 'border-binance-dark-border' : 'border-gray-200'}`}>
                  <th className="text-left py-4 px-4 font-bold">Investment Amount</th>
                  <th className="text-left py-4 px-4 font-bold">Daily Profit %</th>
                  <th className="text-left py-4 px-4 font-bold">Daily Earnings</th>
                  <th className="text-left py-4 px-4 font-bold">30 Days Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earningsData.map((row, index) => (
                  <tr key={index} className={`border-b transition-all duration-300 ${isDark ? 'border-binance-dark-border hover:bg-binance-dark-tertiary' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`py-4 px-4 font-semibold transition-colors duration-300 ${isDark ? 'text-binance-green' : 'text-success-600'}`}>{row.investment}</td>
                    <td className={`py-4 px-4 transition-colors duration-300 ${isDark ? 'text-binance-yellow' : 'text-warning-600'}`}>{row.dailyRate}</td>
                    <td className={`py-4 px-4 transition-colors duration-300 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{row.dailyEarnings}</td>
                    <td className={`py-4 px-4 font-bold transition-colors duration-300 ${isDark ? 'text-accent-400' : 'text-accent-600'}`}>{row.monthlyEarnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section ref={referralRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Referral Program</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Nova Staking rewards you for growing our community with a 3-level referral system
            </p>
          </div>
          
          <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-2xl p-8 border shadow-lg overflow-x-auto`}>
            <table className={`w-full ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>
              <thead>
                <tr className={`border-b ${isDark ? 'border-binance-dark-border' : 'border-gray-200'}`}>
                  <th className="text-left py-4 px-4 font-bold">Level</th>
                  <th className="text-left py-4 px-4 font-bold">Bonus %</th>
                  <th className="text-left py-4 px-4 font-bold">$100 Investment</th>
                  <th className="text-left py-4 px-4 font-bold">$500 Investment</th>
                  <th className="text-left py-4 px-4 font-bold">$1,000 Investment</th>
                </tr>
              </thead>
              <tbody>
                {referralData.map((row, index) => (
                  <tr key={index} className={`border-b ${isDark ? 'border-binance-dark-border hover:bg-binance-dark-tertiary' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                    <td className={`py-4 px-4 font-semibold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{row.level}</td>
                    <td className={`py-4 px-4 font-bold ${isDark ? 'text-binance-yellow' : 'text-warning-600'}`}>{row.bonus}</td>
                    <td className={`py-4 px-4 ${isDark ? 'text-binance-green' : 'text-success-600'}`}>{row.investment100}</td>
                    <td className={`py-4 px-4 ${isDark ? 'text-binance-green' : 'text-success-600'}`}>{row.investment500}</td>
                    <td className={`py-4 px-4 ${isDark ? 'text-binance-green' : 'text-success-600'}`}>{row.investment1000}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Technology & Security */}
      <section ref={technologyRef} className={`py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-binance-dark-tertiary' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Technology & Security</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Nova Staking ensures the highest standards of security and transparency
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Secure Encryption', description: 'Military-grade encryption protects your data', icon: '🔐' },
              { title: 'Real-time Tracking', description: 'Transparent, real-time profit tracking', icon: '📊' },
              { title: 'Easy Dashboard', description: 'User-friendly interface for all skill levels', icon: '💻' },
              { title: 'No Key Sharing', description: 'Your private keys remain private and secure', icon: '🔑' }
            ].map((feature, index) => (
              <div key={index} className={`${isDark ? 'bg-primary-500/10 border-primary-500/20' : 'bg-blue-50 border-blue-200'} border rounded-xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section ref={roadmapRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Roadmap</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Our strategic plan for building the future of staking
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roadmapData.map((quarter, index) => (
              <div key={index} className={`${isDark ? 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border-accent-500/20' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                <div className={`font-bold text-lg mb-2 transition-colors duration-300 ${isDark ? 'text-accent-400' : 'text-purple-600'}`}>{quarter.quarter}</div>
                <h3 className={`font-bold text-xl mb-4 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{quarter.title}</h3>
                <ul className="space-y-2">
                  {quarter.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={`flex items-start transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                      <span className={`mr-2 transition-colors duration-300 ${isDark ? 'text-binance-green' : 'text-green-600'}`}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section ref={tokenomicsRef} className={`py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-binance-dark-tertiary' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Tokenomics</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Nova Token (SNOVA) will serve as the backbone of our ecosystem
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-2xl p-8 border shadow-lg transition-all duration-300 hover:shadow-xl`}>
              <h3 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Token Distribution</h3>
              <div className="space-y-4">
                {[
                  { label: 'Staking Rewards', percentage: '40%', color: isDark ? 'bg-binance-green' : 'bg-green-500' },
                  { label: 'Team & Advisors (12-month lock)', percentage: '20%', color: isDark ? 'bg-primary-500' : 'bg-blue-500' },
                  { label: 'Community Incentives & Referrals', percentage: '20%', color: isDark ? 'bg-accent-500' : 'bg-purple-500' },
                  { label: 'Partnerships', percentage: '10%', color: isDark ? 'bg-binance-yellow' : 'bg-yellow-500' },
                  { label: 'Reserve & Liquidity', percentage: '10%', color: isDark ? 'bg-binance-red' : 'bg-red-500' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between transition-all duration-300 hover:scale-105">
                    <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{item.label}</span>
                    <div className="flex items-center space-x-3">
                      <div className={`w-32 rounded-full h-2 transition-colors duration-300 ${isDark ? 'bg-binance-dark-border' : 'bg-gray-300'}`}>
                        <div className={`h-2 rounded-full transition-all duration-300 ${item.color}`} style={{ width: item.percentage }}></div>
                      </div>
                      <span className={`font-bold w-12 text-right transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{item.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-white border-gray-200'} rounded-2xl p-8 border shadow-lg transition-all duration-300 hover:shadow-xl`}>
              <h3 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Token Details</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center transition-all duration-300 hover:scale-105">
                  <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>Token Name</span>
                  <span className={`font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Nova Token</span>
                </div>
                <div className="flex justify-between items-center transition-all duration-300 hover:scale-105">
                  <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>Symbol</span>
                  <span className={`font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>$NOVA</span>
                </div>
                <div className="flex justify-between items-center transition-all duration-300 hover:scale-105">
                  <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>Total Supply</span>
                  <span className={`font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>100,000,000</span>
                </div>
                <div className="flex justify-between items-center transition-all duration-300 hover:scale-105">
                  <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>Blockchain</span>
                  <span className={`font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Ethereum</span>
                </div>
                <div className="flex justify-between items-center transition-all duration-300 hover:scale-105">
                  <span className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>Standard</span>
                  <span className={`font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>ERC-20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section ref={teamRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Our Team</h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
              Built by a diverse and experienced team of blockchain and fintech experts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamData.map((member, index) => (
              <div key={index} className={`${isDark ? 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border-accent-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'} border rounded-xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                <div className={`w-20 h-20 ${isDark ? 'bg-gradient-to-r from-accent-500 to-primary-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 hover:scale-110`}>
                  <span className="text-white font-bold text-2xl">{member.name.charAt(0)}</span>
                </div>
                <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>{member.name}</h3>
                <div className={`font-semibold mb-2 transition-colors duration-300 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{member.role}</div>
                <div className={`text-sm transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>{member.expertise}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conclusion CTA */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-accent-600/20 to-primary-600/20' : 'bg-gradient-to-r from-purple-100 to-blue-100'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-bold mb-6 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>
            The Future of Accessible Crypto Investments
          </h2>
          <p className={`text-xl mb-8 transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
            Nova Staking is the future of accessible, transparent, and profitable crypto investments. 
            With daily returns, flexible withdrawal, and community-driven growth, investors can build wealth with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="success" className="px-8 py-4 text-lg font-bold transform hover:scale-105 transition-all duration-300">
                Join Nova Staking Today
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="px-8 py-4 text-lg font-bold transition-all duration-300 hover:scale-105">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${isDark ? 'bg-binance-dark-secondary border-binance-dark-border' : 'bg-gray-100 border-gray-200'} border-t py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Logo className="h-8 w-auto" />
                <h3 className={`text-xl font-bold transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Nova Staking</h3>
              </div>
              <p className={`transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                The next-generation staking platform for financial freedom.
              </p>
            </div>
            
            <div>
              <h4 className={`font-bold mb-4 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Platform</h4>
              <ul className={`space-y-2 transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                <li><Link to="/login" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Sign In</Link></li>
                <li><Link to="/register" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Register</Link></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Dashboard</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-bold mb-4 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Resources</h4>
              <ul className={`space-y-2 transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Documentation</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>API</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Security</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Audit Reports</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-bold mb-4 transition-colors duration-300 ${isDark ? 'text-binance-text-primary' : 'text-gray-900'}`}>Community</h4>
              <ul className={`space-y-2 transition-colors duration-300 ${isDark ? 'text-binance-text-secondary' : 'text-gray-600'}`}>
                <li><a href="https://t.me/novastaking" target="_blank" rel="noopener noreferrer" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Telegram</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Twitter</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Discord</a></li>
                <li><a href="#" className={`hover:transition-colors duration-300 ${isDark ? 'hover:text-binance-text-primary' : 'hover:text-gray-900'}`}>Medium</a></li>
              </ul>
            </div>
          </div>
          
          <div className={`border-t mt-8 pt-8 text-center transition-colors duration-300 ${isDark ? 'border-binance-dark-border text-binance-text-secondary' : 'border-gray-200 text-gray-600'}`}>
            <p>&copy; 2025 Nova Staking. All rights reserved. Launching September 2025.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NovaStakingLanding;
