const WingoBet = require('../models/WingoBet');
const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');
const WingoRoundManager = require('../services/WingoRoundManager');
const WingoWebSocketServer = require('../services/wingoWebSocketServer');
const User = require('../models/User');
const WingoAdminResult = require('../models/WingoAdminResult');

// Get recent results
exports.getRecentResults = async (req, res) => {
  try {
    console.log('Fetching recent results with query params:', req.query);
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Create search query - fix the regex search to avoid 500 errors
    let searchQuery = {};
    if (search && search.trim() !== '') {
      const trimmedSearch = search.trim();
      
      // Check if search is a valid MongoDB ObjectId (24 hex chars)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmedSearch);
      
      // Check if search is a number
      const isNumeric = /^\d+$/.test(trimmedSearch);
      
      if (isObjectId) {
        // If it looks like an ObjectId, search by _id
        try {
          const mongoose = require('mongoose');
          const ObjectId = mongoose.Types.ObjectId;
          searchQuery = { _id: new ObjectId(trimmedSearch) };
          console.log('Searching by ObjectId:', trimmedSearch);
        } catch (err) {
          console.error('Invalid ObjectId format:', err);
          // Fallback to text search if ObjectId creation fails
          searchQuery = { status: { $regex: trimmedSearch, $options: 'i' } };
        }
      } else if (isNumeric) {
        // If search is numeric, search in roundNumber as a number
        searchQuery = {
          $or: [
            { roundNumber: parseInt(trimmedSearch) },
            { duration: parseInt(trimmedSearch) }
          ]
        };
      } else {
        // If search is text, search in status
        searchQuery = {
          status: { $regex: trimmedSearch, $options: 'i' }
        };
      }
    }

    console.log('Search query:', JSON.stringify(searchQuery));

    // Base query for all rounds
    const baseQuery = { 
      status: { $in: ['closed', 'completed'] },
      ...(Object.keys(searchQuery).length > 0 ? searchQuery : {})
    };

    console.log('Base query:', JSON.stringify(baseQuery));

    // Fetch results with pagination
    const [results, total] = await Promise.all([
      Promise.all([
        WingoRound1m.find(baseQuery).sort({ endTime: -1 }).skip(skip).limit(parseInt(limit)),
        WingoRound3m.find(baseQuery).sort({ endTime: -1 }).skip(skip).limit(parseInt(limit)),
        WingoRound5m.find(baseQuery).sort({ endTime: -1 }).skip(skip).limit(parseInt(limit)),
        WingoRound10m.find(baseQuery).sort({ endTime: -1 }).skip(skip).limit(parseInt(limit))
      ]),
      Promise.all([
        WingoRound1m.countDocuments(baseQuery),
        WingoRound3m.countDocuments(baseQuery),
        WingoRound5m.countDocuments(baseQuery),
        WingoRound10m.countDocuments(baseQuery)
      ])
    ]);

    // Combine and sort all results
    const allResults = results.flat().sort((a, b) => b.endTime - a.endTime);
    
    // Take only the requested number of results after sorting
    const paginatedResults = allResults.slice(0, parseInt(limit));

    // Calculate total count
    const totalCount = total.reduce((sum, count) => sum + count, 0);

    // Remove controlled result field and simplify response
    const formattedResults = paginatedResults.map(result => ({
      _id: result._id,
      roundNumber: result.roundNumber,
      duration: result.duration,
      startTime: result.startTime,
      endTime: result.endTime,
      result: result.result || { color: null, number: null },
      status: result.status
    }));

    console.log(`Returning ${formattedResults.length} results, total count: ${totalCount}`);

    res.status(200).json({
      results: formattedResults,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      totalCount
    });
  } catch (error) {
    console.error('Error fetching recent results:', error);
    res.status(500).json({ error: 'Failed to fetch recent results', message: error.message });
  }
};

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

    if (userBalance < betAmount) {
      console.error('Insufficient balance:', { userBalance, betAmount });
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Calculate potential payout
    let potentialMultiplier = 0;
    if (betType === 'color') {
      // Colors have a 2x multiplier
      potentialMultiplier = 2;
    } else if (betType === 'number') {
      // Numbers have a 9x multiplier
      potentialMultiplier = 9;
    }

    const potentialPayout = betAmount * potentialMultiplier;

    // Create the bet
    const bet = new WingoBet({
      userId,
      roundId: round._id,
      duration,
      betType,
      betValue,
      amount: betAmount,
      potential: potentialMultiplier,
      status: 'pending',
      winAmount: 0
    });

    // Save the bet
    await bet.save();

    // Update user balance (deduct bet amount)
    user.balance = userBalance - betAmount;
    await user.save();

    // Broadcast bet update to admin clients via WebSocket
    const wsServer = WingoWebSocketServer.getInstance();
    if (wsServer.adminClients.size > 0) {
      // Only broadcast if there are admin clients connected
      await wsServer.broadcastBetUpdate(bet);
      console.log('Broadcasted bet update to admin clients');
    }

    console.log('Bet placed successfully:', bet._id);
    
    // Return the created bet
    return res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: {
        bet: {
          _id: bet._id,
          roundId: bet.roundId,
          duration: bet.duration,
          betType: bet.betType,
          betValue: bet.betValue,
          amount: bet.amount,
          potential: bet.potential,
          status: bet.status,
          createdAt: bet.createdAt,
        },
        userBalance: user.balance
      }
    });
  } catch (err) {
    console.error('Error placing bet:', err);
    return res.status(500).json({ success: false, message: err.message });
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
      payout: bet.status === 'won' ? bet.winAmount : 0,
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

// Admin: Get Wingo rounds with bet statistics for admin panel
exports.getAdminWingoRounds = async (req, res) => {
  try {
    console.log('Getting admin Wingo rounds with filters:', req.query);
    
    // Get filter parameters
    const { period, status } = req.query;
    const showOnlyRunning = status === 'open' || !status; // Default to showing only running/open rounds
    const duration = period ? parseInt(period) : null;
    
    console.log(`Processing request with period: ${period}, duration: ${duration}, showOnlyRunning: ${showOnlyRunning}`);
    
    // Function to get the appropriate round model based on duration
    const getRoundModel = (dur) => {
      const models = {
        1: WingoRound1m,
        3: WingoRound3m,
        5: WingoRound5m,
        10: WingoRound10m
      };
      return models[dur];
    };
    
    // Function to get bet statistics for a round
    const getRoundWithBetStats = async (round, roundDuration) => {
      // Find all bets for this round
      const bets = await WingoBet.find({ roundId: round._id });
      console.log(`Found ${bets.length} bets for round: ${round._id}, duration: ${roundDuration}`);
      
      // Calculate statistics
      const betStats = {
        colors: {
          Red: { count: 0, amount: 0, payout: 0 },
          Green: { count: 0, amount: 0, payout: 0 },
          Violet: { count: 0, amount: 0, payout: 0 }
        },
        numbers: {
          0: { count: 0, amount: 0, payout: 0 },
          1: { count: 0, amount: 0, payout: 0 },
          2: { count: 0, amount: 0, payout: 0 },
          3: { count: 0, amount: 0, payout: 0 },
          4: { count: 0, amount: 0, payout: 0 },
          5: { count: 0, amount: 0, payout: 0 },
          6: { count: 0, amount: 0, payout: 0 },
          7: { count: 0, amount: 0, payout: 0 },
          8: { count: 0, amount: 0, payout: 0 },
          9: { count: 0, amount: 0, payout: 0 }
        },
        totalBets: 0,
        totalAmount: 0,
        potentialPayout: 0
      };
      
      // Process each bet
      for (const bet of bets) {
        if (bet.betType === 'color') {
          const color = bet.betValue;
          betStats.colors[color].count++;
          betStats.colors[color].amount += bet.amount;
          // Color bet pays 2x
          betStats.colors[color].payout += bet.amount * 2;
        } else if (bet.betType === 'number') {
          const number = bet.betValue;
          betStats.numbers[number].count++;
          betStats.numbers[number].amount += bet.amount;
          // Number bet pays 9x
          betStats.numbers[number].payout += bet.amount * 9;
        }
        
        betStats.totalBets++;
        betStats.totalAmount += bet.amount;
      }
      
      // Calculate potential payout if color or number wins
      const roundObj = round.toObject ? round.toObject() : { ...round };
      
      return {
        ...roundObj,
        duration: roundDuration,
        betStats,
        totalBets: bets.length,
        totalAmount: bets.reduce((sum, bet) => sum + bet.amount, 0)
      };
    };
    
    // Handle the case where a specific period is requested
    if (duration) {
      console.log(`Fetching rounds for specific duration: ${duration}`);
      const RoundModel = getRoundModel(duration);

      if (!RoundModel) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid period. Valid values are 1, 3, 5, 10' 
        });
      }

      // Build query based on filters
      const query = {};
      if (showOnlyRunning) {
        query.status = 'open';
      }

      // Get rounds based on query
      const rounds = await RoundModel.find(query)
        .sort({ endTime: -1 })
        .limit(1); // Only get the latest open round
      
      console.log(`Found ${rounds.length} rounds for period ${duration} with status filter: ${showOnlyRunning ? 'open only' : 'all'}`);
      
      if (rounds.length === 0) {
        console.log(`No rounds found for period ${duration}, trying to create a fallback response`);
        // Try to find if the model has any rounds at all (for debugging)
        const anyRounds = await RoundModel.find().limit(1);
        console.log(`Debug - Any rounds exist for this period: ${anyRounds.length > 0}`);
      }
        
      // Add bet statistics to each round
      const roundsWithStats = await Promise.all(
        rounds.map(round => getRoundWithBetStats(round, Number(duration)))
      );

      // Final verification that we're only returning rounds for the requested duration
      const verifiedRounds = roundsWithStats.filter(round => round.duration === Number(duration));
      console.log(`After verification: ${verifiedRounds.length} rounds match the requested duration ${duration}`);

      return res.json({ 
        success: true, 
        data: verifiedRounds
      });
    } else {
      // If no specific period, get the current open round from each duration
      console.log('No specific period selected, fetching all current open rounds');
      const durations = [1, 3, 5, 10];
      const allRoundsWithStats = [];
      
      for (const dur of durations) {
        const RoundModel = getRoundModel(dur);
        if (!RoundModel) continue;
        
        // Build query for open rounds only
        const query = { status: 'open', duration: dur };
        
        // Get only the current open round for each duration
        const rounds = await RoundModel.find(query)
          .sort({ endTime: -1 })
          .limit(1);
          
        if (rounds.length > 0) {
          console.log(`Found open round for duration: ${dur}`);
          // Add bet statistics to each round
          const roundsWithStats = await Promise.all(
            rounds.map(round => getRoundWithBetStats(round, dur))
          );
          
          allRoundsWithStats.push(...roundsWithStats);
        } else {
          console.log(`No open round found for duration: ${dur}`);
        }
      }
      
      if (allRoundsWithStats.length === 0) {
        console.log('No open rounds found across any duration');
      } else {
        console.log(`Found ${allRoundsWithStats.length} open rounds across all durations`);
      }
      
      // Sort by duration for consistent display
      allRoundsWithStats.sort((a, b) => a.duration - b.duration);
      
      res.json({ 
        success: true, 
        data: allRoundsWithStats
      });
    }
  } catch (err) {
    console.error('Error getting admin Wingo rounds:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Admin: Set result for a round (override mechanism)
exports.controlRoundResult = async (req, res) => {
  try {
    const { duration, roundId, color, number } = req.body;
    if (!duration || !roundId || (!color && number === undefined)) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Save admin result in a separate collection
    await WingoAdminResult.findOneAndUpdate(
      { roundId, duration },
      { color: color || null, number: number !== undefined ? number : null, createdAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Result set successfully' });
  } catch (error) {
    console.error('Error controlling round result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to control round result',
      error: error.message
    });
  }
};

// Admin: Get round statistics for admin dashboard
exports.getAdminRoundStats = async (req, res) => {
  try {
    const { duration } = req.query;
    if (!duration) {
      return res.status(400).json({
        success: false,
        message: 'Duration parameter is required'
      });
    }

    // Get the appropriate round model based on duration
    let RoundModel;
    switch (parseInt(duration)) {
      case 1:
        RoundModel = WingoRound1m;
        break;
      case 3:
        RoundModel = WingoRound3m;
        break;
      case 5:
        RoundModel = WingoRound5m;
        break;
      case 10:
        RoundModel = WingoRound10m;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid duration. Valid values are 1, 3, 5, 10'
        });
    }

    // Find the currently active round for the selected duration
    const round = await RoundModel.findOne({ status: { $in: ['open', 'running'] } }).sort({ startTime: -1 });
    if (!round) {
      return res.status(404).json({ success: false, message: 'No active round found for this duration' });
    }

    // Gather bet statistics for the round
    const bets = await WingoBet.find({ roundId: round._id });
    const betStats = {
      colors: { Red: { count: 0, amount: 0, payout: 0 }, Green: { count: 0, amount: 0, payout: 0 }, Violet: { count: 0, amount: 0, payout: 0 } },
      numbers: {},
      totalBets: 0,
      totalAmount: 0
    };
    for (let i = 0; i <= 9; i++) {
      betStats.numbers[i] = { count: 0, amount: 0, payout: 0 };
    }
    bets.forEach(bet => {
      if (bet.betType === 'color' && betStats.colors[bet.betValue]) {
        betStats.colors[bet.betValue].count++;
        betStats.colors[bet.betValue].amount += bet.amount;
        // Color bet pays 2x (example)
        betStats.colors[bet.betValue].payout += bet.amount * 2;
      } else if (bet.betType === 'number' && betStats.numbers[bet.betValue] !== undefined) {
        betStats.numbers[bet.betValue].count++;
        betStats.numbers[bet.betValue].amount += bet.amount;
        // Number bet pays 9x (example)
        betStats.numbers[bet.betValue].payout += bet.amount * 9;
      }
      betStats.totalBets++;
      betStats.totalAmount += bet.amount;
    });

    // Suggestion logic (example: suggest a random color/number)
    let suggestion = null;
    if (round.status === 'open') {
      suggestion = { type: 'color', value: 'Green', payout: 2 };
    }

    res.json({
      success: true,
      data: {
        round: {
          _id: round._id,
          roundNumber: round.roundNumber,
          duration: round.duration,
          startTime: round.startTime,
          endTime: round.endTime,
          status: round.status,
          timeRemaining: new Date(round.endTime) - new Date()
        },
        betStats,
        suggestion
      }
    });
  } catch (error) {
    console.error('Error getting admin round stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin round stats',
      error: error.message
    });
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