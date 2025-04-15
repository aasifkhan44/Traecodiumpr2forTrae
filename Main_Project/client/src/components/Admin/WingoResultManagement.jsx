import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

export default function WingoResultManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [roundStats, setRoundStats] = useState(null);
  const [selectedResultType, setSelectedResultType] = useState(null);
  const [selectedResultValue, setSelectedResultValue] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const durations = [
    { value: 1, label: '1 Min' },
    { value: 3, label: '3 Min' },
    { value: 5, label: '5 Min' },
    { value: 10, label: '10 Min' }
  ];

  const colors = [
    { value: 'Red', className: 'bg-red-500' },
    { value: 'Violet', className: 'bg-purple-500' },
    { value: 'Green', className: 'bg-green-500' }
  ];

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  useEffect(() => {
    fetchRoundStats();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchRoundStats();
    }, 5000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [selectedDuration]);

  const fetchRoundStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/wingo/admin-round-stats', {
        params: { duration: selectedDuration }
      });
      
      if (response.data.success) {
        setRoundStats(response.data.data);
        
        // Auto-select the suggested result
        if (response.data.data.suggestion) {
          const { type, value } = response.data.data.suggestion;
          setSelectedResultType(type);
          setSelectedResultValue(value);
        }
      } else {
        setError(response.data.message || 'Failed to fetch round statistics');
        setRoundStats(null);
      }
    } catch (error) {
      console.error('Error fetching round statistics:', error);
      setError(error.response?.data?.message || 'Failed to fetch round statistics');
      setRoundStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (duration) => {
    setSelectedDuration(duration);
    setSelectedResultType(null);
    setSelectedResultValue(null);
  };

  const handleResultTypeSelect = (type, value) => {
    setSelectedResultType(type);
    setSelectedResultValue(value);
  };

  const handleSubmitResult = async () => {
    if (!selectedResultType || !selectedResultValue || !roundStats?.round?._id) {
      toast.error('Please select a result type and value');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await api.post('/wingo/control-result', {
        roundId: roundStats.round._id,
        resultType: selectedResultType,
        resultValue: selectedResultValue,
        duration: selectedDuration
      });
      
      if (response.data.success) {
        toast.success('Result submitted successfully!');
        fetchRoundStats();
      } else {
        toast.error(response.data.message || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      toast.error(error.response?.data?.message || 'Failed to submit result');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading && !roundStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !roundStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Wingo Result Management</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Round Duration</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          {durations.map((duration) => (
            <button
              key={duration.value}
              onClick={() => handleDurationChange(duration.value)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                selectedDuration === duration.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {duration.label}
            </button>
          ))}
        </div>
        
        {roundStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Round Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Round Number:</span> {roundStats.round.roundNumber}</p>
                  <p><span className="font-medium">Status:</span> {roundStats.round.status}</p>
                  <p><span className="font-medium">Time Remaining:</span> {formatTime(roundStats.round.timeRemaining)}</p>
                  <p><span className="font-medium">Total Bets:</span> {roundStats.betStats.totalBets}</p>
                  <p><span className="font-medium">Total Amount:</span> {formatCurrency(roundStats.betStats.totalAmount)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Suggested Result</h3>
                {roundStats.suggestion ? (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">Type:</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {roundStats.suggestion.type}
                      </span>
                    </div>
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">Value:</span>
                      {roundStats.suggestion.type === 'color' ? (
                        <span className={`px-3 py-1 inline-flex items-center text-sm leading-4 font-semibold rounded-full ${
                          roundStats.suggestion.value === 'Green' ? 'bg-green-100 text-green-800' :
                          roundStats.suggestion.value === 'Red' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            roundStats.suggestion.value === 'Green' ? 'bg-green-500' :
                            roundStats.suggestion.value === 'Red' ? 'bg-red-500' :
                            'bg-purple-500'
                          }`} />
                          <span className="ml-2">{roundStats.suggestion.value}</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          {roundStats.suggestion.value}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Potential Payout:</span>
                      <span className="text-green-600 font-medium">{formatCurrency(roundStats.suggestion.payout)}</span>
                    </div>
                  </div>
                ) : (
                  <p>No suggestion available</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">Color Bets</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potential Payout</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(roundStats.betStats.colors).map(([color, stats]) => (
                        <tr key={color} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full ${
                                color === 'Green' ? 'bg-green-500' :
                                color === 'Red' ? 'bg-red-500' :
                                'bg-purple-500'
                              }`}></div>
                              <span className="ml-2">{color}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(stats.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(stats.payout)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Number Bets</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potential Payout</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(roundStats.betStats.numbers).map(([number, stats]) => (
                        <tr key={number} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{number}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(stats.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(stats.payout)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Set Round Result</h3>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Select Color</h4>
                <div className="flex gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleResultTypeSelect('color', color.value)}
                      className={`relative px-4 py-2 rounded-md transition-all duration-200 text-white ${color.className} ${
                        selectedResultType === 'color' && selectedResultValue === color.value
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : ''
                      }`}
                    >
                      {color.value}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Select Number</h4>
                <div className="grid grid-cols-5 gap-2">
                  {numbers.map((number) => (
                    <button
                      key={number}
                      onClick={() => handleResultTypeSelect('number', number.toString())}
                      className={`px-4 py-2 rounded-md transition-all duration-200 ${
                        selectedResultType === 'number' && selectedResultValue === number.toString()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitResult}
                  disabled={submitting || !selectedResultType || !selectedResultValue}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    submitting || !selectedResultType || !selectedResultValue
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
