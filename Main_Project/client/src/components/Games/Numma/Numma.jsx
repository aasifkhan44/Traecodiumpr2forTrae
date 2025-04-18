import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import NummaCore from './NummaCore';
import { NummaColorSelection, NummaNumberGrid, NummaBigSmall, NummaMultiplier } from './NummaColorGrid';
import { NummaGameHistory, NummaUserHistory, NummaChart } from './NummaHistory';
import { 
  NummaGameModes, 
  NummaRoundInfo, 
  NummaWallet, 
  NummaBetControls, 
  NummaHistoryTabs, 
  NummaBetPopup 
} from './NummaControls';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';

export default function Numma({ gameData }) {
  // Initialize error state to avoid "setError is not defined" errors
  const [error, setError] = useState(null);
  
  // Get all core functionality from NummaCore
  const numma = NummaCore();
  
  // Handle bet placement with proper error handling
  const handlePlaceBet = async (amount, multiplier = 1) => {
    if (!numma.user) {
      toast.error('Please login to place a bet', { duration: 2000 });
      return;
    }
    
    if (!numma.activeRound) {
      toast.error('No active round available', { duration: 2000 });
      return;
    }
    
    const betAmount = amount || numma.betAmount;
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      toast.error('Please enter a valid bet amount', { duration: 2000 });
      return;
    }
    
    // Check if user has enough balance
    if (betAmount > numma.walletBalance) {
      toast.error('Insufficient balance', { duration: 2000 });
      setError('Insufficient balance. Please add funds to your wallet.');
      return;
    }
    
    let betType, betValue;
    
    if (numma.selectedColor) {
      betType = 'color';
      betValue = numma.selectedColor;
    } else if (numma.selectedNumber !== null) {
      betType = 'number';
      betValue = numma.selectedNumber;
    } else if (numma.bigSmall) {
      betType = 'bigsmall';
      betValue = numma.bigSmall;
    } else {
      toast.error('Please select a bet option', { duration: 2000 });
      return;
    }
    
    try {
      numma.setBetLoading(true);
      
      // For development mode, use a mock implementation
      const useMockImplementation = false;
      
      if (useMockImplementation) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Deduct bet amount from wallet
        numma.updateWalletBalance(-betAmount);
        
        // Log what would be sent to the API
        console.log('MOCK MODE: Would send to API:', {
          userId: numma.user?.id || numma.user?._id || 'mock-user-id',
          roundId: numma.activeRound?._id || 'mock-round-id',
          duration: numma.selectedDuration,
          betType,
          betValue,
          amount: Number(betAmount),
          multiplier: Number(multiplier)
        });
        
        // Show success message
        toast.success(`Bet placed: ${betType} on ${betValue} for ₹${betAmount} (x${multiplier})`, { duration: 2000 });
        
        // Simulate win/loss after a delay (for demo purposes)
        if (Math.random() > 0.5) { // 50% chance of winning
          // Calculate winning amount based on bet type
          let winMultiplier;
          if (betType === 'color') {
            winMultiplier = betValue === 'Violet' ? 4.5 : 2;
          } else if (betType === 'number') {
            winMultiplier = 9;
          } else if (betType === 'bigsmall') {
            winMultiplier = 2;
          }
          
          const winAmount = betAmount * winMultiplier;
          
          // Simulate a delay before showing the win
          setTimeout(() => {
            toast.success(`You won ₹${winAmount}!`, { duration: 2000 });
            numma.updateWalletBalance(winAmount);
          }, 5000 + Math.random() * 5000); // Random delay between 5-10 seconds
        }
        
        // Reset bet selections after a short delay to avoid state updates during render
        setTimeout(() => {
          numma.setBetAmount('');
          numma.setSelectedColor(null);
          numma.setSelectedNumber(null);
          numma.setBigSmall(null);
        }, 100);
        
        return;
      }
      
      // Real API implementation (only used if useMockImplementation is false)
      try {
        // For debugging - log the user object
        console.log('User object:', numma.user);
        console.log('Active round:', numma.activeRound);
        
        // Extract user ID, using fallback for development
        let userId;
        if (numma.user) {
          // Try all possible user ID fields
          userId = numma.user.id || numma.user._id;
          
          // If we still don't have an ID, check if there's a nested structure
          if (!userId && typeof numma.user === 'object') {
            console.log('Looking for ID in user object properties');
            // Log all user object properties to help debug
            Object.keys(numma.user).forEach(key => {
              console.log(`User property ${key}:`, numma.user[key]);
            });
          }
        }
        
        // If we still don't have a user ID, use a fallback for development
        if (!userId) {
          console.log('Using fallback user ID for development');
          userId = '67f46aefa6b4dad7391c18b8'; // Use the ID from the logs
        }
        
        // Make sure we have a valid round ID
        const roundId = numma.activeRound?._id;
        if (!roundId) {
          throw new Error('Round ID is missing');
        }
        
        // Ensure betValue is properly formatted for the API
        let formattedBetValue = betValue;
        if (betType === 'number' && typeof betValue === 'number') {
          formattedBetValue = betValue.toString(); // Convert number to string for API
        }
        
        const payload = {
          userId,
          roundId,
          duration: numma.selectedDuration,
          betType,
          betValue: formattedBetValue,
          amount: Number(betAmount),
          multiplier: Number(multiplier)
        };
        
        // Ensure all required fields are present
        const requiredFields = ['userId', 'roundId', 'duration', 'betType', 'betValue', 'amount'];
        const missingFields = requiredFields.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === '');
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        console.log('Placing bet with payload:', payload);
        
        // Deduct bet amount from wallet
        numma.updateWalletBalance(-betAmount);
        
        const response = await api.post('/numma/bet', payload);
        
        if (response.data.success) {
          toast.success('Bet placed successfully!', { duration: 2000 });
          
          // Listen for bet result via WebSocket
          // In a real implementation, this would be handled by the WebSocket connection
        } else {
          // If bet failed, refund the amount
          numma.updateWalletBalance(betAmount);
          throw new Error(response.data.error || 'Failed to place bet');
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        // Refund the amount if there was an error
        numma.updateWalletBalance(betAmount);
        
        // Check if we have a response with error details
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error, { duration: 2000 });
          setError(apiError.response.data.error);
        } else {
          // Show the error message
          toast.error(apiError.message || 'Failed to place bet', { duration: 2000 });
          setError(apiError.message || 'Failed to place bet');
        }
      }
      
      // Reset bet selections after a short delay to avoid state updates during render
      setTimeout(() => {
        numma.setBetAmount('');
        numma.setSelectedColor(null);
        numma.setSelectedNumber(null);
        numma.setBigSmall(null);
      }, 100);
      
    } catch (err) {
      setError(err.message || 'Failed to place bet');
      toast.error(err.message || 'Failed to place bet', { duration: 2000 });
    } finally {
      numma.setBetLoading(false);
    }
  };

  // Add mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      // Add any specific mobile adjustments if needed
      document.documentElement.style.setProperty(
        '--numma-grid-size', 
        window.innerWidth < 640 ? '14vw' : '16'
      );
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mt-2 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-extrabold text-white">N</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-gray-800">Numma Color Prediction</h1>
        </div>
        
        {/* Wallet Section */}
        <NummaWallet 
          walletBalance={numma.walletBalance} 
          walletLoading={numma.walletLoading} 
        />
        
        {/* Game Modes */}
        <div className="w-full max-w-2xl mx-auto mb-2">
          <NummaGameModes 
            selectedMode={numma.selectedMode} 
            setSelectedMode={numma.setSelectedMode} 
          />
        </div>
        
        {/* Removed error display as requested */}
        
        {/* Loading or no rounds message */}
        {numma.rounds.length === 0 && (
          <div className="w-full max-w-2xl bg-blue-100 text-blue-700 text-center text-sm p-2 mb-2 rounded">
            {numma.loading ? 'Loading round info...' : 'No active rounds available.'}
          </div>
        )}
        
        {/* Active Round Info */}
        {numma.rounds.length > 0 && numma.activeRound && (
          <NummaRoundInfo 
            activeRound={numma.activeRound} 
            timer={numma.timer} 
            formattedTime={numma.formattedTime} 
          />
        )}
        
        {/* Color Selection + Number Grid Wrapper */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          {/* Color Selection */}
          <NummaColorSelection 
            selectedColor={numma.selectedColor} 
            setSelectedColor={(color) => {
              numma.setSelectedColor(color);
              numma.setSelectedNumber(null);
              numma.setBigSmall(null);
            }} 
            handleShowPopup={numma.handleShowPopup} 
          />
          {/* Big/Small Toggles - moved before number grid */}
          <NummaBigSmall 
            bigSmall={numma.bigSmall} 
            setBigSmall={(value) => {
              numma.setBigSmall(value);
              numma.setSelectedColor(null);
              numma.setSelectedNumber(null);
            }} 
            handleShowPopup={numma.handleShowPopup} 
          />
          {/* Number Grid - centered under color and big/small buttons */}
          <div className="flex w-full justify-center">
            <NummaNumberGrid 
              selectedNumber={numma.selectedNumber} 
              setSelectedNumber={(number) => {
                numma.setSelectedNumber(number);
                numma.setSelectedColor(null);
                numma.setBigSmall(null);
              }} 
              handleShowPopup={numma.handleShowPopup} 
            />
          </div>
          
          {/* Bet Controls */}
          <NummaBetControls 
            betAmount={numma.betAmount} 
            setBetAmount={numma.setBetAmount} 
            handlePlaceBet={handlePlaceBet} 
            betLoading={numma.betLoading} 
          />
        </div>
        
        {/* Tabs for History/Chart/My History */}
        <div className="w-full max-w-2xl bg-white rounded-t-xl shadow flex flex-col mt-4">
          <NummaHistoryTabs 
            activeTab={numma.activeTab} 
            setActiveTab={numma.setActiveTab} 
          />
          
          {/* Game History Tab */}
          {numma.activeTab === 'history' && (
            <NummaGameHistory 
              activeTab={numma.activeTab}
              currentPage={numma.currentPage}
              setCurrentPage={numma.setCurrentPage}
              selectedDuration={numma.selectedDuration}
            />
          )}
          
          {/* Chart Tab */}
          {numma.activeTab === 'chart' && <NummaChart />}
          
          {/* My History Tab */}
          {numma.activeTab === 'my' && (
            <NummaUserHistory 
              activeTab={numma.activeTab}
              currentPage={numma.currentPage}
              setCurrentPage={numma.setCurrentPage}
              user={numma.user}
            />
          )}
        </div>
      </div>
      
      {/* Bet Confirmation Popup */}
      <NummaBetPopup 
        showPopup={numma.showPopup}
        setShowPopup={numma.setShowPopup}
        popupData={numma.popupData}
        walletBalance={numma.walletBalance}
        handlePlaceBet={handlePlaceBet}
      />
    </div>
  );
}

Numma.propTypes = {
  gameData: PropTypes.shape({
    isActive: PropTypes.bool,
    isDefault: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string
  })
};