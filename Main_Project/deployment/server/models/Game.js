const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  identifier: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        const validIdentifiers = ['Wingo', 'K3', '5D', 'WingoTrx', 'Ludo', 'Chess', 'Numma', 'FortuneWheel'];
        return validIdentifiers.some(id => id.toLowerCase() === v.toLowerCase());
      },
      message: 'Invalid game identifier'
    }
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    default: ''
  },
  thumbnailUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(https?:\/\/).+\.(svg|png)$/i.test(v);
      },
      message: 'Image URL must be a valid HTTPS link ending with .svg or .png'
    }
  },
  cardImageUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(https?:\/\/).+\.(svg|png)$/i.test(v);
      },
      message: 'Image URL must be a valid HTTPS link ending with .svg or .png'
    }
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

// Ensure only one game can be default at a time
gameSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Game', gameSchema);