import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function SpeedMath({ gameData }) {
  const OPERATORS = ['+', '-', '*'];
  const GAME_DURATION = 60; // 60 seconds

  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    currentProblem: null,
    userAnswer: '',
    problemsSolved: 0,
    gameOver: false,
    difficulty: 1
  });

  useEffect(() => {
    if (gameData) {
      setGameState(prevState => ({
        ...prevState,
        currentRound: gameData.roundId || 0
      }));
    }
  }, [gameData]);

  const generateProblem = useCallback(() => {
    const operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    let num1, num2, answer;

    switch (operator) {
      case '+':
        num1 = Math.floor(Math.random() * (10 * gameState.difficulty)) + 1;
        num2 = Math.floor(Math.random() * (10 * gameState.difficulty)) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * (10 * gameState.difficulty)) + 1;
        num2 = Math.floor(Math.random() * num1) + 1; // Ensure positive result
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * (5 * gameState.difficulty)) + 1;
        num2 = Math.floor(Math.random() * (5 * gameState.difficulty)) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 0;
        num2 = 0;
        answer = 0;
    }

    return {
      expression: `${num1} ${operator} ${num2}`,
      answer: answer
    };
  }, [gameState.difficulty]);

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

  const startGame = () => {
    const problem = generateProblem();
    setGameState({
      ...gameState,
      isStarted: true,
      gameOver: false,
      score: 0,
      timeLeft: GAME_DURATION,
      currentProblem: problem,
      userAnswer: '',
      problemsSolved: 0,
      difficulty: 1
    });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^-?\d+$/.test(value)) {
      setGameState(prevState => ({
        ...prevState,
        userAnswer: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gameState.currentProblem) return;

    const userAnswerNum = parseInt(gameState.userAnswer);
    const isCorrect = userAnswerNum === gameState.currentProblem.answer;

    if (isCorrect) {
      const timeBonus = Math.floor(gameState.timeLeft / 10);
      const difficultyBonus = gameState.difficulty * 10;
      const newScore = gameState.score + 100 + timeBonus + difficultyBonus;
      const newProblemsSolved = gameState.problemsSolved + 1;
      const newDifficulty = Math.floor(newProblemsSolved / 5) + 1; // Increase difficulty every 5 problems

      setGameState(prevState => ({
        ...prevState,
        score: newScore,
        currentProblem: generateProblem(),
        userAnswer: '',
        problemsSolved: newProblemsSolved,
        difficulty: newDifficulty
      }));
    } else {
      setGameState(prevState => ({
        ...prevState,
        score: Math.max(0, prevState.score - 50),
        userAnswer: ''
      }));
    }
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="speed-math-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
        <p className="text-lg">Time Left: {gameState.timeLeft}s</p>
        <p className="text-lg">Problems Solved: {gameState.problemsSolved}</p>
        <p className="text-lg">Difficulty Level: {gameState.difficulty}</p>
      </div>

      {!gameState.isStarted || gameState.gameOver ? (
        <div className="text-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={startGame}
          >
            {gameState.gameOver ? 'Play Again' : 'Start Game'}
          </button>
          {gameState.gameOver && (
            <div className="mt-4">
              <p className="text-xl font-bold">Game Over!</p>
              <p className="text-lg">Final Score: {gameState.score}</p>
              <p className="text-lg">Problems Solved: {gameState.problemsSolved}</p>
              <p className="text-lg">Highest Difficulty: {gameState.difficulty}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="game-content max-w-md mx-auto">
          <div className="problem-display text-center mb-6">
            <p className="text-4xl font-bold">
              {gameState.currentProblem?.expression} = ?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <input
              type="text"
              value={gameState.userAnswer}
              onChange={handleInputChange}
              placeholder="Enter your answer"
              className="w-full px-4 py-2 text-lg border-2 border-blue-300 rounded
                focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold
                py-2 px-6 rounded transition duration-200"
            >
              Submit
            </button>
          </form>

          <div className="tips mt-6 text-center text-gray-600">
            <p>Tip: Use the number keys to type your answer quickly!</p>
            <p>Correct answers give bonus points based on time and difficulty!</p>
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

SpeedMath.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};