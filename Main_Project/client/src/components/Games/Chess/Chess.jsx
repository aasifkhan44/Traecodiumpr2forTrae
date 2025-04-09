import React from 'react';
import PropTypes from 'prop-types';

export default function Chess({ gameData }) {
  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="game-container p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Chess</h1>
        <p className="text-lg text-gray-600 mb-4">
          Strategic online chess with competitive matchmaking and rewards!
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
          <div className="h-48 w-full md:w-48 bg-gradient-to-r from-gray-700 to-gray-900">
            {/* Game icon or animation can be added here */}
          </div>
        </div>
        <div className="p-8">
          <div className="text-sm text-gray-500 mb-1">Game Features</div>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Real-time online matches</li>
            <li>Skill-based matchmaking</li>
            <li>Tournament support</li>
            <li>Game analysis tools</li>
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

Chess.propTypes = {
  gameData: PropTypes.shape({
    isActive: PropTypes.bool,
    isDefault: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string
  })
};