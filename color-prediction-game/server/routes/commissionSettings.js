const express = require('express');
const router = express.Router();
const CommissionSetting = require('../models/CommissionSetting');

// @route   GET api/commission-settings
// @desc    Get all commission settings
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    const settings = await CommissionSetting.find().sort({ level: 1 });
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/commission-settings
// @desc    Create or update a commission setting
// @access  Private (Admin only)
router.post('/', async (req, res) => {
  try {
    const { level, percentage, isActive, description } = req.body;

    // Validate input
    if (level < 1 || level > 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Level must be between 1 and 10' 
      });
    }

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Percentage must be between 0 and 100' 
      });
    }

    // Check if setting already exists
    let setting = await CommissionSetting.findOne({ level });

    if (setting) {
      // Update existing setting
      setting.percentage = percentage;
      setting.isActive = isActive !== undefined ? isActive : setting.isActive;
      setting.description = description || setting.description;
      await setting.save();
      
      return res.json({ 
        success: true, 
        message: 'Commission setting updated', 
        data: setting 
      });
    }

    // Create new setting
    setting = new CommissionSetting({
      level,
      percentage,
      isActive: isActive !== undefined ? isActive : true,
      description: description || `Level ${level} commission`
    });

    await setting.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Commission setting created', 
      data: setting 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE api/commission-settings/:id
// @desc    Delete a commission setting
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const setting = await CommissionSetting.findById(req.params.id);
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commission setting not found' 
      });
    }

    await setting.remove();
    
    res.json({ 
      success: true, 
      message: 'Commission setting removed' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
