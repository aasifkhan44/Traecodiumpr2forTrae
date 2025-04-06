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
        upiId: {
          type: String,
          required: true,
          trim: true
        },
        isActive: {
          type: Boolean,
          default: true
        },
        withdrawalFee: {
          type: Number,
          default: 0,
          min: 0
        },
        svgCode: {
          type: String,
          default: ''
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
        address: {
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
        isActive: {
          type: Boolean,
          default: true
        },
        svgCode: {
          type: String,
          default: ''
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
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    // For production, try to fetch from database
    if (!isDev) {
      const settings = await this.findOne();
      if (settings) {
        return settings;
      }
    }

    // For development or if no settings found in production, use default settings
    return {
      _id: new mongoose.Types.ObjectId(),
      upiOptions: [
        {
          name: 'Main UPI',
          upiId: 'withdrawal@upi',
          isActive: true,
          withdrawalFee: 2,
          svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-3.5-8v-4l7 3-7 3z"/></svg>'
        }
      ],
      cryptoOptions: [
        {
          currency: 'USDT',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          conversionRate: 1000, // 1 USDT = 1000 game currency
          withdrawalFee: 5,
          isActive: true,
          svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-3.5-8v-4l7 3-7 3z"/></svg>'
        }
      ],
      minimumWithdrawalAmount: 100,
      maximumWithdrawalAmount: 10000,
      withdrawalInstructions: 'Please ensure you provide the correct UPI ID or crypto address for withdrawal. Withdrawals are processed within 24 hours.',
      upiWithdrawalActive: true,
      cryptoWithdrawalActive: true
    };
  } catch (error) {
    console.error('Error fetching withdrawal settings:', error);
    throw error;
  }
};

module.exports = mongoose.model('WithdrawalSettings', WithdrawalSettingsSchema);