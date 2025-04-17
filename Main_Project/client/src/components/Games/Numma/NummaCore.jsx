import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import api from '../../../utils/api';
import { toast } from 'react-hot-toast';

const NummaCore = () => {
  // User state from AuthContext
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  // Log user object for debugging
  useEffect(() => {
    console.log('NummaCore: User from AuthContext:', user);
  }, [user]);
  
  // Game state
  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Betting state
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [bigSmall, setBigSmall] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  
  // Game mode state
  const [selectedMode, setSelectedMode] = useState('1');
  const [selectedDuration, setSelectedDuration] = useState(1);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState(user?.balance || 10000); // Use user balance if available
  const [walletLoading, setWalletLoading] = useState(false);
  
  // Update wallet balance
  const updateWalletBalance = useCallback((amount) => {
    setWalletBalance(prev => {
      const newBalance = prev + amount;
      console.log(`Wallet balance updated: ${prev} + ${amount} = ${newBalance}`);
      return newBalance;
    });
  }, []);
  
  // History state
  const [activeTab, setActiveTab] = useState('history');
  const [currentPage, setCurrentPage] = useState(1);
  const [completedRounds, setCompletedRounds] = useState([]);
  
  // Bet history
  const [userBets, setUserBets] = useState([]);
  const [winningBets, setWinningBets] = useState([]);
  
  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    betType: '',
    betValue: '',
    round: null
  });
  
  // Format timer for display
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, [timer]);
  
  // Handle showing the bet popup
  const handleShowPopup = useCallback((betType, betValue) => {
    setPopupData({
      betType,
      betValue,
      round: activeRound
    });
    setShowPopup(true);
  }, [activeRound]);
  
  // Update selected duration when mode changes
  useEffect(() => {
    setSelectedDuration(parseInt(selectedMode, 10));
  }, [selectedMode]);
  
  // Fetch wallet balance
  useEffect(() => {
    if (!user) return;
    
    const fetchWalletBalance = async () => {
      setWalletLoading(true);
      try {
        // In a real implementation, this would be an API call
        const res = await api.get('/user/profile');
        if (res.data.success) {
          setWalletBalance(res.data.data.balance || 0);
        } else {
          // Fallback to mock balance
          setWalletBalance(user?.balance || 10000);
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
        // Fallback to mock balance
        setWalletBalance(user?.balance || 10000);
      } finally {
        setWalletLoading(false);
      }
    };
    
    fetchWalletBalance();
  }, [user]);
  
  // WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let connectionAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds
    
    const handleWebSocketMessage = (data) => {
      try {
        console.log('Processing WebSocket message:', data);
        
        // Handle round updates
        if (data.type === 'roundUpdate' && Array.isArray(data.rounds)) {
          console.log('Received rounds update:', data.rounds);
          
          // Update rounds list
          setRounds(data.rounds);
          
          // Find active round for the selected duration
          const activeRoundForDuration = data.rounds.find(
            round => round.duration === selectedDuration && round.status === 'active'
          );
          
          if (activeRoundForDuration) {
            setActiveRound(activeRoundForDuration);
            
            // Update timer
            const endTime = new Date(activeRoundForDuration.endTime).getTime();
            const now = Date.now();
            const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimer(remainingTime);
          }
          
          // Process completed rounds
          const completedRounds = data.rounds.filter(round => round.status === 'completed');
          if (completedRounds.length > 0) {
            setCompletedRounds(prev => {
              // Merge with existing completed rounds, avoiding duplicates
              const existingIds = new Set(prev.map(r => r._id));
              const newRounds = completedRounds.filter(r => !existingIds.has(r._id));
              return [...newRounds, ...prev];
            });
          }
        } else if (data.type === 'round_update') {
          // Update active round
          setActiveRound(data.round);
          
          // Update countdown timer
          const endTime = new Date(data.round.endTime).getTime();
          const now = new Date().getTime();
          const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimer(remainingTime);
        } else if (data.type === 'round_result') {
          // Add to completed rounds
          setCompletedRounds(prev => [data.round, ...prev]);
          
          // Check user bets for this round
          const userBetsForRound = userBets.filter(bet => bet.roundId === data.round._id);
          
          // Calculate winnings
          let totalWinnings = 0;
          
          userBetsForRound.forEach(bet => {
            let won = false;
            let winMultiplier = 0;
            
            // Check if bet won based on bet type
            if (bet.betType === 'color' && data.round.resultColors.includes(bet.betValue)) {
              won = true;
              winMultiplier = bet.betValue === 'Violet' ? 4.5 : 2;
            } else if (bet.betType === 'number' && parseInt(bet.betValue) === data.round.resultNumber) {
              won = true;
              winMultiplier = 9;
            } else if (bet.betType === 'bigsmall' && bet.betValue === data.round.bigSmall) {
              won = true;
              winMultiplier = 2;
            }
            
            if (won) {
              const winAmount = bet.amount * winMultiplier;
              totalWinnings += winAmount;
              
              // Add to winning bets
              setWinningBets(prev => [
                ...prev,
                {
                  ...bet,
                  winAmount,
                  resultNumber: data.round.resultNumber,
                  resultColors: data.round.resultColors,
                  bigSmall: data.round.bigSmall
                }
              ]);
            }
          });
          
          // Show toast notifications
          toast.success(`Round ${data.round.roundNumber} result: ${data.round.resultNumber}`);
          
          if (totalWinnings > 0) {
            setTimeout(() => {
              toast.success(`You won ₹${totalWinnings}!`);
              updateWalletBalance(totalWinnings);
            }, 1000);
          }
        } else if (data.type === 'bet_result') {
          // Handle bet result
          if (data.success) {
            toast.success('Bet placed successfully!');
          } else {
            toast.error(data.error || 'Failed to place bet');
            // Refund the bet amount
            if (data.amount) {
              updateWalletBalance(data.amount);
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    // Fetch active round via API as a fallback
    const fetchActiveRound = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try multiple endpoint formats
        let response = null;
        let success = false;
        
        const endpoints = [
          `/numma/rounds?duration=${selectedDuration}`,
          `/numma/rounds/active?duration=${selectedDuration}`,
          `/numma/active-rounds?duration=${selectedDuration}`,
          `/numma/rounds/active/${selectedDuration}`
        ];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            response = await api.get(endpoint);
            if (response.data.success) {
              console.log(`Successful response from endpoint: ${endpoint}`);
              success = true;
              break;
            }
          } catch (error) {
            console.log(`Endpoint ${endpoint} failed:`, error.message);
          }
        }
        
        if (success && response) {
          const rounds = response.data.rounds || response.data.data || [];
          
          if (rounds.length > 0) {
            console.log('Received rounds from API:', rounds);
            setRounds(rounds);
            
            // Find active round
            const activeRound = rounds.find(round => round.status === 'active');
            if (activeRound) {
              console.log('Setting active round:', activeRound);
              setActiveRound(activeRound);
              
              // Calculate remaining time
              const endTime = new Date(activeRound.endTime).getTime();
              const now = Date.now();
              const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
              setTimer(remainingTime);
            }
            
            // Set completed rounds
            const completedRounds = rounds.filter(round => round.status === 'completed');
            setCompletedRounds(completedRounds);
          } else {
            console.log('API returned empty rounds array, using mock data');
            useMockData();
          }
        } else {
          console.log('All API endpoints failed, using mock data');
          useMockData();
        }
      } catch (err) {
        console.error('Error fetching rounds:', err);
        setError(err.message || 'Failed to fetch rounds');
        useMockData();
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to use mock data
    const useMockData = () => {
      console.log('Using mock data as fallback');
      const mockRounds = [
        {
          _id: `mock-${Date.now()}-${selectedDuration}`,
          roundNumber: `${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
          duration: selectedDuration,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + selectedDuration * 60000).toISOString(),
          status: 'active'
        }
      ];
      
      console.log('Generated mock rounds:', mockRounds);
      setRounds(mockRounds);
      setActiveRound(mockRounds[0]);
      
      // Calculate initial timer value
      const endTime = new Date(mockRounds[0].endTime).getTime();
      const now = Date.now();
      const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimer(remainingTime);
    };
    
    const connectWebSocket = () => {
      // Use the real API WebSocket URL
      const wsUrl = 'ws://localhost:5000/ws/numma';
      
      try {
        console.log('Connecting to WebSocket:', wsUrl);
        
        // Close existing connection if any
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          ws.close();
        }
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          // Reset connection attempts on successful connection
          connectionAttempts = 0;
          
          // Clear any reconnect timers
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          
          // Send authentication if needed
          if (user && user.token) {
            ws.send(JSON.stringify({
              type: 'auth',
              token: user.token
            }));
          }
          
          // Subscribe to rounds for the selected duration
          ws.send(JSON.stringify({
            type: 'subscribe',
            duration: selectedDuration
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Attempt to reconnect after a delay, with exponential backoff
          if (!reconnectTimer && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            connectionAttempts++;
            const delay = RECONNECT_DELAY * Math.pow(2, connectionAttempts - 1);
            
            console.log(`Reconnection attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
            
            reconnectTimer = setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
              reconnectTimer = null;
            }, delay);
          } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Max reconnection attempts reached, falling back to polling');
            // Fallback to polling if WebSocket fails after max attempts
            fetchActiveRound();
            
            // Set up a polling interval
            const pollingInterval = setInterval(() => {
              fetchActiveRound();
            }, 10000); // Poll every 10 seconds
            
            // Clean up polling on component unmount
            return () => {
              clearInterval(pollingInterval);
            };
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        
        // Fallback to polling if WebSocket fails
        fetchActiveRound();
      }
    };
    
    // Fetch active round initially
    fetchActiveRound();
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [user, selectedDuration, updateWalletBalance, userBets]);
  
  return {
    // User state
    user,
    
    // Game state
    rounds,
    activeRound,
    timer,
    loading,
    error,
    formattedTime,
    
    // Betting state
    selectedColor,
    setSelectedColor,
    selectedNumber,
    setSelectedNumber,
    bigSmall,
    setBigSmall,
    betAmount,
    setBetAmount,
    betLoading,
    setBetLoading,
    
    // Game mode state
    selectedMode,
    setSelectedMode,
    selectedDuration,
    
    // Wallet state
    walletBalance,
    walletLoading,
    updateWalletBalance,
    
    // History state
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    completedRounds,
    
    // Bet history
    userBets,
    setUserBets,
    winningBets,
    setWinningBets,
    
    // Popup state
    showPopup,
    setShowPopup,
    popupData,
    handleShowPopup
  };
};

export default NummaCore;
