const express = require('express');
const router = express.Router();
const wingoController = require('../controllers/wingoController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public routes
router.get('/active-rounds', wingoController.getActiveRounds);
router.get('/websocket-status', wingoController.getWebSocketStatus);

// Protected routes (require authentication)
router.post('/bet', auth, wingoController.placeBet);
router.get('/history', auth, wingoController.getBetHistory);

// Admin routes (require admin permission)
router.post('/control-result', [auth, admin], wingoController.controlRoundResult);

module.exports = router;