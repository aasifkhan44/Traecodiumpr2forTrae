const mongoose = require('mongoose');

const WithdrawalSettingsSchema = new mongoose.Schema(
  {
    upiOptions: [
      {
        name: {
          type: String,
          required: true,
          trim: true
        },
        conversionRate: {
          type: Number,
          required: true,
          default: 1
        },
        withdrawalFee: {
          type: Number,
          default: 0,
          min: 0
        },
        feeType: {
          type: String,
          enum: ['fixed', 'percent'],
          default: 'fixed'
        },
        imageUrl: {
          type: String,
          default: ''
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    cryptoOptions: [
      {
        currency: {
          type: String,
          required: true,
          trim: true
        },
        conversionRate: {
          type: Number,
          required: true,
          default: 1
        },
        withdrawalFee: {
          type: Number,
          default: 0,
          min: 0
        },
        feeType: {
          type: String,
          enum: ['fixed', 'percent'],
          default: 'fixed'
        },
        imageUrl: {
          type: String,
          default: ''
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    minimumWithdrawalAmount: {
      type: Number,
      default: 100
    },
    maximumWithdrawalAmount: {
      type: Number,
      default: 10000
    },
    withdrawalInstructions: {
      type: String,
      default: 'Please ensure you provide the correct UPI ID or crypto address for withdrawal. Withdrawals are processed within 24 hours.'
    },
    upiWithdrawalActive: {
      type: Boolean,
      default: true
    },
    cryptoWithdrawalActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Static method to get withdrawal settings
WithdrawalSettingsSchema.statics.getSettings = async function() {
  try {
    // Always try to fetch from database first, regardless of environment
    const settings = await this.findOne();
    if (settings) {
      return settings;
    }
    
    // If no settings found in database, create and save default settings
    const defaultSettings = new this({
      upiOptions: [
        {
          name: 'Main UPI',
          conversionRate: 1,
          withdrawalFee: 2,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        }
      ],
      cryptoOptions: [
        {
          currency: 'USDT',
          conversionRate: 1000,
          withdrawalFee: 5,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        }
      ],
      minimumWithdrawalAmount: 100,
      maximumWithdrawalAmount: 10000,
      withdrawalInstructions: 'Please ensure you provide the correct UPI ID or crypto address for withdrawal. Withdrawals are processed within 24 hours.',
      upiWithdrawalActive: true,
      cryptoWithdrawalActive: true
    });
    
    await defaultSettings.save();
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching withdrawal settings:', error);
    throw error;
  }
};

module.exports = mongoose.model('WithdrawalSettings', WithdrawalSettingsSchema);