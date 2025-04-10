import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaGamepad, FaMoneyBill, FaChartLine, FaCog, FaShareAlt } from 'react-icons/fa';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGames: 0,
    totalVolume: 0,
    profit: 0,
    referrals: 0
  });
  
  const [recentGames, setRecentGames] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setStats(prevStats => ({
            ...prevStats,
            totalUsers: data.data.totalUsers || 0,
            activeUsers: data.data.activeUsers || 0,
            totalGames: data.data.totalGames || 0,
            totalVolume: data.data.totalVolume || 0,
            profit: data.data.profit || 0,
            referrals: data.data.referrals || 0
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Users</h2>
            <FaUsers className="text-secondary text-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold">{stats.activeUsers}</p>
            </div>
          </div>
          <Link to="/admin/users" className="text-primary hover:underline mt-4 inline-block">
            View all users
          </Link>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Games</h2>
            <FaGamepad className="text-secondary text-2xl" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Total Games</p>
            <p className="text-2xl font-bold">{stats.totalGames}</p>
          </div>
          <Link to="/admin/games" className="text-primary hover:underline mt-4 inline-block">
            View game history
          </Link>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Revenue</h2>
            <FaMoneyBill className="text-secondary text-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Volume</p>
              <p className="text-2xl font-bold">${stats.totalVolume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Profit</p>
              <p className="text-2xl font-bold">${stats.profit.toLocaleString()}</p>
            </div>
          </div>
          <Link to="/admin/transactions" className="text-primary hover:underline mt-4 inline-block">
            View all transactions
          </Link>
        </div>
      </div>
      
      {/* Recent Games */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Games</h2>
          <Link to="/admin/games" className="text-primary hover:underline">
            View all
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Bets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payout
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
              {recentGames.map((game) => (
                <tr key={game.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {game.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {game.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span 
                        className={`w-4 h-4 rounded-full mr-2 
                          ${game.color === 'red' ? 'bg-red-500' : 
                            game.color === 'green' ? 'bg-green-500' : 
                            game.color === 'blue' ? 'bg-blue-500' : 
                            'bg-gray-500'}`}
                      ></span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {game.color} ({game.number})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {game.totalBets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${game.volume}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${game.payout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/settings" className="card bg-gradient-to-r from-primary to-secondary text-white p-6 transform transition-transform hover:scale-105">
          <FaCog className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">Game Settings</h3>
          <p>Configure game parameters, odds, and timings</p>
        </Link>
        
        <Link to="/admin/referrals" className="card bg-gradient-to-r from-accent to-purple-500 text-white p-6 transform transition-transform hover:scale-105">
          <FaShareAlt className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">Referral Settings</h3>
          <p>Configure multi-level referral commission percentages</p>
        </Link>
        
        <Link to="/admin/users" className="card bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 transform transition-transform hover:scale-105">
          <FaChartLine className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">Analytics</h3>
          <p>View detailed statistics and user analytics</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
