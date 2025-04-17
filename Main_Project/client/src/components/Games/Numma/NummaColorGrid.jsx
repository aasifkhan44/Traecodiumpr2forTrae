import React from 'react';
import PropTypes from 'prop-types';

// Correct color mapping for color prediction game
// 0: Red+Violet, 5: Green+Violet, all odds: Red, all evens (except 0,5): Green
const getNumberColors = (n) => {
  if (n === 0) return ['bg-red-500', 'bg-purple-500'];
  if (n === 5) return ['bg-green-500', 'bg-purple-500'];
  if (n % 2 === 0) return ['bg-green-500'];
  return ['bg-red-500'];
};

export const NummaColorSelection = ({ 
  selectedColor, 
  setSelectedColor, 
  handleShowPopup 
}) => {
  const colorOptions = [
    { label: 'Red', value: 'Red', className: 'bg-red-500' },
    { label: 'Green', value: 'Green', className: 'bg-green-500' },
    { label: 'Violet', value: 'Violet', className: 'bg-purple-500' }
  ];

  return (
    <div className="flex gap-2 sm:gap-4 mb-4">
      {colorOptions.map(opt => {
        let base, border, background;
        if (opt.value === 'Red') {
          base = '#ef4444';
          border = '#F87171';
          background = 'linear-gradient(180deg, #ef4444 70%, #f3f4f6 100%)';
        } else if (opt.value === 'Green') {
          base = '#22c55e';
          border = '#4ade80';
          background = 'linear-gradient(180deg, #22c55e 70%, #f3f4f6 100%)';
        } else if (opt.value === 'Violet') {
          base = '#a21caf';
          border = '#c084fc';
          background = 'linear-gradient(180deg, #a21caf 70%, #f3f4f6 100%)';
        }
        
        return (
          <button
            key={opt.value}
            className={`flex-1 h-10 sm:h-12 rounded-lg flex items-center justify-center font-semibold text-xs sm:text-base cursor-pointer relative overflow-hidden border transition-all duration-200 ${
              selectedColor === opt.value ? 'border-yellow-400 ring-2 ring-yellow-200 scale-105 z-10' : ''
            } text-white px-1 sm:px-2 text-center truncate`}
            onClick={() => {
              setSelectedColor(opt.value);
              handleShowPopup('Color', opt.value);
            }}
            style={{
              background,
              borderColor: border,
              boxShadow: '0 4px 16px #222b',
              textShadow: '0 1px 2px #fff8',
              fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
              letterSpacing: '0.5px',
            }}
          >
            {/* Minimal glass highlight */}
            <span className="absolute left-2 top-2 w-2/3 h-1/5 bg-white opacity-15 rounded-lg blur-[2px] pointer-events-none"></span>
            <span className="relative z-10 select-none w-full truncate text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const NummaNumberGrid = ({ 
  selectedNumber, 
  setSelectedNumber, 
  handleShowPopup 
}) => {
  const numberBalls = Array.from({ length: 10 }, (_, n) => ({ 
    n, 
    colors: getNumberColors(n) 
  }));

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {numberBalls.map(ball => {
        // Dual-color diagonal for 0 and 5, with a vertical light gradient below; others: vertical gradient
        const base = ball.colors[0] === 'bg-green-500' ? '#22c55e' : ball.colors[0] === 'bg-red-500' ? '#ef4444' : '#a21caf';
        const border = ball.n === 0 || ball.n === 5 ? '#FFD700' : '#D1D5DB';
        const bottomGradient = ', linear-gradient(180deg, transparent 60%, #f3f4f6 100%)';
        const background = ball.n === 0
          ? 'linear-gradient(135deg, #ef4444 48%, #a21caf 52%)' + bottomGradient
          : ball.n === 5
            ? 'linear-gradient(135deg, #22c55e 48%, #a21caf 52%)' + bottomGradient
            : `linear-gradient(180deg, ${base} 70%, #f3f4f6 100%)`;
        
        return (
          <button
            key={ball.n}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-base sm:text-xl cursor-pointer relative overflow-hidden border transition-all duration-200 ${
              selectedNumber === ball.n ? 'border-yellow-400 ring-2 ring-yellow-200 scale-105 z-10' : ''
            } bg-white`}
            onClick={() => {
              setSelectedNumber(ball.n);
              handleShowPopup('Number', ball.n);
            }}
            style={{
              background,
              color: '#222',
              borderColor: border,
              boxShadow: '0 4px 16px #222b',
              textShadow: '0 1px 2px #fff8',
              fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
              letterSpacing: '0.5px',
            }}
          >
            {/* Minimal glass highlight */}
            <span className="absolute left-2 top-2 w-2/3 h-1/5 bg-white opacity-15 rounded-full blur-[2px] pointer-events-none"></span>
            <span className="relative z-10 select-none">{ball.n}</span>
          </button>
        );
      })}
    </div>
  );
};

export const NummaBigSmall = ({ 
  bigSmall, 
  setBigSmall, 
  handleShowPopup 
}) => {
  return (
    <div className="flex gap-4 sm:gap-6 justify-center mb-4 sm:mb-6">
      <button
        className={`px-6 sm:px-8 py-2 rounded-full font-bold text-base sm:text-lg shadow ${
          bigSmall === 'Big' ? 'bg-orange-500 text-white scale-110' : 'bg-orange-100 text-orange-600'
        } transition-all`}
        onClick={() => {
          setBigSmall('Big');
          handleShowPopup('Big/Small', 'Big');
        }}
      >
        Big
      </button>
      <button
        className={`px-6 sm:px-8 py-2 rounded-full font-bold text-base sm:text-lg shadow ${
          bigSmall === 'Small' ? 'bg-blue-500 text-white scale-110' : 'bg-blue-100 text-blue-600'
        } transition-all`}
        onClick={() => {
          setBigSmall('Small');
          handleShowPopup('Big/Small', 'Small');
        }}
      >
        Small
      </button>
    </div>
  );
};

export const NummaMultiplier = ({ 
  selectedMultiplier, 
  setSelectedMultiplier 
}) => {
  const multipliers = ['x1', 'x5', 'x10', 'x20', 'x50', 'x100'];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {multipliers.map(m => (
        <button
          key={m}
          className={`px-3 py-1 rounded-full border-2 font-bold text-sm ${
            selectedMultiplier === m ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-gray-300'
          }`}
          onClick={() => setSelectedMultiplier(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
};

NummaColorSelection.propTypes = {
  selectedColor: PropTypes.string,
  setSelectedColor: PropTypes.func.isRequired,
  handleShowPopup: PropTypes.func.isRequired
};

NummaNumberGrid.propTypes = {
  selectedNumber: PropTypes.number,
  setSelectedNumber: PropTypes.func.isRequired,
  handleShowPopup: PropTypes.func.isRequired
};

NummaBigSmall.propTypes = {
  bigSmall: PropTypes.string,
  setBigSmall: PropTypes.func.isRequired,
  handleShowPopup: PropTypes.func.isRequired
};

NummaMultiplier.propTypes = {
  selectedMultiplier: PropTypes.string.isRequired,
  setSelectedMultiplier: PropTypes.func.isRequired
};
