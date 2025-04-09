import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ErrorBoundary from '../components/ErrorBoundary';

const AdminGamesContent = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await axios.get(`${API_BASE_URL}/api/admin/games`, { headers });
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setGames(response.data.data);
      } else {
        setGames([]);
        toast.warning('No games data available');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch games');
      setGames([]);
      setLoading(false);
    }
  };

  const handleGameUpdate = async (identifier, updates) => {
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/admin/games/${identifier}`,
        updates,
        { headers }
      );

      if (response.data && response.data.success) {
        setGames(games.map(game => 
          game.identifier === identifier ? response.data.data : game
        ));
        toast.success('Game updated successfully');
      } else {
        toast.error(response.data?.message || 'Failed to update game');
      }
    } catch (error) {
      console.error('Error updating game:', error);
      toast.error(error.response?.data?.message || 'Failed to update game');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Game Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <div key={game.identifier} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{game.name}</h2>
              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={game.isActive}
                    onChange={() => handleGameUpdate(game.identifier, { isActive: !game.isActive })}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2">Active</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={game.isDefault}
                    onChange={() => handleGameUpdate(game.identifier, { isDefault: !game.isDefault })}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2">Default</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-gray-600">Identifier: {game.identifier}</p>
              <p className="text-gray-600">Description: {game.description || 'No description'}</p>
              <div className="mt-4">
                <button
                  onClick={() => {
                    // Add game settings modal or navigation here
                    toast.info('Game settings feature coming soon');
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Manage Settings
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminGames = () => {
  return (
    <ErrorBoundary>
      <AdminGamesContent />
    </ErrorBoundary>
  );
};

export default AdminGames;