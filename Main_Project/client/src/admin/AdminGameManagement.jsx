import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminGameManagement = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState(null);

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
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        setGames(response.data.data);
      } else {
        setGames([]);
        toast.warning('No games data available');
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGameUpdate = async (identifier, updates) => {
    try {
      // Validate image URLs if they are being updated
      if (updates.thumbnailUrl && !/^https:\/\/.+\.(svg|png)$/i.test(updates.thumbnailUrl)) {
        toast.error('Thumbnail URL must be a valid HTTPS URL ending with .svg or .png');
        return;
      }
      if (updates.cardImageUrl && !/^https:\/\/.+\.(svg|png)$/i.test(updates.cardImageUrl)) {
        toast.error('Card Image URL must be a valid HTTPS URL ending with .svg or .png');
        return;
      }

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

      // Clean up empty strings in updates
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== '')
      );

      const response = await axios.patch(
        `${API_BASE_URL}/api/admin/games/${encodeURIComponent(identifier)}`,
        cleanUpdates,
        { headers }
      );

      if (response.data?.success) {
        setGames(prevGames => 
          prevGames.map(game => 
            game.identifier === identifier ? response.data.data : game
          )
        );
        toast.success('Game updated successfully');
        setEditingGame(null);
      } else {
        throw new Error(response.data?.message || 'Failed to update game');
      }
    } catch (error) {
      console.error('Error updating game:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update game';
      toast.error(errorMessage);
    }
  };

  const validateImageUrl = (url) => {
    if (!url) return true; // Empty URLs are allowed
    return /^https:\/\/.+\.(svg|png)$/i.test(url);
  };

  const GameCard = ({ game }) => {
    const [formData, setFormData] = useState({
      thumbnailUrl: game.thumbnailUrl || '',
      cardImageUrl: game.cardImageUrl || '',
      description: game.description || '',
      isActive: game.isActive,
      isDefault: game.isDefault
    });

    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // Validate image URLs
      if (field === 'thumbnailUrl' || field === 'cardImageUrl') {
        if (value && !validateImageUrl(value)) {
          setErrors(prev => ({
            ...prev,
            [field]: 'Must be a valid HTTPS URL ending with .svg or .png'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      }
    };

    const handleSubmit = () => {
      // Validate all fields before submission
      const newErrors = {};
      if (formData.thumbnailUrl && !validateImageUrl(formData.thumbnailUrl)) {
        newErrors.thumbnailUrl = 'Must be a valid HTTPS URL ending with .svg or .png';
      }
      if (formData.cardImageUrl && !validateImageUrl(formData.cardImageUrl)) {
        newErrors.cardImageUrl = 'Must be a valid HTTPS URL ending with .svg or .png';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error('Please fix the errors before saving');
        return;
      }

      handleGameUpdate(game.identifier, formData);
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{game.name}</h3>
          {!editingGame && (
            <button
              onClick={() => setEditingGame(game.identifier)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingGame === game.identifier ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
              <input
                type="url"
                value={formData.thumbnailUrl}
                onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.thumbnailUrl ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="https://example.com/image.svg"
              />
              {errors.thumbnailUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.thumbnailUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Image URL</label>
              <input
                type="url"
                value={formData.cardImageUrl}
                onChange={(e) => handleInputChange('cardImageUrl', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.cardImageUrl ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="https://example.com/image.svg"
              />
              {errors.cardImageUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.cardImageUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="3"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600">Default</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setEditingGame(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              {formData.thumbnailUrl ? (
                <img
                  src={formData.thumbnailUrl}
                  alt={game.name}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    e.target.className = 'object-contain p-4';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No thumbnail
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900">Description</h4>
              <p className="mt-1 text-sm text-gray-500">{formData.description || 'No description available'}</p>
            </div>

            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${formData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
              {formData.isDefault && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Default
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Game Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <GameCard key={game.identifier} game={game} />
        ))}
      </div>
    </div>
  );
};

export default AdminGameManagement;