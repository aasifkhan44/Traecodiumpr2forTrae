const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Sample users data
const users = [
  {
    name: 'Admin User',
    countryCode: '+91',
    mobile: '9876543210',
    password: 'admin123',
    role: 'admin',
    balance: 1000,
    isVerified: true,
    isActive: true
  },
  {
    name: 'Test User 1',
    countryCode: '+91',
    mobile: '9876543211',
    password: 'test123',
    role: 'user',
    balance: 500,
    isVerified: true,
    isActive: true
  },
  {
    name: 'Test User 2',
    countryCode: '+44',
    mobile: '8765432109',
    password: 'test123',
    role: 'user',
    balance: 250,
    isVerified: true,
    isActive: true
    // referredBy will be set after users are created
  }
];

// Sample games data
const games = [
  {
    roundId: 'G1001',
    roundNumber: 1,
    startTime: new Date(),
    endTime: new Date(Date.now() + 60000),
    status: 'completed',
    result: 'green',
    participants: []
  },
  {
    roundId: 'G1002',
    roundNumber: 2,
    startTime: new Date(Date.now() + 60000),
    endTime: new Date(Date.now() + 120000),
    status: 'completed',
    result: 'red',
    participants: []
  },
  {
    roundId: 'G1003',
    roundNumber: 3,
    startTime: new Date(Date.now() + 120000),
    endTime: new Date(Date.now() + 180000),
    status: 'active',
    participants: []
  }
];

// Seed the database
const seedDatabase = async () => {
  try {
    // Connect to database directly using the connection string
    const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected for seeding');

    // Drop and recreate collections to handle schema changes
    console.log('Dropping collections to handle schema changes...');
    try {
      await mongoose.connection.db.dropCollection('users');
      console.log('Users collection dropped');
    } catch (err) {
      console.log('No users collection to drop');
    }
    
    try {
      await mongoose.connection.db.dropCollection('games');
      console.log('Games collection dropped');
    } catch (err) {
      console.log('No games collection to drop');
    }
    
    console.log('Database cleared');

    // Create users with hashed passwords
    const createdUsers = [];
    
    for (const user of users) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      // Create referral code
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create user
      const newUser = await User.create({
        ...user,
        password: hashedPassword,
        referralCode
      });
      
      createdUsers.push(newUser);
    }
    
    console.log('Users seeded');
    
    // Update referredBy with actual user ID
    if (createdUsers.length >= 3) {
      await User.findByIdAndUpdate(
        createdUsers[2]._id,
        { referredBy: createdUsers[1]._id }
      );
      
      console.log('Referral relationships updated');
    }

    // Create games and attach participants
    const createdGames = [];
    
    for (const game of games) {
      // Create random participants for completed games
      if (game.status === 'completed') {
        // Add test users as participants
        game.participants = [
          { 
            user: createdUsers[1]._id, 
            betAmount: Math.floor(Math.random() * 50) + 10,
            betColor: game.result,
            winAmount: game.result === 'green' ? (Math.floor(Math.random() * 50) + 10) * 2 : 0
          },
          { 
            user: createdUsers[2]._id, 
            betAmount: Math.floor(Math.random() * 30) + 5,
            betColor: game.result === 'green' ? 'red' : 'green',
            winAmount: 0
          }
        ];
      }
      
      const newGame = await Game.create(game);
      createdGames.push(newGame);
    }
    
    console.log('Games seeded');
    
    console.log('Database seeded successfully');
    process.exit();
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
