require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// CORS Headers
app.use((req, res, next) => {
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).json({});
  }
  
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const depositRoutes = require('./routes/deposit');
const commissionSettingsRoutes = require('./routes/commissionSettings');
const SiteSettings = require('./models/SiteSettings');

// Add logging middleware before routes
app.use((req, res, next) => {
  console.log(`\n${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Add debugging for route registration
console.log('Registering routes...');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
console.log('Mounting deposit routes at /api/deposit');
app.use('/api/deposit', depositRoutes);
app.use('/api/withdrawal', require('./routes/withdrawal'));
app.use('/api/commission-settings', commissionSettingsRoutes);

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

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  
  if (err.name === 'MongoError') {
    return res.status(500).json({ success: false, message: 'Database error' });
  }
  
  res.status(500).json({ success: false, message: 'Server error' });
});

// Add not found handler
app.use((req, res) => {
  console.log('Not found:', req.method, req.path);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Game events will be handled here
  require('./utils/socketHandlers')(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  console.error('Process will continue running but may be in an unstable state');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Process will continue running but may be in an unstable state');
});

// Handle MongoDB connection errors
const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.on('disconnected', () => console.log('MongoDB disconnected'));
