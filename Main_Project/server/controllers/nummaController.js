const nummaRoundManager = require('../services/NummaRoundManager');
const NummaBet = require('../models/NummaBet');
const { NummaRound1m, NummaRound3m, NummaRound5m } = require('../models/NummaRound');
const User = require('../models/User');

// Get active rounds
exports.getActiveRounds = async (req, res) => {
  try {
    const activeRounds = await nummaRoundManager.getActiveRounds();
    
    // Convert to array format
    const roundsArray = Object.entries(activeRounds).map(([duration, round]) => ({
      duration: parseInt(duration),
      ...round.toObject()
    }));
    
    res.json({
      success: true,
      data: roundsArray
    });
  } catch (error) {
    console.error('Error getting active rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get current round for a specific period
exports.getCurrentRound = async (req, res) => {
  try {
    const period = parseInt(req.query.period);
    
    if (![1, 3, 5].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be 1, 3, or 5.'
      });
    }
    
    const activeRounds = await nummaRoundManager.getActiveRounds();
    const round = activeRounds[period];
    
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No active round found for this period.'
      });
    }
    
    // Calculate time remaining
    const now = Date.now();
    const endTime = new Date(round.endTime).getTime();
    const timeRemaining = Math.max(endTime - now, 0);
    
    res.json({
      success: true,
      data: {
        roundNumber: round.roundNumber,
        timeRemaining,
        endTime: round.endTime
      }
    });
  } catch (error) {
    console.error('Error getting current round:', error);
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
    console.error('Error getting round history:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Place a bet
exports.placeBet = async (req, res) => {
  try {
    const { userId, roundId, duration, betType, betValue, amount, multiplier } = req.body;
    
    // Validate required fields
    if (!userId || !roundId || !duration || !betType || betValue === undefined || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate bet type
    if (!['color', 'number', 'bigsmall'].includes(betType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bet type'
      });
    }
    
    // Validate bet value based on type
    if (betType === 'color' && !['Red', 'Green', 'Violet'].includes(betValue)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid color value'
      });
    } else if (betType === 'number' && (isNaN(betValue) || betValue < 0 || betValue > 9)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid number value'
      });
    } else if (betType === 'bigsmall' && !['Big', 'Small'].includes(betValue)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid big/small value'
      });
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    // Place bet
    const bet = await nummaRoundManager.placeBet(
      userId,
      roundId,
      duration,
      betType,
      betValue,
      amount,
      multiplier || 1
    );
    
    res.json({
      success: true,
      data: bet
    });
  } catch (error) {
    console.error('Error placing bet:', error);
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
    console.error('Error getting user bet history:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Set manual result (admin only)
exports.setManualResult = async (req, res) => {
  try {
    const { roundId, duration, number } = req.body;
    
    if (!roundId || !duration || number === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (![1, 3, 5].includes(parseInt(duration))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid duration'
      });
    }
    
    if (isNaN(number) || number < 0 || number > 9) {
      return res.status(400).json({
        success: false,
        error: 'Number must be between 0 and 9'
      });
    }
    
    const round = await nummaRoundManager.setManualResult(roundId, duration, parseInt(number));
    
    // Process bets for this round
    await nummaRoundManager.processBets(round);
    
    // Broadcast result to clients
    if (global.nummaWebSocketServer) {
      global.nummaWebSocketServer.broadcastResult(round);
    }
    
    res.json({
      success: true,
      data: round
    });
  } catch (error) {
    console.error('Error setting manual result:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error setting manual result'
    });
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
    console.error('Error starting Numma rounds:', error);
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
    console.error('Error stopping Numma rounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
