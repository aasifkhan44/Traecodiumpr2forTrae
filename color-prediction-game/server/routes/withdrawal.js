const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WithdrawalSettings = require('../models/WithdrawalSettings');

// @route   GET api/withdrawal/options
// @desc    Get available withdrawal options
// @access  Private
router.get('/options', auth, async (req, res) => {
  try {
    console.log('Withdrawal options request received');
    
    // Get withdrawal settings
    const settings = await WithdrawalSettings.getSettings();
    
    // Format the response for the client
    const upiOptions = settings.upiWithdrawalActive ? 
      settings.upiOptions.filter(option => option.isActive).map(option => ({
        name: option.name,
        upiId: option.upiId,
        withdrawalFee: option.withdrawalFee,
        svgCode: option.svgCode || ''
      })) : [];
    
    const cryptoOptions = settings.cryptoWithdrawalActive ? 
      settings.cryptoOptions.filter(option => option.isActive).map(option => ({
        currency: option.currency,
        address: option.address,
        conversionRate: option.conversionRate,
        withdrawalFee: option.withdrawalFee,
        svgCode: option.svgCode || ''
      })) : [];
    
    return res.json({
      success: true,
      data: {
        upiOptions,
        cryptoOptions,
        minimumWithdrawalAmount: settings.minimumWithdrawalAmount,
        maximumWithdrawalAmount: settings.maximumWithdrawalAmount,
        withdrawalInstructions: settings.withdrawalInstructions,
        upiWithdrawalActive: settings.upiWithdrawalActive,
        cryptoWithdrawalActive: settings.cryptoWithdrawalActive
      }
    });
  } catch (err) {
    console.error('Error fetching withdrawal options:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/withdrawal/create-request
// @desc    Create a new withdrawal request
// @access  Private
router.post('/create-request', auth, async (req, res) => {
  try {
    console.log('Withdrawal request creation received');
    const {
      amount,
      withdrawalMode,
      upiId,
      cryptoCurrency,
      cryptoAddress,
      convertedAmount,
      withdrawalFee
    } = req.body;
    
    // Validate request
    if (!amount || !withdrawalMode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }
    
    // Further validation based on withdrawal mode
    if (withdrawalMode === 'upi' && !upiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'UPI withdrawal requires UPI ID' 
      });
    }
    
    if (withdrawalMode === 'crypto' && (!cryptoCurrency || !cryptoAddress)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Crypto withdrawal requires currency and address' 
      });
    }
    
    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has enough balance
    if (user.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance' 
      });
    }
    
    // Get withdrawal settings
    const settings = await WithdrawalSettings.getSettings();
    
    // Check if withdrawal mode is active
    if (withdrawalMode === 'upi' && !settings.upiWithdrawalActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'UPI withdrawal is currently not available' 
      });
    }
    
    if (withdrawalMode === 'crypto' && !settings.cryptoWithdrawalActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'Crypto withdrawal is currently not available' 
      });
    }
    
    // Check minimum and maximum withdrawal amount
    if (amount < settings.minimumWithdrawalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum withdrawal amount is ${settings.minimumWithdrawalAmount}` 
      });
    }
    
    if (amount > settings.maximumWithdrawalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum withdrawal amount is ${settings.maximumWithdrawalAmount}` 
      });
    }
    
    // Calculate final amount after fee
    const fee = withdrawalFee || 0;
    const finalAmount = amount - fee;
    
    // Create withdrawal request
    const withdrawalRequest = new WithdrawalRequest({
      user: user._id,
      amount,
      withdrawalMode,
      upiId: withdrawalMode === 'upi' ? upiId : undefined,
      cryptoCurrency: withdrawalMode === 'crypto' ? cryptoCurrency : undefined,
      cryptoAddress: withdrawalMode === 'crypto' ? cryptoAddress : undefined,
      convertedAmount: withdrawalMode === 'crypto' ? convertedAmount : undefined,
      withdrawalFee: fee,
      finalAmount
    });
    
    // Save withdrawal request
    await withdrawalRequest.save();
    
    // Deduct amount from user's balance
    user.balance -= amount;
    await user.save();
    
    return res.json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawalRequest
    });
  } catch (err) {
    console.error('Error creating withdrawal request:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/withdrawal/requests
// @desc    Get user's withdrawal requests
// @access  Private
router.get('/requests', auth, async (req, res) => {
  try {
    const withdrawalRequests = await WithdrawalRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      data: withdrawalRequests
    });
  } catch (err) {
    console.error('Error fetching withdrawal requests:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;