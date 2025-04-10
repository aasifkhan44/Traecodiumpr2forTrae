const Game = require('../models/Game');

// Get all games
exports.getAllGames = async (req, res) => {
  try {
    const games = await Game.find().select('-__v');
    res.json(games);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single game
exports.getGame = async (req, res) => {
  try {
    const game = await Game.findOne({ identifier: req.params.identifier }).select('-__v');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update game settings
exports.updateGame = async (req, res) => {
  try {
    const updates = req.body;
    const identifier = req.params.identifier;

    // Find game by exact identifier match
    let game = await Game.findOne({ identifier: { $regex: `^${identifier}$`, $options: 'i' } });
    
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Apply updates and let Mongoose validation handle the URL format
    Object.keys(updates).forEach(key => {
      game[key] = updates[key];
    });

    const updatedGame = await game.save();
    res.json({ success: true, data: updatedGame });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// Get default game
exports.getDefaultGame = async (req, res) => {
  try {
    const game = await Game.findOne({ isDefault: true }).select('-__v');
    if (!game) {
      return res.status(404).json({ message: 'No default game set' });
    }
    res.json(game);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Initialize games if not exists
exports.initializeGames = async () => {
  try {
    const gamesCount = await Game.countDocuments();
    if (gamesCount === 0) {
      const defaultGames = [
        { name: 'Wingo', identifier: 'Wingo', isActive: true, isDefault: true },
        { name: 'K3', identifier: 'K3', isActive: true },
        { name: '5D', identifier: '5D', isActive: true },
        { name: 'Wingo TRX', identifier: 'WingoTrx', isActive: true },
        { name: 'Ludo', identifier: 'Ludo', isActive: true },
        { name: 'Chess', identifier: 'Chess', isActive: true },
        { name: 'Numma', identifier: 'Numma', isActive: true },
        { name: 'Fortune Wheel', identifier: 'FortuneWheel', isActive: true }
      ];

      await Game.insertMany(defaultGames);
      console.log('Games initialized successfully');
    }
  } catch (err) {
    console.error('Error initializing games:', err.message);
  }
};