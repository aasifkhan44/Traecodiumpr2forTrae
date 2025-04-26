import { useState, useEffect } from 'react';
import { FaUsers, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import { API_BASE_URL } from '../utils/api';

const ReferralCommissions = () => {
  const [referrals, setReferrals] = useState([]);
  const [commissionSettings, setCommissionSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommission: 0,
    referralsByLevel: {}
  });

  // Fetch referrals data on component mount
  useEffect(() => {
    fetchReferralsData();
    fetchCommissionSettings();
  }, []);

  // Process stats when referrals data changes
  useEffect(() => {
    if (referrals.length > 0) {
      processReferralStats();
    }
  }, [referrals]);

  // Fetch user's referrals data
  const fetchReferralsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/user/referrals`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReferrals(data.data);
      } else {
        setError(data.message || 'Failed to fetch referrals');
      }
    } catch (err) {
      setError('Server error while fetching referrals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch commission settings
  const fetchCommissionSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/commission-settings`);
      const data = await response.json();
      
      if (data.success) {
        setCommissionSettings(data.data.sort((a, b) => a.level - b.level));
      }
    } catch (err) {
      console.error('Error fetching commission settings:', err);
    }
  };

  // Process referral statistics
  const processReferralStats = () => {
    const stats = {
      totalReferrals: referrals.length,
      totalCommission: 0,
      referralsByLevel: {}
    };

    // Group referrals by level and calculate totals
    referrals.forEach(ref => {
      // Increment referrals count for this level
      stats.referralsByLevel[ref.level] = stats.referralsByLevel[ref.level] || {
        count: 0,
        commission: 0
      };
      
      stats.referralsByLevel[ref.level].count++;
      stats.referralsByLevel[ref.level].commission += ref.commission;
      
      // Add to total commission
      stats.totalCommission += ref.commission;
    });

    setStats(stats);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Multi-Level Referral Commissions</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
              <FaUsers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-xl font-bold">{stats.totalReferrals}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
              <FaMoneyBillWave size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalCommission)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
              <FaChartLine size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Commission Levels</p>
              <p className="text-xl font-bold">{Object.keys(stats.referralsByLevel).length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Commission Rates Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Commission Rates</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Level</th>
                <th className="py-3 px-4 text-left">Percentage</th>
                <th className="py-3 px-4 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {commissionSettings.map((setting) => (
                <tr key={setting._id}>
                  <td className="py-3 px-4">{setting.level}</td>
                  <td className="py-3 px-4">{setting.percentage}%</td>
                  <td className="py-3 px-4">{setting.description}</td>
                </tr>
              ))}
              {commissionSettings.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-gray-500">
                    No commission settings available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Referrals by Level */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Your Referrals by Level</h2>
        
        {loading ? (
          <p className="text-center py-4">Loading referral data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Level</th>
                  <th className="py-3 px-4 text-left">Number of Referrals</th>
                  <th className="py-3 px-4 text-left">Total Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.keys(stats.referralsByLevel).length > 0 ? (
                  Object.entries(stats.referralsByLevel)
                    .sort(([levelA], [levelB]) => parseInt(levelA) - parseInt(levelB))
                    .map(([level, data]) => (
                      <tr key={level}>
                        <td className="py-3 px-4">Level {level}</td>
                        <td className="py-3 px-4">{data.count}</td>
                        <td className="py-3 px-4">{formatCurrency(data.commission)}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-gray-500">
                      You don't have any referrals yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralCommissions;
