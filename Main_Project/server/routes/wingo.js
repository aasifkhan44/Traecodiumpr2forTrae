const express = require('express');
const router = express.Router();
const wingoController = require('../controllers/wingoController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public routes
router.get('/active-rounds', wingoController.getActiveRounds);
router.get('/websocket-status', wingoController.getWebSocketStatus);
router.get('/recent-bets', auth, wingoController.getRecentBets);
router.post('/test', async (req, res) => {
  try {
    console.log('=== TEST ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    
    // Return success with the request body
    res.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: req.body
    });
  } catch (err) {
    console.error('Test endpoint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Protected routes (require authentication)
router.post('/bet', auth, wingoController.placeBet);
router.get('/history', auth, wingoController.getBetHistory);

// Admin routes (require admin permission)
router.post('/control-result', [auth, admin], wingoController.controlRoundResult);

module.exports = router;