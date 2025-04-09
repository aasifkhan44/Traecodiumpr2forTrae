import React from 'react';
import PropTypes from 'prop-types';

export default function FiveD({ gameData }) {
  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="game-container p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">Welcome to 5D</h1>
        <p className="text-lg text-gray-600 mb-4">
          Five-digit number prediction game with massive winning potential!
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
          <div className="h-48 w-full md:w-48 bg-gradient-to-r from-green-500 to-teal-500">
            {/* Game icon or animation can be added here */}
          </div>
        </div>
        <div className="p-8">
          <div className="text-sm text-gray-500 mb-1">Game Features</div>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>5-digit number predictions</li>
            <li>Multiple position betting</li>
            <li>High odds and payouts</li>
            <li>Detailed winning history</li>
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

FiveD.propTypes = {
  gameData: PropTypes.shape({
    isActive: PropTypes.bool,
    isDefault: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string
  })
};