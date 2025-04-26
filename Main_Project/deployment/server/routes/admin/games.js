const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const wingoController = require('../../controllers/wingoController');

// @route   GET api/admin/games/Wingo/rounds
// @desc    Get Wingo game rounds for admin panel
// @access  Private/Admin
router.get('/Wingo/rounds', [auth, admin], wingoController.getAdminWingoRounds);

// @route   POST api/admin/games/Wingo/control-result
// @desc    Control the result of a Wingo round
// @access  Private/Admin
router.post('/Wingo/control-result', [auth, admin], wingoController.controlRoundResult);

module.exports = router;