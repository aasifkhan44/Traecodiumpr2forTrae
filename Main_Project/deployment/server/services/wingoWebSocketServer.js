const WebSocket = require('ws');
const WingoRoundManager = require('./WingoRoundManager');
const jwt = require('jsonwebtoken');
const config = require('../config');
const WingoBet = require('../models/WingoBet');

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
    this.adminClients = new Set(); // Track admin clients separately
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
          // Attach to HTTP server at specific path for Wingo
          this.server = new WebSocket.Server({ server: httpServer, path: '/ws/wingo' });
          console.log('Wingo WebSocket server attached to HTTP server at /ws/wingo');
          const address = httpServer.address() || {};
          const host = address.address === '::' ? 'localhost' : (address.address || 'localhost');
          const port = address.port || 5000;
          this.serverUrl = `ws://${host}:${port}/ws/wingo`;
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
    
    // Fix: Ensure handleConnection and handleServerError are defined and bound correctly
    if (typeof this.handleConnection !== 'function') {
      throw new Error('handleConnection is not defined on WingoWebSocketServer');
    }
    if (typeof this.handleServerError !== 'function') {
      // Provide a default handler if missing
      this.handleServerError = (err) => {
        console.error('WebSocket server error:', err);
      };
    }
    this.server.on('connection', this.handleConnection.bind(this));
    this.server.on('error', this.handleServerError.bind(this));
    
    return true;
  }

  handleConnection(ws, req) {
    try {
      console.log('New client connected to Wingo WebSocket');
      
      // Add the client to our set of connected clients
      this.clients.add(ws);
      
      // Attach userId if available from query or headers
      let userId = null;
      // Try to extract userId from query string (e.g., ws://host:port?userId=xxx)
      if (req && req.url) {
        const url = require('url');
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.query && parsedUrl.query.userId) {
          userId = parsedUrl.query.userId;
        }
      }
      // Or from headers (if sent by the client)
      if (!userId && req && req.headers && req.headers['x-user-id']) {
        userId = req.headers['x-user-id'];
      }
      // Or from cookies (if sent by the client)
      if (!userId && req && req.headers && req.headers.cookie) {
        const cookie = require('cookie');
        const cookies = cookie.parse(req.headers.cookie);
        if (cookies.userId) userId = cookies.userId;
      }
      if (userId) {
        ws.userId = userId;
      }
      
      // Set up event handlers for this client
      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });
      
      ws.on('close', () => {
        console.log('Client disconnected from Wingo WebSocket');
        this.clients.delete(ws);
        this.adminClients.delete(ws); // Also remove from admin clients if present
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
        this.adminClients.delete(ws); // Also remove from admin clients if present
      });
      
      // Send active rounds to the client
      this.sendActiveRounds(ws);

      // Send welcome message to the client
      ws.send(JSON.stringify({
        type: 'connection',
        success: true,
        message: 'Connected to Wingo WebSocket server',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error handling new WebSocket connection:', error);
    }
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      // Handle different message types
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      } else if (data.type === 'getRounds') {
        this.sendActiveRounds(ws);
        return;
      } else if (data.type === 'admin-auth') {
        // Handle admin authentication
        this.handleAdminAuth(ws, data.token);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  }
  
  // Handle admin authentication
  handleAdminAuth(ws, token) {
    try {
      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication token missing',
          code: 'AUTH_MISSING_TOKEN'
        }));
        return;
      }
      
      // Fix: Remove "Bearer " prefix if present
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      // Verify the token
      jwt.verify(token, config.jwtSecret, async (err, decoded) => {
        if (err) {
          console.error('JWT verification error:', err.message);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid authentication token: ' + err.message,
            code: 'AUTH_INVALID_TOKEN'
          }));
          return;
        }
        
        console.log('Decoded JWT token:', decoded);
        
        // Enhanced admin check that handles both approaches
        let isAdmin = false;
        
        // First check if role information is in the token
        if (decoded?.role === 'admin' || decoded?.isAdmin === true || 
            decoded?.userType === 'admin' || decoded?.admin === true) {
          isAdmin = true;
          console.log('Admin role found in token payload');
        } 
        // If no role in token, check the database for user role
        else if (decoded?.id) {
          try {
            console.log('Looking up user role in database for ID:', decoded.id);
            // Import User model
            const User = require('../models/User');
            const user = await User.findById(decoded.id);
            
            if (user && user.role === 'admin') {
              isAdmin = true;
              console.log('Admin role confirmed from database');
            } else {
              console.log('User found in database but not admin:', user?.role);
            }
          } catch (dbErr) {
            console.error('Database lookup error:', dbErr);
          }
        }
          
        if (!isAdmin) {
          console.log('User not admin:', decoded);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unauthorized: Admin access required',
            code: 'AUTH_NOT_ADMIN'
          }));
          return;
        }
        
        // Mark this connection as an admin
        ws.isAdmin = true;
        ws.userId = decoded?.id || decoded?._id || decoded?.userId || 'unknown';
        this.adminClients.add(ws);
        
        console.log(`Admin authorized via WebSocket: ${ws.userId}`);
        
        // Send success message
        ws.send(JSON.stringify({
          type: 'admin-auth-success',
          message: 'Admin authentication successful',
          userId: ws.userId
        }));
        
        // Send current rounds data for admin
        this.sendAdminRoundsData(ws);
      });
    } catch (err) {
      console.error('Error during admin authentication:', err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication error: ' + err.message,
        code: 'AUTH_ERROR'
      }));
    }
  }
  
  async getAdminRoundsData() {
    try {
      const rounds = await WingoRoundManager.getAllRounds();
      
      // For each round, get the betting statistics
      const roundsWithStats = await Promise.all(
        // Check if rounds is an array before mapping
        Array.isArray(rounds) 
          ? rounds.map(async (round) => {
              const betStats = await this.getBettingStats(round._id);
              return {
                ...(round.toObject ? round.toObject() : round),
                betStats
              };
            })
          : []
      );
      
      return roundsWithStats;
    } catch (err) {
      console.error('Error getting admin rounds data:', err);
      return [];
    }
  }
  
  // Send detailed rounds data to admin clients
  async sendAdminRoundsData(ws) {
    try {
      const roundsWithStats = await this.getAdminRoundsData();
      
      ws.send(JSON.stringify({
        type: 'roundsUpdate',
        rounds: roundsWithStats,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error sending admin rounds data:', err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to get rounds data',
        code: 'ROUNDS_DATA_ERROR'
      }));
    }
  }
  
  // Get betting statistics for a specific round
  async getBettingStats(roundId) {
    try {
      // Get all bets for this round
      const bets = await WingoBet.find({ roundId });
      
      const betStats = {
        colors: {
          Red: { count: 0, amount: 0, potential: 0 },
          Green: { count: 0, amount: 0, potential: 0 },
          Violet: { count: 0, amount: 0, potential: 0 }
        },
        numbers: {}
      };
      
      // Initialize numbers
      for (let i = 0; i < 10; i++) {
        betStats.numbers[i] = { count: 0, amount: 0, potential: 0 };
      }
      
      // Calculate statistics
      for (const bet of bets) {
        if (bet.betType === 'color' && betStats.colors[bet.betValue]) {
          betStats.colors[bet.betValue].count++;
          betStats.colors[bet.betValue].amount += bet.amount;
          
          // Calculate potential payout (using standard multipliers: 2x for colors)
          betStats.colors[bet.betValue].potential += bet.amount * 2;
        } else if (bet.betType === 'number') {
          const num = parseInt(bet.betValue);
          if (!isNaN(num) && num >= 0 && num <= 9) {
            if (!betStats.numbers[num]) {
              betStats.numbers[num] = { count: 0, amount: 0, potential: 0 };
            }
            betStats.numbers[num].count++;
            betStats.numbers[num].amount += bet.amount;
            
            // Calculate potential payout (using standard multipliers: 9x for numbers)
            betStats.numbers[num].potential += bet.amount * 9;
          }
        }
      }
      
      return betStats;
    } catch (err) {
      console.error('Error getting betting stats for round:', err);
      return null;
    }
  }
  
  // Broadcast bet updates to admin clients
  async broadcastBetUpdate(bet) {
    try {
      if (this.adminClients.size === 0) return;
      
      // Get updated betting stats for this round
      const betStats = await this.getBettingStats(bet.roundId);
      
      const message = JSON.stringify({
        type: 'betUpdate',
        roundId: bet.roundId,
        betStats,
        timestamp: new Date().toISOString()
      });
      
      // Send update to all admin clients
      for (const client of this.adminClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    } catch (err) {
      console.error('Error broadcasting bet update:', err);
    }
  }
  
  // Send active rounds to a specific client (Numma-style)
  async sendActiveRounds(ws) {
    try {
      const activeRounds = await WingoRoundManager.getActiveRounds();
      // Ensure duration is always a number in the payload, and use array format
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => {
        const obj = (typeof round.toObject === 'function') ? round.toObject() : round;
        return {
          ...obj,
          duration: Number(duration)
        };
      });
      ws.send(JSON.stringify({
        type: 'roundUpdate',
        rounds: roundsArray
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

  // Broadcast active rounds to all clients (Numma-style)
  async broadcastActiveRounds() {
    try {
      if (this.clients.size === 0) return;
      const activeRounds = await WingoRoundManager.getActiveRounds();
      // Ensure duration is always a number in the payload, and use array format
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => {
        const obj = (typeof round.toObject === 'function') ? round.toObject() : round;
        return {
          ...obj,
          duration: Number(duration)
        };
      });
      const message = JSON.stringify({
        type: 'roundUpdate',
        rounds: roundsArray
      });
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
      // If we have admin clients, send them detailed data including bet statistics
      if (this.adminClients.size > 0) {
        for (const adminClient of this.adminClients) {
          if (adminClient.readyState === WebSocket.OPEN) {
            this.sendAdminRoundsData(adminClient);
          }
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
    // Optimization: Remove interval-based broadcasting to reduce server load
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    // No interval set here; updates will be triggered by game events only
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
  
  // Broadcast a message to all connected clients
  broadcastMessage(data) {
    const message = JSON.stringify(data);
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  
  // Broadcast a message only to admin clients
  broadcastAdminMessage(data) {
    const message = JSON.stringify(data);
    
    for (const client of this.adminClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Send a balance update to a specific user
  sendUserBalanceUpdate(userId, balance) {
    for (const client of this.clients) {
      if (client.userId && client.userId.toString() === userId.toString() && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'balanceUpdate',
          balance
        }));
      }
    }
  }
}

module.exports = WingoWebSocketServer;