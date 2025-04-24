// Main_Project/server/seed/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Game = require('../models/Game');
const SiteSettings = require('../models/SiteSettings');
const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');
const { NummaRound1m, NummaRound3m, NummaRound5m } = require('../models/NummaRound');
// Add more models if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traecodiumpr2';

async function seed() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // --- Clear existing data ---
  await User.deleteMany({});
  await Game.deleteMany({});
  await SiteSettings.deleteMany({});
  await WingoRound1m.deleteMany({});
  await WingoRound3m.deleteMany({});
  await WingoRound5m.deleteMany({});
  await WingoRound10m.deleteMany({});
  await NummaRound1m.deleteMany({});
  await NummaRound3m.deleteMany({});
  await NummaRound5m.deleteMany({});

  // --- Sample Users ---
  const users = [
    {
      name: 'Admin User',
      countryCode: '+1',
      mobile: '1000000000',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      balance: 10000,
      referralCode: 'ADMIN100'
    },
    {
      name: 'Test User',
      countryCode: '+1',
      mobile: '2000000000',
      email: 'user@example.com',
      password: await bcrypt.hash('user123', 10),
      role: 'user',
      balance: 5000,
      referralCode: 'USER200'
    }
  ];
  await User.insertMany(users);

  // --- Sample Games ---
  const games = [
    {
      name: 'Numma',
      identifier: 'Numma',
      isActive: true,
      isDefault: true,
      description: 'Numma betting game',
      cardImageUrl: 'https://yourdomain.com/static/numma.png',
      thumbnailUrl: 'https://yourdomain.com/static/numma_thumb.png',
      settings: {}
    },
    {
      name: 'Wingo',
      identifier: 'Wingo',
      isActive: true,
      isDefault: false,
      description: 'Wingo betting game',
      cardImageUrl: 'https://yourdomain.com/static/wingo.png',
      thumbnailUrl: 'https://yourdomain.com/static/wingo_thumb.png',
      settings: {}
    }
  ];
  await Game.insertMany(games);

  // --- Site Settings ---
  await SiteSettings.create({
    siteName: 'Numma Platform',
    domain: 'https://yourdomain.com',
    logoUrl: 'https://yourdomain.com/static/logo.png',
    faviconUrl: 'https://yourdomain.com/static/favicon.ico'
  });

  // --- Seed Initial Wingo Rounds ---
  const now = new Date();
  const wingoRounds = [
    { duration: 1, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 1*60000), status: 'open' },
    { duration: 3, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 3*60000), status: 'open' },
    { duration: 5, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 5*60000), status: 'open' },
    { duration: 10, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 10*60000), status: 'open' }
  ];
  await WingoRound1m.create(wingoRounds[0]);
  await WingoRound3m.create(wingoRounds[1]);
  await WingoRound5m.create(wingoRounds[2]);
  await WingoRound10m.create(wingoRounds[3]);

  // --- Seed Initial Numma Rounds ---
  const nummaRounds = [
    { duration: 1, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 1*60000), status: 'active' },
    { duration: 3, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 3*60000), status: 'active' },
    { duration: 5, roundNumber: 1001, startTime: now, endTime: new Date(now.getTime() + 5*60000), status: 'active' }
  ];
  await NummaRound1m.create(nummaRounds[0]);
  await NummaRound3m.create(nummaRounds[1]);
  await NummaRound5m.create(nummaRounds[2]);

  // Add more seeders for other models if needed (e.g., PaymentMethod, CurrencySettings, etc.)

  console.log('Database seeded with sample data!');
  await mongoose.disconnect();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
