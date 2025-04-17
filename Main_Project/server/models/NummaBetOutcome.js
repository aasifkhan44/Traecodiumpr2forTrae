const mongoose = require('mongoose');

const nummaBetOutcomeSchema = new mongoose.Schema({
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    required: true
  },
  outcomeTotals: {
    type: Map,
    of: Number,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const NummaBetOutcome = mongoose.model('NummaBetOutcome', nummaBetOutcomeSchema);

module.exports = NummaBetOutcome;
