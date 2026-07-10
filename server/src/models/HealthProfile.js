const mongoose = require('mongoose');

const healthProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conditions: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    dietaryPreferences: {
      type: [String],
      default: [],
    },
    goals: {
      type: [String],
      default: [],
    },
    additionalNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }, // only updatedAt per PRD3
  }
);

healthProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('HealthProfile', healthProfileSchema);
