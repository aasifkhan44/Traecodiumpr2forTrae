const mongoose = require('mongoose');

const PaymentSettingsSchema = new mongoose.Schema(
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
    minimumDepositAmount: {
      type: Number,
      default: 100
    },
    maximumDepositAmount: {
      type: Number,
      default: 10000
    },
    depositInstructions: {
      type: String,
      default: 'Please ensure you make the exact amount payment to the provided UPI ID or crypto address. For UPI payments, use the reference number as the UTR number from your payment app. For crypto payments, use the transaction hash as the reference number.'
    }
  },
  { timestamps: true }
);

// Static method to get payment settings
PaymentSettingsSchema.statics.getSettings = async function() {
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
          name: 'Main Wallet',
          upiId: 'mainwallet@upi',
          isActive: true
        }
      ],
      cryptoOptions: [
        {
          currency: 'USDT',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          conversionRate: 1000, // 1 USDT = 1000 game currency
          isActive: true
        }
      ],
      minimumDepositAmount: 100,
      maximumDepositAmount: 10000,
      depositInstructions: 'Please ensure you make the exact amount payment to the provided UPI ID or crypto address. For UPI payments, use the reference number as the UTR number from your payment app. For crypto payments, use the transaction hash as the reference number.'
    };
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    throw error;
  }
};

module.exports = mongoose.model('PaymentSettings', PaymentSettingsSchema);
