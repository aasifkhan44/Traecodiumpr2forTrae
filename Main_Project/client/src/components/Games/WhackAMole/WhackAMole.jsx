import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function WhackAMole({ gameData }) {
  const GRID_SIZE = 3;
  const TOTAL_HOLES = GRID_SIZE * GRID_SIZE;
  const GAME_DURATION = 30000; // 30 seconds

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    holes: Array(TOTAL_HOLES).fill(false),
    lastHole: -1,
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

  const getRandomHole = useCallback(() => {
    let hole;
    do {
      hole = Math.floor(Math.random() * TOTAL_HOLES);
    } while (hole === gameState.lastHole);
    return hole;
  }, [gameState.lastHole]);

  const showMole = useCallback(() => {
    if (!gameState.isStarted || gameState.gameOver) return;

    const hole = getRandomHole();
    const newHoles = Array(TOTAL_HOLES).fill(false);
    newHoles[hole] = true;

    setGameState(prevState => ({
      ...prevState,
      holes: newHoles,
      lastHole: hole
    }));

    // Hide mole after random time
    setTimeout(() => {
      if (gameState.isStarted && !gameState.gameOver) {
        setGameState(prevState => ({
          ...prevState,
          holes: Array(TOTAL_HOLES).fill(false)
        }));
      }
    }, Math.random() * 500 + 500);
  }, [gameState.isStarted, gameState.gameOver, getRandomHole]);

  useEffect(() => {
    let gameTimer;
    let moleTimer;

    if (gameState.isStarted && !gameState.gameOver) {
      // Game timer
      gameTimer = setInterval(() => {
        setGameState(prevState => {
          const newTimeLeft = prevState.timeLeft - 100;
          if (newTimeLeft <= 0) {
            clearInterval(gameTimer);
            clearInterval(moleTimer);
            return { ...prevState, timeLeft: 0, gameOver: true };
          }
          return { ...prevState, timeLeft: newTimeLeft };
        });
      }, 100);

      // Mole appearance timer
      moleTimer = setInterval(showMole, 1000);
    }

    return () => {
      clearInterval(gameTimer);
      clearInterval(moleTimer);
    };
  }, [gameState.isStarted, gameState.gameOver, showMole]);

  const handleWhack = (index) => {
    if (!gameState.isStarted || gameState.gameOver || !gameState.holes[index]) return;

    setGameState(prevState => ({
      ...prevState,
      score: prevState.score + 10,
      holes: prevState.holes.map((hole, i) => i === index ? false : hole)
    }));
  };

  const startGame = () => {
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      score: 0,
      timeLeft: GAME_DURATION,
      holes: Array(TOTAL_HOLES).fill(false),
      lastHole: -1
    });
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="whack-a-mole-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Time Left: {Math.ceil(gameState.timeLeft / 1000)}s</p>
      </div>

      {!gameState.isStarted || gameState.gameOver ? (
        <div className="text-center">
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={startGame}
          >
            {gameState.gameOver ? 'Play Again' : 'Start Game'}
          </button>
          {gameState.gameOver && (
            <p className="mt-4 text-xl font-bold">Game Over! Final Score: {gameState.score}</p>
          )}
        </div>
      ) : (
        <div 
          className="game-board grid gap-4 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: GRID_SIZE * 100 + 'px'
          }}
        >
          {gameState.holes.map((isMoleVisible, index) => (
            <div
              key={index}
              onClick={() => handleWhack(index)}
              className={`
                hole relative w-24 h-24 rounded-full
                bg-gradient-to-b from-brown-600 to-brown-800
                cursor-pointer overflow-hidden
                transition-transform duration-100
                ${isMoleVisible ? 'active' : ''}
              `}
            >
              <div
                className={`
                  mole absolute bottom-0 left-0 right-0
                  h-3/4 bg-brown-400 rounded-t-full
                  transform transition-transform duration-100
                  ${isMoleVisible ? 'translate-y-0' : 'translate-y-full'}
                `}
              >
                <div className="eyes flex justify-center pt-2 space-x-4">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
                <div className="nose w-3 h-3 bg-pink-300 rounded-full mx-auto mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="game-footer mt-4 text-center">
        <p>Game Status: {gameData.status}</p>
        <p>Start Time: {new Date(gameData.startTime).toLocaleString()}</p>
      </div>

      <style jsx>{`
        .hole {
          box-shadow: inset 0 10px 20px rgba(0,0,0,0.4);
        }
        .hole.active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

WhackAMole.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};