import { useState, useEffect } from 'react';
import { FaInfo, FaHistory, FaCoins } from 'react-icons/fa';

const GamePage = () => {
  const [gameState, setGameState] = useState({
    roundId: 'G20250404001',
    status: 'active',
    timeRemaining: 30,
    previousResults: [
      { roundId: 'G20250403010', color: 'red', number: 5 },
      { roundId: 'G20250403009', color: 'green', number: 2 },
      { roundId: 'G20250403008', color: 'blue', number: 8 },
      { roundId: 'G20250403007', color: 'yellow', number: 1 },
      { roundId: 'G20250403006', color: 'purple', number: 9 },
    ]
  });
  
  const [selectedColor, setSelectedColor] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(1000);
  const [bets, setBets] = useState([]);
  const [showRules, setShowRules] = useState(false);
  
  const colorOptions = [
    { name: 'red', color: 'bg-red-500', odds: 2.0 },
    { name: 'green', color: 'bg-green-500', odds: 2.0 },
    { name: 'blue', color: 'bg-blue-500', odds: 2.0 },
    { name: 'yellow', color: 'bg-yellow-500', odds: 3.0 },
    { name: 'purple', color: 'bg-purple-500', odds: 3.0 },
    { name: 'orange', color: 'bg-orange-500', odds: 3.0 },
    { name: 'black', color: 'bg-black', odds: 5.0 }
  ];
  
  // Simulate timer countdown
  useEffect(() => {
    if (gameState.status !== 'active') return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          // Game round ended, simulate result
          const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
          const randomNumber = Math.floor(Math.random() * 10);
          
          // Process bets
          processBets(randomColor.name);
          
          // Return new game state with new round
          return {
            ...prev,
            status: 'ending',
            timeRemaining: 0,
            result: { color: randomColor.name, number: randomNumber }
          };
        }
        
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.status]);
  
  // Start new round after result display
  useEffect(() => {
    if (gameState.status !== 'ending') return;
    
    const timer = setTimeout(() => {
      // Generate new round ID
      const date = new Date();
      const dateStr = date.getFullYear().toString() +
                     (date.getMonth() + 1).toString().padStart(2, '0') +
                     date.getDate().toString().padStart(2, '0');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newRoundId = `G${dateStr}${randomNum}`;
      
      setGameState(prev => ({
        roundId: newRoundId,
        status: 'active',
        timeRemaining: 30,
        previousResults: [
          { roundId: prev.roundId, color: prev.result.color, number: prev.result.number },
          ...prev.previousResults.slice(0, 4)
        ]
      }));
      
      // Reset bets for new round
      setBets([]);
      setSelectedColor(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [gameState.status]);
  
  const processBets = (winningColor) => {
    // Process user bets
    let newBalance = balance;
    
    bets.forEach(bet => {
      if (bet.color === winningColor) {
        // Calculate winnings
        const colorOption = colorOptions.find(c => c.name === bet.color);
        const winnings = bet.amount * colorOption.odds;
        newBalance += winnings;
      }
    });
    
    setBalance(newBalance);
  };
  
  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };
  
  const handleBetAmountChange = (e) => {
    setBetAmount(parseInt(e.target.value, 10));
  };
  
  const handlePlaceBet = () => {
    if (!selectedColor) return;
    if (betAmount <= 0) return;
    if (betAmount > balance) return;
    if (gameState.status !== 'active') return;
    
    // Check if already bet on this color
    const existingBet = bets.find(bet => bet.color === selectedColor);
    if (existingBet) {
      // Update existing bet
      setBets(bets.map(bet => 
        bet.color === selectedColor 
        ? { ...bet, amount: bet.amount + betAmount } 
        : bet
      ));
    } else {
      // Add new bet
      setBets([...bets, { color: selectedColor, amount: betAmount }]);
    }
    
    // Deduct from balance
    setBalance(balance - betAmount);
    
    // Reset selection
    setSelectedColor(null);
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Color Prediction Game</h1>
      
      {/* Game Info and Timer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Round ID</p>
            <p className="text-lg font-bold">{gameState.roundId}</p>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Time Remaining</p>
            <div className={`text-4xl font-bold ${gameState.timeRemaining < 10 ? 'text-red-500' : 'text-primary'}`}>
              {gameState.status === 'active' ? gameState.timeRemaining : '⌛'}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-gray-600 dark:text-gray-400">Your Balance</p>
            <p className="text-lg font-bold">🪙 {balance.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Game Result Display */}
        {gameState.status === 'ending' && (
          <div className="mt-4 p-4 border-2 border-dashed border-primary rounded-lg text-center">
            <h3 className="text-xl font-bold mb-2">Result</h3>
            <div className="flex items-center justify-center">
              <span 
                className={`w-8 h-8 rounded-full mr-2 ${colorOptions.find(c => c.name === gameState.result.color).color}`}
              ></span>
              <span className="text-2xl font-bold">
                {gameState.result.color.toUpperCase()} - {gameState.result.number}
              </span>
            </div>
            <div className="mt-2">
              {bets.some(bet => bet.color === gameState.result.color) ? (
                <p className="text-success font-bold">You won! Next round starting soon...</p>
              ) : bets.length > 0 ? (
                <p className="text-danger font-bold">You lost. Next round starting soon...</p>
              ) : (
                <p className="text-gray-600">Next round starting soon...</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Game Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Color Selection */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Choose a Color</h2>
              <button
                onClick={() => setShowRules(!showRules)}
                className="flex items-center text-primary hover:text-primary/80"
              >
                <FaInfo className="mr-1" /> Rules
              </button>
            </div>
            
            {showRules && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <h3 className="font-bold mb-2">Game Rules</h3>
                <ul className="list-disc list-inside text-sm">
                  <li>Select a color and place your bet before the timer ends</li>
                  <li>Each color has different odds based on probability</li>
                  <li>If your color matches the result, you win based on the odds</li>
                  <li>You can bet on multiple colors in the same round</li>
                  <li>All results are randomly generated</li>
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
              {colorOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => handleColorSelect(option.name)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${selectedColor === option.name ? 'border-primary' : 'border-transparent'}
                    ${gameState.status !== 'active' ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`}
                  disabled={gameState.status !== 'active'}
                >
                  <div className={`w-12 h-12 rounded-full ${option.color} mb-2`}></div>
                  <div className="font-bold capitalize">{option.name}</div>
                  <div className="text-sm">x{option.odds}</div>
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="betAmount">
                  Bet Amount
                </label>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={handleBetAmountChange}
                  min="1"
                  max={balance}
                  className="input"
                  disabled={gameState.status !== 'active'}
                />
              </div>
              
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={`px-2 py-1 border rounded text-sm
                      ${betAmount === amount ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}
                      ${gameState.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={gameState.status !== 'active'}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handlePlaceBet}
                disabled={!selectedColor || gameState.status !== 'active' || betAmount <= 0 || betAmount > balance}
                className={`btn btn-primary w-full sm:w-auto min-w-[120px]
                  ${(!selectedColor || gameState.status !== 'active' || betAmount <= 0 || betAmount > balance) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Place Bet
              </button>
            </div>
          </div>
          
          {/* Previous Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaHistory className="text-primary mr-2" />
              <h2 className="text-xl font-bold">Previous Results</h2>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {gameState.previousResults.map((result, index) => (
                <div key={index} className="text-center">
                  <div 
                    className={`w-10 h-10 rounded-full mx-auto mb-1 ${colorOptions.find(c => c.name === result.color).color}`}
                  ></div>
                  <div className="text-xs font-semibold">{result.number}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Current Bets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit">
          <div className="flex items-center mb-4">
            <FaCoins className="text-primary mr-2" />
            <h2 className="text-xl font-bold">Your Bets</h2>
          </div>
          
          {bets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No bets placed in this round
            </p>
          ) : (
            <div className="space-y-3">
              {bets.map((bet, index) => {
                const colorOption = colorOptions.find(c => c.name === bet.color);
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full ${colorOption.color} mr-2`}></div>
                      <div>
                        <div className="font-bold capitalize">{bet.color}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">x{colorOption.odds}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">🪙 {bet.amount}</div>
                      <div className="text-xs text-success">Potential: 🪙 {(bet.amount * colorOption.odds).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Total Bet:</span>
                  <span>🪙 {bets.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
