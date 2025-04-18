import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import api from '../../../utils/api';
import { toast } from 'react-hot-toast';

const NummaCore = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  // --- State declarations (unchanged) ---
  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [bigSmall, setBigSmall] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState('1');
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [walletBalance, setWalletBalance] = useState(user?.balance || 10000);
  const [walletLoading, setWalletLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [currentPage, setCurrentPage] = useState(1);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [winningBets, setWinningBets] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({ betType: '', betValue: '', round: null });
  const [historyRounds, setHistoryRounds] = useState([]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, [timer]);

  const handleShowPopup = useCallback((betType, betValue) => {
    setPopupData({ betType, betValue, round: activeRound });
    setShowPopup(true);
  }, [activeRound]);

  useEffect(() => {
    setSelectedDuration(parseInt(selectedMode, 10));
  }, [selectedMode]);

  useEffect(() => {
    if (!user) return;
    const fetchWalletBalance = async () => {
      setWalletLoading(true);
      try {
        const res = await api.get('/user/profile');
        if (res.data.success) {
          setWalletBalance(res.data.data.balance || 0);
        } else {
          setWalletBalance(user?.balance || 10000);
        }
      } catch (err) {
        setWalletBalance(user?.balance || 10000);
      } finally {
        setWalletLoading(false);
      }
    };
    fetchWalletBalance();
  }, [user]);

  // --- WebSocket and Round Info Refactor ---
  const wsRef = useRef(null);

  const fetchActiveRound = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response = null;
      let success = false;
      const endpoints = [
        `/numma/rounds/active?duration=${selectedDuration}`
      ];
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          if (response.data.success) {
            success = true;
            break;
          }
        } catch (error) {}
      }
      if (success && response) {
        const rounds = response.data.rounds || response.data.data || [];
        // Only use rounds that match the selectedDuration
        const filteredRounds = rounds.filter(round => round.duration === selectedDuration);
        setRounds(filteredRounds);
        const active = filteredRounds.find(round => round.status === 'active');
        if (active) {
          setActiveRound(active);
          const endTime = new Date(active.endTime).getTime();
          const now = Date.now();
          setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
        }
        setCompletedRounds(filteredRounds.filter(round => round.status === 'completed'));
      } else {
        useMockData();
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch rounds');
      useMockData();
    } finally {
      setLoading(false);
    }
  }, [selectedDuration]);

  const useMockData = useCallback(() => {
    const mockRounds = [{
      _id: `mock-${Date.now()}-${selectedDuration}`,
      roundNumber: `${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
      duration: selectedDuration,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + selectedDuration * 60000).toISOString(),
      status: 'active'
    }];
    setRounds(mockRounds);
    setActiveRound(mockRounds[0]);
    const endTime = new Date(mockRounds[0].endTime).getTime();
    const now = Date.now();
    setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
  }, [selectedDuration]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const wsUrl = 'ws://localhost:5000/ws/numma';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      if (user && user.token) {
        ws.send(JSON.stringify({ type: 'auth', token: user.token }));
      }
      ws.send(JSON.stringify({ type: 'subscribe', duration: selectedDuration }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'roundUpdate' && Array.isArray(data.rounds)) {
          setRounds(data.rounds);
          const active = data.rounds.find(round => round.duration === selectedDuration && round.status === 'active');
          if (active) {
            setActiveRound(active);
            const endTime = new Date(active.endTime).getTime();
            const now = Date.now();
            setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
          }
          const completed = data.rounds.filter(round => round.status === 'completed');
          if (completed.length > 0) {
            setCompletedRounds(prev => {
              const existingIds = new Set(prev.map(r => r._id));
              const newRounds = completed.filter(r => !existingIds.has(r._id));
              return [...newRounds, ...prev];
            });
          }
        } else if (data.type === 'round_update') {
          setActiveRound(data.round);
          const endTime = new Date(data.round.endTime).getTime();
          const now = Date.now();
          setTimer(Math.max(0, Math.floor((endTime - now) / 1000)));
        } else if (data.type === 'round_result') {
          setCompletedRounds(prev => [data.round, ...prev]);
          const userBetsForRound = userBets.filter(bet => bet.roundId === data.round._id);
          let totalWinnings = 0;
          userBetsForRound.forEach(bet => {
            let won = false;
            let winMultiplier = 0;
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
          toast.success(`Round ${data.round.roundNumber} result: ${data.round.resultNumber}`, { duration: 2000 });
          if (totalWinnings > 0) {
            setTimeout(() => {
              toast.success(`You won ⚡${totalWinnings}!`, { duration: 2000 });
              setWalletBalance(prev => prev + totalWinnings);
            }, 1000);
          }
        } else if (data.type === 'bet_result') {
          if (data.success) {
            toast.success('Bet placed successfully!', { duration: 2000 });
          } else {
            toast.error(data.error || 'Failed to place bet', { duration: 2000 });
            if (data.amount) {
              setWalletBalance(prev => prev + data.amount);
            }
          }
        }
      } catch (error) {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
  }, [user, selectedDuration, userBets]);

  useEffect(() => {
    fetchActiveRound();
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, selectedDuration, fetchActiveRound, connectWebSocket]);

  useEffect(() => {
    if (!activeRound || !activeRound.endTime) return;

    const endTime = new Date(activeRound.endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    };

    updateTimer(); // Initialize immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeRound?.endTime]);

  useEffect(() => {
    const fetchHistoryRounds = async () => {
      try {
        const res = await api.get('/numma/rounds/history', {
          params: { duration: selectedDuration, page: 1 }
        });
        if (res.data.success) {
          setHistoryRounds(res.data.data.rounds || []);
        } else {
          setHistoryRounds([]);
        }
      } catch (err) {
        setHistoryRounds([]);
      }
    };
    // Only fetch if chart tab is active
    if (activeTab === 'chart') fetchHistoryRounds();
  }, [selectedDuration, activeTab]);

  // --- Remainder of component unchanged ---
  return {
    user,
    rounds,
    activeRound,
    timer,
    loading,
    error,
    formattedTime,
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
    selectedMode,
    setSelectedMode,
    selectedDuration,
    setSelectedDuration,
    walletBalance,
    setWalletBalance,
    walletLoading,
    setWalletLoading,
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    completedRounds,
    userBets,
    setUserBets,
    winningBets,
    setWinningBets,
    showPopup,
    setShowPopup,
    popupData,
    setPopupData,
    handleShowPopup,
    historyRounds
  };
};

export default NummaCore;
