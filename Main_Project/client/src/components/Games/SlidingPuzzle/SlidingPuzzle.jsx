import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function SlidingPuzzle({ gameData }) {
  const GRID_SIZE = 4;
  const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    moves: 0,
    tiles: [],
    emptyTile: TOTAL_TILES - 1
  });

  useEffect(() => {
    if (gameData) {
      setGameState(prevState => ({
        ...prevState,
        currentRound: gameData.roundId || 0
      }));
    }
  }, [gameData]);

  const initializePuzzle = () => {
    let tiles = Array.from({ length: TOTAL_TILES - 1 }, (_, i) => i + 1);
    tiles.push(null); // Empty tile

    // Shuffle tiles (ensuring puzzle is solvable)
    do {
      tiles = shuffleTiles([...tiles]);
    } while (!isSolvable(tiles));

    setGameState(prevState => ({
      ...prevState,
      isStarted: true,
      tiles,
      moves: 0,
      score: 0,
      emptyTile: tiles.indexOf(null)
    }));
  };

  const shuffleTiles = (tiles) => {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles;
  };

  const isSolvable = (tiles) => {
    let inversions = 0;
    const tilesWithoutEmpty = tiles.filter(tile => tile !== null);

    for (let i = 0; i < tilesWithoutEmpty.length - 1; i++) {
      for (let j = i + 1; j < tilesWithoutEmpty.length; j++) {
        if (tilesWithoutEmpty[i] > tilesWithoutEmpty[j]) {
          inversions++;
        }
      }
    }

    const emptyTileRow = Math.floor(tiles.indexOf(null) / GRID_SIZE);
    return (GRID_SIZE % 2 === 1) ? (inversions % 2 === 0) : 
           ((emptyTileRow % 2 === 0) === (inversions % 2 === 0));
  };

  const isAdjacent = (index1, index2) => {
    const row1 = Math.floor(index1 / GRID_SIZE);
    const col1 = index1 % GRID_SIZE;
    const row2 = Math.floor(index2 / GRID_SIZE);
    const col2 = index2 % GRID_SIZE;

    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  };

  const handleTileClick = (index) => {
    if (!gameState.isStarted || !isAdjacent(index, gameState.emptyTile)) return;

    const newTiles = [...gameState.tiles];
    [newTiles[index], newTiles[gameState.emptyTile]] = 
    [newTiles[gameState.emptyTile], newTiles[index]];

    const newMoves = gameState.moves + 1;
    const isComplete = newTiles.every((tile, index) => 
      tile === null ? index === TOTAL_TILES - 1 : tile === index + 1
    );

    setGameState(prevState => ({
      ...prevState,
      tiles: newTiles,
      emptyTile: index,
      moves: newMoves,
      score: isComplete ? prevState.score + Math.max(1000 - newMoves * 10, 100) : prevState.score,
      isStarted: !isComplete
    }));
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="sliding-puzzle-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Moves: {gameState.moves}</p>
      </div>

      {!gameState.isStarted ? (
        <div className="text-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={initializePuzzle}
          >
            Start Game
          </button>
        </div>
      ) : (
        <div 
          className="game-board grid gap-1 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: GRID_SIZE * 80 + 'px'
          }}
        >
          {gameState.tiles.map((tile, index) => (
            <div
              key={index}
              onClick={() => handleTileClick(index)}
              className={`
                w-20 h-20 flex items-center justify-center
                text-2xl font-bold rounded cursor-pointer
                transition-all duration-300
                ${tile === null ? 'bg-gray-200' : 'bg-blue-500 text-white hover:bg-blue-600'}
                ${isAdjacent(index, gameState.emptyTile) ? 'hover:scale-105' : ''}
              `}
            >
              {tile}
            </div>
          ))}
        </div>
      )}

      <div className="game-footer mt-4 text-center">
        <p>Game Status: {gameData.status}</p>
        <p>Start Time: {new Date(gameData.startTime).toLocaleString()}</p>
      </div>
    </div>
  );
}

SlidingPuzzle.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};