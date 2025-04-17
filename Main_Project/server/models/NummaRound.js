const mongoose = require('mongoose');

const NummaRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: String,
    required: true,
    unique: true
  },
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5] // Duration in minutes
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  result: {
    number: {
      type: Number,
      min: 0,
      max: 9
    },
    color: {
      type: String,
      enum: ['Red', 'Green', 'Violet', 'Red+Violet', 'Green+Violet']
    },
    bigSmall: {
      type: String,
      enum: ['Big', 'Small']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  isManualResult: {
    type: Boolean,
    default: false
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  totalPayout: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to determine color based on number
NummaRoundSchema.methods.getColorFromNumber = function(number) {
  if (number === 0) return 'Red+Violet';
  if (number === 5) return 'Green+Violet';
  if (number % 2 === 0) return 'Red'; // Even numbers (except 0, 5) are Red
  return 'Green'; // Odd numbers (except 5) are Green
};

// Helper method to determine big/small based on number
NummaRoundSchema.methods.getBigSmallFromNumber = function(number) {
  return number >= 5 ? 'Big' : 'Small';
};

// Method to set result based on number
NummaRoundSchema.methods.setResultFromNumber = function(number) {
  if (number < 0 || number > 9) {
    throw new Error('Number must be between 0 and 9');
  }
  
  this.result = {
    number,
    color: this.getColorFromNumber(number),
    bigSmall: this.getBigSmallFromNumber(number)
  };
  
  return this.result;
};

// Create separate models for each duration
const NummaRound1m = mongoose.model('NummaRound1m', NummaRoundSchema);
const NummaRound3m = mongoose.model('NummaRound3m', NummaRoundSchema);
const NummaRound5m = mongoose.model('NummaRound5m', NummaRoundSchema);

module.exports = {
  NummaRound1m,
  NummaRound3m,
  NummaRound5m,
  NummaRoundSchema
};
