const mongoose = require('mongoose');

const currencySettingsSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    default: '🪙', 
    required: true 
  },
  name: { 
    type: String, 
    default: 'Game Coin', 
    required: true 
  },
  conversionRate: { 
    type: Number, 
    default: 1.0, 
    required: true, 
    min: 0.000001 
  },
  baseCurrency: { 
    type: String, 
    default: 'USD', 
    required: true,
    enum: ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'CNY', 'AUD']
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('CurrencySettings', currencySettingsSchema);
