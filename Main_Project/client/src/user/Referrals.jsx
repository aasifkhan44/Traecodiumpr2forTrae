import { useState, useEffect } from 'react';
import { FaShareAlt, FaCopy, FaUsers, FaDollarSign } from 'react-icons/fa';
import { useContext } from 'react';
import SiteSettingsContext from '../contexts/SiteSettingsContext.jsx';

const Referrals = () => {
  const { siteSettings } = useContext(SiteSettingsContext);
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referrals, setReferrals] = useState([
    { id: 1, name: 'John Doe', level: 1, joinDate: '2025-03-25', totalBets: 45, commission: 25 },
    { id: 2, name: 'Jane Smith', level: 1, joinDate: '2025-03-28', totalBets: 32, commission: 18 },
    { id: 3, name: 'Mike Johnson', level: 2, joinDate: '2025-04-01', totalBets: 12, commission: 5 }
  ]);
  
  // Fetch user profile to get referral code
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
        
        const response = await fetch('http://localhost:5000/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.data && isMounted) {
          setReferralCode(prev => {
            if (prev !== (data.data.referralCode || '')) {
              return data.data.referralCode || '';
            }
            return prev;
          });
        } else if (!data.success && isMounted) {
          setError(data.message || 'Failed to fetch profile data');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching user profile:', err);
          setError('Server error while fetching profile data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserProfile();
    return () => { isMounted = false; };
  }, []);
  
  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Referral Program</h1>
      
      {/* Referral Link Card */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Referral Link</h2>
          <FaShareAlt className="text-primary text-xl" />
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Share your referral code with friends and earn commissions when they play!
        </p>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <div className="p-4">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex items-center justify-between mb-4">
            {loading ? (
              <div className="font-mono font-bold truncate">Loading your referral code...</div>
            ) : (
              <div className="font-mono font-bold truncate">
                {siteSettings?.domain ? `${siteSettings.domain}/register?ref=${referralCode}` : 'Loading domain...'}
              </div>
            )}
            <button 
              onClick={handleCopyReferralCode}
              className="ml-2 btn btn-primary"
              disabled={loading || !referralCode}
            >
              {copySuccess ? 'Copied!' : <><FaCopy className="mr-1" /> Copy</>}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center text-primary mb-2">
              <FaUsers className="mr-2" />
              <h3 className="font-bold">Referral Structure</h3>
            </div>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Level 1: 10% commission</li>
              <li>• Level 2: 5% commission</li>
              <li>• Level 3: 2% commission</li>
            </ul>
          </div>
          
          <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center text-primary mb-2">
              <FaDollarSign className="mr-2" />
              <h3 className="font-bold">Your Earnings</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Referrals</p>
                <p className="text-lg font-bold">{referrals.length}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-lg font-bold">$48.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Referrals Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Join Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Bets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Your Commission
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
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium
                          ${referral.level === 1 ? 'bg-primary text-white' : 
                          referral.level === 2 ? 'bg-secondary text-white' : 
                          'bg-accent text-white'}`}
                      >
                        Level {referral.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {referral.joinDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {referral.totalBets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-success font-medium">
                      ${referral.commission}
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
