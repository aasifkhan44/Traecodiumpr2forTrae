const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'Color Prediction Game'
  },
  logoUrl: {
    type: String,
    default: '/images/logo.png'
  },
  faviconUrl: {
    type: String,
    default: '/favicon.ico'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field before saving
SiteSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// We want only one site settings document, so we'll use a specific ID
SiteSettingsSchema.statics.getSiteSettings = async function() {
  const settings = await this.findOne();
  if (settings) {
    return settings;
  }
  
  // Create default settings if none exist
  return await this.create({});
};

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
