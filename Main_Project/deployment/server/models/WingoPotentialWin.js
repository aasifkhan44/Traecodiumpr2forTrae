const mongoose = require('mongoose');

const WingoPotentialWinSchema = new mongoose.Schema({
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'WingoRound1m' // This will be updated based on duration
  },
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5, 10]
  },
  color: {
    type: String,
    enum: ['Red', 'Violet', 'Green'],
    required: function() { return this.number === undefined || this.number === null; }
  },
  number: {
    type: Number,
    min: 0,
    max: 9,
    required: function() { return this.color === undefined || this.color === null; }
  },
  potentialWin: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

WingoPotentialWinSchema.index({ roundId: 1, color: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('WingoPotentialWin', WingoPotentialWinSchema);
