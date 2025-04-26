console.log('Requiring express...');
const express = require('express');
console.log('Requiring router...');
const router = express.Router();
console.log('Requiring CommissionSetting model...');
const CommissionSetting = require('../models/CommissionSetting');
module.exports = router;
