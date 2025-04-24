import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const filterDefaults = {
  type: '',
  user: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
};
const PAGE_SIZE = 20;

function downloadCSV(rows, columns, filename = 'transactions.csv') {
  const csvContent = [
    columns.map(col => col.header).join(','),
    ...rows.map(row => columns.map(col => {
      let val = row[col.key];
      if (val === undefined || val === null) return '';
      if (col.key === 'createdAt') return new Date(val).toLocaleString();
      return String(val).replace(/,/g, ' ');
    }).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(filterDefaults);
  const [page, setPage] = useState(1);

  const fetchTransactions = async (filterParams = {}, pageNo = 1) => {
    try {
      setLoading(true);
      const params = { ...filterParams, page: pageNo, limit: PAGE_SIZE };
      const res = await api.get('/admin/transactions', { params });
      setTransactions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(filters, page);
    // eslint-disable-next-line
  }, [page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions(filters, 1);
  };

  const handleClearFilters = () => {
    setFilters(filterDefaults);
    setPage(1);
    fetchTransactions(filterDefaults, 1);
  };

  const handleExportCSV = () => {
    const columns = [
      { key: 'createdAt', header: 'Date' },
      { key: 'user', header: 'User' },
      { key: 'type', header: 'Type' },
      { key: 'amount', header: 'Amount' },
      { key: 'reference', header: 'Reference' },
      { key: 'description', header: 'Description' },
      { key: 'balanceAfter', header: 'Balance After' }
    ];
    const rows = transactions.map(tx => ({
      ...tx,
      user: tx.user?.name || tx.user || '-',
      balanceAfter: tx.balanceAfter !== undefined && tx.balanceAfter !== null ? Number(tx.balanceAfter).toFixed(2) : ''
    }));
    downloadCSV(rows, columns);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Transaction Management</h1>
      <div className="card mb-8 p-6 rounded-lg shadow bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-gray-700">All Transactions</h2>
          <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full md:w-auto">Export to CSV</button>
        </div>
        {/* Advanced Filters */}
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-gray-600 text-sm mb-1">Type</label>
            <select name="type" value={filters.type} onChange={handleFilterChange} className="border rounded px-3 py-2">
              <option value="">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">User (name or ID)</label>
            <input name="user" value={filters.user} onChange={handleFilterChange} placeholder="User name or ID" className="border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Reference</label>
            <input name="reference" value={filters.reference} onChange={handleFilterChange} placeholder="Reference" className="border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Date From</label>
            <input name="dateFrom" type="date" value={filters.dateFrom} onChange={handleFilterChange} className="border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Date To</label>
            <input name="dateTo" type="date" value={filters.dateTo} onChange={handleFilterChange} className="border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Apply</button>
          <button type="button" onClick={handleClearFilters} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition">Clear</button>
        </form>
        {/* Table */}
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
                  <th className="py-3 px-4 border-b font-semibold text-gray-700">User</th>
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
                    <td className="py-2 px-4 border-b">{tx.user?.name || tx.user || '-'}</td>
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
              // Show first, last, current, and neighbors; ellipsis for gaps
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
                // Ellipsis logic
                if (
                  (i === 1 && page > 4) ||
                  (i === totalPages - 2 && page < totalPages - 3)
                ) {
                  return <span key={i} className="px-2">...</span>;
                }
                return null;
              }
              // For small totalPages, show all
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

export default AdminTransactions;
