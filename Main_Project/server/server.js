require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const NummaRoundManager = require('./services/NummaRoundManager');
const gameWebSocketServer = require('./services/gameWebSocketServer');
const wingoController = require('./controllers/wingoController');

const app = express();

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : ['http://localhost:5173', 'http://localhost:5175', 'http://127.0.0.1:57867', 'http://localhost:3005'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Upgrade', 'Connection', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Extensions'],
  exposedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const depositRoutes = require('./routes/deposit');
const commissionSettingsRoutes = require('./routes/commissionSettings');
const wingoRoutes = require('./routes/wingo');
const adminGamesRoutes = require('./routes/admin/games');
const nummaRoutes = require('./routes/numma');
const nummaAdminResultRouter = require('./routes/nummaAdminResult');
const SiteSettings = require('./models/SiteSettings');

// Mount routers
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin/games', adminGamesRoutes);
console.log('Mounting deposit routes at /api/deposit');
app.use('/api/deposit', depositRoutes);
app.use('/api/withdrawal', require('./routes/withdrawal'));
app.use('/api/commission-settings', commissionSettingsRoutes);
console.log('Mounting wingo routes at /api/wingo');
app.use('/api/wingo', wingoRoutes);
app.use('/api/numma', nummaRoutes);
app.use('/api/numma/admin/result-info', nummaAdminResultRouter);

// Public route for site settings
app.get('/api/site-settings', async (req, res) => {
  try {
    const settings = await SiteSettings.findOne();
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Site settings not found' });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching site settings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 
      process.env.CLIENT_URL : 
      ['http://localhost:5173', 'http://localhost:5175', 'http://127.0.0.1:57867', 'http://localhost:3005'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true, // Allow Engine.IO version 3 compatibility
  path: '/socket.io/',
  transports: ['websocket', 'polling'], // Allow both WebSocket and HTTP long-polling
  // Handle upgrade properly
  handlePreflightRequest: (req, res) => {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token',
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Max-Age': 86400,
    };
    res.writeHead(200, headers);
    res.end();
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  const sendWingoRounds = async () => {
    try {
      const activeRounds = await require('./services/WingoRoundManager').getActiveRounds();
      const roundsArray = Object.entries(activeRounds).map(([duration, round]) => ({
        duration: parseInt(duration),
        ...round.toObject()
      }));
      socket.emit('wingoRounds', { rounds: roundsArray });
    } catch (err) {
      console.error('Error sending Wingo rounds:', err);
    }
  };
  
  sendWingoRounds();
  const updateInterval = setInterval(sendWingoRounds, 1000);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    clearInterval(updateInterval);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message
  });
});

// Not found handler
app.use((req, res) => {
  console.log('Not found:', req.method, req.path);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize Wingo game rounds
    wingoController.initializeGame();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close other applications using this port or change the port number.`);
      } else {
        console.error('Server error:', err);
      }
    });

    // --- Unified WebSocket upgrade handling for both games ---
    // Start unified Game WebSocket server
    try {
      const started = gameWebSocketServer.start(server);
      if (started) {
        console.log('Unified Game WebSocket server started at /ws/game');
      } else {
        console.error('Failed to start Unified Game WebSocket server');
      }
    } catch (err) {
      console.error('Error starting Unified Game WebSocket server:', err);
    }

    // START NUMMA ROUND MANAGER
    try {
      NummaRoundManager.start();
      console.log('Numma Round Manager started (all durations)');
    } catch (err) {
      console.error('Error starting Numma Round Manager:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Handle process events
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle MongoDB connection events
const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.on('disconnected', () => console.log('MongoDB disconnected'));
db.once('open', async () => {
  console.log('MongoDB connected');
});