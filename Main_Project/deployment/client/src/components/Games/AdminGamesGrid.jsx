import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastNotification';

export default function AdminGamesGrid() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/admin/games');
        if (response.data.success) {
          setGames(response.data.data);
        }
      } catch (err) {
        setError('Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    if (user?.isAdmin) fetchGames();
  }, [user]);

  const handleEdit = (game) => {
    setEditingId(game._id);
    setFormData({
      thumbnailUrl: game.thumbnailUrl || '',
      cardImageUrl: game.cardImageUrl || '',
      isActive: game.isActive,
      isDefault: game.isDefault,
      description: game.description
    });
  };

  const handleSubmit = async (gameId) => {
    try {
      // Clean empty URL fields before submission
      const submissionData = {
        ...formData,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        cardImageUrl: formData.cardImageUrl || undefined
      };

      const game = games.find(g => g._id === gameId);
      if (!game) {
        showToast('Game not found', 'error');
        return;
      }
      const response = await api.patch(`/api/admin/games/${encodeURIComponent(game.identifier)}`, submissionData);
      if (response.data.success) {
        setGames(games.map(g => g.identifier === game.identifier ? response.data.data : g));
        setEditingId(null);
        showToast('Game settings updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Update error:', err.response?.data);
      const errorMessage = err.response?.data?.message || 
        'Update failed: ' + (err.response?.status === 400 
          ? 'Invalid image URLs' 
          : 'Server error');
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Game Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <div key={game._id} className="bg-white rounded-lg shadow-md p-4">
            {editingId === game._id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})}
                    className="w-full p-2 border rounded"
                    pattern="https?://.*\.(svg|png)"
                  />
                  {formData.thumbnailUrl && !/^https?:\/\/.+\.(svg|png)$/i.test(formData.thumbnailUrl) &&
                    <p className="text-red-500 text-sm mt-1">Must be valid SVG/PNG URL</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Card Image URL</label>
                  <input
                    type="url"
                    value={formData.cardImageUrl}
                    onChange={(e) => setFormData({...formData, cardImageUrl: e.target.value})}
                    className="w-full p-2 border rounded"
                    pattern="https?://.*\.(svg|png)"
                  />
                  {formData.cardImageUrl && !/^https?:\/\/.+\.(svg|png)$/i.test(formData.cardImageUrl) &&
                    <p className="text-red-500 text-sm mt-1">Must be valid SVG/PNG URL</p>}
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    Active
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                      className="mr-2"
                    />
                    Default
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(game._id)}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative pb-[75%] bg-gray-200 mb-4">
                  {game.thumbnailUrl ? (
                    <img
                      src={game.thumbnailUrl}
                      alt={game.name}
                      className="absolute h-full w-full object-cover"
                      onError={(e) => e.target.src = 'https://via.placeholder.com/300x225?text=Game'}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400">{game.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">{game.name}</h3>
                  <p className="text-gray-600 text-sm">{game.description}</p>
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm ${game.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {game.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {game.isDefault && 
                      <span className="text-sm bg-primary text-white px-2 py-1 rounded">Default</span>}
                  </div>
                </div>
                
                <button
                  onClick={() => handleEdit(game)}
                  className="mt-4 w-full py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Edit Settings
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}