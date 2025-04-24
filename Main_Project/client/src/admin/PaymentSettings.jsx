import React, { useState, useEffect, useContext } from 'react';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../utils/api';

const PaymentSettings = () => {
  console.log('PaymentSettings component initializing');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upi');
  const [editMode, setEditMode] = useState(null);
  const [createMode, setCreateMode] = useState(false);
  const [formData, setFormData] = useState({
    type: 'upi',
    name: '',
    identifier: '',
    description: '',
    imageUrl: '',
    currency: '',
    conversionRate: 1.0,
    isActive: true
  });

  console.log('PaymentSettings component state initialized');

  // Fetch payment methods on component mount and when tab changes
  useEffect(() => {
    console.log('PaymentSettings useEffect triggered');
    const fetchPaymentMethods = async () => {
      try {
        console.log('Fetching payment methods');
        const res = await api.get(`/admin/payment-methods?type=${activeTab}`);
        
        console.log('Payment methods response:', res.data);
        
        if (res.data.success) {
          setPaymentMethods(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching payment methods:', err);
        toast.error('Failed to load payment methods');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [activeTab]);

  // Fetch payment methods from API
  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/payment-methods?type=${activeTab}`);
      
      if (res.data.success) {
        setPaymentMethods(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      toast.error('Failed to load payment methods');
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

  // Handle create form submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const newFormData = {
        ...formData,
        type: activeTab
      };
      
      const response = await api.post('/admin/payment-methods', newFormData);

      if (response.data.success) {
        toast.success(`New ${activeTab === 'upi' ? 'UPI ID' : 'crypto wallet'} added successfully`);
        setCreateMode(false);
        setFormData({
          type: activeTab,
          name: '',
          identifier: '',
          description: '',
          imageUrl: '',
          currency: activeTab === 'upi' ? 'INR' : 'USDT',
          conversionRate: 1.0,
          isActive: true
        });
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Error creating payment method:', err);
      toast.error(err.response?.data?.message || 'Failed to create payment method');
    }
  };

  // Handle edit button click
  const handleEditClick = (method) => {
    setEditMode(method._id);
    setFormData({
      type: method.type,
      name: method.name,
      identifier: method.identifier,
      description: method.description || '',
      imageUrl: method.imageUrl || '',
      currency: method.currency,
      conversionRate: method.conversionRate || 1.0,
      isActive: method.isActive
    });
  };

  // Handle update form submission
  const handleUpdateSubmit = async (id) => {
    try {
      const res = await api.put(`/admin/payment-methods/${id}`, formData);

      if (res.data.success) {
        toast.success(`${activeTab === 'upi' ? 'UPI ID' : 'Crypto wallet'} updated successfully`);
        setEditMode(null);
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Error updating payment method:', err);
      toast.error(err.response?.data?.message || 'Failed to update payment method');
    }
  };

  // Handle active toggle
  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await api.put(`/admin/payment-methods/${id}`, {
        isActive: !currentStatus
      });

      if (res.data.success) {
        toast.success(`${activeTab === 'upi' ? 'UPI ID' : 'Crypto wallet'} ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
      toast.error('Failed to update status');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab === 'upi' ? 'UPI ID' : 'crypto wallet address'}?`)) {
      return;
    }
    
    try {
      const res = await api.delete(`/admin/payment-methods/${id}`);

      if (res.data.success) {
        toast.success(res.data.message);
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast.error('Failed to delete payment method');
    }
  };

  // Get appropriate placeholder text based on active tab
  const getPlaceholder = (field) => {
    if (activeTab === 'upi') {
      switch (field) {
        case 'name':
          return 'e.g., Google Pay, PhonePe';
        case 'identifier':
          return 'e.g., username@okbank';
        case 'currency':
          return 'INR';
        case 'description':
          return 'Optional description';
        default:
          return '';
      }
    } else {
      switch (field) {
        case 'name':
          return 'e.g., Bitcoin, Ethereum, USDT';
        case 'identifier':
          return 'Wallet address';
        case 'currency':
          return 'e.g., BTC, ETH, USDT';
        case 'description':
          return 'Optional notes or network info';
        default:
          return '';
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment Settings</h1>
      </div>

      {/* Payment Methods Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-center w-1/2 font-medium ${
              activeTab === 'upi'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setActiveTab('upi');
              setCreateMode(false);
              setEditMode(null);
            }}
          >
            UPI Payment
          </button>
          <button
            className={`px-4 py-2 text-center w-1/2 font-medium ${
              activeTab === 'crypto'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setActiveTab('crypto');
              setCreateMode(false);
              setEditMode(null);
            }}
          >
            Cryptocurrency
          </button>
        </div>

        <div className="p-4">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {activeTab === 'upi' ? 'UPI Payment IDs' : 'Cryptocurrency Wallets'}
            </h2>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center text-sm"
              onClick={() => {
                setCreateMode(true);
                setFormData({
                  type: activeTab,
                  name: '',
                  identifier: '',
                  description: '',
                  svgCode: '',
                  currency: activeTab === 'upi' ? 'INR' : 'USDT',
                  conversionRate: 1.0,
                  isActive: true
                });
              }}
            >
              <FaPlus className="mr-1" /> Add New
            </button>
          </div>

          {/* Create Form */}
          {createMode && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
              <h3 className="font-semibold mb-3">
                Add New {activeTab === 'upi' ? 'UPI ID' : 'Crypto Wallet'}
              </h3>
              <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'upi' ? 'Payment App' : 'Cryptocurrency Name'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={getPlaceholder('name')}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'upi' ? 'UPI ID' : 'Wallet Address'}
                  </label>
                  <input
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    placeholder={getPlaceholder('identifier')}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    placeholder={getPlaceholder('currency')}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conversion Rate ( per {formData.currency || (activeTab === 'upi' ? 'INR' : 'USDT')})
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">1 {formData.currency || (activeTab === 'upi' ? 'INR' : 'USDT')} =</span>
                    <input
                      type="text"
                      name="conversionRate"
                      value={formData.conversionRate}
                      onChange={(e) => {
                        // Allow any numeric input including decimals
                        if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                          handleChange({
                            target: {
                              name: 'conversionRate',
                              value: e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            }
                          });
                        }
                      }}
                      placeholder="1.0"
                      className="w-full p-2 border rounded"
                      required
                    />
                    <span className="ml-2"></span>
                  </div>
                  <small className="text-xs text-gray-500">How many game coins () users get per one unit of this currency</small>
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={getPlaceholder('description')}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mb-2 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl || ''}
                      onChange={handleChange}
                      placeholder="Enter image URL here (optional)"
                      className="w-full p-2 border rounded"
                    />
                    {formData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, imageUrl: ''})}
                        className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded hover:bg-red-200"
                        title="Clear image URL"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Preview:</p>
                      <div className="w-[250px] h-[250px] border rounded p-4 flex items-center justify-center bg-white">
                        <img 
                          src={formData.imageUrl} 
                          alt="Payment method" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Invalid+Image+URL'}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-2 md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Active</label>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment Methods List */}
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No {activeTab === 'upi' ? 'UPI IDs' : 'crypto wallets'} found. Add one using the button above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'upi' ? 'Payment App' : 'Cryptocurrency'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'upi' ? 'UPI ID' : 'Wallet Address'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentMethods.map((method) => (
                    <tr key={method._id} className={!method.isActive ? 'bg-gray-50' : ''}>
                      {editMode === method._id ? (
                        // Edit mode row
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full p-1 border rounded"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              name="identifier"
                              value={formData.identifier}
                              onChange={handleChange}
                              className="w-full p-1 border rounded"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              name="currency"
                              value={formData.currency}
                              onChange={handleChange}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center space-x-1">
                              <span>1 {formData.currency} =</span>
                              <input
                                type="text"
                                name="conversionRate"
                                value={formData.conversionRate}
                                onChange={(e) => {
                                  // Allow any numeric input including decimals
                                  if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                    handleChange({
                                      target: {
                                        name: 'conversionRate',
                                        value: e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                      }
                                    });
                                  }
                                }}
                                className="w-24 p-1 border rounded"
                              />
                              <span></span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
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
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUpdateSubmit(method._id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Save"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => setEditMode(null)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Cancel"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // View mode row
                        <>
                          <td className="px-4 py-2">{method.name}</td>
                          <td className="px-4 py-2 font-mono text-sm break-all">
                            {method.identifier}
                            {method.description && (
                              <p className="text-gray-500 text-xs mt-1">
                                {method.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2">{method.currency}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center">
                              <span>1 {method.currency} = {method.conversionRate || 1.0} </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                method.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {method.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditClick(method)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleToggleActive(method._id, method.isActive)}
                                className={`${
                                  method.isActive
                                    ? 'text-red-600 hover:text-red-900'
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                title={method.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {method.isActive ? <FaTimes /> : <FaCheck />}
                              </button>
                              <button
                                onClick={() => handleDelete(method._id)}
                                className="text-red-600 hover:text-red-900"
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
      </div>

      {/* Help Information */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3">About Payment Settings</h2>
        
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">UPI Payments</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Add multiple UPI IDs from different payment apps (Google Pay, PhonePe, etc.)</li>
            <li>Users will be able to select from active UPI IDs for payments</li>
            <li>You can temporarily disable a UPI ID without deleting it</li>
            <li>Set the conversion rate to determine how many game coins () users receive per unit of currency</li>
          </ul>
        </div>
        
        <div className="mb-2">
          <h3 className="font-medium text-gray-700 mb-2">Cryptocurrency Payments</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Add wallet addresses for different cryptocurrencies</li>
            <li>Include the currency code (BTC, ETH, USDT, etc.) for each wallet</li>
            <li>Set the conversion rate to determine how many game coins () users receive per unit of currency</li>
            <li>Users will see only active cryptocurrency options for payments</li>
            <li>You can provide additional information (like network) in the description</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
