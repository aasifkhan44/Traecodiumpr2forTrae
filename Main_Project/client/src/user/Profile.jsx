import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FaUser, FaLock, FaPhone, FaSave, FaSpinner, FaEnvelope, FaCheck, FaWallet, FaPlusCircle } from 'react-icons/fa';
// Import the Dialog component from your UI library of choice (or create a simple one)
import { Modal, Button } from 'react-bootstrap';

// Country codes list for dropdown
const countryCodes = [
  { code: '+1', country: 'US/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+61', country: 'Australia' },
  { code: '+86', country: 'China' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+7', country: 'Russia' },
  { code: '+55', country: 'Brazil' },
  { code: '+234', country: 'Nigeria' },
  { code: '+27', country: 'South Africa' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+65', country: 'Singapore' },
  // Add more country codes as needed
];

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'password'
  const [error, setError] = useState(null);

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationType, setConfirmationType] = useState('password'); // 'password' or 'profile'

  // User profile state
  const [profile, setProfile] = useState({
    name: '',
    countryCode: '',
    mobile: '',
    email: '',
    balance: 0
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/user/profile');
        const userData = response.data.data;
        if (userData && isMounted) {
          setProfile(prev => {
            // Only update if something actually changed
            if (
              prev.name !== (userData.name || '') ||
              prev.countryCode !== (userData.countryCode || '') ||
              prev.mobile !== (userData.mobile || '') ||
              prev.email !== (userData.email || '') ||
              prev.balance !== (userData.balance || 0)
            ) {
              return {
                name: userData.name || '',
                countryCode: userData.countryCode || '',
                mobile: userData.mobile || '',
                email: userData.email || '',
                balance: userData.balance || 0
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
        toast.error('Could not load your profile information');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  // Email validation helper function
  const isValidEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return email === '' || emailRegex.test(email); // Empty is valid (optional field)
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    console.log('Save Changes button clicked');
    
    // Basic validation
    if (!profile.name) {
      toast.error('Name is required');
      return;
    }
    
    if (!profile.mobile) {
      toast.error('Mobile number is required');
      return;
    }
    
    if (!profile.countryCode) {
      toast.error('Country code is required');
      return;
    }
    
    // Validate email format if provided
    if (profile.email && !isValidEmail(profile.email)) {
      toast.error(`Invalid email format: ${profile.email}. Please check for typos.`);
      return;
    }
    
    try {
      setSaving(true);
      console.log('Setting saving state to true');
      
      // Process the profile data before sending
      const profileData = {
        name: profile.name.trim(),
        countryCode: profile.countryCode,
        mobile: profile.mobile.trim(),
        email: (profile.email || '').trim()
      };
      
      console.log('Sending profile update:', profileData);
      
      console.log('Sending profile data to server:', JSON.stringify(profileData));
      toast.info('Saving profile changes...', {
        position: "top-center",
        autoClose: 1000
      });
      
      const response = await api.put('/user/profile', profileData);
      
      console.log('Profile update response:', response.data);
      
      if (response.data.success) {
        // Show confirmation dialog instead of toast
        setConfirmationMessage(response.data.message || 'Profile updated successfully!');
        setConfirmationType('profile');
        setShowConfirmation(true);
        
        // Refresh the profile data to show updated information
        const updatedProfile = response.data.data;
        if (updatedProfile) {
          setProfile({
            name: updatedProfile.name || '',
            countryCode: updatedProfile.countryCode || '',
            mobile: updatedProfile.mobile || '',
            email: updatedProfile.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', error.response?.data || 'No response data');
      
      // Display error message
      toast.error(
        error.response?.data?.message || 'Error updating profile',
        {
          position: "top-center",
          autoClose: 5000
        }
      );
    } finally {
      console.log('Setting saving state to false');
      setSaving(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    
    // Password validation
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    
    if (!passwordData.newPassword) {
      toast.error('New password is required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setSaving(true);
      
      // Ensure we're sending correctly formatted data for password updates
      const passwordUpdateData = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        isPasswordUpdateOnly: true  // Add flag to explicitly indicate password-only update
      };
      
      console.log('Sending password update request');
      
      toast.info('Updating password...', {
        position: "top-center",
        autoClose: 1000
      });
      
      const response = await api.post('/user/change-password', passwordUpdateData);
      
      console.log('Password update response:', response.data);
      
      if (response.data.success) {
        // Show confirmation dialog instead of toast
        setConfirmationMessage(response.data.message || 'Password updated successfully!');
        setConfirmationType('password');
        setShowConfirmation(true);
        
        // If a new token is provided (after password change), update it in localStorage
        if (response.data.newToken) {
          localStorage.setItem('token', response.data.newToken);
        }
        
        // Clear password fields after successful update
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update password';
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false
      });
    } finally {
      setSaving(false);
    }
  };

  // Confirmation dialog close handler
  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-white drop-shadow">My Profile</h2>
      
      {/* Confirmation Dialog */}
      <Modal show={showConfirmation} onHide={handleCloseConfirmation} centered>
        <Modal.Header>
          <Modal.Title>
            <FaCheck className="inline-block text-green-500 mr-2" /> Success
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <p className="text-lg">{confirmationMessage}</p>
          {confirmationType === 'password' && (
            <p className="text-sm text-gray-600 mt-2">Your session has been updated with your new password.</p>
          )}
          {confirmationType === 'profile' && (
            <p className="text-sm text-gray-600 mt-2">Your profile information has been successfully updated.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-center">
          <Button variant="success" onClick={handleCloseConfirmation} className="px-4 py-2">
            OK
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Wallet Card */}
      <div className="flex flex-row gap-3 sm:gap-4 w-full mb-4">
        <div className="flex-1 min-w-0 bg-gradient-to-br from-yellow-400 via-orange-300 to-pink-200 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col items-center">
          <span className="text-xs sm:text-sm text-gray-800 font-semibold mb-1 drop-shadow">Balance</span>
          <span className="text-xl sm:text-2xl font-extrabold text-gray-900 drop-shadow">₹{profile.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex-1 min-w-0 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col items-center">
          <span className="text-xs sm:text-sm text-white font-semibold mb-1 drop-shadow">Mobile</span>
          <span className="text-xl sm:text-2xl font-extrabold text-white drop-shadow truncate">{profile.countryCode} {profile.mobile}</span>
        </div>
      </div>
      
      <div className="mt-6 flex">
        <button
          type="button"
          className={`mr-4 py-2 px-4 rounded-md transition-colors ${activeTab === 'profile' ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser className="inline mr-2" />
          Profile Details
        </button>
        <button
          type="button"
          className={`py-2 px-4 rounded-md transition-colors ${activeTab === 'password' ? 'bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('password')}
        >
          <FaLock className="inline mr-2" />
          Change Password
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-10">
          <FaSpinner className="animate-spin text-3xl mx-auto text-primary" />
          <p className="mt-2">Loading your profile...</p>
        </div>
      ) : (
        <div>
          {/* Profile Info Form */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Personal Information</h2>
              <form onSubmit={updateProfile}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Country Code</label>
                  <select
                    name="countryCode"
                    value={profile.countryCode}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    required
                  >
                    <option value="">Select Country Code</option>
                    {countryCodes.map(({ code, country }) => (
                      <option key={code} value={code}>{code} ({country})</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Mobile</label>
                  <input
                    type="text"
                    name="mobile"
                    value={profile.mobile}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    required
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white px-4 py-2 rounded font-bold flex items-center shadow hover:scale-105 hover:shadow-lg transition"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Password Change Form */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Change Password</h2>
              <form onSubmit={updatePassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    minLength="6"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-blue-800">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-xl border-blue-200 px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 shadow"
                    required
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 via-green-400 to-yellow-400 text-white px-4 py-2 rounded font-bold flex items-center shadow hover:scale-105 hover:shadow-lg transition"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <FaLock className="mr-2" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
