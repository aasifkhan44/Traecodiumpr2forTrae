import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const AdminNummaResultManager = () => {
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedTab, setSelectedTab] = useState(1); // 1m by default
  const [outcome, setOutcome] = useState(null);
  const [resultInput, setResultInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [declaredResult, setDeclaredResult] = useState(null);

  // Fetch running rounds on mount
  useEffect(() => {
    const fetchRounds = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/numma/rounds/active');
        if (res.data.success) {
          setRounds(res.data.data);
          // Auto-select first round of selectedTab duration
          const filtered = res.data.data.filter(r => r.duration === selectedTab);
          setSelectedRound(filtered.length ? filtered[0] : null);
        } else {
          setError('Failed to fetch rounds');
        }
      } catch (err) {
        setError('Error fetching rounds');
      } finally {
        setLoading(false);
      }
    };
    fetchRounds();
  }, []);

  // Change selected round when tab changes
  useEffect(() => {
    if (rounds.length) {
      const filtered = rounds.filter(r => r.duration === selectedTab);
      setSelectedRound(filtered.length ? filtered[0] : null);
    }
  }, [selectedTab, rounds]);

  // Fetch outcome data for the selected round (now with polling)
  useEffect(() => {
    if (!selectedRound) return;

    let isMounted = true;
    const fetchOutcome = async () => {
      try {
        const res = await api.get('/numma/admin/round-outcome', {
          params: { roundId: selectedRound._id }
        });
        if (isMounted) setOutcome(res.data.data || null);
      } catch (err) {
        if (isMounted) setOutcome(null);
        // Prevent console error spam for missing outcome (auto-deleted)
        // Optionally: log only if not a 404
        if (err?.response?.status && err.response.status !== 404) {
          // eslint-disable-next-line no-console
          console.error('Error fetching outcome:', err);
        }
      }
    };
    fetchOutcome(); // initial fetch
    const interval = setInterval(fetchOutcome, 1000); // poll every 1s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedRound]);

  // Fetch declared admin result for this round
  useEffect(() => {
    if (!selectedRound) {
      setDeclaredResult(null);
      return;
    }
    async function fetchDeclaredResult() {
      try {
        // Always send duration as a number
        const res = await api.get('/numma/admin/result-info', {
          params: { roundId: selectedRound._id, duration: Number(selectedRound.duration) }
        });
        if (res.data.success && res.data.data && typeof res.data.data.number !== 'undefined') {
          setDeclaredResult(res.data.data.number);
        } else {
          setDeclaredResult(null);
        }
      } catch {
        setDeclaredResult(null);
      }
    }
    fetchDeclaredResult();
  }, [selectedRound]);

  // Helper to create default outcomeTotals for numbers 0-9 and special categories
  function getDefaultOutcomeTotals() {
    const totals = {};
    for (let i = 0; i < 10; i++) {
      totals[`number:${i}`] = 0;
    }
    // Add special categories
    ['red', 'green', 'violet', 'big', 'small'].forEach(cat => {
      totals[cat] = 0;
    });
    return totals;
  }

  // --- Watch for round end and auto-select next available round ---
  useEffect(() => {
    if (!selectedRound) return;
    if (!selectedRound.endTime) return;
    let timer;
    function checkAndAdvance() {
      const end = new Date(selectedRound.endTime).getTime();
      const now = Date.now();
      if (now >= end) {
        // Refetch rounds to get up-to-date data
        api.get('/numma/rounds/active').then(res => {
          if (res.data.success) {
            setRounds(res.data.data);
            const filtered = res.data.data.filter(r => r.duration === selectedTab && r._id !== selectedRound._id);
            if (filtered.length > 0) {
              setSelectedRound(filtered[0]);
            } else {
              setSelectedRound(null);
            }
          }
        });
      }
    }
    timer = setInterval(checkAndAdvance, 1000);
    return () => clearInterval(timer);
  }, [selectedRound, selectedTab]);

  const handleDeclareResult = async (e) => {
    e.preventDefault();
    if (!selectedRound || resultInput === '') return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/numma/admin/result', {
        roundId: selectedRound._id,
        duration: Number(selectedRound.duration), // ensure number
        number: resultInput
      });
      if (res.data.success) {
        setSuccess('Result declared successfully!');
        setDeclaredResult(resultInput);
        setResultInput('');
      } else {
        setError(res.data.error || 'Failed to declare result');
      }
    } catch (err) {
      setError('Error declaring result');
    } finally {
      setLoading(false);
    }
  };

  // Timer component for round countdown
  function RoundTimer({ endTime }) {
    const [timeLeft, setTimeLeft] = React.useState(getTimeLeft());

    function getTimeLeft() {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      return { m, s, raw: diff };
    }

    React.useEffect(() => {
      const interval = setInterval(() => {
        setTimeLeft(getTimeLeft());
      }, 1000);
      return () => clearInterval(interval);
      // eslint-disable-next-line
    }, [endTime]);

    if (timeLeft.raw === 0) return <span className="text-red-600 font-mono">Ended</span>;
    return (
      <span className="bg-black text-white px-2 py-1 rounded font-mono">
        {timeLeft.m}:{timeLeft.s.toString().padStart(2, '0')} left
      </span>
    );
  }

  return (
    <div className="p-2 sm:p-4 max-w-full sm:max-w-2xl mx-auto bg-white rounded-lg shadow-md min-h-screen flex flex-col gap-2 sm:gap-4">
      <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-center">Numma Game Result Manager</h2>
      {error && <div className="bg-red-100 text-red-700 p-1 sm:p-2 mb-2 rounded text-xs sm:text-base">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-1 sm:p-2 mb-2 rounded text-xs sm:text-base">{success}</div>}
      <div className="mb-2 sm:mb-4">
        <div className="flex gap-1 sm:gap-2 mb-2 justify-center flex-wrap">
          {[1, 3, 5].map(tab => (
            <button
              key={tab}
              className={`px-2 sm:px-4 py-1 rounded font-semibold border text-xs sm:text-base ${selectedTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
              onClick={() => setSelectedTab(tab)}
              type="button"
            >
              {tab}m
            </button>
          ))}
        </div>
        <div className="flex gap-1 sm:gap-2 mb-2 flex-wrap justify-center">
          {rounds.filter(round => round.duration === selectedTab).length === 0 ? (
            <span className="text-gray-500 text-xs sm:text-base">No running rounds for {selectedTab}m</span>
          ) : (
            rounds.filter(round => round.duration === selectedTab).map(round => (
              <button
                key={round._id}
                className={`px-2 sm:px-3 py-1 rounded border font-mono text-xs sm:text-base ${selectedRound && selectedRound._id === round._id ? 'bg-blue-500 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-400'}`}
                onClick={() => {
                  setSelectedRound(round);
                  setSuccess(null);
                  setError(null);
                }}
                type="button"
              >
                #{round.roundNumber}
              </button>
            ))
          )}
        </div>
      </div>
      {selectedRound && (
        <div className="mb-2 sm:mb-4">
          <div className="font-semibold mb-1 sm:mb-2 flex items-center gap-2 sm:gap-4 justify-between">
            <span>Round Details:</span>
            <RoundTimer endTime={selectedRound.endTime} />
          </div>
          <div className="bg-gray-100 rounded p-2 sm:p-3 mb-2 flex flex-col gap-1 text-xs sm:text-base relative">
            <button
              className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-700 text-white rounded px-2 py-1 text-xs sm:text-sm shadow"
              onClick={() => {
                // Emoji map for numbers 0-9
                const emojiNumbers = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
                const statusEmoji = selectedRound.status === 'Active' ? '🟢' : selectedRound.status === 'completed' ? '🔴' : '🟡';
                const predictionEmoji = declaredResult !== null && emojiNumbers[parseInt(declaredResult)] ? emojiNumbers[parseInt(declaredResult)] : '';
                const text = `⏱️ Period: ${selectedRound.duration} min\n🔢 Round #: ${selectedRound.roundNumber}\n${statusEmoji} Status: ${selectedRound.status}\n⏳ End Time: ${new Date(selectedRound.endTime).toLocaleString()}\n🎯 Our Prediction: ${predictionEmoji}`;
                navigator.clipboard.writeText(text);
              }}
              type="button"
              title="Copy details"
            >
              Copy
            </button>
            <div>Period: {selectedRound.duration} min</div>
            <div>Round #: {selectedRound.roundNumber}</div>
            <div>Status: {selectedRound.status}</div>
            <div>End Time: {new Date(selectedRound.endTime).toLocaleString()}</div>
            {declaredResult !== null && declaredResult !== undefined && declaredResult !== '' && (
              <div className="mt-1 font-semibold text-green-700">
                Our prediction is: <span className="font-mono">{declaredResult}</span>
              </div>
            )}
          </div>
          <div className="font-semibold mb-1">Real-time Outcome Data:</div>
          {loading ? (
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-lg border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Number</th>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Total Bets</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(getDefaultOutcomeTotals()).map(([number, total], idx) => {
                    const num = number.split(':')[1] || number;
                    const isDigit = /^\d$/.test(num);
                    return (
                      <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'}>
                        <td className="py-1 px-2 sm:py-2 sm:px-4 font-mono text-base sm:text-lg text-blue-900 border-b border-blue-100 flex items-center gap-2">
                          {num}
                          {isDigit && (
                            <button
                              className="ml-2 px-2 py-1 rounded bg-green-500 hover:bg-green-700 text-white text-xs sm:text-sm"
                              title={`Declare ${num} as result`}
                              disabled={loading || declaredResult == num}
                              onClick={async () => {
                                if (!selectedRound) return;
                                setLoading(true);
                                setError(null);
                                setSuccess(null);
                                try {
                                  const res = await api.post('/numma/admin/result', {
                                    roundId: selectedRound._id,
                                    duration: Number(selectedRound.duration),
                                    number: num
                                  });
                                  if (res.data.success) {
                                    setSuccess('Result declared successfully!');
                                    setDeclaredResult(num);
                                    setResultInput('');
                                  } else {
                                    setError(res.data.error || 'Failed to declare result');
                                  }
                                } catch (err) {
                                  setError('Error declaring result');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Declare
                            </button>
                          )}
                        </td>
                        <td className="py-1 px-2 sm:py-2 sm:px-4 text-blue-700 border-b border-blue-100">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : outcome && outcome.outcomeTotals && Object.keys(outcome.outcomeTotals).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-lg border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Number</th>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Total Bets</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(outcome.outcomeTotals)
                    .sort((a, b) => b[1] - a[1]) // Sort by highest total bets first
                    .map(([number, total], idx) => {
                      const num = number.split(':')[1] || number;
                      const isDigit = /^\d$/.test(num);
                      return (
                        <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'}>
                          <td className="py-1 px-2 sm:py-2 sm:px-4 font-mono text-base sm:text-lg text-blue-900 border-b border-blue-100 flex items-center gap-2">
                            {num}
                            {isDigit && (
                              <button
                                className="ml-2 px-2 py-1 rounded bg-green-500 hover:bg-green-700 text-white text-xs sm:text-sm"
                                title={`Declare ${num} as result`}
                                disabled={loading || declaredResult == num}
                                onClick={async () => {
                                  if (!selectedRound) return;
                                  setLoading(true);
                                  setError(null);
                                  setSuccess(null);
                                  try {
                                    const res = await api.post('/numma/admin/result', {
                                      roundId: selectedRound._id,
                                      duration: Number(selectedRound.duration),
                                      number: num
                                    });
                                    if (res.data.success) {
                                      setSuccess('Result declared successfully!');
                                      setDeclaredResult(num);
                                      setResultInput('');
                                    } else {
                                      setError(res.data.error || 'Failed to declare result');
                                    }
                                  } catch (err) {
                                    setError('Error declaring result');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                Declare
                              </button>
                            )}
                          </td>
                          <td className="py-1 px-2 sm:py-2 sm:px-4 text-blue-700 border-b border-blue-100">{total}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-lg border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Number</th>
                    <th className="py-1 px-2 sm:py-2 sm:px-4 text-left text-blue-800 font-bold bg-blue-100 border-b border-blue-200">Total Bets</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(getDefaultOutcomeTotals()).map(([number, total], idx) => {
                    const num = number.split(':')[1] || number;
                    const isDigit = /^\d$/.test(num);
                    return (
                      <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'}>
                        <td className="py-1 px-2 sm:py-2 sm:px-4 font-mono text-base sm:text-lg text-blue-900 border-b border-blue-100 flex items-center gap-2">
                          {num}
                          {isDigit && (
                            <button
                              className="ml-2 px-2 py-1 rounded bg-green-500 hover:bg-green-700 text-white text-xs sm:text-sm"
                              title={`Declare ${num} as result`}
                              disabled={loading || declaredResult == num}
                              onClick={async () => {
                                if (!selectedRound) return;
                                setLoading(true);
                                setError(null);
                                setSuccess(null);
                                try {
                                  const res = await api.post('/numma/admin/result', {
                                    roundId: selectedRound._id,
                                    duration: Number(selectedRound.duration),
                                    number: num
                                  });
                                  if (res.data.success) {
                                    setSuccess('Result declared successfully!');
                                    setDeclaredResult(num);
                                    setResultInput('');
                                  } else {
                                    setError(res.data.error || 'Failed to declare result');
                                  }
                                } catch (err) {
                                  setError('Error declaring result');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Declare
                            </button>
                          )}
                        </td>
                        <td className="py-1 px-2 sm:py-2 sm:px-4 text-blue-700 border-b border-blue-100">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {selectedRound && (
        <form onSubmit={handleDeclareResult} className="flex flex-col gap-1 sm:gap-2 mt-auto">
          <label className="font-semibold text-xs sm:text-base">Declare Result (Number 0-9):</label>
          <div className="flex gap-1 flex-wrap mb-2">
            {[...Array(10).keys()].map(n => (
              <button
                key={n}
                type="button"
                className={`border rounded px-2 py-1 w-8 text-xs sm:w-10 sm:text-base font-mono ${resultInput == n ? 'bg-blue-500 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-400'}`}
                onClick={() => setResultInput(String(n))}
                disabled={loading}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 sm:px-4 rounded mt-1 sm:mt-2 disabled:opacity-50 text-xs sm:text-base"
            disabled={loading || resultInput === ''}
          >
            Declare Result
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminNummaResultManager;
