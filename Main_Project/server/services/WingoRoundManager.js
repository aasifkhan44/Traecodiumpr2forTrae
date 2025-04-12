const { WingoRound1m, WingoRound3m, WingoRound5m, WingoRound10m } = require('../models/WingoRound');
const WingoBet = require('../models/WingoBet');

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
    if (!round.isControlled) {
      round.result = this.generateRandomResult();
    } else {
      round.result = round.controlledResult;
    }
    await round.save();

    // Process bets
    await this.processBets(round);

    // Wait 3 seconds before creating new round
    setTimeout(() => this.createNewRound(round.duration), 3000);
  }

  generateRandomResult() {
    const number = Math.floor(Math.random() * 10);
    let color;
    if (number === 0) {
      color = 'Red';
    } else if (number === 5) {
      color = 'Violet';
    } else if (number % 2 === 0) {
      color = 'Red';
    } else {
      color = 'Green';
    }
    return { color, number };
  }

  async processBets(round) {
    const bets = await WingoBet.find({ roundId: round._id, status: 'pending' });

    for (const bet of bets) {
      let won = false;
      if (bet.betType === 'color') {
        won = bet.betValue === round.result.color;
      } else { // number
        won = parseInt(bet.betValue) === round.result.number;
      }

      bet.status = won ? 'won' : 'lost';
      bet.winAmount = won ? bet.amount * bet.potential : 0;
      await bet.save();
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
    for (const duration of Object.keys(this.roundModels)) {
      const round = await this.roundModels[duration].findOne({ status: 'open' });
      if (round) {
        activeRounds[duration] = round;
      }
    }
    return activeRounds;
  }
}

module.exports = new WingoRoundManager();