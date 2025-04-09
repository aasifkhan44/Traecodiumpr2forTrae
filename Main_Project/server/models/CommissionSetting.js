const mongoose = require('mongoose');

const CommissionSettingSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 10 // Support up to 10 levels
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommissionSetting', CommissionSettingSchema);
