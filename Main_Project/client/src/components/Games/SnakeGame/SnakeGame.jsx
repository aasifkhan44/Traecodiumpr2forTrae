import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function SnakeGame({ gameData }) {
  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const INITIAL_SNAKE = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    snake: INITIAL_SNAKE,
    food: { x: 15, y: 15 },
    direction: 'RIGHT',
    speed: 150,
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

  const generateFood = useCallback(() => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (gameState.snake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    ));
    return newFood;
  }, [gameState.snake]);

  const moveSnake = useCallback(() => {
    if (!gameState.isStarted || gameState.gameOver) return;

    const newSnake = [...gameState.snake];
    const head = { ...newSnake[0] };

    switch (gameState.direction) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
      default: break;
    }

    // Check collision with walls
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      return;
    }

    // Check collision with self
    if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      return;
    }

    newSnake.unshift(head);

    // Check if snake ate food
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
      setGameState(prev => ({
        ...prev,
        food: generateFood(),
        score: prev.score + 10,
        speed: Math.max(50, prev.speed - 5)
      }));
    } else {
      newSnake.pop();
    }

    setGameState(prev => ({ ...prev, snake: newSnake }));
  }, [gameState, generateFood]);

  useEffect(() => {
    if (gameState.isStarted && !gameState.gameOver) {
      const gameLoop = setInterval(moveSnake, gameState.speed);
      return () => clearInterval(gameLoop);
    }
  }, [gameState.isStarted, gameState.gameOver, gameState.speed, moveSnake]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameState.isStarted || gameState.gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          if (gameState.direction !== 'DOWN') {
            setGameState(prev => ({ ...prev, direction: 'UP' }));
          }
          break;
        case 'ArrowDown':
          if (gameState.direction !== 'UP') {
            setGameState(prev => ({ ...prev, direction: 'DOWN' }));
          }
          break;
        case 'ArrowLeft':
          if (gameState.direction !== 'RIGHT') {
            setGameState(prev => ({ ...prev, direction: 'LEFT' }));
          }
          break;
        case 'ArrowRight':
          if (gameState.direction !== 'LEFT') {
            setGameState(prev => ({ ...prev, direction: 'RIGHT' }));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.isStarted, gameState.gameOver, gameState.direction]);

  const startGame = () => {
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      snake: INITIAL_SNAKE,
      food: generateFood(),
      direction: 'RIGHT',
      speed: 150,
      score: 0
    });
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="snake-game-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
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
            <p className="mt-4 text-red-500 font-bold">Game Over! Final Score: {gameState.score}</p>
          )}
        </div>
      ) : (
        <div 
          className="game-board relative mx-auto"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            backgroundColor: '#f0f0f0',
            border: '2px solid #333'
          }}
        >
          {/* Render snake */}
          {gameState.snake.map((segment, index) => (
            <div
              key={index}
              className="absolute bg-green-500"
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                border: index === 0 ? '2px solid darkgreen' : 'none'
              }}
            />
          ))}

          {/* Render food */}
          <div
            className="absolute bg-red-500 rounded-full"
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: gameState.food.x * CELL_SIZE,
              top: gameState.food.y * CELL_SIZE
            }}
          />
        </div>
      )}

      <div className="game-footer mt-4 text-center">
        <p>Game Status: {gameData.status}</p>
        <p>Start Time: {new Date(gameData.startTime).toLocaleString()}</p>
      </div>
    </div>
  );
}

SnakeGame.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};