const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    reference: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
