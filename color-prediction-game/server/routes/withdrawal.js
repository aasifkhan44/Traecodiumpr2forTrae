const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WithdrawalSettings = require('../models/WithdrawalSettings');

// @route   GET api/withdrawal/settings
// @desc    Get withdrawal settings for user
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    console.log('Withdrawal settings request received');
    
    // Get withdrawal settings
    const settings = await WithdrawalSettings.getSettings();
    
    // Format the response for the client
    const upiOptions = settings.upiWithdrawalActive ? 
      settings.upiOptions.filter(option => option.isActive).map(option => ({
        name: option.name,
        upiId: option.upiId,
        withdrawalFee: option.withdrawalFee,
        feeType: option.feeType,
        conversionRate: option.conversionRate,
        svgCode: option.svgCode || ''
      })) : [];
    
    const cryptoOptions = settings.cryptoWithdrawalActive ? 
      settings.cryptoOptions.filter(option => option.isActive).map(option => ({
        currency: option.currency,
        address: option.address,
        conversionRate: option.conversionRate,
        withdrawalFee: option.withdrawalFee,
        feeType: option.feeType,
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
        cryptoWithdrawalActive: settings.cryptoWithdrawalActive,
        upiWithdrawalFeePercentage: 2, // Default percentage for UPI withdrawals
        cryptoWithdrawalFeePercentage: 5, // Default percentage for crypto withdrawals
        minimumWithdrawalFee: 1 // Default minimum fee
      }
    });
  } catch (err) {
    console.error('Error fetching withdrawal settings:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
        feeType: option.feeType,
        conversionRate: option.conversionRate,
        svgCode: option.svgCode || ''
      })) : [];
    
    const cryptoOptions = settings.cryptoWithdrawalActive ? 
      settings.cryptoOptions.filter(option => option.isActive).map(option => ({
        currency: option.currency,
        address: option.address,
        conversionRate: option.conversionRate,
        withdrawalFee: option.withdrawalFee,
        feeType: option.feeType,
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
    
    // Get the appropriate conversion rate and fee based on withdrawal mode
    let conversionRate = 1;
    let fee = 0;
    let calculatedConvertedAmount = amount;

    // Validate conversion rate
    if (conversionRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversion rate configuration'
      });
    }
    
    if (withdrawalMode === 'upi') {
      const upiOption = settings.upiOptions.find(option => option.isActive);
      if (upiOption) {
        conversionRate = upiOption.conversionRate;
        // First convert the amount to the target currency
        calculatedConvertedAmount = amount / conversionRate;
        // Calculate fee based on converted amount
        fee = upiOption.feeType === 'fixed' ? 
          upiOption.withdrawalFee : 
          (calculatedConvertedAmount * (upiOption.withdrawalFee / 100));
        console.log(`UPI withdrawal: Original amount: ${amount}, Converted amount: ${calculatedConvertedAmount}, Fee: ${fee}`);
      }
    } else if (withdrawalMode === 'crypto') {
      const cryptoOption = settings.cryptoOptions.find(option => option.currency === cryptoCurrency && option.isActive);
      if (cryptoOption) {
        conversionRate = cryptoOption.conversionRate;
        // First convert the amount to the target currency
        calculatedConvertedAmount = amount / conversionRate;
        // Calculate fee based on converted amount
        fee = cryptoOption.feeType === 'fixed' ? 
          cryptoOption.withdrawalFee : 
          (calculatedConvertedAmount * (cryptoOption.withdrawalFee / 100));
        console.log(`Crypto withdrawal: Original amount: ${amount}, Converted amount: ${calculatedConvertedAmount}, Fee: ${fee}`);
      }
    }
    
    // Final amount is converted amount minus fees
    // Ensure precise decimal handling
    const finalAmount = Number((calculatedConvertedAmount - fee).toFixed(8));
    calculatedConvertedAmount = Number(calculatedConvertedAmount.toFixed(8));
    fee = Number(fee.toFixed(8));

    // Validate final amount
    if (isNaN(finalAmount) || !isFinite(finalAmount)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount calculation'
      });
    }
    console.log(`Final amount after fee deduction: ${finalAmount}`);
    
    // Ensure final amount is positive
    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount too small after fees'
      });
    }
    
    // Create withdrawal request
    const withdrawalRequest = new WithdrawalRequest({
      user: user._id,
      amount,
      withdrawalMode,
      upiId: withdrawalMode === 'upi' ? upiId : undefined,
      cryptoCurrency: withdrawalMode === 'crypto' ? cryptoCurrency : undefined,
      cryptoAddress: withdrawalMode === 'crypto' ? cryptoAddress : undefined,
      convertedAmount: withdrawalMode === 'crypto' ? calculatedConvertedAmount : undefined,
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

// @route   GET api/withdrawal/my-requests
// @desc    Get user's withdrawal history
// @access  Private
router.get('/my-requests', auth, async (req, res) => {
  try {
    console.log('Fetching withdrawal history for user:', req.user.id);
    const requests = await WithdrawalRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name mobile countryCode');
    
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Error fetching withdrawal history:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;