// Database seeder script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const PaymentMethod = require('./models/PaymentMethod');
const CommissionSetting = require('./models/CommissionSetting');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Delete all data
const clearData = async () => {
  try {
    console.log('Clearing existing data...');
    // Only delete payment methods and commission settings (not users or game data)
    await PaymentMethod.deleteMany({});
    await CommissionSetting.deleteMany({});
    console.log('Data cleared successfully');
  } catch (err) {
    console.error('Error clearing data:', err.message);
    process.exit(1);
  }
};

// Create admin user if it doesn't exist
const createAdminUser = async () => {
  try {
    console.log('Checking for admin user...');
    
    // Check if admin already exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user with default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = new User({
      mobile: '9876543210', // Default admin phone number
      countryCode: '+91', // India country code
      password: hashedPassword,
      name: 'Admin User',
      isAdmin: true,
      balance: 1000,
      isActive: true
    });
    
    await admin.save();
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err.message);
  }
};

// Seed payment methods
const seedPaymentMethods = async () => {
  try {
    console.log('Seeding payment methods...');
    
    // UPI Payment Methods
    const upiMethods = [
      {
        type: 'upi',
        name: 'Google Pay',
        identifier: 'example@okbank',
        description: 'Fast UPI payments via Google Pay',
        currency: 'INR',
        conversionRate: 100, // 1 INR = 100 coins
        isActive: true
      },
      {
        type: 'upi',
        name: 'PhonePe',
        identifier: 'gameadmin@ybl',
        description: 'Secure payments via PhonePe',
        currency: 'INR',
        conversionRate: 100, // 1 INR = 100 coins
        isActive: true
      },
      {
        type: 'upi',
        name: 'Paytm',
        identifier: 'payment@paytm',
        description: 'Pay using Paytm UPI',
        currency: 'INR',
        conversionRate: 105, // 1 INR = 105 coins (special rate)
        isActive: true
      }
    ];
    
    // Cryptocurrency Payment Methods
    const cryptoMethods = [
      {
        type: 'crypto',
        name: 'Bitcoin',
        identifier: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
        description: 'Send payments via Bitcoin network',
        currency: 'BTC',
        conversionRate: 5000000, // 1 BTC = 5,000,000 coins
        isActive: true
      },
      {
        type: 'crypto',
        name: 'Ethereum',
        identifier: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        description: 'Send payments via Ethereum network',
        currency: 'ETH',
        conversionRate: 350000, // 1 ETH = 350,000 coins
        isActive: true
      },
      {
        type: 'crypto',
        name: 'USDT (Tether)',
        identifier: 'TYKJtHMX7WfTuZXzBYBgKvkzCn7ggJK6xU',
        description: 'USDT on Tron Network (TRC20)',
        currency: 'USDT',
        conversionRate: 110, // 1 USDT = 110 coins
        isActive: true
      }
    ];
    
    // Insert all payment methods
    await PaymentMethod.insertMany([...upiMethods, ...cryptoMethods]);
    
    console.log('Payment methods seeded successfully');
  } catch (err) {
    console.error('Error seeding payment methods:', err.message);
  }
};

// Seed referral commission settings
const seedCommissionSettings = async () => {
  try {
    console.log('Seeding commission settings...');
    
    const commissionSettings = [
      {
        level: 1,
        percentage: 10, // 10% commission for level 1 referrals
        description: 'Direct referral bonus',
        isActive: true
      },
      {
        level: 2,
        percentage: 5, // 5% commission for level 2 referrals
        description: 'Secondary referral bonus',
        isActive: true
      },
      {
        level: 3,
        percentage: 2, // 2% commission for level 3 referrals
        description: 'Tertiary referral bonus',
        isActive: true
      }
    ];
    
    await CommissionSetting.insertMany(commissionSettings);
    
    console.log('Commission settings seeded successfully');
  } catch (err) {
    console.error('Error seeding commission settings:', err.message);
  }
};

// Run the seeder
const runSeeder = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Clean data if requested (using --clean flag)
    if (process.argv.includes('--clean')) {
      await clearData();
    }
    
    // Seed data
    await createAdminUser();
    await seedPaymentMethods();
    await seedCommissionSettings();
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error running seeder:', err.message);
    process.exit(1);
  }
};

// Run the seeder
runSeeder();
