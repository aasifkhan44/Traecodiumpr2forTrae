import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function WordScramble({ gameData }) {
  const WORDS = [
    'REACT', 'JAVASCRIPT', 'PROGRAMMING', 'DEVELOPER',
    'CODING', 'COMPUTER', 'SOFTWARE', 'WEBSITE',
    'INTERFACE', 'DATABASE', 'NETWORK', 'ALGORITHM'
  ];

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    currentWord: '',
    scrambledWord: '',
    userInput: '',
    wordsCompleted: 0,
    timeLeft: 60, // 60 seconds per game
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

  useEffect(() => {
    let timer;
    if (gameState.isStarted && !gameState.gameOver) {
      timer = setInterval(() => {
        setGameState(prevState => {
          if (prevState.timeLeft <= 1) {
            clearInterval(timer);
            return { ...prevState, timeLeft: 0, gameOver: true };
          }
          return { ...prevState, timeLeft: prevState.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isStarted, gameState.gameOver]);

  const scrambleWord = (word) => {
    const array = word.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  };

  const getNewWord = () => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    let scrambled;
    do {
      scrambled = scrambleWord(word);
    } while (scrambled === word); // Ensure the scrambled word is different
    return { word, scrambled };
  };

  const startGame = () => {
    const { word, scrambled } = getNewWord();
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      score: 0,
      currentWord: word,
      scrambledWord: scrambled,
      userInput: '',
      wordsCompleted: 0,
      timeLeft: 60
    });
  };

  const handleInputChange = (e) => {
    setGameState(prevState => ({
      ...prevState,
      userInput: e.target.value.toUpperCase()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (gameState.userInput === gameState.currentWord) {
      // Correct answer
      const timeBonus = Math.floor(gameState.timeLeft / 2);
      const newScore = gameState.score + 100 + timeBonus;
      const { word, scrambled } = getNewWord();

      setGameState(prevState => ({
        ...prevState,
        score: newScore,
        currentWord: word,
        scrambledWord: scrambled,
        userInput: '',
        wordsCompleted: prevState.wordsCompleted + 1
      }));
    } else {
      // Wrong answer - small penalty
      setGameState(prevState => ({
        ...prevState,
        score: Math.max(0, prevState.score - 10),
        userInput: ''
      }));
    }
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="word-scramble-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Time Left: {gameState.timeLeft}s</p>
        <p className="text-lg">Words Completed: {gameState.wordsCompleted}</p>
      </div>

      {!gameState.isStarted || gameState.gameOver ? (
        <div className="text-center">
          <button
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            onClick={startGame}
          >
            {gameState.gameOver ? 'Play Again' : 'Start Game'}
          </button>
          {gameState.gameOver && (
            <div className="mt-4">
              <p className="text-xl font-bold">Game Over!</p>
              <p className="text-lg">Final Score: {gameState.score}</p>
              <p className="text-lg">Words Completed: {gameState.wordsCompleted}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="game-content max-w-md mx-auto">
          <div className="scrambled-word text-center mb-6">
            <p className="text-3xl font-bold tracking-wider">
              {gameState.scrambledWord.split('').join(' ')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <input
              type="text"
              value={gameState.userInput}
              onChange={handleInputChange}
              placeholder="Type your answer here"
              className="w-full px-4 py-2 text-lg border-2 border-purple-300 rounded
                focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <button
              type="submit"
              className="mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold
                py-2 px-6 rounded transition duration-200"
            >
              Submit
            </button>
          </form>

          <div className="hints mt-6 text-center">
            <p className="text-sm text-gray-600">
              Hint: The word has {gameState.currentWord.length} letters
            </p>
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

WordScramble.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};