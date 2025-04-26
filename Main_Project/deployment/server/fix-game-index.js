// Script to fix game index and add missing games
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // First, check existing games
      const existingGames = await Game.find();
      console.log(`Found ${existingGames.length} existing games`);
      
      // Drop the problematic roundId index
      console.log('Dropping roundId index...');
      const db = mongoose.connection;
      try {
        await db.collection('games').dropIndex('roundId_1');
        console.log('Successfully dropped roundId index');
      } catch (indexErr) {
        console.log('Error dropping index (may not exist):', indexErr.message);
      }
      
      // Define all games that should exist
      const games = [
        {
          identifier: 'Wingo',
          name: 'Wingo',
          description: 'Classic Wingo game with colorful balls and exciting multipliers',
          isActive: true,
          isDefault: true,
          settings: {
            minBet: 100,
            maxBet: 10000,
            colors: ['red', 'green', 'violet']
          }
        },
        {
          identifier: 'K3',
          name: 'K3',
          description: 'Fast-paced dice game with multiple betting options',
          isActive: true,
          isDefault: false,
          settings: {
            minBet: 50,
            maxBet: 5000,
            diceCount: 3
          }
        },
        {
          identifier: '5D',
          name: '5D',
          description: '5-digit lottery game with various betting combinations',
          isActive: true,
          isDefault: false,
          settings: {
            minBet: 100,
            maxBet: 10000,
            digits: 5
          }
        },
        {
          identifier: 'WingoTrx',
          name: 'Wingo TRX',
          description: 'Wingo variant optimized for TRX cryptocurrency',
          isActive: true,
          isDefault: false,
          settings: {
            minBet: 10,
            maxBet: 1000,
            currency: 'TRX'
          }
        },
        {
          identifier: 'Ludo',
          name: 'Ludo',
          description: 'Classic board game with multiplayer support',
          isActive: true,
          isDefault: false,
          settings: {
            minPlayers: 2,
            maxPlayers: 4,
            boardSize: 52
          }
        },
        {
          identifier: 'Chess',
          name: 'Chess',
          description: 'Strategic board game with competitive matchmaking',
          isActive: true,
          isDefault: false,
          settings: {
            timeControl: true,
            defaultTimeMinutes: 10,
            incrementSeconds: 5
          }
        },
        {
          identifier: 'Numma',
          name: 'Numma',
          description: 'Number guessing game with progressive jackpot',
          isActive: true,
          isDefault: false,
          settings: {
            minBet: 50,
            maxBet: 5000,
            numberRange: [1, 100]
          }
        },
        {
          identifier: 'FortuneWheel',
          name: 'Fortune Wheel',
          description: 'Spin the wheel of fortune for amazing prizes',
          isActive: true,
          isDefault: false,
          settings: {
            minBet: 100,
            maxBet: 10000,
            segments: 12
          }
        }
      ];
      
      // For each game in our list, check if it exists and create if it doesn't
      for (const gameData of games) {
        const existingGame = await Game.findOne({ identifier: gameData.identifier });
        
        if (existingGame) {
          console.log(`Game ${gameData.name} already exists, skipping...`);
          continue;
        }
        
        // Create the game
        const newGame = new Game(gameData);
        await newGame.save();
        console.log(`Created game: ${gameData.name}`);
      }
      
      // Verify all games are now in the database
      const updatedGames = await Game.find();
      console.log(`Now have ${updatedGames.length} games in the database`);
      console.log('Game identifiers:', updatedGames.map(g => g.identifier).join(', '));
      
    } catch (err) {
      console.error('Error fixing games:', err);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));