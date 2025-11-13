import React from 'react';
import { Button } from './ui/Button';

const TransactionDetailsModal = ({ isOpen, onClose, transactionData, onConfirm }) => {
  if (!isOpen || !transactionData) return null;

  const {
    found,
    foundOnNetwork,
    suggestedAmount,
    recipientAddress,
    senderAddress,
    blockNumber,
    isConfirmed,
    isTokenTransfer,
    isRecipientMatching,
    expectedCompanyAddress,
    companyAddresses
  } = transactionData;

  if (!found) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Not Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              The transaction hash was not found on any supported blockchain network.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg ${
            isRecipientMatching 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center">
              {isRecipientMatching ? (
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              <span className={`font-medium ${
                isRecipientMatching ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {isRecipientMatching 
                  ? '✅ Transaction Verified - Ready to Create Deposit' 
                  : '⚠️ Transaction Found - Recipient Address Mismatch'
                }
              </span>
            </div>
          </div>

          {/* Transaction Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Transaction Information</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-medium">{foundOnNetwork}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">{suggestedAmount} USDT</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Block Number:</span>
                  <span className="font-mono text-sm">{blockNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isConfirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
                
                {isTokenTransfer && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-blue-600">ERC-20 Token Transfer</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address Verification */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Address Verification</h3>
              
              <div className="space-y-4">
                {/* Recipient Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Recipient Address:</span>
                    {isRecipientMatching ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded border font-mono text-xs break-all">
                    {recipientAddress}
                  </div>
                  {!isRecipientMatching && expectedCompanyAddress && (
                    <div className="mt-2 text-xs text-red-600">
                      Expected: {expectedCompanyAddress}
                    </div>
                  )}
                </div>

                {/* Sender Address */}
                <div>
                  <span className="text-gray-600 block mb-2">Sender Address:</span>
                  <div className="bg-gray-50 p-3 rounded border font-mono text-xs break-all">
                    {senderAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Addresses Reference */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Our Company Addresses</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(companyAddresses || {}).map(([network, address]) => (
                <div key={network} className="flex justify-between">
                  <span className="text-gray-600">{network}:</span>
                  <span className="font-mono break-all">{address}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {isRecipientMatching && (
            <Button 
              onClick={() => onConfirm(transactionData)}
              className="bg-green-600 hover:bg-green-700"
            >
              ✅ Create Deposit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;
