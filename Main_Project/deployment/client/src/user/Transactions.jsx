import React, { useEffect, useState } from 'react';
import api from '../utils/api';

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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Transaction History</h1>
      <div className="card mb-8 p-6 rounded-lg shadow bg-white">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">Your Transactions</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && transactions.length === 0 && (
          <p>No transactions found.</p>
        )}
        {!loading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Date</th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Type</th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Amount</th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Reference</th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Description</th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-blue-50 transition">
                    <td className="py-2 px-4 border-b">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className={`py-2 px-4 border-b font-semibold ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>{tx.type}</td>
                    <td className="py-2 px-4 border-b">{tx.type === 'debit' ? '-' : '+'}{tx.amount}</td>
                    <td className="py-2 px-4 border-b">{tx.reference}</td>
                    <td className="py-2 px-4 border-b">{tx.description}</td>
                    <td className="py-2 px-4 border-b">{tx.balanceAfter !== undefined && tx.balanceAfter !== null ? Number(tx.balanceAfter).toFixed(2) : '-'}</td>
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
    </div>
  );
};

export default Transactions;
