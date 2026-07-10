const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  term: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  aliases: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['non-compliant', 'needs-evidence', 'context-needed', 'high-risk-category'],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Rule', ruleSchema);
