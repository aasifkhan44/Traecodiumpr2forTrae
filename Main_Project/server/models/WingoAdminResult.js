const mongoose = require('mongoose');

const wingoAdminResultSchema = new mongoose.Schema({
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  duration: {
    type: Number,
    required: true,
    enum: [1, 3, 5, 10],
  },
  color: {
    type: String,
    enum: ['Red', 'Violet', 'Green', null],
    default: null,
  },
  number: {
    type: Number,
    min: 0,
    max: 9,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WingoAdminResult', wingoAdminResultSchema);
