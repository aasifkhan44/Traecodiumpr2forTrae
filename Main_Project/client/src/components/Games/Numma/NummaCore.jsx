import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import api from '../../../utils/api';
import { WS_URL } from '../../../utils/ws';
import { toast } from 'react-hot-toast';

let interval = null;

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
  const [waitingForNextRound, setWaitingForNextRound] = useState(false);

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
        const serverTime = response.data.serverTime ? new Date(response.data.serverTime).getTime() : null;
        let filteredRounds = rounds.filter(round => round.duration === selectedDuration);
        if (filteredRounds.length === 0 && rounds.length > 0) {
          filteredRounds = [rounds[0]];
        }
        setRounds(filteredRounds);
        const active = filteredRounds.find(round => round.status === 'active') || filteredRounds[0];
        if (active) {
          setActiveRound(active);
          const start = new Date(active.startTime).getTime();
          const end = new Date(active.endTime).getTime();
          let now = serverTime || (active.serverTime ? new Date(active.serverTime).getTime() : Date.now());
          let timer = Math.max(0, Math.floor((end - now) / 1000));
          let roundJustStarted = Math.abs(now - start) < 2000;
          if (roundJustStarted) timer = Math.floor((end - start) / 1000);
          setTimer(timer);
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
    console.log('Connecting to Numma WebSocket at:', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      if (user && user.token) {
        ws.send(JSON.stringify({ type: 'auth', token: user.token, game: 'numma' }));
      }
      ws.send(JSON.stringify({ type: 'subscribe', duration: selectedDuration, game: 'numma' }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'roundUpdate' && data.rounds) {
          handleWebSocketRoundUpdate(data);
        } else if (data.type === 'round_update') {
          setActiveRound(data.round);
          const now = (data.serverTime ? new Date(data.serverTime).getTime() : Date.now());
          const end = new Date(data.round.endTime).getTime();
          setTimer(Math.max(0, Math.floor((end - now) / 1000)));
          setWaitingForNextRound(false);
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
    ws.onerror = (event) => {
      if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
        return;
      }
    };
    ws.onclose = () => {};
  }, [user, selectedDuration, userBets]);

  useEffect(() => {
    fetchActiveRound();
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, selectedDuration, fetchActiveRound, connectWebSocket]);

  // --- Timer logic for live countdown and auto-fetch next round (MIRROR Wingo) ---
  const timerRef = useRef(null);
  const driftRef = useRef(0);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const round = activeRound;
    if (!round || !round.endTime) {
      setTimer(null);
      return;
    }
    // Sync with server time if provided
    let serverTime = null;
    if (round.serverTime) {
      serverTime = new Date(round.serverTime).getTime();
      driftRef.current = serverTime - Date.now(); // Positive: server ahead, Negative: client ahead
    } else {
      driftRef.current = 0;
    }
    const calcRemaining = () => {
      const now = Date.now() + driftRef.current;
      const end = new Date(round.endTime).getTime();
      return Math.max(0, Math.floor((end - now) / 1000));
    };
    setTimer(calcRemaining());
    setWaitingForNextRound(false);
    timerRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setTimer(remaining);
      if (remaining === 0) {
        // Block betting and clear round/timer before fetching new round
        setActiveRound(null);
        setTimer(null);
        setWaitingForNextRound(true);
        setTimeout(() => {
          fetchActiveRound();
        }, 200);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeRound, selectedDuration]);

  // --- Patch WebSocket round update logic for precise timer sync ---
  const handleWebSocketRoundUpdate = useCallback((data) => {
    let roundsArr = Array.isArray(data.rounds)
      ? data.rounds
      : Object.values(data.rounds);
    let filteredRounds = roundsArr.filter(round => round.duration === selectedDuration);
    if (filteredRounds.length === 0 && roundsArr.length > 0) {
      filteredRounds = [roundsArr[0]];
    }
    setRounds(filteredRounds);
    const active = filteredRounds.find(round => round.status === 'active') || filteredRounds[0];
    if (active) {
      setActiveRound(active);
      // Use serverTime if provided for precise sync
      const now = (data.serverTime ? new Date(data.serverTime).getTime() : (active.serverTime ? new Date(active.serverTime).getTime() : Date.now()));
      const start = new Date(active.startTime).getTime();
      const end = new Date(active.endTime).getTime();
      let timer = Math.max(0, Math.floor((end - now) / 1000));
      // If round just started (within 2s), show full duration
      let roundJustStarted = Math.abs(now - start) < 2000;
      if (roundJustStarted) timer = Math.floor((end - start) / 1000);
      setTimer(timer);
      setWaitingForNextRound(false);
    }
    const completed = filteredRounds.filter(round => round.status === 'completed');
    if (completed.length > 0) {
      setCompletedRounds(prev => {
        const existingIds = new Set(prev.map(r => r._id));
        const newRounds = completed.filter(r => !existingIds.has(r._id));
        return [...newRounds, ...prev];
      });
    }
  }, [selectedDuration]);

  useEffect(() => {
    if (waitingForNextRound && timer > 0) {
      setWaitingForNextRound(false);
    }
  }, [timer, waitingForNextRound]);

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
  const fetchWalletBalance = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  return {
    user,
    rounds,
    activeRound,
    timer,
    loading,
    error,
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
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    completedRounds,
    setCompletedRounds,
    userBets,
    setUserBets,
    winningBets,
    setWinningBets,
    showPopup,
    setShowPopup,
    popupData,
    setPopupData,
    historyRounds,
    setHistoryRounds,
    formattedTime,
    handleShowPopup,
    fetchActiveRound,
    connectWebSocket,
    useMockData,
    updateWalletBalance: setWalletBalance,
    fetchWalletBalance
  };
};

export default NummaCore;
