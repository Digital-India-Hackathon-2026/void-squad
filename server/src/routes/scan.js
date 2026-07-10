const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const HealthProfile = require('../models/HealthProfile');
const CachedResult = require('../models/CachedResult');
const ScanHistory = require('../models/ScanHistory');
const ProceedAnywayResult = require('../models/ProceedAnywayResult');
const Rule = require('../models/Rule');
const { analyzeScan, proceedAnywayAnalysis } = require('../services/gemini');

const router = express.Router();

// All scan routes are protected
router.use(authMiddleware);

// ─── Helper: compute SHA-256 of image data ────────────────────────────────────
function hashImages(front, back) {
  const combined = (front || '') + (back || '');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// ─── POST /api/scan ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { frontImageBase64, backImageBase64 } = req.body;
  const userId = req.userId;

  if (!backImageBase64) {
    return res.status(400).json({ success: false, message: 'Ingredients (Back) image is required.' });
  }

  try {
    // Step 1 & 2: Compute hash
    const imageHash = hashImages(frontImageBase64, backImageBase64);

    // Step 3: Check cache
    let cached = await CachedResult.findOne({ imageHash });

    if (cached) {
      // ── Cache HIT ──────────────────────────────────────────────────────────
      const scanEntry = await ScanHistory.create({
        userId,
        cachedResultId: cached._id,
        wasCacheHit: true,
      });

      return res.status(200).json({
        success: true,
        scanId: scanEntry._id,
        wasCacheHit: true,
        ...cached.resultJson,
      });
    }

    // ── Cache MISS ─────────────────────────────────────────────────────────
    // Fetch fresh profile
    const userProfile = await HealthProfile.findOne({ userId }).lean();

    // Load rules from DB
    const rules = await Rule.find({}).lean();

    // Call Gemini
    const geminiResult = await analyzeScan(frontImageBase64, backImageBase64, userProfile, rules);

    if (!geminiResult.success) {
      // Return structured failure — frontend handles retry + fallback
      return res.status(200).json({
        success: false,
        errorType: geminiResult.errorType,
        message: geminiResult.message,
        fallbackAvailable: true,
      });
    }

    // Store in cache — defensive strip per PRD2 §6 (scanId/wasCacheHit are per-request, not per-cache).
    const { scanId: _sid, wasCacheHit: _wch, ...geminiData } = geminiResult.data;
    const resultToStore = {
      ...geminiData,
      createdAt: new Date().toISOString(),
    };

    try {
      cached = await CachedResult.create({ imageHash, resultJson: resultToStore });
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent scan of the same image won the unique-index race — reuse the existing entry.
        console.warn('[POST /scan] cache race on hash, reusing existing entry');
        cached = await CachedResult.findOne({ imageHash });
      } else {
        throw err;
      }
    }

    // Create scan history entry
    const scanEntry = await ScanHistory.create({
      userId,
      cachedResultId: cached._id,
      wasCacheHit: false,
    });

    return res.status(200).json({
      success: true,
      scanId: scanEntry._id,
      wasCacheHit: false,
      ...resultToStore,
    });
  } catch (err) {
    console.error('[POST /scan]', err.message);
    return res.status(500).json({
      success: false,
      errorType: 'api_error',
      message: 'An unexpected error occurred.',
      fallbackAvailable: true,
    });
  }
});

// ─── POST /api/scan/proceed-anyway ────────────────────────────────────────────
router.post('/proceed-anyway', async (req, res) => {
  const { scanId } = req.body;
  const userId = req.userId;

  if (!scanId) {
    return res.status(400).json({ success: false, message: 'scanId is required.' });
  }

  try {
    // Check for cached proceed-anyway result
    const existing = await ProceedAnywayResult.findOne({ scanHistoryId: scanId });
    if (existing) {
      return res.status(200).json({ success: true, ...existing.resultJson });
    }

    // Fetch the original scan + user profile
    const scanEntry = await ScanHistory.findById(scanId).populate('cachedResultId');
    if (!scanEntry || scanEntry.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Scan not found.' });
    }

    const scanResult = scanEntry.cachedResultId?.resultJson;
    const userProfile = await HealthProfile.findOne({ userId }).lean();

    const geminiResult = await proceedAnywayAnalysis(scanResult, userProfile);

    if (!geminiResult.success) {
      return res.status(200).json({
        success: false,
        errorType: geminiResult.errorType,
        message: geminiResult.message,
      });
    }

    // Store result
    await ProceedAnywayResult.create({
      scanHistoryId: scanId,
      resultJson: geminiResult.data,
    });

    return res.status(200).json({ success: true, ...geminiResult.data });
  } catch (err) {
    console.error('[POST /scan/proceed-anyway]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate guidance.' });
  }
});

// ─── GET /api/scan/history/:userId ────────────────────────────────────────────
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  if (userId !== req.userId.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const history = await ScanHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('cachedResultId', 'resultJson')
      .lean();

    const scans = history.map((entry) => ({
      scanId: entry._id,
      productName: entry.cachedResultId?.resultJson?.product?.product_name || 'Unknown Product',
      brand: entry.cachedResultId?.resultJson?.product?.brand || null,
      riskScore: entry.cachedResultId?.resultJson?.risk_score ?? null,
      riskBand: entry.cachedResultId?.resultJson?.risk_band ?? null,
      wasCacheHit: entry.wasCacheHit,
      createdAt: entry.createdAt,
    }));

    return res.status(200).json({ success: true, scans });
  } catch (err) {
    console.error('[GET /scan/history]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

// ─── GET /api/scan/:scanId ─────────────────────────────────────────────────────
router.get('/:scanId', async (req, res) => {
  const { scanId } = req.params;

  try {
    const scanEntry = await ScanHistory.findById(scanId)
      .populate('cachedResultId')
      .lean();

    if (!scanEntry) {
      return res.status(404).json({ success: false, message: 'Scan not found.' });
    }
    if (scanEntry.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({
      success: true,
      scanId: scanEntry._id,
      wasCacheHit: scanEntry.wasCacheHit,
      ...scanEntry.cachedResultId?.resultJson,
    });
  } catch (err) {
    console.error('[GET /scan/:scanId]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch scan.' });
  }
});

module.exports = router;
