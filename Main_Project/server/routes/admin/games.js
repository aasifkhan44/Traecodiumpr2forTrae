const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const wingoController = require('../../controllers/wingoController');

// @route   GET api/admin/games/Wingo/rounds
// @desc    Get Wingo game rounds for admin panel
// @access  Private/Admin
router.get('/Wingo/rounds', [auth, admin], wingoController.getAdminWingoRounds);

module.exports = router;