const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema(
  {
    roundId: {
      type: String,
      required: true,
      unique: true
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
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    },
    result: {
      color: {
        type: String,
        enum: ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'black'],
        default: null
      },
      number: {
        type: Number,
        default: null
      }
    },
    totalBetAmount: {
      type: Number,
      default: 0
    },
    totalPayout: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Generate round ID before saving
GameSchema.pre('save', function(next) {
  if (!this.roundId) {
    // Generate a unique round ID with date (YYYYMMDD) and sequence number
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0');
    
    // Add random 4 digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.roundId = `${dateStr}${randomNum}`;
  }
  next();
});

module.exports = mongoose.model('Game', GameSchema);
