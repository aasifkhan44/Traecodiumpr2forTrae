const mongoose = require('mongoose');

const DepositRequestSchema = new mongoose.Schema(
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
    paymentMode: {
      type: String,
      enum: ['upi', 'crypto'],
      required: true
    },
    paymentApp: {
      type: String,
      required: function() {
        return this.paymentMode === 'upi';
      }
    },
    upiId: {
      type: String,
      required: function() {
        return this.paymentMode === 'upi';
      }
    },
    cryptoCurrency: {
      type: String,
      required: function() {
        return this.paymentMode === 'crypto';
      }
    },
    cryptoAddress: {
      type: String,
      required: function() {
        return this.paymentMode === 'crypto';
      }
    },
    convertedAmount: {
      type: Number,
      required: true
    },
    referenceNumber: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
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

module.exports = mongoose.model('DepositRequest', DepositRequestSchema);
