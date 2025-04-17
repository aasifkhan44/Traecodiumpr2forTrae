const express = require('express');
const router = express.Router();
const nummaController = require('../controllers/nummaController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// @route   GET api/numma/rounds/active
// @desc    Get active rounds
// @access  Public
router.get('/rounds/active', nummaController.getActiveRounds);

// @route   GET api/numma/rounds/current
// @desc    Get current round for a specific period
// @access  Public
router.get('/rounds/current', nummaController.getCurrentRound);

// @route   GET api/numma/rounds/history
// @desc    Get round history
// @access  Public
router.get('/rounds/history', nummaController.getRoundHistory);

// @route   POST api/numma/bet
// @desc    Place a bet
// @access  Private
router.post('/bet', authMiddleware, nummaController.placeBet);

// @route   GET api/numma/history
// @desc    Get user bet history
// @access  Private
router.get('/history', authMiddleware, nummaController.getUserBetHistory);

// Admin routes

// @route   POST api/numma/admin/result
// @desc    Set manual result
// @access  Private/Admin
router.post('/admin/result', authMiddleware, adminMiddleware, nummaController.setManualResult);

// @route   POST api/numma/admin/start
// @desc    Start Numma rounds
// @access  Private/Admin
router.post('/admin/start', authMiddleware, adminMiddleware, nummaController.startRounds);

// @route   POST api/numma/admin/stop
// @desc    Stop Numma rounds
// @access  Private/Admin
router.post('/admin/stop', authMiddleware, adminMiddleware, nummaController.stopRounds);

module.exports = router;
