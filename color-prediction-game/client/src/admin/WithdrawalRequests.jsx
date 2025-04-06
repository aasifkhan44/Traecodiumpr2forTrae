import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaSpinner, FaEye } from 'react-icons/fa';
import { format } from 'date-fns';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';

const WithdrawalRequests = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    adminComment: '',
    rejectionReason: '',
    transactionId: ''
  });

  // Fetch withdrawal requests on component mount and when status filter changes
  useEffect(() => {
    fetchWithdrawalRequests();
  }, [statusFilter]);

  // Fetch withdrawal requests from API
  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/withdrawal-requests?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setWithdrawalRequests(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching withdrawal requests:', err);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  // Handle view request details
  const handleViewRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/withdrawal-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setSelectedRequest(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching withdrawal request details:', err);
      toast.error('Failed to load withdrawal request details');
    }
  };

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/withdrawal-requests/${selectedRequest._id}`,
        {
          status: 'approved',
          adminComment: formData.adminComment,
          transactionId: formData.transactionId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        toast.success('Withdrawal request approved successfully');
        setSelectedRequest(null);
        fetchWithdrawalRequests();
        setFormData({
          status: '',
          adminComment: '',
          rejectionReason: '',
          transactionId: ''
        });
      }
    } catch (err) {
      console.error('Error approving withdrawal request:', err);
      toast.error(err.response?.data?.message || 'Failed to approve withdrawal request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest || !formData.rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/withdrawal-requests/${selectedRequest._id}`,
        {
          status: 'rejected',
          adminComment: formData.adminComment,
          rejectionReason: formData.rejectionReason
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        toast.success('Withdrawal request rejected successfully');
        setSelectedRequest(null);
        fetchWithdrawalRequests();
        setFormData({
          status: '',
          adminComment: '',
          rejectionReason: '',
          transactionId: ''
        });
      }
    } catch (err) {
      console.error('Error rejecting withdrawal request:', err);
      toast.error(err.response?.data?.message || 'Failed to reject withdrawal request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle mark as processing
  const handleMarkAsProcessing = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/withdrawal-requests/${selectedRequest._id}`,
        {
          status: 'processing',
          adminComment: formData.adminComment
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        toast.success('Withdrawal request marked as processing');
        setSelectedRequest(null);
        fetchWithdrawalRequests();
        setFormData({
          status: '',
          adminComment: '',
          rejectionReason: '',
          transactionId: ''
        });
      }
    } catch (err) {
      console.error('Error updating withdrawal request:', err);
      toast.error(err.response?.data?.message || 'Failed to update withdrawal request');
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <button
            onClick={fetchWithdrawalRequests}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-4xl mx-auto text-blue-500" />
          <p className="mt-2">Loading withdrawal requests...</p>
        </div>
      ) : withdrawalRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No {statusFilter ? statusFilter : 'matching'} withdrawal requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawalRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.user?.name || 'Unknown'}
                      <div className="text-xs text-gray-500">
                        {request.user?.mobile ? `+${request.user.countryCode || '91'} ${request.user.mobile}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{request.amount}</div>
                      <div className="text-xs text-gray-500">
                        Fee: {request.withdrawalFee || 0} | Final: {request.finalAmount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium capitalize">{request.withdrawalMode}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {request.withdrawalMode === 'upi' ? request.upiId : request.cryptoAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewRequest(request._id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Withdrawal Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium">{selectedRequest.user?.name || 'Unknown'}</p>
                  <p className="text-sm">
                    {selectedRequest.user?.mobile ? `+${selectedRequest.user.countryCode || '91'} ${selectedRequest.user.mobile}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Request Date</p>
                  <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">{selectedRequest.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Withdrawal Fee</p>
                  <p className="font-medium">{selectedRequest.withdrawalFee || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Amount</p>
                  <p className="font-medium">{selectedRequest.finalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium capitalize">{selectedRequest.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Withdrawal Method</p>
                  <p className="font-medium capitalize">{selectedRequest.withdrawalMode}</p>
                </div>
                {selectedRequest.withdrawalMode === 'upi' ? (
                  <div>
                    <p className="text-sm text-gray-500">UPI ID</p>
                    <p className="font-medium">{selectedRequest.upiId}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Crypto Currency</p>
                      <p className="font-medium">{selectedRequest.cryptoCurrency}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm text-gray-500">Crypto Address</p>
                      <p className="font-medium break-all">{selectedRequest.cryptoAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Converted Amount</p>
                      <p className="font-medium">{selectedRequest.convertedAmount}</p>
                    </div>
                  </>
                )}
                {selectedRequest.transactionId && (
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-medium">{selectedRequest.transactionId}</p>
                  </div>
                )}
              </div>

              {selectedRequest.adminComment && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Admin Comment</p>
                  <p className="p-2 bg-gray-50 rounded">{selectedRequest.adminComment}</p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Rejection Reason</p>
                  <p className="p-2 bg-red-50 text-red-700 rounded">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Action Form - Only show for pending or processing requests */}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'processing') && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Update Request Status</h3>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Comment
                    </label>
                    <textarea
                      name="adminComment"
                      value={formData.adminComment}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      placeholder="Optional comment"
                    />
                  </div>

                  {selectedRequest.status === 'pending' && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mark as Processing
                      </label>
                      <button
                        onClick={handleMarkAsProcessing}
                        disabled={actionLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                      >
                        {actionLoading ? <FaSpinner className="animate-spin mr-2" /> : null}
                        Mark as Processing
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approve Request
                      </label>
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Transaction ID (optional)
                        </label>
                        <input
                          type="text"
                          name="transactionId"
                          value={formData.transactionId}
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                          placeholder="Transaction reference"
                        />
                      </div>
                      <button
                        onClick={handleApproveRequest}
                        disabled={actionLoading}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                      >
                        {actionLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                        Approve
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reject Request
                      </label>
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Rejection Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="rejectionReason"
                          value={formData.rejectionReason}
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                          placeholder="Reason for rejection"
                          required
                        />
                      </div>
                      <button
                        onClick={handleRejectRequest}
                        disabled={actionLoading || !formData.rejectionReason}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                      >
                        {actionLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaTimes className="mr-2" />}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalRequests;