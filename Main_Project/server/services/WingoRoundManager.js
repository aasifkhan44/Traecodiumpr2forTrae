const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');
const WingoBet = require('../models/WingoBet');
const WingoAdminResult = require('../models/WingoAdminResult');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Helper to extract only color/number for round.result
function toRoundResult(adminResult) {
  return {
    color: adminResult.color || null,
    number: adminResult.number !== undefined ? adminResult.number : null
  };
}

class WingoRoundManager {
  constructor() {
    this.roundModels = {
      1: WingoRound1m,
      3: WingoRound3m,
      5: WingoRound5m,
      10: WingoRound10m
    };
    this.activeTimers = new Map();
  }

  async initializeRounds() {
    const durations = [1, 3, 5, 10];
    for (const duration of durations) {
      try {
        // First check if there are any existing rounds with status 'open'
        const activeRound = await this.roundModels[duration].findOne({ status: 'open' });
        if (!activeRound) {
          // Check for any rounds with status 'closed' or 'completed' and update them
          const existingRounds = await this.roundModels[duration].find({ $or: [ 
  { status: { $in: ['open', 'closed'] } },
  { endTime: { $lt: new Date() } }
] });
          if (existingRounds.length > 0) {
            // Update all existing rounds to 'completed' to avoid conflicts
            await this.roundModels[duration].updateMany(
              { $or: [ 
  { status: { $in: ['open', 'closed'] } },
  { endTime: { $lt: new Date() } }
] },
              { $set: { status: 'completed' } }
            );
            console.log(`Updated ${existingRounds.length} existing rounds for duration ${duration} to 'completed'`);
          }
          await this.createNewRound(duration);
        } else {
          console.log(`Found existing active round for duration ${duration}, scheduling end`);
          this.scheduleRoundEnd(activeRound);
        }
      } catch (err) {
        console.error(`Error initializing round for duration ${duration}:`, err.message);
      }
    }
  }

  async createNewRound(duration) {
    try {
      // Use findOneAndUpdate with upsert to avoid race conditions
      const RoundModel = this.roundModels[duration];
      
      // First check if there's already an open round
      const existingOpenRound = await RoundModel.findOne({ status: 'open' });
      
      if (existingOpenRound) {
        console.log(`Found existing open round for duration ${duration}, using it instead of creating a new one`);
        this.scheduleRoundEnd(existingOpenRound);
        return existingOpenRound;
      }
      
      // Get the last round number
      const lastRound = await RoundModel.findOne({}).sort({ roundNumber: -1 });
      const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Use findOneAndUpdate with upsert to safely create a new round
      // This helps prevent duplicate key errors when multiple processes try to create rounds
      const round = await RoundModel.findOneAndUpdate(
        { duration, status: 'open' },
        {
          duration,
          roundNumber,
          startTime,
          endTime,
          status: 'open',
          $setOnInsert: { totalBets: 0, totalAmount: 0, isControlled: false }
        },
        { upsert: true, new: true, runValidators: true }
      );

      console.log(`Created or found round for duration ${duration}, round number ${round.roundNumber}`);
      this.scheduleRoundEnd(round);
      
      // Broadcast round update to all clients after new round is created
      const wsServer = require('./wingoWebSocketServer').getInstance();
      if (wsServer && typeof wsServer.broadcastActiveRounds === 'function') {
        wsServer.broadcastActiveRounds();
      }
      
      return round;
    } catch (err) {
      console.error(`Error creating new round for duration ${duration}:`, err.message);
      
      // If there was an error, try to find an existing open round as a fallback
      const existingRound = await this.roundModels[duration].findOne({ status: 'open' });
      if (existingRound) {
        console.log(`Using existing round for duration ${duration} after error`);
        this.scheduleRoundEnd(existingRound);
        return existingRound;
      }
      
      // If we still can't find an open round, try to create one with a different approach
      try {
        // First, ensure no other rounds are open
        await this.roundModels[duration].updateMany(
          { status: 'open' },
          { $set: { status: 'completed' } }
        );
        
        // Then create a new round
        const lastRound = await this.roundModels[duration].findOne({}).sort({ roundNumber: -1 });
        const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        const newRound = new this.roundModels[duration]({
          duration,
          roundNumber,
          startTime,
          endTime,
          status: 'open'
        });
        
        await newRound.save();
        console.log(`Created new round for duration ${duration} after recovery, round number ${roundNumber}`);
        this.scheduleRoundEnd(newRound);
        
        // Broadcast round update to all clients after new round is created
        const wsServer = require('./wingoWebSocketServer').getInstance();
        if (wsServer && typeof wsServer.broadcastActiveRounds === 'function') {
          wsServer.broadcastActiveRounds();
        }
        
        return newRound;
      } catch (recoveryErr) {
        console.error(`Failed to recover from error for duration ${duration}:`, recoveryErr.message);
        throw recoveryErr;
      }
    }
  }

  scheduleRoundEnd(round) {
    const now = new Date();
    const timeUntilEnd = round.endTime.getTime() - now.getTime();

    if (timeUntilEnd <= 0) {
      this.endRound(round);
      return;
    }

    const timerId = setTimeout(() => this.endRound(round), timeUntilEnd);
    this.activeTimers.set(round._id.toString(), timerId);
  }

  async endRound(round) {
    const timerId = this.activeTimers.get(round._id.toString());
    if (timerId) {
      clearTimeout(timerId);
      this.activeTimers.delete(round._id.toString());
    }

    round.status = 'closed';
    // Check for admin result in WingoAdminResult collection
    const adminResult = await WingoAdminResult.findOne({ roundId: round._id, duration: round.duration });
    if (adminResult && ((adminResult.color && adminResult.color !== '') || (typeof adminResult.number === 'number' && adminResult.number >= 0 && adminResult.number <= 9))) {
      round.result = toRoundResult(adminResult);
    } else {
      round.result = this.generateRandomResult();
    }
    await round.save();

    // Broadcast round update to all clients after round ends
    const wsServer = require('./wingoWebSocketServer').getInstance();
    if (wsServer && typeof wsServer.broadcastActiveRounds === 'function') {
      wsServer.broadcastActiveRounds();
    }

    // Process bets
    await this.processBets(round);

    // Wait 3 seconds before creating new round
    setTimeout(() => this.createNewRound(round.duration), 3000);
  }

  generateRandomResult() {
    // Randomly decide whether to generate a color or a number result
    const generateColor = Math.random() < 0.5;
    
    if (generateColor) {
      const colors = ['Red', 'Violet', 'Green'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return { color, number: null };
    } else {
      const number = Math.floor(Math.random() * 10);
      return { color: null, number };
    }
  }

  async processBets(round) {
    const bets = await WingoBet.find({ roundId: round._id, status: 'pending' });

    for (const bet of bets) {
      let won = false;
      if (bet.betType === 'color') {
        won = bet.betValue === round.result.color;
        if (won) {
          bet.winAmount = bet.amount * 2;
        }
      } else { // number
        won = parseInt(bet.betValue) === round.result.number;
        if (won) {
          bet.winAmount = bet.amount * 10;
        }
      }

      bet.status = won ? 'won' : 'lost';
      await bet.save();

      // Payout to user if won
      if (won && bet.winAmount > 0) {
        const user = await User.findById(bet.userId);
        if (user) {
          const balanceBefore = user.balance;
          user.balance += bet.winAmount;
          await user.save();

          // Log transaction
          await Transaction.create({
            user: user._id,
            amount: bet.winAmount,
            type: 'credit',
            reference: `WingoBet:${bet._id}`,
            status: 'completed',
            balanceBefore,
            balanceAfter: user.balance,
            description: `Wingo bet win payout for round ${round.roundNumber}`
          });

          // Send balance update to user via WebSocket after payout
          const wsServer = require('./wingoWebSocketServer').getInstance();
          if (wsServer && typeof wsServer.sendUserBalanceUpdate === 'function') {
            wsServer.sendUserBalanceUpdate(user._id, user.balance);
          }
        }
      }
    }

    round.status = 'completed';
    await round.save();
  }

  async setControlledResult(duration, roundId, color, number) {
    const RoundModel = this.roundModels[duration];
    const round = await RoundModel.findById(roundId);
    
    if (!round || round.status !== 'open') {
      throw new Error('Round not found or already closed');
    }

    round.isControlled = true;
    round.controlledResult = { color, number };
    await round.save();
    return round;
  }

  async getActiveRounds() {
    const activeRounds = {};
    const now = new Date();
    for (const duration of Object.keys(this.roundModels)) {
      const round = await this.roundModels[duration].findOne({ status: 'open' });
      if (round) {
        // Use .toObject() only if available, else use round as-is
        const roundObj = (typeof round.toObject === 'function') ? round.toObject() : round;
        roundObj.endTime = round.endTime;
        roundObj.timeRemaining = Math.max(0, new Date(round.endTime).getTime() - now.getTime());
        activeRounds[duration] = roundObj;
      }
    }
    return activeRounds;
  }
}

module.exports = new WingoRoundManager();