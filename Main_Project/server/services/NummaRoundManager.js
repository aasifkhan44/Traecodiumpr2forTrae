const { NummaRound1m, NummaRound3m, NummaRound5m } = require('../models/NummaRound');
const NummaBet = require('../models/NummaBet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class NummaRoundManager {
  constructor() {
    this.isRunning = false;
    this.roundIntervals = {};
    this.models = {
      1: NummaRound1m,
      3: NummaRound3m,
      5: NummaRound5m
    };
  }

  // Start the round manager
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    try {
      // Start rounds for each duration
      await this.startRoundsForDuration(1); // 1-minute rounds
      await this.startRoundsForDuration(3); // 3-minute rounds
      await this.startRoundsForDuration(5); // 5-minute rounds
      
      console.log('Numma Round Manager started successfully');
    } catch (error) {
      console.error('Error starting Numma Round Manager:', error);
      this.isRunning = false;
    }
  }

  // Stop the round manager
  stop() {
    if (!this.isRunning) return;
    
    // Clear all intervals
    Object.values(this.roundIntervals).forEach(interval => clearInterval(interval));
    this.roundIntervals = {};
    this.isRunning = false;
    
    console.log('Numma Round Manager stopped');
  }

  // Start rounds for a specific duration
  async startRoundsForDuration(duration) {
    try {
      // Check if there are any active rounds for this duration
      const Model = this.models[duration];
      const activeRound = await Model.findOne({ status: 'active' }).sort({ endTime: 1 });
      
      if (activeRound) {
        console.log(`Found active ${duration}-minute round: ${activeRound.roundNumber}`);
        // Calculate time until round ends
        const now = new Date();
        const endTime = new Date(activeRound.endTime);
        const timeUntilEnd = Math.max(0, endTime - now);
        
        // Schedule next round creation
        setTimeout(() => this.createNextRound(duration), timeUntilEnd + 1000);
      } else {
        // No active rounds, create a new one
        await this.createNextRound(duration);
      }
      
      // Set up interval to check and create rounds
      const intervalMs = duration * 60 * 1000; // Convert minutes to milliseconds
      this.roundIntervals[duration] = setInterval(() => this.createNextRound(duration), intervalMs);
      
    } catch (error) {
      console.error(`Error starting ${duration}-minute rounds:`, error);
      throw error;
    }
  }

  // Create the next round for a specific duration
  async createNextRound(duration) {
    try {
      const Model = this.models[duration];
      
      // Find the latest round for this duration
      const latestRound = await Model.findOne().sort({ roundNumber: -1 });
      
      // Generate new round number
      const nextRoundNumber = latestRound 
        ? this.generateNextRoundNumber(latestRound.roundNumber)
        : this.generateInitialRoundNumber(duration);
      
      // Calculate start and end times
      const now = new Date();
      const startTime = now;
      const endTime = new Date(now.getTime() + duration * 60 * 1000);
      
      // Create new round
      const newRound = new Model({
        roundNumber: nextRoundNumber,
        duration,
        startTime,
        endTime,
        status: 'active'
      });
      
      await newRound.save();
      console.log(`Created new ${duration}-minute round: ${nextRoundNumber}`);
      
      // Complete previous round if exists
      if (latestRound && latestRound.status === 'active') {
        await this.completeRound(latestRound._id, duration);
      }
      
      // Schedule round completion
      setTimeout(() => this.completeRound(newRound._id, duration), duration * 60 * 1000);
      
      // Broadcast new round to clients
      if (global.nummaWebSocketServer) {
        global.nummaWebSocketServer.broadcastActiveRounds();
      }
      
      return newRound;
    } catch (error) {
      console.error(`Error creating next ${duration}-minute round:`, error);
      throw error;
    }
  }

  // Complete a round and process bets
  async completeRound(roundId, duration) {
    try {
      const Model = this.models[duration];
      const round = await Model.findById(roundId);
      
      if (!round || round.status !== 'active') {
        return;
      }
      
      // Generate random result if not manually set
      if (!round.result || !round.result.number) {
        const randomNumber = Math.floor(Math.random() * 10); // 0-9
        round.setResultFromNumber(randomNumber);
      }
      
      round.status = 'completed';
      await round.save();
      
      console.log(`Completed ${duration}-minute round: ${round.roundNumber} with result: ${round.result.number} (${round.result.color})`);
      
      // Process bets for this round
      await this.processBets(round);
      
      // Broadcast result to clients
      if (global.nummaWebSocketServer) {
        global.nummaWebSocketServer.broadcastResult(round);
      }
      
    } catch (error) {
      console.error(`Error completing round:`, error);
    }
  }

  // Process all bets for a completed round
  async processBets(round) {
    try {
      // Find all pending bets for this round
      const bets = await NummaBet.find({ 
        roundId: round._id,
        status: 'pending'
      });
      
      console.log(`Processing ${bets.length} bets for round ${round.roundNumber}`);
      
      let totalPayout = 0;
      
      // Process each bet
      for (const bet of bets) {
        try {
          const result = bet.processResult(round.result);
          
          if (result.isWin) {
            // Update user balance
            const user = await User.findById(bet.userId);
            if (user) {
              const originalBalance = user.balance;
              user.balance += result.winAmount;
              await user.save();
              
              // Create transaction record
              await Transaction.create({
                user: user._id,
                amount: result.winAmount,
                type: 'credit',
                reference: `Numma Win #${round.roundNumber}`,
                status: 'completed',
                balanceBefore: originalBalance,
                balanceAfter: user.balance,
                description: `Numma ${bet.betType} bet win on ${bet.betValue}`
              });
              
              totalPayout += result.winAmount;
            }
          }
          
          // Save updated bet
          await bet.save();
          
        } catch (betError) {
          console.error(`Error processing bet ${bet._id}:`, betError);
        }
      }
      
      // Update round with total payout
      round.totalPayout = totalPayout;
      await round.save();
      
    } catch (error) {
      console.error(`Error processing bets for round ${round.roundNumber}:`, error);
    }
  }

  // Generate next round number based on previous
  generateNextRoundNumber(prevRoundNumber) {
    // Extract numeric part and increment
    const numericPart = parseInt(prevRoundNumber.replace(/[^0-9]/g, ''));
    return `${numericPart + 1}`;
  }

  // Generate initial round number for a duration
  generateInitialRoundNumber(duration) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}0001`;
  }

  // Get active rounds for all durations
  async getActiveRounds() {
    try {
      const activeRounds = {};
      
      for (const [duration, Model] of Object.entries(this.models)) {
        const round = await Model.findOne({ status: 'active' }).sort({ endTime: 1 });
        if (round) {
          activeRounds[duration] = round;
        }
      }
      
      return activeRounds;
    } catch (error) {
      console.error('Error getting active rounds:', error);
      throw error;
    }
  }

  // Get round by ID and duration
  async getRound(roundId, duration) {
    try {
      const Model = this.models[duration];
      return await Model.findById(roundId);
    } catch (error) {
      console.error(`Error getting round:`, error);
      throw error;
    }
  }

  // Get round by round number and duration
  async getRoundByNumber(roundNumber, duration) {
    try {
      const Model = this.models[duration];
      return await Model.findOne({ roundNumber });
    } catch (error) {
      console.error(`Error getting round by number:`, error);
      throw error;
    }
  }

  // Get round result
  async getRoundResult(roundId) {
    try {
      // Try to find in any of the models
      for (const Model of Object.values(this.models)) {
        const round = await Model.findById(roundId);
        if (round && round.result) {
          return round.result;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error getting round result:`, error);
      throw error;
    }
  }

  // Set manual result for a round
  async setManualResult(roundId, duration, number) {
    try {
      const Model = this.models[duration];
      const round = await Model.findById(roundId);
      
      if (!round) {
        throw new Error('Round not found');
      }
      
      round.setResultFromNumber(number);
      round.isManualResult = true;
      
      await round.save();
      return round;
    } catch (error) {
      console.error(`Error setting manual result:`, error);
      throw error;
    }
  }

  // Get round history
  async getRoundHistory(duration, page = 1, limit = 20) {
    try {
      const Model = this.models[duration];
      
      const total = await Model.countDocuments({ status: 'completed' });
      const totalPages = Math.ceil(total / limit);
      
      const rounds = await Model.find({ status: 'completed' })
        .sort({ endTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      return {
        rounds,
        total,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error(`Error getting round history:`, error);
      throw error;
    }
  }

  // Place a bet
  async placeBet(userId, roundId, duration, betType, betValue, amount, multiplier = 1) {
    try {
      // Validate round is active
      const Model = this.models[duration];
      const round = await Model.findById(roundId);
      
      if (!round || round.status !== 'active') {
        throw new Error('Round is not active');
      }
      
      // Check if betting period is still open (allow bets until 10 seconds before end)
      const now = new Date();
      const endTime = new Date(round.endTime);
      const timeUntilEnd = endTime - now;
      
      if (timeUntilEnd < 10000) { // 10 seconds buffer
        throw new Error('Betting period has ended for this round');
      }
      
      // Calculate service fee (2%)
      const serviceFee = amount * 0.02;
      const effectiveAmount = amount - serviceFee;
      
      // Create bet
      const bet = new NummaBet({
        userId,
        roundId,
        roundNumber: round.roundNumber,
        duration,
        betType,
        betValue,
        amount,
        multiplier,
        serviceFee,
        effectiveAmount
      });
      
      // Calculate potential win
      bet.calculatePotentialWin();
      
      // Deduct amount from user balance
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      const originalBalance = user.balance;
      user.balance -= amount;
      await user.save();
      
      // Create transaction record
      await Transaction.create({
        user: userId,
        amount: amount,
        type: 'debit',
        reference: `Numma Bet #${round.roundNumber}`,
        status: 'completed',
        balanceBefore: originalBalance,
        balanceAfter: user.balance,
        description: `Numma ${betType} bet on ${betValue}`
      });
      
      // Save bet
      await bet.save();
      
      // Update round stats
      round.totalBets += 1;
      round.totalAmount += amount;
      await round.save();
      
      return bet;
    } catch (error) {
      console.error(`Error placing bet:`, error);
      throw error;
    }
  }

  // Get user bet history
  async getUserBetHistory(userId, page = 1, limit = 20) {
    try {
      const total = await NummaBet.countDocuments({ userId });
      const totalPages = Math.ceil(total / limit);
      
      const bets = await NummaBet.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      return {
        bets,
        total,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error(`Error getting user bet history:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const nummaRoundManager = new NummaRoundManager();

module.exports = nummaRoundManager;
