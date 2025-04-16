import React, { useState, useEffect, Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
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
  const [recentBets, setRecentBets] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('bets'); // 'bets' or 'results'
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState([]);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
  const timerRef = React.useRef(null);

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
    fetchActiveRounds();
    const pollInterval = setInterval(fetchActiveRounds, 5000);
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;
    let reconnectTimer = null;

    const connectWebSocket = async () => {
      try {
        if (ws) {
          ws.onclose = null;
          ws.close();
        }

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

        if (!wsUrl) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const hostname = window.location.hostname;
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
          reconnectAttempts = 0;
          fetchActiveRounds();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            if (data.type === 'roundError') {
              console.error('Server error:', data.error, '-', data.details);
              setError(`${data.message}: ${data.details}`);
              setLoading(false);
              return;
            }

            // Check for bet result to show win/loss notification with updated balance
            if (data.type === 'betResult') {
              // Refresh user balance when bet results are received
              fetchUserData();
              
              // Display win/loss notification with updated balance
              if (data.win) {
                const winAmount = data.payout || data.amount || 0;
                toast.success(
                  <div>
                    <strong>You won!</strong>
                    <div>Amount: +🪙{winAmount.toFixed(2)}</div>
                    <div className="mt-1">Refreshing balance...</div>
                  </div>,
                  { duration: 5000 }
                );
                
                // After a short delay, show the updated balance
                setTimeout(() => {
                  if (userProfile && userProfile.balance) {
                    toast.success(
                      <div>
                        <strong>Balance Updated</strong>
                        <div>New Balance: 🪙{userProfile.balance.toFixed(2)}</div>
                      </div>,
                      { duration: 3000 }
                    );
                  }
                }, 2000);
              } else if (data.loss) {
                toast.error(
                  <div>
                    <strong>Better luck next time!</strong>
                    <div>Amount: -🪙{data.amount?.toFixed(2) || '0.00'}</div>
                  </div>,
                  { duration: 3000 }
                );
              }
              
              // Also fetch recent bets to show updated results
              fetchRecentBets();
            }

            // Check for round completion to refresh balance
            if (data.type === 'roundComplete' || data.type === 'roundResult') {
              // Refresh user balance when a round completes
              fetchUserData();
              
              // If there's a result with color/number, show it
              if (data.result) {
                const { color, number } = data.result;
                toast.info(
                  <div>
                    <strong>Round Complete!</strong>
                    <div>Result: {color} {number}</div>
                  </div>,
                  { duration: 3000 }
                );
              }
              
              // Also fetch recent bets to show updated results
              fetchRecentBets();
            }

            // Handle balance update message directly
            if (data.type === 'balanceUpdate' && data.balance !== undefined) {
              const prevBalance = userProfile?.balance || 0;
              const newBalance = data.balance;
              const difference = newBalance - prevBalance;
              
              // Update the user profile with new balance
              setUserProfile(prevProfile => {
                if (!prevProfile || prevProfile.balance !== data.balance) {
                  // If balance increased significantly, show a win notification
                  if (difference > 0 && difference > 1) {
                    toast.success(
                      <div>
                        <strong>Balance Updated</strong>
                        <div>New Balance: 🪙{newBalance.toFixed(2)}</div>
                        <div className="text-green-500">+🪙{difference.toFixed(2)}</div>
                      </div>,
                      { duration: 3000 }
                    );
                  }
                  return { ...prevProfile, balance: data.balance };
                }
                return prevProfile;
              });
            }
            
            // Check for round update to refresh balance
            if (data.type === 'roundUpdate' && data.round && data.duration) {
              setActiveRounds(prevRounds => {
                // Check if this is a new round (different round number)
                const isNewRound = !prevRounds[data.duration] || 
                                  prevRounds[data.duration].roundNumber !== data.round.roundNumber;
                
                // If it's a new round, refresh the user balance
                if (isNewRound) {
                  fetchUserData();
                }
                
                return {
                  ...prevRounds,
                  [data.duration]: data.round
                };
              });
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
                // Only update if rounds have changed
                setActiveRounds(prevRounds => {
                  // Check if the rounds are different
                  const hasChanged = Object.keys(roundsObj).some(duration => {
                    return !prevRounds[duration] || 
                           prevRounds[duration].roundNumber !== roundsObj[duration].roundNumber ||
                           prevRounds[duration].timeRemaining !== roundsObj[duration].timeRemaining;
                  });
                  
                  // If a new round has started, refresh the user balance
                  if (hasChanged) {
                    const hasNewRound = Object.keys(roundsObj).some(duration => {
                      return !prevRounds[duration] || 
                             prevRounds[duration].roundNumber !== roundsObj[duration].roundNumber;
                    });
                    
                    if (hasNewRound) {
                      fetchUserData();
                    }
                  }
                  
                  return hasChanged ? roundsObj : prevRounds;
                });
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
        fetchActiveRounds();
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
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchRecentBets();
    const interval = setInterval(() => {
      fetchRecentBets();
    }, 30000); // Refresh bets every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchRecentResults();
  }, [currentPage, search]);

  const userBalance = useMemo(() => {
    if (userProfile && userProfile.balance !== undefined) {
      const profileBalance = typeof userProfile.balance === 'string' ? parseFloat(userProfile.balance) : userProfile.balance;
      return isNaN(profileBalance) ? 0 : profileBalance;
    }
    if (user && user.balance !== undefined) {
      const userBalanceValue = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
      return isNaN(userBalanceValue) ? 0 : userBalanceValue;
    }
    return 0;
  }, [user, userProfile]);

  const fetchActiveRounds = async () => {
    try {
      const response = await api.get('/wingo/active-rounds');
      if (response.data.success && response.data.data) {
        let roundsData = {};
        if (Array.isArray(response.data.data)) {
          if (response.data.data.length === 0) {
            console.warn('No active rounds returned from server');
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
          // Only update if rounds have changed
          setActiveRounds(prevRounds => {
            // Check if the rounds are different
            const hasChanged = Object.keys(roundsData).some(duration => {
              return !prevRounds[duration] || 
                     prevRounds[duration].roundNumber !== roundsData[duration].roundNumber ||
                     prevRounds[duration].timeRemaining !== roundsData[duration].timeRemaining;
            });
            
            return hasChanged ? roundsData : prevRounds;
          });
          setError(null);
        } else if (Object.keys(activeRounds).length === 0) {
          toast.error('No valid round data received from server');
        }
      } else {
        if (Object.keys(activeRounds).length === 0) {
          toast.error(`Failed to load active rounds: ${response.data.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error loading rounds:', err);
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
        toast.success('Bet placed successfully!');
        await fetchUserData();
        await fetchRecentBets();
        setSelectedBetType(null);
        setSelectedBetValue(null);
        setBetAmount('10');
        setError(null);
      } else {
        toast.error(response.data.message || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Bet placement error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place bet';
      toast.error(errorMessage);
    } finally {
      setBetLoading(false);
    }
  };

  const fetchRecentBets = async () => {
    try {
      console.log('Fetching recent bets...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found');
        return;
      }
      
      const response = await api.get('/wingo/recent-bets');
      console.log('Recent bets response:', response.data);
      
      if (response.data.success && response.data.bets) {
        console.log('Recent bets fetched:', response.data.bets.length);
        setRecentBets(response.data.bets);
      } else {
        console.log('No bets returned from server or unsuccessful response');
        setRecentBets([]);
        toast.error('Failed to load recent bets');
      }
    } catch (error) {
      console.error('Error fetching recent bets:', error);
      setRecentBets([]);
      toast.error('Error loading recent bets: ' + (error.message || 'Unknown error'));
    }
  };

  const fetchRecentResults = async () => {
    try {
      console.log('Fetching recent results...');
      setError(null); // Clear any previous errors
      
      const response = await api.get('/wingo/recent-results', {
        params: {
          page: currentPage,
          limit: resultsPerPage,
          search: search.trim() // Trim whitespace from search
        }
      });
      
      console.log('Recent results response:', response.data);
      
      if (response.data && response.data.results) {
        setResults(response.data.results);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
      } else {
        setResults([]);
        setTotalPages(1);
        setTotalCount(0);
        console.error('No results data in response');
      }
    } catch (error) {
      console.error('Error fetching recent results:', error);
      setResults([]);
      setTotalPages(1);
      setTotalCount(0);
      
      // Show a more user-friendly error message
      if (error.response && error.response.status === 500) {
        toast.error('Server error while fetching results. Please try again later.');
      } else {
        toast.error('Failed to fetch recent results: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchRecentResults();
  };

  // Restore fetchUserData function
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profileResponse = await api.get('/user/profile');
          if (profileResponse.data.success && profileResponse.data.data) {
            const userData = profileResponse.data.data;
            // Only update if the balance actually changed
            setUserProfile(prevProfile => {
              if (!prevProfile || prevProfile.balance !== userData.balance) {
                return userData;
              }
              return prevProfile;
            });
          }
        } catch (profileError) {
          console.error('Error fetching profile data:', profileError);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Sync local time remaining with active round for selected duration
  useEffect(() => {
    const round = activeRounds[selectedDuration];
    if (round && typeof round.timeRemaining === 'number' && round.timeRemaining > 0) {
      setLocalTimeRemaining(round.timeRemaining);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setLocalTimeRemaining(prev => {
          if (prev === null || prev <= 1000) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      // If round is missing or timeRemaining is not valid, log for debugging
      console.warn('No valid round or timeRemaining for duration:', selectedDuration, round);
      setLocalTimeRemaining(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeRounds, selectedDuration]);

  // Also clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (time) => {
    if (typeof time !== 'number' || time < 0) return '00:00';
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  const currentResults = recentResults;

  return (
    <Fragment>
      <div className="p-2 md:p-4 mx-auto max-w-md">
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
                  <span className="text-base md:text-lg font-semibold text-green-700">
                    {formatTime(localTimeRemaining !== null ? localTimeRemaining : activeRounds[selectedDuration]?.timeRemaining ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Select Color</h4>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleBetTypeSelect('color', color.value)}
                  className={`relative flex-1 py-1 px-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                    color.value === 'Red'
                      ? `bg-red-500 text-white hover:shadow-xl hover:from-red-600 hover:to-red-800 ${
                        selectedBetType === 'color' && selectedBetValue === color.value
                          ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                          : ''
                      }`
                      : color.value === 'Violet'
                        ? `bg-purple-500 text-white hover:shadow-xl hover:from-purple-600 hover:to-purple-800 ${
                          selectedBetType === 'color' && selectedBetValue === color.value
                            ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                            : ''
                        }`
                        : `bg-green-500 text-white hover:shadow-xl hover:from-green-600 hover:to-green-800 ${
                          selectedBetType === 'color' && selectedBetValue === color.value
                            ? 'relative after:absolute after:inset-1 after:rounded-lg after:border-2 after:border-gold-500 after:opacity-100 after:transition-all after:duration-200 after:scale-95 hover:after:scale-100'
                            : ''
                        }`
                  }`}
                >
                  <span className="relative z-10">{color.value}</span>
                </button>
              ))}
            </div>
          </div>

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

          <div className="mb-4 md:mb-6">
            <h4 className="text-sm md:text-md font-medium mb-2">Bet Amount</h4>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setBetAmount('10');
                  } else if (/^\d+$/.test(value) && Number(value) > 0) {
                    setBetAmount(value);
                  }
                }}
                className="w-full px-3 py-2.5 text-center text-lg md:text-xl font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg pr-10 pl-10"
                placeholder="Enter amount"
              />
              <div className="absolute inset-y-0 left-0 flex items-center">
                <button
                  onClick={() => setBetAmount(prev => Math.max(10, Number(prev) - 10))}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                >
                  <span className="text-lg">-</span>
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  onClick={() => setBetAmount(prev => Number(prev) + 10)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>
            </div>
            <div className="flex justify-center space-x-2 mt-2">
              <button
                onClick={() => setBetAmount(prev => Number(prev) * 10)}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200 text-sm"
              >
                10X
              </button>
              <button
                onClick={() => setBetAmount(prev => Number(prev) * 20)}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200 text-sm"
              >
                20X
              </button>
              <button
                onClick={() => setBetAmount(prev => Number(prev) * 50)}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-700 text-white rounded-lg hover:from-pink-600 hover:to-pink-800 transition-all duration-200 text-sm"
              >
                50X
              </button>
            </div>
          </div>

          <div className="mt-3 md:mt-4.5">
            <button
              onClick={handlePlaceBet}
              className="w-full py-2.5 md:py-3.5 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-pink-500 to-pink-700 text-white hover:from-pink-600 hover:to-pink-800 text-sm md:text-base"
            >
              {betLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-1.5"></div>
                  Placing Bet...
                </div>
              ) : (
                'Place Bet'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <RecentBets 
          bets={recentBets} 
          results={results}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentPage={currentPage}
          resultsPerPage={resultsPerPage}
          handlePageChange={handlePageChange}
          totalCount={totalCount}
          totalPages={totalPages}
          search={search}
          setSearch={setSearch}
        />
      </div>
    </Fragment>
  );
}

function RecentBets({ bets, results, viewMode, setViewMode, currentPage, resultsPerPage, handlePageChange, totalCount, totalPages, search, setSearch }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('bets')}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'bets' 
                ? 'bg-purple-50 text-purple-700 font-semibold'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            Recent Bets
          </button>
          <button
            onClick={() => setViewMode('results')}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'results' 
                ? 'bg-purple-50 text-purple-700 font-semibold'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            Recent Results
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <div className="w-4 h-4 rounded-full bg-violet-500"></div>
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg">
        {viewMode === 'bets' ? (
          bets && bets.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-100 to-pink-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Bet Value</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Result</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Payout</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Round ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bets.map((bet) => (
                  <tr key={bet._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(bet.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {bet.betType === 'color' ? (
                          <div className={`px-3 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full ${
                            bet.betValue === 'Green' ? 'bg-green-100 text-green-800' :
                            bet.betValue === 'Red' ? 'bg-red-100 text-red-800' :
                            'bg-violet-100 text-violet-800'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              bet.betValue === 'Green' ? 'bg-green-500' :
                              bet.betValue === 'Red' ? 'bg-red-500' :
                              'bg-violet-500'
                            }`} />
                            <span className="ml-2">{bet.betValue}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                            <span className="ml-2">{bet.betValue}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      🪙{bet.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bet.status === 'pending' ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      ) : bet.status === 'won' ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
                          Won
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">
                          Lost
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bet.payout ? `🪙${bet.payout}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bet.roundId || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-gray-600">No recent bets found.</p>
          )
        ) : (
          results && results.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((round) => (
                  <tr key={round._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {round.roundNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {round.duration}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(round.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {round.result?.color ? (
                          <div className={`px-3 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full ${
                            round.result.color === 'Green' ? 'bg-green-100 text-green-800' :
                            round.result.color === 'Red' ? 'bg-red-100 text-red-800' :
                            'bg-violet-100 text-violet-800'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              round.result.color === 'Green' ? 'bg-green-500' :
                              round.result.color === 'Red' ? 'bg-red-500' :
                              'bg-violet-500'
                            }`} />
                            <span className="ml-2">{round.result.color}</span>
                          </div>
                        ) : round.result?.number !== null && round.result?.number !== undefined ? (
                          <div className="px-3 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                            <span className="ml-2">{round.result.number}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                            <span className="ml-2">-</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {round.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-gray-600">No recent results found.</p>
          )
        )}
      </div>

      {viewMode === 'results' && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePageChange(1); // Reset to page 1 when searching
                  }
                }}
                placeholder="Search by round number, ID, or status..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can search by round number, full round ID (e.g., 67feca30353ed45a275bcadc), or status.
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (search.trim()) {
                    handlePageChange(1); // Reset to page 1 when searching
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Search
              </button>
              {search.trim() && (
                <button
                  onClick={() => {
                    setSearch('');
                    handlePageChange(1);
                  }}
                  className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Results: {totalCount}</span>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Previous
              </button>
              <span className="text-gray-600">Page {currentPage} of {totalPages || 1}</span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === totalPages || totalPages === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

RecentBets.propTypes = {
  bets: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      createdAt: PropTypes.string,
      betType: PropTypes.string,
      betValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      amount: PropTypes.number,
      status: PropTypes.string,
      payout: PropTypes.number,
      roundId: PropTypes.string,
    })
  ),
  results: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      roundNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      duration: PropTypes.number,
      result: PropTypes.shape({
        color: PropTypes.string,
        number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
      totalBets: PropTypes.number,
      totalAmount: PropTypes.number,
      endTime: PropTypes.string,
    })
  ),
  viewMode: PropTypes.oneOf(['bets', 'results']).isRequired,
  setViewMode: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  resultsPerPage: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
};

WingoPlay.propTypes = {};