// Unified Game WebSocket Server for Wingo and Numma
const WebSocket = require('ws');
const WingoRoundManager = require('./WingoRoundManager');
const NummaRoundManager = require('./NummaRoundManager');
const jwt = require('jsonwebtoken');
const config = require('../config');

class GameWebSocketServer {
  constructor() {
    this.server = null;
    this.clients = new Set();
    this.isRunning = false;
    this.serverUrl = null;
  }

  start(httpServer) {
    if (this.isRunning) return true;
    try {
      this.server = new WebSocket.Server({ server: httpServer, path: '/ws/game' });
      this.server.on('connection', this.handleConnection.bind(this));
      this.isRunning = true;
      this.serverUrl = '/ws/game';
      console.log('Unified Game WebSocket server started at /ws/game');
      return true;
    } catch (err) {
      console.error('Failed to start unified WebSocket server:', err);
      return false;
    }
  }

  handleConnection(ws, req) {
    this.clients.add(ws);
    ws.on('message', (msg) => this.handleMessage(ws, msg));
    ws.on('close', () => this.clients.delete(ws));
    ws.on('error', () => this.clients.delete(ws));
    // Optionally send a welcome message
    ws.send(JSON.stringify({ type: 'connection', success: true, message: 'Connected to Game WebSocket server', timestamp: new Date().toISOString() }));
  }

  async handleMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }
    if (!data.game) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing game field' }));
      return;
    }
    if (data.game === 'wingo') {
      await this.handleWingoMessage(ws, data);
    } else if (data.game === 'numma') {
      await this.handleNummaMessage(ws, data);
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown game' }));
    }
  }

  async handleWingoMessage(ws, data) {
    if (data.type === 'getRounds') {
      const activeRounds = await WingoRoundManager.getActiveRounds();
      console.log('[WS] Wingo getRounds - activeRounds:', JSON.stringify(activeRounds));
      // Send as object keyed by duration
      ws.send(JSON.stringify({ type: 'roundUpdate', rounds: activeRounds }));
      return;
    }
    // Ignore bet placement via WebSocket; do nothing for 'bet' type
    // Add more Wingo-specific message handling as needed
  }

  async handleNummaMessage(ws, data) {
    if (data.type === 'getRounds') {
      const activeRounds = await NummaRoundManager.getActiveRounds();
      // Send as object keyed by duration
      ws.send(JSON.stringify({ type: 'roundUpdate', rounds: activeRounds }));
    }
    // Add more Numma-specific message handling as needed
  }
}

module.exports = new GameWebSocketServer();
