import React, { useState } from 'react';
import PropTypes from 'prop-types';

export const NummaGameModes = ({ selectedMode, setSelectedMode }) => {
  const gameModes = [
    { label: '1M', value: '1', selectedColor: 'from-purple-700 to-purple-400', text: 'text-white' },
    { label: '3M', value: '3', selectedColor: 'from-green-600 to-green-400', text: 'text-white' },
    { label: '5M', value: '5', selectedColor: 'from-yellow-500 to-yellow-300', text: 'text-gray-900' }
  ];

  return (
    <div className="flex flex-col items-center mb-2">
      <h3 className="text-xs sm:text-sm text-gray-500 font-semibold mb-1 tracking-wide uppercase">Select Game Duration</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {gameModes.map(mode => (
          <button
            key={mode.value}
            className={`px-4 py-1 sm:px-5 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gradient-to-b ${
              selectedMode === mode.value
                ? `${mode.selectedColor} ${mode.text} ring-2 ring-yellow-400 scale-105`
                : 'from-black to-gray-800 text-white hover:brightness-110 opacity-90'
            } tracking-wide relative active:scale-95`}
            style={{ boxShadow: '0 4px 16px #000a', textShadow: '0 1px 2px #fff3' }}
            onClick={() => setSelectedMode(mode.value)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const NummaRoundInfo = ({ activeRound, timer, formattedTime }) => {
  return (
    <div className="w-full max-w-xs sm:max-w-sm bg-gradient-to-br from-blue-50 to-white shadow-lg p-2 sm:p-3 rounded-2xl mb-3 flex flex-row items-center justify-between border border-blue-100 mx-auto">
      <div className="flex flex-row items-center gap-1 sm:gap-3 mb-1 sm:mb-0">
        <span className="font-bold text-blue-700 text-xs sm:text-base">Round:</span>
        <span className="font-mono text-blue-900 text-xs sm:text-base bg-blue-100 px-2 py-0.5 rounded">
          {activeRound ? activeRound.roundNumber : '--'}
        </span>
        <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded text-xs sm:text-base">
          {activeRound ? activeRound.duration : '--'} min
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`font-mono text-base sm:text-lg ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-green-700'}`}
          style={{ minWidth: '60px', textAlign: 'center' }}>
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export const NummaWallet = ({ walletBalance, walletLoading }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 justify-center">
      <div className="bg-white rounded-xl px-4 sm:px-6 py-2 shadow text-base sm:text-lg font-bold flex items-center">
        {walletLoading ? (
          <span className="animate-pulse text-gray-400">Loading...</span>
        ) : (
          <span className="mr-2">₹{walletBalance.toLocaleString()}</span>
        )}
      </div>
      <button className="w-24 h-8 sm:w-28 sm:h-9 bg-green-500 text-white rounded-full font-semibold shadow hover:bg-green-600 transition-colors text-xs sm:text-sm flex items-center justify-center px-0">
        Deposit
      </button>
      <button className="w-24 h-8 sm:w-28 sm:h-9 bg-red-500 text-white rounded-full font-semibold shadow hover:bg-red-600 transition-colors text-xs sm:text-sm flex items-center justify-center px-0">
        Withdraw
      </button>
    </div>
  );
};

export const NummaBetControls = ({ 
  betAmount, 
  setBetAmount, 
  handlePlaceBet, 
  betLoading 
}) => {
  const quickAmounts = [10, 50, 100, 500];

  // Remove the bet amount input and Place Bet button since handled in popup
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {quickAmounts.map(amount => (
          <button
            key={amount}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors text-sm"
            onClick={() => setBetAmount(amount)}
          >
            ⚡{amount}
          </button>
        ))}
      </div>
    </div>
  );
};

export const NummaHistoryTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b">
      <button 
        className={`flex-1 py-2 sm:py-3 font-bold text-center text-sm sm:text-base ${
          activeTab === 'history' 
            ? 'text-blue-600 border-b-4 border-blue-600' 
            : 'text-gray-500'
        }`} 
        onClick={() => setActiveTab('history')}
      >
        Game history
      </button>
      <button 
        className={`flex-1 py-2 sm:py-3 font-bold text-center text-sm sm:text-base ${
          activeTab === 'chart' 
            ? 'text-blue-600 border-b-4 border-blue-600' 
            : 'text-gray-500'
        }`} 
        onClick={() => setActiveTab('chart')}
      >
        Chart
      </button>
      <button 
        className={`flex-1 py-2 sm:py-3 font-bold text-center text-sm sm:text-base ${
          activeTab === 'my' 
            ? 'text-blue-600 border-b-4 border-blue-600' 
            : 'text-gray-500'
        }`} 
        onClick={() => setActiveTab('my')}
      >
        My history
      </button>
    </div>
  );
};

export const NummaBetPopup = ({ 
  showPopup, 
  setShowPopup, 
  popupData, 
  walletBalance,
  handlePlaceBet 
}) => {
  const [popupQuantity, setPopupQuantity] = useState(1);
  const [popupMultiplier, setPopupMultiplier] = useState('x1');
  const [popupAgree, setPopupAgree] = useState(true);
  
  const balanceChips = [1, 10, 100, 1000];
  const popupMultipliers = ['x1', 'x5', 'x10', 'x20', 'x50', 'x100'];

  const getMultiplierValue = (mult) => {
    return Number(mult.replace('x', '')) || 1;
  };

  const popupTotal = popupQuantity * getMultiplierValue(popupMultiplier);

  const handleSubmit = () => {
    setShowPopup(false);
    handlePlaceBet(popupTotal, getMultiplierValue(popupMultiplier));
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay: 50% opacity, blocks pointer events */}
      <div className="absolute inset-0 bg-black opacity-50 pointer-events-auto" />
      <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg p-4 sm:p-6 animate-slide-up z-10"
        style={{
          borderTopLeftRadius: '1.5rem',
          borderTopRightRadius: '1.5rem',
          marginBottom: 0,
          minHeight: '260px',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={() => setShowPopup(false)}
        >
          ×
        </button>
        {/* Selected round info and item */}
        <div className="mb-4 text-center">
          <div className="font-bold text-blue-700 text-base sm:text-lg">
            {popupData.round ? `Round: ${popupData.round.roundNumber}` : ''} 
            ({popupData.round ? popupData.round.duration + 'M' : ''})
          </div>
          <div className="font-semibold text-gray-700 mt-1 text-sm sm:text-base">
            {popupData.betType} bet on <span className="text-blue-600">{popupData.betValue}</span>
          </div>
        </div>
        {/* Balance and quick chips */}
        <div className="mb-4 text-center">
          <div className="text-gray-600 text-xs sm:text-sm mb-2">
            Balance: <span className="font-bold text-green-600">⚡{walletBalance.toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {balanceChips.map(b => (
              <button
                key={b}
                className={`px-2 sm:px-3 py-1 rounded-full border ${
                  popupQuantity === b 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                } font-bold text-xs sm:text-sm`}
                onClick={() => setPopupQuantity(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        {/* Quantity and multipliers */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-gray-600 text-sm sm:text-base">Quantity</span>
            <input
              type="number"
              min={1}
              value={popupQuantity}
              onChange={e => setPopupQuantity(Number(e.target.value) || 1)}
              className="w-16 sm:w-20 px-2 py-1 border rounded text-center font-bold text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {popupMultipliers.map(m => (
              <button
                key={m}
                className={`px-2 sm:px-3 py-1 rounded-full border font-bold text-xs sm:text-sm ${
                  popupMultiplier === m 
                    ? 'bg-yellow-400 border-yellow-500' 
                    : 'bg-white border-gray-300'
                }`}
                onClick={() => setPopupMultiplier(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {/* I agree and rules link */}
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="agree"
            checked={popupAgree}
            onChange={e => setPopupAgree(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="agree" className="text-gray-700 text-xs sm:text-sm">I agree</label>
          <a 
            href="/pre-sales-rules" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="ml-2 text-blue-600 underline text-xs"
          >
            &lt;&lt;pre-sales-rules&gt;&gt;
          </a>
        </div>
        {/* Cancel and total amount */}
        <div className="flex items-center justify-between mt-4">
          <button
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors text-sm sm:text-base"
            onClick={() => setShowPopup(false)}
          >
            Cancel
          </button>
          <button
            className={`px-4 sm:px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-2 text-sm sm:text-base ${
              !popupAgree ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!popupAgree}
            onClick={handleSubmit}
          >
            Submit &nbsp; <span className="font-bold text-xs sm:text-sm">Total: ⚡{popupTotal.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

NummaGameModes.propTypes = {
  selectedMode: PropTypes.string.isRequired,
  setSelectedMode: PropTypes.func.isRequired
};

NummaRoundInfo.propTypes = {
  activeRound: PropTypes.object,
  timer: PropTypes.number.isRequired,
  formattedTime: PropTypes.string.isRequired
};

NummaWallet.propTypes = {
  walletBalance: PropTypes.number.isRequired,
  walletLoading: PropTypes.bool.isRequired
};

NummaBetControls.propTypes = {
  betAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setBetAmount: PropTypes.func.isRequired,
  handlePlaceBet: PropTypes.func.isRequired,
  betLoading: PropTypes.bool.isRequired
};

NummaHistoryTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

NummaBetPopup.propTypes = {
  showPopup: PropTypes.bool.isRequired,
  setShowPopup: PropTypes.func.isRequired,
  popupData: PropTypes.object.isRequired,
  walletBalance: PropTypes.number.isRequired,
  handlePlaceBet: PropTypes.func.isRequired
};
