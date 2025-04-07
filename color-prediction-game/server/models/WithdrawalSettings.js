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
        svgCode: {
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
        svgCode: {
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
          svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-3.5-8v-4l7 3-7 3z"/></svg>',
          isActive: true
        }
      ],
      cryptoOptions: [
        {
          currency: 'USDT',
          conversionRate: 1000,
          withdrawalFee: 5,
          feeType: 'fixed',
          svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
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