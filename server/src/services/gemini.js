const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_TIMEOUT_MS = 60000; // 60 seconds (image extraction can be slow)

/**
 * Wraps a promise with an explicit timeout.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), ms)
    ),
  ]);
}

/**
 * Parses the Gemini response text as JSON, stripping markdown fences if present.
 */
function parseGeminiJson(text) {
  // Strip ```json ... ``` fences if Gemini wraps the output
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Build and send the primary scan mega-prompt to Gemini.
 * Returns structured scan result JSON or throws a typed error object.
 *
 * @param {string} frontImageBase64
 * @param {string|null} backImageBase64
 * @param {object} userProfile  — health_profiles document
 * @param {Array}  rules        — array of Rule documents from DB
 */
async function analyzeScan(frontImageBase64, backImageBase64, userProfile, rules) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    throw { errorType: 'api_error', message: 'Gemini API key is not configured.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  // Build image parts
  const imageParts = [];

  if (frontImageBase64) {
    imageParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frontImageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    });
  }

  if (backImageBase64) {
    imageParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: backImageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    });
  }

  // Sanitize profile for prompt injection
  const profileForPrompt = {
    conditions: userProfile?.conditions || [],
    allergies: userProfile?.allergies || [],
    dietaryPreferences: userProfile?.dietaryPreferences || [],
    goals: userProfile?.goals || [],
    additionalNotes: userProfile?.additionalNotes || '',
  };

  const prompt = buildScanPrompt(rules, profileForPrompt);

  try {
    const result = await withTimeout(
      model.generateContent([prompt, ...imageParts]),
      GEMINI_TIMEOUT_MS
    );

    const text = result.response.text();
    const parsed = parseGeminiJson(text);
    return { success: true, data: parsed };
  } catch (err) {
    if (err.message === 'GEMINI_TIMEOUT') {
      return { success: false, errorType: 'timeout', message: 'Analysis timed out. Please try again.' };
    }
    if (err.errorType) return { success: false, ...err };
    if (err.message?.includes('429') || err.status === 429) {
      return { success: false, errorType: 'rate_limit', message: 'Too many requests. Please wait a moment and try again.' };
    }
    if (err instanceof SyntaxError) {
      return { success: false, errorType: 'parse_error', message: 'Received an unexpected response format from the AI.' };
    }
    return { success: false, errorType: 'api_error', message: err.message || 'Unknown Gemini error.' };
  }
}

/**
 * Build and send the Proceed Anyway prompt to Gemini.
 * Returns harm-reduction guidance JSON.
 */
async function proceedAnywayAnalysis(scanResult, userProfile) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    throw { errorType: 'api_error', message: 'Gemini API key is not configured.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const prompt = buildProceedAnywayPrompt(scanResult, userProfile);

  try {
    const result = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS
    );

    const text = result.response.text();
    const parsed = parseGeminiJson(text);
    return { success: true, data: parsed };
  } catch (err) {
    if (err.message === 'GEMINI_TIMEOUT') {
      return { success: false, errorType: 'timeout', message: 'Request timed out.' };
    }
    if (err instanceof SyntaxError) {
      return { success: false, errorType: 'parse_error', message: 'Invalid AI response format.' };
    }
    return { success: false, errorType: 'api_error', message: err.message || 'Unknown error.' };
  }
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function buildScanPrompt(rules, userProfile) {
  return `You are a food label analysis engine for Indian consumers. You will be shown one or two images of a packaged product: front of pack and/or back of pack/nutrition label.

STEP 1 — EXTRACT
Extract as structured data:
- product_name, brand
- front_claims: every marketing claim/text visible on the front pack
- ingredients: the full ingredient list, in the exact order printed (this reflects descending weight per Indian labeling law — do not reorder it under any circumstance)
- nutrition_per_serving: { calories, protein_g, carbs_g, sugar_g, added_sugar_g, fat_g, saturated_fat_g, trans_fat_g, fiber_g, sodium_mg }, and serving_size
- allergens: any "Contains" or "May contain" statements
- highlighted_ingredients: any ingredient emphasized via front-pack text or imagery
- quid_percentage: if an explicit percentage is printed for any ingredient, capture it as an object { ingredientName: percentage }

If any field is unreadable or absent from the image, return null for that field. Do not guess, infer, or hallucinate a plausible value.

STEP 2 — CLAIM COMPLIANCE CHECK
Here is a curated list of known FSSAI-relevant claim risk patterns:
${JSON.stringify(rules, null, 2)}

For each claim in front_claims, check whether it matches (exactly, or by meaning via its listed aliases) any pattern in the list above. For each match, return: the claim text as it appeared, the matched status, the reason, and the source. If a claim does not match any pattern in the list, do not include it in claim_compliance — do not invent a new compliance judgment beyond what is explicitly in the rules list.

STEP 3 — QUID / REALITY VS MARKETING
Analyze ingredient ordering to expose the gap between what is marketed and what is actually in the product.

Part A — Highlighted Ingredients:
For each item in highlighted_ingredients (ingredients the brand emphasizes on the front pack or in its name):
- If quid_percentage contains an explicit percentage, state it directly in a plain sentence.
- If no explicit percentage exists, find its position in the full ingredients list (position 1 = most by weight per Indian labeling law). Generate a sentence noting its rank out of the total ingredient count with a plain-English implication.
- If the ingredient ranks in position 1-2, phrase positively. If it ranks in the bottom half, call out the discrepancy.

Part B — Always include top ingredient exposure:
Regardless of whether highlighted_ingredients is populated, always include the top 4-5 ingredients from the full ingredients list in quid_analysis. For each of these top ingredients:
- Write a brief, factual statement about what this ingredient being near the top means in plain English (e.g., \"Refined wheat flour is the primary ingredient — it's a high-glycemic refined carb\", \"Palm oil is the 2nd ingredient, meaning this product is high in saturated fat\", \"Sugar ranks 3rd, indicating substantial added sugar content\").
- Skip duplicates if an ingredient was already covered in Part A.


STEP 4 — PERSONALIZATION
Here is the user's health profile:
${JSON.stringify(userProfile, null, 2)}

Using fixed Indian RDA reference values — 2000 kcal, 50g added sugar, 22g saturated fat, 2g trans fat, 2000mg sodium per day — compute what percentage of daily limit this one serving represents for sugar, sodium, and saturated fat.
Then, considering the user's stated medical conditions, allergies, and goals, write a 2-4 sentence plain-English, specific verdict. Reference their actual stated conditions/allergies/goals by name, not generic phrasing. Do not state or imply a medical diagnosis.
Also compute an overall risk_score (0-100, higher = more risk for this specific user) and a risk_band ("low" | "moderate" | "high") based on the severity and number of concerning factors identified relative to their profile.

STEP 5 — OUTPUT
Return ONLY a single JSON object matching this exact structure, with no extra commentary, no markdown formatting, no text before or after the JSON:
{
  "product": {
    "product_name": null,
    "brand": null,
    "front_claims": [],
    "ingredients": [],
    "nutrition_per_serving": {
      "calories": null,
      "protein_g": null,
      "carbs_g": null,
      "sugar_g": null,
      "added_sugar_g": null,
      "fat_g": null,
      "saturated_fat_g": null,
      "trans_fat_g": null,
      "fiber_g": null,
      "sodium_mg": null
    },
    "serving_size": null,
    "allergens": [],
    "highlighted_ingredients": [],
    "quid_percentage": null
  },
  "claim_compliance": [],
  "quid_analysis": [],
  "personalized_verdict": {
    "sugar_pct_daily_limit": 0,
    "sodium_pct_daily_limit": 0,
    "sat_fat_pct_daily_limit": 0,
    "summary": ""
  },
  "risk_score": 0,
  "risk_band": "low",
  "confidence": "high"
}`;
}

function buildProceedAnywayPrompt(scanResult, userProfile) {
  return `The user has already seen a risk assessment for a product and has explicitly chosen to
consume it anyway. Do not repeat warnings, do not try to dissuade them, and do not
re-summarize the risk. Instead, generate practical, specific harm-reduction guidance.

Original scan result: ${JSON.stringify(scanResult, null, 2)}
User's health profile: ${JSON.stringify(userProfile, null, 2)}

Generate guidance across four categories, each grounded in the SPECIFIC nutrients,
ingredients, or claims flagged in the original scan result — not generic wellness
advice unrelated to this actual product:

- immediate_actions: 2-3 things to do right when/immediately after eating this product
- same_day: 2-3 adjustments to make for the rest of the day
- next_meal: 2-3 suggestions for rebalancing at the next meal
- behavioral_corrections: 1-2 longer-term pattern notes tied to the user's stated goals

For every item, include a short "why" explanation that ties back to a specific
nutrient/claim from the original scan result (e.g. "This product was high in added
sugar (X% of your daily limit), so...").

Return ONLY this JSON structure, no extra commentary:
{
  "immediate_actions": [{ "action": "string", "why": "string" }],
  "same_day": [{ "action": "string", "why": "string" }],
  "next_meal": [{ "action": "string", "why": "string" }],
  "behavioral_corrections": [{ "action": "string", "why": "string" }]
}`;
}


/**
 * Translates a structured JSON object of text fields into the target language.
 * Preserves JSON structure; only translates string values.
 *
 * @param {object} fields        — Structured object with string values to translate
 * @param {string} languageName  — Full language name e.g. "Hindi"
 * @param {string} languageCode  — ISO 639-1 code e.g. "hi"
 * @param {string[]} sources     — Optional list of FSSAI/regulatory source labels to skip translation
 */
async function translateTextFields(fields, languageName, languageCode, sources = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    return { success: false, errorType: 'api_error', message: 'Gemini API key is not configured.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const sourceNote = sources.length > 0
    ? `Do NOT translate or modify any of the following regulatory/source strings, keep them exactly as-is: ${JSON.stringify(sources)}.`
    : '';

  const prompt = `You are a professional translator. Translate every string value in the following JSON from English to ${languageName} (ISO 639-1 code: ${languageCode}).

Rules:
- Only translate string values. Preserve all JSON structure, keys, arrays, and non-string values exactly.
- Keep technical medical terms or allergen names in English if they have no accurate ${languageName} equivalent.
- Do NOT add any commentary, explanation, or markdown — return ONLY the translated JSON object.
${sourceNote}

Input JSON:
${JSON.stringify(fields, null, 2)}

Return ONLY the translated JSON object:`;

  try {
    const result = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS
    );

    const text = result.response.text();
    const parsed = parseGeminiJson(text);
    return { success: true, data: parsed };
  } catch (err) {
    if (err.message === 'GEMINI_TIMEOUT') {
      return { success: false, errorType: 'timeout', message: 'Translation timed out.' };
    }
    if (err instanceof SyntaxError) {
      return { success: false, errorType: 'parse_error', message: 'Invalid translation response format.' };
    }
    return { success: false, errorType: 'api_error', message: err.message || 'Translation failed.' };
  }
}

module.exports = { analyzeScan, proceedAnywayAnalysis, translateTextFields };
