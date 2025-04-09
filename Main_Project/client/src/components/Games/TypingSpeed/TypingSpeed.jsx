import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function TypingSpeed({ gameData }) {
  const SAMPLE_TEXTS = [
    'The quick brown fox jumps over the lazy dog.',
    'Programming is the art of telling another human what one wants the computer to do.',
    'The best way to predict the future is to invent it.',
    'Simplicity is the ultimate sophistication.',
    'In order to be irreplaceable, one must always be different.'
  ];

  const GAME_DURATION = 60; // 60 seconds

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    currentText: '',
    userInput: '',
    wordsTyped: 0,
    accuracy: 100,
    wpm: 0,
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

  const calculateStats = useCallback(() => {
    const words = gameState.userInput.trim().split(/\s+/).length;
    const characters = gameState.userInput.length;
    const correctCharacters = [...gameState.userInput].filter(
      (char, index) => char === gameState.currentText[index]
    ).length;
    const accuracy = characters === 0 ? 100 : (correctCharacters / characters) * 100;
    const timeElapsed = GAME_DURATION - gameState.timeLeft;
    const wpm = timeElapsed === 0 ? 0 : Math.round((words / timeElapsed) * 60);

    return { words, accuracy, wpm };
  }, [gameState.userInput, gameState.currentText, gameState.timeLeft]);

  useEffect(() => {
    let timer;
    if (gameState.isStarted && !gameState.gameOver) {
      timer = setInterval(() => {
        setGameState(prevState => {
          if (prevState.timeLeft <= 1) {
            clearInterval(timer);
            const finalStats = calculateStats();
            return {
              ...prevState,
              timeLeft: 0,
              gameOver: true,
              wordsTyped: finalStats.words,
              accuracy: Math.round(finalStats.accuracy),
              wpm: finalStats.wpm,
              score: Math.round(finalStats.wpm * (finalStats.accuracy / 100))
            };
          }
          const stats = calculateStats();
          return {
            ...prevState,
            timeLeft: prevState.timeLeft - 1,
            wordsTyped: stats.words,
            accuracy: Math.round(stats.accuracy),
            wpm: stats.wpm
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isStarted, gameState.gameOver, calculateStats]);

  const startGame = () => {
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      currentText: randomText,
      userInput: '',
      timeLeft: GAME_DURATION,
      wordsTyped: 0,
      accuracy: 100,
      wpm: 0,
      score: 0
    });
  };

  const handleInputChange = (e) => {
    if (gameState.isStarted && !gameState.gameOver) {
      setGameState(prevState => ({
        ...prevState,
        userInput: e.target.value
      }));
    }
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="typing-speed-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <div className="stats grid grid-cols-4 gap-4 mt-4">
          <div className="stat-box bg-blue-100 p-2 rounded">
            <p className="text-lg font-bold">{gameState.wpm}</p>
            <p className="text-sm">WPM</p>
          </div>
          <div className="stat-box bg-green-100 p-2 rounded">
            <p className="text-lg font-bold">{gameState.accuracy}%</p>
            <p className="text-sm">Accuracy</p>
          </div>
          <div className="stat-box bg-yellow-100 p-2 rounded">
            <p className="text-lg font-bold">{gameState.wordsTyped}</p>
            <p className="text-sm">Words</p>
          </div>
          <div className="stat-box bg-red-100 p-2 rounded">
            <p className="text-lg font-bold">{gameState.timeLeft}s</p>
            <p className="text-sm">Time Left</p>
          </div>
        </div>
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
            <div className="mt-4">
              <p className="text-xl font-bold">Game Over!</p>
              <p className="text-lg">Final Score: {gameState.score}</p>
              <p className="text-lg">Words Per Minute: {gameState.wpm}</p>
              <p className="text-lg">Accuracy: {gameState.accuracy}%</p>
              <p className="text-lg">Total Words: {gameState.wordsTyped}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="game-content max-w-2xl mx-auto">
          <div className="text-display mb-6 p-4 bg-gray-100 rounded text-lg">
            {gameState.currentText.split('').map((char, index) => {
              let className = '';
              if (index < gameState.userInput.length) {
                className = gameState.userInput[index] === char
                  ? 'text-green-600'
                  : 'text-red-600';
              }
              return (
                <span key={index} className={className}>
                  {char}
                </span>
              );
            })}
          </div>

          <textarea
            value={gameState.userInput}
            onChange={handleInputChange}
            className="w-full p-4 text-lg border-2 border-gray-300 rounded
              focus:outline-none focus:border-green-500"
            placeholder="Start typing here..."
            rows="3"
            autoFocus
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

TypingSpeed.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};