import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaHistory, FaShareAlt, FaCoins, FaWallet } from 'react-icons/fa';
import AdminGamesGrid from '../components/Games/AdminGamesGrid';
import GamesGrid from '../components/Games/GamesGrid';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">Authentication required. Please login.</div>;
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
  
  useEffect(() => {
    const fetchUserData = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        let token = localStorage.getItem('token');
        if (token && (token.startsWith('"') || token.startsWith("'")) && (token.endsWith('"') || token.endsWith("'"))) {
          token = token.substring(1, token.length - 1);
        }
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        // Fetch user profile with retry mechanism
        const makeRequest = async (endpoint) => {
          try {
            return await axios.get(`${API_BASE_URL}${endpoint}`, { headers });
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
          makeRequest('/api/user/profile'),
          makeRequest('/api/user/referrals')
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
    <div>
      <h1 className="text-2xl font-bold mb-6">User Dashboard</h1>
      
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FaWallet className="text-primary text-2xl mr-3" />
            <h2 className="text-xl font-bold">Wallet Balance</h2>
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            </div>
          ) : error ? (
            <div className="text-red-500">
              <p>Could not load balance</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-primary hover:underline mt-2 inline-block"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold"> {userStats.balance.toFixed(2)}</p>
              <Link to="/profile" className="text-primary hover:underline mt-2 inline-block">
                Add funds
              </Link>
            </>
          )}
        </div>
        

        
        <div className="card bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FaShareAlt className="text-primary text-2xl mr-3" />
            <h2 className="text-xl font-bold">Referrals</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-600">Total Referrals</p>
              <p className="text-2xl font-bold">{userStats.referrals}</p>
            </div>
            <div>
              <p className="text-gray-600">Earnings</p>
              <p className="text-2xl font-bold"> {userStats.referralEarnings}</p>
            </div>
          </div>
          <Link to="/referrals" className="text-primary hover:underline mt-2 inline-block">
            View referral program
          </Link>
        </div>
      </div>
      
      {/* Games Grid - Shows games available according to settings */}
      <div className="mb-8">
        {user?.isAdmin ? <AdminGamesGrid /> : <GamesGrid />}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        
        <Link to="/referrals" className="card bg-gradient-to-r from-accent to-purple-500 text-white p-6 transform transition-transform hover:scale-105">
          <FaShareAlt className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
          <p>Earn commissions through our multi-level referral program!</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
