import React, { useState } from 'react';
import PropTypes from 'prop-types';

export const NummaGameModes = ({ selectedMode, setSelectedMode }) => {
  const gameModes = [
    { label: '1M', value: '1', color: 'bg-purple-600 text-white' },
    { label: '3M', value: '3', color: 'bg-green-600 text-white' },
    { label: '5M', value: '5', color: 'bg-gray-300 text-gray-800' }
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {gameModes.map(mode => (
        <button
          key={mode.value}
          className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 ${
            selectedMode === mode.value 
              ? `${mode.color} scale-110 shadow-lg border-2 border-yellow-400` 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setSelectedMode(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};

export const NummaRoundInfo = ({ activeRound, timer, formattedTime }) => {
  return (
    <div className="w-full bg-white shadow-md p-3 sm:p-4 rounded-lg mb-4 flex flex-col sm:flex-row items-center justify-between border border-blue-200">
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-2 sm:mb-0">
        <span className="font-bold text-blue-700 text-base sm:text-lg">Round:</span>
        <span className="font-mono text-blue-900 text-sm sm:text-base bg-blue-50 px-2 py-1 rounded">
          {activeRound ? activeRound.roundNumber : '--'}
        </span>
        <span className="ml-0 sm:ml-4 font-bold text-gray-500 text-sm sm:text-base">Duration:</span>
        <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded text-sm sm:text-base">
          {activeRound ? activeRound.duration : '--'} min
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-600 text-sm sm:text-base">Ends in:</span>
        <span className={`font-mono text-lg sm:text-xl ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-green-700'}`}>
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
      <button className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-full font-semibold shadow hover:bg-green-600 transition-colors text-sm sm:text-base">
        Deposit
      </button>
      <button className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-full font-semibold shadow hover:bg-red-600 transition-colors text-sm sm:text-base">
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

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {quickAmounts.map(amount => (
          <button
            key={amount}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors text-sm"
            onClick={() => setBetAmount(amount)}
          >
            ₹{amount}
          </button>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Enter amount"
            className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-32 sm:w-auto"
          />
        </div>
        
        <button
          className={`px-4 sm:px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors ${
            betLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={handlePlaceBet}
          disabled={betLoading}
        >
          {betLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Placing...
            </span>
          ) : (
            'Place Bet'
          )}
        </button>
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
    // Here you would handle the bet submission
    setShowPopup(false);
    // Call the main bet handler with the popup values and multiplier
    handlePlaceBet(popupTotal, getMultiplierValue(popupMultiplier));
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-sm w-full relative animate-fade-in">
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
            Balance: <span className="font-bold text-green-600">₹{walletBalance.toLocaleString()}</span>
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
            Submit &nbsp; <span className="font-bold text-xs sm:text-sm">Total: ₹{popupTotal.toLocaleString()}</span>
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
