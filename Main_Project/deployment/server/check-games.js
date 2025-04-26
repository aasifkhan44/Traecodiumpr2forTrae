// Script to check games in the database
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      const games = await Game.find();
      console.log('Games in database:', games.length);
      console.log(JSON.stringify(games, null, 2));
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));