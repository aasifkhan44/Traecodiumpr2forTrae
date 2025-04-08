// Sample Data Seeder Script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PaymentMethod = require('../models/PaymentMethod');
const WithdrawalSettings = require('../models/WithdrawalSettings');
const CommissionSetting = require('../models/CommissionSetting');
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

// Check if force flag is provided
const forceRecreate = process.argv.includes('--force');

// Create sample users
const createSampleUsers = async () => {
  try {
    console.log('Creating sample users...');
    
    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0 && !forceRecreate) {
      console.log(`${existingUsers} users already exist. Skipping user creation.`);
      return;
    }
    
    if (forceRecreate) {
      // Only delete sample users, not all users
      console.log('Force flag detected. Removing existing sample users...');
      await User.deleteMany({
        $or: [
          { mobile: { $in: ['9876543210', '1234567890', '2345678901', '8765432109', '6543210987'] } },
          { email: { $in: ['admin@example.com', 'john@example.com', 'jane@example.com', 'raj@example.com', 'maria@example.com'] } }
        ]
      });
      console.log('Existing sample users removed.');
    }
    
    // Sample users data
    const users = [
      // Admin user
      {
        name: 'Admin User',
        countryCode: '+91',
        mobile: '9876543210',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        balance: 10000,
        isActive: true
      },
      // Regular users
      {
        name: 'John Doe',
        countryCode: '+1',
        mobile: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
        balance: 5000,
        isActive: true
      },
      {
        name: 'Jane Smith',
        countryCode: '+44',
        mobile: '2345678901',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
        balance: 2500,
        isActive: true
      },
      {
        name: 'Raj Kumar',
        countryCode: '+91',
        mobile: '8765432109',
        email: 'raj@example.com',
        password: 'password123',
        role: 'user',
        balance: 1000,
        isActive: true
      },
      {
        name: 'Maria Garcia',
        countryCode: '+34',
        mobile: '6543210987',
        email: 'maria@example.com',
        password: 'password123',
        role: 'user',
        balance: 3000,
        isActive: true
      }
    ];
    
    // Create users with hashed passwords and referral codes
    const createdUsers = [];
    
    for (const userData of users) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Generate unique referral code
      const referralCode = userData.name.substring(0, 3).toUpperCase() + 
                          Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Create user
      const newUser = new User({
        ...userData,
        password: hashedPassword,
        referralCode
      });
      
      await newUser.save();
      createdUsers.push(newUser);
      console.log(`Created user: ${newUser.name} (${newUser.role}) with referral code ${newUser.referralCode}`);
    }
    
    // Set up referral relationships
    // User 2 (John) referred by Admin
    await User.findByIdAndUpdate(
      createdUsers[1]._id,
      { referredBy: createdUsers[0]._id }
    );
    
    // User 3 (Jane) referred by John
    await User.findByIdAndUpdate(
      createdUsers[2]._id,
      { referredBy: createdUsers[1]._id }
    );
    
    // User 4 (Raj) referred by Jane
    await User.findByIdAndUpdate(
      createdUsers[3]._id,
      { referredBy: createdUsers[2]._id }
    );
    
    // User 5 (Maria) referred by Admin
    await User.findByIdAndUpdate(
      createdUsers[4]._id,
      { referredBy: createdUsers[0]._id }
    );
    
    console.log('Referral relationships established');
    console.log('Sample users created successfully');
  } catch (err) {
    console.error('Error creating sample users:', err.message);
  }
};

// Create sample payment methods
const createSamplePaymentMethods = async () => {
  try {
    console.log('Creating sample payment methods...');
    
    // Check if payment methods already exist
    const existingMethods = await PaymentMethod.countDocuments();
    if (existingMethods > 0 && !forceRecreate) {
      console.log(`${existingMethods} payment methods already exist. Skipping creation.`);
      return;
    }
    
    if (forceRecreate) {
      console.log('Force flag detected. Removing existing payment methods...');
      await PaymentMethod.deleteMany({});
      console.log('Existing payment methods removed.');
    }
    
    // UPI Payment Methods
    const upiMethods = [
      {
        type: 'upi',
        name: 'Google Pay',
        identifier: 'admin@okicici',
        description: 'Fast UPI payments via Google Pay',
        currency: 'INR',
        conversionRate: 100, // 1 INR = 100 coins
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M12 11v2h2v2H9v-4h3zm0-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/></svg>',
        displayOrder: 1
      },
      {
        type: 'upi',
        name: 'PhonePe',
        identifier: 'admin@ybl',
        description: 'Secure payments via PhonePe',
        currency: 'INR',
        conversionRate: 100, // 1 INR = 100 coins
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#5F259F" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        displayOrder: 2
      },
      {
        type: 'upi',
        name: 'Paytm',
        identifier: 'admin@paytm',
        description: 'Pay using Paytm UPI',
        currency: 'INR',
        conversionRate: 105, // 1 INR = 105 coins (special rate)
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#00BAF2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9v-6h2v6zm4 0h-2v-6h2v6z"/></svg>',
        displayOrder: 3
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
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F7931A" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2l-1-4 3-1.5L15 13l-2 3z"/></svg>',
        displayOrder: 4
      },
      {
        type: 'crypto',
        name: 'Ethereum',
        identifier: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        description: 'Send payments via Ethereum network',
        currency: 'ETH',
        conversionRate: 350000, // 1 ETH = 350,000 coins
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#627EEA" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15l-5-3 5 8 5-8-5 3z"/></svg>',
        displayOrder: 5
      },
      {
        type: 'crypto',
        name: 'USDT (Tether)',
        identifier: 'TYKJtHMX7WfTuZXzBYBgKvkzCn7ggJK6xU',
        description: 'USDT on Tron Network (TRC20)',
        currency: 'USDT',
        conversionRate: 110, // 1 USDT = 110 coins
        isActive: true,
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#26A17B" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>',
        displayOrder: 6
      }
    ];
    
    // Insert all payment methods
    await PaymentMethod.insertMany([...upiMethods, ...cryptoMethods]);
    
    console.log('Sample payment methods created successfully');
  } catch (err) {
    console.error('Error creating sample payment methods:', err.message);
  }
};

// Create sample withdrawal settings
const createWithdrawalSettings = async () => {
  try {
    console.log('Creating withdrawal settings...');
    
    // Check if withdrawal settings already exist
    const existingSettings = await WithdrawalSettings.findOne();
    if (existingSettings && !forceRecreate) {
      console.log('Withdrawal settings already exist. Skipping creation.');
      return;
    }
    
    if (forceRecreate && existingSettings) {
      console.log('Force flag detected. Removing existing withdrawal settings...');
      await WithdrawalSettings.deleteMany({});
      console.log('Existing withdrawal settings removed.');
    }
    
    // Create withdrawal settings
    const withdrawalSettings = new WithdrawalSettings({
      upiOptions: [
        {
          name: 'Google Pay',
          conversionRate: 0.01, // 100 coins = 1 INR
          withdrawalFee: 10,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        },
        {
          name: 'PhonePe',
          conversionRate: 0.01, // 100 coins = 1 INR
          withdrawalFee: 2,
          feeType: 'percent',
          imageUrl: '',
          isActive: true
        },
        {
          name: 'Paytm',
          conversionRate: 0.01, // 100 coins = 1 INR
          withdrawalFee: 5,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        }
      ],
      cryptoOptions: [
        {
          currency: 'USDT',
          conversionRate: 0.009, // 110 coins = 1 USDT
          withdrawalFee: 1,
          feeType: 'fixed',
          imageUrl: '',
          isActive: true
        },
        {
          currency: 'BTC',
          conversionRate: 0.0000002, // 5,000,000 coins = 1 BTC
          withdrawalFee: 0.5,
          feeType: 'percent',
          imageUrl: '',
          isActive: true
        },
        {
          currency: 'ETH',
          conversionRate: 0.000003, // 350,000 coins = 1 ETH
          withdrawalFee: 0.5,
          feeType: 'percent',
          imageUrl: '',
          isActive: true
        }
      ],
      minimumWithdrawalAmount: 500, // Minimum 500 coins
      maximumWithdrawalAmount: 50000, // Maximum 50,000 coins
      withdrawalInstructions: 'Please ensure you provide the correct UPI ID or crypto address for withdrawal. Withdrawals are processed within 24 hours. Minimum withdrawal amount is 500 coins.',
      upiWithdrawalActive: true,
      cryptoWithdrawalActive: true
    });
    
    await withdrawalSettings.save();
    console.log('Withdrawal settings created successfully');
  } catch (err) {
    console.error('Error creating withdrawal settings:', err.message);
  }
};

// Create commission settings
const createCommissionSettings = async () => {
  try {
    console.log('Creating commission settings...');
    
    // Check if commission settings already exist
    const existingSettings = await CommissionSetting.countDocuments();
    if (existingSettings > 0 && !forceRecreate) {
      console.log(`${existingSettings} commission settings already exist. Skipping creation.`);
      return;
    }
    
    if (forceRecreate) {
      console.log('Force flag detected. Removing existing commission settings...');
      await CommissionSetting.deleteMany({});
      console.log('Existing commission settings removed.');
    }
    
    // Create commission settings
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
    console.log('Commission settings created successfully');
  } catch (err) {
    console.error('Error creating commission settings:', err.message);
  }
};

// Run the seeder
const runSeeder = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Create sample data
    await createSampleUsers();
    await createSamplePaymentMethods();
    await createWithdrawalSettings();
    await createCommissionSettings();
    
    console.log('Sample data seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error running seeder:', err.message);
    process.exit(1);
  }
};

// Execute the seeder
runSeeder();