import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { FaSpinner, FaHistory, FaExclamationTriangle } from 'react-icons/fa';

const PAGE_SIZE = 15;

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchTransactions = async (pageNo = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/user/transactions', { params: { page: pageNo, limit: PAGE_SIZE } });
      setTransactions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page);
    // eslint-disable-next-line
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="ml-2 text-blue-800">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600 flex items-center"><FaHistory className="mr-2" /> Transaction History</h1>
      </div>
      {error ? (
        <div className="flex items-center justify-center">
          <FaExclamationTriangle className="text-red-500 text-2xl mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm bg-white rounded-lg shadow-md overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn._id} className="even:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">{new Date(txn.createdAt).toLocaleString()}</td>
                  <td className={`px-2 py-2 whitespace-nowrap ${txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>{txn.type}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{txn.type === 'debit' ? '-' : '+'}{txn.amount}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{txn.reference}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{txn.description}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{txn.balanceAfter !== undefined && txn.balanceAfter !== null ? Number(txn.balanceAfter).toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-wrap justify-center md:justify-end mt-6 gap-2 w-full">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 rounded border bg-gray-200 hover:bg-gray-300 disabled:opacity-50 min-w-[40px]"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            if (totalPages > 7) {
              if (
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i + 1 - page) <= 1 ||
                (page <= 4 && i < 5) ||
                (page >= totalPages - 3 && i > totalPages - 6)
              ) {
                return (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 rounded border min-w-[40px] mx-0.5 ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    {i + 1}
                  </button>
                );
              }
              if (
                (i === 1 && page > 4) ||
                (i === totalPages - 2 && page < totalPages - 3)
              ) {
                return <span key={i} className="px-2">...</span>;
              }
              return null;
            }
            return (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded border min-w-[40px] mx-0.5 ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border bg-gray-200 hover:bg-gray-300 disabled:opacity-50 min-w-[40px]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Transactions;
