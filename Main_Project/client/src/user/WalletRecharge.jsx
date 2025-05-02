import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { API_BASE_URL } from '../utils/api';
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
  FaCoins,
  FaHistory,
  FaSave
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
        const response = await api.get('/deposit/payment-options');
        
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
        
        const response = await api.get('/deposit/my-requests');
        
        if (response.data.success && response.data.data) {
          setRequestHistory(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching deposit history:', error);
        setError('Failed to load deposit history');
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchHistory();
  }, [success]);
  
  // Calculate converted amount for UPI and Crypto, including admin deduction/fees if present
  useEffect(() => {
    let converted = '';
    let deduction = 0;
    let feeLabel = '';

    if (amount && paymentSettings) {
      if (paymentMode === 'crypto' && selectedCrypto) {
        // Use admin-set conversionRate and fee if present
        const rate = selectedCrypto.conversionRate || 1;
        converted = (parseFloat(amount) / rate) || '';
        // If there are deduction/fee fields, apply here (example: feePercent, fixedFee)
        // Example: if (selectedCrypto.feePercent) deduction = converted * (selectedCrypto.feePercent / 100);
      } else if (paymentMode === 'upi' && selectedUpi) {
        // Use admin-set conversionRate and fee if present
        const rate = selectedUpi.conversionRate || 1;
        converted = (parseFloat(amount) / rate) || '';
        // If there are deduction/fee fields, apply here
      }
    }
    setConvertedAmount(converted ? Number(converted).toFixed(6) : '');
  }, [paymentMode, selectedCrypto, selectedUpi, amount, paymentSettings]);
  
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
      
      const response = await api.post('/deposit/create-request', requestData);
      
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
      <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
        <h1 className="text-2xl font-bold text-white drop-shadow mb-6 text-center flex items-center"><FaWallet className="mr-2" /> Wallet Recharge</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center">
            <FaSpinner className="animate-spin text-3xl text-primary" />
            <p className="ml-2 text-blue-800">Loading payment options...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (errorSettings) {
    return (
      <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
        <h1 className="text-2xl font-bold text-white drop-shadow mb-6 text-center flex items-center"><FaWallet className="mr-2" /> Wallet Recharge</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center">
            <FaExclamationTriangle className="text-red-500 text-2xl mr-2" />
            <span className="text-red-700">{errorSettings}</span>
          </div>
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
      <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
        <h1 className="text-2xl font-bold text-white drop-shadow mb-6 text-center flex items-center"><FaWallet className="mr-2" /> Wallet Recharge</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center">
            <FaCheck className="text-green-500 text-2xl mr-2" />
            <span className="text-green-700">Recharge request submitted successfully!</span>
          </div>
        </div>
        
        <div className="flex space-x-4 mb-8">
          <button 
            onClick={() => setSuccess(false)} 
            className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white px-4 py-2 rounded font-bold flex items-center shadow hover:scale-105 hover:shadow-lg transition"
          >
            Make Another Request
          </button>
          <Link to="/profile" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Profile
          </Link>
        </div>
        
        {/* Recent Requests */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-blue-800 flex items-center"><FaHistory className="mr-2" /> Recent Requests</h2>
          {loadingHistory ? (
            <p className="text-center p-4">
              <FaSpinner className="animate-spin inline mr-2" />
              <span className="text-blue-800">Loading history...</span>
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
            <p className="text-center p-4 bg-gray-50 rounded text-gray-600">No requests found</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      <h1 className="text-2xl font-bold text-white drop-shadow mb-6 text-center flex items-center"><FaWallet className="mr-2" /> Wallet Recharge</h1>
      {/* Opposite page button at top - perfectly matched to Recharge button on withdrawal page */}
      <div className="flex items-center justify-end mb-6 mt-0">
        <Link
          to="/wallet/withdraw"
          className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white font-bold px-6 py-2 rounded-lg flex items-center shadow hover:scale-105 hover:shadow-lg transition min-w-[160px] justify-center border-2 border-yellow-400"
          style={{ minHeight: '48px' }}
        >
          <FaMoneyBillWave className="mr-2 text-lg" /> Withdraw
        </Link>
      </div>
      
      {error && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center">
            <FaExclamationTriangle className="text-yellow-500 text-2xl mr-2" />
            <span className="text-yellow-700">{error}</span>
          </div>
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
        <form onSubmit={handleConfirmation} className="space-y-4 bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Payment Mode Selection */}
          <div className="mb-6">
            <label className="block text-white text-sm font-bold mb-2">Select Payment Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${paymentMode === 'upi' ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}`}
                onClick={() => handlePaymentModeChange('upi')}
              >
                <FaCreditCard className={`text-2xl mb-2 ${paymentMode === 'upi' ? 'text-white' : 'text-gray-500'}`} />
                <span className={`font-medium ${paymentMode === 'upi' ? 'text-white' : 'text-gray-700'}`}>UPI</span>
              </button>
              
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${paymentMode === 'crypto' ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border-yellow-500 shadow-lg' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}`}
                onClick={() => handlePaymentModeChange('crypto')}
              >
                <FaBitcoin className={`text-2xl mb-2 ${paymentMode === 'crypto' ? 'text-white' : 'text-gray-500'}`} />
                <span className={`font-medium ${paymentMode === 'crypto' ? 'text-white' : 'text-gray-700'}`}>Crypto</span>
              </button>
            </div>
          </div>
          
          {/* UPI Section */}
          {paymentMode === 'upi' && (
            <div className="mb-6">
              {paymentSettings?.upiOptions && paymentSettings.upiOptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">UPI Payment Options</h3>
                    <button
                      onClick={() => handlePaymentModeChange('crypto')}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Switch to Cryptocurrency
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentSettings.upiOptions.map((upi, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedUpi && selectedUpi.upiId === upi.upiId 
                            ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border-blue-500 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                        onClick={() => handleUpiSelect(upi)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full overflow-hidden">
                            {upi.svgCode && upi.svgCode.trim() ? (
                              <span dangerouslySetInnerHTML={{ __html: upi.svgCode }} />
                            ) : upi.imageUrl && upi.imageUrl.startsWith('http') ? (
                              <img src={upi.imageUrl} alt={upi.name} className="w-6 h-6 object-contain" onError={e => { e.target.onerror=null; e.target.style.display='none'; }} />
                            ) : (
                              <FaWallet className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{upi.name}</div>
                            <div className="text-sm text-gray-600">{upi.upiId}</div>
                            <div className="text-sm text-gray-600">Rate: 1 {upi.name} = {upi.conversionRate || 1}</div>
                            {upi.feePercent && (
                              <div className="text-sm text-red-600">Deduction: {upi.feePercent}%</div>
                            )}
                            {upi.fixedFee && (
                              <div className="text-sm text-red-600">Deduction: {upi.fixedFee}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {selectedUpi && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col items-center mb-4">
                        {selectedUpi.svgCode && selectedUpi.svgCode.trim() ? (
                          <div 
                            className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3" 
                            dangerouslySetInnerHTML={{ __html: selectedUpi.svgCode }} 
                          />
                        ) : selectedUpi.imageUrl && selectedUpi.imageUrl.startsWith('http') ? (
                          <div className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3">
                            <img 
                              src={selectedUpi.imageUrl} 
                              alt={selectedUpi.name} 
                              className="max-w-full max-h-full object-contain" 
                              onError={e => { e.target.onerror=null; e.target.style.display='none'; }}
                            />
                          </div>
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
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4">
                  <div className="flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    <p className="text-sm">
                      No UPI payment options are currently available.
                      <button
                        onClick={() => handlePaymentModeChange('crypto')}
                        className="ml-2 text-primary hover:text-primary-dark font-medium"
                      >
                        Switch to Cryptocurrency
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Crypto Section */}
          {paymentMode === 'crypto' && (
            <div className="mb-6">
              {paymentSettings?.cryptoOptions && paymentSettings.cryptoOptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">Cryptocurrency Payment Options</h3>
                    <button
                      onClick={() => handlePaymentModeChange('upi')}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Switch to UPI
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentSettings.cryptoOptions.map((crypto, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedCrypto && selectedCrypto.currency === crypto.currency 
                            ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white border-yellow-500 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                        onClick={() => handleCryptoSelect(crypto)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full overflow-hidden">
                            {crypto.svgCode && crypto.svgCode.trim() ? (
                              <span dangerouslySetInnerHTML={{ __html: crypto.svgCode }} />
                            ) : crypto.imageUrl && crypto.imageUrl.startsWith('http') ? (
                              <img src={crypto.imageUrl} alt={crypto.currency} className="w-6 h-6 object-contain" onError={e => { e.target.onerror=null; e.target.style.display='none'; }} />
                            ) : (
                              <FaCoins className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{crypto.currency}</div>
                            <div className="text-sm text-gray-600">Rate: 1 {crypto.currency} = {crypto.conversionRate}</div>
                            {crypto.feePercent && (
                              <div className="text-sm text-red-600">Deduction: {crypto.feePercent}%</div>
                            )}
                            {crypto.fixedFee && (
                              <div className="text-sm text-red-600">Deduction: {crypto.fixedFee}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {selectedCrypto && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col items-center mb-4">
                        {selectedCrypto.svgCode && selectedCrypto.svgCode.trim() ? (
                          <div 
                            className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3" 
                            dangerouslySetInnerHTML={{ __html: selectedCrypto.svgCode }} 
                          />
                        ) : selectedCrypto.imageUrl && selectedCrypto.imageUrl.startsWith('http') ? (
                          <div className="w-[250px] h-[250px] flex-shrink-0 flex items-center justify-center bg-white border rounded-lg p-4 mb-3">
                            <img 
                              src={selectedCrypto.imageUrl} 
                              alt={selectedCrypto.currency} 
                              className="max-w-full max-h-full object-contain" 
                              onError={e => { e.target.onerror=null; e.target.style.display='none'; }}
                            />
                          </div>
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
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4">
                  <div className="flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    <p className="text-sm">
                      No cryptocurrency payment options are currently available.
                      <button
                        onClick={() => handlePaymentModeChange('upi')}
                        className="ml-2 text-primary hover:text-primary-dark font-medium"
                      >
                        Switch to UPI
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-white text-sm font-bold mb-2" htmlFor="amount">
              Amount (in game currency)
            </label>
            <input
              type="text"
              id="amount"
              className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Min: ${paymentSettings?.minimumDepositAmount || 100}, Max: ${paymentSettings?.maximumDepositAmount || 10000}`}
              required
            />
            {paymentMode === 'crypto' && selectedCrypto && amount && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Total Payable: </span>
                <span className="font-medium text-red-600">{Number(convertedAmount).toFixed(2)} {selectedCrypto.currency}</span>
              </div>
            )}
            {paymentMode === 'upi' && selectedUpi && amount && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Total Payable: </span>
                <span className="font-medium text-red-600">{Number(convertedAmount).toFixed(2)} INR</span>
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
            <label className="block text-white text-sm font-bold mb-2" htmlFor="referenceNumber">
              {paymentMode === 'upi' ? 'UTR Number' : 'Transaction Reference Number'}
            </label>
            <input
              type="text"
              id="referenceNumber"
              className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
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
            <Link to="/profile" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white px-4 py-2 rounded font-bold flex items-center shadow hover:scale-105 hover:shadow-lg transition"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  <span>Recharge</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Confirmation */
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-800 flex items-center"><FaHistory className="mr-2" /> Confirm Deposit Request</h2>
          
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
                    <p className="font-bold text-red-600">{Number(convertedAmount).toFixed(2)} {selectedCrypto?.currency}</p>
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
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white px-4 py-2 rounded font-bold flex items-center shadow hover:scale-105 hover:shadow-lg transition"
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
        <h2 className="text-xl font-bold mb-4 text-blue-800 flex items-center"><FaHistory className="mr-2" /> Recent Requests</h2>
        {loadingHistory ? (
          <p className="text-center p-4">
            <FaSpinner className="animate-spin inline mr-2" />
            <span className="text-blue-800">Loading history...</span>
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
          <p className="text-center p-4 bg-gray-50 rounded text-gray-600">No requests found</p>
        )}
      </div>
    </div>
  );
};

export default WalletRecharge;
