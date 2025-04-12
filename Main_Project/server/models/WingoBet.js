const mongoose = require('mongoose');

const wingoBetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5, 10]
  },
  betType: {
    type: String,
    enum: ['color', 'number'],
    required: true
  },
  betValue: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        if (this.betType === 'color') {
          return ['Red', 'Violet', 'Green'].includes(v);
        } else if (this.betType === 'number') {
          return /^[0-9]$/.test(v);
        }
        return false;
      },
      message: 'Invalid bet value for the selected bet type'
    }
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Bet amount must be at least 1']
  },
  potential: {
    type: Number,
    required: true,
    default: function() {
      return this.betType === 'color' ? 2 : 10;
    }
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost'],
    default: 'pending'
  },
  winAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
wingoBetSchema.index({ userId: 1, roundId: 1 });
wingoBetSchema.index({ roundId: 1, status: 1 });

const WingoBet = mongoose.model('WingoBet', wingoBetSchema);

module.exports = WingoBet;