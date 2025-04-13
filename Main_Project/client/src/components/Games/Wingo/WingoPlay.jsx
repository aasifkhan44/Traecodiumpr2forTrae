import React, { useState, useEffect, Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Combobox } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { toast } from 'react-hot-toast';

export default function WingoPlay() {
  const { user, setUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1); // Default to 1 minute
  const [activeRounds, setActiveRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBetType, setSelectedBetType] = useState(null);
  const [selectedBetValue, setSelectedBetValue] = useState(null);
  const [betAmount, setBetAmount] = useState('10');
  const [betError, setBetError] = useState(null);
  const [betLoading, setBetLoading] = useState(false);
  const [error, setError] = useState(null);
  // State for recent bets
  const [recentBets, setRecentBets] = useState([]);

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

  // Move fetchUserData outside useEffect so it can be called from other functions
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

  useEffect(() => {
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
              toast.error('Game rounds not found. The server may be initializing, please wait or refresh the page.');
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
          toast.error('No valid round data received from server');
        }
      } else {
        // Only show error if we don't have any existing data
        if (Object.keys(activeRounds).length === 0) {
          toast.error(`Failed to load active rounds: ${response.data.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error loading rounds:', err);
      
      // Only show error if we don't have any existing data
      if (Object.keys(activeRounds).length === 0) {
        if (err.response) {
          if (err.response.status === 404) {
            toast.error('Game rounds not found. The Wingo game may not be initialized on the server.');
          } else {
            toast.error(`Server error: ${err.response.status} - ${err.response.data.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          toast.error('No response from server. Please check your connection.');
        } else {
          toast.error(`Error loading game data: ${err.message}`);
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

  const handlePlaceBet = async () => {
    if (!selectedBetType || !selectedBetValue) {
      toast.error('Please select a bet type and value');
      return;
    }

    if (Number(betAmount) <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }

    setBetLoading(true);
    try {
      const response = await api.post('/wingo/bet', {
        betType: selectedBetType,
        betValue: selectedBetValue,
        amount: Number(betAmount),
        duration: selectedDuration,
      });

      if (response.data.success) {
        // Show success toast
        toast.success('Bet placed successfully!');
        
        // Update user balance immediately
        await fetchUserData();
        
        // Fetch updated recent bets
        await fetchRecentBets();
        
        // Reset form
        setSelectedBetType(null);
        setSelectedBetValue(null);
        setBetAmount('10');
        setError(null);
      } else {
        toast.error(response.data.message || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Bet placement error:', error);
      // Only show one error message
      const errorMessage = error.response?.data?.message || 'Failed to place bet';
      toast.error(errorMessage);
    } finally {
      setBetLoading(false);
    }
  };

  // Function to fetch recent bets
  const fetchRecentBets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found');
        return;
      }
      
      const response = await api.get('/wingo/recent-bets');
      if (response.data.success && response.data.bets) {
        console.log('Recent bets fetched:', response.data.bets.length);
        setRecentBets(response.data.bets);
      } else {
        console.log('No bets returned from server');
        setRecentBets([]);
      }
    } catch (error) {
      console.error('Error fetching recent bets:', error);
      setRecentBets([]);
    }
  };

  useEffect(() => {
    // Fetch recent bets on component mount
    fetchRecentBets();
    
    // Set up polling for recent bets
    const pollInterval = setInterval(fetchRecentBets, 10000);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

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
                {currentRound?.roundNumber ? `#${currentRound.roundNumber}` : 'Waiting for Round'}
              </span>
            </div>
            {currentRound && (
              <div className="space-y-2">
                <div className="relative w-full max-w-sm h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="absolute inset-0 transition-all duration-1000 ease-linear" style={{ 
                    width: `${Math.floor(((new Date(currentRound.endTime) - new Date()) / (new Date(currentRound.endTime) - new Date(currentRound.startTime))) * 100)}%`,
                    backgroundColor: Math.floor(((new Date(currentRound.endTime) - new Date()) / (new Date(currentRound.endTime) - new Date(currentRound.startTime))) * 100) > 60 ? 'rgb(34 197 94)' : 
                                   Math.floor(((new Date(currentRound.endTime) - new Date()) / (new Date(currentRound.endTime) - new Date(currentRound.startTime))) * 100) > 30 ? 'rgb(245 158 11)' : 'rgb(239 68 68)'
                  }}></div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-500">{Math.floor((new Date(currentRound.endTime) - new Date()) / 60000).toString()}</span>
                  <span className="text-gray-400">:</span>
                  <span className="text-blue-500">{Math.floor(((new Date(currentRound.endTime) - new Date()) % 60000) / 1000).toString().padStart(2, '0')}</span>
                </div>
              </div>
            )}
          </div>
          
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
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '0') {
                    setBetAmount('10'); // Reset to default when cleared
                  } else if (/^\d+$/.test(value)) {
                    setBetAmount(value);
                  }
                }}
                className="w-full px-4 py-3 md:py-4 text-center text-xl md:text-2xl font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg pr-12 pl-12"
                placeholder="Enter amount"
              />
              <div className="absolute inset-y-0 left-0 flex items-center">
                <button
                  onClick={() => setBetAmount(prev => Math.max(0, prev ? Number(prev) - 10 : 10))}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                >
                  <span className="text-xl">-</span>
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  onClick={() => setBetAmount(prev => prev ? Number(prev) + 10 : 10)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                >
                  <span className="text-xl">+</span>
                </button>
              </div>
            </div>
            <div className="flex justify-center space-x-2 mt-2">
              <button
                onClick={() => setBetAmount(prev => prev ? Number(prev) * 10 : 100)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200"
              >
                10X
              </button>
              <button
                onClick={() => setBetAmount(prev => prev ? Number(prev) * 20 : 200)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200"
              >
                20X
              </button>
              <button
                onClick={() => setBetAmount(prev => prev ? Number(prev) * 50 : 500)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200"
              >
                50X
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-4 md:mt-6">
            <button
              onClick={handlePlaceBet}
              className="w-full py-3 md:py-4 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-pink-500 to-pink-700 text-white hover:from-pink-600 hover:to-pink-800"
            >
              {betLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  Placing Bet...
                </div>
              ) : (
                'Place Bet'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Recent Bets Section */}
      <RecentBets bets={recentBets} />
    </Fragment>
  );
}

// Add a new component for recent bets
function RecentBets({ bets }) {
  if (!bets || bets.length === 0) {
    return (
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Recent Bets</h3>
        <p className="text-gray-500">No recent bets found.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Recent Bets</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bets.map((bet) => (
              <tr key={bet._id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {new Date(bet.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {bet.betType}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {bet.betValue}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  ${bet.amount}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {bet.status === 'pending' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  ) : bet.status === 'won' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Won
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Lost
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">
                  {bet.status === 'won' ? (
                    <span className="text-green-600 font-medium">+${bet.payout}</span>
                  ) : bet.status === 'lost' ? (
                    <span className="text-red-600 font-medium">-${bet.amount}</span>
                  ) : (
                    <span className="text-gray-500">--</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {bet.roundId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Remove unused prop if not needed
WingoPlay.propTypes = {};