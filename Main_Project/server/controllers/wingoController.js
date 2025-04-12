const WingoBet = require('../models/WingoBet');
const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');
const WingoRoundManager = require('../services/WingoRoundManager');
const WingoWebSocketServer = require('../services/wingoWebSocketServer');
const User = require('../models/User');

// Get WebSocket server status
exports.getWebSocketStatus = async (req, res) => {
  try {
    const wsServer = WingoWebSocketServer.getInstance();
    res.json({
      success: true,
      data: {
        isRunning: wsServer.isRunning,
        serverUrl: wsServer.serverUrl,
        connectedClients: wsServer.clients.size
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get active rounds for all durations
exports.getActiveRounds = async (req, res) => {
  try {
    const activeRounds = await WingoRoundManager.getActiveRounds();
    res.json({ success: true, data: activeRounds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Place a bet
exports.placeBet = async (req, res) => {
  try {
    const { duration, betType, betValue, amount } = req.body;
    const userId = req.user._id;

    // Validate duration
    const RoundModel = {
      1: WingoRound1m,
      3: WingoRound3m,
      5: WingoRound5m,
      10: WingoRound10m
    }[duration];

    if (!RoundModel) {
      return res.status(400).json({ success: false, message: 'Invalid duration' });
    }

    // Find active round
    const round = await RoundModel.findOne({ status: 'open' });
    if (!round) {
      return res.status(400).json({ success: false, message: 'No active round found' });
    }

    // Validate bet type and value
    if (!['color', 'number'].includes(betType)) {
      return res.status(400).json({ success: false, message: 'Invalid bet type' });
    }

    if (betType === 'color' && !['Red', 'Violet', 'Green'].includes(betValue)) {
      return res.status(400).json({ success: false, message: 'Invalid color value' });
    }

    if (betType === 'number' && !/^[0-9]$/.test(betValue)) {
      return res.status(400).json({ success: false, message: 'Invalid number value' });
    }

    // Check user balance
    const user = await User.findById(userId);
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Create bet
    const bet = new WingoBet({
      userId,
      roundId: round._id,
      duration,
      betType,
      betValue,
      amount
    });

    // Update user balance
    user.balance -= amount;
    await user.save();

    // Save bet
    await bet.save();

    // Update round statistics
    round.totalBets += 1;
    round.totalAmount += amount;
    await round.save();

    res.json({
      success: true,
      data: {
        bet,
        newBalance: user.balance
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get user's bet history
exports.getBetHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const bets = await WingoBet.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await WingoBet.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        bets,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Control round result
exports.controlRoundResult = async (req, res) => {
  try {
    const { duration, roundId, color, number } = req.body;

    // Validate admin permission
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin permission required' });
    }

    // Validate input
    if (!['Red', 'Violet', 'Green'].includes(color)) {
      return res.status(400).json({ success: false, message: 'Invalid color' });
    }

    if (number < 0 || number > 9) {
      return res.status(400).json({ success: false, message: 'Number must be between 0 and 9' });
    }

    const round = await WingoRoundManager.setControlledResult(duration, roundId, color, number);

    res.json({
      success: true,
      data: round
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Initialize Wingo game rounds
exports.initializeGame = async () => {
  try {
    await WingoRoundManager.initializeRounds();
    console.log('Wingo game rounds initialized successfully');
  } catch (err) {
    console.error('Error initializing Wingo game rounds:', err.message);
  }
};

// Get Wingo rounds results
exports.getWingoRounds = async (req, res) => {
  try {
    const { duration } = req.query;
    const RoundModel = {
      1: WingoRound1m,
      3: WingoRound3m,
      5: WingoRound5m,
      10: WingoRound10m
    }[duration];

    if (!RoundModel) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid duration. Valid values are 1, 3, 5, 10' 
      });
    }

    const rounds = await RoundModel.find({ 
      status: { $in: ['completed', 'closed'] } 
    }).sort({ endTime: -1 }).limit(50);

    res.json({ 
      success: true, 
      data: rounds 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Admin: Get Wingo rounds for admin panel
exports.getAdminWingoRounds = async (req, res) => {
  try {
    // Validate admin permission
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin permission required' });
    }

    const { duration } = req.query;
    const RoundModel = {
      1: WingoRound1m,
      3: WingoRound3m,
      5: WingoRound5m,
      10: WingoRound10m
    }[duration];

    if (!RoundModel) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid duration. Valid values are 1, 3, 5, 10' 
      });
    }

    const rounds = await RoundModel.find({ 
      status: { $in: ['open', 'completed', 'closed'] } 
    }).sort({ endTime: -1 }).limit(50);

    res.json({ 
      success: true, 
      data: rounds 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};