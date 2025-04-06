const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Game = require('../models/Game');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to database directly using the connection string
    const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected for testing');

    // Create an admin user directly
    console.log('Creating admin user...');
    
    // Clean up first
    await User.deleteOne({ mobile: '9876543210', countryCode: '+91' });
    
    // Hash the password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Create admin user with the hashed password
    const adminUser = new User({
      name: 'Admin User',
      countryCode: '+91',
      mobile: '9876543210',
      password: hashedPassword,
      role: 'admin',
      balance: 1000,
      isVerified: true,
      isActive: true,
      referralCode: 'ADMIN123'
    });
    
    // Save without triggering pre-save hooks
    await adminUser.save({ validateBeforeSave: false });
    
    // Test the password match function
    console.log('Testing password match...');
    const user = await User.findOne({ mobile: '9876543210', countryCode: '+91' }).select('+password');
    
    if (!user) {
      console.log('Failed to find the admin user we just created');
      process.exit(1);
    }
    
    const isMatch = await user.matchPassword('admin123');
    console.log('Password match result:', isMatch);
    
    if (isMatch) {
      console.log('Admin user created successfully and password verified!');
    } else {
      console.log('Password verification failed!');
    }
    
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error(`Error:`, error);
    process.exit(1);
  }
};

seedDatabase();
