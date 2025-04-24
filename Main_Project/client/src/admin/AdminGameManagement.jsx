import { useState, useEffect, useCallback, memo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { WS_URL } from '../utils/ws';

const AdminGameManagement = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState(null);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const wsRef = useRef(null);

  // This key avoids re-renders of the components
  const [stableKey] = useState(() => Date.now());

  useEffect(() => {
    fetchGames();
  }, []);

  // Setup WebSocket connection for live updates
  useEffect(() => {
    if (wsRef.current) {
      setupWebSocket();
    }
    
    return () => {
      // Clean up WebSocket connection on component unmount or when game changes
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Function to set up WebSocket connection
  const setupWebSocket = async () => {
    try {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      
      setWsStatus('connecting');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication token not found. Please log in again.');
        setWsStatus('error');
        return;
      }
      
      wsRef.current = new window.WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('Admin WebSocket connection established');
        setWsStatus('connected');
        setError(null);
        
        // Send authentication message immediately after connection
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending admin authentication token...');
            // Make sure token is properly formatted with Bearer prefix
            const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            wsRef.current.send(JSON.stringify({
              type: 'admin-auth',
              token: formattedToken,
              timestamp: new Date().toISOString()
            }));
          }
        }, 500); // Small delay to ensure connection is ready
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Admin received WebSocket message:', data);
          
          if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
            setError(data.message);
            setWsStatus('error');
            
            // Special handling for auth errors - might need to refresh token
            if (data.code === 'AUTH_NOT_ADMIN' || data.code === 'AUTH_INVALID_TOKEN') {
              toast.error('Authentication issue. Try refreshing your session.', {
                position: "top-right",
                autoClose: 5000
              });
            }
            return;
          }
          
          if (data.type === 'admin-auth-success') {
            console.log('Admin authentication successful');
            toast.success('Admin WebSocket connection authenticated');
            setError(null);
            setWsStatus('connected');
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Live updates may not be available.');
        setWsStatus('error');
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        wsRef.current = null;
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError('Failed to establish live connection. Using polling instead.');
      setWsStatus('error');
    }
  };

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
            [field]: 'URL must be a valid HTTPS URL ending with .svg or .png' 
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
      // Check for validation errors
      if (Object.keys(errors).length > 0) {
        toast.error('Please fix the validation errors before submitting');
        return;
      }

      // Only send fields that have changed
      const updates = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== game[key]) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (Object.keys(updates).length === 0) {
        toast.info('No changes detected');
        setEditingGame(null);
        return;
      }

      handleGameUpdate(game.identifier, updates);
    };

    const isEditing = editingGame === game.identifier;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{game.name}</h3>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              game.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {game.isActive ? 'Active' : 'Inactive'}
            </span>
            {game.isDefault && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Default
              </span>
            )}
          </div>
        </div>

        <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden mb-4">
          {(!isEditing && game.thumbnailUrl) ? (
            <img
              src={game.thumbnailUrl}
              alt={game.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/640x360?text=No+Image';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {!isEditing ? 'No thumbnail' : (
                <div className="w-full p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${errors.thumbnailUrl ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.thumbnailUrl}
                    onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                  {errors.thumbnailUrl && (
                    <p className="mt-1 text-xs text-red-500">{errors.thumbnailUrl}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Image URL</label>
              <input
                type="text"
                className={`w-full p-2 border rounded ${errors.cardImageUrl ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.cardImageUrl}
                onChange={(e) => handleInputChange('cardImageUrl', e.target.value)}
                placeholder="https://example.com/card.png"
              />
              {errors.cardImageUrl && (
                <p className="mt-1 text-xs text-red-500">{errors.cardImageUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Game description"
              />
            </div>

            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`active-${game.identifier}`}
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`active-${game.identifier}`} className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`default-${game.identifier}`}
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`default-${game.identifier}`} className="ml-2 text-sm text-gray-700">
                  Default
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingGame(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="mt-1 text-sm text-gray-500">{formData.description || 'No description available'}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingGame(game.identifier)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit
              </button>
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
    <div className="container mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Game Management</h1>
      </div>

      {/* Error notification and recovery */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {(error.includes('Authentication') || error.includes('Unauthorized') || error.includes('token')) && (
            <button 
              onClick={() => {
                // Clear token and redirect to login
                localStorage.removeItem('token');
                window.location.href = '/admin/login';
              }}
              className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
            >
              Refresh Session
            </button>
          )}
        </div>
      )}
      
      {/* WebSocket Status */}
      <div className="flex items-center mb-4">
        <div className="mr-2">
          WebSocket: 
          <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
            wsStatus === 'connected' ? 'bg-green-100 text-green-800' :
            wsStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            wsStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {wsStatus === 'connected' ? 'Connected' : 
             wsStatus === 'connecting' ? 'Connecting...' : 
             wsStatus === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Game Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map(game => (
            <GameCard key={game.identifier} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminGameManagement;