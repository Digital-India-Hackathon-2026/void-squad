const mongoose = require('mongoose');

const translatedResultSchema = new mongoose.Schema({
  cachedResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CachedResult',
    required: true,
  },
  targetLanguage: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  translatedFields: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

translatedResultSchema.index({ cachedResultId: 1, targetLanguage: 1 }, { unique: true });

module.exports = mongoose.model('TranslatedResult', translatedResultSchema);