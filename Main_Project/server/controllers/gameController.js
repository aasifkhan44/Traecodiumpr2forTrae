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
    const { isActive, isDefault, settings } = req.body;
    const game = await Game.findOne({ identifier: req.params.identifier });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Update fields if provided
    if (typeof isActive === 'boolean') game.isActive = isActive;
    if (typeof isDefault === 'boolean') game.isDefault = isDefault;
    if (settings) game.settings = { ...game.settings, ...settings };

    const updatedGame = await game.save();
    res.json(updatedGame);
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