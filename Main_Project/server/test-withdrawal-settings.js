const mongoose = require('mongoose');
const WithdrawalSettings = require('./models/WithdrawalSettings');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/color-prediction-game')
  .then(async () => {
    try {
      console.log('Connected to MongoDB');
      
      // Get current settings
      let settings = await WithdrawalSettings.getSettings();
      
      // If we're in development and get plain object, create new document
      if (process.env.NODE_ENV === 'development' && !(settings instanceof mongoose.Document)) {
        console.log('Creating new settings document for development');
        settings = new WithdrawalSettings({
          withdrawalFee: 10,
          feeType: 'percentage',
          paymentOptions: ['upi', 'crypto'],
          minimumWithdrawalAmount: 100,
          maximumWithdrawalAmount: 10000
        });
      }
      
      console.log('Current settings:', JSON.stringify(settings, null, 2));
      console.log('Is Document:', settings instanceof mongoose.Document);
      
      // Check if we're in development mode
      console.log('NODE_ENV:', process.env.NODE_ENV);
      
      // Log the structure of the settings object
      console.log('Settings _id:', settings._id);
      console.log('Settings structure:', Object.keys(settings));
      
      // Try to save the settings
      try {
        console.log('Attempting to save settings...');
        const savedSettings = await settings.save();
        console.log('Settings saved successfully:', savedSettings);
      } catch (error) {
        console.error('Save error:', error);
        console.log('Validation errors:', error.errors);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });