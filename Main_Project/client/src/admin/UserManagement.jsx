import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaCheck, FaTimes, FaPlus, FaMoneyBillWave, FaKey, FaSearch, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [formType, setFormType] = useState('edit'); // 'edit', 'password', 'balance'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'user', 'admin'

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '',
    mobile: '',
    role: 'user',
    balance: 0,
    isActive: true,
    referralCode: ''
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [balanceData, setBalanceData] = useState({
    amount: '',
    type: 'add',
    reason: ''
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Server error while fetching users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a user
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      countryCode: user.countryCode || '',
      mobile: user.mobile || '',
      role: user.role || 'user',
      balance: user.balance || 0,
      isActive: user.isActive !== undefined ? user.isActive : true,
      referralCode: user.referralCode || ''
    });
    setPasswordData({
      password: '',
      confirmPassword: ''
    });
    setBalanceData({
      amount: '',
      type: 'add',
      reason: ''
    });
  };

  // Handle editing a user
  const handleEditUser = (user) => {
    handleSelectUser(user);
    setFormType('edit');
    setShowUserForm(true);
  };

  // Handle password change form
  const handlePasswordChange = (user) => {
    handleSelectUser(user);
    setFormType('password');
    setShowUserForm(true);
  };

  // Handle balance adjustment form
  const handleBalanceAdjustment = (user) => {
    handleSelectUser(user);
    setFormType('balance');
    setShowUserForm(true);
  };

  // Handle toggling user active status
  const handleToggleActive = async (user) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isActive: !user.isActive
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update users list
        setUsers(users.map(u => {
          if (u._id === user._id) {
            return { ...u, isActive: !u.isActive };
          }
          return u;
        }));
        
        // Update selected user if currently selected
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive });
        }
      } else {
        setError(data.message || 'Failed to update user');
      }
    } catch (err) {
      setError('Server error while updating user');
      console.error(err);
    }
  };

  // Handle form input changes for user edit
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form input changes for password change
  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  // Handle form input changes for balance adjustment
  const handleBalanceFormChange = (e) => {
    const { name, value } = e.target;
    setBalanceData({
      ...balanceData,
      [name]: value
    });
  };

  // Handle user form submission
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      
      let endpoint = `http://localhost:5000/api/admin/users/${selectedUser._id}`;
      let method = 'PUT';
      let body = { ...formData };
      
      if (formType === 'password') {
        // Validate passwords match
        if (passwordData.password !== passwordData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        endpoint = `http://localhost:5000/api/admin/users/${selectedUser._id}/update-password`;
        body = { password: passwordData.password };
      } else if (formType === 'balance') {
        endpoint = `http://localhost:5000/api/admin/users/${selectedUser._id}/adjust-balance`;
        body = { ...balanceData, amount: parseFloat(balanceData.amount) };
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (formType === 'balance') {
          // Re-fetch users to get updated balance
          fetchUsers();
        } else if (formType === 'edit') {
          // Update users list
          setUsers(users.map(u => {
            if (u._id === selectedUser._id) {
              return { ...u, ...formData };
            }
            return u;
          }));
        }
        
        // Close form
        setShowUserForm(false);
        setSelectedUser(null);
      } else {
        setError(data.message || 'Failed to update user');
      }
    } catch (err) {
      setError('Server error while updating user');
      console.error(err);
    }
  };

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    // Filter by search term
    const searchMatch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile?.includes(searchTerm) ||
      user.referralCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by active status
    const activeMatch = 
      filterActive === 'all' || 
      (filterActive === 'active' && user.isActive) || 
      (filterActive === 'inactive' && !user.isActive);
    
    // Filter by role
    const roleMatch = 
      filterRole === 'all' || 
      user.role === filterRole;
    
    return searchMatch && activeMatch && roleMatch;
  });

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render form based on type
  const renderForm = () => {
    if (formType === 'edit') {
      return (
        <form onSubmit={handleUserFormSubmit} className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Edit User</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="countryCode">
                Country Code
              </label>
              <input
                type="text"
                id="countryCode"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mobile">
                Mobile Number
              </label>
              <input
                type="text"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="referralCode">
                Referral Code
              </label>
              <input
                type="text"
                id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleFormChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label className="ml-2 block text-gray-700 text-sm font-bold" htmlFor="isActive">
                Active User
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowUserForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Save Changes
            </button>
          </div>
        </form>
      );
    } else if (formType === 'password') {
      return (
        <form onSubmit={handleUserFormSubmit} className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Change Password for {selectedUser?.name}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                New Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordFormChange}
                className="w-full p-2 border rounded"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordFormChange}
                className="w-full p-2 border rounded"
                required
                minLength={6}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowUserForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Update Password
            </button>
          </div>
        </form>
      );
    } else if (formType === 'balance') {
      return (
        <form onSubmit={handleUserFormSubmit} className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Adjust Balance for {selectedUser?.name}</h3>
          <p className="mb-4">Current Balance: 🪙 {selectedUser?.balance.toFixed(2)}</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
                Operation
              </label>
              <select
                id="type"
                name="type"
                value={balanceData.type}
                onChange={handleBalanceFormChange}
                className="w-full p-2 border rounded"
              >
                <option value="add">Add Funds</option>
                <option value="deduct">Deduct Funds</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={balanceData.amount}
                onChange={handleBalanceFormChange}
                className="w-full p-2 border rounded"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reason">
                Reason (Optional)
              </label>
              <input
                type="text"
                id="reason"
                name="reason"
                value={balanceData.reason}
                onChange={handleBalanceFormChange}
                className="w-full p-2 border rounded"
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowUserForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              {balanceData.type === 'add' ? 'Add Funds' : 'Deduct Funds'}
            </button>
          </div>
        </form>
      );
    }
    
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
          <button 
            onClick={() => setError('')} 
            className="ml-2 text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, mobile, or referral code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 p-2 w-full border rounded-md"
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl w-full max-h-screen overflow-y-auto">
            {renderForm()}
          </div>
        </div>
      )}
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Users ({filteredUsers.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      {user.referralCode && (
                        <div className="text-xs text-gray-500">Ref: {user.referralCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.countryCode} {user.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      🪙 {user.balance ? user.balance.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit User"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handlePasswordChange(user)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Change Password"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => handleBalanceAdjustment(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Adjust Balance"
                        >
                          <FaMoneyBillWave />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? <FaToggleOff /> : <FaToggleOn />}
                        </button>
                      </div>
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

export default UserManagement;
