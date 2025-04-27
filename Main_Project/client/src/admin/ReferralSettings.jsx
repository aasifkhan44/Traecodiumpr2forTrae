import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FaTrash, FaEdit, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ReferralSettings = () => {
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
      toast.error('Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionSettings();
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

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle update submission
  const handleUpdateSubmit = async (id) => {
    try {
      const res = await api.put(`/admin/referral-settings/${id}`, formData);

      if (res.data.success) {
        toast.success('Commission setting updated successfully');
        setEditMode(null);
        fetchCommissionSettings();
      }
    } catch (err) {
      console.error('Error updating commission setting:', err);
      toast.error(err.response?.data?.message || 'Failed to update commission setting');
    }
  };

  // Handle create submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      const level = parseInt(formData.level);
      const percentage = parseFloat(formData.percentage);
      
      if (isNaN(level) || level < 1 || level > 10) {
        return toast.error('Level must be between 1 and 10');
      }
      
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return toast.error('Percentage must be between 0 and 100');
      }
      
      const res = await api.post('/admin/referral-settings', formData);

      if (res.data.success) {
        toast.success('New commission setting created successfully');
        setCreateMode(false);
        setFormData({
          level: '',
          percentage: '',
          description: '',
          isActive: true
        });
        fetchCommissionSettings();
      }
    } catch (err) {
      console.error('Error creating commission setting:', err);
      toast.error(err.response?.data?.message || 'Failed to create commission setting');
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await api.put(`/admin/referral-settings/${id}`, {
        isActive: !currentStatus
      });

      if (res.data.success) {
        toast.success(`Commission setting ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchCommissionSettings();
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
      toast.error('Failed to update active status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Referral Commission Settings</h1>
        <button 
          onClick={() => setCreateMode(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
          disabled={createMode}
        >
          <FaPlus className="mr-2" /> Add New Level
        </button>
      </div>

      {/* Create New Setting Form */}
      {createMode && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Commission Level</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level (1-10)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Level X referral commission"
                />
              </div>
              <div className="md:col-span-2 flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCreateMode(false);
                  setFormData({
                    level: '',
                    percentage: '',
                    description: '',
                    isActive: true
                  });
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Commission Settings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : commissionSettings.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center">No commission settings found</td>
              </tr>
            ) : (
              commissionSettings.map((setting) => (
                <tr key={setting._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === setting._id ? (
                      <input
                        type="number"
                        name="level"
                        value={formData.level}
                        onChange={handleChange}
                        className="w-full p-1 border rounded"
                        min="1"
                        max="10"
                        disabled // Level cannot be changed after creation
                      />
                    ) : (
                      <span>Level {setting.level}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === setting._id ? (
                      <input
                        type="number"
                        name="percentage"
                        value={formData.percentage}
                        onChange={handleChange}
                        className="w-full p-1 border rounded"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    ) : (
                      <span>{setting.percentage}%</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editMode === setting._id ? (
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      <span>{setting.description}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === setting._id ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        <span>Active</span>
                      </div>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {setting.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editMode === setting._id ? (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleUpdateSubmit(setting._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaCheck />
                        </button>
                        <button 
                          onClick={() => setEditMode(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditClick(setting)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleToggleActive(setting._id, setting.isActive)}
                          className={setting.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {setting.isActive ? <FaTimes /> : <FaCheck />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Explanation of Commission System */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-bold mb-4">About the Referral Commission System</h2>
        <p className="mb-2">
          The multi-level referral system allows users to earn commissions when their referred users place bets.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li><strong>Levels:</strong> Configure up to 10 levels of referrals</li>
          <li><strong>Percentage:</strong> Set the commission percentage for each level</li>
          <li><strong>Status:</strong> Enable or disable specific levels</li>
        </ul>
        <p>
          When a user places a bet, commissions are automatically calculated and distributed to all referrers up the chain according to these settings.
        </p>
      </div>
    </div>
  );
};

export default ReferralSettings;
