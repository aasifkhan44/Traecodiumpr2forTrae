const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const DepositRequest = require('../models/DepositRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const adminMiddleware = require('../middleware/admin');
const PaymentMethod = require('../models/PaymentMethod');
const SmtpSettings = require('../models/SmtpSettings');
const EmailTemplate = require('../models/EmailTemplate');
const SiteSettings = require('../models/SiteSettings');
const PaymentSettings = require('../models/PaymentSettings');
const WithdrawalSettings = require('../models/WithdrawalSettings');
const Game = require('../models/Game');
const { sendEmail, testSmtpConnection } = require('../utils/emailService');

// @route   GET api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private/Admin
router.get('/dashboard', adminMiddleware, async (req, res) => {
  try {
    // Get counts for dashboard summary
    const totalUsers = await User.countDocuments();
    const pendingDepositRequests = await DepositRequest.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingDepositRequests
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/site-settings
// @desc    Get site settings
// @access  Private/Admin
router.get('/site-settings', adminMiddleware, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching site settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/site-settings
// @desc    Update site settings
// @access  Private/Admin
router.put('/site-settings', adminMiddleware, async (req, res) => {
  try {
    const { siteName, logoUrl, faviconUrl } = req.body;

    // Get existing settings or create default settings if none exist
    let settings = await SiteSettings.getSiteSettings();

    // Update settings with new values if provided
    if (siteName !== undefined) settings.siteName = siteName;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (faviconUrl !== undefined) settings.faviconUrl = faviconUrl;

    // Save updated settings
    await settings.save();

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      data: settings
    });
  } catch (err) {
    console.error('Error updating site settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error('Error getting users:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/users/:id
// @desc    Get single user
// @access  Private/Admin
router.get('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Error getting user:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/users/:id', adminMiddleware, async (req, res) => {
  const {
    name,
    countryCode,
    mobile,
    role,
    balance,
    isActive,
    referralCode
  } = req.body;

  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Build update object with only the fields that were sent
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (countryCode !== undefined) updateFields.countryCode = countryCode;
    if (mobile !== undefined) updateFields.mobile = mobile;
    if (role !== undefined) updateFields.role = role;
    if (balance !== undefined) updateFields.balance = balance;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (referralCode !== undefined) updateFields.referralCode = referralCode;

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Error updating user:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/users/:id/update-password
// @desc    Update user password
// @access  Private/Admin
router.put('/users/:id/update-password', adminMiddleware, async (req, res) => {
  const { password } = req.body;

  // Validate password
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a password with 6 or more characters'
    });
  }

  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user password (let the User model's pre-save hook handle the hashing)
    // This avoids double-hashing issues
    user.password = password;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/users/:id/adjust-balance
// @desc    Adjust user balance (add or deduct)
// @access  Private/Admin
router.put('/users/:id/adjust-balance', adminMiddleware, async (req, res) => {
  const { amount, type, reason } = req.body;

  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid positive amount'
    });
  }

  // Validate type
  if (!type || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Type must be either "add" or "deduct"'
    });
  }

  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate new balance
    let newBalance;
    if (type === 'add') {
      newBalance = user.balance + parseFloat(amount);
    } else {
      // Check if user has enough balance
      if (user.balance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'User does not have enough balance'
        });
      }
      newBalance = user.balance - parseFloat(amount);
    }

    // Update user's balance
    user.balance = newBalance;
    await user.save();

    // Could also record this transaction in a Transaction model if needed

    res.json({
      success: true,
      message: `Balance ${type === 'add' ? 'added' : 'deducted'} successfully`,
      data: {
        userId: user._id,
        previousBalance: type === 'add' ? newBalance - parseFloat(amount) : newBalance + parseFloat(amount),
        currentBalance: newBalance,
        amount: parseFloat(amount),
        type,
        reason: reason || 'Admin adjustment'
      }
    });
  } catch (err) {
    console.error('Error adjusting balance:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user (soft delete - mark as inactive)
// @access  Private/Admin
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - just mark as inactive
    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/games
// @desc    Get all games
// @access  Private/Admin
router.get('/games', adminMiddleware, async (req, res) => {
  try {
    const games = await Game.find();
    res.json({ success: true, data: games });
  } catch (err) {
    console.error('Error fetching games:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT/PATCH api/admin/games/:identifier
// @desc    Update game settings
// @access  Private/Admin
router.put('/games/:identifier', adminMiddleware, updateGame);
router.patch('/games/:identifier', adminMiddleware, updateGame);

// Game update handler function
async function updateGame(req, res) {
  try {
    const { isActive, isDefault, settings, description, thumbnailUrl, cardImageUrl } = req.body;
    
    // Decode and normalize the identifier
    const decodedIdentifier = decodeURIComponent(req.params.identifier);
    
    // Find game using case-insensitive match
    const game = await Game.findOne({
      identifier: { $regex: new RegExp(`^${decodedIdentifier}$`, 'i') }
    });
    
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Validate URLs
    if (thumbnailUrl && !thumbnailUrl.match(/^(https?:\/\/|\/)/)) {
      return res.status(400).json({ success: false, message: 'Thumbnail URL must be either HTTPS or relative path' });
    }
    if (cardImageUrl && !cardImageUrl.match(/^(https?:\/\/|\/)/)) {
      return res.status(400).json({ success: false, message: 'Card image URL must be either HTTPS or relative path' });
    }

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Update fields if provided
    if (typeof isActive === 'boolean') game.isActive = isActive;
    if (typeof isDefault === 'boolean') game.isDefault = isDefault;
    if (settings) game.settings = { ...game.settings, ...settings };
    if (description) game.description = description;
    if (thumbnailUrl) game.thumbnailUrl = thumbnailUrl;
    if (cardImageUrl) game.cardImageUrl = cardImageUrl;

    await game.save();
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Error updating game:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Import the upload middleware
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// @route   POST api/admin/games/:identifier/upload-logo
// @desc    Upload game logo image
// @access  Private/Admin
router.post('/games/:identifier/upload-logo', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const game = await Game.findOne({ identifier: req.params.identifier });
    if (!game) {
      // Delete the uploaded file if game not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // If there's an existing logo, delete it
    if (game.thumbnailUrl && game.thumbnailUrl !== '') {
      const oldFilePath = path.join(__dirname, '..', game.thumbnailUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update the game with the new logo URL
    const relativeFilePath = `/uploads/games/${path.basename(req.file.path)}`;
    game.thumbnailUrl = relativeFilePath;
    await game.save();

    res.json({
      success: true,
      message: 'Game logo uploaded successfully',
      data: {
        thumbnailUrl: game.thumbnailUrl
      }
    });
  } catch (err) {
    console.error('Error uploading game logo:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/admin/games/:identifier/upload-card
// @desc    Upload game card image
// @access  Private/Admin
router.post('/games/:identifier/upload-card', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const game = await Game.findOne({ identifier: req.params.identifier });
    if (!game) {
      // Delete the uploaded file if game not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // If there's an existing card image, delete it
    if (game.cardImageUrl && game.cardImageUrl !== '') {
      const oldFilePath = path.join(__dirname, '..', game.cardImageUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update the game with the new card image URL
    const relativeFilePath = `/uploads/games/${path.basename(req.file.path)}`;
    game.cardImageUrl = relativeFilePath;
    await game.save();

    res.json({
      success: true,
      message: 'Game card image uploaded successfully',
      data: {
        cardImageUrl: game.cardImageUrl
      }
    });
  } catch (err) {
    console.error('Error uploading game card image:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/admin/settings
// @desc    Update game settings
// @access  Private/Admin
router.post('/settings', (req, res) => {
  res.json({ msg: 'Admin settings route' });
});

// @route   GET api/admin/transactions
// @desc    Get all transactions
// @access  Private/Admin
router.get('/transactions', (req, res) => {
  res.json({ msg: 'Admin transactions route' });
});

// @route   GET api/admin/referrals
// @desc    Get all referrals with their details
// @access  Private/Admin
router.get('/referrals', adminMiddleware, async (req, res) => {
  try {
    // Get all users with referrals
    const users = await User.find({ 'referrals.0': { $exists: true } }).select('-password');

    // Format the response
    const formattedReferrals = users.map(user => ({
      userId: user._id,
      name: user.name,
      mobile: user.mobile,
      countryCode: user.countryCode,
      referralCode: user.referralCode,
      totalCommission: user.totalCommission,
      referralsCount: user.referrals.length,
      isActive: user.isActive
    }));

    res.json({
      success: true,
      count: formattedReferrals.length,
      data: formattedReferrals
    });
  } catch (err) {
    console.error('Error getting referrals:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/referral-settings
// @desc    Get all commission settings
// @access  Private/Admin
router.get('/referral-settings', adminMiddleware, async (req, res) => {
  try {
    const CommissionSetting = mongoose.model('CommissionSetting');
    const settings = await CommissionSetting.find().sort({ level: 1 });

    res.json({ success: true, count: settings.length, data: settings });
  } catch (err) {
    console.error('Error getting commission settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/referral-settings/:id
// @desc    Update a commission setting
// @access  Private/Admin
router.put('/referral-settings/:id', adminMiddleware, async (req, res) => {
  const { percentage, isActive, description } = req.body;

  try {
    const CommissionSetting = mongoose.model('CommissionSetting');
    let setting = await CommissionSetting.findById(req.params.id);

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Commission setting not found' });
    }

    // Build update object with only the fields that were sent
    const updateFields = {};
    if (percentage !== undefined) {
      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage must be between 0 and 100'
        });
      }
      updateFields.percentage = percentage;
    }
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (description !== undefined) updateFields.description = description;

    // Update setting
    setting = await CommissionSetting.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json({ success: true, data: setting });
  } catch (err) {
    console.error('Error updating commission setting:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Commission setting not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE api/admin/referral-settings/:id
// @desc    Delete a commission setting
// @access  Private/Admin
router.delete('/referral-settings/:id', adminMiddleware, async (req, res) => {
  try {
    const CommissionSetting = mongoose.model('CommissionSetting');
    const result = await CommissionSetting.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Commission setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Commission setting deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting commission setting:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Commission setting not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST api/admin/referral-settings
// @desc    Create a new commission setting
// @access  Private/Admin
router.post('/referral-settings', adminMiddleware, async (req, res) => {
  const { level, percentage, description } = req.body;

  // Validate inputs
  if (!level || isNaN(level) || level < 1 || level > 10) {
    return res.status(400).json({
      success: false,
      message: 'Level must be between 1 and 10'
    });
  }

  if (!percentage || isNaN(percentage) || percentage < 0 || percentage > 100) {
    return res.status(400).json({
      success: false,
      message: 'Percentage must be between 0 and 100'
    });
  }

  try {
    const CommissionSetting = mongoose.model('CommissionSetting');

    // Check if level already exists
    const existingSetting = await CommissionSetting.findOne({ level });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: `Commission setting for level ${level} already exists`
      });
    }

    // Create new setting
    const newSetting = new CommissionSetting({
      level,
      percentage,
      description: description || `Level ${level} referral commission`,
      isActive: true
    });

    await newSetting.save();

    res.status(201).json({ success: true, data: newSetting });
  } catch (err) {
    console.error('Error creating commission setting:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/payment-methods
// @desc    Get all payment methods
// @access  Private/Admin
router.get('/payment-methods', adminMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const paymentMethods = await PaymentMethod.find(query).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

// @route   POST api/admin/payment-methods
// @desc    Create a new payment method
// @access  Private/Admin
router.post('/payment-methods', adminMiddleware, async (req, res) => {
  try {
    const { type, name, identifier, description, currency, isActive, svgCode, conversionRate } = req.body;

    // Check for existing identifier
    const existingMethod = await PaymentMethod.findOne({ type, identifier });
    if (existingMethod) {
      return res.status(400).json({
        success: false,
        message: `${type === 'upi' ? 'UPI ID' : 'Wallet Address'} already exists`
      });
    }

    const newPaymentMethod = new PaymentMethod({
      type,
      name,
      identifier,
      description,
      currency,
      isActive,
      svgCode,
      conversionRate
    });

    await newPaymentMethod.save();

    res.status(201).json({
      success: true,
      data: newPaymentMethod
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment method'
    });
  }
});

// @route   PUT api/admin/payment-methods/:id
// @desc    Update a payment method
// @access  Private/Admin
router.put('/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, identifier, description, currency, isActive, svgCode, conversionRate } = req.body;

    const updatedMethod = await PaymentMethod.findByIdAndUpdate(
      id,
      { type, name, identifier, description, currency, isActive, svgCode, conversionRate },
      { new: true, runValidators: true }
    );

    if (!updatedMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.json({
      success: true,
      data: updatedMethod
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method'
    });
  }
});

// @route   DELETE api/admin/payment-methods/:id
// @desc    Delete a payment method
// @access  Private/Admin
router.delete('/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMethod = await PaymentMethod.findByIdAndDelete(id);

    if (!deletedMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method'
    });
  }
});

// Temporary endpoint to check all payment methods
router.get('/debug-payment-methods', adminMiddleware, async (req, res) => {
  try {
    const allMethods = await PaymentMethod.find({});
    res.json({
      success: true,
      data: allMethods
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

// @route   GET api/admin/deposit-requests
// @desc    Get all deposit requests
// @access  Private/Admin
router.get('/deposit-requests', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const depositRequests = await DepositRequest.find(filter)
      .populate('user', 'name mobile countryCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: depositRequests
    });
  } catch (err) {
    console.error('Error fetching deposit requests:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/deposit-requests/:id
// @desc    Get a specific deposit request
// @access  Private/Admin
router.get('/deposit-requests/:id', adminMiddleware, async (req, res) => {
  try {
    const request = await DepositRequest.findById(req.params.id)
      .populate('user', 'name mobile email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deposit request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching deposit request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposit request'
    });
  }
});

// @route   PUT api/admin/deposit-requests/:id
// @desc    Update a deposit request status (approve/reject)
// @access  Private/Admin
router.put('/deposit-requests/:id', adminMiddleware, async (req, res) => {
  try {
    console.log('Processing deposit request update:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { status, adminComment, rejectionReason } = req.body;
    console.log('Status received:', status);

    if (!['approved', 'rejected'].includes(status)) {
      console.log('Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be approved or rejected'
      });
    }

    const request = await DepositRequest.findById(req.params.id).populate('user');
    console.log('Deposit request found:', request ? 'Yes' : 'No');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deposit request not found'
      });
    }

    // Don't allow updating if already processed
    if (request.status !== 'pending') {
      console.log('Request already processed. Current status:', request.status);
      return res.status(400).json({
        success: false,
        message: `This deposit request has already been ${request.status}`
      });
    }

    // If approved, add the amount to the user's wallet
    if (status === 'approved') {
      try {
        console.log('Request data:', {
          userId: request.user._id,
          userName: request.user.name,
          currentBalance: request.user.balance,
          depositAmount: request.amount
        });

        // Add amount to user's wallet (original amount, not converted crypto value)
        const originalBalance = Number(request.user.balance) || 0;
        const amountToAdd = Number(request.amount) || 0;

        if (isNaN(amountToAdd)) {
          console.error('Invalid amount:', request.amount);
          return res.status(400).json({
            success: false,
            message: 'Invalid deposit amount'
          });
        }

        request.user.balance = originalBalance + amountToAdd;

        console.log('New balance:', request.user.balance);

        // Save user changes first
        await request.user.save();
        console.log('User balance updated successfully');

        // Update request status
        request.status = status;
        request.adminComment = adminComment || '';
        request.updatedAt = Date.now();

        // Save request changes
        await request.save();
        console.log('Deposit request status updated successfully');

        // Create and save transaction record
        const transactionData = {
          user: request.user._id,
          amount: amountToAdd,
          type: 'credit',
          reference: `Deposit #${request._id}`,
          status: 'completed',
          balanceBefore: originalBalance,
          balanceAfter: request.user.balance,
          description: 'Deposit approval'
        };

        console.log('Creating transaction:', transactionData);

        const newTransaction = new Transaction(transactionData);

        await newTransaction.save();
        console.log('Transaction record created successfully');

        return res.json({
          success: true,
          message: 'Deposit request approved and amount credited to user\'s wallet',
          data: request
        });
      } catch (err) {
        console.error('Error in approval process:', {
          error: err,
          stack: err.stack,
          message: err.message
        });

        // Rollback user changes if transaction fails
        try {
          const user = await User.findById(request.user._id);
          if (user) {
            user.balance = originalBalance;
            await user.save();
            console.log('Rolled back user balance to original value');
          }
        } catch (rollbackErr) {
          console.error('Error rolling back user balance:', {
            error: rollbackErr,
            stack: rollbackErr.stack,
            message: rollbackErr.message
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Error approving deposit',
          error: err.message,
          stack: err.stack
        });
      }
    } else {
      // If rejected, just update the request
      request.status = status;
      request.rejectionReason = rejectionReason || 'Request rejected by admin';
      request.adminComment = adminComment || '';
      request.updatedAt = Date.now();

      try {
        await request.save();
        return res.json({
          success: true,
          message: 'Deposit request rejected',
          data: request
        });
      } catch (err) {
        console.error('Error in rejection process:', {
          error: err,
          stack: err.stack,
          message: err.message
        });
        return res.status(500).json({
          success: false,
          message: 'Error rejecting deposit',
          error: err.message,
          stack: err.stack
        });
      }
    }
  } catch (error) {
    console.error('Error updating deposit request:', {
      error: error,
      stack: error.stack,
      message: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to update deposit request',
      error: error.message,
      stack: error.stack
    });
  }
});

// @route   GET api/admin/smtp-settings
// @desc    Get SMTP settings
// @access  Private/Admin
router.get('/smtp-settings', adminMiddleware, async (req, res) => {
  try {
    const settings = await SmtpSettings.findOne().sort({ updatedAt: -1 });
    res.json({
      success: true,
      data: settings || {
        host: '',
        port: 587,
        secure: false,
        auth: { user: '', pass: '' },
        fromEmail: '',
        fromName: ''
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings' });
  }
});

// @route   POST api/admin/smtp-settings
// @desc    Update SMTP settings
// @access  Private/Admin
router.post('/smtp-settings', adminMiddleware, async (req, res) => {
  try {
    const { host, port, secure, auth, fromEmail, fromName } = req.body;

    // Validate required fields
    if (!host || !port || !auth?.user || !auth?.pass || !fromEmail || !fromName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Create or update settings
    const settings = await SmtpSettings.findOneAndUpdate(
      {},
      { host, port, secure, auth, fromEmail, fromName, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save SMTP settings' });
  }
});

// @route   POST api/admin/test-email
// @desc    Send test email
// @access  Private/Admin
// @route   POST api/admin/test-smtp-connection
// @desc    Test SMTP connection without sending email
// @access  Private/Admin
router.post('/test-smtp-connection', adminMiddleware, async (req, res) => {
  try {
    // Test SMTP connection only
    const result = await testSmtpConnection();
    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        smtp: result.smtp
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        errorCode: result.errorCode
      });
    }
  } catch (err) {
    console.error('SMTP connection test error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while testing SMTP connection'
    });
  }
});

// @route   POST api/admin/test-email
// @desc    Send test email
// @access  Private/Admin
router.post('/test-email', adminMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Test SMTP connection first
    const connectionTest = await testSmtpConnection();
    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        message: `SMTP Connection Failed: ${connectionTest.message}`,
        errorCode: connectionTest.errorCode
      });
    }

    // If connection was successful, try sending email
    const result = await sendEmail({
      to: email,
      subject: 'SMTP Configuration Test',
      html: '<h1>SMTP Test Successful!</h1><p>Your email settings are configured correctly.</p>',
      text: 'SMTP Test Successful! Your email settings are configured correctly.'
    });

    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to send test email'
      });
    }
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error while sending test email'
    });
  }
});

// Email Template Routes
router.get('/email-templates', adminMiddleware, async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch email templates' });
  }
});

router.get('/email-templates/:name', adminMiddleware, async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ name: req.params.name });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
});

router.post('/email-templates/:name', adminMiddleware, async (req, res) => {
  try {
    const { subject, htmlContent, textContent, isActive } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ success: false, message: 'Subject and HTML content are required' });
    }

    const template = await EmailTemplate.findOneAndUpdate(
      { name: req.params.name },
      { subject, htmlContent, textContent, isActive, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save template' });
  }
});

// @route   GET api/admin/deposit-requests
// @desc    Get all deposit requests
// @access  Private/Admin
router.get('/deposit-requests', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const depositRequests = await DepositRequest.find(filter)
      .populate('user', 'name mobile countryCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: depositRequests
    });
  } catch (err) {
    console.error('Error fetching deposit requests:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/payment-settings
// @desc    Get payment settings
// @access  Private/Admin
router.get('/payment-settings', adminMiddleware, async (req, res) => {
  try {
    const settings = await PaymentSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    console.error('Error fetching payment settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/payment-settings
// @desc    Update payment settings
// @access  Private/Admin
router.put('/payment-settings', adminMiddleware, async (req, res) => {
  try {
    const { upiOptions, cryptoOptions, minimumDepositAmount, maximumDepositAmount, depositInstructions } = req.body;

    // Get current settings
    let settings = await PaymentSettings.getSettings();

    // Update settings
    if (upiOptions) settings.upiOptions = upiOptions;
    if (cryptoOptions) settings.cryptoOptions = cryptoOptions;
    if (minimumDepositAmount) settings.minimumDepositAmount = minimumDepositAmount;
    if (maximumDepositAmount) settings.maximumDepositAmount = maximumDepositAmount;
    if (depositInstructions) settings.depositInstructions = depositInstructions;

    await settings.save();

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings
    });
  } catch (err) {
    console.error('Error updating payment settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/withdrawal-settings
// @desc    Get withdrawal settings
// @access  Private/Admin
router.get('/withdrawal-settings', adminMiddleware, async (req, res) => {
  try {
    const settings = await WithdrawalSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    console.error('Error fetching withdrawal settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/admin/withdrawal-settings
// @desc    Update withdrawal settings
// @access  Private/Admin
router.put('/withdrawal-settings', adminMiddleware, async (req, res) => {
  try {
    const {
      upiOptions,
      cryptoOptions,
      minimumWithdrawalAmount,
      maximumWithdrawalAmount,
      withdrawalInstructions,
      upiWithdrawalActive,
      cryptoWithdrawalActive
    } = req.body;

    // Find existing settings or create new one
    let settings = await WithdrawalSettings.findOne();
    if (!settings) {
      settings = new WithdrawalSettings();
    }

    // Update settings
    if (upiOptions) settings.upiOptions = upiOptions;
    if (cryptoOptions) settings.cryptoOptions = cryptoOptions;
    if (minimumWithdrawalAmount !== undefined) settings.minimumWithdrawalAmount = minimumWithdrawalAmount;
    if (maximumWithdrawalAmount !== undefined) settings.maximumWithdrawalAmount = maximumWithdrawalAmount;
    if (withdrawalInstructions) settings.withdrawalInstructions = withdrawalInstructions;
    if (upiWithdrawalActive !== undefined) settings.upiWithdrawalActive = upiWithdrawalActive;
    if (cryptoWithdrawalActive !== undefined) settings.cryptoWithdrawalActive = cryptoWithdrawalActive;

    await settings.save();

    res.json({
      success: true,
      message: 'Withdrawal settings updated successfully',
      data: settings
    });
  } catch (err) {
    console.error('Error updating withdrawal settings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/withdrawal-requests
// @desc    Get all withdrawal requests
// @access  Private/Admin
router.get('/withdrawal-requests', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected', 'processing'].includes(status)) {
      filter.status = status;
    }

    const withdrawalRequests = await WithdrawalRequest.find(filter)
      .populate('user', 'name mobile countryCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: withdrawalRequests
    });
  } catch (err) {
    console.error('Error fetching withdrawal requests:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/admin/withdrawal-requests/:id
// @desc    Get a specific withdrawal request
// @access  Private/Admin
router.get('/withdrawal-requests/:id', adminMiddleware, async (req, res) => {
  try {
    const request = await WithdrawalRequest.findById(req.params.id)
      .populate('user', 'name mobile email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal request'
    });
  }
});

// @route   DELETE api/admin/withdrawal-requests/:id
// @desc    Delete a withdrawal request
// @access  Private/Admin
router.delete('/withdrawal-requests/:id', adminMiddleware, async (req, res) => {
  try {
    console.log('Deleting withdrawal request:', req.params.id);

    const request = await WithdrawalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Only allow deletion of rejected requests to prevent accidental deletion of pending/approved requests
    if (request.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected withdrawal requests can be deleted'
      });
    }

    await WithdrawalRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Withdrawal request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete withdrawal request'
    });
  }
});

// @route   PUT api/admin/withdrawal-requests/:id
// @desc    Update a withdrawal request status (approve/reject)
// @access  Private/Admin
router.put('/withdrawal-requests/:id', adminMiddleware, async (req, res) => {
  try {
    console.log('Processing withdrawal request update:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { status, adminComment, rejectionReason, transactionId } = req.body;
    console.log('Status received:', status);

    if (!['approved', 'rejected', 'processing'].includes(status)) {
      console.log('Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be approved, rejected, or processing'
      });
    }

    const request = await WithdrawalRequest.findById(req.params.id).populate('user');
    console.log('Withdrawal request found:', request ? 'Yes' : 'No');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Don't allow updating if already processed
    if (request.status !== 'pending' && request.status !== 'processing') {
      console.log('Request already processed. Current status:', request.status);
      return res.status(400).json({
        success: false,
        message: `This withdrawal request has already been ${request.status}`
      });
    }

    // If rejected, add the amount back to the user's wallet
    if (status === 'rejected') {
      try {
        console.log('Request data:', {
          userId: request.user._id,
          userName: request.user.name,
          currentBalance: request.user.balance,
          withdrawalAmount: request.amount
        });

        // Add amount back to user's wallet
        const originalBalance = Number(request.user.balance) || 0;
        const amountToAdd = Number(request.amount) || 0;

        if (isNaN(amountToAdd)) {
          console.error('Invalid amount:', request.amount);
          return res.status(400).json({
            success: false,
            message: 'Invalid withdrawal amount'
          });
        }

        request.user.balance = originalBalance + amountToAdd;

        console.log('New balance:', request.user.balance);

        // Save user changes first
        await request.user.save();
        console.log('User balance updated successfully');

        // Update request status
        request.status = status;
        request.rejectionReason = rejectionReason || 'Request rejected by admin';
        request.adminComment = adminComment || '';
        request.updatedAt = Date.now();

        // Save request changes
        await request.save();
        console.log('Withdrawal request status updated successfully');

        // Create and save transaction record
        const transactionData = {
          user: request.user._id,
          amount: amountToAdd,
          type: 'credit',
          reference: `Withdrawal Rejected #${request._id}`,
          status: 'completed',
          balanceBefore: originalBalance,
          balanceAfter: request.user.balance,
          description: 'Withdrawal rejection - amount returned to wallet'
        };

        console.log('Creating transaction:', transactionData);

        const newTransaction = new Transaction(transactionData);

        await newTransaction.save();
        console.log('Transaction record created successfully');

        return res.json({
          success: true,
          message: 'Withdrawal request rejected and amount returned to user\'s wallet',
          data: request
        });
      } catch (err) {
        console.error('Error in rejection process:', {
          error: err,
          stack: err.stack,
          message: err.message
        });
        return res.status(500).json({
          success: false,
          message: 'Error rejecting withdrawal',
          error: err.message
        });
      }
    } else {
      // If approved or processing, just update the request
      request.status = status;
      request.adminComment = adminComment || '';
      if (transactionId) request.transactionId = transactionId;
      request.updatedAt = Date.now();

      try {
        await request.save();
        return res.json({
          success: true,
          message: `Withdrawal request ${status}`,
          data: request
        });
      } catch (err) {
        console.error(`Error in ${status} process:`, {
          error: err,
          stack: err.stack,
          message: err.message
        });
        return res.status(500).json({
          success: false,
          message: `Error ${status} withdrawal`,
          error: err.message
        });
      }
    }
  } catch (error) {
    console.error('Error updating withdrawal request:', {
      error: error,
      stack: error.stack,
      message: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to update withdrawal request',
      error: error.message
    });
  }
});

module.exports = router;