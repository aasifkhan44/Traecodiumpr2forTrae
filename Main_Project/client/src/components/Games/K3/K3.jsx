import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/api';

export default function K3() {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await api.get('/games/active');
        if (response.data.success) {
          const k3Game = response.data.data.find(game => game.identifier === 'K3');
          if (k3Game) {
            setGameData(k3Game);
          } else {
            setError('K3 game not found or inactive');
          }
        } else {
          setError('Failed to load game data');
        }
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Error loading game data');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Game data not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">Welcome to K3</h1>
        <p className="text-lg text-gray-600 mb-4">
          Fast-paced number betting game with multiple ways to win!
        </p>
        <div className="game-status bg-gray-100 p-4 rounded-lg inline-block">
          <p className="text-md">Game Status: {gameData.isActive ? 'Active' : 'Inactive'}</p>
          {gameData.isDefault && (
            <span className="bg-green-500 text-white px-2 py-1 rounded text-sm ml-2">
              Default Game
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden md:flex">
        <div className="md:flex-shrink-0">
          <div className="h-48 w-full md:w-48 bg-gradient-to-r from-blue-500 to-purple-500">
            {/* Game icon or animation can be added here */}
          </div>
        </div>
        <div className="p-8">
          <div className="text-sm text-gray-500 mb-1">Game Features</div>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Quick 3-minute rounds</li>
            <li>Multiple betting options</li>
            <li>Simple and engaging gameplay</li>
            <li>Live results and statistics</li>
          </ul>
          <div className="mt-6">
            <button 
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              onClick={() => console.log('Start game clicked')}
            >
              Start Playing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

K3.propTypes = {
  gameData: PropTypes.shape({
    isActive: PropTypes.bool,
    isDefault: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string
  })
};