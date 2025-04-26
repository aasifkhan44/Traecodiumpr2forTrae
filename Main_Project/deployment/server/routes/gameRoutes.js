const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
// Public routes
router.get('/', gameController.getAllGames);
router.get('/default', gameController.getDefaultGame);
router.get('/:identifier', gameController.getGame);

// Admin routes - protected
router.patch('/:identifier', [auth, adminAuth], gameController.updateGame);
module.exports = router;