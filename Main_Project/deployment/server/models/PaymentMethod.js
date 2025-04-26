const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['upi', 'crypto'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  identifier: {
    type: String,
    required: true,
    trim: true
  },
  svgCode: {
    type: String,
    default: '',
    description: 'SVG image code for this payment method'
  },
  description: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: 'INR' // Default for UPI, will be cryptocurrency code for crypto
  },
  conversionRate: {
    type: Number,
    default: 1.0,
    required: true,
    min: 0.000001,
    description: 'How many game coins (🪙) per unit of currency'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create compound index for unique identifiers by type
PaymentMethodSchema.index({ type: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);
