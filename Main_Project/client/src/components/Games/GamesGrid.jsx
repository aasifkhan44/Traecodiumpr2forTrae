import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const GamesGrid = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        // Fetch only active games from the server
        const response = await api.get('/games/active');
        if (response.data.success) {
          setGames(response.data.data);
        } else {
          setError('Failed to fetch games');
        }
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Function to get the path for a game based on its identifier
  const getGamePath = (identifier) => {
    const gameRouteMap = {
      'Wingo': '/games/wingo',
      'K3': '/games/k3',
      '5D': '/games/5d',
      'WingoTrx': '/games/wingo-trx',
      'Ludo': '/games/ludo',
      'Chess': '/games/chess',
      'Numma': '/games/numma',
      'FortuneWheel': '/games/fortune-wheel'
    };
    
    return gameRouteMap[identifier] || '/dashboard';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">No games are currently available.</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Available Games</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <Link 
            key={game._id} 
            to={getGamePath(game.identifier)}
            className={`block bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 ${game.isDefault ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="relative pb-[75%] bg-gray-200">
              {game.thumbnailUrl ? (
                <img 
                  src={game.thumbnailUrl} 
                  alt={game.name} 
                  className="absolute h-full w-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300x225?text=Game';
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <span className="text-3xl font-bold text-gray-400">{game.name.charAt(0)}</span>
                </div>
              )}
              {game.isDefault && (
                <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                  Default
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-bold text-lg mb-1">{game.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{game.description}</p>
              <div className="flex justify-between items-center">
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  Active
                </span>
                <button className="text-primary hover:text-primary-dark font-medium">
                  Play Now
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default GamesGrid;