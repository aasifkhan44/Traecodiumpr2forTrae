import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function WingoPlay() {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(1); // Default to 1 minute
  const [activeRounds, setActiveRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBetType, setSelectedBetType] = useState(null); // 'color' or 'number'
  const [selectedBetValue, setSelectedBetValue] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState(null);

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

      // Client-side validation
      if (!user) {
        throw new Error('Please log in to place a bet');
      }

      if (!selectedBetType || !selectedBetValue) {
        throw new Error('Please select a color or number to bet on');
      }

      if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
        throw new Error('Please enter a valid bet amount');
      }

      if (!user.balance || user.balance < Number(betAmount)) {
        throw new Error('Insufficient balance to place this bet');
      }

      // Additional validation
      if (selectedBetType === 'color' && !['Red', 'Violet', 'Green'].includes(selectedBetValue)) {
        throw new Error('Invalid color selection');
      }

      if (selectedBetType === 'number' && !/^[0-9]$/.test(selectedBetValue)) {
        throw new Error('Invalid number selection');
      }

      const response = await api.post('/wingo/bet', {
        duration: selectedDuration,
        betType: selectedBetType,
        betValue: selectedBetValue,
        amount: Number(betAmount)
      });

      if (response.data.success) {
        // Reset form
        setSelectedBetType(null);
        setSelectedBetValue(null);
        setBetAmount('');
        // You might want to update user's balance here
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
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Select Round Duration</h2>
        <div className="flex space-x-4">
          {durations.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleDurationChange(value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDuration === value
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Place Your Bet</h3>
        
        {/* Color Selection */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2">Select Color</h4>
          <div className="flex gap-4">
            {colors.map(color => (
              <button
                key={color.value}
                onClick={() => handleBetTypeSelect('color', color.value)}
                className={`${color.className} px-4 py-2 rounded-md text-white ${selectedBetType === 'color' && selectedBetValue === color.value ? 'ring-2 ring-white' : ''}`}
              >
                {color.value}
              </button>
            ))}
          </div>
        </div>

        {/* Number Selection */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2">Select Number</h4>
          <div className="grid grid-cols-5 gap-2">
            {numbers.map(number => (
              <button
                key={number}
                onClick={() => handleBetTypeSelect('number', number.toString())}
                className={`px-4 py-2 rounded-md border ${selectedBetType === 'number' && selectedBetValue === number.toString() ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                {number}
              </button>
            ))}
          </div>
        </div>

        {/* Bet Amount Input */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2">Bet Amount</h4>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Enter bet amount"
            className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error Message */}
        {betError && (
          <div className="text-red-500 mb-4">{betError}</div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleBetSubmit}
          disabled={betLoading || !selectedBetType || !selectedBetValue || !betAmount}
          className={`w-full py-2 rounded-md text-white ${betLoading || !selectedBetType || !selectedBetValue || !betAmount ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {betLoading ? 'Placing Bet...' : 'Place Bet'}
        </button>
      </div>

      {currentRound ? (
        <div className="bg-white rounded-xl shadow-md p-6 mt-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold">Round Number</h3>
              <p className="text-gray-600">{currentRound.roundNumber || `#${String(currentRound._id).slice(-4)}` || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Time Remaining</h3>
              <p className="text-gray-600">
                {currentRound.endTime
                  ? Math.max(0, Math.floor((new Date(currentRound.endTime) - new Date()) / 1000))
                  : 0}s
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No active round for selected duration</p>
        </div>
      )}
    </div>
  );
}

// Remove unused prop if not needed
WingoPlay.propTypes = {};