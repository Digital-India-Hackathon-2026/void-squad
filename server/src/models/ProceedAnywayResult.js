const mongoose = require('mongoose');

const proceedAnywayResultSchema = new mongoose.Schema({
  scanHistoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScanHistory',
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

module.exports = mongoose.model('ProceedAnywayResult', proceedAnywayResultSchema);
