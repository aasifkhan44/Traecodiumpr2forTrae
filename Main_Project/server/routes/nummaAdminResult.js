const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const NummaAdminResult = require('../models/NummaAdminResult');
const requireAdmin = require('../middleware/auth');

// Get the declared admin result for a round (if any)
router.get('/', requireAdmin, async (req, res) => {
  let { roundId, duration } = req.query;
  if (!roundId || !duration) {
    return res.status(400).json({ success: false, error: 'Missing roundId or duration' });
  }
  try {
    roundId = mongoose.Types.ObjectId(roundId); // Ensure ObjectId
    const doc = await NummaAdminResult.findOne({ roundId, duration: Number(duration) });
    if (!doc) return res.status(404).json({ success: false, error: 'No declared result' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Error in GET /numma/admin/result-info:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Declare admin result for a round
router.post('/', requireAdmin, async (req, res) => {
  let { roundId, duration, number } = req.body;
  if (!roundId || !duration || typeof number === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing roundId, duration, or number' });
  }
  try {
    roundId = mongoose.Types.ObjectId(roundId);
    duration = Number(duration);
    number = Number(number);

    // Upsert: update if exists, insert if not
    const doc = await NummaAdminResult.findOneAndUpdate(
      { roundId, duration },
      { $set: { number, createdAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
