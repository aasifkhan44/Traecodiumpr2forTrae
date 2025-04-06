import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSpinner, 
  FaExclamationTriangle,
  FaExclamationCircle,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaWallet,
  FaMobile
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const DepositRequests = () => {
  const [depositRequests, setDepositRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [userDetails, setUserDetails] = useState({});

  // Fetch deposit requests
  useEffect(() => {
    const fetchDepositRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        const response = await axios.get(`${API_BASE_URL}/api/admin/deposit-requests`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.data) {
          setDepositRequests(response.data.data);
          
          // Fetch user details for each unique user ID
          const userIds = [...new Set(response.data.data.map(request => request.user._id))];
          const userDetailsObj = {};
          
          await Promise.all(userIds.map(async (userId) => {
            try {
              const userResponse = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (userResponse.data.success && userResponse.data.data) {
                userDetailsObj[userId] = userResponse.data.data;
              }
            } catch (error) {
              console.error(`Error fetching user details for ID ${userId}:`, error);
            }
          }));
          
          setUserDetails(userDetailsObj);
        } else {
          setError('Failed to load deposit requests');
        }
      } catch (error) {
        console.error('Error fetching deposit requests:', error);
        setError(error.response?.data?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDepositRequests();
  }, []);
  
  // Handle view request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };
  
  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };
  
  // Process request (approve or reject)
  const handleProcessRequest = async (requestId, status) => {
    try {
      setProcessingAction(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        setProcessingAction(false);
        return;
      }
      
      console.log(`Processing ${status} for request ${requestId}`);
      
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const requestData = { 
        status: status.toString(),
        adminComment: 'Processed by admin'
      };
      
      console.log('Sending request with data:', requestData);
      
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/deposit-requests/${requestId}`, 
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success(`Request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
        
        // Update deposit requests with updated status
        setDepositRequests(prevRequests => 
          prevRequests.map(req => 
            req._id === requestId ? { ...req, status } : req
          )
        );
        
        setShowModal(false);
        setSelectedRequest(null);
      } else {
        toast.error(response.data.message || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing deposit request:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || error.response?.data?.stack || 'Something went wrong');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Filter requests by status
  const filteredRequests = statusFilter === 'all' 
    ? depositRequests 
    : depositRequests.filter(request => request.status === statusFilter);
  
  // Format date
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get status badge style
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Deposit Requests</h1>
      
      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="flex items-center">
            <FaExclamationCircle className="mr-2" />
            {error}
          </p>
        </div>
      )}
      
      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'approved' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
            onClick={() => setStatusFilter('approved')}
          >
            Approved
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
            onClick={() => setStatusFilter('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>
      
      {/* Requests Table */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-primary mr-2" />
          <p>Loading deposit requests...</p>
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <FaUser className="text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{request.user.name}</div>
                        <div className="text-sm text-gray-500">{request.user.mobile}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">🪙 {request.amount}</div>
                    {request.paymentMode === 'crypto' && request.convertedAmount && (
                      <div className="text-xs text-gray-500">
                        ({request.convertedAmount} {request.cryptoCurrency})
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize">{request.paymentMode}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-primary hover:text-primary-dark mr-3"
                      onClick={() => handleViewRequest(request)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <FaExclamationTriangle className="mx-auto text-gray-400 text-2xl mb-2" />
          <p className="text-gray-500">No deposit requests found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
        </div>
      )}
      
      {/* Modal for Request Details */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Deposit Request Details</h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Request Information */}
              <div className="mb-6">
                <h4 className="text-md font-bold mb-2 border-b pb-2">Request Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium">🪙 {selectedRequest.amount}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Payment Mode</p>
                    <p className="font-medium capitalize">{selectedRequest.paymentMode}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Reference Number</p>
                    <p className="font-medium break-all">{selectedRequest.referenceNumber}</p>
                  </div>
                  
                  {selectedRequest.paymentMode === 'upi' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">UPI ID</p>
                        <p className="font-medium">{selectedRequest.upiId || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Payment App</p>
                        <p className="font-medium">{selectedRequest.paymentApp || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 font-bold">Paid</p>
                        <p className="font-bold text-red-600">₹{selectedRequest.amount}</p>
                      </div>
                    </>
                  )}
                  
                  {selectedRequest.paymentMode === 'crypto' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Cryptocurrency</p>
                        <p className="font-medium">{selectedRequest.cryptoCurrency || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 font-bold">Paid</p>
                        <p className="font-bold text-red-600">{selectedRequest.convertedAmount} {selectedRequest.cryptoCurrency}</p>
                      </div>
                      
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Crypto Address</p>
                        <p className="font-medium break-all">{selectedRequest.cryptoAddress || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* User Information */}
              <div className="mb-6">
                <h4 className="text-md font-bold mb-2 border-b pb-2">User Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedRequest.user.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Mobile</p>
                    <p className="font-medium flex items-center">
                      <FaMobile className="mr-1 text-gray-500" />
                      {selectedRequest.user.countryCode} {selectedRequest.user.mobile}
                    </p>
                  </div>
                  
                  {userDetails[selectedRequest.user._id] && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="font-medium">🪙 {userDetails[selectedRequest.user._id].balance || 0}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Member Since</p>
                        <p className="font-medium">
                          {new Date(userDetails[selectedRequest.user._id].createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {selectedRequest.status === 'pending' && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800 flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    Please verify the payment details before approving or rejecting this request.
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary mr-2"
              >
                Close
              </button>
              
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleProcessRequest(selectedRequest._id, 'rejected')}
                    className="btn btn-danger mr-2"
                    disabled={processingAction}
                  >
                    {processingAction ? <FaSpinner className="animate-spin mr-2" /> : <FaTimesCircle className="mr-2" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleProcessRequest(selectedRequest._id, 'approved')}
                    className="btn btn-success"
                    disabled={processingAction}
                  >
                    {processingAction ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositRequests;
