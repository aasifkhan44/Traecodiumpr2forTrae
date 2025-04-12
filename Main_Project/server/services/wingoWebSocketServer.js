const WebSocket = require('ws');
const WingoRoundManager = require('./WingoRoundManager');

class WingoWebSocketServer {
  static instance = null;

  static getInstance() {
    if (!WingoWebSocketServer.instance) {
      WingoWebSocketServer.instance = new WingoWebSocketServer();
    }
    return WingoWebSocketServer.instance;
  }

  constructor(port = 3001) {
    this.port = port;
    this.server = null;
    this.clients = new Set();
    this.updateInterval = null;
    this.isRunning = false;
    this.serverUrl = null;
    this.basePort = port;
    this.currentPort = this.basePort;
    this.maxPortAttempts = 5; // Try up to 5 different ports
  }

  start(httpServer = null) {
    try {
      // If we have an HTTP server, attach to it directly
      // This is the most reliable approach
      if (httpServer) {
        // Try to attach to the HTTP server first
        try {
          this.server = new WebSocket.Server({ server: httpServer });
          console.log('Wingo WebSocket server attached to HTTP server');
          
          // Set the server URL based on the HTTP server address
          const address = httpServer.address() || {};
          const host = address.address === '::' ? 'localhost' : (address.address || 'localhost');
          const port = address.port || 5000;
          this.serverUrl = `ws://${host}:${port}`;
          console.log(`WebSocket server URL: ${this.serverUrl}`);
          
          this.isRunning = true;
        } catch (err) {
          console.error('Failed to attach WebSocket server to HTTP server:', err.message);
          // If attaching fails, try to create a standalone server
          return this.createStandaloneServer();
        }
      } else {
        // No HTTP server provided, create a standalone server
        return this.createStandaloneServer();
      }
      
      // Set up event handlers
      this.setupEventHandlers();

      // Start broadcasting updates
      this.startBroadcasting();

      return true;
    } catch (err) {
      console.error('Error starting Wingo WebSocket server:', err);
      this.isRunning = false;
      return false;
    }
  }

  createStandaloneServer() {
    console.log(`Wingo WebSocket server initializing with base port ${this.currentPort}`);
    this.tryConnect(this.currentPort);
  }

  tryConnect(port) {
    if (!this.isRunning) {
      console.log('Cannot start WebSocket server during shutdown');
      return;
    }

    console.log(`Attempting to start WebSocket server on port ${port}...`);
    
    // If we already have a server, close it first
    if (this.server) {
      console.log('Closing existing WebSocket server...');
      this.server.close(() => {
        console.log('Existing WebSocket server closed');
        this.startServer(port);
      });
      return;
    }

    this.startServer(port);
  }

  startServer(port) {
    // Try multiple ports if needed
    try {
      this.server = new WebSocket.Server({ port: port });
      this.port = port;
      
      // Set the server URL for standalone server
      this.serverUrl = `ws://localhost:${port}`;
      console.log(`Wingo WebSocket server running on port ${port}`);
      console.log(`WebSocket server URL: ${this.serverUrl}`);
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Start broadcasting updates
      this.startBroadcasting();
      
      this.isRunning = true;
      return true;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} already in use, trying next port...`);
        this.handlePortInUse(port);
      } else {
        console.error('WebSocket server error:', err);
      }
    }
  }

  handlePortInUse(port) {
    const nextPort = port + 1;
    if (nextPort > this.basePort + this.maxPortAttempts) {
      console.error(`Failed to find an available port after ${this.maxPortAttempts} attempts`);
      return;
    }
    console.log(`Attempting to restart WebSocket server on port ${nextPort}`);
    setTimeout(() => {
      this.tryConnect(nextPort);
    }, 1000); // Wait a second before trying the next port
  }

  setupEventHandlers() {
    if (!this.server) return false;
    
    this.server.on('connection', this.handleConnection.bind(this));
    this.server.on('error', this.handleServerError.bind(this));
    
    return true;
  }

  handleConnection(ws, req) {
    console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
    
    // Add client to the set
    this.clients.add(ws);

    // Send initial data immediately
    this.sendActiveRounds(ws);

    // Set up client event handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      this.clients.delete(ws);
    });

    // Send a welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Wingo WebSocket server',
      timestamp: new Date().toISOString()
    }));
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      // Handle different message types
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  }

  handleServerError(error) {
    console.error('WebSocket server error:', error);
    
    // Check if this is a port-in-use error
    if (error && error.code === 'EADDRINUSE') {
      console.log('Port already in use, attempting to restart on a different port');
      // Try to restart the server on a different port
      this.stop();
      setTimeout(() => {
        this.port += 1;
        console.log(`Attempting to restart WebSocket server on port ${this.port}`);
        this.createStandaloneServer();
      }, 1000);
    }
  }

  async sendActiveRounds(ws) {
    try {
      const activeRounds = await WingoRoundManager.getActiveRounds();
      
      // Convert to array format for easier client processing
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => {
        return { 
          duration: parseInt(duration), 
          ...round.toObject() 
        };
      });

      ws.send(JSON.stringify({
        type: 'roundUpdate',
        rounds: roundsArray,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error sending active rounds:', err);
      ws.send(JSON.stringify({
        type: 'roundError',
        error: 'LOAD_ROUNDS_FAILED',
        message: 'Failed to load active rounds',
        details: err.message
      }));
    }
  }

  async broadcastActiveRounds() {
    try {
      if (this.clients.size === 0) return;

      const activeRounds = await WingoRoundManager.getActiveRounds();
      
      // Convert to array format for easier client processing
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => {
        return { 
          duration: parseInt(duration), 
          ...round.toObject() 
        };
      });

      const message = JSON.stringify({
        type: 'roundUpdate',
        rounds: roundsArray,
        timestamp: new Date().toISOString()
      });

      // Broadcast to all connected clients
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    } catch (err) {
      console.error('Error broadcasting active rounds:', err);
      this.broadcastMessage({
        type: 'roundError',
        error: 'BROADCAST_FAILED',
        message: 'Failed to update rounds',
        details: err.message
      });
    }
  }

  startBroadcasting() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Set up interval to broadcast updates every second
    this.updateInterval = setInterval(() => {
      this.broadcastActiveRounds();
    }, 1000);
  }

  stop() {
    // Clear the update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close all client connections
    for (const client of this.clients) {
      client.terminate();
    }
    this.clients.clear();

    // Close the server
    if (this.server) {
      this.server.close(() => {
        console.log('Wingo WebSocket server closed');
      });
      this.server = null;
    }
    
    // Reset server status
    this.isRunning = false;
    this.serverUrl = null;
  }
  
  // Get the current status of the WebSocket server
  getStatus() {
    return {
      isRunning: this.isRunning,
      serverUrl: this.serverUrl,
      port: this.port,
      clientCount: this.clients.size
    };
  }
  
  // Get the WebSocket server URL
  getServerUrl() {
    return this.serverUrl;
  }
}

module.exports = WingoWebSocketServer;