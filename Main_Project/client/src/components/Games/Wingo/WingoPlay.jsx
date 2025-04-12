import React, { useState, useEffect, Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Combobox } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';

export default function WingoPlay() {
  const { user, setUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1); // Default to 1 minute
  const [activeRounds, setActiveRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBetType, setSelectedBetType] = useState(null);
  const [selectedBetValue, setSelectedBetValue] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState(null);
  const [betLoading, setBetLoading] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);

  const colors = [
    { value: 'Red', className: 'bg-red-500' },
    { value: 'Violet', className: 'bg-purple-500' },
    { value: 'Green', className: 'bg-green-500' }
  ];

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const durations = [
    { value: 1, label: '1 Min' },
    { value: 3, label: '3 Min' },
    { value: 5, label: '5 Min' },
    { value: 10, label: '10 Min' }
  ];

  useEffect(() => {
    // Immediately fetch rounds via HTTP to ensure we have data
    fetchActiveRounds();
    
    // Set up polling as a fallback mechanism
    const pollInterval = setInterval(fetchActiveRounds, 5000);
    
    // Set up WebSocket connection for real-time updates with enhanced retry logic
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000; // 2 seconds
    let reconnectTimer = null;
    
    const connectWebSocket = async () => {
      try {
        // Clear any existing connection
        if (ws) {
          ws.onclose = null; // Prevent the onclose handler from triggering during manual reconnection
          ws.close();
        }
        
        // Try to get the WebSocket server URL from the server
        let wsUrl = null;
        try {
          const response = await api.get('/wingo/websocket-status');
          if (response.data.success && response.data.data && response.data.data.serverUrl) {
            wsUrl = response.data.data.serverUrl;
            console.log(`Got WebSocket URL from server: ${wsUrl}`);
          }
        } catch (err) {
          console.warn('Could not get WebSocket URL from server, using fallback methods');
        }
        
        // If we couldn't get the URL from the server, use fallback methods
        if (!wsUrl) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const hostname = window.location.hostname;
          
          // Use the first available URL from the fallback options
          const fallbackUrls = [
            import.meta.env.VITE_WS_URL,
            `${protocol}//${hostname}:3001`,
            `${protocol}//${hostname}:5000`,
            'ws://localhost:3001'
          ];
          wsUrl = fallbackUrls.find(url => url) || 'ws://localhost:3001';
        }
        
        console.log(`Attempting WebSocket connection to ${wsUrl}`);
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          fetchActiveRounds(); // Fetch rounds immediately after connection
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle server-sent errors
            if (data.type === 'roundError') {
              console.error('Server error:', data.error, '-', data.details);
              setError(`${data.message}: ${data.details}`);
              setLoading(false);
              return;
            }
            
            // Handle round updates
            if (data.type === 'roundUpdate' && data.round && data.duration) {
              setActiveRounds(prevRounds => ({
                ...prevRounds,
                [data.duration]: data.round
              }));
              setLoading(false);
              setError(null);
            } else if (data.rounds) {
              const roundsObj = {};
              if (Array.isArray(data.rounds)) {
                data.rounds.forEach(round => {
                  if (round && round.duration) {
                    roundsObj[round.duration] = round;
                  }
                });
              } else if (typeof data.rounds === 'object') {
                Object.keys(data.rounds).forEach(key => {
                  roundsObj[key] = data.rounds[key];
                });
              }
              
              if (Object.keys(roundsObj).length > 0) {
                setActiveRounds(roundsObj);
                setLoading(false);
                setError(null);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
            setError(`Error processing game data: ${err.message}`);
            setLoading(false);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Rely on polling for data
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
            const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
            reconnectTimer = setTimeout(connectWebSocket, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('Max reconnect attempts reached. Relying on polling.');
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        fetchActiveRounds(); // Ensure we still have data via HTTP polling
      }
    };
    
    connectWebSocket();
    
    return () => {
      clearInterval(pollInterval);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Current user state:', user);
        
        // Always fetch the latest user data from the profile endpoint
        console.log('Fetching user profile data...');
        const token = localStorage.getItem('token');
        if (token) {
          // First try the profile endpoint which Dashboard uses
          try {
            // Note: The correct endpoint is /api/user/profile
            // But api.get already prepends /api/, so we just need /user/profile
            const profileResponse = await api.get('/user/profile');
            console.log('Profile response:', profileResponse.data);
            
            if (profileResponse.data.success && profileResponse.data.data) {
              const userData = profileResponse.data.data;
              console.log('Setting userProfile with profile data:', userData);
              
              // Store the profile data in a separate state
              setUserProfile(userData);
              
              console.log('UserProfile updated with balance:', userData.balance);
            }
          } catch (profileError) {
            console.error('Error fetching profile data:', profileError);
          }
        } else {
          console.log('No token found, cannot fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Add a userBalance variable to safely access user.balance
  const userBalance = useMemo(() => {
    console.log('Calculating userBalance, user:', user);
    console.log('UserProfile:', userProfile);
    
    // First try to get balance from userProfile
    if (userProfile && userProfile.balance !== undefined) {
      const profileBalance = typeof userProfile.balance === 'string' ? parseFloat(userProfile.balance) : userProfile.balance;
      console.log('Using profile balance:', profileBalance);
      return isNaN(profileBalance) ? 0 : profileBalance;
    }
    
    // Fall back to user object if userProfile is not available
    if (user && user.balance !== undefined) {
      const userBalanceValue = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
      console.log('Using user balance:', userBalanceValue);
      return isNaN(userBalanceValue) ? 0 : userBalanceValue;
    }
    
    return 0;
  }, [user, userProfile]);

  console.log('Rendered userBalance:', userBalance);

  const fetchActiveRounds = async () => {
    try {
      console.log('Fetching active rounds...');
      const response = await api.get('/wingo/active-rounds');
      console.log('Active rounds response:', response.data);
      
      if (response.data.success && response.data.data) {
        // Handle both array and object response formats
        let roundsData = {};
        
        if (Array.isArray(response.data.data)) {
          if (response.data.data.length === 0) {
            console.warn('No active rounds returned from server');
            // Don't show error if we're still loading via WebSocket
            if (Object.keys(activeRounds).length === 0) {
              setError('Game rounds not found. The server may be initializing, please wait or refresh the page.');
            }
            return;
          }
          
          roundsData = response.data.data.reduce((acc, round) => {
            if (round && round.duration) {
              acc[round.duration] = round;
            }
            return acc;
          }, {});
        } else if (typeof response.data.data === 'object') {
          roundsData = response.data.data;
        }
        
        if (Object.keys(roundsData).length > 0) {
          setActiveRounds(roundsData);
          setError(null);
        } else if (Object.keys(activeRounds).length === 0) {
          setError('No valid round data received from server');
        }
      } else {
        // Only show error if we don't have any existing data
        if (Object.keys(activeRounds).length === 0) {
          setError(`Failed to load active rounds: ${response.data.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error loading rounds:', err);
      
      // Only show error if we don't have any existing data
      if (Object.keys(activeRounds).length === 0) {
        if (err.response) {
          if (err.response.status === 404) {
            setError('Game rounds not found. The Wingo game may not be initialized on the server.');
          } else {
            setError(`Server error: ${err.response.status} - ${err.response.data.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          setError('No response from server. Please check your connection.');
        } else {
          setError(`Error loading game data: ${err.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (duration) => {
    setSelectedDuration(duration);
  };

  const handleBetTypeSelect = (type, value) => {
    setSelectedBetType(type);
    setSelectedBetValue(value);
    setBetError(null);
  };

  const handleBetSubmit = async () => {
    try {
      setBetError(null);
      setBetLoading(true);

      // Client-side validation - check if either user or userProfile exists
      if (!user && !userProfile) {
        throw new Error('Please log in to place a bet');
      }

      if (!selectedBetType || !selectedBetValue) {
        throw new Error('Please select a color or number to bet on');
      }

      if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
        throw new Error('Please enter a valid bet amount');
      }

      // Get the bet amount as a number
      const numericBetAmount = Number(betAmount);
      
      // Check if user has enough balance using the userBalance variable
      // which safely gets the balance from either userProfile or user
      console.log('Checking balance for bet:', userBalance, 'vs bet amount:', numericBetAmount);
      
      if (userBalance < numericBetAmount) {
        throw new Error(`Insufficient balance (${userBalance}) to place this bet (${numericBetAmount})`);
      }

      // Additional validation
      if (selectedBetType === 'color' && !['Red', 'Violet', 'Green'].includes(selectedBetValue)) {
        throw new Error('Invalid color selection');
      }

      if (selectedBetType === 'number' && !/^[0-9]$/.test(selectedBetValue)) {
        throw new Error('Invalid number selection');
      }

      console.log('Submitting bet:', {
        duration: selectedDuration,
        betType: selectedBetType,
        betValue: selectedBetValue,
        amount: numericBetAmount,
        userId: userProfile?._id || user?.id || user?._id
      });

      const response = await api.post('/wingo/bet', {
        duration: selectedDuration,
        betType: selectedBetType,
        betValue: selectedBetValue,
        amount: numericBetAmount,
        userId: userProfile?._id || user?.id || user?._id // Include user ID explicitly
      });

      console.log('Bet response:', response.data);

      if (response.data.success) {
        // Show success message
        setSuccessMessage(`Bet placed successfully! Good luck!`);
        setBetSuccess(true);
        
        // Reset form
        setSelectedBetType(null);
        setSelectedBetValue(null);
        setBetAmount('');
        
        // Update user's balance if provided in the response
        if (response.data.data && response.data.data.newBalance !== undefined) {
          console.log('Updating balance to:', response.data.data.newBalance);
          setUserProfile(prevUserProfile => {
            if (prevUserProfile) {
              return { ...prevUserProfile, balance: response.data.data.newBalance };
            }
            return prevUserProfile;
          });
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setBetSuccess(false);
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error(response.data.message || 'Failed to place bet');
      }
    } catch (err) {
      console.error('Bet placement error:', err);
      if (err.response) {
        // Server returned an error response
        const errorMessage = err.response.data?.message || 'Server error occurred while placing bet';
        setBetError(errorMessage);
      } else if (err.request) {
        // Request was made but no response received
        setBetError('Unable to connect to the server. Please check your connection.');
      } else {
        // Client-side error
        setBetError(err.message || 'An error occurred while placing your bet');
      }
    } finally {
      setBetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  const currentRound = activeRounds[selectedDuration];

  return (
    <Fragment>
      <div className="p-2 md:p-4 mx-auto max-w-md">
        {/* Display user balance */}
        <div className="bg-white rounded-xl shadow-md p-2 md:p-3 mb-2 md:mb-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base md:text-lg font-bold">Your Balance</h2>
            <div className="flex items-center space-x-1">
              <span className="text-base md:text-lg font-bold">🪙</span>
              {userProfile || user ? (
                <span className="text-base md:text-lg font-bold">{userBalance.toFixed(2)}</span>
              ) : (
                <span className="text-sm md:text-base text-red-500">Please log in to view your balance</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-2 md:mb-3">
          <h2 className="text-base md:text-lg font-bold mb-1 md:mb-2">Select Round Duration</h2>
          <div className="flex justify-between space-x-2">
            {durations.map((duration) => (
              <button
                key={duration.value}
                onClick={() => handleDurationChange(duration.value)}
                className={`relative flex-1 min-w-[72px] py-0.5 px-2 rounded-md transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                  selectedDuration === duration.value
                    ? `bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg hover:shadow-xl relative after:absolute after:inset-1 after:rounded-md after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100`
                    : `bg-gradient-to-r from-pink-100 to-pink-300 text-gray-800 hover:shadow-lg hover:from-pink-200 hover:to-pink-400`
                }`}
              >
                <span className="relative z-10">{duration.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div className="flex items-center space-x-1">
              <span className="text-sm md:text-base font-medium">Round</span>
              <span className="text-sm md:text-base font-medium text-blue-500">
                {currentRound?.roundNumber || `#${String(currentRound?._id?.slice(-4) || 'N/A')}` || 'N/A'}
              </span>
            </div>
            {currentRound && (
              <div className="flex items-center space-x-1">
                <span className="text-blue-500">{Math.floor((new Date(currentRound.endTime) - new Date()) / 60000).toString()}</span>
                <span className="text-gray-400">:</span>
                <span className="text-blue-500">{Math.floor(((new Date(currentRound.endTime) - new Date()) % 60000) / 1000).toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
          
          {/* Success message */}
          {betSuccess && successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
              <p className="font-medium">{successMessage}</p>
            </div>
          )}
          
          {/* Error message */}
          {betError && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
              <p className="font-medium">{betError}</p>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800">
              <p className="font-medium">Error: {error}</p>
            </div>
          )}
          
          {/* Bet Error Display */}
          {betError && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800">
              <p className="font-medium">Bet Error: {betError}</p>
            </div>
          )}
          
          {/* Color Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
            <div>
              <h4 className="text-sm md:text-md font-medium mb-2">Select Color</h4>
              <div className="flex justify-between space-x-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleBetTypeSelect('color', color.value)}
                    className={`relative flex-1 min-w-[72px] py-0.5 px-2 rounded-md transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                      selectedBetType === 'color' && selectedBetValue === color.value
                        ? `${color.className} text-white shadow-lg hover:shadow-xl relative after:absolute after:inset-1 after:rounded-md after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100`
                        : `${color.className} text-white hover:shadow-sm`
                    }`}
                  >
                    <span className="relative z-10">{color.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Number Selection */}
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Select Number</h4>
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {numbers.map(number => (
                <button
                  key={number}
                  onClick={() => handleBetTypeSelect('number', number.toString())}
                  className={`relative flex-1 py-1 px-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                    number === 0
                      ? `bg-gradient-to-r from-purple-500 to-red-500 text-white hover:shadow-xl hover:from-purple-600 hover:to-red-600 ${
                        selectedBetType === 'number' && selectedBetValue === number.toString()
                          ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                          : ''
                      }`
                      : number === 5
                        ? `bg-gradient-to-r from-green-500 to-purple-500 text-white hover:shadow-xl hover:from-green-600 hover:to-purple-600 ${
                          selectedBetType === 'number' && selectedBetValue === number.toString()
                            ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                            : ''
                        }`
                        : [2, 4, 6, 8].includes(number)
                          ? `bg-gradient-to-r from-red-500 to-red-700 text-white hover:shadow-xl hover:from-red-600 hover:to-red-800 ${
                            selectedBetType === 'number' && selectedBetValue === number.toString()
                              ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                              : ''
                          }`
                          : [1, 3, 7, 9].includes(number)
                            ? `bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl hover:from-green-600 hover:to-green-800 ${
                              selectedBetType === 'number' && selectedBetValue === number.toString()
                                ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                                : ''
                            }`
                            : selectedBetType === 'number' && selectedBetValue === number.toString()
                              ? `bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg hover:shadow-xl relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100`
                              : `bg-gradient-to-r from-pink-100 to-pink-300 text-gray-800 hover:shadow-lg hover:from-pink-200 hover:to-pink-400`
                  }`}
                >
                  <span className="relative z-10">{number}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount Input */}
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Bet Amount</h4>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet amount"
              className="w-full px-3 py-2 md:px-4 md:py-2 text-sm md:text-base rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleBetSubmit}
            disabled={betLoading || !selectedBetType || !selectedBetValue || !betAmount}
            className={`w-full py-2 md:py-3 text-sm md:text-base rounded-lg font-semibold ${
              betLoading || !selectedBetType || !selectedBetValue || !betAmount
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {betLoading ? 'Processing...' : 'Place Bet'}
          </button>
        </div>
      </div>
    </Fragment>
  );
}

// Remove unused prop if not needed
WingoPlay.propTypes = {};