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
      <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
        <div className="flex justify-center items-center">
          <FaSpinner className="animate-spin text-3xl text-white" />
          <p className="ml-2 text-white">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      <h1 className="text-2xl font-bold text-white drop-shadow mb-6 text-center flex items-center justify-center"><FaHistory className="mr-2" /> Transaction History</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        {error ? (
          <div className="flex items-center justify-center">
            <FaExclamationTriangle className="text-red-500 text-2xl mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-blue-100 shadow-inner bg-blue-50">
            <table className="min-w-full text-xs sm:text-sm md:text-base rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900">
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Date</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Type</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Amount</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Reference</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Description</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id} className="even:bg-blue-50 odd:bg-white hover:bg-blue-100 transition-colors">
                    <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm md:text-base">{new Date(txn.createdAt).toLocaleString()}</td>
                    <td className={`px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap font-bold text-xs sm:text-sm md:text-base ${txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>{txn.type}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm md:text-base">{txn.type === 'debit' ? '-' : '+'}{txn.amount}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm md:text-base">{txn.reference}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm md:text-base">{txn.description}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm md:text-base">{txn.balanceAfter !== undefined && txn.balanceAfter !== null ? Number(txn.balanceAfter).toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-wrap justify-center md:justify-end mt-6 md:mt-8 gap-2 w-full">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold shadow hover:scale-105 transition disabled:opacity-50 min-w-[40px] sm:min-w-[48px]"
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
                      className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-bold min-w-[40px] sm:min-w-[48px] mx-0.5 shadow transition ${page === i + 1 ? 'bg-gradient-to-r from-green-400 to-yellow-400 text-white scale-105' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
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
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-bold min-w-[40px] sm:min-w-[48px] mx-0.5 shadow transition ${page === i + 1 ? 'bg-gradient-to-r from-green-400 to-yellow-400 text-white scale-105' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
                >
                  {i + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold shadow hover:scale-105 transition disabled:opacity-50 min-w-[40px] sm:min-w-[48px]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
