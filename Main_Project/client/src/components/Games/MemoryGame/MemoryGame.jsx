import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function MemoryGame({ gameData }) {
  const [gameState, setGameState] = useState({
    isStarted: false,
    currentRound: 0,
    score: 0,
    cards: [],
    flippedCards: [],
    matchedPairs: []
  });

  const cardSymbols = ['🌟', '🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎢'];

  useEffect(() => {
    if (gameData) {
      setGameState(prevState => ({
        ...prevState,
        currentRound: gameData.roundId || 0
      }));
    }
  }, [gameData]);

  const initializeGame = () => {
    const shuffledCards = [...cardSymbols, ...cardSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false
      }));

    setGameState(prevState => ({
      ...prevState,
      isStarted: true,
      cards: shuffledCards,
      score: 0,
      flippedCards: [],
      matchedPairs: []
    }));
  };

  const handleCardClick = (card) => {
    if (
      !gameState.isStarted ||
      gameState.flippedCards.length >= 2 ||
      card.isFlipped ||
      card.isMatched
    ) return;

    const newCards = gameState.cards.map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );

    const newFlippedCards = [...gameState.flippedCards, card];

    if (newFlippedCards.length === 2) {
      if (newFlippedCards[0].symbol === newFlippedCards[1].symbol) {
        // Match found
        setGameState(prevState => ({
          ...prevState,
          cards: newCards.map(c =>
            c.id === newFlippedCards[0].id || c.id === newFlippedCards[1].id
              ? { ...c, isMatched: true }
              : c
          ),
          matchedPairs: [...prevState.matchedPairs, newFlippedCards[0].symbol],
          score: prevState.score + 10,
          flippedCards: []
        }));
      } else {
        // No match
        setGameState(prevState => ({
          ...prevState,
          cards: newCards,
          flippedCards: newFlippedCards
        }));

        // Flip cards back after a delay
        setTimeout(() => {
          setGameState(prevState => ({
            ...prevState,
            cards: prevState.cards.map(c =>
              c.id === newFlippedCards[0].id || c.id === newFlippedCards[1].id
                ? { ...c, isFlipped: false }
                : c
            ),
            flippedCards: []
          }));
        }, 1000);
      }
    } else {
      setGameState(prevState => ({
        ...prevState,
        cards: newCards,
        flippedCards: newFlippedCards
      }));
    }
  };

  if (!gameData) {
    return <div>Loading game data...</div>;
  }

  return (
    <div className="memory-game-container p-4">
      <div className="game-header text-center mb-4">
        <h2 className="text-2xl font-bold">{gameData.name} - Round {gameState.currentRound}</h2>
        <p className="text-lg">Score: {gameState.score}</p>
      </div>

      {!gameState.isStarted ? (
        <div className="text-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={initializeGame}
          >
            Start Game
          </button>
        </div>
      ) : (
        <div className="game-board grid grid-cols-4 gap-4 max-w-md mx-auto">
          {gameState.cards.map(card => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`card h-24 w-24 cursor-pointer flex items-center justify-center text-3xl
                ${card.isFlipped || card.isMatched ? 'bg-white' : 'bg-blue-500'}
                rounded shadow transition-all duration-300 transform hover:scale-105`}
            >
              {(card.isFlipped || card.isMatched) && card.symbol}
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

MemoryGame.propTypes = {
  gameData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    roundId: PropTypes.number,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired
  }).isRequired
};