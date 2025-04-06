const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const fixUsers = async () => {
  try {
    // Connect to database directly using the connection string
    const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected for user fix');

    // Clear existing users with these specific mobile numbers
    console.log('Removing old test users...');
    await User.deleteOne({ mobile: '9876543210' });
    await User.deleteOne({ mobile: '9876543211' });
    await User.deleteOne({ mobile: '8765432109' });
    
    // Create admin user
    console.log('Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await User.create({
      name: 'Admin User',
      countryCode: '+91',
      mobile: '9876543210',
      password: adminPassword,
      role: 'admin',
      balance: 1000,
      isVerified: true,
      isActive: true,
      referralCode: 'ADMIN123'
    });
    
    // Create test user 1
    console.log('Creating test user 1...');
    const user1Password = await bcrypt.hash('test123', salt);
    
    const user1 = await User.create({
      name: 'Test User 1',
      countryCode: '+91',
      mobile: '9876543211',
      password: user1Password,
      role: 'user',
      balance: 500,
      isVerified: true,
      isActive: true,
      referralCode: 'TEST123'
    });
    
    // Create test user 2
    console.log('Creating test user 2...');
    const user2Password = await bcrypt.hash('test123', salt);
    
    const user2 = await User.create({
      name: 'Test User 2',
      countryCode: '+44',
      mobile: '8765432109',
      password: user2Password,
      role: 'user',
      balance: 250,
      isVerified: true,
      isActive: true,
      referralCode: 'TEST456'
    });
    
    // Add referral relationship
    user2.referredBy = user1._id;
    await user2.save();
    
    // Test login for admin
    console.log('Testing admin login...');
    const adminUser = await User.findOne({ mobile: '9876543210' }).select('+password');
    const adminMatch = await adminUser.matchPassword('admin123');
    console.log('Admin password match:', adminMatch);
    
    // Test login for user
    console.log('Testing user login...');
    const testUser = await User.findOne({ mobile: '9876543211' }).select('+password');
    const userMatch = await testUser.matchPassword('test123');
    console.log('User password match:', userMatch);
    
    console.log('Users fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing users:', error);
    process.exit(1);
  }
};

fixUsers();
