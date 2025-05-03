const { NummaRound1m, NummaRound3m, NummaRound5m } = require('../models/NummaRound');
const NummaBet = require('../models/NummaBet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NummaBetOutcome = require('../models/NummaBetOutcome');
const NummaAdminResult = require('../models/NummaAdminResult');
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
      
      // --- Use admin-declared result if exists ---
      let adminResult = await NummaAdminResult.findOne({ roundId, duration });
      if (adminResult && typeof adminResult.number === 'number' && adminResult.number >= 0 && adminResult.number <= 9) {
        round.setResultFromNumber(adminResult.number);
        round.isManualResult = true;
      } else {
        // --- Use pre-calculated outcome totals for risk control ---
        const outcomeDoc = await NummaBetOutcome.findOne({ roundId, duration });
        let forcedNumber = null;
        if (outcomeDoc) {
          // Calculate total liability for each number (number, color, bigsmall)
          let minLiability = Infinity;
          let bestNumbers = [];
          for (let i = 0; i < 10; i++) {
            // Number liability
            const numberKey = `number:${i}`;
            const numberTotal = outcomeDoc.outcomeTotals.get(numberKey) || 0;
            const numberLiability = numberTotal * this.getNummaMultiplier('number', i);

            // Color liability
            const color = round.getColorFromNumber(i);
            const colorKey = `color:${color}`;
            const colorTotal = outcomeDoc.outcomeTotals.get(colorKey) || 0;
            const colorLiability = colorTotal * this.getNummaMultiplier('color', color);

            // BigSmall liability
            const bigSmall = round.getBigSmallFromNumber(i);
            const bigSmallKey = `bigsmall:${bigSmall}`;
            const bigSmallTotal = outcomeDoc.outcomeTotals.get(bigSmallKey) || 0;
            const bigSmallLiability = bigSmallTotal * this.getNummaMultiplier('bigsmall', bigSmall);

            // Total liability for this number
            const totalLiability = numberLiability + colorLiability + bigSmallLiability;

            if (totalLiability < minLiability) {
              minLiability = totalLiability;
              bestNumbers = [i];
            } else if (totalLiability === minLiability) {
              bestNumbers.push(i);
            }
          }
          // Pick randomly among bestNumbers if tie
          forcedNumber = bestNumbers[Math.floor(Math.random() * bestNumbers.length)];
          round.setResultFromNumber(forcedNumber);
        } else {
          // Fallback: random result
          round.setResultFromNumber(Math.floor(Math.random() * 10));
        }
        round.isManualResult = false;
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

      // Clean up NummaBetOutcome after result is generated
      // Keep only the last 10 rounds for this duration
      const allOutcomes = await NummaBetOutcome.find({ duration }).sort({ createdAt: -1 });
      if (allOutcomes.length > 10) {
        const toDelete = allOutcomes.slice(10);
        for (const doc of toDelete) {
          await NummaBetOutcome.deleteOne({ _id: doc._id });
          console.log(`[DEBUG] Deleted old NummaBetOutcome for roundId=${doc.roundId}, duration=${duration}`);
        }
      }
      
      // Clean up pending admin result after use
      if (adminResult) {
        await NummaAdminResult.deleteOne({ _id: adminResult._id });
      }
      
    } catch (error) {
      console.error(`Error completing round:`, error);
    }
  }

  // Process all bets for a completed round
  async processBets(round) {
    try {
      const Transaction = require('../models/Transaction');
      const User = require('../models/User');
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
              const balanceBefore = user.balance;
              user.balance += result.winAmount;
              await user.save();
              // Log win transaction
              await Transaction.create({
                user: user._id,
                amount: result.winAmount,
                type: 'credit',
                reference: `Numma Bet Win (${bet.betType}:${bet.betValue})`,
                status: 'completed',
                balanceBefore,
                balanceAfter: user.balance,
                description: `Numma ${bet.betType} bet win on ${bet.betValue}`
              });
              totalPayout += result.winAmount;
            }
          }
          // Always log bet placement (debit)
          if (bet.status === 'pending') {
            const user = await User.findById(bet.userId);
            if (user) {
              const balanceBefore = user.balance + bet.amount; // since bet.amount already deducted before
              await Transaction.create({
                user: user._id,
                amount: bet.amount,
                type: 'debit',
                reference: `Numma Bet (${bet.betType}:${bet.betValue})`,
                status: 'completed',
                balanceBefore,
                balanceAfter: user.balance,
                description: `Numma ${bet.betType} bet placed on ${bet.betValue}`
              });
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

      // Fallback: Force any remaining pending bets to 'lost'
      const pendingBets = await NummaBet.find({ roundId: round._id, status: 'pending' });
      if (pendingBets.length > 0) {
        for (const bet of pendingBets) {
          bet.status = 'lost';
          bet.winAmount = 0;
          await bet.save();
        }
        console.warn(`[Numma] Forced ${pendingBets.length} bets to 'lost' after result processing for round ${round.roundNumber}`);
      }
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

  // Helper to get multiplier based on betType and betValue (case-insensitive)
  getNummaMultiplier(betType, betValue) {
    const type = (betType || '').toLowerCase();
    if (type === 'number') return 9;
    if (type === 'color') return 2;
    if (type === 'bigsmall') return 2;
    return 1;
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
      
      // Restrict: Prevent user from betting on all numbers, all colors, or both big/small in the same round
      // 1. Prevent multiple bets on same betType per round
      const existingSameTypeBet = await NummaBet.findOne({ userId, roundId, betType });
      if (existingSameTypeBet) {
        throw new Error('You have already placed a bet of this type for this round.');
      }

      // 2. Prevent both big and small in same round
      if (betType.toLowerCase() === 'bigsmall') {
        const opposite = betValue === 'Big' ? 'Small' : 'Big';
        const oppositeBet = await NummaBet.findOne({ userId, roundId, betType: 'bigsmall', betValue: opposite });
        if (oppositeBet) {
          throw new Error('You cannot bet on both Big and Small in the same round.');
        }
      }

      // 3. Prevent all colors in same round
      if (betType.toLowerCase() === 'color') {
        const colorBets = await NummaBet.find({ userId, roundId, betType: 'color' });
        if (colorBets.length >= 2) {
          throw new Error('You cannot bet on more than two colors in the same round.');
        }
      }

      // 4. Prevent all numbers in same round
      if (betType.toLowerCase() === 'number') {
        const numberBets = await NummaBet.find({ userId, roundId, betType: 'number' });
        if (numberBets.length >= 9) {
          throw new Error('You cannot bet on all or nearly all numbers in the same round.');
        }
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
      
      // --- Update bet outcome totals in NummaBetOutcome ---
      let outcomeDoc = await NummaBetOutcome.findOne({ roundId, duration });
      if (!outcomeDoc) {
        outcomeDoc = new NummaBetOutcome({ roundId, duration });
        console.log(`[DEBUG] Created new NummaBetOutcome for roundId=${roundId}, duration=${duration}`);
      }
      
      // Multiply amount * backendMultiplier for outcomeValue
      const type = (betType || '').toLowerCase();
      console.log('DEBUG betType received:', betType, 'Normalized:', type);
      const backendMultiplier = this.getNummaMultiplier(type, betValue);
      console.log('DEBUG backendMultiplier:', backendMultiplier, 'from getNummaMultiplier(', type, ',', betValue, ')');
      const outcomeValue = amount * backendMultiplier;
      const allNumbers = Array.from({ length: 10 }, (_, i) => `number:${i}`);
      const allColors = ['color:Red', 'color:Green', 'color:Violet'];
      const allBigSmall = ['bigsmall:Big', 'bigsmall:Small'];
      const allKeys = [...allNumbers, ...allColors, ...allBigSmall];
      allKeys.forEach(key => {
        const prev = outcomeDoc.outcomeTotals.get(key) || 0;
        if (key === `${type}:${betValue}`) {
          outcomeDoc.outcomeTotals.set(key, prev + outcomeValue);
        } else {
          outcomeDoc.outcomeTotals.set(key, prev); // add 0, ensures key always exists
        }
      });
      outcomeDoc.updatedAt = new Date();
      await outcomeDoc.save();
      console.log(`[DEBUG] Updated NummaBetOutcome: roundId=${roundId}, duration=${duration}, key=${type}:${betValue}, total=${outcomeDoc.outcomeTotals.get(`${type}:${betValue}`)}`);
      
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
