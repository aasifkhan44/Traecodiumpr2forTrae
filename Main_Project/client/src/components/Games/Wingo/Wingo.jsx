import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api, { API_BASE_URL } from '../../../utils/api';
import WingoPlay from './WingoPlay';

export default function Wingo() {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // First fetch active games to get the Wingo game data
        const response = await api.get(`${API_BASE_URL}/games/active`);
        if (response.data.success) {
          const wingoGame = response.data.data.find(game => game.identifier === 'Wingo');
          if (wingoGame) {
            setGameData(wingoGame);
          } else {
            setError('Wingo game not found or inactive');
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

  if (isPlaying) {
    return <WingoPlay onClose={() => setIsPlaying(false)} />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center px-2 sm:px-4 py-2 sm:py-4">
      <div className="w-full max-w-2xl flex flex-col items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2 text-center">Welcome to Wingo</h1>
        <p className="text-base sm:text-lg text-gray-600 mb-2 text-center">
          Experience the thrill of predicting winning numbers and win big rewards!
        </p>
        <div className="game-status bg-gray-100 p-4 rounded-lg inline-block text-center w-full max-w-xs">
          <p className="text-md">Game Status: {gameData.isActive ? 'Active' : 'Inactive'}</p>
          {gameData.isDefault && (
            <span className="bg-green-500 text-white px-2 py-1 rounded text-sm ml-2">
              Default Game
            </span>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
        <div className="h-40 w-full md:w-48 bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
          {/* Game icon or animation can be added here */}
        </div>
        <div className="p-4 sm:p-8 flex-1">
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Game Features</div>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Predict winning numbers</li>
            <li>Multiple betting options</li>
            <li>Real-time results</li>
            <li>Instant rewards</li>
          </ul>
          <div className="mt-6 flex justify-center md:justify-start">
            <button 
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors w-full max-w-xs md:w-auto"
              onClick={() => setIsPlaying(true)}
              disabled={!gameData.isActive}
            >
              Start Playing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Wingo.propTypes = {
  gameData: PropTypes.shape({
    isActive: PropTypes.bool,
    isDefault: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string
  })
};