const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const DepositRequest = require('../models/DepositRequest');
const PaymentSettings = require('../models/PaymentSettings');
const PaymentMethod = require('../models/PaymentMethod');

// @route   GET api/deposit/payment-options
// @desc    Get available payment options
// @access  Private
router.get('/payment-options', auth, async (req, res) => {
  try {
    console.log('Payment options request received');
    
    // Get basic settings
    const settings = await PaymentSettings.getSettings();
    
    // Fetch active payment methods from the database
    const upiMethods = await PaymentMethod.find({ 
      type: 'upi',
      isActive: true 
    }).sort({ displayOrder: 1 });
    
    const cryptoMethods = await PaymentMethod.find({ 
      type: 'crypto',
      isActive: true 
    }).sort({ displayOrder: 1 });
    
    // Format the methods for the client
    const upiOptions = upiMethods.map(method => ({
      name: method.name,
      upiId: method.identifier,
      imageUrl: method.imageUrl || '',
      svgCode: method.svgCode || ''
    }));
    
    const cryptoOptions = cryptoMethods.map(method => ({
      currency: method.currency,
      address: method.identifier,
      imageUrl: method.imageUrl || '',
      conversionRate: method.conversionRate,
      svgCode: method.svgCode || ''
    }));
    
    return res.json({
      success: true,
      data: {
        upiOptions,
        cryptoOptions,
        minimumDepositAmount: settings.minimumDepositAmount,
        maximumDepositAmount: settings.maximumDepositAmount,
        depositInstructions: settings.depositInstructions
      }
    });
  } catch (err) {
    console.error('Error fetching payment options:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/deposit/create-request
// @desc    Create a new deposit request
// @access  Private
router.post('/create-request', auth, async (req, res) => {
  try {
    console.log('Deposit request creation received');
    const {
      amount,
      paymentMode,
      paymentApp,
      upiId,
      cryptoCurrency,
      cryptoAddress,
      convertedAmount,
      referenceNumber
    } = req.body;
    
    // Validate request
    if (!amount || !paymentMode || !referenceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }
    
    // Further validation based on payment mode
    if (paymentMode === 'upi' && (!paymentApp || !upiId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'UPI payment requires payment app and UPI ID' 
      });
    }
    
    if (paymentMode === 'crypto' && (!cryptoCurrency || !cryptoAddress)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Crypto payment requires currency and address' 
      });
    }
    
    // Get payment settings to validate
    const settings = await PaymentSettings.getSettings();
    
    // Validate amount
    if (amount < settings.minimumDepositAmount || amount > settings.maximumDepositAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Amount must be between ${settings.minimumDepositAmount} and ${settings.maximumDepositAmount}` 
      });
    }
    
    // Create new deposit request
    const depositRequest = new DepositRequest({
      user: req.user.id,
      amount,
      paymentMode,
      paymentApp: paymentMode === 'upi' ? paymentApp : undefined,
      upiId: paymentMode === 'upi' ? upiId : undefined,
      cryptoCurrency: paymentMode === 'crypto' ? cryptoCurrency : undefined,
      cryptoAddress: paymentMode === 'crypto' ? cryptoAddress : undefined,
      convertedAmount,
      referenceNumber,
      status: 'pending'
    });
    
    await depositRequest.save();
    
    return res.json({
      success: true,
      message: 'Deposit request created successfully',
      data: {
        requestId: depositRequest._id,
        status: depositRequest.status,
        createdAt: depositRequest.createdAt
      }
    });
  } catch (err) {
    console.error('Error creating deposit request:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/deposit/my-requests
// @desc    Get user's deposit requests
// @access  Private
router.get('/my-requests', auth, async (req, res) => {
  try {
    console.log('Fetching deposit requests for user:', req.user.id);
    const requests = await DepositRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name mobile countryCode');
    
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error('Error fetching deposit requests:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
