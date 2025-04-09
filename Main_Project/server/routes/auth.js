const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, countryCode, mobile, password, referralCode } = req.body;

    // Check if user already exists
    let user = await User.findOne({ mobile, countryCode });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this mobile number' });
    }

    // Create new user
    user = new User({
      name,
      countryCode,
      mobile,
      password
    });

    // Handle referral if provided
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
      }
    }

    await user.save();

    // If this user was referred, update the referrer's referrals
    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        await referrer.addReferral(user._id);
      }
    }

    // Sign JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { countryCode, mobile, password } = req.body;
    console.log('Login attempt:', { countryCode, mobile });

    // Check if user exists
    const user = await User.findOne({ countryCode, mobile }).select('+password');
    if (!user) {
      console.log('User not found with:', { countryCode, mobile });
      return res.status(401).json({ msg: 'Invalid credentials - user not found' });
    }
    console.log('User found:', { id: user._id, role: user.role });

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials - password incorrect' });
    }

    // Sign JWT token
    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        countryCode: user.countryCode,
        mobile: user.mobile,
        role: user.role,
        balance: user.balance,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // For now, simply return a placeholder - we'll add auth middleware later
    res.json({ msg: 'Authentication route - me endpoint (protected)' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
