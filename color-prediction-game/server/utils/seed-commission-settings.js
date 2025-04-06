const mongoose = require('mongoose');
require('dotenv').config();

// Models
const CommissionSetting = require('../models/CommissionSetting');

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Default commission settings
const defaultSettings = [
  {
    level: 1,
    percentage: 10,
    isActive: true,
    description: 'Direct referral (Level 1) - 10% commission'
  },
  {
    level: 2,
    percentage: 5,
    isActive: true,
    description: 'Indirect referral (Level 2) - 5% commission'
  },
  {
    level: 3,
    percentage: 3,
    isActive: true,
    description: 'Indirect referral (Level 3) - 3% commission'
  },
  {
    level: 4,
    percentage: 2,
    isActive: true,
    description: 'Indirect referral (Level 4) - 2% commission'
  },
  {
    level: 5,
    percentage: 1,
    isActive: true,
    description: 'Indirect referral (Level 5) - 1% commission'
  },
  {
    level: 6,
    percentage: 0.5,
    isActive: true,
    description: 'Indirect referral (Level 6) - 0.5% commission'
  },
  {
    level: 7,
    percentage: 0.5,
    isActive: true,
    description: 'Indirect referral (Level 7) - 0.5% commission'
  },
  {
    level: 8,
    percentage: 0.3,
    isActive: true,
    description: 'Indirect referral (Level 8) - 0.3% commission'
  },
  {
    level: 9,
    percentage: 0.2,
    isActive: true,
    description: 'Indirect referral (Level 9) - 0.2% commission'
  },
  {
    level: 10,
    percentage: 0.1,
    isActive: true,
    description: 'Indirect referral (Level 10) - 0.1% commission'
  }
];

// Seed database
const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Delete existing commission settings
    await CommissionSetting.deleteMany({});
    console.log('Deleted existing commission settings');
    
    // Insert default settings
    const createdSettings = await CommissionSetting.insertMany(defaultSettings);
    console.log(`Inserted ${createdSettings.length} commission settings`);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
