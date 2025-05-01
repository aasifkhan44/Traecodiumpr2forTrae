import { useState, useEffect } from 'react';
import { FaShareAlt, FaCopy, FaUsers, FaDollarSign, FaSpinner, FaUserFriends, FaExclamationTriangle } from 'react-icons/fa';
import { useContext } from 'react';
import SiteSettingsContext from '../contexts/SiteSettingsContext.jsx';
import api from '../utils/api';

const Referrals = () => {
  const { siteSettings } = useContext(SiteSettingsContext);
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Helper for referral link (should use homepage with ?ref=...)
  const referralLink = siteSettings?.domain && referralCode
    ? `${siteSettings.domain}/?ref=${referralCode}`
    : '';

  // Fetch user profile to get referral code and earnings
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        // Use centralized API utility
        const response = await api.get('/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.data && isMounted) {
          setReferralCode(prev => {
            if (prev !== (response.data.data.referralCode || '')) {
              return response.data.data.referralCode || '';
            }
            return prev;
          });
          // Set total earnings if available
          if (typeof response.data.data.referralEarnings === 'number') {
            setTotalEarnings(response.data.data.referralEarnings);
          }
        } else if (isMounted) {
          setError(response.data?.message || 'Failed to fetch profile data');
        }
      } catch (err) {
        if (isMounted) {
          setError('Server error while fetching profile data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUserProfile();
    return () => { isMounted = false; };
  }, []);

  // Fetch user referrals
  useEffect(() => {
    let isMounted = true;
    const fetchUserReferrals = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        // Use centralized API utility
        const response = await api.get('/user/referrals', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && Array.isArray(response.data.data) && isMounted) {
          setReferrals(response.data.data);
        } else if (isMounted) {
          setError(response.data?.message || 'Failed to fetch referrals');
        }
      } catch (err) {
        if (isMounted) {
          setError('Server error while fetching referrals');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUserReferrals();
    return () => { isMounted = false; };
  }, []);

  const handleCopyReferralCode = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return (
      <div className="referrals-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow flex items-center"><FaUserFriends className="mr-2" /> Referrals</h1>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center">
            <FaSpinner className="animate-spin text-3xl text-primary" />
            <p className="ml-2 text-blue-800">Loading referral data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referrals-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white drop-shadow flex items-center"><FaUserFriends className="mr-2" /> Referrals</h1>
      </div>
      {error && (
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
          <FaExclamationTriangle className="text-red-500 text-2xl mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {/* Modern compact referral card */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Referral Link */}
        <div className="flex-1 min-w-[220px] max-w-lg bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-semibold">Your Referral Link</span>
            <FaShareAlt className="text-primary text-lg" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xs truncate bg-gray-100 px-2 py-1 rounded">
              {loading ? 'Loading...' : referralLink || 'Loading domain...'}
            </span>
            <button onClick={handleCopyReferralCode} className="btn btn-xs btn-primary px-2 py-1 text-xs" disabled={loading || !referralLink}>
              {copySuccess ? 'Copied!' : <FaCopy />}
            </button>
          </div>
        </div>
        {/* Earnings summary */}
        <div className="flex-1 min-w-[160px] max-w-xs bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100">
          <div className="flex items-center text-primary mb-1">
            <FaDollarSign className="mr-2 text-base" />
            <span className="font-semibold text-base">Your Earnings</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">Total Referrals: <span className="font-bold text-sm text-gray-900">{referrals.length}</span></span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Total Earnings: <span className="font-bold text-sm text-green-600">${totalEarnings.toFixed(2)}</span></span>
          </div>
        </div>
      </div>
      {/* Referrals Table - Only show original data */}
      <div className="overflow-x-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-white drop-shadow">Your Referrals</h2>
        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh] w-full text-base text-white">Loading...</div>
        ) : error ? (
          <div className="text-red-200 text-center">{error}</div>
        ) : (
          <table className="min-w-full text-xs sm:text-sm bg-white rounded-lg shadow-md overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref._id} className="even:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">{ref.name}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{ref.email}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{new Date(ref.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Referrals;
