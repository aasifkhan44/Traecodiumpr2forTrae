import { useState, useEffect } from 'react';
import { FaShareAlt, FaCopy, FaUsers, FaDollarSign } from 'react-icons/fa';
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
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Referral Program</h1>
      
      {/* Modern compact referral card */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Referral Link */}
        <div className="flex-1 min-w-[220px] max-w-lg bg-white shadow rounded-lg px-4 py-3 flex flex-col justify-center border border-gray-100">
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
          {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
        </div>
        {/* Earnings summary */}
        <div className="flex-1 min-w-[160px] max-w-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex flex-col justify-center border border-gray-100">
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
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Your Referrals</h2>
        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <FaUsers className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              You haven't referred anyone yet. Share your referral code to start earning!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Level
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {referral.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      Level {referral.level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
