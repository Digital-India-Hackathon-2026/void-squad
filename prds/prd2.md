# DeCode.it — Part 2: Backend & AI Engine PRD (Rebuild)

## 1. Scope of This Document
This PRD defines the backend service, the Gemini integration, the FSSAI rules book,
and both AI prompt templates required for DeCode.it. Build strictly to this spec — do
not add endpoints, fields, or behaviors not listed here without checking against
Part 1 (Core Product PRD) first, and do not remove any listed requirement to save time.

## 2. Tech Constraints
- Node.js + Express.
- MongoDB via a connection string supplied by the team (do not hardcode a URL or
  invent a local fallback — expect it via environment variable, e.g. `MONGODB_URI`).
- Gemini API key must be read from environment variable server-side. It must never be
  sent to or exposed in the frontend/client bundle under any circumstance.
- No OCR library in the primary path. Tesseract.js is permitted only in the failure
  fallback path described in Part 1 §10.

## 3. API Route Map (build exactly these routes)

| Route | Method | Purpose | Request Body | Response Body |
|---|---|---|---|---|
| `/api/auth/signup` | POST | Create account | `{ email, password }` | `{ userId, token }` |
| `/api/auth/login` | POST | Validate existing account | `{ email, password }` | `{ userId, token }` |
| `/api/profile` | POST | Create or update a user's health profile | `{ userId, conditions: [], allergies: [], dietaryPreferences: [], goals: [], additionalNotes }` | `{ profile }` |
| `/api/profile/:userId` | GET | Fetch a user's health profile | — | `{ profile }` |
| `/api/scan` | POST | Submit product image(s) for analysis | `{ userId, frontImageBase64, backImageBase64 (optional) }` | Full scan result object (see §6) |
| `/api/scan/proceed-anyway` | POST | Request harm-reduction guidance for a completed scan | `{ scanId, userId }` | `{ immediate_actions: [], same_day: [], next_meal: [], behavioral_corrections: [] }` |
| `/api/scan/history/:userId` | GET | List a user's past scans | — | `{ scans: [ { scanId, productName, riskScore, riskBand, createdAt } ] }` |
| `/api/scan/:scanId` | GET | Fetch one full past scan result | — | Full scan result object (see §6) |

Do not deviate from these paths/methods unless the frontend team explicitly requests a
change — consistent contracts prevent integration bugs.

Password must be hashed (e.g. bcrypt) before storage — never store plaintext. token can be a simple JWT or session identifier; all other routes (/api/profile, /api/scan, etc.) should expect this token in an Authorization header and resolve it to userId server-side, rather than trusting a raw userId passed directly in the request body as originally drafted.

## 4. Request Flow for `POST /api/scan` (must be implemented in this order)

1. Receive `frontImageBase64` (required) and `backImageBase64` (optional).
2. Compute a hash (e.g. SHA-256) of the combined image data.
3. Query `cached_results` collection for a document matching that hash.
4. **If found (cache hit)**:
   - Skip the Gemini call entirely.
   - Retrieve the cached result JSON.
   - Write a new `scan_history` entry referencing the cached result, with
     `wasCacheHit: true`.
   - Return the cached result to the client.
5. **If not found (cache miss)**:
   - Fetch the user's current health profile from `health_profiles`.
   - Construct the mega-prompt (§7) with the rules book and the user's profile
     interpolated in.
   - Call the Gemini API with the prompt + image(s), with an explicit timeout of
     8-10 seconds.
   - **On success**: parse the JSON response. Store it in `cached_results` keyed by
     the image hash. Write a `scan_history` entry with `wasCacheHit: false`. Return
     the result to the client.
   - **On failure** (error, timeout, non-JSON response, rate limit): do not throw an
     unhandled error to the client. Return a structured failure response (see §9) so
     the frontend can trigger its retry/fallback UI.

## 5. Request Flow for `POST /api/scan/proceed-anyway`

1. Receive `scanId` and `userId`.
2. Check `proceed_anyway_results` for an existing entry linked to this `scanId`. If
   found, return it directly — do not call Gemini again.
3. If not found: fetch the original scan result (via `scan_history` → `cached_results`)
   and the user's current health profile.
4. Construct the Proceed Anyway prompt (§8) with both interpolated in.
5. Call Gemini. On success, store the result in `proceed_anyway_results` linked to the
   `scanId`, and return it.
6. On failure: return a structured error (§9) — this path does not need the
   Tesseract.js fallback (that fallback is specific to the primary extraction failing,
   not this secondary call).

## 6. Full Scan Result Object Shape (contract between backend and frontend)

```json
{
  "scanId": "string",
  "product": {
    "product_name": "string | null",
    "brand": "string | null",
    "front_claims": ["string"],
    "ingredients": ["string"],
    "nutrition_per_serving": {
      "calories": "number | null",
      "protein_g": "number | null",
      "carbs_g": "number | null",
      "sugar_g": "number | null",
      "added_sugar_g": "number | null",
      "fat_g": "number | null",
      "saturated_fat_g": "number | null",
      "trans_fat_g": "number | null",
      "fiber_g": "number | null",
      "sodium_mg": "number | null"
    },
    "serving_size": "string | null",
    "allergens": ["string"],
    "highlighted_ingredients": ["string"],
    "quid_percentage": "object | null"
  },
  "claim_compliance": [
    {
      "claim": "string",
      "status": "non-compliant | needs-evidence | context-needed | high-risk-category",
      "reason": "string",
      "source": "string"
    }
  ],
  "quid_analysis": [
    { "ingredient": "string", "statement": "string" }
  ],
  "personalized_verdict": {
    "sugar_pct_daily_limit": "number",
    "sodium_pct_daily_limit": "number",
    "sat_fat_pct_daily_limit": "number",
    "summary": "string"
  },
  "risk_score": "number",
  "risk_band": "low | moderate | high",
  "confidence": "high | medium | low",
  "wasCacheHit": "boolean",
  "createdAt": "ISO date string"
}
```

Every field here must actually be populated by the Gemini pipeline described in §7 —
do not ship a frontend or backend that hardcodes/stubs any of these fields with fake
data. `null` is the correct value for genuinely unreadable fields; it is not
acceptable to fill in a plausible-looking guess.

## 7. Primary Gemini Mega-Prompt (used in `POST /api/scan` on cache miss)

Send this as the text prompt alongside the image(s) as multimodal input:
You are a food label analysis engine for Indian consumers. You will be shown one or two
images of a packaged product: front of pack and/or back of pack/nutrition label.
STEP 1 — EXTRACT
Extract as structured data:

product_name, brand
front_claims: every marketing claim/text visible on the front pack
ingredients: the full ingredient list, in the exact order printed (this reflects
descending weight per Indian labeling law — do not reorder it under any circumstance)
nutrition_per_serving: { calories, protein_g, carbs_g, sugar_g, added_sugar_g, fat_g,
saturated_fat_g, trans_fat_g, fiber_g, sodium_mg }, and serving_size
allergens: any "Contains" or "May contain" statements
highlighted_ingredients: any ingredient emphasized via front-pack text or imagery
(e.g. a picture of almonds, or text like "loaded with oats")
quid_percentage: if an explicit percentage is printed for any ingredient, capture it

If any field is unreadable or absent from the image, return null for that field.
Do not guess, infer, or hallucinate a plausible value.
STEP 2 — CLAIM COMPLIANCE CHECK
Here is a curated list of known FSSAI-relevant claim risk patterns:
{{RULES_JSON}}
For each claim in front_claims, check whether it matches (exactly, or by meaning via
its listed aliases) any pattern in the list above. For each match, return: the claim
text as it appeared, the matched status, the reason, and the source. If a claim does
not match any pattern in the list, do not include it in claim_compliance — do not
invent a new compliance judgment beyond what is explicitly in the rules list.
STEP 3 — QUID / REALITY VS MARKETING
For each item in highlighted_ingredients:

If quid_percentage contains an explicit value for it, state that percentage directly
in a plain sentence.
If no explicit percentage exists, find its position in the ingredients list (position
1 = highest quantity, since the list is ordered by descending weight) and generate a
sentence noting its rank out of the total ingredient count, with a plain-English
implication about relative quantity — e.g. "pictured prominently but ranked Xth of Y
ingredients, likely a small proportion."
If a highlighted ingredient ranks near the top (position 1-2), phrase the statement
as a positive confirmation rather than implying deception.

STEP 4 — PERSONALIZATION
Here is the user's health profile:
{{USER_PROFILE}}
Using fixed Indian RDA reference values — 2000 kcal, 50g added sugar, 22g saturated
fat, 2g trans fat, 2000mg sodium per day — compute what percentage of daily limit this
one serving represents for sugar, sodium, and saturated fat.
Then, considering the user's stated medical conditions, allergies, and goals, write a
2-4 sentence plain-English, specific verdict. Reference their actual stated conditions/
allergies/goals by name (e.g. "given your diabetes and hypertension"), not generic
phrasing. Do not state or imply a medical diagnosis — only relate this product's
nutrition facts to their self-reported profile.
Also compute an overall risk_score (0-100, higher = more risk for this specific user)
and a risk_band ("low" | "moderate" | "high") based on the severity and number of
concerning factors identified relative to their profile.
STEP 5 — OUTPUT
Return ONLY a single JSON object matching this exact structure, with no extra
commentary, no markdown formatting, no text before or after the JSON:
{
"product": { ...all Step 1 fields... },
"claim_compliance": [ ...Step 2 matches, or empty array if none... ],
"quid_analysis": [ ...Step 3 statements, or empty array if none... ],
"personalized_verdict": {
"sugar_pct_daily_limit": number,
"sodium_pct_daily_limit": number,
"sat_fat_pct_daily_limit": number,
"summary": "string"
},
"risk_score": number,
"risk_band": "low" | "moderate" | "high",
"confidence": "high" | "medium" | "low"
}

Implementation notes:
- Use Gemini's JSON/structured output mode if available, so parsing doesn't depend on
  regex-stripping markdown fences from a free-text response.
- `{{RULES_JSON}}` must be replaced with the actual contents of the rules book (§10),
  trimmed to the agreed set — do not send more than necessary, this is sent on every
  single scan request and bloats token cost.
- `{{USER_PROFILE}}` must be the user's actual current profile fetched fresh from
  MongoDB for this request — never a cached or stale copy.

## 8. Proceed Anyway Prompt (used in `POST /api/scan/proceed-anyway`)
The user has already seen a risk assessment for a product and has explicitly chosen to
consume it anyway. Do not repeat warnings, do not try to dissuade them, and do not
re-summarize the risk. Instead, generate practical, specific harm-reduction guidance.
Original scan result: {{SCAN_RESULT_JSON}}
User's health profile: {{USER_PROFILE}}
Generate guidance across four categories, each grounded in the SPECIFIC nutrients,
ingredients, or claims flagged in the original scan result — not generic wellness
advice unrelated to this actual product:

immediate_actions: 2-3 things to do right when/immediately after eating this product
same_day: 2-3 adjustments to make for the rest of the day
next_meal: 2-3 suggestions for rebalancing at the next meal
behavioral_corrections: 1-2 longer-term pattern notes tied to the user's stated goals

For every item, include a short "why" explanation that ties back to a specific
nutrient/claim from the original scan result (e.g. "This product was high in added
sugar (X% of your daily limit), so...").
Return ONLY this JSON structure, no extra commentary:
{
"immediate_actions": [{ "action": "string", "why": "string" }],
"same_day": [{ "action": "string", "why": "string" }],
"next_meal": [{ "action": "string", "why": "string" }],
"behavioral_corrections": [{ "action": "string", "why": "string" }]
}
## 9. Structured Failure Response Shape
When the Gemini call fails (error/timeout/rate-limit/malformed response) on the
primary `/api/scan` route, return this shape instead of throwing/crashing:

```json
{
  "success": false,
  "errorType": "timeout | rate_limit | api_error | parse_error",
  "message": "human-readable string",
  "fallbackAvailable": true
}
```

The frontend uses `fallbackAvailable` to decide whether to offer the Tesseract.js
degraded path described in Part 1 §10. This backend does not need to implement
Tesseract.js itself — that runs client-side. The backend's only job on failure is to
fail cleanly and predictably, not to attempt OCR itself.

## 10. FSSAI Rules Book (`rules.json`) — Required Full Content

Use exactly this content as the base rules book. Do not remove entries. You may add
more only if grounded in cited FSSAI regulation or the LabelBlind audit — never invent
ungrounded entries.

```json
[
  {
    "term": "health drink",
    "aliases": ["growth drink", "energy drink for kids"],
    "status": "non-compliant",
    "reason": "FSSAI has directed brands to remove 'health drink' from labels since it is not a legally defined food category.",
    "source": "FSSAI advisory (PIB Press Release, 2024)"
  },
  {
    "term": "100% natural",
    "aliases": ["all natural", "purely natural", "farm fresh"],
    "status": "needs-evidence",
    "reason": "Vague purity/naturalness claims require scientific substantiation under FSSAI Advertising & Claims Regulations 2018.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "immunity boosting",
    "aliases": ["boosts immunity", "immunity booster"],
    "status": "needs-evidence",
    "reason": "Health claims linking food to immunity require documented scientific proof and are frequently flagged in FSSAI audits.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "heart healthy",
    "aliases": ["good for your heart", "heart friendly"],
    "status": "needs-evidence",
    "reason": "Disease-related health claims require scientific substantiation; unsubstantiated cardiac claims are a known audit failure category.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "diabetic friendly",
    "aliases": ["safe for diabetics", "suitable for diabetics"],
    "status": "needs-evidence",
    "reason": "Disease-specific suitability claims require clinical substantiation, not just low added-sugar labeling.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "no added sugar",
    "aliases": ["no sugar added", "unsweetened"],
    "status": "context-needed",
    "reason": "Legally valid claim, but product may still contain natural sugars, fruit concentrate, or sugar alcohols contributing to total sugar load.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "honey",
    "aliases": ["pure honey", "natural honey"],
    "status": "high-risk-category",
    "reason": "Honey has the highest documented claim non-compliance rate (80%) in recent Indian audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "ghee",
    "aliases": ["pure ghee", "desi ghee"],
    "status": "high-risk-category",
    "reason": "Ghee products showed a 65.5% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "herbal tea",
    "aliases": ["herbal infusion", "wellness tea"],
    "status": "high-risk-category",
    "reason": "Tea and herbal infusion products showed a 54.3% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "edible oil",
    "aliases": ["cooking oil", "refined oil"],
    "status": "high-risk-category",
    "reason": "Edible oils showed a 52.9% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "highlighted ingredient emphasis",
    "aliases": ["loaded with", "made with real", "rich in"],
    "status": "context-needed",
    "reason": "When an ingredient is emphasized in words or images, FSSAI requires disclosure of its actual percentage (QUID) — check if this is shown.",
    "source": "FSSAI Labelling & Display Regulations 2020 (QUID rule)"
  },
  {
    "term": "multigrain",
    "aliases": ["multi-grain", "whole grain blend"],
    "status": "context-needed",
    "reason": "Products branded 'multigrain' or 'digestive' may still be predominantly refined flour (maida) — check ingredient order.",
    "source": "PIB / FSSAI labelling commentary"
  },
  {
    "term": "cholesterol free",
    "aliases": ["zero cholesterol", "no cholesterol"],
    "status": "context-needed",
    "reason": "A cholesterol-free claim does not mean low in saturated or trans fat — check those values separately.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "high protein",
    "aliases": ["protein rich", "protein packed"],
    "status": "context-needed",
    "reason": "Verify against actual grams of protein per serving on the nutrition panel rather than trusting the front-pack claim alone.",
    "source": "General FSSAI labelling principle"
  },
  {
    "term": "sugar free",
    "aliases": ["zero sugar", "no sugar"],
    "status": "context-needed",
    "reason": "May still use sugar alcohols or artificial sweeteners with their own dietary considerations.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "protein supplement",
    "aliases": ["protein powder", "nutraceutical protein"],
    "status": "needs-evidence",
    "reason": "ICMR-NIN 2024 guidelines caution against routine reliance on protein supplements, citing potential kidney and bone risks with prolonged high intake.",
    "source": "ICMR-NIN Dietary Guidelines 2024"
  },
  {
    "term": "low fat",
    "aliases": ["reduced fat", "light"],
    "status": "context-needed",
    "reason": "Low-fat products may compensate with added sugar for taste — check total sugar alongside the fat claim.",
    "source": "General FSSAI labelling principle"
  },
  {
    "term": "fortified",
    "aliases": ["+F", "vitamin enriched", "mineral fortified"],
    "status": "context-needed",
    "reason": "Genuine fortification requires the FSSAI +F logo/endorsement — branding alone does not confirm fortification.",
    "source": "FSSAI Fortification guidelines"
  },
  {
    "term": "organic",
    "aliases": ["certified organic"],
    "status": "needs-evidence",
    "reason": "Organic claims require certification under applicable Indian organic standards — verify certification is stated, not just implied.",
    "source": "FSSAI labelling commentary"
  },
  {
    "term": "natural flavour",
    "aliases": ["natural flavouring", "nature identical flavour"],
    "status": "context-needed",
    "reason": "\"Natural flavour\" is a compound ingredient term that can include multiple additives — the label doesn't disclose full composition.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  }
]
```

## 11. Caching Rules (restated as explicit requirements)
- Cache key: hash of the submitted image(s) — must be deterministic (same image bytes
  → same hash) so repeat scans of the same photo hit cache reliably.
- Cache is checked BEFORE any Gemini call is made — never call Gemini "just in case."
- A cache hit still produces a `scan_history` entry for the requesting user — caching
  must not break per-user scan history.
- No cache entry should ever be silently overwritten with a different product's data —
  a hash collision handling strategy is not required for hackathon scope, but do not
  intentionally allow overwrites without at least logging it.

## 12. Definition of Done for This PRD
- All six routes in §3 exist and match their documented request/response shapes exactly.
- The full scan result object (§6) is returned with every field genuinely populated by
  Gemini (or `null` where unreadable) — no field is hardcoded, stubbed, or faked.
- Both prompts (§7 and §8) are implemented as described, with `{{RULES_JSON}}` and
  `{{USER_PROFILE}}` dynamically interpolated per-request, not static text.
- The rules book (§10) is loaded and passed into the primary prompt in full.
- Caching (§4, §11) is implemented and demonstrably prevents duplicate Gemini calls on
  repeat scans of the same image.
- Failure handling (§9) returns the structured shape instead of crashing or hanging
  past the timeout window.
## 9. Structured Failure Response Shape
When the Gemini call fails (error/timeout/rate-limit/malformed response) on the
primary `/api/scan` route, return this shape instead of throwing/crashing:

```json
{
  "success": false,
  "errorType": "timeout | rate_limit | api_error | parse_error",
  "message": "human-readable string",
  "fallbackAvailable": true
}
```

The frontend uses `fallbackAvailable` to decide whether to offer the Tesseract.js
degraded path described in Part 1 §10. This backend does not need to implement
Tesseract.js itself — that runs client-side. The backend's only job on failure is to
fail cleanly and predictably, not to attempt OCR itself.

## 10. FSSAI Rules Book (`rules.json`) — Required Full Content

Use exactly this content as the base rules book. Do not remove entries. You may add
more only if grounded in cited FSSAI regulation or the LabelBlind audit — never invent
ungrounded entries.

```json
[
  {
    "term": "health drink",
    "aliases": ["growth drink", "energy drink for kids"],
    "status": "non-compliant",
    "reason": "FSSAI has directed brands to remove 'health drink' from labels since it is not a legally defined food category.",
    "source": "FSSAI advisory (PIB Press Release, 2024)"
  },
  {
    "term": "100% natural",
    "aliases": ["all natural", "purely natural", "farm fresh"],
    "status": "needs-evidence",
    "reason": "Vague purity/naturalness claims require scientific substantiation under FSSAI Advertising & Claims Regulations 2018.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "immunity boosting",
    "aliases": ["boosts immunity", "immunity booster"],
    "status": "needs-evidence",
    "reason": "Health claims linking food to immunity require documented scientific proof and are frequently flagged in FSSAI audits.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "heart healthy",
    "aliases": ["good for your heart", "heart friendly"],
    "status": "needs-evidence",
    "reason": "Disease-related health claims require scientific substantiation; unsubstantiated cardiac claims are a known audit failure category.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "diabetic friendly",
    "aliases": ["safe for diabetics", "suitable for diabetics"],
    "status": "needs-evidence",
    "reason": "Disease-specific suitability claims require clinical substantiation, not just low added-sugar labeling.",
    "source": "FSSAI Advertising & Claims Regulations 2018"
  },
  {
    "term": "no added sugar",
    "aliases": ["no sugar added", "unsweetened"],
    "status": "context-needed",
    "reason": "Legally valid claim, but product may still contain natural sugars, fruit concentrate, or sugar alcohols contributing to total sugar load.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "honey",
    "aliases": ["pure honey", "natural honey"],
    "status": "high-risk-category",
    "reason": "Honey has the highest documented claim non-compliance rate (80%) in recent Indian audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "ghee",
    "aliases": ["pure ghee", "desi ghee"],
    "status": "high-risk-category",
    "reason": "Ghee products showed a 65.5% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "herbal tea",
    "aliases": ["herbal infusion", "wellness tea"],
    "status": "high-risk-category",
    "reason": "Tea and herbal infusion products showed a 54.3% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "edible oil",
    "aliases": ["cooking oil", "refined oil"],
    "status": "high-risk-category",
    "reason": "Edible oils showed a 52.9% claim non-compliance rate in recent audits.",
    "source": "LabelBlind 2025-26 audit"
  },
  {
    "term": "highlighted ingredient emphasis",
    "aliases": ["loaded with", "made with real", "rich in"],
    "status": "context-needed",
    "reason": "When an ingredient is emphasized in words or images, FSSAI requires disclosure of its actual percentage (QUID) — check if this is shown.",
    "source": "FSSAI Labelling & Display Regulations 2020 (QUID rule)"
  },
  {
    "term": "multigrain",
    "aliases": ["multi-grain", "whole grain blend"],
    "status": "context-needed",
    "reason": "Products branded 'multigrain' or 'digestive' may still be predominantly refined flour (maida) — check ingredient order.",
    "source": "PIB / FSSAI labelling commentary"
  },
  {
    "term": "cholesterol free",
    "aliases": ["zero cholesterol", "no cholesterol"],
    "status": "context-needed",
    "reason": "A cholesterol-free claim does not mean low in saturated or trans fat — check those values separately.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "high protein",
    "aliases": ["protein rich", "protein packed"],
    "status": "context-needed",
    "reason": "Verify against actual grams of protein per serving on the nutrition panel rather than trusting the front-pack claim alone.",
    "source": "General FSSAI labelling principle"
  },
  {
    "term": "sugar free",
    "aliases": ["zero sugar", "no sugar"],
    "status": "context-needed",
    "reason": "May still use sugar alcohols or artificial sweeteners with their own dietary considerations.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  },
  {
    "term": "protein supplement",
    "aliases": ["protein powder", "nutraceutical protein"],
    "status": "needs-evidence",
    "reason": "ICMR-NIN 2024 guidelines caution against routine reliance on protein supplements, citing potential kidney and bone risks with prolonged high intake.",
    "source": "ICMR-NIN Dietary Guidelines 2024"
  },
  {
    "term": "low fat",
    "aliases": ["reduced fat", "light"],
    "status": "context-needed",
    "reason": "Low-fat products may compensate with added sugar for taste — check total sugar alongside the fat claim.",
    "source": "General FSSAI labelling principle"
  },
  {
    "term": "fortified",
    "aliases": ["+F", "vitamin enriched", "mineral fortified"],
    "status": "context-needed",
    "reason": "Genuine fortification requires the FSSAI +F logo/endorsement — branding alone does not confirm fortification.",
    "source": "FSSAI Fortification guidelines"
  },
  {
    "term": "organic",
    "aliases": ["certified organic"],
    "status": "needs-evidence",
    "reason": "Organic claims require certification under applicable Indian organic standards — verify certification is stated, not just implied.",
    "source": "FSSAI labelling commentary"
  },
  {
    "term": "natural flavour",
    "aliases": ["natural flavouring", "nature identical flavour"],
    "status": "context-needed",
    "reason": "\"Natural flavour\" is a compound ingredient term that can include multiple additives — the label doesn't disclose full composition.",
    "source": "FSSAI Labelling & Display Regulations 2020"
  }
]
```

## 11. Caching Rules (restated as explicit requirements)
- Cache key: hash of the submitted image(s) — must be deterministic (same image bytes
  → same hash) so repeat scans of the same photo hit cache reliably.
- Cache is checked BEFORE any Gemini call is made — never call Gemini "just in case."
- A cache hit still produces a `scan_history` entry for the requesting user — caching
  must not break per-user scan history.
- No cache entry should ever be silently overwritten with a different product's data —
  a hash collision handling strategy is not required for hackathon scope, but do not
  intentionally allow overwrites without at least logging it.

## 12. Definition of Done for This PRD
- All six routes in §3 exist and match their documented request/response shapes exactly.
- The full scan result object (§6) is returned with every field genuinely populated by
  Gemini (or `null` where unreadable) — no field is hardcoded, stubbed, or faked.
- Both prompts (§7 and §8) are implemented as described, with `{{RULES_JSON}}` and
  `{{USER_PROFILE}}` dynamically interpolated per-request, not static text.
- The rules book (§10) is loaded and passed into the primary prompt in full.
- Caching (§4, §11) is implemented and demonstrably prevents duplicate Gemini calls on
  repeat scans of the same image.
- Failure handling (§9) returns the structured shape instead of crashing or hanging
  past the timeout window.

## 13. Authentication & Authorization Implementation Specs

For securing the endpoints and ensuring proper session mapping, implement the following patterns:

1. **Password Hashing:**
   - On signup (`POST /api/auth/signup`), the server must hash the user's plaintext password using `bcrypt` (or `bcryptjs`) with a salt factor of 10.
   - The hashed value must be saved in `users.passwordHash`. Plaintext passwords must never be logged or stored.

2. **Token Generation:**
   - Both `/api/auth/signup` and `/api/auth/login` must return a JWT (JSON Web Token) in the `token` field of the response body.
   - The JWT payload must contain at minimum:
     - `userId` (the MongoDB `_id` of the user)
     - `email`
   - The token should be signed using a secret environment variable (`JWT_SECRET`) and have a standard expiration (e.g., 7 days).

3. **Request Authorization:**
   - All protected routes (`/api/profile`, `/api/scan`, `/api/scan/proceed-anyway`, `/api/scan/history/:userId`, `/api/scan/:scanId`) must look for the token in the HTTP `Authorization` header using the format:
     ```http
     Authorization: Bearer <JWT_token>
     ```
   - A middleware must decode this token, verify its signature, and attach the resolved `userId` to the request object (`req.userId`).
   - If the header is missing, malformed, or the token is expired/invalid, return a `401 Unauthorized` status with a structured error: `{ success: false, message: "Access denied. Invalid or missing token." }`.

## 14. Recommended Environment Variables Configuration

Create a `.env` file in the root of the backend project with the following keys. A template `.env.example` should be provided:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection
MONGODB_URI=mongodb://localhost:27017/decode_it

# Security Keys
JWT_SECRET=generate_a_random_jwt_signing_key_32_characters_minimum

# Gemini API Integration
GEMINI_API_KEY=your_gemini_api_key_obtained_from_google_ai_studio
```