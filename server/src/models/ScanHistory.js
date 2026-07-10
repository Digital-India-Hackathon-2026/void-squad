const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cachedResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CachedResult',
    required: true,
  },
  wasCacheHit: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast per-user history sorted newest-first
scanHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
