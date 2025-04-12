const mongoose = require('mongoose');

const wingoRoundSchema = new mongoose.Schema({
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5, 10], // Duration in minutes
    validate: {
      validator: function(v) {
        return [1, 3, 5, 10].includes(v);
      },
      message: 'Duration must be one of: 1, 3, 5, or 10 minutes'
    }
  },
  roundNumber: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'completed'],
    default: 'open'
  },
  result: {
    color: {
      type: String,
      enum: ['Red', 'Violet', 'Green'],
      required: false
    },
    number: {
      type: Number,
      min: 0,
      max: 9,
      required: false
    }
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  isControlled: {
    type: Boolean,
    default: false
  },
  controlledResult: {
    color: {
      type: String,
      enum: ['Red', 'Violet', 'Green'],
      required: false
    },
    number: {
      type: Number,
      min: 0,
      max: 9,
      required: false
    }
  }
}, {
  timestamps: true
});

// Ensure only one active round per duration
wingoRoundSchema.index({ duration: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });

// Create collections for different durations
const WingoRound1m = mongoose.model('WingoRound1m', wingoRoundSchema);
const WingoRound3m = mongoose.model('WingoRound3m', wingoRoundSchema);
const WingoRound5m = mongoose.model('WingoRound5m', wingoRoundSchema);
const WingoRound10m = mongoose.model('WingoRound10m', wingoRoundSchema);

module.exports = {
  WingoRound1m,
  WingoRound3m,
  WingoRound5m,
  WingoRound10m
};