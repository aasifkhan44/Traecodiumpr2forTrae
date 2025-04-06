import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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

const WalletRecharge = () => {
  // Payment settings and options
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [errorSettings, setErrorSettings] = useState(null);
  
  // Form state
  const [paymentMode, setPaymentMode] = useState('upi');
  const [selectedUpi, setSelectedUpi] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
  // Reference for copy action 
  const paymentAddressRef = useRef(null);
  
  // Fetch payment settings
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      setLoadingSettings(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setErrorSettings('Authentication required');
          setLoadingSettings(false);
          return;
        }
        
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const response = await axios.get(`${API_BASE_URL}/api/deposit/payment-options`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const validatedData = {
            ...response.data.data,
            upiOptions: response.data.data.upiOptions.filter(upi => upi && upi.upiId && upi.name),
            cryptoOptions: response.data.data.cryptoOptions.filter(crypto => crypto && crypto.address && crypto.currency)
          };
          setPaymentSettings(validatedData);
        } else {
          setErrorSettings('Failed to load payment options');
        }
      } catch (error) {
        console.error('Error fetching payment settings:', error);
        setErrorSettings('Failed to load payment options');
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchPaymentSettings();
  }, []);
  
  // Fetch deposit request history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        
        // Get token
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingHistory(false);
          return;
        }
        
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const response = await axios.get(`${API_BASE_URL}/api/deposit/my-requests`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.data) {
          setRequestHistory(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching deposit history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchHistory();
  }, [success]);
  
  // Calculate converted amount for crypto
  useEffect(() => {
    if (paymentMode === 'crypto' && selectedCrypto && amount) {
      const converted = parseFloat(amount) / selectedCrypto.conversionRate;
      setConvertedAmount(converted.toFixed(6));
    }
  }, [paymentMode, selectedCrypto, amount]);
  
  // Handle payment mode change
  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    setReferenceNumber('');
  };
  
  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };
  
  // Handle UPI selection
  const handleUpiSelect = (upi) => {
    setSelectedUpi(upi);
    setPaymentApp(upi.name);
  };
  
  // Handle Crypto selection
  const handleCryptoSelect = (crypto) => {
    setSelectedCrypto(crypto);
  };
  
  // Copy payment address to clipboard
  const copyToClipboard = () => {
    if (paymentAddressRef.current) {
      const textToCopy = paymentAddressRef.current.textContent;
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 3000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };
  
  // Submit deposit request
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
          (parseFloat(amount) < paymentSettings.minimumDepositAmount || 
           parseFloat(amount) > paymentSettings.maximumDepositAmount)) {
        setError(`Amount must be between ${paymentSettings.minimumDepositAmount} and ${paymentSettings.maximumDepositAmount}`);
        setLoading(false);
        return;
      }
      
      if (!referenceNumber) {
        setError(`Please enter ${paymentMode === 'upi' ? 'UTR number' : 'Reference number'}`);
        setLoading(false);
        return;
      }
      
      // Build request data
      const requestData = {
        amount: parseFloat(amount),
        paymentMode,
        referenceNumber,
        convertedAmount: paymentMode === 'crypto' ? parseFloat(convertedAmount) : parseFloat(amount)
      };
      
      // Add payment specific fields
      if (paymentMode === 'upi' && selectedUpi) {
        requestData.paymentApp = paymentApp;
        requestData.upiId = selectedUpi.upiId;
      } else if (paymentMode === 'crypto' && selectedCrypto) {
        requestData.cryptoCurrency = selectedCrypto.currency;
        requestData.cryptoAddress = selectedCrypto.address;
      }
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_BASE_URL}/api/deposit/create-request`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Reset form
        setAmount('');
        setReferenceNumber('');
        setPaymentApp('');
        setShowConfirmation(false);
      } else {
        setError(response.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting deposit request:', error);
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
        <h1 className="text-2xl font-bold mb-6">Wallet Recharge</h1>
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="ml-2">Loading payment options...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (errorSettings) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Wallet Recharge</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{errorSettings}</p>
        </div>
        <Link to="/profile" className="text-primary hover:underline flex items-center">
          <FaArrowLeft className="mr-1" /> Back to Profile
        </Link>
      </div>
    );
  }
  
  // Success message
  if (success) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Wallet Recharge</h1>
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p className="font-bold flex items-center">
            <FaCheck className="mr-2" /> Success!
          </p>
          <p>Your deposit request has been submitted successfully. Our team will review it shortly.</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
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
                        {request.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">
                        {request.paymentMode}
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
      <h1 className="text-2xl font-bold mb-6">Wallet Recharge</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Instructions */}
      {paymentSettings?.depositInstructions && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-blue-800 mb-2">Instructions</h2>
          <p className="text-blue-700">{paymentSettings.depositInstructions}</p>
        </div>
      )}
      
      {!showConfirmation ? (
        /* Step 1: Payment Form */
        <form onSubmit={handleConfirmation} className="bg-white p-6 rounded-lg shadow-md mb-8">
          {/* Payment Mode Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                  paymentMode === 'upi' 
                    ? 'border-primary bg-primary bg-opacity-10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePaymentModeChange('upi')}
              >
                <FaCreditCard className={`text-2xl mb-2 ${paymentMode === 'upi' ? 'text-primary' : 'text-gray-500'}`} />
                <span className={`font-medium ${paymentMode === 'upi' ? 'text-primary' : 'text-gray-700'}`}>UPI</span>
              </button>
              
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                  paymentMode === 'crypto' 
                    ? 'border-primary bg-primary bg-opacity-10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePaymentModeChange('crypto')}
              >
                <FaBitcoin className={`text-2xl mb-2 ${paymentMode === 'crypto' ? 'text-primary' : 'text-gray-500'}`} />
                <span className={`font-medium ${paymentMode === 'crypto' ? 'text-primary' : 'text-gray-700'}`}>Crypto</span>
              </button>
            </div>
          </div>
          
          {/* UPI Options */}
          {paymentMode === 'upi' && paymentSettings?.upiOptions && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select UPI Option
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSettings.upiOptions.map((upi, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedUpi && selectedUpi.upiId === upi.upiId 
                        ? 'border-primary bg-primary bg-opacity-5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleUpiSelect(upi)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full">
                        <FaWallet className="text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium">{upi.name}</div>
                        <div className="text-sm text-gray-600">{upi.upiId}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedUpi && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center mb-4">
                    {selectedUpi.svgCode ? (
                      <div 
                        className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3" 
                        dangerouslySetInnerHTML={{ __html: selectedUpi.svgCode }} 
                      />
                    ) : (
                      <div className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-lg mb-3">
                        <FaWallet className="text-gray-400 text-5xl" />
                      </div>
                    )}
                    <div className="w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <span className="text-gray-700 font-medium mb-1 sm:mb-0">UPI ID:</span>
                        <div className="flex items-center">
                          <span ref={paymentAddressRef} className="mr-2 text-red-600 font-medium break-all">{selectedUpi.upiId}</span>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center text-primary px-2 py-1 rounded hover:bg-gray-200 text-sm"
                            title="Copy to clipboard"
                          >
                            {copiedToClipboard ? <FaCheck className="mr-1" /> : <FaClipboard className="mr-1" />}
                            {copiedToClipboard ? "Copied!" : "Copy this UPI"}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Make payment to this UPI ID and enter the UTR number below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Crypto Options */}
          {paymentMode === 'crypto' && paymentSettings?.cryptoOptions && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select Cryptocurrency
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSettings.cryptoOptions.map((crypto, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedCrypto && selectedCrypto.currency === crypto.currency 
                        ? 'border-primary bg-primary bg-opacity-5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCryptoSelect(crypto)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full">
                        <FaCoins className="text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium">{crypto.currency}</div>
                        <div className="text-sm text-gray-600">Rate: 1 {crypto.currency} = {crypto.conversionRate}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedCrypto && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center mb-4">
                    {selectedCrypto.svgCode ? (
                      <div 
                        className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3" 
                        dangerouslySetInnerHTML={{ __html: selectedCrypto.svgCode }} 
                      />
                    ) : (
                      <div className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-lg mb-3">
                        <FaCoins className="text-gray-400 text-5xl" />
                      </div>
                    )}
                    <div className="w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <span className="text-gray-700 font-medium mb-1 sm:mb-0">{selectedCrypto.currency} Address:</span>
                        <div className="flex items-center flex-wrap">
                          <span ref={paymentAddressRef} className="mr-2 text-xs md:text-sm break-all text-red-600 font-medium">{selectedCrypto.address}</span>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center text-primary px-2 py-1 rounded hover:bg-gray-200 text-sm flex-shrink-0 mt-1 sm:mt-0"
                            title="Copy to clipboard"
                          >
                            {copiedToClipboard ? <FaCheck className="mr-1" /> : <FaClipboard className="mr-1" />}
                            {copiedToClipboard ? "Copied!" : "Copy this address"}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Send {selectedCrypto.currency} to this address and enter the transaction reference number below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
              Amount (in game currency)
            </label>
            <input
              type="text"
              id="amount"
              className="input w-full"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Min: ${paymentSettings?.minimumDepositAmount || 100}, Max: ${paymentSettings?.maximumDepositAmount || 10000}`}
              required
            />
            {paymentMode === 'crypto' && selectedCrypto && amount && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Total Payable: </span>
                <span className="font-medium text-red-600">{convertedAmount} {selectedCrypto.currency}</span>
              </div>
            )}
          </div>
          
          {/* Payment App (for UPI) */}
          {paymentMode === 'upi' && (
            <input
              type="hidden"
              id="paymentApp"
              name="paymentApp"
              value={paymentApp}
            />
          )}
          
          {/* Reference Number */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="referenceNumber">
              {paymentMode === 'upi' ? 'UTR Number' : 'Transaction Reference Number'}
            </label>
            <input
              type="text"
              id="referenceNumber"
              className="input w-full"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={paymentMode === 'upi' ? 'Enter 12-digit UTR number' : 'Enter transaction reference/hash'}
              required
            />
            <p className="mt-1 text-sm text-gray-600">
              {paymentMode === 'upi' 
                ? 'You can find UTR number in your payment app transaction details.' 
                : 'Enter the transaction hash or reference ID from your crypto wallet.'}
            </p>
          </div>
          
          <div className="flex justify-between">
            <Link to="/profile" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
              Continue
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Confirmation */
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Confirm Deposit Request</h2>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Payment Mode</p>
                <p className="font-medium capitalize">{paymentMode}</p>
              </div>
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="font-medium">{amount}</p>
              </div>
              
              {paymentMode === 'upi' && (
                <>
                  <div>
                    <p className="text-gray-600">UPI ID</p>
                    <p className="font-medium">{selectedUpi?.upiId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment App</p>
                    <p className="font-medium">{paymentApp}</p>
                  </div>
                </>
              )}
              
              {paymentMode === 'crypto' && (
                <>
                  <div>
                    <p className="text-gray-600">Cryptocurrency</p>
                    <p className="font-medium">{selectedCrypto?.currency}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-bold">Total Payable</p>
                    <p className="font-bold text-red-600">{convertedAmount} {selectedCrypto?.currency}</p>
                  </div>
                </>
              )}
              
              <div className="col-span-2">
                <p className="text-gray-600">{paymentMode === 'upi' ? 'UTR Number' : 'Reference Number'}</p>
                <p className="font-medium">{referenceNumber}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-yellow-600 mt-1 mr-2 flex-shrink-0" />
              <p className="text-yellow-800 text-sm">
                Please ensure all the details are correct. Once submitted, your request will be processed by our team.
                The amount will be credited to your wallet after verification.
              </p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBackToForm}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <FaSpinner className="animate-spin mr-2 inline" /> : null}
              Confirm and Submit
            </button>
          </div>
        </div>
      )}
      
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
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
                      {request.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {request.paymentMode}
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
};

export default WalletRecharge;
