const express = require('express');
const HealthProfile = require('../models/HealthProfile');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All profile routes are protected
router.use(authMiddleware);

// ─── POST /api/profile — create or update ─────────────────────────────────────
router.post('/', async (req, res) => {
  const { conditions, allergies, dietaryPreferences, goals, additionalNotes } = req.body;
  const userId = req.userId; // resolved by auth middleware — never trust raw body userId

  try {
    const profile = await HealthProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        conditions: conditions || [],
        allergies: allergies || [],
        dietaryPreferences: dietaryPreferences || [],
        goals: goals || [],
        additionalNotes: additionalNotes || '',
        updatedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error('[POST /profile]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to save profile.' });
  }
});

// ─── GET /api/profile/:userId ──────────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  // Users can only access their own profile
  if (userId !== req.userId.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const profile = await HealthProfile.findOne({ userId });
    return res.status(200).json({ success: true, profile: profile || null });
  } catch (err) {
    console.error('[GET /profile/:userId]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

module.exports = router;
