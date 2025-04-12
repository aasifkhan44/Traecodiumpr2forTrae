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
    { value: 1, label: '1 Minute' },
    { value: 3, label: '3 Minutes' },
    { value: 5, label: '5 Minutes' },
    { value: 10, label: '10 Minutes' }
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
        <div className="mb-3 p-2 md:p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center mb-1">
            <h3 className="text-base md:text-lg font-semibold">Your Balance</h3>
          </div>
          {userProfile || user ? (
            <p className="text-xl md:text-2xl font-bold">🪙 {userBalance.toFixed(2)}</p>
          ) : (
            <p className="text-sm md:text-base text-red-500">Please log in to view your balance</p>
          )}
        </div>

        {/* Display current round information */}
        {currentRound ? (
          <div className="bg-white rounded-xl shadow-md p-3 md:p-6 mb-4">
            <div className="grid grid-cols-2 gap-2 md:gap-4 mb-1 md:mb-2">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Round Number</h3>
                <p className="text-sm md:text-base text-gray-600">{currentRound.roundNumber || `#${String(currentRound._id).slice(-4)}` || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold">Time Remaining</h3>
                <p className="text-sm md:text-base text-gray-600">
                  {currentRound.endTime
                    ? Math.max(0, Math.floor((new Date(currentRound.endTime) - new Date()) / 1000))
                    : 0}s
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-3 md:py-4 mb-4 bg-white rounded-xl shadow-md">
            <p className="text-sm md:text-base text-gray-600">No active round for selected duration</p>
          </div>
        )}

        <div className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Select Round Duration</h2>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {durations.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedDuration(value)}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm md:text-base font-medium transition-colors ${
                  selectedDuration === value
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Place Your Bet</h3>
          
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
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Select Color</h4>
            <div className="flex flex-wrap gap-2 md:gap-4">
              {colors.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleBetTypeSelect('color', color.value)}
                  className={`${color.className} px-2 py-1 md:px-4 md:py-2 text-sm md:text-base rounded-md text-white ${selectedBetType === 'color' && selectedBetValue === color.value ? 'ring-2 ring-white' : ''}`}
                >
                  {color.value}
                </button>
              ))}
            </div>
          </div>

          {/* Number Selection */}
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Select Number</h4>
            <div className="grid grid-cols-5 gap-1 md:gap-2">
              {numbers.map(number => (
                <button
                  key={number}
                  onClick={() => handleBetTypeSelect('number', number.toString())}
                  className={`px-2 py-1 md:px-4 md:py-2 text-sm md:text-base rounded-md border ${selectedBetType === 'number' && selectedBetValue === number.toString() ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  {number}
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