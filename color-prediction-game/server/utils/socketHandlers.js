const Game = require('../models/Game');

module.exports = (io, socket) => {
  // Join a game room
  socket.on('joinGame', async (data) => {
    const { gameId } = data;
    socket.join(`game:${gameId}`);
    console.log(`User ${socket.id} joined game ${gameId}`);
    
    // Emit current game state to the user
    try {
      const currentGame = await Game.findById(gameId);
      if (currentGame) {
        socket.emit('gameState', currentGame);
      }
    } catch (error) {
      console.error('Error finding game:', error);
    }
  });
  
  // Leave a game room
  socket.on('leaveGame', (data) => {
    const { gameId } = data;
    socket.leave(`game:${gameId}`);
    console.log(`User ${socket.id} left game ${gameId}`);
  });
  
  // Place a bet
  socket.on('placeBet', async (data) => {
    const { gameId, userId, color, amount } = data;
    console.log(`User ${userId} placed a bet of ${amount} on ${color} for game ${gameId}`);
    
    // In a real implementation, we would process the bet here
    // For now, we'll just emit a confirmation
    socket.emit('betConfirmed', {
      success: true,
      bet: { gameId, userId, color, amount }
    });
  });
};
