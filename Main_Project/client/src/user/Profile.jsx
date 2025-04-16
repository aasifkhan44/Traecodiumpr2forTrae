import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FaUser, FaLock, FaPhone, FaSave, FaSpinner, FaEnvelope, FaCheck, FaWallet, FaPlusCircle } from 'react-icons/fa';
// Import the Dialog component from your UI library of choice (or create a simple one)
import { Modal, Button } from 'react-bootstrap';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
console.log('Using API base URL:', API_BASE_URL);

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
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          return;
        }
        const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required');
        setSaving(false);
        return;
      }
      
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
      
      const response = await axios.put(
        `${API_BASE_URL}/api/user/profile`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
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
      
      const response = await axios.put(
        `${API_BASE_URL}/api/user/profile`,
        passwordUpdateData,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
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
    <div className="py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
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
      <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaWallet className="mr-2 text-primary" /> My Wallet
        </h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Current Balance</p>
            <p className="text-3xl font-bold">
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : profile.balance !== undefined ? (
                profile.balance.toFixed(2)
              ) : (
                '0.00'
              )}
            </p>
          </div>
          <Link 
            to="/wallet/recharge" 
            className="btn btn-primary flex items-center"
          >
            <FaPlusCircle className="mr-2" /> Add Funds
          </Link>
        </div>
      </div>
      
      <div className="mt-6 flex">
        <button
          type="button"
          className={`mr-4 py-2 px-4 rounded-md transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser className="inline mr-2" />
          Profile Details
        </button>
        <button
          type="button"
          className={`py-2 px-4 rounded-md transition-colors ${activeTab === 'password' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>
              <form>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    <FaPhone className="inline mr-2" /> Mobile Number
                  </label>
                  <div className="flex">
                    <select
                      name="countryCode"
                      value={profile.countryCode}
                      onChange={handleProfileChange}
                      className="p-2 border rounded-l w-24 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Code</option>
                      {countryCodes.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.code} {country.country}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="mobile"
                      value={profile.mobile}
                      onChange={handleProfileChange}
                      className="flex-1 p-2 border border-l-0 rounded-r focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Mobile Number"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Your mobile number is used for login and account recovery
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    <FaEnvelope className="inline mr-2" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="example@email.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional: Add your email for notifications and updates
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button" 
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark flex items-center"
                    disabled={saving}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Save button clicked - with direct API call');
                      
                      // Basic validation before API call
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
                      if (profile.email && !isValidEmail(profile.email)) {
                        toast.error(`Invalid email format: ${profile.email}. Please check for typos.`);
                        return;
                      }
                      
                      // Set saving state
                      setSaving(true);
                      
                      // Prepare data
                      const profileData = {
                        name: profile.name.trim(),
                        countryCode: profile.countryCode,
                        mobile: profile.mobile.trim(),
                        email: (profile.email || '').trim()
                      };
                      
                      console.log('Direct sending profile data:', JSON.stringify(profileData));
                      
                      // Show saving toast
                      toast.info('Saving profile changes...', {
                        position: "top-center",
                        autoClose: 1000
                      });
                      
                      // Get token
                      const token = localStorage.getItem('token');
                      if (!token) {
                        toast.error('Authentication required');
                        setSaving(false);
                        return;
                      }
                      
                      // Make direct API call with fetch instead of axios
                      console.log('Sending profile update request to:', `${API_BASE_URL}/api/user/profile`);
                      console.log('With profile data:', JSON.stringify(profileData));
                      
                      fetch(`${API_BASE_URL}/api/user/profile`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(profileData)
                      })
                      .then(response => {
                        console.log('Got initial response:', response.status, response.statusText);
                        if (!response.ok) {
                          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                        }
                        return response.json();
                      })
                      .then(data => {
                        console.log('Profile update success response data:', data);
                        if (data.success) {
                          // Show confirmation dialog
                          setConfirmationMessage(data.message || 'Profile updated successfully!');
                          setConfirmationType('profile');
                          setShowConfirmation(true);
                          
                          // Update profile data if returned
                          const updatedProfile = data.data;
                          if (updatedProfile) {
                            console.log('Setting profile with updated data:', updatedProfile);
                            setProfile({
                              name: updatedProfile.name || '',
                              countryCode: updatedProfile.countryCode || '',
                              mobile: updatedProfile.mobile || '',
                              email: updatedProfile.email || ''
                            });
                          }
                        } else {
                          console.error('Server returned success:false', data);
                          toast.error(data.message || 'Unknown error updating profile');
                        }
                      })
                      .catch(error => {
                        console.error('Error updating profile:', error);
                        console.error('Error name:', error.name);
                        console.error('Error message:', error.message);
                        
                        // More descriptive error message based on error type
                        let errorMessage = 'Error updating profile';
                        
                        if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
                          errorMessage = 'Network error: Check your connection';
                        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                          errorMessage = 'Server connection failed - is the server running?';
                        } else if (error.message.includes('Server returned')) {
                          errorMessage = error.message;
                        }
                        
                        toast.error(errorMessage, {
                          position: "top-center",
                          autoClose: 5000
                        });
                        
                        // Try logging the entire error object
                        try {
                          console.error('Full error object:', JSON.stringify(error));
                        } catch (e) {
                          console.error('Could not stringify error object');
                        }
                      })
                      .finally(() => {
                        console.log('Setting saving state to false');
                        setSaving(false);
                      });
                    }}
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
              <h2 className="text-xl font-bold mb-4">Change Password</h2>
              <form onSubmit={updatePassword}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    minLength="6"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark flex items-center"
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
