import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHistory, FaShareAlt, FaCoins, FaWallet } from 'react-icons/fa';
import AdminGamesGrid from '../components/Games/AdminGamesGrid';
import GamesGrid from '../components/Games/GamesGrid';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh] w-full text-base sm:text-lg">Loading user data...</div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const [userStats, setUserStats] = useState({
    balance: 0,
    totalGames: 45,
    winRate: 62,
    referrals: 0,
    totalEarnings: 0,
    referralEarnings: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [recentTransactions, setRecentTransactions] = useState([
    { id: 1, date: '2025-04-03', color: 'red', result: 'win', amount: 50, payout: 95 },
    { id: 2, date: '2025-04-03', color: 'green', result: 'loss', amount: 30, payout: 0 },
    { id: 3, date: '2025-04-02', color: 'blue', result: 'win', amount: 25, payout: 47 }
  ]);
  
  const [activeGames, setActiveGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        let token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        // Fetch user profile with retry mechanism
        const makeRequest = async (endpoint) => {
          try {
            return await api.get(endpoint, { headers });
          } catch (error) {
            if (error.code === 'ERR_NETWORK' && retryCount < 3) {
              console.log(`Retrying request to ${endpoint} (attempt ${retryCount + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              throw error; // Propagate error for retry
            }
            throw error; // Propagate other errors
          }
        };

        const [profileResponse, referralsResponse] = await Promise.all([
          makeRequest('/user/profile'),
          makeRequest('/user/referrals')
        ]).catch(async (error) => {
          if (error.code === 'ERR_NETWORK' && retryCount < 3) {
            // Retry the entire operation
            return fetchUserData(retryCount + 1);
          }
          throw error;
        });

        if (profileResponse.data.success && profileResponse.data.data) {
          const userData = profileResponse.data.data;
          const updatedStats = {
            balance: userData.balance || 0,
            totalGames: userStats.totalGames,
            winRate: userStats.winRate
          };
          
          if (referralsResponse.data.success) {
            const referralData = referralsResponse.data;
            updatedStats.referrals = referralData.directReferralsCount || 0;
            updatedStats.referralEarnings = referralData.totalCommission || 0;
            updatedStats.totalEarnings = (userData.balance || 0) + (referralData.totalCommission || 0);
          }
          // Only update if something actually changed
          setUserStats(prev => {
            if (
              prev.balance !== updatedStats.balance ||
              prev.totalGames !== updatedStats.totalGames ||
              prev.winRate !== updatedStats.winRate ||
              prev.referrals !== updatedStats.referrals ||
              prev.referralEarnings !== updatedStats.referralEarnings ||
              prev.totalEarnings !== updatedStats.totalEarnings
            ) {
              return updatedStats;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        if (err.code === 'ERR_NETWORK') {
          setError('Unable to connect to the server. Please check your internet connection or try again later.');
        } else if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError('Failed to load user data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch user data when component mounts
    fetchUserData();

    // Fetch active games when component mounts
    const fetchActiveGames = async () => {
      setGamesLoading(true);
      try {
        const response = await api.get('/games/active');
        if (response.data.success) {
          setActiveGames(response.data.data);
        } else {
          setActiveGames([]);
        }
      } catch {
        setActiveGames([]);
      } finally {
        setGamesLoading(false);
      }
    };
    fetchActiveGames();
    
    // In a complete implementation, we would also fetch recent games here
  }, []);
  
  useEffect(() => {
    // WebSocket live balance update
    let ws;
    let cleanup = () => {};
    if (window.userSocket) {
      ws = window.userSocket;
      const handleMessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === 'balanceUpdate') {
          // Only update if balance is different
          setUserStats((prev) => {
            if (prev.balance !== data.balance) {
              return { ...prev, balance: data.balance };
            }
            return prev;
          });
        }
      };
      ws.addEventListener('message', handleMessage);
      cleanup = () => ws.removeEventListener('message', handleMessage);
    }
    return cleanup;
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-50 via-emerald-50 to-yellow-50 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-blue-800 drop-shadow">Welcome, {user.name || user.email}</h2>
      <div className="flex flex-row gap-3 sm:gap-4 w-full mb-4">
        <div
          className="flex-1 min-w-0 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col items-center cursor-pointer hover:scale-105 hover:shadow-2xl transition border-2 border-transparent hover:border-blue-700 focus-within:ring-2 focus-within:ring-blue-400"
          onClick={() => navigate('/wallet/recharge')}
          tabIndex={0}
          role="button"
          aria-label="Add Funds"
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/wallet/recharge'); }}
        >
          <span className="text-xs sm:text-sm text-white font-semibold mb-1 drop-shadow">Balance</span>
          <span className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">₹{userStats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <button
            className="mt-2 px-3 py-1 rounded bg-white text-blue-700 text-xs sm:text-sm font-bold shadow hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={e => { e.stopPropagation(); navigate('/wallet/recharge'); }}
          >
            Add Funds
          </button>
        </div>
        <div
          className="flex-1 min-w-0 bg-gradient-to-br from-yellow-400 via-orange-300 to-pink-200 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col items-center cursor-pointer hover:scale-105 hover:shadow-2xl transition border-2 border-transparent hover:border-yellow-600 focus-within:ring-2 focus-within:ring-yellow-400"
          onClick={() => navigate('/referrals')}
          tabIndex={0}
          role="button"
          aria-label="Referral Details"
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/referrals'); }}
        >
          <span className="text-xs sm:text-sm text-gray-800 font-semibold mb-1 drop-shadow">Referrals</span>
          <span className="text-xl sm:text-2xl font-extrabold text-gray-900 drop-shadow truncate">{userStats.referrals}</span>
          <span className="text-xs sm:text-sm text-gray-800 font-semibold mt-1 drop-shadow">Earnings</span>
          <span className="text-sm sm:text-lg font-bold text-green-700 drop-shadow truncate">₹{(userStats.referralEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        <button onClick={() => navigate('/transactions')} className="w-full py-2 rounded bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white font-bold text-base shadow hover:scale-105 hover:shadow-lg transition">View Transactions</button>
      </div>
      {/* Active Games Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2 text-center text-orange-700 drop-shadow">Active Games</h3>
        {gamesLoading ? (
          <div className="text-center text-blue-700 font-semibold">Loading games...</div>
        ) : activeGames.length === 0 ? (
          <div className="text-center text-gray-500">No active games found.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeGames.filter(game => game.isActive).map(game => (
              <Link
                to={`/games/${game.identifier}`}
                key={game.identifier || game._id}
                className="bg-gradient-to-br from-white via-green-50 to-yellow-100 rounded-xl shadow-md p-4 flex flex-col items-center hover:scale-105 hover:shadow-xl transition border-2 border-transparent hover:border-green-400"
                style={{ textDecoration: 'none' }}
              >
                {/* Show card image if available, else fallback */}
                {game.thumbnailUrl ? (
                  <img
                    src={game.thumbnailUrl}
                    alt={game.name || 'Game'}
                    className="w-16 h-16 object-contain mb-2 rounded shadow"
                    onError={e => { e.target.onerror = null; e.target.src = '/fallback-image.png'; }}
                  />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded mb-2 text-gray-500 text-2xl">🎮</div>
                )}
                <span className="text-base font-bold mb-1 text-green-800 drop-shadow">{game.name || game.identifier}</span>
                <span className="text-xs text-gray-700 mb-1">{game.description}</span>
                <span className="text-xs text-green-700 font-semibold">Active</span>
                <span className="text-primary mt-2 underline text-sm">Play Now</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
