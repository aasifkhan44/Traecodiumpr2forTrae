import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaWallet, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaBitcoin, 
  FaClipboard, 
  FaArrowLeft,
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
  FaCoins
} from 'react-icons/fa';
import api from '../utils/api';

const Withdrawal = () => {
  // Payment settings and options
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [errorSettings, setErrorSettings] = useState(null);
  
  // Form state
  const [withdrawalMode, setWithdrawalMode] = useState('upi');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [selectedUpiOption, setSelectedUpiOption] = useState(null);
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  
  // Initialize form values
  useEffect(() => {
    setAmount('');
    setConvertedAmount('');
    setUpiId('');
    setCryptoAddress('');
    setWithdrawalFee(0);
    setFinalAmount(0);
    setSelectedUpiOption(null);
    setSelectedCrypto(null);
  }, [withdrawalMode]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Fetch payment settings
  useEffect(() => {
    const fetchWithdrawalSettings = async () => {
      setLoadingSettings(true);
      try {
        const response = await api.get('/withdrawal/options');
        
        if (response.data.success) {
          // Log the received data to debug icon issues
          console.log("Received withdrawal options:", response.data.data);
          if (response.data.data.upiOptions) {
            console.log("UPI Options with imageUrls:", response.data.data.upiOptions.map(opt => ({
              name: opt.name,
              imageUrl: opt.imageUrl
            })));
          }
          if (response.data.data.cryptoOptions) {
            console.log("Crypto Options with imageUrls:", response.data.data.cryptoOptions.map(opt => ({
              currency: opt.currency,
              imageUrl: opt.imageUrl
            })));
          }
          
          // Ensure imageUrl is properly set for all options
          if (response.data.data.upiOptions) {
            response.data.data.upiOptions = response.data.data.upiOptions.map(option => ({
              ...option,
              // Make sure imageUrl is a valid URL or empty string
              imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
            }));
          }
          
          if (response.data.data.cryptoOptions) {
            response.data.data.cryptoOptions = response.data.data.cryptoOptions.map(option => ({
              ...option,
              // Make sure imageUrl is a valid URL or empty string
              imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
            }));
          }
          
          setPaymentSettings(response.data.data);
        } else {
          setErrorSettings('Failed to load withdrawal options. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching withdrawal settings:', error);
        setErrorSettings(
          error.response?.status === 404 
            ? 'Withdrawal service is currently unavailable. Please try again later.'
            : 'Failed to load withdrawal options. Please try again.'
        );
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchWithdrawalSettings();
  }, []);
  
  // Function to retry loading withdrawal settings
  const retryLoadingSettings = () => {
    setErrorSettings(null);
    setLoadingSettings(true);
    
    const fetchWithdrawalSettings = async () => {
      try {
        const response = await api.get('/withdrawal/options');
        
        if (response.data.success) {
          // Ensure imageUrl is properly set for all options
          if (response.data.data.upiOptions) {
            response.data.data.upiOptions = response.data.data.upiOptions.map(option => ({
              ...option,
              // Make sure imageUrl is a valid URL or empty string
              imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
            }));
          }
          
          if (response.data.data.cryptoOptions) {
            response.data.data.cryptoOptions = response.data.data.cryptoOptions.map(option => ({
              ...option,
              // Make sure imageUrl is a valid URL or empty string
              imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
            }));
          }
          
          setPaymentSettings(response.data.data);
        } else {
          setErrorSettings('Failed to load withdrawal options');
        }
      } catch (error) {
        console.error('Error fetching withdrawal settings:', error);
        setErrorSettings('Failed to load withdrawal options. Please try again.');
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchWithdrawalSettings();
  };
  
  // Fetch withdrawal request history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        
        const response = await api.get('/withdrawal/my-requests');
        
        if (response.data.success && response.data.data) {
          setRequestHistory(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching withdrawal history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchHistory();
  }, [success]);
  
  // Calculate converted amount based on withdrawal mode
  useEffect(() => {
    if (amount) {
      if (withdrawalMode === 'crypto' && selectedCrypto) {
        // For crypto, apply the conversion rate from the selected crypto option
        const converted = parseFloat(amount) / selectedCrypto.conversionRate;
        setConvertedAmount(converted.toFixed(6));
      } else if (withdrawalMode === 'upi' && selectedUpiOption) {
        // For UPI, apply the conversion rate from the selected UPI option
        if (selectedUpiOption.conversionRate && selectedUpiOption.conversionRate !== 1) {
          const converted = parseFloat(amount) / selectedUpiOption.conversionRate;
          setConvertedAmount(converted.toFixed(2));
        } else {
          setConvertedAmount(amount); // No conversion if rate is 1
        }
      }
    }
  }, [withdrawalMode, selectedCrypto, selectedUpiOption, amount]);
  
  // Calculate withdrawal fee and final amount with currency conversion
  useEffect(() => {
    if (paymentSettings && convertedAmount) {
      const amountValue = parseFloat(convertedAmount) || 0;
      let fee = 0;
      let conversionRate = 1;
      let feeType = 'fixed';
      let withdrawalFeeValue = 0;
      
      // Get fee and conversion rate based on withdrawal mode
      if (withdrawalMode === 'upi' && selectedUpiOption) {
        withdrawalFeeValue = parseFloat(selectedUpiOption.withdrawalFee) || 0;
        feeType = selectedUpiOption.feeType || 'fixed';
        conversionRate = selectedUpiOption.conversionRate || 1;
      } else if (withdrawalMode === 'crypto' && selectedCrypto) {
        withdrawalFeeValue = parseFloat(selectedCrypto.withdrawalFee) || 0;
        feeType = selectedCrypto.feeType || 'fixed';
        conversionRate = selectedCrypto.conversionRate || 1;
      }
      
      // Calculate fee based on fee type
      if (feeType === 'percent') {
        // Percentage-based fee
        fee = (amountValue * withdrawalFeeValue) / 100;
      } else {
        // Fixed fee
        fee = withdrawalFeeValue;
      }
      
      // Apply minimum fee if applicable
      const minFee = parseFloat(paymentSettings.minimumWithdrawalFee) || 0;
      if (minFee > 0 && fee < minFee) {
        fee = minFee;
      }
      
      // Round fee to 2 decimal places
      fee = Math.round(fee * 100) / 100;
      
      setWithdrawalFee(fee);
      setFinalAmount(Math.max(0, amountValue - fee));
    }
  }, [paymentSettings, convertedAmount, withdrawalMode, selectedCrypto]);
  
  // Handle payment mode change
  const handleWithdrawalModeChange = (mode) => {
    setWithdrawalMode(mode);
    setUpiId('');
    setCryptoAddress('');
    setSelectedCrypto(null);
  };
  
  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };
  
  // Handle Crypto selection
  const handleCryptoSelect = (crypto) => {
    setSelectedCrypto(crypto);
  };

  // Handle UPI option selection
  const handleUpiOptionSelect = (upiOption) => {
    setSelectedUpiOption(upiOption);
  };
  
  // Submit withdrawal request
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validation
      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }
      
      if (paymentSettings && 
          (parseFloat(amount) < paymentSettings.minimumWithdrawalAmount || 
           parseFloat(amount) > paymentSettings.maximumWithdrawalAmount)) {
        setError(`Amount must be between ${paymentSettings.minimumWithdrawalAmount} and ${paymentSettings.maximumWithdrawalAmount}`);
        setLoading(false);
        return;
      }
      
      if (withdrawalMode === 'upi' && !upiId) {
        setError('Please enter your UPI ID');
        setLoading(false);
        return;
      }
      
      if (withdrawalMode === 'crypto' && !cryptoAddress) {
        setError('Please enter your crypto wallet address');
        setLoading(false);
        return;
      }
      
      if (withdrawalMode === 'crypto' && !selectedCrypto) {
        setError('Please select a cryptocurrency');
        setLoading(false);
        return;
      }
      
      // Build request data
      const requestData = {
        amount: parseFloat(amount),
        withdrawalMode,
        fee: withdrawalFee,
        finalAmount: parseFloat(finalAmount.toFixed(2)) // Ensure finalAmount matches what's shown to user
      };
      
      // Add payment specific fields
      if (withdrawalMode === 'upi') {
        requestData.upiId = upiId;
      } else if (withdrawalMode === 'crypto') {
        requestData.cryptoCurrency = selectedCrypto.currency;
        requestData.cryptoAddress = cryptoAddress;
      }
      
      const response = await api.post('/withdrawal/create-request', requestData);
      
      if (response.data.success) {
        setSuccess(true);
        // Reset form
        setAmount('');
        setUpiId('');
        setCryptoAddress('');
        setShowConfirmation(false);
      } else {
        setError(response.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      setError(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Confirmation step
  const handleConfirmation = (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };
  
  // Back to form
  const handleBackToForm = () => {
    setShowConfirmation(false);
  };
  
  // Loading state
  if (loadingSettings) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Withdraw Funds</h1>
          <Link to="/wallet/recharge" className="btn btn-outline btn-primary">
            Recharge Wallet
          </Link>
        </div>
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="ml-2">Loading withdrawal options...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (errorSettings) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Withdraw Funds</h1>
          <Link to="/wallet/recharge" className="btn btn-outline btn-primary">
            Recharge Wallet
          </Link>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{errorSettings}</p>
        </div>
        <div className="flex space-x-4 mt-4 mb-4">
          <button 
            onClick={() => {
              setErrorSettings(null);
              setLoadingSettings(true);
              
              // Retry fetching withdrawal settings
              const fetchWithdrawalSettings = async () => {
                try {
                  const response = await api.get('/withdrawal/options');
                  
                  if (response.data.success) {
                    // Ensure imageUrl is properly set for all options
                    if (response.data.data.upiOptions) {
                      response.data.data.upiOptions = response.data.data.upiOptions.map(option => ({
                        ...option,
                        // Make sure imageUrl is a valid URL or empty string
                        imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
                      }));
                    }
                    
                    if (response.data.data.cryptoOptions) {
                      response.data.data.cryptoOptions = response.data.data.cryptoOptions.map(option => ({
                        ...option,
                        // Make sure imageUrl is a valid URL or empty string
                        imageUrl: option.imageUrl && typeof option.imageUrl === 'string' ? option.imageUrl : ''
                      }));
                    }
                    
                    setPaymentSettings(response.data.data);
                  } else {
                    setErrorSettings('Failed to load withdrawal options');
                  }
                } catch (error) {
                  console.error('Error fetching withdrawal settings:', error);
                  setErrorSettings('Failed to load withdrawal options. Please try again.');
                } finally {
                  setLoadingSettings(false);
                }
              };
              
              fetchWithdrawalSettings();
            }} 
            className="btn btn-primary flex items-center"
          >
            <FaSpinner className={`mr-2 ${loadingSettings ? 'animate-spin' : 'hidden'}`} />
            Retry
          </button>
          <Link to="/profile" className="btn btn-outline flex items-center">
            <FaArrowLeft className="mr-1" /> Back to Profile
          </Link>
        </div>
      </div>
    );
  }
  
  // Success message
  if (success) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Withdraw Funds</h1>
          <Link to="/wallet/recharge" className="btn btn-outline btn-primary">
            Recharge Wallet
          </Link>
        </div>
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p className="font-bold flex items-center">
            <FaCheck className="mr-2" /> Success!
          </p>
          <p>Your withdrawal request has been submitted successfully. Our team will review it shortly.</p>
        </div>
        
        <div className="flex space-x-4 mb-8">
          <button 
            onClick={() => setSuccess(false)} 
            className="btn btn-primary"
          >
            Make Another Request
          </button>
          <Link to="/profile" className="btn btn-secondary">
            Back to Profile
          </Link>
        </div>
        
        {/* Recent Requests */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
          {loadingHistory ? (
            <p className="text-center p-4">
              <FaSpinner className="animate-spin inline mr-2" />
              Loading history...
            </p>
          ) : requestHistory.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requestHistory.map((request) => (
                    <tr key={request._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.finalAmount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">
                        {request.withdrawalMode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center p-4 bg-gray-50 rounded">No requests found</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Withdraw Funds</h1>
        <Link to="/wallet/recharge" className="btn btn-outline btn-primary">
          Recharge Wallet
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Instructions */}
      {paymentSettings?.withdrawalInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-blue-800 mb-2">Instructions</h2>
          <p className="text-blue-700">{paymentSettings.withdrawalInstructions}</p>
        </div>
      )}
      
      {!showConfirmation ? (
        /* Step 1: Withdrawal Form */
        <form onSubmit={handleConfirmation} className="bg-white p-6 rounded-lg shadow-md mb-8">
          {/* Withdrawal Mode Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Withdrawal Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                  withdrawalMode === 'upi' 
                    ? 'border-primary bg-primary bg-opacity-10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleWithdrawalModeChange('upi')}
              >
                <FaCreditCard className={`text-2xl mb-2 ${withdrawalMode === 'upi' ? 'text-primary' : 'text-gray-500'}`} />
                <span className={`font-medium ${withdrawalMode === 'upi' ? 'text-primary' : 'text-gray-700'}`}>UPI</span>
              </button>
              
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                  withdrawalMode === 'crypto' 
                    ? 'border-primary bg-primary bg-opacity-10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleWithdrawalModeChange('crypto')}
              >
                <FaBitcoin className={`text-2xl mb-2 ${withdrawalMode === 'crypto' ? 'text-primary' : 'text-gray-500'}`} />
                <span className={`font-medium ${withdrawalMode === 'crypto' ? 'text-primary' : 'text-gray-700'}`}>Crypto</span>
              </button>
            </div>
          </div>
          
          {/* Amount */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
              Amount
            </label>
            <div className="relative">
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter amount"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FaCoins className="text-gray-400" />
              </div>
            </div>
            {paymentSettings && (
              <p className="text-sm text-gray-600 mt-1">
                Min: {paymentSettings.minimumWithdrawalAmount} | Max: {paymentSettings.maximumWithdrawalAmount}
              </p>
            )}
          </div>
          
          {/* Fee and Conversion Information - Only shown after option selection */}
          {amount && ((withdrawalMode === 'upi' && selectedUpiOption) || (withdrawalMode === 'crypto' && selectedCrypto)) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Fee & Conversion Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span>₹{amount}</span>
                </div>
                
                {withdrawalMode === 'upi' && selectedUpiOption && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span>1:{selectedUpiOption.conversionRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Converted Amount:</span>
                      <span>₹{convertedAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee ({selectedUpiOption.feeType === 'percent' ? `${selectedUpiOption.withdrawalFee}%` : 'Fixed'}):</span>
                      <span className="text-red-500">-₹{withdrawalFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span className="text-gray-700">Final Amount:</span>
                      <span className="text-green-600">₹{finalAmount.toFixed(2)}</span>
                    </div>
                    
                    {/* Additional UPI Details */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">UPI App:</span>
                      <span>{selectedUpiOption.name}</span>
                    </div>
                  </>
                )}
                
                {withdrawalMode === 'crypto' && selectedCrypto && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span>1:{selectedCrypto.conversionRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Converted Amount:</span>
                      <span>{convertedAmount} {selectedCrypto.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee ({selectedCrypto.feeType === 'percent' ? `${selectedCrypto.withdrawalFee}%` : 'Fixed'}):</span>
                      <span className="text-red-500">-{withdrawalFee.toFixed(6)} {selectedCrypto.currency}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span className="text-gray-700">Final Amount:</span>
                      <span className="text-green-600">{(convertedAmount - withdrawalFee).toFixed(6)} {selectedCrypto.currency}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* UPI ID Input - Only shown after UPI option selection */}
          {withdrawalMode === 'upi' && selectedUpiOption && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="Enter your UPI ID (e.g., name@upi)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
          )}

          {/* Crypto Address Input - Only shown after crypto selection */}
          {withdrawalMode === 'crypto' && selectedCrypto && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedCrypto.currency} Wallet Address
              </label>
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder={`Enter your ${selectedCrypto.currency} wallet address`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
          )}
          
          {/* UPI Options */}
          {withdrawalMode === 'upi' && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Select UPI Option</label>
              {paymentSettings?.upiOptions && paymentSettings.upiOptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {paymentSettings.upiOptions.map((option, index) => {
                    // Debug the imageUrl for this option
                    console.log(`Rendering UPI option ${option.name} with imageUrl:`, option.imageUrl);
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedUpiOption === option 
                            ? 'border-primary bg-primary bg-opacity-5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleUpiOptionSelect(option)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full">
                            {option.imageUrl ? (
                              <img 
                                src={option.imageUrl} 
                                alt={option.name} 
                                className="w-6 h-6 object-contain" 
                                onError={(e) => {
                                  console.log(`Failed to load image for ${option.name}:`, option.imageUrl);
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/24?text=' + encodeURIComponent(option.name.charAt(0));
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                {option.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{option.name}</div>
                            {option.withdrawalFee > 0 && (
                              <div className="text-sm text-gray-600">
                                Fee: {option.feeType === 'percent' ? `${option.withdrawalFee}%` : `₹${option.withdrawalFee}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-yellow-700">No UPI withdrawal options are currently available.</p>
                  <button
                    onClick={() => setWithdrawalMode('crypto')}
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Switch to Cryptocurrency
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Crypto Options */}
          {withdrawalMode === 'crypto' && (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Select Cryptocurrency</label>
                {paymentSettings?.cryptoOptions && paymentSettings.cryptoOptions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentSettings.cryptoOptions.map((crypto, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedCrypto === crypto 
                            ? 'border-primary bg-primary bg-opacity-5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleCryptoSelect(crypto)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full">
                            {crypto.imageUrl ? (
                              <img 
                                src={crypto.imageUrl} 
                                alt={crypto.currency} 
                                className="w-6 h-6 object-contain" 
                                onError={(e) => {
                                  console.log(`Failed to load image for ${crypto.currency}:`, crypto.imageUrl);
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/24?text=' + encodeURIComponent(crypto.currency.charAt(0));
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">
                                {crypto.currency.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{crypto.currency}</div>
                            <div className="text-sm text-gray-600">Rate: 1 {crypto.currency} = {crypto.conversionRate}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-yellow-700">No cryptocurrency withdrawal options are currently available.</p>
                    <button
                      onClick={() => setWithdrawalMode('upi')}
                      className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Switch to UPI
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="mt-6">
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={!amount || (withdrawalMode === 'upi' && !upiId) || (withdrawalMode === 'crypto' && (!selectedCrypto || !cryptoAddress))}
            >
              Proceed to Confirmation
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Confirmation */
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Confirm Withdrawal</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Withdrawal Method:</span>
              <span className="font-medium capitalize">{withdrawalMode}</span>
            </div>
            
            {withdrawalMode === 'upi' && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">UPI ID:</span>
                  <span className="font-medium">{upiId}</span>
                </div>
              </>
            )}
            
            {withdrawalMode === 'crypto' && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Cryptocurrency:</span>
                  <span className="font-medium">{selectedCrypto?.currency}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium break-all">{cryptoAddress}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{amount}</span>
            </div>
            
            <div className="space-y-2">
              {withdrawalMode === 'upi' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Converted Amount:</span>
                    <span className="font-medium">₹{convertedAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Fee:</span>
                    <span className="font-medium text-red-600">-₹{withdrawalFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-semibold">Final Amount:</span>
                    <span className="font-medium text-green-600">₹{(convertedAmount - withdrawalFee).toFixed(2)}</span>
                  </div>
                </>
              ) : withdrawalMode === 'crypto' && selectedCrypto ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span>₹{amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span>1:{selectedCrypto.conversionRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Converted Amount:</span>
                    <span>{convertedAmount} {selectedCrypto.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee ({selectedCrypto.feeType === 'percent' ? `${selectedCrypto.withdrawalFee}%` : 'Fixed'}):</span>
                    <span className="font-medium text-red-600">-{withdrawalFee.toFixed(6)} {selectedCrypto.currency}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-semibold">Final Amount:</span>
                    <span className="font-medium text-green-600">{(convertedAmount - withdrawalFee).toFixed(6)} {selectedCrypto.currency}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <p className="text-yellow-700 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              Please verify all details carefully. Once submitted, withdrawal requests cannot be modified.
            </p>
          </div>
          
          <div className="flex justify-between">
            <button 
              type="button" 
              onClick={handleBackToForm} 
              className="btn btn-secondary"
            >
              Back to Form
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawal;