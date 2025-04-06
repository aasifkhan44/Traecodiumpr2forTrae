const mongoose = require('mongoose');

const smtpSettingsSchema = new mongoose.Schema({
  host: { type: String, required: true },
  port: { type: Number, required: true, default: 587 },
  secure: { type: Boolean, default: false },
  auth: {
    user: { type: String, required: true },
    pass: { type: String, required: true }
  },
  fromEmail: { type: String, required: true },
  fromName: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SmtpSettings', smtpSettingsSchema);
