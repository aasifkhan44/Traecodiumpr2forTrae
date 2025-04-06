const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// @route   GET api/game/current
// @desc    Get current active game
// @access  Public
router.get('/current', async (req, res) => {
  try {
    const currentGame = await Game.findOne({ status: 'active' }).sort({ startTime: -1 });
    
    if (!currentGame) {
      return res.status(404).json({ msg: 'No active game found' });
    }
    
    res.json(currentGame);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/game/history
// @desc    Get game history
// @access  Public
router.get('/history', async (req, res) => {
  try {
    const games = await Game.find({ status: 'completed' })
      .sort({ endTime: -1 })
      .limit(10);
    
    res.json(games);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/game/bet
// @desc    Place a bet on a game
// @access  Private
router.post('/bet', (req, res) => {
  // This will be implemented with authentication middleware
  res.json({ msg: 'Place bet route' });
});

module.exports = router;
