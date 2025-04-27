const nummaRoundManager = require('../services/NummaRoundManager');
const NummaBet = require('../models/NummaBet');
const { NummaRound1m, NummaRound3m, NummaRound5m } = require('../models/NummaRound');
const User = require('../models/User');
const NummaAdminResult = require('../models/NummaAdminResult');
const logger = require('../logger');

// Get active rounds
exports.getActiveRounds = async (req, res) => {
  try {
    const activeRounds = await nummaRoundManager.getActiveRounds();
    // Convert to array format, ensure all expected fields are present
    const roundsArray = Object.entries(activeRounds).map(([duration, round]) => ({
      _id: round._id,
      duration: parseInt(duration),
      roundNumber: round.roundNumber,
      status: round.status,
      endTime: round.endTime,
      startTime: round.startTime,
      createdAt: round.createdAt,
      totalBets: round.totalBets,
      totalAmount: round.totalAmount,
      totalPayout: round.totalPayout
    }));
    res.json({
      success: true,
      data: roundsArray
    });
  } catch (error) {
    logger.error('Error getting active rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get current round for a specific period
exports.getCurrentRound = async (req, res) => {
  try {
    const { period } = req.query; // period should be 1, 3, or 5
    let Model;
    if (period === '1' || period === 1) Model = NummaRound1m;
    else if (period === '3' || period === 3) Model = NummaRound3m;
    else if (period === '5' || period === 5) Model = NummaRound5m;
    else {
      return res.status(400).json({ success: false, error: 'Invalid period' });
    }

    const round = await Model.findOne({ status: 'active' }).sort({ endTime: 1 });
    if (!round) {
      return res.status(404).json({ success: false, error: 'No active round found' });
    }

    const now = Date.now();
    const endTime = new Date(round.endTime).getTime();
    const timeRemaining = Math.max(endTime - now, 0);

    res.json({
      success: true,
      data: {
        roundNumber: round.roundNumber,
        timeRemaining,
        endTime: round.endTime,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting current round:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get round history
exports.getRoundHistory = async (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 1;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    if (![1, 3, 5].includes(duration)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid duration. Must be 1, 3, or 5.'
      });
    }
    
    const history = await nummaRoundManager.getRoundHistory(duration, page, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting round history:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

function getRoundModel(duration) {
  if (duration === 1 || duration === '1') return NummaRound1m;
  if (duration === 3 || duration === '3') return NummaRound3m;
  if (duration === 5 || duration === '5') return NummaRound5m;
  throw new Error('Invalid duration');
}

// Place a bet
exports.placeBet = async (req, res) => {
  try {
    // Always use authenticated user from token
    const userIdFromToken = req.user && (req.user._id || req.user.id);
    const { userId: userIdFromBody, roundId, duration, betType, betValue, amount, multiplier } = req.body;
    logger.info('[Numma] Place bet request:', req.body, 'Token user:', userIdFromToken);
    if (!userIdFromToken) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    // If userId in body does not match token, warn and reject
    if (userIdFromBody && userIdFromBody !== userIdFromToken.toString()) {
      logger.warn('[Numma] User ID in body does not match token. Body:', userIdFromBody, 'Token:', userIdFromToken);
      return res.status(403).json({ success: false, error: 'User ID mismatch' });
    }
    // Validate required fields (except userId)
    if (!roundId || !duration || !betType || betValue === undefined || !amount) {
      logger.warn('[Numma] Missing required fields:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    const RoundModel = getRoundModel(duration);
    const round = await RoundModel.findById(roundId);
    if (!round || round.status !== 'active') {
      logger.warn('[Numma] Round not active:', roundId, 'status:', round && round.status);
      return res.status(400).json({ success: false, error: 'Round is not active' });
    }
    // Validate betType and betValue
    if (betType === 'color' && !['Red', 'Green', 'Violet'].includes(betValue)) {
      logger.warn('[Numma] Invalid color value:', betValue);
      return res.status(400).json({ success: false, error: 'Invalid color value' });
    } else if (betType === 'number' && (isNaN(betValue) || betValue < 0 || betValue > 9)) {
      logger.warn('[Numma] Invalid number value:', betValue);
      return res.status(400).json({ success: false, error: 'Invalid number value' });
    } else if (betType === 'bigsmall' && !['Big', 'Small'].includes(betValue)) {
      logger.warn('[Numma] Invalid bigsmall value:', betValue);
      return res.status(400).json({ success: false, error: 'Invalid big/small value' });
    }
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      logger.warn('[Numma] Invalid amount:', amount);
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    // Place bet with authenticated user only
    let bet;
    try {
      bet = await nummaRoundManager.placeBet(
        userIdFromToken,
        roundId,
        duration,
        betType,
        betValue,
        amount,
        multiplier || 1
      );
    } catch (err) {
      logger.error('[Numma] Error in placeBet:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error placing bet'
      });
    }
    if (!bet || !bet._id) {
      logger.error('[Numma] Bet not saved:', bet);
      return res.status(500).json({ success: false, error: 'Failed to save bet' });
    }
    logger.info('[Numma] Bet placed successfully:', bet._id, 'for user:', userIdFromToken);
    res.json({
      success: true,
      data: bet
    });
  } catch (error) {
    logger.error('[Numma] Unhandled error placing bet:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error placing bet'
    });
  }
};

// Get user bet history
exports.getUserBetHistory = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const history = await nummaRoundManager.getUserBetHistory(userId, page, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting user bet history:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Admin sets a manual result (pending, to be applied at round end)
exports.setManualResult = async (req, res) => {
  try {
    const { roundId, duration, number } = req.body;
    if (!roundId || !duration || number === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (![1, 3, 5].includes(parseInt(duration))) {
      return res.status(400).json({ success: false, error: 'Invalid duration' });
    }
    if (isNaN(number) || number < 0 || number > 9) {
      return res.status(400).json({ success: false, error: 'Number must be between 0 and 9' });
    }
    // Upsert admin result for this round
    await NummaAdminResult.findOneAndUpdate(
      { roundId, duration },
      { number, createdAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Admin result set. It will be applied at round end.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get outcomes for a specific round (admin usage)
exports.getRoundOutcome = async (req, res) => {
  try {
    const { roundId } = req.query;
    if (!roundId) {
      return res.status(400).json({ success: false, error: 'Missing roundId' });
    }
    const NummaBetOutcome = require('../models/NummaBetOutcome');
    const outcome = await NummaBetOutcome.findOne({ roundId });
    if (!outcome) {
      return res.status(404).json({ success: false, error: 'No outcome found for this round' });
    }
    res.json({ success: true, data: outcome });
  } catch (error) {
    logger.error('Error getting round outcome:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Start Numma rounds
exports.startRounds = async (req, res) => {
  try {
    await nummaRoundManager.start();
    
    res.json({
      success: true,
      message: 'Numma rounds started successfully'
    });
  } catch (error) {
    logger.error('Error starting Numma rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Stop Numma rounds
exports.stopRounds = async (req, res) => {
  try {
    nummaRoundManager.stop();
    
    res.json({
      success: true,
      message: 'Numma rounds stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping Numma rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
