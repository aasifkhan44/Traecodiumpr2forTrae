import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function ReactionTime({ gameData }) {
  const GAME_DURATION = 30; // 30 seconds
  const MIN_DELAY = 500; // Minimum delay before target appears (ms)
  const MAX_DELAY = 3000; // Maximum delay before target appears (ms)

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    targetVisible: false,
    targetPosition: { x: 50, y: 50 },
    lastClickTime: 0,
    reactions: [],
    waiting: false,
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

  const generateTargetPosition = useCallback(() => {
    return {
      x: Math.random() * 80 + 10, // Keep target within 10-90% of container
      y: Math.random() * 80 + 10
    };
  }, []);

  const showTarget = useCallback(() => {
    const newPosition = generateTargetPosition();
    setGameState(prevState => ({
      ...prevState,
      targetVisible: true,
      targetPosition: newPosition,
      lastClickTime: Date.now()
    }));
  }, [generateTargetPosition]);

  const scheduleNextTarget = useCallback(() => {
    if (!gameState.isStarted || gameState.gameOver) return;

    const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
    setGameState(prevState => ({ ...prevState, waiting: true }));
    
    setTimeout(() => {
      if (gameState.isStarted && !gameState.gameOver) {
        showTarget();
        setGameState(prevState => ({ ...prevState, waiting: false }));
      }
    }, delay);
  }, [gameState.isStarted, gameState.gameOver, showTarget]);

  useEffect(() => {
    let timer;
    if (gameState.isStarted && !gameState.gameOver) {
      timer = setInterval(() => {
        setGameState(prevState => {
          if (prevState.timeLeft <= 1) {
            clearInterval(timer);
            return {
              ...prevState,
              timeLeft: 0,
              gameOver: true,
              targetVisible: false,
              waiting: false
            };
          }
          return { ...prevState, timeLeft: prevState.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isStarted, gameState.gameOver]);

  const handleTargetClick = () => {
    if (!gameState.targetVisible) return;

    const reactionTime = Date.now() - gameState.lastClickTime;
    const newReactions = [...gameState.reactions, reactionTime];
    const averageReaction = newReactions.reduce((a, b) => a + b, 0) / newReactions.length;
    
    // Score calculation: faster reactions = more points
    const points = Math.max(100 - Math.floor(reactionTime / 10), 10);

    setGameState(prevState => ({
      ...prevState,
      targetVisible: false,
      score: prevState.score + points,
      reactions: newReactions
    }));

    scheduleNextTarget();
  };

  const handleMiss = (e) => {
    // Only count as miss if we clicked the game area while target was visible
    if (gameState.targetVisible && e.target.classList.contains('game-area')) {
      setGameState(prevState => ({
        ...prevState,
        score: Math.max(0, prevState.score - 20), // Penalty for missing
        targetVisible: false
      }));
      scheduleNextTarget();
    }
  };

  const startGame = () => {
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      score: 0,
      timeLeft: GAME_DURATION,
      targetVisible: false,
      reactions: [],
      waiting: false
    });
    scheduleNextTarget();
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="reaction-time-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Time Left: {gameState.timeLeft}s</p>
        {gameState.reactions.length > 0 && (
          <p className="text-lg">
            Average Reaction: 
            {Math.round(gameState.reactions.reduce((a, b) => a + b, 0) / gameState.reactions.length)}ms
          </p>
        )}
      </div>

      {!gameState.isStarted || gameState.gameOver ? (
        <div className="text-center">
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={startGame}
          >
            {gameState.gameOver ? 'Play Again' : 'Start Game'}
          </button>
          {gameState.gameOver && (
            <div className="mt-4">
              <p className="text-xl font-bold">Game Over!</p>
              <p className="text-lg">Final Score: {gameState.score}</p>
              <p className="text-lg">
                Best Reaction Time: {Math.min(...gameState.reactions)}ms
              </p>
              <p className="text-lg">
                Average Reaction Time: 
                {Math.round(gameState.reactions.reduce((a, b) => a + b, 0) / gameState.reactions.length)}ms
              </p>
            </div>
          )}
        </div>
      ) : (
        <div 
          className="game-area relative bg-gray-100 mx-auto rounded-lg cursor-pointer"
          style={{ width: '600px', height: '400px' }}
          onClick={handleMiss}
        >
          {gameState.waiting ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xl text-gray-600">Get Ready...</p>
            </div>
          ) : gameState.targetVisible && (
            <button
              className="absolute w-12 h-12 bg-red-500 rounded-full
                transform -translate-x-1/2 -translate-y-1/2
                hover:bg-red-600 focus:outline-none"
              style={{
                left: `${gameState.targetPosition.x}%`,
                top: `${gameState.targetPosition.y}%`
              }}
              onClick={handleTargetClick}
            />
          )}
        </div>
      )}

      <div className="game-instructions mt-4 text-center text-gray-600">
        {gameState.isStarted && !gameState.gameOver && (
          <p>Click the red target as quickly as you can when it appears!</p>
        )}
      </div>

      <div className="game-footer mt-4 text-center">
        <p>Game Status: {gameData.status}</p>
        <p>Start Time: {new Date(gameData.startTime).toLocaleString()}</p>
      </div>
    </div>
  );
}

ReactionTime.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};