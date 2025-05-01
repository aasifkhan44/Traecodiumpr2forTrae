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
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

export default function Numma({ gameData }) {
  const { siteSettings } = useSiteSettings();
  
  // Initialize error state to avoid "setError is not defined" errors
  const [error, setError] = useState(null);
  
  // Fullscreen countdown overlay state
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [overlaySeconds, setOverlaySeconds] = useState(null);

  // Get all core functionality from NummaCore
  const numma = NummaCore();
  
  // Get card image URL from gameData if available, fallback to site logo
  const logoUrl = gameData?.cardImageUrl || siteSettings.logoUrl;
  
  // Effect to control countdown overlay
  useEffect(() => {
    if (numma.timer <= 6 && numma.timer > 0) {
      setOverlaySeconds(numma.timer);
      setShowCountdownOverlay(true);
    } else {
      setShowCountdownOverlay(false);
    }
  }, [numma.timer]);

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
          multiplier: Number(multiplier),
          game: 'numma'
        });
        
        // Show success message
        toast.success(`Bet placed: ${betType} on ${betValue} for ⚡${betAmount} (x${multiplier})`, { duration: 2000 });
        
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
            toast.success(`You won ⚡${winAmount}!`, { duration: 2000 });
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
          // userId, // REMOVE userId, backend will use authenticated user
          roundId,
          duration: numma.selectedDuration,
          betType,
          betValue: formattedBetValue,
          amount: Number(betAmount),
          multiplier: Number(multiplier),
          game: 'numma'
        };
        
        // Remove userId if present
        // delete payload.userId;
        
        console.log('Placing bet with payload:', payload);
        
        // Deduct bet amount from wallet
        numma.updateWalletBalance(-betAmount);
        
        const response = await api.post('/numma/bet', payload);
        
        if (response.data.success) {
          toast.success('Bet placed successfully!', { duration: 2000 });
          
          // Refresh wallet balance from backend
          await numma.fetchWalletBalance();
          
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
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center px-2 sm:px-4 py-2 sm:py-4">
      {/* Fullscreen Countdown Overlay */}
      {showCountdownOverlay && overlaySeconds > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s',
          }}
        >
          <span
            style={{
              fontSize: '14vw',
              color: '#FFD700',
              fontWeight: 'bold',
              textShadow: '0 0 32px #fff, 0 0 128px #FFD700',
              animation: 'flash 0.6s alternate infinite',
              filter: 'drop-shadow(0 0 32px #FFD700)',
              userSelect: 'none',
            }}
          >
            {overlaySeconds}
          </span>
          <style>{`
            @keyframes flash {
              0% { opacity: 1; }
              100% { opacity: 0.3; }
            }
          `}</style>
        </div>
      )}
      {/* Game Header and Wallet */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={gameData?.name || 'Numma'}
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl border border-gray-200 bg-white shadow"
            />
          ) : (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-extrabold text-white">N</span>
            </div>
          )}
          <div className="flex flex-col items-center sm:items-start">
            <span className="font-bold text-lg sm:text-2xl text-gray-800 dark:text-gray-100">{gameData?.name || 'Numma'}</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center sm:text-left">{gameData?.description}</span>
          </div>
        </div>
        <NummaWallet walletBalance={numma.walletBalance} walletLoading={numma.walletLoading} />
      </div>

      {/* Game Modes and Round Info */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
        <NummaGameModes selectedMode={numma.selectedMode} setSelectedMode={numma.setSelectedMode} />
        <NummaRoundInfo 
          activeRound={numma.activeRound} 
          timer={numma.timer} 
          formattedTime={numma.formattedTime} 
          waitingForNextRound={numma.waitingForNextRound}
        />
      </div>

      {/* Main Game Controls Section (Color, Big/Small, Number) */}
      <div className="w-full max-w-2xl flex flex-col items-center">
        <NummaColorSelection 
          selectedColor={numma.selectedColor} 
          setSelectedColor={(color) => {
            numma.setSelectedColor(color);
            numma.setSelectedNumber(null);
            numma.setBigSmall(null);
          }} 
          handleShowPopup={numma.handleShowPopup} 
        />
        <NummaBigSmall 
          bigSmall={numma.bigSmall} 
          setBigSmall={(value) => {
            numma.setBigSmall(value);
            numma.setSelectedColor(null);
            numma.setSelectedNumber(null);
          }} 
          handleShowPopup={numma.handleShowPopup} 
        />
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
        {numma.activeTab === 'history' && (
          <NummaGameHistory 
            activeTab={numma.activeTab}
            currentPage={numma.currentPage}
            setCurrentPage={numma.setCurrentPage}
            selectedDuration={numma.selectedDuration}
          />
        )}
        {numma.activeTab === 'chart' && (
          <NummaChart 
            chartData={
              (numma.historyRounds || numma.rounds || []).filter(r => r.result && typeof r.result.number === 'number').map(r => ({
                period: r.period || r.roundNumber || r._id || '',
                number: r.result.number
              }))
            }
            currentPage={numma.currentPage}
            setCurrentPage={numma.setCurrentPage}
            totalPages={1}
          />
        )}
        {numma.activeTab === 'my' && (
          <NummaUserHistory 
            activeTab={numma.activeTab}
            currentPage={numma.currentPage}
            setCurrentPage={numma.setCurrentPage}
            user={numma.user}
          />
        )}
      </div>

      {/* Bet Confirmation Popup */}
      <NummaBetPopup 
        showPopup={numma.showPopup}
        setShowPopup={numma.setShowPopup}
        popupData={{
          ...numma.popupData,
          defaultMultiplier: numma.betAmount && [1,5,10,20,50,100].includes(Number(numma.betAmount)) ? Number(numma.betAmount) : 1
        }}
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