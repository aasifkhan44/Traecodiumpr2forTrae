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

const beepAudio = typeof window !== 'undefined' ? new Audio('/sounds/countdown-beep.mp3') : null;

export default function Numma({ gameData }) {
  const { siteSettings } = useSiteSettings();
  
  // Initialize error state to avoid "setError is not defined" errors
  const [error, setError] = useState(null);
  
  // Result popup state
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [popupResult, setPopupResult] = useState(null);

  // Use popup state for countdown/result
  const [showCountdownPopup, setShowCountdownPopup] = useState(false);
  const [popupCountdownSeconds, setPopupCountdownSeconds] = useState(null);
  const [popupShowResult, setPopupShowResult] = useState(false);
  const [popupResultCountdown, setPopupResultCountdown] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  // Get all core functionality from NummaCore
  const numma = NummaCore();
  
  // Get card image URL from gameData if available, fallback to site logo
  const logoUrl = gameData?.cardImageUrl || siteSettings.logoUrl;
  
  // Effect to control countdown popup and result
  useEffect(() => {
    if (numma.timer <= 6 && numma.timer > 0) {
      setPopupCountdownSeconds(numma.timer);
      setShowCountdownPopup(true);
      setPopupShowResult(false);
      setPopupResultCountdown(null);
      setPopupLoading(false);
      // Play beep for last 5 seconds
      if (numma.timer <= 5 && beepAudio) {
        beepAudio.currentTime = 0;
        beepAudio.play().catch(() => {});
      }
    } else if (numma.timer === 0 && showCountdownPopup && !popupShowResult) {
      const roundNumber = numma.activeRound?.roundNumber || numma.activeRound?.number;
      if (roundNumber) {
        setPopupLoading(true);
        const fetchResult = (retry = 0) => {
          api.get('/numma/rounds/history', {
            params: { duration: numma.activeRound?.duration || numma.selectedDuration, page: 1 }
          })
          .then(res => {
            if (res.data.success && Array.isArray(res.data.data.rounds)) {
              const found = res.data.data.rounds.find(r => 
                r.roundNumber === roundNumber || r.number === roundNumber
              );
              if (found) {
                // Flatten result fields for popup display
                let number = '';
                let color = '';
                let bigSmall = '';
                if (found.result) {
                  number = found.result.number;
                  if ([0,2,4,6,8].includes(number)) {
                    color = 'Red';
                    if (number === 0) color = 'Red, Violet';
                  } else if ([1,3,5,7,9].includes(number)) {
                    color = 'Green';
                    if (number === 5) color = 'Green, Violet';
                  }
                  bigSmall = (number >= 5 && number <= 9) ? 'Big' : (number >= 0 && number <= 4) ? 'Small' : '-';
                }
                setPopupShowResult(true);
                setPopupResultCountdown({
                  ...found,
                  number,
                  color,
                  bigSmall,
                });
                setPopupCountdownSeconds(0);
                setPopupLoading(false);
                setTimeout(() => {
                  setShowCountdownPopup(false);
                  setPopupShowResult(false);
                  setPopupResultCountdown(null);
                  setPopupLoading(false);
                }, 2000);
                return;
              }
            }
            // Retry up to 12 times (~10 seconds)
            if (retry < 12) {
              setTimeout(() => fetchResult(retry + 1), 850);
            } else {
              setPopupShowResult(false);
              setPopupResultCountdown(null);
              setPopupCountdownSeconds(0);
              setPopupLoading(false);
            }
          })
          .catch(() => {
            if (retry < 12) {
              setTimeout(() => fetchResult(retry + 1), 850);
            } else {
              setPopupShowResult(false);
              setPopupResultCountdown(null);
              setPopupCountdownSeconds(0);
              setPopupLoading(false);
            }
          });
        };
        fetchResult();
      } else {
        setPopupShowResult(false);
        setPopupResultCountdown(null);
        setPopupCountdownSeconds(0);
        setPopupLoading(false);
      }
    }
    // Do not auto-close on timer > 6, let popup auto-close after result
  }, [numma.timer, showCountdownPopup, popupShowResult, numma.activeRound]);

  // Handler to close overlay after result
  const handleOverlayClose = () => {
    setShowCountdownPopup(false);
    setPopupShowResult(false);
    setPopupResultCountdown(null);
  };

  // Handle bet placement with proper error handling
  const handlePlaceBet = async (amount, multiplier = 1) => {
    if (!numma.user) {
      toast.error('Please login to place a bet', { duration: 1000 });
      return;
    }
    
    if (!numma.activeRound) {
      toast.error('No active round available', { duration: 1000 });
      return;
    }
    
    const betAmount = amount || numma.betAmount;
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      toast.error('Please enter a valid bet amount', { duration: 1000 });
      return;
    }
    
    // Check if user has enough balance
    if (betAmount > numma.walletBalance) {
      toast.error('Insufficient balance', { duration: 1000 });
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
      toast.error('Please select a bet option', { duration: 1000 });
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
          duration: numma.activeRound?.duration || numma.selectedDuration,
          betType,
          betValue,
          amount: Number(betAmount),
          multiplier: Number(multiplier),
          game: 'numma'
        });
        
        // Show success message
        toast.success(`Bet placed: ${betType} on ${betValue} for ⚡${betAmount} (x${multiplier})`, { duration: 1000 });
        
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
            toast.success(`You won ⚡${winAmount}!`, { duration: 1000 });
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
          duration: numma.activeRound?.duration || numma.selectedDuration,
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
          toast.success('Bet placed successfully!', { duration: 1000 });
          
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
          toast.error(apiError.response.data.error, { duration: 1000 });
          setError(apiError.response.data.error);
        } else {
          // Show the error message
          toast.error(apiError.message || 'Failed to place bet', { duration: 1000 });
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
      toast.error(err.message || 'Failed to place bet', { duration: 1000 });
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

  // Countdown/Result Popup Component
  function CountdownResultPopup({ seconds, showResult, result, open, onClose, loading }) {
    if (!open) return null;
    const showPeriod = result?.period || result?.roundNumber || result?.number;
    const showNumber = result?.number ?? result?.resultNumber ?? result?.roundNumber;
    const showColors = result?.color || result?.resultColors || result?.colors;
    const showBigSmall = result?.bigSmall ?? result?.bigsmall ?? result?.BigSmall;
    // Color theme for result
    const colorMap = {
      'Red': '#ef4444',
      'Green': '#22c55e',
      'Violet': '#a21caf',
      'Red, Violet': 'linear-gradient(90deg, #ef4444 50%, #a21caf 50%)',
      'Green, Violet': 'linear-gradient(90deg, #22c55e 50%, #a21caf 50%)',
    };
    let colorStyle = {};
    if (showColors && colorMap[showColors]) {
      colorStyle = colorMap[showColors].startsWith('linear')
        ? { background: colorMap[showColors], WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
        : { color: colorMap[showColors] };
    }
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 60%, #a5b4fc 100%)',
          borderRadius: '2.5rem 1.2rem 2.5rem 1.2rem',
          boxShadow: '0 12px 40px #6366f1aa, 0 2px 8px #0002',
          padding: '2.7rem 2.5rem 2.2rem 2.5rem',
          minWidth: 350,
          maxWidth: '95vw',
          textAlign: 'center',
          position: 'relative',
          border: '4px solid #6366f1',
          overflow: 'hidden',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: '#6366f1',
            cursor: 'pointer',
            fontWeight: 900,
            transition: 'color 0.2s',
          }}>&times;</button>
          <div style={{
            position: 'absolute',
            left: -40,
            top: -40,
            width: 120,
            height: 120,
            background: 'radial-gradient(circle at 60% 40%, #6366f1 0%, transparent 80%)',
            zIndex: 0,
            opacity: 0.18,
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            right: -40,
            bottom: -40,
            width: 120,
            height: 120,
            background: 'radial-gradient(circle at 40% 60%, #a5b4fc 0%, transparent 80%)',
            zIndex: 0,
            opacity: 0.14,
            pointerEvents: 'none',
          }} />
          {loading ? (
            <div style={{margin: '40px 0'}}>
              <div className="spinner" style={{margin: '0 auto 16px', width: 48, height: 48, border: '5px solid #e0e7ef', borderTop: '5px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', marginBottom: 10 }}>Fetching result...</h2>
            </div>
          ) : !showResult ? (
            <>
              {seconds === 0 ? (
                <>
                  <h2 style={{ fontSize: 30, fontWeight: 900, color: '#6366f1', marginBottom: 20, letterSpacing: 1 }}>Waiting for result...</h2>
                  <span style={{color:'#666',fontSize:'1.2em',opacity:0.7}}>Please wait</span>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 30, fontWeight: 900, color: '#6366f1', marginBottom: 20, letterSpacing: 1 }}>Round Starts In</h2>
                  <div style={{
                    color: '#fff',
                    fontSize: 74,
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textShadow: '0 2px 24px #6366f1cc, 0 2px 16px #fff8',
                    marginBottom: 14,
                    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                    background: 'linear-gradient(90deg,#6366f1,#a5b4fc 70%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>{seconds}</div>
                  <span style={{color:'#6366f1',fontSize:'1.2em',opacity:0.8}}>Get Ready!</span>
                </>
              )}
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 38, fontWeight: 900, color: '#6366f1', marginBottom: 18, letterSpacing: 1.2, textShadow: '0 2px 12px #a5b4fc99' }}>Round Result</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#374151', letterSpacing: 0.7 }}>
                  <span style={{color:'#6366f1'}}>Period:</span> <span style={{color:'#222'}}>{showPeriod}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#374151', letterSpacing: 0.7 }}>
                  <span style={{color:'#6366f1'}}>Number:</span> <span style={{color:'#222'}}>{typeof showNumber !== 'undefined' ? showNumber : '-'}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#374151', letterSpacing: 0.7 }}>
                  <span style={{color:'#6366f1'}}>Big/Small:</span> <span style={{color: showBigSmall === 'Big' ? '#f59e42' : showBigSmall === 'Small' ? '#3b82f6' : '#222'}}>{showBigSmall || '-'}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#374151', letterSpacing: 0.7 }}>
                  <span style={{color:'#6366f1'}}>Color:</span> <span style={{...colorStyle, fontWeight: 900, fontSize: 24}}>{showColors ? showColors : '-'}</span>
                </div>
              </div>
            </>
          )}
          <style>{`
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-recharge-container w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-600 via-blue-400 to-cyan-300 rounded-2xl shadow-xl border-2 border-blue-200 animate-fade-in">
      {showCountdownPopup && (
        <CountdownResultPopup 
          seconds={popupCountdownSeconds}
          showResult={popupShowResult}
          result={popupResultCountdown}
          open={showCountdownPopup}
          onClose={() => setShowCountdownPopup(false)}
          loading={popupLoading}
        />
      )}
      {showResultPopup && (
        <ResultPopup 
          result={popupResult} 
          open={showResultPopup} 
          onClose={() => setShowResultPopup(false)}
        />
      )}
      <div className="w-full rounded-2xl">
        {/* Header: Logo + Game Name */}
        <div className="w-full max-w-2xl flex flex-row items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div className="flex items-center gap-2">
            {/* Logo */}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-lg shadow bg-white object-contain"
                style={{ background: '#fff' }}
              />
            )}
            {/* Game Name */}
            <span className="font-bold text-lg sm:text-2xl text-gray-900 dark:text-white select-none">Numma</span>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center sm:text-left">{gameData?.description}</span>
          </div>
        </div>
        <NummaWallet walletBalance={numma.walletBalance} walletLoading={numma.walletLoading} />
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
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow flex flex-col mt-4">
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