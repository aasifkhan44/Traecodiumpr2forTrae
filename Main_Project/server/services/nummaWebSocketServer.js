const WebSocket = require('ws');
const nummaRoundManager = require('./NummaRoundManager');

class NummaWebSocketServer {
  constructor() {
    this.server = null;
    this.clients = new Set();
    this.isRunning = false;
  }

  // Initialize the WebSocket server
  init(httpServer) {
    if (this.isRunning) return this;

    try {
      // Create WebSocket server
      this.server = new WebSocket.Server({
        server: httpServer,
        path: '/ws/numma'
      });

      // Set up event handlers
      this.server.on('connection', this.handleConnection.bind(this));
      this.isRunning = true;

      console.log('Numma WebSocket server initialized');

      // Make instance globally available
      global.nummaWebSocketServer = this;

      return this;
    } catch (error) {
      console.error('Error initializing Numma WebSocket server:', error);
      return null;
    }
  }

  // Handle new WebSocket connection
  handleConnection(ws, req) {
    console.log('New client connected to Numma WebSocket');
    
    // Add client to set
    this.clients.add(ws);
    
    // Send active rounds immediately
    this.sendActiveRounds(ws);
    
    // Set up event handlers for this connection
    ws.on('message', (message) => this.handleMessage(ws, message));
    
    ws.on('close', () => {
      console.log('Client disconnected from Numma WebSocket');
      this.clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  // Handle incoming message
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      if (data.type === 'getRounds') {
        this.sendActiveRounds(ws);
      }
      
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Send active rounds to a specific client
  async sendActiveRounds(ws) {
    try {
      const activeRounds = await nummaRoundManager.getActiveRounds();
      
      // Convert to array format
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => ({
        duration: parseInt(duration),
        ...round.toObject()
      }));
      
      ws.send(JSON.stringify({
        type: 'roundUpdate',
        rounds: roundsArray
      }));
      
    } catch (error) {
      console.error('Error sending active rounds:', error);
    }
  }

  // Broadcast active rounds to all clients
  async broadcastActiveRounds() {
    try {
      const activeRounds = await nummaRoundManager.getActiveRounds();
      
      // Convert to array format
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => ({
        duration: parseInt(duration),
        ...round.toObject()
      }));
      
      this.broadcast({
        type: 'roundUpdate',
        rounds: roundsArray
      });
      
    } catch (error) {
      console.error('Error broadcasting active rounds:', error);
    }
  }

  // Broadcast round result to all clients
  broadcastResult(round) {
    try {
      this.broadcast({
        type: 'resultUpdate',
        result: {
          roundId: round._id,
          roundNumber: round.roundNumber,
          duration: round.duration,
          ...round.result
        }
      });
    } catch (error) {
      console.error('Error broadcasting result:', error);
    }
  }

  // Broadcast message to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Get status of WebSocket server
  getStatus() {
    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size
    };
  }
}

// Create singleton instance
const nummaWebSocketServer = new NummaWebSocketServer();

module.exports = nummaWebSocketServer;
