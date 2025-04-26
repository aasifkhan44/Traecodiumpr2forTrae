const mongoose = require('mongoose');
const Game = require('../models/Game');
const path = require('path');
require('dotenv').config();

// Define placeholder image URLs using HTTPS links
const placeholderThumbnail = 'https://raw.githubusercontent.com/traecodium/game-assets/main/placeholders/game-thumbnail.svg';
const placeholderCard = 'https://raw.githubusercontent.com/traecodium/game-assets/main/placeholders/game-card.svg';

// Sample game data with proper settings
const games = [
  {
    name: 'Wingo',
    identifier: 'Wingo',
    description: 'Classic lottery game with colorful balls and exciting multipliers',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: true,
    isDefault: true
  },
  {
    name: 'K3 Lottery',
    identifier: 'K3',
    description: 'Fast-paced lottery game with three dice and multiple betting options',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: true,
    isDefault: false
  },
  {
    name: '5D Lottery',
    identifier: '5D',
    description: 'Five-digit lottery with various betting combinations',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Wingo TRX',
    identifier: 'WingoTrx',
    description: 'Cryptocurrency version of Wingo with TRON betting',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: false,
    isDefault: false
  },
  {
    name: 'Ludo',
    identifier: 'Ludo',
    description: 'Classic board game with multiplayer support',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: false,
    isDefault: false
  },
  {
    name: 'Chess',
    identifier: 'Chess',
    description: 'Strategic board game with competitive matchmaking',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: false,
    isDefault: false
  },
  {
    name: 'Numma',
    identifier: 'Numma',
    description: 'Number guessing game with progressive jackpot',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: false,
    isDefault: false
  },
  {
    name: 'Fortune Wheel',
    identifier: 'FortuneWheel',
    description: 'Spin the wheel of fortune for instant rewards',
    thumbnailUrl: placeholderThumbnail,
    cardImageUrl: placeholderCard,
    isActive: false,
    isDefault: false
  }
];

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

// Seed games
const seedGames = async () => {
  try {
    console.log('Seeding games...');
    
    // Clear existing games
    await Game.deleteMany({});
    console.log('Cleared existing games');
    
    // Insert new games
    await Game.insertMany(games);
    console.log('Games seeded successfully');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (err) {
    console.error('Error seeding games:', err.message);
    process.exit(1);
  }
};

// Run seeder
connectDB().then(() => {
  seedGames();
});