import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import { toast } from 'react-toastify';
import { FaSave, FaCoins, FaExchangeAlt, FaGlobe } from 'react-icons/fa';

const CurrencySettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    symbol: '🪙',
    name: 'Game Coin',
    conversionRate: 1.0,
    baseCurrency: 'USD'
  });
  
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
  ];

  useEffect(() => {
    fetchCurrencySettings();
  }, []);

  const fetchCurrencySettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/currency-settings');
      
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching currency settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load currency settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!settings.name || !settings.conversionRate || !settings.baseCurrency) {
      toast.error('All fields are required');
      return;
    }
    
    if (settings.conversionRate <= 0) {
      toast.error('Conversion rate must be greater than zero');
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.post('/admin/currency-settings', settings);
      
      if (res.data.success) {
        toast.success('Currency settings updated successfully');
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error saving currency settings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save currency settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSymbol = () => {
    const curr = currencies.find(c => c.code === settings.baseCurrency);
    return curr ? curr.symbol : '$';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <FaCoins className="mr-2" /> Currency Settings
        </h1>
        <p className="text-gray-600">Configure game coin conversion rates and settings</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Game Coin Symbol</label>
              <div className="flex items-center">
                <div className="text-4xl mr-4">{settings.symbol}</div>
                <p className="text-gray-500">Default emoji: 🪙</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Game Coin Name</label>
              <input
                type="text"
                name="name"
                value={settings.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Game Coin"
                required
              />
              <p className="text-sm text-gray-500 mt-1">The name displayed to users</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Base Currency</label>
              <select
                name="baseCurrency"
                value={settings.baseCurrency}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">Real-world currency for conversion</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Conversion Rate</label>
              <div className="flex items-center">
                <span className="mr-2">1 {getCurrentSymbol()} =</span>
                <input
                  type="number"
                  name="conversionRate"
                  value={settings.conversionRate}
                  onChange={handleChange}
                  step="0.01"
                  min="0.000001"
                  className="w-32 p-2 border rounded"
                  required
                />
                <span className="ml-2">{settings.symbol}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">How many game coins per one unit of real currency</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold flex items-center mb-3">
              <FaExchangeAlt className="mr-2" /> Conversion Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-3 rounded bg-white">
                <p className="text-sm text-gray-600">Converting from {settings.baseCurrency} to Game Coins:</p>
                <div className="flex items-center mt-2">
                  <div className="font-bold">{getCurrentSymbol()} 10.00</div>
                  <div className="mx-2">→</div>
                  <div className="font-bold">{settings.symbol} {(10 * settings.conversionRate).toFixed(2)}</div>
                </div>
              </div>
              <div className="border p-3 rounded bg-white">
                <p className="text-sm text-gray-600">Converting from Game Coins to {settings.baseCurrency}:</p>
                <div className="flex items-center mt-2">
                  <div className="font-bold">{settings.symbol} 100.00</div>
                  <div className="mx-2">→</div>
                  <div className="font-bold">{getCurrentSymbol()} {(100 / settings.conversionRate).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark flex items-center"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurrencySettings;
