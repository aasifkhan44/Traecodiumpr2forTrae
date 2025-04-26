// Centralized WebSocket URL management for the client
// Usage: import { WS_URL } from '../utils/ws';

export const WS_URL =
  ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || 'ws://localhost:5000/ws/game');
