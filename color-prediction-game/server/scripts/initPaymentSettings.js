const mongoose = require('mongoose');
const PaymentSettings = require('../models/PaymentSettings');

const initPaymentSettings = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/color-prediction-game', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create default payment settings
    const settings = await PaymentSettings.getSettings();

    if (!settings) {
      const defaultSettings = {
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
        depositInstructions: 'Please ensure you make the exact amount payment to the provided UPI ID or crypto address. ' +
                           'For UPI payments, use the reference number as the UTR number from your payment app. ' +
                           'For crypto payments, use the transaction hash as the reference number.'
      };

      const newSettings = new PaymentSettings(defaultSettings);
      await newSettings.save();
      console.log('Default payment settings created successfully');
    } else {
      console.log('Payment settings already exist');
    }

    // Close connection
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error initializing payment settings:', error);
    process.exit(1);
  }
};

initPaymentSettings();
