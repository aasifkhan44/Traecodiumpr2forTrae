const mongoose = require('mongoose');

const NummaBetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  roundNumber: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5] // Duration in minutes
  },
  betType: {
    type: String,
    required: true,
    enum: ['color', 'number', 'bigsmall']
  },
  betValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
    // For color: 'Red', 'Green', 'Violet'
    // For number: 0-9
    // For bigsmall: 'Big', 'Small'
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  multiplier: {
    type: Number,
    default: 1
  },
  serviceFee: {
    type: Number,
    default: 0
  },
  effectiveAmount: {
    type: Number,
    default: function() {
      return this.amount - this.serviceFee;
    }
  },
  potentialWin: {
    type: Number,
    default: 0
  },
  result: {
    type: mongoose.Schema.Types.Mixed
    // Will store the round result when completed
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending'
  },
  winAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate potential win amount based on bet type and value
NummaBetSchema.methods.calculatePotentialWin = function() {
  const effectiveAmount = this.effectiveAmount;
  let multiplier = 0;

  // Apply multiplier based on bet type and value
  if (this.betType === 'color') {
    if (this.betValue === 'Violet') {
      multiplier = 4.5; // Violet has higher payout
    } else {
      multiplier = 2; // Red or Green standard payout
    }
  } else if (this.betType === 'number') {
    multiplier = 9; // Exact number has highest payout
  } else if (this.betType === 'bigsmall') {
    multiplier = 2; // Big or Small standard payout
  }

  this.potentialWin = effectiveAmount * multiplier;
  return this.potentialWin;
};

// Process the bet result based on round result
NummaBetSchema.methods.processResult = function(roundResult) {
  if (!roundResult || !roundResult.number) {
    throw new Error('Invalid round result');
  }

  this.result = roundResult;
  let isWin = false;
  let winMultiplier = 0;

  // Check if bet won based on result
  if (this.betType === 'color') {
    // Handle color bets
    if (this.betValue === 'Red') {
      if (roundResult.number === 0 || roundResult.number === 2 || 
          roundResult.number === 4 || roundResult.number === 6 || 
          roundResult.number === 8) {
        isWin = true;
        // Reduced payout for Red when it's also Violet (number 0)
        winMultiplier = roundResult.number === 0 ? 1.5 : 2;
      }
    } else if (this.betValue === 'Green') {
      if (roundResult.number === 1 || roundResult.number === 3 || 
          roundResult.number === 5 || roundResult.number === 7 || 
          roundResult.number === 9) {
        isWin = true;
        // Reduced payout for Green when it's also Violet (number 5)
        winMultiplier = roundResult.number === 5 ? 1.5 : 2;
      }
    } else if (this.betValue === 'Violet') {
      if (roundResult.number === 0 || roundResult.number === 5) {
        isWin = true;
        winMultiplier = 4.5;
      }
    }
  } else if (this.betType === 'number') {
    // Handle number bets
    if (Number(this.betValue) === roundResult.number) {
      isWin = true;
      winMultiplier = 9;
    }
  } else if (this.betType === 'bigsmall') {
    // Handle big/small bets
    const resultBigSmall = roundResult.number >= 5 ? 'Big' : 'Small';
    if (this.betValue === resultBigSmall) {
      isWin = true;
      winMultiplier = 2;
    }
  }

  // Update bet status and win amount
  if (isWin) {
    this.status = 'won';
    this.winAmount = this.effectiveAmount * winMultiplier;
  } else {
    this.status = 'lost';
    this.winAmount = 0;
  }

  return {
    isWin,
    winAmount: this.winAmount
  };
};

const NummaBet = mongoose.model('NummaBet', NummaBetSchema);

module.exports = NummaBet;
