const mongoose = require('mongoose');

const cachedResultSchema = new mongoose.Schema({
  imageHash: {
    type: String,
    required: true,
    unique: true,
  },
  resultJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CachedResult', cachedResultSchema);
