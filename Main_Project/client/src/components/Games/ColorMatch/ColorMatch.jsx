import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function ColorMatch({ gameData }) {
  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const INITIAL_SEQUENCE_LENGTH = 3;
  const SEQUENCE_DELAY = 1000;

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    sequence: [],
    playerSequence: [],
    isShowingSequence: false,
    currentStep: 0,
    level: 1,
    gameOver: false
  });

  useEffect(() => {
    if (gameData) {
      setGameState(prevState => ({
        ...prevState,
        currentRound: gameData.roundId || 0
      }));
    }
  }, [gameData]);

  const generateSequence = useCallback((length) => {
    return Array.from({ length }, () => 
      COLORS[Math.floor(Math.random() * COLORS.length)]
    );
  }, []);

  const showSequence = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      isShowingSequence: true,
      currentStep: 0,
      playerSequence: []
    }));

    const sequenceInterval = setInterval(() => {
      setGameState(prevState => {
        const nextStep = prevState.currentStep + 1;
        if (nextStep > prevState.sequence.length) {
          clearInterval(sequenceInterval);
          return {
            ...prevState,
            isShowingSequence: false,
            currentStep: 0
          };
        }
        return {
          ...prevState,
          currentStep: nextStep
        };
      });
    }, SEQUENCE_DELAY);

    return () => clearInterval(sequenceInterval);
  }, []);

  const startGame = () => {
    const newSequence = generateSequence(INITIAL_SEQUENCE_LENGTH);
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      sequence: newSequence,
      playerSequence: [],
      score: 0,
      level: 1,
      currentStep: 0
    });
    setTimeout(showSequence, 1000);
  };

  const handleColorClick = (color) => {
    if (!gameState.isStarted || gameState.isShowingSequence || gameState.gameOver) return;

    const newPlayerSequence = [...gameState.playerSequence, color];
    const currentIndex = newPlayerSequence.length - 1;

    if (color !== gameState.sequence[currentIndex]) {
      setGameState(prevState => ({
        ...prevState,
        gameOver: true
      }));
      return;
    }

    if (newPlayerSequence.length === gameState.sequence.length) {
      // Player completed the sequence correctly
      const newScore = gameState.score + (gameState.level * 10);
      const newLevel = gameState.level + 1;
      const newSequence = generateSequence(INITIAL_SEQUENCE_LENGTH + newLevel - 1);

      setTimeout(() => {
        setGameState(prevState => ({
          ...prevState,
          sequence: newSequence,
          playerSequence: [],
          score: newScore,
          level: newLevel
        }));
        showSequence();
      }, 500);
    } else {
      setGameState(prevState => ({
        ...prevState,
        playerSequence: newPlayerSequence
      }));
    }
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="color-match-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Level: {gameState.level}</p>
      </div>

      {!gameState.isStarted || gameState.gameOver ? (
        <div className="text-center">
          <button
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            onClick={startGame}
          >
            {gameState.gameOver ? 'Play Again' : 'Start Game'}
          </button>
          {gameState.gameOver && (
            <p className="mt-4 text-xl font-bold">Game Over! Final Score: {gameState.score}</p>
          )}
        </div>
      ) : (
        <div className="game-board">
          <div className="status text-center mb-4">
            {gameState.isShowingSequence ? (
              <p className="text-lg">Watch the sequence...</p>
            ) : (
              <p className="text-lg">Your turn! Repeat the sequence</p>
            )}
          </div>

          <div className="color-grid grid grid-cols-2 gap-4 max-w-md mx-auto">
            {COLORS.map((color, index) => (
              <button
                key={index}
                onClick={() => handleColorClick(color)}
                disabled={gameState.isShowingSequence}
                className={`
                  w-32 h-32 rounded-lg
                  transition-all duration-200
                  ${gameState.isShowingSequence && gameState.sequence[gameState.currentStep - 1] === color
                    ? 'scale-110 brightness-110'
                    : ''}
                  ${color === 'red' ? 'bg-red-500' : ''}
                  ${color === 'blue' ? 'bg-blue-500' : ''}
                  ${color === 'green' ? 'bg-green-500' : ''}
                  ${color === 'yellow' ? 'bg-yellow-500' : ''}
                  hover:scale-105
                  disabled:opacity-50
                `}
              />
            ))}
          </div>

          <div className="sequence-progress mt-6 flex justify-center space-x-2">
            {gameState.sequence.map((_, index) => (
              <div
                key={index}
                className={`
                  w-3 h-3 rounded-full
                  ${index < gameState.playerSequence.length ? 'bg-green-500' : 'bg-gray-300'}
                `}
              />
            ))}
          </div>
        </div>
      )}

      <div className="game-footer mt-4 text-center">
        <p>Game Status: {gameData.status}</p>
        <p>Start Time: {new Date(gameData.startTime).toLocaleString()}</p>
      </div>
    </div>
  );
}

ColorMatch.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};