const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1']
    },
    withdrawalMode: {
      type: String,
      enum: ['upi', 'crypto'],
      required: true
    },
    upiId: {
      type: String,
      required: function() {
        return this.withdrawalMode === 'upi';
      }
    },
    cryptoCurrency: {
      type: String,
      required: function() {
        return this.withdrawalMode === 'crypto';
      }
    },
    cryptoAddress: {
      type: String,
      required: function() {
        return this.withdrawalMode === 'crypto';
      }
    },
    convertedAmount: {
      type: Number,
      required: function() {
        return this.withdrawalMode === 'crypto';
      }
    },
    withdrawalFee: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    transactionId: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    adminComment: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);