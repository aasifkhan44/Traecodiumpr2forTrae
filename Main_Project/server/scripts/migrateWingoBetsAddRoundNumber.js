// Script to migrate old WingoBet documents to add missing roundNumber/duration fields
// Usage: node server/scripts/migrateWingoBetsAddRoundNumber.js

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const WingoBet = require('../models/WingoBet');
const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment variables.');
  process.exit(1);
}

const roundModels = {
  1: WingoRound1m,
  3: WingoRound3m,
  5: WingoRound5m,
  10: WingoRound10m
};

async function migrate() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Find all bets missing roundNumber or duration
  const bets = await WingoBet.find({ $or: [ { roundNumber: { $exists: false } }, { duration: { $exists: false } } ] });
  console.log(`Found ${bets.length} bets to migrate.`);

  let updated = 0;
  for (const bet of bets) {
    // Try to find the round in any collection (by roundId)
    let found = false;
    for (const [duration, Model] of Object.entries(roundModels)) {
      const round = await Model.findById(bet.roundId);
      if (round) {
        bet.roundNumber = round.roundNumber;
        bet.duration = round.duration;
        await bet.save();
        updated++;
        found = true;
        break;
      }
    }
    if (!found) {
      console.warn(`No round found for bet ${bet._id} (roundId: ${bet.roundId})`);
    }
  }

  console.log(`Migration complete. Updated ${updated} bets.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
