const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const ScanHistory = require('../models/ScanHistory');
const ProceedAnywayResult = require('../models/ProceedAnywayResult');
const TranslatedResult = require('../models/TranslatedResult');
const { translateTextFields } = require('../services/gemini');

const router = express.Router();

const LANGUAGE_NAMES = {
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
};

router.use(authMiddleware);

function pushIfText(target, key, value) {
  if (typeof value === 'string' && value.trim()) target[key] = value.trim();
}

function hasTextFields(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).length > 0;
}

function extractTranslatableFields(scanResult = {}) {
  const fields = {};
  const sources = [];

  if (scanResult.personalized_verdict?.summary) {
    fields.personalized_verdict = { summary: scanResult.personalized_verdict.summary };
  }

  if (Array.isArray(scanResult.claim_compliance)) {
    const claimFields = scanResult.claim_compliance.map((claim) => {
      if (claim?.source) sources.push(claim.source);
      const item = {};
      pushIfText(item, 'reason', claim?.reason);
      return item;
    });
    if (claimFields.some(hasTextFields)) fields.claim_compliance = claimFields;
  }

  if (Array.isArray(scanResult.quid_analysis)) {
    const quidFields = scanResult.quid_analysis.map((item) => {
      const translated = {};
      pushIfText(translated, 'statement', item?.statement);
      return translated;
    });
    if (quidFields.some(hasTextFields)) fields.quid_analysis = quidFields;
  }

  if (Array.isArray(scanResult.key_risk_insights)) {
    const insightFields = scanResult.key_risk_insights.map((insight) => {
      const item = {};
      pushIfText(item, 'statement', insight?.statement);
      pushIfText(item, 'text', insight?.text);
      pushIfText(item, 'insight', insight?.insight);
      pushIfText(item, 'message', insight?.message);
      return item;
    });
    if (insightFields.some(hasTextFields)) fields.key_risk_insights = insightFields;
  }

  return { fields, sources: [...new Set(sources)] };
}

function extractProceedAnywayFields(proceedResult = {}) {
  const fields = {};
  for (const key of ['immediate_actions', 'same_day', 'next_meal', 'behavioral_corrections']) {
    if (!Array.isArray(proceedResult[key])) continue;
    const items = proceedResult[key].map((item) => {
      const translated = {};
      pushIfText(translated, 'action', item?.action);
      pushIfText(translated, 'why', item?.why);
      return translated;
    });
    if (items.some(hasTextFields)) fields[key] = items;
  }
  return fields;
}

async function translateProceedAnywayIfRequested({ includeProceedAnyway, scanId, languageName, languageCode }) {
  if (!includeProceedAnyway) return null;

  const existingProceed = await ProceedAnywayResult.findOne({ scanHistoryId: scanId }).lean();
  if (!existingProceed?.resultJson) return null;

  const fields = extractProceedAnywayFields(existingProceed.resultJson);
  if (Object.keys(fields).length === 0) return {};

  const translation = await translateTextFields(fields, languageName, languageCode, []);
  if (!translation.success) return { success: false, errorType: translation.errorType, message: translation.message };
  return translation.data;
}

router.post('/', async (req, res) => {
  const { scanId, targetLanguage, includeProceedAnyway = false } = req.body;
  const languageCode = typeof targetLanguage === 'string' ? targetLanguage.trim().toLowerCase() : '';

  if (!scanId || !mongoose.Types.ObjectId.isValid(scanId)) {
    return res.status(400).json({ success: false, message: 'A valid scanId is required.' });
  }
  if (!/^[a-z]{2}$/.test(languageCode)) {
    return res.status(400).json({ success: false, message: 'targetLanguage must be an ISO 639-1 code.' });
  }

  try {
    const scanEntry = await ScanHistory.findById(scanId).populate('cachedResultId').lean();
    if (!scanEntry) {
      return res.status(404).json({ success: false, message: 'Scan not found.' });
    }
    if (scanEntry.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const cachedResult = scanEntry.cachedResultId;
    if (!cachedResult?._id || !cachedResult?.resultJson) {
      return res.status(404).json({ success: false, message: 'Cached scan result not found.' });
    }

    const languageName = LANGUAGE_NAMES[languageCode] || languageCode;
    let productTranslation = await TranslatedResult.findOne({
      cachedResultId: cachedResult._id,
      targetLanguage: languageCode,
    }).lean();
    let productWasCached = !!productTranslation;

    if (!productTranslation) {
      const { fields, sources } = extractTranslatableFields(cachedResult.resultJson);
      if (Object.keys(fields).length === 0) {
        productTranslation = { translatedFields: {} };
      } else {
        const translation = await translateTextFields(fields, languageName, languageCode, sources);
        if (!translation.success) {
          return res.status(200).json({
            success: false,
            errorType: translation.errorType,
            message: translation.message,
          });
        }

        try {
          productTranslation = await TranslatedResult.create({
            cachedResultId: cachedResult._id,
            targetLanguage: languageCode,
            translatedFields: translation.data,
          });
        } catch (err) {
          if (err.code !== 11000) throw err;
          productWasCached = true;
          productTranslation = await TranslatedResult.findOne({
            cachedResultId: cachedResult._id,
            targetLanguage: languageCode,
          }).lean();
        }
      }
    }

    const proceedAnyway = await translateProceedAnywayIfRequested({
      includeProceedAnyway,
      scanId,
      languageName,
      languageCode,
    });

    if (proceedAnyway?.success === false) {
      return res.status(200).json({
        success: false,
        errorType: proceedAnyway.errorType,
        message: proceedAnyway.message,
      });
    }

    return res.status(200).json({
      success: true,
      cached: productWasCached,
      scanId,
      cachedResultId: cachedResult._id,
      targetLanguage: languageCode,
      translatedFields: productTranslation?.translatedFields || {},
      ...(includeProceedAnyway ? { proceed_anyway: proceedAnyway || null } : {}),
    });
  } catch (err) {
    console.error('[POST /translate]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to translate scan result.' });
  }
});

module.exports = router;