import { useState, useEffect, useCallback, memo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { WS_URL } from '../utils/ws';

const AdminGameManagement = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState(null);
  const [results, setResults] = useState([]);
  const [resultLoading, setResultLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeView, setActiveView] = useState('games'); // 'games' or 'results'
  const [lastRefresh, setLastRefresh] = useState(Date.now()); // For forcing refreshes
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [selectedPeriod, setSelectedPeriod] = useState(null); // Initially show all periods
  const wsRef = useRef(null);

  // This key avoids re-renders of the components
  const [stableKey] = useState(() => Date.now());

  useEffect(() => {
    fetchGames();
  }, []);

  // Setup WebSocket connection for live updates
  useEffect(() => {
    if (selectedGame === 'Wingo' && activeView === 'results') {
      setupWebSocket();
    }
    
    return () => {
      // Clean up WebSocket connection on component unmount or when game changes
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedGame, activeView]);

  // Function to set up WebSocket connection
  const setupWebSocket = async () => {
    try {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      
      setWsStatus('connecting');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication token not found. Please log in again.');
        setWsStatus('error');
        return;
      }
      
      wsRef.current = new window.WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('Admin WebSocket connection established');
        setWsStatus('connected');
        setError(null);
        
        // Send authentication message immediately after connection
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending admin authentication token...');
            // Make sure token is properly formatted with Bearer prefix
            const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            wsRef.current.send(JSON.stringify({
              type: 'admin-auth',
              token: formattedToken,
              timestamp: new Date().toISOString()
            }));
          }
        }, 500); // Small delay to ensure connection is ready
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Admin received WebSocket message:', data);
          
          if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
            setError(data.message);
            setWsStatus('error');
            
            // Special handling for auth errors - might need to refresh token
            if (data.code === 'AUTH_NOT_ADMIN' || data.code === 'AUTH_INVALID_TOKEN') {
              toast.error('Authentication issue. Try refreshing your session.', {
                position: "top-right",
                autoClose: 5000
              });
            }
            return;
          }
          
          if (data.type === 'admin-auth-success') {
            console.log('Admin authentication successful');
            toast.success('Admin WebSocket connection authenticated');
            setError(null);
            setWsStatus('connected');
          } else if (data.type === 'roundsUpdate' || data.type === 'roundUpdate') {
            // Update results with the latest data
            setResults(data.rounds);
            setResultLoading(false);
          } else if (data.type === 'betUpdate' && data.roundId) {
            // Update a specific round's betting statistics
            setResults(prevResults => 
              prevResults.map(round => 
                round._id === data.roundId 
                  ? { ...round, betStats: data.betStats }
                  : round
              )
            );
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Live updates may not be available.');
        setWsStatus('error');
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        wsRef.current = null;
        
        // Fallback to regular polling if WebSocket fails
        fetchResults(selectedGame);
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError('Failed to establish live connection. Using polling instead.');
      setWsStatus('error');
      // Fallback to regular polling
      fetchResults(selectedGame);
    }
  };

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedGame === 'Wingo') {
      // When period filter changes, request filtered data
      wsRef.current.send(JSON.stringify({
        type: 'filter-request',
        periodFilter: selectedPeriod === 'all' ? null : parseInt(selectedPeriod),
        showOnlyRunning: true // Always show only running rounds
      }));
    }
  }, [selectedPeriod, selectedGame]);

  const fetchGames = async () => {
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await axios.get(`${API_BASE_URL}/api/admin/games`, { headers });
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        setGames(response.data.data);
      } else {
        setGames([]);
        toast.warning('No games data available');
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGameUpdate = async (identifier, updates) => {
    try {
      // Validate image URLs if they are being updated
      if (updates.thumbnailUrl && !/^https:\/\/.+\.(svg|png)$/i.test(updates.thumbnailUrl)) {
        toast.error('Thumbnail URL must be a valid HTTPS URL ending with .svg or .png');
        return;
      }
      if (updates.cardImageUrl && !/^https:\/\/.+\.(svg|png)$/i.test(updates.cardImageUrl)) {
        toast.error('Card Image URL must be a valid HTTPS URL ending with .svg or .png');
        return;
      }

      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Clean up empty strings in updates
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== '')
      );

      const response = await axios.patch(
        `${API_BASE_URL}/api/admin/games/${encodeURIComponent(identifier)}`,
        cleanUpdates,
        { headers }
      );

      if (response.data?.success) {
        setGames(prevGames => 
          prevGames.map(game => 
            game.identifier === identifier ? response.data.data : game
          )
        );
        toast.success('Game updated successfully');
        setEditingGame(null);
      } else {
        throw new Error(response.data?.message || 'Failed to update game');
      }
    } catch (error) {
      console.error('Error updating game:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update game';
      toast.error(errorMessage);
    }
  };

  const validateImageUrl = (url) => {
    if (!url) return true; // Empty URLs are allowed
    return /^https:\/\/.+\.(svg|png)$/i.test(url);
  };

  const GameCard = ({ game }) => {
    const [formData, setFormData] = useState({
      thumbnailUrl: game.thumbnailUrl || '',
      cardImageUrl: game.cardImageUrl || '',
      description: game.description || '',
      isActive: game.isActive,
      isDefault: game.isDefault
    });

    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // Validate image URLs
      if (field === 'thumbnailUrl' || field === 'cardImageUrl') {
        if (value && !validateImageUrl(value)) {
          setErrors(prev => ({ 
            ...prev, 
            [field]: 'URL must be a valid HTTPS URL ending with .svg or .png' 
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      }
    };

    const handleSubmit = () => {
      // Check for validation errors
      if (Object.keys(errors).length > 0) {
        toast.error('Please fix the validation errors before submitting');
        return;
      }

      // Only send fields that have changed
      const updates = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== game[key]) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (Object.keys(updates).length === 0) {
        toast.info('No changes detected');
        setEditingGame(null);
        return;
      }

      handleGameUpdate(game.identifier, updates);
    };

    const isEditing = editingGame === game.identifier;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{game.name}</h3>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              game.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {game.isActive ? 'Active' : 'Inactive'}
            </span>
            {game.isDefault && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Default
              </span>
            )}
          </div>
        </div>

        <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden mb-4">
          {(!isEditing && game.thumbnailUrl) ? (
            <img
              src={game.thumbnailUrl}
              alt={game.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/640x360?text=No+Image';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {!isEditing ? 'No thumbnail' : (
                <div className="w-full p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${errors.thumbnailUrl ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.thumbnailUrl}
                    onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                  {errors.thumbnailUrl && (
                    <p className="mt-1 text-xs text-red-500">{errors.thumbnailUrl}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Image URL</label>
              <input
                type="text"
                className={`w-full p-2 border rounded ${errors.cardImageUrl ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.cardImageUrl}
                onChange={(e) => handleInputChange('cardImageUrl', e.target.value)}
                placeholder="https://example.com/card.png"
              />
              {errors.cardImageUrl && (
                <p className="mt-1 text-xs text-red-500">{errors.cardImageUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Game description"
              />
            </div>

            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`active-${game.identifier}`}
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`active-${game.identifier}`} className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`default-${game.identifier}`}
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`default-${game.identifier}`} className="ml-2 text-sm text-gray-700">
                  Default
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingGame(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="mt-1 text-sm text-gray-500">{formData.description || 'No description available'}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingGame(game.identifier)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const fetchResults = useCallback(async (gameIdentifier) => {
    try {
      setResultLoading(true);
      console.log(`Fetching results for game: ${gameIdentifier}`);
      
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication token not found. Please log in again.');
        setResultLoading(false);
        return;
      }
      
      // Include the auth token in request headers for every request
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (gameIdentifier === 'Wingo') {
        console.log(`Fetching Wingo rounds from: ${API_BASE_URL}/api/admin/games/Wingo/rounds`);
        
        // Add query parameters for filtering
        let url = `${API_BASE_URL}/api/admin/games/Wingo/rounds`;
        const params = new URLSearchParams();
        
        // Only get the specific period if one is selected
        if (selectedPeriod) {
          params.append('period', selectedPeriod);
          console.log(`Filtering for period: ${selectedPeriod}`);
        }
        
        // Always filter for open rounds
        params.append('status', 'open');
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log(`Sending request to ${url} with auth token`);
        try {
          const response = await axios.get(url, { headers });
          console.log('Wingo API response:', response.data);
          
          if (response.data.success) {
            if (Array.isArray(response.data.data) && response.data.data.length > 0) {
              // Ensure we're only showing rounds for the selected period if one is selected
              if (selectedPeriod) {
                const filteredRounds = response.data.data.filter(
                  round => round.duration.toString() === selectedPeriod
                );
                console.log(`Filtered ${filteredRounds.length} rounds for period ${selectedPeriod} from ${response.data.data.length} total rounds`);
                setResults(filteredRounds);
              } else {
                setResults(response.data.data);
              }
              setError(null); // Clear any previous errors
            } else {
              console.log('No rounds found in API response');
              setResults([]);
              // Don't set error for empty results - we'll show a better message in the UI
            }
          } else {
            setError('Failed to fetch Wingo rounds: ' + (response.data.message || 'Unknown error'));
            setResults([]);
          }
        } catch (apiErr) {
          console.error('API error:', apiErr);
          setError(`API error: ${apiErr.message}`);
          setResults([]);
        }
      } else if (gameIdentifier) {
        const response = await axios.get(`${API_BASE_URL}/api/admin/games/${gameIdentifier}/rounds`, { headers });
        setResults(response.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(`Failed to fetch results: ${err.message}`);
      setResults([]);
    } finally {
      setResultLoading(false);
    }
  }, []);

  const handleResultUpdate = useCallback(async (roundId, duration, color, number) => {
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      console.log(`Updating result for round ${roundId}: Color=${color}, Number=${number}`);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/games/Wingo/control-result`,
        {
          roundId,
          winningColor: color,
          winningNumber: number
        },
        { headers }
      );
      
      if (response.data.success) {
        toast.success('Result updated successfully');
        
        // Update the local state to reflect the change
        setResults(prevResults => 
          prevResults.map(r => 
            r._id === roundId 
              ? { 
                  ...r, 
                  winningColor: color, 
                  winningNumber: number,
                  status: 'completed'
                } 
              : r
          )
        );
        
        // Force a refresh of the results after a brief delay
        setTimeout(() => {
          fetchResults(selectedGame);
        }, 1000);
      } else {
        throw new Error(response.data.message || 'Failed to update result');
      }
    } catch (error) {
      console.error('Error updating result:', error);
      toast.error(error.response?.data?.message || 'Failed to update result');
    }
  }, [fetchResults, selectedGame]);

  const WingoRoundStats = memo(({ round, onUpdateResult }) => {
    console.log('Rendering WingoRoundStats for round:', round);
    
    // Ensure we have default values and properly initialize state
    const [selectedColor, setSelectedColor] = useState(round.winningColor || 'Red');
    const [selectedNumber, setSelectedNumber] = useState(
      round.winningNumber !== undefined ? round.winningNumber.toString() : '0'
    );
    
    // Add countdown timer state
    const [timeRemaining, setTimeRemaining] = useState('');
    const [countdownPercent, setCountdownPercent] = useState(100);
    const timerRef = useRef(null);
    
    const roundIdRef = useRef(round._id);
    
    // Default values for when betStats is undefined
    const betStats = round.betStats || {
      colors: {
        Red: { count: 0, amount: 0, potential: 0 },
        Green: { count: 0, amount: 0, potential: 0 },
        Violet: { count: 0, amount: 0, potential: 0 }
      },
      numbers: {}
    };
    
    // Initialize numbers if not present
    for (let i = 0; i < 10; i++) {
      if (!betStats.numbers[i]) {
        betStats.numbers[i] = { count: 0, amount: 0, potential: 0 };
      }
    }
    
    const colors = ['Red', 'Green', 'Violet'];
    const numbers = Array.from({ length: 10 }, (_, i) => i.toString());
    
    // Find the color with the lowest potential payout
    const lowestPayoutColor = Object.entries(betStats.colors || {})
      .sort((a, b) => a[1].potential - b[1].potential)[0]?.[0] || 'Red';
      
    // Find the number with the lowest potential payout
    const lowestPayoutNumber = Object.entries(betStats.numbers || {})
      .sort((a, b) => a[1].potential - b[1].potential)[0]?.[0] || '0';
      
    // Get total number of bets and total bet amount for this round
    const totalBets = Object.values(betStats.colors).reduce((sum, color) => sum + (color.count || 0), 0) +
                      Object.values(betStats.numbers).reduce((sum, num) => sum + (num.count || 0), 0);
                    
    const totalAmount = Object.values(betStats.colors).reduce((sum, color) => sum + (color.amount || 0), 0) +
                        Object.values(betStats.numbers).reduce((sum, num) => sum + (num.amount || 0), 0);
  
    // Debug - Force render in an effect
    useEffect(() => {
      console.log('WingoRoundStats mounted for round:', round._id);
      return () => {
        console.log('WingoRoundStats unmounted for round:', round._id);
      };
    }, []); // Empty dependency array - only run once on mount/unmount, don't track round._id
    
    // Add countdown timer effect
    useEffect(() => {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Only set up countdown for open rounds
      if (round.status === 'open' && round.endTime) {
        const updateCountdown = () => {
          const now = new Date();
          const endTime = new Date(round.endTime);
          const diff = endTime - now;
          
          // If time is up, clear the interval
          if (diff <= 0) {
            setTimeRemaining('00:00');
            setCountdownPercent(0);
            clearInterval(timerRef.current);
            
            // Trigger a refresh of the rounds data when a round ends
            console.log('Round ended, triggering refresh...');
            // We need to access the parent component's fetchResults function
            // This will be handled via a global event
            const refreshEvent = new CustomEvent('wingoRoundEnded', {
              detail: { roundId: round._id, duration: round.duration }
            });
            window.dispatchEvent(refreshEvent);
            
            return;
          }
          
          // Calculate minutes and seconds
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          // Format the time remaining
          setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          
          // Calculate percentage for progress bar
          // Use the round duration to determine total time
          const totalDurationMs = round.duration * 60 * 1000;
          const percentRemaining = (diff / totalDurationMs) * 100;
          setCountdownPercent(Math.max(0, Math.min(100, percentRemaining)));
        };
        
        // Update immediately and then every second
        updateCountdown();
        timerRef.current = setInterval(updateCountdown, 1000);
      } else {
        setTimeRemaining('--:--');
        setCountdownPercent(0);
      }
      
      // Clean up on unmount
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }, [round.endTime, round.status, round.duration, round._id]);
    
    // Handler for setting the result
    const handleSetResult = useCallback(() => {
      onUpdateResult(round._id, round.duration, selectedColor, parseInt(selectedNumber, 10));
    }, [onUpdateResult, round._id, round.duration, selectedColor, selectedNumber]);
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {round.duration} min Round {round.roundNumber || ''}
          </h3>
          <div className="flex items-center">
            {/* Countdown timer */}
            {round.status === 'open' && (
              <div className="mr-3 flex flex-col items-center">
                <div className="text-sm font-bold text-gray-700">{timeRemaining}</div>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div 
                    className={`h-full rounded-full ${
                      countdownPercent > 60 ? 'bg-green-500' : 
                      countdownPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${countdownPercent}%` }}
                  ></div>
                </div>
              </div>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              round.status === 'open' 
                ? 'bg-green-100 text-green-800' 
                : round.status === 'closed' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {round.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Color Bets</h4>
            <div className="space-y-2">
              {colors.map(color => (
                <div key={color} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${
                      color === 'Red' ? 'bg-red-500' : 
                      color === 'Green' ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                    <span>{color}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{betStats.colors[color]?.count || 0} bets</span>
                    <span className="mx-2">|</span>
                    <span>${betStats.colors[color]?.amount || 0}</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-600">Payout: ${betStats.colors[color]?.potential || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Number Bets</h4>
            <div className="grid grid-cols-2 gap-2">
              {numbers.map(num => (
                <div key={num} className="flex justify-between items-center p-2 border rounded">
                  <span>{num}</span>
                  <div className="text-sm">
                    <span className="font-medium">{betStats.numbers[num]?.count || 0}</span>
                    <span className="mx-1">|</span>
                    <span>${betStats.numbers[num]?.amount || 0}</span>
                    <span className="mx-1">|</span>
                    <span className="text-red-600">${betStats.numbers[num]?.potential || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex flex-col md:flex-row md:items-center mb-4">
            <div className="mb-2 md:mb-0 md:mr-4">
              <span className="text-sm font-medium text-gray-700">Recommended:</span>
              <div className="flex items-center mt-1">
                <div className={`w-4 h-4 rounded-full mr-1 ${
                  lowestPayoutColor === 'Red' ? 'bg-red-500' : 
                  lowestPayoutColor === 'Green' ? 'bg-green-500' : 'bg-purple-500'
                }`}></div>
                <span className="mr-2">{lowestPayoutColor}</span>
                <span className="font-medium">{lowestPayoutNumber}</span>
              </div>
            </div>
            
            <div className="mb-2 md:mb-0 md:mr-4">
              <span className="text-sm font-medium text-gray-700">Round Status:</span>
              <div className="mt-1 flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  round.status === 'completed' 
                    ? 'bg-blue-100 text-blue-800' 
                    : round.status === 'open' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {round.status === 'completed' 
                    ? `Result: ${round.winningColor || 'None'} ${round.winningNumber !== undefined ? round.winningNumber : 'None'}` 
                    : round.status.charAt(0).toUpperCase() + round.status.slice(1)
                  }
                </span>
              </div>
            </div>
            
            <div className="mb-2 md:mb-0 md:mr-4">
              <span className="text-sm font-medium text-gray-700">Live Stats:</span>
              <div className="mt-1 flex items-center space-x-4">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {totalBets} bets
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4 mb-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Set Result</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex space-x-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`px-3 py-1 rounded-md flex items-center ${
                        selectedColor === color 
                          ? 'bg-gray-200 border-2 border-gray-400' 
                          : 'bg-gray-100 border border-gray-300'
                      }`}
                      onClick={() => setSelectedColor(color)}
                    >
                      <div className={`w-3 h-3 rounded-full mr-1 ${
                        color === 'Red' ? 'bg-red-500' : 
                        color === 'Green' ? 'bg-green-500' : 'bg-purple-500'
                      }`}></div>
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number</label>
                <div className="grid grid-cols-5 gap-1">
                  {numbers.map(num => (
                    <button
                      key={num}
                      type="button"
                      className={`px-2 py-1 rounded-md ${
                        selectedNumber === num 
                          ? 'bg-gray-200 border-2 border-gray-400' 
                          : 'bg-gray-100 border border-gray-300'
                      }`}
                      onClick={() => setSelectedNumber(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="button"
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleSetResult}
              >
                Set Result
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if the round ID changed or if critical properties changed
    return (
      prevProps.round._id === nextProps.round._id &&
      prevProps.round.status === nextProps.round.status &&
      prevProps.round.winningColor === nextProps.round.winningColor &&
      prevProps.round.winningNumber === nextProps.round.winningNumber
    );
  });

  // Function to group rounds by period
  const groupRoundsByPeriod = (rounds) => {
    // Create a map of rounds grouped by duration
    const groupedRounds = rounds.reduce((acc, round) => {
      const duration = round.duration.toString();
      if (!acc[duration]) {
        acc[duration] = [];
      }
      acc[duration].push(round);
      return acc;
    }, {});
    
    return groupedRounds;
  };

  // Handle refresh auth token button 
  const refreshAdminSession = () => {
    // Clear token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/admin/login';
  };

  // Add event listener for round ended events to refresh the results
  useEffect(() => {
    const handleRoundEnded = (event) => {
      console.log('Round ended event received:', event.detail);
      if (selectedGame === 'Wingo') {
        console.log('Refreshing Wingo rounds after round ended');
        // Add a small delay to allow the server to update
        setTimeout(() => fetchResults(selectedGame), 1000);
      }
    };
    
    // Add event listener
    window.addEventListener('wingoRoundEnded', handleRoundEnded);
    
    // Clean up
    return () => {
      window.removeEventListener('wingoRoundEnded', handleRoundEnded);
    };
  }, [selectedGame, fetchResults]);

  // Add periodic refresh for Wingo rounds to ensure we always have the latest data
  useEffect(() => {
    let refreshInterval = null;
    
    if (selectedGame === 'Wingo' && activeView === 'results') {
      console.log('Setting up periodic refresh for Wingo rounds');
      // Refresh every 30 seconds to ensure we always have the latest rounds
      refreshInterval = setInterval(() => {
        console.log('Performing periodic refresh of Wingo rounds');
        fetchResults(selectedGame);
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [selectedGame, activeView, fetchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Game Management</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md focus:outline-none ${
              activeView === 'games'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setActiveView('games')}
          >
            Games
          </button>
          <button
            className={`px-4 py-2 rounded-md focus:outline-none ${
              activeView === 'results'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveView('results');
              // If a game is already selected, we can prefetch its results
              if (selectedGame) {
                fetchResults(selectedGame);
              }
            }}
          >
            Results
          </button>
        </div>
      </div>

      {/* Error notification and recovery */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {(error.includes('Authentication') || error.includes('Unauthorized') || error.includes('token')) && (
            <button 
              onClick={refreshAdminSession}
              className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
            >
              Refresh Session
            </button>
          )}
        </div>
      )}
      
      {/* WebSocket Status */}
      <div className="flex items-center mb-4">
        <div className="mr-2">
          WebSocket: 
          <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
            wsStatus === 'connected' ? 'bg-green-100 text-green-800' :
            wsStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            wsStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {wsStatus === 'connected' ? 'Connected' : 
             wsStatus === 'connecting' ? 'Connecting...' : 
             wsStatus === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
      </div>

      {activeView === 'games' ? (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Game Management</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map(game => (
              <GameCard key={game.identifier} game={game} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Result Management</h1>
          <div className="mb-6 border-b border-gray-200">
            <div className="flex flex-wrap -mb-px">
              <button
                className={`mr-2 py-2 px-4 font-medium text-sm focus:outline-none ${
                  !selectedGame ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setSelectedGame(null);
                  setResults([]);
                }}
              >
                Select Game
              </button>
              
              {games.map(game => (
                <button
                  key={game._id}
                  className={`mr-2 py-2 px-4 font-medium text-sm focus:outline-none ${
                    selectedGame === game.identifier ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => {
                    console.log(`Clicked on game tab: ${game.identifier}`);
                    // First clear any existing results to prevent state conflicts
                    setResults([]);
                    // Then set loading to true and update the selected game
                    setResultLoading(true);
                    setSelectedGame(game.identifier);
                    // Use setTimeout to ensure state updates have propagated before fetching
                    setTimeout(() => {
                      fetchResults(game.identifier);
                    }, 50);
                  }}
                >
                  {game.name}
                </button>
              )).filter(button => !button.props.children.includes('Wingo'))}
              
              <button
                className="ml-auto py-2 px-4 font-medium text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => {
                  setActiveView('games');
                }}
              >
                Back to Games
              </button>
              
              {selectedGame && (
                <button
                  className="py-2 px-4 font-medium text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
                  onClick={() => {
                    // Force refresh results
                    setResultLoading(true);
                    setResults([]); // Clear results first
                    setLastRefresh(Date.now());
                    setTimeout(() => {
                      fetchResults(selectedGame);
                    }, 50);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>
          
          {/* Period Filter - Only show for Wingo game */}
          {selectedGame === 'Wingo' && (
            <div className="mt-4 flex flex-wrap items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Period Filter:</span>
              <div className="flex space-x-1">
                <button
                  className={`px-3 py-1 text-xs rounded ${selectedPeriod === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => {
                    setSelectedPeriod(null);
                    // Refresh results with new filter
                    setTimeout(() => fetchResults(selectedGame), 50);
                  }}
                >
                  All Periods
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded ${selectedPeriod === '1' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => {
                    setSelectedPeriod('1');
                    // Refresh results with new filter
                    setTimeout(() => fetchResults(selectedGame), 50);
                  }}
                >
                  1 Min
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded ${selectedPeriod === '3' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => {
                    setSelectedPeriod('3');
                    // Refresh results with new filter
                    setTimeout(() => fetchResults(selectedGame), 50);
                  }}
                >
                  3 Min
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded ${selectedPeriod === '5' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => {
                    setSelectedPeriod('5');
                    // Refresh results with new filter
                    setTimeout(() => fetchResults(selectedGame), 50);
                  }}
                >
                  5 Min
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded ${selectedPeriod === '10' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => {
                    setSelectedPeriod('10');
                    // Refresh results with new filter
                    setTimeout(() => fetchResults(selectedGame), 50);
                  }}
                >
                  10 Min
                </button>
              </div>
            </div>
          )}
          
          {resultLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {selectedGame === 'Wingo' && (
                <div className="wingo-results-section">
                  {results.length > 0 ? (
                    <div>
                      <div className="bg-white p-4 rounded-lg shadow mb-4">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Wingo Rounds Management</h3>
                        <p className="text-sm text-gray-600">
                          {selectedPeriod 
                            ? `Showing active round for ${selectedPeriod}-minute period.` 
                            : `Showing active rounds for all periods.`}
                        </p>
                      </div>
                      {console.log('Rendering Wingo rounds:', results)}
                      <div className="wingo-rounds-list">
                        {/* Use key with unique but stable identifier to prevent excessive mounting/unmounting */}
                        <div key={`stable-wingo-container-${stableKey}`}>
                          {/* Group rounds by period if showing all periods */}
                          {!selectedPeriod && Object.entries(groupRoundsByPeriod(results)).map(([duration, durationRounds]) => (
                            <div key={`period-${duration}`} className="mb-6">
                              <h4 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">
                                {duration}-Minute Period Rounds
                              </h4>
                              {durationRounds.map(round => {
                                console.log(`Rendering round in group ${duration}:`, round._id);
                                return (
                                  <WingoRoundStats 
                                    key={`${round._id}-stable`} 
                                    round={round} 
                                    onUpdateResult={handleResultUpdate}
                                  />
                                );
                              })}
                            </div>
                          ))}
                          
                          {/* If a specific period is selected, render rounds normally */}
                          {selectedPeriod && results.map((round, index) => {
                            // Double check that this round is for the selected period
                            if (round.duration.toString() !== selectedPeriod) {
                              console.log(`Skipping round ${round._id} with duration ${round.duration} - doesn't match selected period ${selectedPeriod}`);
                              return null;
                            }
                            
                            console.log(`Rendering round ${index} for period ${selectedPeriod}:`, round._id);
                            return (
                              <WingoRoundStats 
                                key={`${round._id}-stable`} 
                                round={round} 
                                onUpdateResult={handleResultUpdate}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500 mb-2">
                        {selectedPeriod 
                          ? `No active Wingo rounds found for ${selectedPeriod}-minute period` 
                          : 'No active Wingo rounds found across any period'}
                      </p>
                      <button 
                        onClick={() => {
                          setResultLoading(true);
                          setTimeout(() => fetchResults(selectedGame), 50);
                        }}
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {selectedGame && selectedGame !== 'Wingo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.length > 0 ? (
                    results.map(result => (
                      <div key={result._id} className="bg-white rounded-lg shadow-lg p-6">
                        {/* Other game results rendering */}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex items-center justify-center py-8">
                      <p className="text-gray-500">
                        {selectedGame ? 'No results found' : 'Select a game to view results'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {!selectedGame && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">Select a game to view results</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGameManagement;