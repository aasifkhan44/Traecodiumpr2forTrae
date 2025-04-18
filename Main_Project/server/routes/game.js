const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET /api/games
// @desc    Get all games
// @access  Public
router.get('/', async (req, res) => {
  try {
    const games = await Game.find();
    res.json({ success: true, data: games });
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/active
// @desc    Get all active games
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const games = await Game.find({ isActive: true }).select('name identifier isActive isDefault settings description thumbnailUrl cardImageUrl');
    res.json({ success: true, data: games });
  } catch (err) {
    console.error('Error fetching active games:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/:id
// @desc    Get game by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/games/:id
// @desc    Update game settings
// @access  Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { isActive, isDefault, settings, description } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Update fields if provided
    if (typeof isActive === 'boolean') game.isActive = isActive;
    if (typeof isDefault === 'boolean') game.isDefault = isDefault;
    if (settings) game.settings = { ...game.settings, ...settings };
    if (description) game.description = description;

    await game.save();
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Error updating game:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;