import { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import { toast } from 'react-toastify';
import ErrorBoundary from '../components/ErrorBoundary';
import GameImageUpload from '../components/Admin/GameImageUpload';

const AdminGamesContent = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await api.get('/admin/games');
      
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
    setIsUpdating(true);
    try {
      const response = await api.patch(`/admin/games/${identifier}`, updates);

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
      const errorMessage = error.response?.data?.message || 'Failed to update game';
      toast.error(errorMessage.includes('validation') ? 'Invalid image URL format' : errorMessage);
    } finally {
      setIsUpdating(false);
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
              <div className="space-y-2">
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Thumbnail URL</label>
                  <input
                    type="text"
                    value={(editValues[game.identifier]?.thumbnailUrl ?? game.thumbnailUrl) || ''}
                    onChange={(e) => {
                      setEditValues(prev => ({
                        ...prev,
                        [game.identifier]: {
                          ...prev[game.identifier],
                          thumbnailUrl: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      if(/^https:\/\/.+\.(svg|png)$/i.test(editValues[game.identifier]?.thumbnailUrl)) {
                        handleGameUpdate(game.identifier, { thumbnailUrl: editValues[game.identifier]?.thumbnailUrl })
                      } else if(editValues[game.identifier]?.thumbnailUrl !== game.thumbnailUrl) {
                        toast.error('Invalid URL - must use HTTPS and end with .svg/.png');
                        setEditValues(prev => ({
                          ...prev,
                          [game.identifier]: {
                            ...prev[game.identifier],
                            thumbnailUrl: game.thumbnailUrl
                          }
                        }));
                      }
                    }}
                    pattern="^https://.*\.(svg|png)$"
                    title="Must be HTTPS URL ending with .svg or .png"
                    className={`border rounded p-2 ${/^https:\/\/.+\.(svg|png)$/i.test(editValues[game.identifier]?.thumbnailUrl) ? 'border-green-500' : editValues[game.identifier]?.thumbnailUrl ? 'border-red-500' : ''}`}
                    className="border rounded p-2"
                    pattern="^https://.*"
                    title="Must use HTTPS protocol"
                    placeholder="Enter HTTPS image URL"
                    key={game.thumbnailUrl}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Card Image URL</label>
                  <input
                    type="text"
                    value={(editValues[game.identifier]?.cardImageUrl ?? game.cardImageUrl) || ''}
                    onChange={(e) => {
                      setEditValues(prev => ({
                        ...prev,
                        [game.identifier]: {
                          ...prev[game.identifier],
                          cardImageUrl: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      if(/^https:\/\/.+\.(svg|png)$/i.test(editValues[game.identifier]?.cardImageUrl)) {
                        handleGameUpdate(game.identifier, { cardImageUrl: editValues[game.identifier]?.cardImageUrl })
                      } else if(editValues[game.identifier]?.cardImageUrl !== game.cardImageUrl) {
                        toast.error('Invalid URL - must use HTTPS and end with .svg/.png');
                        setEditValues(prev => ({
                          ...prev,
                          [game.identifier]: {
                            ...prev[game.identifier],
                            cardImageUrl: game.cardImageUrl
                          }
                        }));
                      }
                    }}
                    pattern="^https://.*\.(svg|png)$"
                    title="Must be HTTPS URL ending with .svg or .png"
                    className={`border rounded p-2 ${/^https:\/\/.+\.(svg|png)$/i.test(editValues[game.identifier]?.cardImageUrl) ? 'border-green-500' : editValues[game.identifier]?.cardImageUrl ? 'border-red-500' : ''}`}
                    className="border rounded p-2"
                    pattern="^https://.*"
                    title="Must use HTTPS protocol"
                    placeholder="Enter HTTPS image URL"
                    key={game.cardImageUrl}
                  />
                </div>
              </div>
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