import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaHistory, FaShareAlt, FaCoins, FaWallet } from 'react-icons/fa';
import GamesGrid from '../components/Games/GamesGrid';

const Dashboard = () => {
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
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Try to get the token - check both possible storage formats
        let token = localStorage.getItem('token');
        
        // Sometimes the token might be stored with quotes, let's handle that
        if (token && (token.startsWith('"') || token.startsWith("'")) && (token.endsWith('"') || token.endsWith("'"))) {
          token = token.substring(1, token.length - 1);
        }
        
        console.log('Token found:', token ? 'YES (length: ' + token.length + ')' : 'NO');
        
        if (!token) {
          setError('Authentication token not found');
          setLoading(false);
          return;
        }
        
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        // Fetch user profile - contains balance and basic info
        console.log('Making API request to:', `${API_BASE_URL}/api/user/profile`);
        const profileResponse = await axios.get(`${API_BASE_URL}/api/user/profile`, { headers });
        
        // Fetch referrals data
        console.log('Making API request to:', `${API_BASE_URL}/api/user/referrals`);
        const referralsResponse = await axios.get(`${API_BASE_URL}/api/user/referrals`, { headers });
        
        // Update user stats with real data
        if (profileResponse.data.success && profileResponse.data.data) {
          const userData = profileResponse.data.data;
          
          // Start building updated stats
          const updatedStats = {
            balance: userData.balance || 0,
            totalGames: userStats.totalGames, // Keep existing value for now
            winRate: userStats.winRate // Keep existing value for now
          };
          
          // Add referral data if available
          if (referralsResponse.data.success) {
            const referralData = referralsResponse.data;
            updatedStats.referrals = referralData.directReferralsCount || 0;
            updatedStats.referralEarnings = referralData.totalCommission || 0;
            updatedStats.totalEarnings = (userData.balance || 0) + (referralData.totalCommission || 0);
          }
          
          // Update the state
          setUserStats(updatedStats);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch user data when component mounts
    fetchUserData();
    
    // In a complete implementation, we would also fetch recent games here
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
              <p className="text-3xl font-bold">🪙 {userStats.balance.toFixed(2)}</p>
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
              <p className="text-2xl font-bold">🪙 {userStats.referralEarnings}</p>
            </div>
          </div>
          <Link to="/user/referrals" className="text-primary hover:underline mt-2 inline-block">
            View referral program
          </Link>
        </div>
      </div>
      
      {/* Games Grid - Shows games available according to settings */}
      <div className="mb-8">
        <GamesGrid />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        
        <Link to="/user/referrals" className="card bg-gradient-to-r from-accent to-purple-500 text-white p-6 transform transition-transform hover:scale-105">
          <FaShareAlt className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
          <p>Earn commissions through our multi-level referral program!</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
