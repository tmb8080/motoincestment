import React from 'react';
import { Link } from 'react-router-dom';
import { calculateNextVipUpgrade, formatCurrency } from '../utils/vipCalculations';

const VipUpgradeProgress = ({ vipLevels, currentVip, totalDeposits, onUpgradeClick, showUpgradeButton = true }) => {
  const upgradeInfo = calculateNextVipUpgrade(vipLevels, currentVip, totalDeposits);

  if (!upgradeInfo) {
    return null;
  }

  if (!upgradeInfo.hasNextLevel) {
    return (
      <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 border border-gray-200 dark:border-binance-dark-border">
        <div className="text-center">
          <div className="w-16 h-16 bg-binance-green rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-binance-text-primary mb-2">
            Maximum VIP Level Achieved!
          </h3>
          <p className="text-gray-600 dark:text-binance-text-secondary mb-4">
            Congratulations! You have reached the highest VIP level available.
          </p>
          <div className="bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4">
            <div className="text-2xl font-bold text-binance-green mb-2">
              {currentVip?.vipLevel?.name || 'VIP'}
            </div>
            <div className="text-gray-600 dark:text-binance-text-secondary">
              You're earning maximum daily returns!
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { nextLevel, upgradeCost, fullVipCost, amountNeededForFullVip, canAfford, missingAmount, progressPercentage } = upgradeInfo;

  return (
    <div className="bg-white dark:bg-binance-dark-secondary rounded-lg p-6 border border-gray-200 dark:border-binance-dark-border">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-binance-text-primary flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-binance-yellow rounded-lg flex items-center justify-center">
            <span className="text-sm">🚀</span>
          </div>
          Next VIP Level
        </h3>
        <p className="text-gray-600 dark:text-binance-text-secondary">
          Upgrade to {nextLevel.name} to increase your daily earnings
        </p>
      </div>
      <div className="space-y-4">
        {/* Next Level Info */}
        <div className="bg-gray-50 dark:bg-binance-dark-tertiary rounded-lg p-4 border border-gray-200 dark:border-binance-dark-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-bold text-gray-900 dark:text-binance-text-primary">{nextLevel.name}</div>
            <div className="text-xl font-bold text-binance-yellow">{formatCurrency(nextLevel.amount)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-binance-text-secondary">Daily Earning</div>
              <div className="font-bold text-binance-green">{formatCurrency(nextLevel.dailyEarning)}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-binance-text-secondary">Monthly Earning</div>
              <div className="font-bold text-binance-green">{formatCurrency(nextLevel.dailyEarning * 30)}</div>
            </div>
          </div>
        </div>

        {/* Upgrade Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-binance-text-secondary">Upgrade Progress</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-binance-text-primary">{progressPercentage.toFixed(1)}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-binance-dark-border rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                canAfford ? 'bg-binance-green' : 'bg-binance-yellow'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          {/* Progress Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-binance-text-secondary">Your Deposits</div>
              <div className="font-bold text-gray-900 dark:text-binance-text-primary">{formatCurrency(totalDeposits)}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-binance-text-secondary">VIP Level Cost</div>
              <div className="font-bold text-gray-900 dark:text-binance-text-primary">{formatCurrency(fullVipCost)}</div>
            </div>
          </div>

          {/* Missing Amount */}
          {!canAfford && (
            <div className="bg-gray-50 dark:bg-binance-dark-tertiary border border-gray-200 dark:border-binance-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 dark:text-binance-text-secondary text-sm">Amount Needed</div>
                  <div className="font-bold text-binance-yellow">{formatCurrency(amountNeededForFullVip)}</div>
                </div>
                <div className="w-8 h-8 bg-binance-yellow rounded-full flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {canAfford && (
            <div className="bg-gray-50 dark:bg-binance-dark-tertiary border border-gray-200 dark:border-binance-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 dark:text-binance-text-secondary text-sm">Ready to Upgrade!</div>
                  <div className="font-bold text-binance-green">You have sufficient deposits</div>
                </div>
                <div className="w-8 h-8 bg-binance-green rounded-full flex items-center justify-center">
                  <span className="text-sm">✅</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showUpgradeButton && (
          <div className="pt-4">
            {canAfford ? (
              <button 
                onClick={() => onUpgradeClick && onUpgradeClick(nextLevel)}
                className="w-full btn-primary flex items-center justify-center"
              >
                <span className="mr-2">🚀</span>
                Upgrade to {nextLevel.name}
              </button>
            ) : (
              <Link 
                to="/vip-selection"
                className="w-full btn-secondary flex items-center justify-center"
              >
                <span className="mr-2">💳</span>
                Deposit & Upgrade
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VipUpgradeProgress;
