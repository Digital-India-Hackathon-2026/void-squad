const express = require('express');
const authMiddleware = require('../middleware/auth');
const HealthProfile = require('../models/HealthProfile');
const { CHAT_DISCLAIMER, callMiniMaxChat } = require('../services/minimaxChat');

const router = express.Router();

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { userId, message, conversationHistory = [] } = req.body;

  if (userId && userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied for this user.', disclaimer: CHAT_DISCLAIMER });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'message is required.', disclaimer: CHAT_DISCLAIMER });
  }
  if (conversationHistory && !Array.isArray(conversationHistory)) {
    return res.status(400).json({ success: false, message: 'conversationHistory must be an array.', disclaimer: CHAT_DISCLAIMER });
  }

  try {
    const profile = await HealthProfile.findOne({ userId: req.userId }).lean();
    const result = await callMiniMaxChat(profile, message, conversationHistory);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        errorType: result.errorType,
        message: result.message,
        disclaimer: CHAT_DISCLAIMER,
      });
    }

    return res.status(200).json({
      success: true,
      reply: result.reply,
      disclaimer: CHAT_DISCLAIMER,
    });
  } catch (err) {
    console.error('[POST /chat]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate chat reply.',
      disclaimer: CHAT_DISCLAIMER,
    });
  }
});

module.exports = router;