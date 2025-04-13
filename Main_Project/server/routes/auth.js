const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

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
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /api/auth/me - Request received');
    console.log('User ID from auth middleware:', req.user._id);
    
    // Get user data from the database
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      console.log('User not found in database for ID:', req.user._id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('User found:', user.name);
    console.log('User balance (raw):', user.balance);
    console.log('User balance type:', typeof user.balance);
    
    // Ensure balance is a number
    const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
    console.log('User balance (parsed):', balance);
    
    // Return user data
    const userData = {
      id: user._id,
      name: user.name,
      countryCode: user.countryCode,
      mobile: user.mobile,
      role: user.role,
      balance: balance, // Use the parsed balance
      referralCode: user.referralCode,
      email: user.email
    };
    
    console.log('Sending user data:', userData);
    
    res.json({ 
      success: true, 
      user: userData
    });
  } catch (err) {
    console.error('Error fetching user data:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// FOR DEVELOPMENT PURPOSES ONLY - Creates a test admin account
router.post('/create-test-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production' });
  }
  
  try {
    // Check if admin already exists
    let admin = await User.findOne({ 
      $or: [
        { mobile: '9999999999' },
        { email: 'admin@test.com' }
      ]
    });

    if (admin) {
      console.log('Admin already exists, updating role');
      // Ensure user has admin role
      admin.role = 'admin';
      await admin.save();
      
      // Generate a fresh token with admin role
      const token = admin.getSignedJwtToken();
      
      return res.json({
        success: true,
        message: 'Admin account updated',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          mobile: admin.mobile,
          role: admin.role
        }
      });
    }

    // Create new admin user
    admin = new User({
      name: 'Test Admin',
      countryCode: '+1',
      mobile: '9999999999',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin'
    });

    await admin.save();
    console.log('Created new admin user');

    // Generate token with admin role
    const token = admin.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Admin account created',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        mobile: admin.mobile,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Error creating admin account:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
