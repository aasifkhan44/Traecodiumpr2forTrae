import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

export default function WingoResultManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [roundStats, setRoundStats] = useState(null);
  const [selectedResultType, setSelectedResultType] = useState(null);
  const [selectedResultValue, setSelectedResultValue] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
  const timerRef = React.useRef(null);

  const durations = [
    { value: 1, label: '1 Min' },
    { value: 3, label: '3 Min' },
    { value: 5, label: '5 Min' },
    { value: 10, label: '10 Min' }
  ];

  const colors = [
    { value: 'Red', className: 'bg-red-500' },
    { value: 'Violet', className: 'bg-purple-500' },
    { value: 'Green', className: 'bg-green-500' }
  ];

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  // Fetch only the selected duration's round stats
  useEffect(() => {
    setLoading(true);
    setError(null);
    setRoundStats(null);
    setSelectedResultType(null);
    setSelectedResultValue(null);
    setLocalTimeRemaining(null);
    fetchRoundStats();
    // eslint-disable-next-line
  }, [selectedDuration]);

  // Sync local time remaining with fetched roundStats
  useEffect(() => {
    if (roundStats && roundStats.round && typeof roundStats.round.timeRemaining === 'number') {
      setLocalTimeRemaining(roundStats.round.timeRemaining);
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
      setLocalTimeRemaining(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundStats]);

  // Also clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Listen for WebSocket round updates and refresh round info
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let shouldReconnect = true;

    function cleanupWS() {
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        ws = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    }

    function setupWS() {
      cleanupWS();
      ws = new window.WebSocket('ws://localhost:5000'); // Changed port to match backend
      ws.onopen = () => {
        // Optionally authenticate if your backend requires it
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'roundUpdate' && Array.isArray(data.rounds)) {
            // Only trigger fetch if the update is for the selected duration
            const updated = data.rounds.find(r => r.duration === selectedDuration);
            if (!updated) return; // Ignore updates for other durations
            // Only fetch if round has truly changed (id or status), not every tick
            if (
              !roundStats ||
              !roundStats.round ||
              roundStats.round._id !== updated._id ||
              roundStats.round.status !== updated.status ||
              roundStats.round.timeRemaining !== updated.timeRemaining // Prevents refresh if only timer ticks
            ) {
              setRoundStats({
                round: updated,
                betStats: roundStats && roundStats.betStats ? roundStats.betStats : { totalBets: 0, totalAmount: 0 },
                suggestion: roundStats && roundStats.suggestion ? roundStats.suggestion : null
              }); // Update only for selected round, no fetch
            }
          }
        } catch {}
      };
      ws.onclose = () => {
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(setupWS, 3000); // Minimum 3s delay
        }
      };
      ws.onerror = () => {
        // Only close if not already closed
        if (ws && ws.readyState !== ws.CLOSED) {
          ws.close();
        }
      };
    }
    setupWS();
    return () => {
      shouldReconnect = false;
      cleanupWS();
    };
  }, [selectedDuration]);

  const fetchRoundStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/wingo/admin-round-stats', {
        params: { duration: selectedDuration }
      });
      if (response.data.success) {
        setRoundStats(response.data.data);
        if (response.data.data.suggestion) {
          const { type, value } = response.data.data.suggestion;
          setSelectedResultType(type);
          setSelectedResultValue(value);
        }
      } else {
        setError(response.data.message || 'Failed to fetch round statistics');
        setRoundStats(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch round statistics');
      setRoundStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (duration) => {
    setSelectedDuration(duration);
  };

  const handleResultTypeSelect = (type, value) => {
    setSelectedResultType(type);
    setSelectedResultValue(value);
  };

  const handleSubmitResult = async () => {
    if (!selectedResultType || selectedResultValue === null || !roundStats?.round?._id) {
      toast.error('Please select a result type and value');
      return;
    }
    try {
      setSubmitting(true);
      // Map frontend fields to backend expected fields
      let color = null, number = undefined;
      if (selectedResultType === 'color') {
        color = selectedResultValue;
      } else if (selectedResultType === 'number') {
        number = parseInt(selectedResultValue);
      }
      const response = await api.post('/wingo/control-result', {
        roundId: roundStats.round._id,
        duration: selectedDuration,
        color,
        number
      });
      if (response.data.success) {
        toast.success('Result submitted successfully!');
        // Immediately update roundStats to reflect the submitted result
        setRoundStats(prev => prev && prev.round ? {
          ...prev,
          round: {
            ...prev.round,
            controlledResult: response.data.controlledResult,
            isControlled: true
          }
        } : prev);
        fetchRoundStats();
      } else {
        toast.error(response.data.message || 'Failed to submit result');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit result');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Wingo Result Management</h1>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Round Duration</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          {durations.map((duration) => (
            <button
              key={duration.value}
              onClick={() => handleDurationChange(duration.value)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                selectedDuration === duration.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {duration.label}
            </button>
          ))}
        </div>
        {/* Only show the selected duration's round info */}
        {loading && (
          <div className="flex items-center justify-center min-h-[150px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center min-h-[150px]">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}
        {roundStats && !loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Round Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Round Number:</span> {roundStats.round.roundNumber}</p>
                  <p><span className="font-medium">Status:</span> {roundStats.round.status}</p>
                  <p><span className="font-medium">Time Remaining:</span> {formatTime(localTimeRemaining ?? roundStats.round.timeRemaining)}</p>
                  <p><span className="font-medium">Total Bets:</span> {roundStats.betStats ? roundStats.betStats.totalBets : 0}</p>
                  <p><span className="font-medium">Total Amount:</span> {formatCurrency(roundStats.betStats ? roundStats.betStats.totalAmount : 0)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold mb-2">Admin Submitted Result</h3>
              {roundStats?.round?.controlledResult && (roundStats.round.controlledResult.color || roundStats.round.controlledResult.number !== undefined) ? (
                <div className="flex items-center space-x-4">
                  {roundStats.round.controlledResult.color && (
                    <span className={`px-3 py-1 rounded-full text-white ${roundStats.round.controlledResult.color === 'Green' ? 'bg-green-600' : roundStats.round.controlledResult.color === 'Red' ? 'bg-red-600' : 'bg-purple-600'}`}>
                      {roundStats.round.controlledResult.color}
                    </span>
                  )}
                  {roundStats.round.controlledResult.number !== undefined && roundStats.round.controlledResult.number !== null && (
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white">
                      {roundStats.round.controlledResult.number}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">Not submitted yet</span>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Set Round Result</h3>
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Select Color</h4>
                <div className="flex gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleResultTypeSelect('color', color.value)}
                      className={`relative px-4 py-2 rounded-md transition-all duration-200 text-white ${color.className} ${
                        selectedResultType === 'color' && selectedResultValue === color.value
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : ''
                      }`}
                    >
                      {color.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Select Number</h4>
                <div className="grid grid-cols-5 gap-2">
                  {numbers.map((number) => (
                    <button
                      key={number}
                      onClick={() => handleResultTypeSelect('number', number.toString())}
                      className={`px-4 py-2 rounded-md transition-all duration-200 ${
                        selectedResultType === 'number' && selectedResultValue === number.toString()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitResult}
                  disabled={submitting || !selectedResultType || selectedResultValue === null}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    submitting || !selectedResultType || selectedResultValue === null
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
