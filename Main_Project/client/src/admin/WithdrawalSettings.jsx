import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaSave, FaUndo } from 'react-icons/fa';
import { toast } from 'react-toastify';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';

const WithdrawalSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upi');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    upiOptions: [],
    cryptoOptions: [],
    minimumWithdrawalAmount: 100,
    maximumWithdrawalAmount: 10000,
    withdrawalInstructions: '',
    upiWithdrawalActive: true,
    cryptoWithdrawalActive: true
  });

  // Fetch withdrawal settings on component mount
  useEffect(() => {
    fetchWithdrawalSettings();
  }, []);

  // Fetch withdrawal settings from API
  const fetchWithdrawalSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/withdrawal-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setSettings(res.data.data);
        setFormData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching withdrawal settings:', err);
      toast.error('Failed to load withdrawal settings');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle numeric input change
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseFloat(value) || 0
      });
    }
  };

  // Handle UPI option change
  const handleUpiOptionChange = (index, field, value, type = 'text') => {
    const updatedOptions = [...formData.upiOptions];
    updatedOptions[index][field] = type === 'checkbox' ? value : value;
    setFormData({
      ...formData,
      upiOptions: updatedOptions
    });
  };

  // Handle crypto option change
  const handleCryptoOptionChange = (index, field, value, type = 'text') => {
    const updatedOptions = [...formData.cryptoOptions];
    updatedOptions[index][field] = type === 'checkbox' ? value : value;
    setFormData({
      ...formData,
      cryptoOptions: updatedOptions
    });
  };

  // Add new UPI option
  const addUpiOption = () => {
    setFormData({
      ...formData,
      upiOptions: [
        ...formData.upiOptions,
        {
          name: '',
          conversionRate: 1,
          withdrawalFee: 0,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        }
      ]
    });
  };

  // Add new crypto option
  const addCryptoOption = () => {
    setFormData({
      ...formData,
      cryptoOptions: [
        ...formData.cryptoOptions,
        {
          currency: '',
          conversionRate: 1,
          withdrawalFee: 0,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        }
      ]
    });
  };

  // Remove UPI option
  const removeUpiOption = (index) => {
    const updatedOptions = [...formData.upiOptions];
    updatedOptions.splice(index, 1);
    setFormData({
      ...formData,
      upiOptions: updatedOptions
    });
  };

  // Remove crypto option
  const removeCryptoOption = (index) => {
    const updatedOptions = [...formData.cryptoOptions];
    updatedOptions.splice(index, 1);
    setFormData({
      ...formData,
      cryptoOptions: updatedOptions
    });
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    console.log("formData before sending:", formData);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/withdrawal-settings`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (res.data.success) {
        toast.success('Withdrawal settings updated successfully');
        setSettings(res.data.data);
        setEditMode(false);
      }
    } catch (err) {
      console.error('Error updating withdrawal settings:', err);
      toast.error(err.response?.data?.message || 'Failed to update withdrawal settings');
    }
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setFormData(settings);
    setEditMode(false);
  };

  if (loading) {
    return <div className="p-4">Loading withdrawal settings...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Withdrawal Settings</h1>
        {!editMode ? (
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            onClick={() => setEditMode(true)}
          >
            <FaEdit className="mr-2" /> Edit Settings
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
              onClick={handleSaveSettings}
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center"
              onClick={cancelEdit}
            >
              <FaUndo className="mr-2" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">General Withdrawal Settings</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Withdrawal Amount
              </label>
              <input
                type="text"
                name="minimumWithdrawalAmount"
                value={formData.minimumWithdrawalAmount}
                onChange={handleNumericChange}
                className="w-full p-2 border rounded"
                disabled={!editMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Withdrawal Amount
              </label>
              <input
                type="text"
                name="maximumWithdrawalAmount"
                value={formData.maximumWithdrawalAmount}
                onChange={handleNumericChange}
                className="w-full p-2 border rounded"
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Withdrawal Instructions
            </label>
            <textarea
              name="withdrawalInstructions"
              value={formData.withdrawalInstructions}
              onChange={handleChange}
              className="w-full p-2 border rounded h-24"
              disabled={!editMode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="upiWithdrawalActive"
                name="upiWithdrawalActive"
                checked={formData.upiWithdrawalActive}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
                disabled={!editMode}
              />
              <label htmlFor="upiWithdrawalActive" className="text-sm font-medium text-gray-700">
                Enable UPI Withdrawal
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cryptoWithdrawalActive"
                name="cryptoWithdrawalActive"
                checked={formData.cryptoWithdrawalActive}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
                disabled={!editMode}
              />
              <label htmlFor="cryptoWithdrawalActive" className="text-sm font-medium text-gray-700">
                Enable Cryptocurrency Withdrawal
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Methods Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-center w-1/2 font-medium ${
              activeTab === 'upi'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upi')}
          >
            UPI Withdrawal
          </button>
          <button
            className={`px-4 py-2 text-center w-1/2 font-medium ${
              activeTab === 'crypto'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('crypto')}
          >
            Cryptocurrency Withdrawal
          </button>
        </div>

        {/* UPI Options */}
        {activeTab === 'upi' && (
          <div className="p-4">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">UPI Withdrawal Options</h2>
              {editMode && (
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center text-sm"
                  onClick={addUpiOption}
                >
                  <FaPlus className="mr-1" /> Add UPI Option
                </button>
              )}
            </div>

            {formData.upiOptions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No UPI withdrawal options configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UPI/APP Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Withdrawal Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        App Icon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {editMode && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.upiOptions.map((option, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) => handleUpiOptionChange(index, 'name', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.name
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.conversionRate}
                              onChange={(e) => {
                                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                  handleUpiOptionChange(
                                    index,
                                    'conversionRate',
                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                  );
                                }
                              }}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.conversionRate
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.withdrawalFee}
                              onChange={(e) => {
                                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                  handleUpiOptionChange(
                                    index,
                                    'withdrawalFee',
                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                  );
                                }
                              }}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.withdrawalFee
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <select
                              value={option.feeType}
                              onChange={(e) => handleUpiOptionChange(index, 'feeType', e.target.value)}
                              className="w-full p-1 border rounded"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="percent">Percent</option>
                            </select>
                          ) : (
                            option.feeType === 'fixed' ? 'Fixed' : 'Percent'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.imageUrl || ''}
                              onChange={(e) => handleUpiOptionChange(index, 'imageUrl', e.target.value)}
                              className="w-full p-1 border rounded"
                              placeholder="Image URL for icon"
                            />
                          ) : (
                            <div className="h-6 w-6">
                              {option.imageUrl ? (
                                <img 
                                  src={option.imageUrl} 
                                  alt="UPI icon" 
                                  className="h-full w-full object-contain"
                                  onError={(e) => e.target.src = 'https://via.placeholder.com/24?text=No+Image'}
                                />
                              ) : (
                                <div className="h-full w-full bg-gray-200 rounded-full"></div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="checkbox"
                              checked={option.isActive}
                              onChange={(e) => handleUpiOptionChange(index, 'isActive', e.target.checked, 'checkbox')}
                              className="h-4 w-4"
                            />
                          ) : (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${option.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {option.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        {editMode && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => removeUpiOption(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Crypto Options */}
        {activeTab === 'crypto' && (
          <div className="p-4">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">Cryptocurrency Withdrawal Options</h2>
              {editMode && (
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center text-sm"
                  onClick={addCryptoOption}
                >
                  <FaPlus className="mr-1" /> Add Crypto Option
                </button>
              )}
            </div>

            {formData.cryptoOptions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No cryptocurrency withdrawal options configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Withdrawal Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        App Icon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {editMode && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.cryptoOptions.map((option, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.currency}
                              onChange={(e) => handleCryptoOptionChange(index, 'currency', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.currency
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.conversionRate}
                              onChange={(e) => {
                                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                  handleCryptoOptionChange(
                                    index,
                                    'conversionRate',
                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                  );
                                }
                              }}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.conversionRate
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.withdrawalFee}
                              onChange={(e) => {
                                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                  handleCryptoOptionChange(
                                    index,
                                    'withdrawalFee',
                                    e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                  );
                                }
                              }}
                              className="w-full p-1 border rounded"
                            />
                          ) : (
                            option.withdrawalFee
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <select
                              value={option.feeType}
                              onChange={(e) => handleCryptoOptionChange(index, 'feeType', e.target.value)}
                              className="w-full p-1 border rounded"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="percent">Percent</option>
                            </select>
                          ) : (
                            option.feeType === 'fixed' ? 'Fixed' : 'Percent'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="text"
                              value={option.imageUrl || ''}
                              onChange={(e) => handleCryptoOptionChange(index, 'imageUrl', e.target.value)}
                              className="w-full p-1 border rounded"
                              placeholder="Image URL for icon"
                            />
                          ) : (
                            <div className="h-6 w-6">
                              {option.imageUrl ? (
                                <img 
                                  src={option.imageUrl} 
                                  alt="Crypto icon" 
                                  className="h-full w-full object-contain"
                                  onError={(e) => e.target.src = 'https://via.placeholder.com/24?text=No+Image'}
                                />
                              ) : (
                                <div className="h-full w-full bg-gray-200 rounded-full"></div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editMode ? (
                            <input
                              type="checkbox"
                              checked={option.isActive}
                              onChange={(e) => handleCryptoOptionChange(index, 'isActive', e.target.checked, 'checkbox')}
                              className="h-4 w-4"
                            />
                          ) : (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${option.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {option.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        {editMode && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => removeCryptoOption(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalSettings;