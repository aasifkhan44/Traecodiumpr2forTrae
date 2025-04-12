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
    console.log('=== PLACE BET REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);
    
    const { duration, betType, betValue, amount, userId: bodyUserId } = req.body;
    
    // Get userId - prioritize the one from the request body if available
    let userId;
    
    // First try to get userId from request body (explicitly sent from client)
    if (bodyUserId) {
      console.log('Using userId from request body:', bodyUserId);
      userId = bodyUserId;
    } 
    // Then try to get it from the authenticated user object
    else if (req.user) {
      if (typeof req.user === 'object' && req.user !== null) {
        userId = req.user._id || req.user.id;
        console.log('Using userId from req.user object:', userId);
      } else {
        userId = req.user;
        console.log('Using userId directly from req.user:', userId);
      }
    }
    
    if (!userId) {
      console.error('User ID not found in request');
      return res.status(401).json({ success: false, message: 'User ID not found' });
    }
    
    console.log('Placing bet for user:', userId);
    console.log('Bet details:', { duration, betType, betValue, amount });

    // Validate duration
    const RoundModel = {
      1: WingoRound1m,
      3: WingoRound3m,
      5: WingoRound5m,
      10: WingoRound10m
    }[duration];

    if (!RoundModel) {
      console.error('Invalid duration:', duration);
      return res.status(400).json({ success: false, message: 'Invalid duration' });
    }

    // Find active round
    const round = await RoundModel.findOne({ status: 'open' });
    if (!round) {
      console.error('No active round found for duration:', duration);
      return res.status(400).json({ success: false, message: 'No active round found' });
    }
    console.log('Active round found:', round._id);

    // Validate bet type and value
    if (!['color', 'number'].includes(betType)) {
      console.error('Invalid bet type:', betType);
      return res.status(400).json({ success: false, message: 'Invalid bet type' });
    }

    if (betType === 'color' && !['Red', 'Violet', 'Green'].includes(betValue)) {
      console.error('Invalid color value:', betValue);
      return res.status(400).json({ success: false, message: 'Invalid color value' });
    }

    if (betType === 'number' && !/^[0-9]$/.test(betValue)) {
      console.error('Invalid number value:', betValue);
      return res.status(400).json({ success: false, message: 'Invalid number value' });
    }

    // Check user balance
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found in database:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Ensure balance and amount are numbers
    const userBalance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
    const betAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    console.log('User balance (raw):', user.balance);
    console.log('User balance (parsed):', userBalance);
    console.log('Bet amount (raw):', amount);
    console.log('Bet amount (parsed):', betAmount);

    if (userBalance < betAmount) {
      console.error('Insufficient balance:', userBalance, 'needed:', betAmount);
      return res.status(400).json({ success: false, message: 'Insufficient balance to place this bet' });
    }

    // Create bet
    const bet = new WingoBet({
      userId,
      roundId: round._id,
      duration,
      betType,
      betValue,
      amount: betAmount // Use the parsed amount
    });
    console.log('Bet created:', bet);

    // Update user balance
    user.balance = userBalance - betAmount;
    await user.save();
    console.log('Updated user balance:', user.balance);

    // Save bet
    await bet.save();
    console.log('Bet saved successfully:', bet._id);

    // Update round statistics
    round.totalBets += 1;
    round.totalAmount += betAmount;
    await round.save();
    console.log('Round statistics updated');

    console.log('=== BET PLACED SUCCESSFULLY ===');
    res.json({
      success: true,
      data: {
        bet: {
          _id: bet._id,
          roundId: round._id,
          betType,
          betValue,
          amount: betAmount
        },
        newBalance: user.balance
      }
    });
  } catch (err) {
    console.error('=== ERROR PLACING BET ===');
    console.error('Error details:', err);
    console.error('Stack trace:', err.stack);
    console.error('Request body:', req.body);
    console.error('Request user:', req.user);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get recent bets for the user
exports.getRecentBets = async (req, res) => {
  try {
    console.log('=== GET RECENT BETS ===');
    console.log('Request user:', req.user);
    
    // Get userId from authenticated user
    let userId;
    if (req.user) {
      if (typeof req.user === 'object' && req.user !== null) {
        userId = req.user._id || req.user.id;
        console.log('Using userId from req.user object:', userId);
      } else {
        userId = req.user;
        console.log('Using userId directly from req.user:', userId);
      }
    }
    
    if (!userId) {
      console.log('No user ID found, returning empty bets array');
      return res.json({
        success: true,
        bets: []
      });
    }
    
    const { limit = 10 } = req.query;
    console.log('Fetching recent bets for user:', userId, 'limit:', limit);

    // Find bets and populate round information
    const bets = await WingoBet.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
      
    console.log('Found bets:', bets.length);

    // Format the bets with additional information
    const formattedBets = bets.map(bet => ({
      _id: bet._id.toString(),
      betType: bet.betType,
      betValue: bet.betValue,
      amount: bet.amount,
      createdAt: bet.createdAt,
      status: bet.status || 'pending',
      payout: bet.status === 'won' ? bet.amount * 2 : 0,
      roundId: bet.roundId ? bet.roundId.toString() : null
    }));
    
    console.log('Formatted bets:', formattedBets.length);

    res.json({
      success: true,
      bets: formattedBets
    });
  } catch (err) {
    console.error('Error fetching recent bets:', err);
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