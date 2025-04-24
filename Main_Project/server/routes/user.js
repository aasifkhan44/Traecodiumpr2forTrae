const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('Profile update request received:', JSON.stringify(req.body));
    const { name, countryCode, mobile, email, currentPassword, newPassword, isPasswordUpdateOnly } = req.body;
    
    // Find user by ID from auth middleware
    console.log('Finding user with ID:', req.user.id);
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      console.log('User not found with ID:', req.user.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('Found user:', user.name, 'with ID:', user._id);
    console.log('Current user data:', {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      countryCode: user.countryCode
    });
    
    // Determine if this is a password-only update
    const isPasswordUpdate = isPasswordUpdateOnly || 
                           (currentPassword && newPassword && 
                           !name && !mobile && !countryCode && email === undefined);
    
    console.log('Is password-only update?', isPasswordUpdate);
    
    // SECTION 1: PROFILE DATA UPDATE
    if (!isPasswordUpdate) {
      console.log('Processing profile data update');
      
      // Update name if provided
      if (name) {
        console.log('Updating name from', user.name, 'to', name);
        user.name = name;
      }
      
      // Handle email update if provided
      if (email !== undefined) {
        if (!email || email === '') {
          console.log('Clearing email field from', user.email, 'to empty string');
          user.email = '';
        } else {
          // Validate email format
          const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({
              success: false,
              message: `Invalid email format: ${email}. Please check for typos.`
            });
          }
          
          console.log('Updating email from', user.email, 'to', email);
          user.email = email;
        }
      }
      
      // Handle mobile number and country code updates
      if (mobile !== undefined || countryCode !== undefined) {
        // Require both fields to be present if updating either
        if (mobile === undefined || countryCode === undefined) {
          console.log('Missing required field - both mobile and country code required');
          return res.status(400).json({
            success: false,
            message: 'Both mobile number and country code are required'
          });
        }
        
        // Only validate if actually changing the values
        if (mobile !== '' && countryCode !== '') {
          console.log('Checking if mobile already exists:', countryCode, mobile);
          // Check for duplicate mobile numbers
          const mobileExists = await User.findOne({ 
            mobile, 
            countryCode,
            _id: { $ne: req.user.id } 
          });
          
          if (mobileExists) {
            console.log('Mobile number already exists for another user');
            return res.status(400).json({ 
              success: false, 
              message: 'This mobile number is already in use' 
            });
          }
          
          console.log('Updating mobile from', user.mobile, 'to', mobile);
          console.log('Updating country code from', user.countryCode, 'to', countryCode);
          user.mobile = mobile;
          user.countryCode = countryCode;
        }
      }
    }
    
    // SECTION 2: PASSWORD UPDATE
    if (currentPassword && newPassword) {
      console.log('Processing password update');
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        console.log('Password verification failed - incorrect current password');
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
      
      // Validate new password
      if (newPassword.length < 6) {
        console.log('New password too short (< 6 characters)');
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      // Set new password
      console.log('Setting new password');
      user.password = newPassword;
    }
    
    // SECTION 3: SAVE CHANGES
    console.log('About to save user with updated data:', {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      countryCode: user.countryCode,
      // Not logging password
    });
    
    // Save user changes
    const savedUser = await user.save();
    console.log('User saved successfully with ID:', savedUser._id);
    
    // SECTION 4: PREPARE RESPONSE
    // Generate success message
    let successMessage;
    let responseData = {};
    
    if (currentPassword && newPassword) {
      successMessage = 'Password updated successfully';
      
      // Generate and return new token after password change
      const payload = { user: { id: user.id } };
      const newToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'mysecrettoken',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      console.log('Generated new token after password change');
      responseData.newToken = newToken;
    } else {
      successMessage = 'Profile updated successfully!';
    }
    
    // Send success response
    const response = {
      success: true,
      message: successMessage,
      data: {
        name: savedUser.name,
        email: savedUser.email,
        mobile: savedUser.mobile,
        countryCode: savedUser.countryCode
      },
      ...responseData
    };
    
    console.log('Sending success response:', JSON.stringify(response));
    res.json(response);
  } catch (err) {
    console.error('Profile update error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + (err.message || 'Unknown error'),
      errorType: err.name
    });
  }
});

// @route   GET api/user/transactions
// @desc    Get user transactions
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, status, minAmount, maxAmount, startDate, endDate, reference, description, page = 1, limit = 30 } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (reference) filter.reference = { $regex: reference, $options: 'i' };
    if (description) filter.description = { $regex: description, $options: 'i' };
    if (minAmount) filter.amount = { ...filter.amount, $gte: Number(minAmount) };
    if (maxAmount) filter.amount = { ...filter.amount, $lte: Number(maxAmount) };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await Transaction.countDocuments(filter);
    res.json({ success: true, data: transactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Error fetching user transactions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/user/referrals
// @desc    Get user referrals
// @access  Private
router.get('/referrals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get direct referrals (level 1)
    const directReferrals = await User.find({ referredBy: req.user.id })
      .select('name mobile createdAt');
    
    // Format referrals data from user.referrals array
    const referralsData = [];
    
    // Map user's referrals array with additional data
    if (user.referrals && user.referrals.length > 0) {
      for (const ref of user.referrals) {
        try {
          const referredUser = await User.findById(ref.user)
            .select('name mobile createdAt');
          
          if (referredUser) {
            referralsData.push({
              _id: ref.user,
              name: referredUser.name,
              mobile: referredUser.mobile,
              level: ref.level,
              commission: ref.commission,
              joinedDate: referredUser.createdAt
            });
          }
        } catch (err) {
          console.error(`Error finding referred user ${ref.user}:`, err);
        }
      }
    }
    
    res.json({ 
      success: true, 
      data: referralsData,
      directReferralsCount: directReferrals.length,
      totalCommission: user.totalCommission || 0
    });
  } catch (err) {
    console.error('Error fetching referrals:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/user/referral-tree
// @desc    Get user's multi-level referral tree
// @access  Private
router.get('/referral-tree', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get all referrals up to level 10
    const allReferrals = await User.getAllReferrals(req.user.id, 10);
    
    // Format the response
    const formattedReferrals = allReferrals.map(r => ({
      _id: r.user._id,
      name: r.user.name,
      mobile: r.user.mobile,
      level: r.level,
      joinedDate: r.user.createdAt
    }));
    
    // Group by level
    const referralsByLevel = {};
    for (const referral of formattedReferrals) {
      if (!referralsByLevel[referral.level]) {
        referralsByLevel[referral.level] = [];
      }
      referralsByLevel[referral.level].push(referral);
    }
    
    res.json({ 
      success: true, 
      data: formattedReferrals,
      referralsByLevel,
      totalReferrals: formattedReferrals.length 
    });
  } catch (err) {
    console.error('Error fetching referral tree:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/user/commission-settings
// @desc    Get commission settings
// @access  Private
router.get('/commission-settings', auth, async (req, res) => {
  try {
    const CommissionSetting = mongoose.model('CommissionSetting');
    const settings = await CommissionSetting.find({ isActive: true }).sort({ level: 1 });
    
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching commission settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
