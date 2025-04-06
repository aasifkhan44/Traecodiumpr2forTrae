const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    enum: ['welcome', 'reset-password', 'notification', 'transaction', 'custom'] 
  },
  subject: { type: String, required: true },
  htmlContent: { type: String, required: true },
  textContent: { type: String },
  variables: [{ type: String }],
  isActive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
