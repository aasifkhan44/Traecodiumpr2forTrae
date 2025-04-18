import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';

export const NummaGameHistory = ({ 
  activeTab, 
  currentPage, 
  setCurrentPage,
  selectedDuration 
}) => {
  const [gameHistory, setGameHistory] = useState([]);
  const [gameHistoryLoading, setGameHistoryLoading] = useState(false);
  const [gameHistoryError, setGameHistoryError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch game history
  useEffect(() => {
    if (activeTab !== 'history') return;

    const fetchGameHistory = async () => {
      setGameHistoryLoading(true);
      setGameHistoryError(null);
      
      try {
        const res = await api.get('/numma/rounds/history', { 
          params: { 
            duration: selectedDuration,
            page: currentPage 
          } 
        });
        
        if (res.data.success) {
          // Map backend results to correct color/number/bigsmall display
          const mapped = (res.data.data.rounds || []).map(round => {
            let color = '';
            let number = '';
            let bigSmall = '';
            let dualColors = [];
            
            if (round.result) {
              number = round.result.number;
              
              // Updated color mapping and dual logic
              if ([0,2,4,6,8].includes(number)) {
                color = 'Red';
                if (number === 0) dualColors = ['Red', 'Violet'];
              } else if ([1,3,5,7,9].includes(number)) {
                color = 'Green';
                if (number === 5) dualColors = ['Green', 'Violet'];
              }
              
              // Big/Small logic (0-4 small, 5-9 big)
              if (number >= 5 && number <= 9) bigSmall = 'Big';
              else if (number >= 0 && number <= 4) bigSmall = 'Small';
              else bigSmall = '-';
            }
            
            return {
              ...round,
              number,
              color,
              bigSmall,
              dualColors
            };
          });
          
          setGameHistory(mapped);
          setTotalPages(res.data.data.totalPages || 1);
        } else {
          setGameHistoryError('Failed to fetch game history');
        }
      } catch (err) {
        console.error('Error fetching game history:', err);
        setGameHistoryError('Failed to fetch game history');
      } finally {
        setGameHistoryLoading(false);
      }
    };

    fetchGameHistory();
  }, [activeTab, currentPage, selectedDuration]);

  return (
    <div className="overflow-x-auto">
      {gameHistoryLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading history...</p>
        </div>
      )}
      
      {gameHistoryError && (
        <div className="p-4 text-center text-red-500 bg-red-50 rounded-md">
          <p>{gameHistoryError}</p>
          <button 
            className="mt-2 text-sm text-blue-500 underline"
            onClick={() => setCurrentPage(1)}
          >
            Try again
          </button>
        </div>
      )}
      
      {!gameHistoryLoading && !gameHistoryError && (
        <>
          <table className="min-w-full text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-2 text-xs sm:text-sm">Period</th>
                <th className="py-2 px-2 text-xs sm:text-sm">Number</th>
                <th className="py-2 px-2 text-xs sm:text-sm">Big Small</th>
                <th className="py-2 px-2 text-xs sm:text-sm">Color</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.map((round, index) => (
                <tr key={index} className="border-b">
                  <td className="py-1 px-2 font-mono text-xs sm:text-sm">{round.roundNumber}</td>
                  <td className="py-1 px-2 font-bold">
                    {round.number === 0 ? (
                      <span
                        style={{
                          background: 'linear-gradient(180deg, #ef4444 50%, #a21caf 50%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          fontWeight: 700,
                          fontSize: '1.1em',
                          display: 'inline-block',
                        }}
                      >
                        0
                      </span>
                    ) : round.number === 5 ? (
                      <span
                        style={{
                          background: 'linear-gradient(180deg, #22c55e 50%, #a21caf 50%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          fontWeight: 700,
                          fontSize: '1.1em',
                          display: 'inline-block',
                        }}
                      >
                        5
                      </span>
                    ) : (
                      <span style={{
                        color:
                          round.color === 'Red'
                            ? '#ef4444'
                            : round.color === 'Green'
                            ? '#22c55e'
                            : '#a21caf',
                        fontWeight: 700,
                        fontSize: '1.1em',
                      }}>
                        {round.number}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-xs sm:text-sm">{round.bigSmall}</td>
                  <td className="py-1 px-2">
                    <div className="flex items-center justify-center min-h-[1.5rem]">
                      {round.number === 0 ? (
                        <span
                          className="inline-block w-10 h-5 rounded-full border border-gray-300"
                          style={{
                            background: 'linear-gradient(90deg, #ef4444 0%, #a21caf 100%)', // Red to Violet
                            boxShadow: '0 2px 8px 0 rgba(239,68,68,0.25), 0 4px 16px 0 rgba(162,28,175,0.15)',
                          }}
                        />
                      ) : round.number === 5 ? (
                        <span
                          className="inline-block w-10 h-5 rounded-full border border-gray-300"
                          style={{
                            background: 'linear-gradient(90deg, #22c55e 0%, #a21caf 100%)', // Green to Violet
                            boxShadow: '0 2px 8px 0 rgba(34,197,94,0.25), 0 4px 16px 0 rgba(162,28,175,0.15)',
                          }}
                        />
                      ) : (
                        <span
                          className="inline-block w-10 h-5 rounded-full border border-gray-300"
                          style={{
                            background:
                              round.color === 'Red'
                                ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                                : round.color === 'Green'
                                ? 'linear-gradient(90deg, #22c55e 0%, #6ee7b7 100%)'
                                : 'linear-gradient(90deg, #a21caf 0%, #f0abfc 100%)',
                            boxShadow:
                              round.color === 'Red'
                                ? '0 2px 8px 0 rgba(239,68,68,0.25), 0 4px 16px 0 rgba(248,113,113,0.10)'
                                : round.color === 'Green'
                                ? '0 2px 8px 0 rgba(34,197,94,0.25), 0 4px 16px 0 rgba(110,231,183,0.10)'
                                : '0 2px 8px 0 rgba(162,28,175,0.18), 0 4px 16px 0 rgba(240,171,252,0.10)',
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous Page"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-base shadow-sm">
              {currentPage}
            </span>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next Page"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const NummaUserHistory = ({ 
  activeTab, 
  currentPage, 
  setCurrentPage,
  user 
}) => {
  const [myHistory, setMyHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch user bet history
  useEffect(() => {
    if (activeTab !== 'my' || !user) return;

    const fetchMyHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      
      try {
        const res = await api.get('/numma/history', { 
          params: { 
            userId: user.id || user._id,
            page: currentPage 
          } 
        });
        
        if (res.data.success) {
          setMyHistory(res.data.data.bets || []);
          setTotalPages(res.data.data.totalPages || 1);
        } else {
          setHistoryError('Failed to fetch your bet history');
        }
      } catch (err) {
        console.error('Error fetching user bet history:', err);
        setHistoryError('Failed to fetch your bet history');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchMyHistory();
  }, [activeTab, currentPage, user]);

  if (!user && activeTab === 'my') {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Please login to view your bet history</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {historyLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your bets...</p>
        </div>
      )}
      
      {historyError && (
        <div className="p-4 text-center text-red-500 bg-red-50 rounded-md">
          <p>{historyError}</p>
          <button 
            className="mt-2 text-sm text-blue-500 underline"
            onClick={() => setCurrentPage(1)}
          >
            Try again
          </button>
        </div>
      )}
      
      {!historyLoading && !historyError && (
        <>
          {myHistory.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">You haven't placed any bets yet</p>
            </div>
          ) : (
            <>
              <table className="min-w-full text-center">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-2 text-xs sm:text-sm">Period</th>
                    <th className="py-2 px-2 text-xs sm:text-sm">Type</th>
                    <th className="py-2 px-2 text-xs sm:text-sm">Value</th>
                    <th className="py-2 px-2 text-xs sm:text-sm">Amount</th>
                    <th className="py-2 px-2 text-xs sm:text-sm">Status</th>
                    <th className="py-2 px-2 text-xs sm:text-sm">Win</th>
                  </tr>
                </thead>
                <tbody>
                  {myHistory.map((bet, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1 px-2 font-mono text-xs sm:text-sm">{bet.roundNumber}</td>
                      <td className="py-1 px-2 text-xs sm:text-sm capitalize">{bet.betType}</td>
                      <td className="py-1 px-2 text-xs sm:text-sm">{bet.betValue}</td>
                      <td className="py-1 px-2 text-xs sm:text-sm">⚡{bet.amount}</td>
                      <td className="py-1 px-2 text-xs sm:text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          bet.status === 'won' 
                            ? 'bg-green-100 text-green-800' 
                            : bet.status === 'lost'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bet.status}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-xs sm:text-sm">
                        {bet.status === 'won' 
                          ? <span className="text-green-600">⚡{bet.winAmount}</span> 
                          : bet.status === 'lost' 
                          ? <span className="text-red-600">0</span>
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 py-4">
                <button
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous Page"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-base shadow-sm">
                  {currentPage}
                </span>
                <button
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next Page"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export const NummaChart = ({ chartData = [], currentPage, setCurrentPage, totalPages }) => {
  const rows = Array.isArray(chartData) && chartData.length > 0 ? chartData : [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-xl bg-white shadow">
        <thead>
          <tr>
            <th className="px-2 py-2 bg-gray-50 text-xs font-bold text-gray-600 text-center">Period</th>
            {[...Array(10).keys()].map(n => (
              <th key={n} className="px-2 py-2 bg-gray-50 text-xs font-bold text-gray-600 text-center">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.period || idx} className="border-b last:border-b-0">
              <td className="px-2 py-1 text-xs sm:text-sm font-mono text-center text-gray-700">{row.period}</td>
              {[...Array(10).keys()].map(n => {
                let bg = '';
                if (n === row.number) {
                  if (Array.isArray(row.dualColors) && row.dualColors.includes('Violet')) {
                    bg = 'bg-purple-500 text-white';
                  } else if (row.color === 'Red') bg = 'bg-red-500 text-white';
                  else if (row.color === 'Green') bg = 'bg-green-500 text-white';
                  else if (row.color === 'Violet') bg = 'bg-purple-500 text-white';
                  else bg = 'bg-yellow-400 text-gray-900';
                } else {
                  bg = 'bg-gray-50 text-gray-400';
                }
                return (
                  <td key={n} className={`px-2 py-1 text-center font-semibold text-xs sm:text-sm rounded-md ${bg}`}>
                    {n}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={11} className="text-center text-gray-400 py-8">No data available</td></tr>
          )}
        </tbody>
      </table>
      {/* Pagination for Chart */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous Page"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-base shadow-sm">
            {currentPage}
          </span>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-gray-200"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next Page"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

NummaGameHistory.propTypes = {
  activeTab: PropTypes.string.isRequired,
  currentPage: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  selectedDuration: PropTypes.number.isRequired
};

NummaUserHistory.propTypes = {
  activeTab: PropTypes.string.isRequired,
  currentPage: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  user: PropTypes.object
};

NummaChart.propTypes = {
  chartData: PropTypes.array,
  currentPage: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  totalPages: PropTypes.number.isRequired
};
