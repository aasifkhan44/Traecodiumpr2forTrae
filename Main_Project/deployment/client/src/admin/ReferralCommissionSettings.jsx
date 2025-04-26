import React, { useState, useEffect } from 'react';
import { FaTrash, FaEdit, FaCheck, FaTimes, FaPlus, FaSave, FaUserFriends } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api, { API_BASE_URL } from '../utils/api';

const ReferralCommissionSettings = () => {
  // State for commission settings
  const [commissionSettings, setCommissionSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [createMode, setCreateMode] = useState(false);
  const [formData, setFormData] = useState({
    level: '',
    percentage: '',
    description: '',
    isActive: true
  });

  // State for referral stats
  const [referralStats, setReferralStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('commission');

  // Fetch commission settings
  const fetchCommissionSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/referral-settings');
      if (res.data.success) {
        setCommissionSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching commission settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load commission settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch referrals statistics
  const fetchReferralStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/admin/referrals');
      if (res.data.success) {
        setReferralStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching referral statistics:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load referral statistics';
      toast.error(errorMessage);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchCommissionSettings();
    fetchReferralStats();
  }, []);

  // Handle edit button click
  const handleEditClick = (setting) => {
    setEditMode(setting._id);
    setFormData({
      level: setting.level,
      percentage: setting.percentage,
      description: setting.description,
      isActive: setting.isActive
    });
  };

  // Handle create form display
  const handleCreateClick = () => {
    setCreateMode(true);
    setFormData({
      level: '',
      percentage: '',
      description: '',
      isActive: true
    });
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (
        type === 'number' ? (value === '' ? '' : Number(value)) : value
      )
    }));
  };

  // Create new commission setting
  const createCommissionSetting = async (e) => {
    e.preventDefault();
    if (!formData.level || !formData.percentage) {
      toast.error('Level and percentage are required');
      return;
    }
    try {
      const res = await api.post('/admin/referral-settings', formData);
      if (res.data.success) {
        toast.success('Commission setting created');
        fetchCommissionSettings();
        setCreateMode(false);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create commission setting';
      toast.error(errorMessage);
    }
  };

  // Update existing commission setting
  const updateCommissionSetting = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/referral-settings/${editMode}`, formData);
      if (res.data.success) {
        toast.success('Commission setting updated');
        fetchCommissionSettings();
        setEditMode(null);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update commission setting';
      toast.error(errorMessage);
    }
  };

  // Delete commission setting
  const deleteCommissionSetting = async (id) => {
    try {
      const res = await api.delete(`/admin/referral-settings/${id}`);
      if (res.data.success) {
        toast.success('Commission setting deleted');
        fetchCommissionSettings();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete commission setting';
      toast.error(errorMessage);
    }
  };

  // Cancel edit or create mode
  const handleCancel = () => {
    setEditMode(null);
    setCreateMode(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center">
          <FaUserFriends className="mr-2" /> Referral & Commission Management
        </h1>
        <p className="text-gray-600">Manage referral program settings and view referral statistics</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'commission' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('commission')}
        >
          Commission Settings
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'referrals' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('referrals')}
        >
          Referral Statistics
        </button>
      </div>
      
      {/* Commission Settings Tab */}
      {activeTab === 'commission' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Commission Levels</h2>
            <button
              onClick={handleCreateClick}
              disabled={createMode}
              className="bg-green-600 text-white px-3 py-1 rounded flex items-center disabled:opacity-50"
            >
              <FaPlus className="mr-1" /> Add Level
            </button>
          </div>
          
          {/* Create Form */}
          {createMode && (
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <h3 className="font-semibold mb-4">Create New Commission Level</h3>
              <form onSubmit={createCommissionSetting}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Level</label>
                    <input
                      type="number"
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      min="1"
                      max="10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Percentage (%)</label>
                    <input
                      type="number"
                      name="percentage"
                      value={formData.percentage}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      placeholder="e.g., First level referral"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center mt-4">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="form-checkbox h-5 w-5 text-primary"
                      />
                      <span className="ml-2">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                  >
                    <FaSave className="inline mr-1" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Commission Settings List */}
          {loading ? (
            <div className="text-center py-4">Loading commission settings...</div>
          ) : commissionSettings.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded">
              No commission settings found. Create your first level!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Level</th>
                    <th className="py-2 px-4 border-b text-left">Percentage</th>
                    <th className="py-2 px-4 border-b text-left">Description</th>
                    <th className="py-2 px-4 border-b text-left">Status</th>
                    <th className="py-2 px-4 border-b text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionSettings.map(setting => (
                    <tr key={setting._id} className="hover:bg-gray-50">
                      {editMode === setting._id ? (
                        // Edit row
                        <>
                          <td className="py-2 px-4 border-b">
                            {setting.level}
                          </td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="number"
                              name="percentage"
                              value={formData.percentage}
                              onChange={handleChange}
                              className="w-full p-1 border rounded"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="text"
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                className="form-checkbox h-5 w-5 text-primary"
                              />
                              <span className="ml-2">Active</span>
                            </label>
                          </td>
                          <td className="py-2 px-4 border-b">
                            <div className="flex space-x-2">
                              <button
                                onClick={updateCommissionSetting}
                                className="text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // Display row
                        <>
                          <td className="py-2 px-4 border-b">{setting.level}</td>
                          <td className="py-2 px-4 border-b">{setting.percentage}%</td>
                          <td className="py-2 px-4 border-b">{setting.description}</td>
                          <td className="py-2 px-4 border-b">
                            <span className={`px-2 py-1 rounded text-xs ${setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {setting.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 px-4 border-b">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditClick(setting)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => deleteCommissionSetting(setting._id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Referral Statistics Tab */}
      {activeTab === 'referrals' && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">User Referral Statistics</h2>
            <p className="text-gray-600">View users who have referred others to the platform</p>
          </div>
          
          {loadingStats ? (
            <div className="text-center py-4">Loading referral statistics...</div>
          ) : referralStats.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded">
              No referral data found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left">User</th>
                    <th className="py-2 px-4 border-b text-left">Phone</th>
                    <th className="py-2 px-4 border-b text-left">Referral Code</th>
                    <th className="py-2 px-4 border-b text-left">Referrals</th>
                    <th className="py-2 px-4 border-b text-left">Total Commission</th>
                    <th className="py-2 px-4 border-b text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referralStats.map(stat => (
                    <tr key={stat.userId} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{stat.name}</td>
                      <td className="py-2 px-4 border-b">
                        {stat.countryCode} {stat.mobile}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {stat.referralCode}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {stat.referralsCount}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b">
                        {stat.totalCommission?.toFixed(2) || "0.00"}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <span className={`px-2 py-1 rounded text-xs ${stat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {stat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralCommissionSettings;
