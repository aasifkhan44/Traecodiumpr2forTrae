import React, { useState, useEffect, Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import api, { API_BASE_URL } from '../../../utils/api';
import { WS_URL } from '../../../utils/ws';
import { useAuth } from '../../../contexts/AuthContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { toast } from 'react-hot-toast';

export default function WingoPlay() {
  const { user, setUser } = useAuth();
  const { siteSettings } = useSiteSettings();
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
  const [recentResults, setRecentResults] = useState([]); // Fix recent results not showing
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('bets'); // 'bets' or 'results'
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState([]);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
  const [waitingForNextRound, setWaitingForNextRound] = useState(false);
  const timerRef = React.useRef(null);
  const wsRef = React.useRef(null);

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
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;
    let reconnectTimer = null;
    let pollInterval = null;

    const connectWebSocket = async () => {
      try {
        if (wsRef.current) {
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onopen = () => {
          reconnectAttempts = 0;
          wsRef.current.send(JSON.stringify({ type: 'getRounds', game: 'wingo' }));
        };
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'roundUpdate' && data.rounds) {
              // Accept both array and object formats
              let roundsData = {};
              if (Array.isArray(data.rounds)) {
                data.rounds.forEach(round => {
                  if (round && round.duration) roundsData[round.duration] = round;
                });
              } else {
                roundsData = data.rounds;
              }
              setActiveRounds(roundsData);
              setError(null);
              setLoading(false);
            }
          } catch (err) {
            // Ignore
          }
        };
        wsRef.current.onerror = (err) => {
          setError('WebSocket connection failed.');
          // As fallback, start polling
          pollInterval = setInterval(fetchActiveRounds, 5000);
        };
        wsRef.current.onclose = (e) => {
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimer = setTimeout(connectWebSocket, reconnectDelay);
          } else {
            setError('WebSocket connection failed. Please refresh or try again later.');
            // As fallback, start polling
            pollInterval = setInterval(fetchActiveRounds, 5000);
          }
        };
      } catch (err) {
        setError('WebSocket connection failed.');
        // As fallback, start polling
        pollInterval = setInterval(fetchActiveRounds, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
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

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const round = activeRounds[selectedDuration];
    if (!round || !round.endTime) {
      setLocalTimeRemaining(null);
      return;
    }
    const calcRemaining = () => {
      const now = Date.now();
      const end = new Date(round.endTime).getTime();
      return Math.max(0, Math.floor((end - now) / 1000));
    };
    setLocalTimeRemaining(calcRemaining());
    setWaitingForNextRound(false);
    timerRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setLocalTimeRemaining(remaining);
      if (remaining === 0) {
        setWaitingForNextRound(true);
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'getRounds', game: 'wingo' }));
        } else {
          fetchActiveRounds();
        }
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeRounds, selectedDuration]);

  useEffect(() => {
    const round = activeRounds[selectedDuration];
    if (waitingForNextRound && round && round.timeRemaining > 0) {
      setWaitingForNextRound(false);
    }
  }, [activeRounds, selectedDuration, waitingForNextRound]);

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
      const response = await api.get(`${API_BASE_URL}/wingo/active-rounds`);
      if (response.data.success && response.data.data) {
        let roundsData = {};
        if (Array.isArray(response.data.data)) {
          if (response.data.data.length === 0) {
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

  // --- Only update round info, never reload page on duration change ---
  const handleDurationChange = (duration) => {
    setSelectedDuration(duration);
    setError(null);
    // Only fetch rounds, don't reload or set loading for whole page
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'getRounds', game: 'wingo' }));
    } else {
      fetchActiveRounds();
    }
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
    setBetError(null);
    try {
      const response = await api.post(`${API_BASE_URL}/wingo/bet`, {
        duration: selectedDuration,
        betType: selectedBetType,
        betValue: selectedBetValue,
        amount: Number(betAmount),
      });
      if (response.data && response.data.success) {
        toast.success('Bet placed successfully');
        fetchUserData(); // Refresh user wallet
        fetchRecentBets(); // Refresh bets
        setSelectedBetType(null);
        setSelectedBetValue(null);
        setBetAmount('10');
      } else {
        toast.error(response.data?.message || 'Failed to place bet');
      }
    } catch (error) {
      setBetError(error.response?.data?.message || error.message || 'Failed to place bet');
      toast.error(error.response?.data?.message || error.message || 'Failed to place bet');
    } finally {
      setBetLoading(false);
    }
  };

  const fetchRecentBets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await api.get(`${API_BASE_URL}/wingo/recent-bets`);
      
      if (response.data.success && response.data.bets) {
        setRecentBets(response.data.bets);
      } else {
        setRecentBets([]);
        toast.error('Failed to load recent bets');
      }
    } catch (error) {
      setRecentBets([]);
      toast.error('Error loading recent bets: ' + (error.message || 'Unknown error'));
    }
  };

  const fetchRecentResults = async () => {
    try {
      setError(null); // Clear any previous errors
      
      const response = await api.get(`${API_BASE_URL}/wingo/recent-results`, {
        params: {
          page: currentPage,
          limit: resultsPerPage,
          search: search.trim() // Trim whitespace from search
        }
      });
      
      if (response.data && response.data.results) {
        setResults(response.data.results);
        setRecentResults(response.data.results); // Fix recent results not showing
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
      } else {
        setResults([]);
        setRecentResults([]); // Fix recent results not showing
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      setResults([]);
      setRecentResults([]); // Fix recent results not showing
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
          const profileResponse = await api.get(`${API_BASE_URL}/user/profile`);
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

  const formatTime = (time) => {
    if (typeof time !== 'number' || time < 0) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
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
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center px-2 sm:px-4 py-2 sm:py-4">
      {/* Header: Logo + Game Name */}
      <div className="w-full max-w-2xl flex flex-row items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
        <div className="flex items-center gap-2">
          {/* Logo */}
          {siteSettings?.logoUrl && (
            <img
              src={siteSettings.logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-lg shadow bg-white object-contain"
              style={{ background: '#fff' }}
            />
          )}
          {/* Game Name */}
          <span className="font-bold text-lg sm:text-2xl text-gray-900 dark:text-white select-none">Wingo</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-4">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center sm:text-left">Color & Number Prediction</span>
        </div>
        <div className="rounded-xl px-4 sm:px-6 py-2 shadow text-base sm:text-lg font-bold flex items-center bg-gradient-to-r from-blue-100 to-green-100 border border-blue-200 text-blue-900 min-w-[120px]">
          ⚡{userProfile?.balance?.toLocaleString() || '0'}
        </div>
      </div>
      <div className="h-2 sm:h-4" />
      {/* Duration Selector and Timer */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
        <div className="flex w-full gap-2 justify-center">
          {durations.map(d => (
            <button
              key={d.value}
              className={`flex-1 min-w-0 px-0 py-1 sm:px-0 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gradient-to-b ${selectedDuration === d.value ? 'from-purple-700 to-purple-400 text-white ring-2 ring-yellow-400 scale-105' : 'from-black to-gray-800 text-white hover:brightness-110 opacity-90'} tracking-wide relative active:scale-95`}
              style={{ boxShadow: '0 4px 16px #000a', textShadow: '0 1px 2px #fff3' }}
              onClick={() => setSelectedDuration(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex flex-row items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 shadow font-mono text-base sm:text-lg">
          <span className="text-blue-700 font-bold">Round:</span>
          <span className="bg-blue-100 px-2 py-0.5 rounded">{activeRounds[selectedDuration]?.roundNumber || '--'}</span>
          <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-700">{selectedDuration} min</span>
          <span className={`font-mono text-base sm:text-lg ${localTimeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-green-700'}`}>{formatTime(localTimeRemaining)}</span>
        </div>
      </div>
      <div className="h-2 sm:h-4" />
      {/* Betting Controls Section */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-2 sm:gap-4">
        {/* Color Selection */}
        <div className="flex gap-2 sm:gap-4 mb-2 w-full max-w-xs sm:max-w-sm justify-center">
          {colors.map(opt => (
            <button
              key={opt.value}
              className={`flex-1 min-w-0 h-8 sm:h-10 max-w-[110px] rounded-lg flex items-center justify-center font-semibold text-base sm:text-lg cursor-pointer relative overflow-hidden border transition-all duration-200 px-2 sm:px-3 text-white select-none ${selectedBetType === 'color' && selectedBetValue === opt.value ? 'border-yellow-400 ring-2 ring-yellow-200 scale-105 z-10' : ''} ${opt.className}`}
              style={{
                boxShadow: '0 4px 16px #222b',
                textShadow: '0 1px 2px #fff8',
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                letterSpacing: '0.5px',
              }}
              onClick={() => {
                setSelectedBetType('color');
                setSelectedBetValue(opt.value);
              }}
            >
              <span className="relative z-10 select-none w-full text-center truncate" style={{lineHeight: 1.1}}>{opt.value}</span>
            </button>
          ))}
        </div>
        <div className="h-2 sm:h-4" />
        {/* Number Grid */}
        <div className="grid grid-cols-5 gap-y-4 gap-x-4 mb-2 sm:mb-4 w-full max-w-xs sm:max-w-sm">
          {numbers.map(n => {
            let bg = '';
            let text = 'text-white';
            // Color logic: 0=red+violet, 5=green+violet, 1,3,7,9=green, 2,4,6,8=red
            if (n === 0) {
              bg = 'bg-gradient-to-br from-red-500 to-purple-500';
            } else if (n === 5) {
              bg = 'bg-gradient-to-br from-green-500 to-purple-500';
            } else if ([1,3,7,9].includes(n)) {
              bg = 'bg-green-500';
            } else if ([2,4,6,8].includes(n)) {
              bg = 'bg-red-500';
            } else {
              bg = 'bg-gray-200';
              text = 'text-gray-900';
            }
            // Gradient effect for 3
           
            // Selected style
            let selected = selectedBetType === 'number' && selectedBetValue === n
              ? 'border-yellow-400 ring-2 ring-yellow-200 scale-105 z-10 bg-yellow-100 text-gray-900'
              : `border-gray-300 ${bg} ${text} hover:opacity-80 hover:scale-105 hover:ring-2 hover:ring-yellow-300`;
            return (
              <button
                key={n}
                className={`w-16 h-8 sm:w-20 sm:h-10 rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl border-2 transition-all duration-200 focus:outline-none select-none ${selected}`}
                style={{
                  boxShadow: '0 4px 16px #222b',
                  textShadow: 'none',
                  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                  letterSpacing: '0.5px',
                }}
                onClick={() => {
                  setSelectedBetType('number');
                  setSelectedBetValue(n);
                }}
              >
                <span className="relative z-10 select-none">{n}</span>
              </button>
            );
          })}
        </div>
        {/* Bet Amount and Place Bet */}
        <div className="flex flex-col sm:flex-row w-full max-w-xs sm:max-w-sm gap-2 sm:gap-4 items-center justify-center mb-2">
          <input
            type="number"
            min={1}
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-base sm:text-lg font-bold text-center focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            placeholder="Bet Amount"
          />
          <button
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-all text-base sm:text-lg"
            onClick={handlePlaceBet}
            disabled={betLoading}
          >
            {betLoading ? 'Placing...' : 'Place Bet'}
          </button>
        </div>
        {betError && <div className="text-red-500 text-xs mb-2">{betError}</div>}
      </div>

      {/* Recent Bets / Results Tabs */}
      <div className="w-full max-w-2xl bg-white rounded-t-xl shadow flex flex-col mt-4">
        <div className="flex justify-center gap-4 py-2 border-b">
          <button
            className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${viewMode === 'bets' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setViewMode('bets')}
          >
            Recent Bets
          </button>
          <button
            className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${viewMode === 'results' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setViewMode('results')}
          >
            Recent Results
          </button>
        </div>
        <RecentBets
          bets={recentBets}
          results={recentResults}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentPage={currentPage}
          resultsPerPage={resultsPerPage}
          handlePageChange={setCurrentPage}
          totalCount={totalCount}
          totalPages={totalPages}
          search={search}
          setSearch={setSearch}
          hideTabs
        />
      </div>
    </div>
  );
}

function RecentBets({ bets, results, viewMode, setViewMode, currentPage, resultsPerPage, handlePageChange, totalCount, totalPages, search, setSearch, hideTabs }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {!hideTabs && (
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
      )}
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Round</th>
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
                      {bet.roundNumber ? `#${bet.roundNumber}` : (bet.roundId || '-')}
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
          {/* Modern mobile pagination */}
          <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
            <span className="text-gray-600 text-xs sm:text-sm">Total Results: {totalCount}</span>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-colors shadow-sm border border-gray-200 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-purple-700 hover:bg-purple-50'
                }`}
              >
                &#8592; Prev
              </button>
              <span className="text-gray-600 text-xs sm:text-sm px-1 sm:px-2 flex items-center">
                Page {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base font-semibold transition-colors shadow-sm border border-gray-200 ${
                  currentPage === totalPages || totalPages === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-purple-700 hover:bg-purple-50'
                }`}
              >
                Next &#8594;
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
      roundNumber: PropTypes.string,
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