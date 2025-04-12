import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';

export default function WingoPlay() {
  const [selectedDuration, setSelectedDuration] = useState(1); // Default to 1 minute
  const [activeRounds, setActiveRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="game-container p-4">
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

      {currentRound ? (
        <div className="bg-white rounded-xl shadow-md p-6">
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

          <div className="betting-options">
            <h3 className="text-lg font-semibold mb-4">Place Your Bet</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="color-betting p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Color Bet</h4>
                <div className="flex space-x-2">
                  <button className="w-12 h-12 rounded-full bg-red-500"></button>
                  <button className="w-12 h-12 rounded-full bg-violet-500"></button>
                  <button className="w-12 h-12 rounded-full bg-green-500"></button>
                </div>
              </div>
              <div className="number-betting p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Number Bet</h4>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i}
                      className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
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