# DeCode.it — Part 3: Data Schema PRD (MongoDB)

## 1. Scope of This Document
This defines every MongoDB collection DeCode.it needs, their exact fields, types,
indexes, and relationships. Build the schema exactly as specified here — this is the
single source of truth for both backend and frontend data contracts. Do not invent
additional collections or fields without checking against Part 1 (Core Product) and
Part 2 (Backend/AI Engine) first.

Database: MongoDB, connection string supplied via environment variable (e.g.
`MONGODB_URI`) — do not hardcode a connection string anywhere in the codebase.

## 2. Collection: `users`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key |
| `email` | String | yes | unique, indexed, used for login |
| `passwordHash` | String | yes | bcrypt hash, never store plaintext |
| `name` | String | no | optional |
| `createdAt` | Date | yes | |
| `updatedAt` | Date | yes | |

**Index:** `{ email: 1 }` unique.

## 3. Collection: `health_profiles`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key |
| `userId` | ObjectId (ref: `users`) | yes | indexed |
| `conditions` | [String] | yes (can be empty array) | e.g. `["Type 2 Diabetes", "Hypertension"]` |
| `allergies` | [String] | yes (can be empty array) | e.g. `["Peanuts", "Gluten"]` |
| `dietaryPreferences` | [String] | yes (can be empty array) | e.g. `["Vegetarian", "Low Sugar"]` |
| `goals` | [String] | yes (can be empty array) | e.g. `["Lose Weight", "Manage Blood Sugar"]` |
| `additionalNotes` | String | no | free text, default empty string |
| `updatedAt` | Date | yes | updated on every save |

**Index:** `{ userId: 1 }` (for fast profile lookup per user; consider unique if one
profile per user is enforced)

**Example document:**
```json
{
  "_id": "665f4a1b2c3d4e5f6a7b8c9d",
  "userId": "665a1a1b2c3d4e5f6a7b8c9d",
  "conditions": ["High Cholesterol", "Heart Disease"],
  "allergies": ["Gluten", "Shellfish", "Lactose Intolerance"],
  "dietaryPreferences": ["Low Sugar", "High Protein"],
  "goals": ["Lose Weight", "Manage Blood Sugar", "Heart Health", "Build Muscle"],
  "additionalNotes": "",
  "updatedAt": "2026-07-10T05:47:00.000Z"
}
```

**Critical requirement:** every scan request must fetch this document fresh at request
time — never rely on a cached/stale copy from an earlier point in the session. If the
user edits their profile between scans, the very next scan must reflect the update.

## 4. Collection: `cached_results`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key |
| `imageHash` | String | yes | SHA-256 (or equivalent) hash of submitted image(s); indexed, unique |
| `resultJson` | Object | yes | the full scan result object shape defined in Part 2 §6 (excluding `scanId`, `wasCacheHit`, which are per-request, not per-cache-entry) |
| `createdAt` | Date | yes | for optional TTL/invalidation |

**Index:** `{ imageHash: 1 }` — unique.

**Optional TTL index** (not required for hackathon timeline, but trivial to add if
desired): `{ createdAt: 1 }` with `expireAfterSeconds: 2592000` (30 days).

**Example document:**
```json
{
  "_id": "665g5b2c3d4e5f6a7b8c9d0e",
  "imageHash": "a1b2c3d4e5f6...",
  "resultJson": {
    "product": { "product_name": "Example Biscuit", "brand": "Example Brand", "...": "..." },
    "claim_compliance": [ { "claim": "...", "status": "...", "reason": "...", "source": "..." } ],
    "quid_analysis": [ { "ingredient": "...", "statement": "..." } ],
    "personalized_verdict": { "sugar_pct_daily_limit": 42, "sodium_pct_daily_limit": 15, "sat_fat_pct_daily_limit": 23, "summary": "..." },
    "risk_score": 92,
    "risk_band": "high",
    "confidence": "high"
  },
  "createdAt": "2026-07-10T05:50:00.000Z"
}
```

## 5. Collection: `scan_history`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key — this doubles as the `scanId` referenced elsewhere |
| `userId` | ObjectId (ref: `users`) | yes | indexed |
| `cachedResultId` | ObjectId (ref: `cached_results`) | yes | always present, whether this scan was a cache hit or miss |
| `wasCacheHit` | Boolean | yes | true if this scan reused an existing cached result |
| `createdAt` | Date | yes | indexed, for sorting history newest-first |

**Index:** `{ userId: 1, createdAt: -1 }` (fast per-user history lookup, newest first)

**Example document:**
```json
{
  "_id": "665h6c3d4e5f6a7b8c9d0e1f",
  "userId": "665a1a1b2c3d4e5f6a7b8c9d",
  "cachedResultId": "665g5b2c3d4e5f6a7b8c9d0e",
  "wasCacheHit": false,
  "createdAt": "2026-07-10T05:50:05.000Z"
}
```

**Important:** `scan_history._id` is what gets returned to the client as `scanId` in
the scan result response (Part 2 §6). The frontend uses this ID for both fetching
scan history detail (`GET /api/scan/:scanId`) and triggering Proceed Anyway
(`POST /api/scan/proceed-anyway`).

## 6. Collection: `proceed_anyway_results`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key |
| `scanHistoryId` | ObjectId (ref: `scan_history`) | yes | indexed |
| `resultJson` | Object | yes | shape: `{ immediate_actions: [], same_day: [], next_meal: [], behavioral_corrections: [] }` per Part 2 §8 |
| `createdAt` | Date | yes | |

**Index:** `{ scanHistoryId: 1 }`

**Example document:**
```json
{
  "_id": "665i7d4e5f6a7b8c9d0e1f2a",
  "scanHistoryId": "665h6c3d4e5f6a7b8c9d0e1f",
  "resultJson": {
    "immediate_actions": [
      { "action": "Drink a glass of water", "why": "Supports hydration and digestion after a high-sodium snack." }
    ],
    "same_day": [
      { "action": "Prioritize high-fiber foods for your next meal", "why": "This product was low in fiber (0.3g), which can affect blood sugar management." }
    ],
    "next_meal": [
      { "action": "Choose a lean protein source", "why": "Balances the low protein content of this product against your muscle-building goal." }
    ],
    "behavioral_corrections": [
      { "action": "Watch for recurring high-saturated-fat snacks this week", "why": "This aligns with your heart health goal and high cholesterol condition." }
    ]
  },
  "createdAt": "2026-07-10T05:52:00.000Z"
}
```

## 7. Collection: `rules`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | primary key |
| `term` | String | yes | indexed, unique, e.g. `"health drink"` |
| `aliases` | [String] | yes | e.g. `["growth drink", "energy drink for kids"]` |
| `status` | String | yes | non-compliant / needs-evidence / context-needed / high-risk-category |
| `reason` | String | yes | regulatory description / justification |
| `source` | String | yes | legal/report citation reference |

**Index:** `{ term: 1 }` unique.

**Example document:**
```json
{
  "_id": "665j8e5f6a7b8c9d0e1f2a3b",
  "term": "health drink",
  "aliases": ["growth drink", "energy drink for kids"],
  "status": "non-compliant",
  "reason": "FSSAI has directed brands to remove 'health drink' from labels since it is not a legally defined food category.",
  "source": "FSSAI advisory (PIB Press Release, 2024)"
}
```

**Seeding Rule:** On application startup, if the `rules` collection is empty, the backend should seed it with the contents of the baseline `rules.json` file provided in Part 2 §10.

## 8. Relationships (entity reference map)
users (1) ──< (many) health_profiles      via health_profiles.userId
users (1) ──< (many) scan_history         via scan_history.userId
cached_results (1) ──< (many) scan_history  via scan_history.cachedResultId
scan_history (1) ──< (0 or 1) proceed_anyway_results  via proceed_anyway_results.scanHistoryId

Notes on cardinality:
- One `cached_results` document can be referenced by MANY `scan_history` entries
  across different users (or the same user scanning the same product twice) — this is
  the entire point of caching, do not treat it as a 1:1 relationship.
- One `scan_history` entry has AT MOST one `proceed_anyway_results` document — it is
  only created if/when the user clicks Proceed Anyway. Its absence is normal and
  expected for most scans.

## 9. Caching / History Interaction (restated precisely)

On every `POST /api/scan` request:
1. Compute image hash.
2. Query `cached_results` by `imageHash`.
3. **If a match exists:** do not call Gemini. Use the existing `cached_results._id`.
   Create a new `scan_history` document with `wasCacheHit: true`, referencing that
   `cachedResultId`. Return the cached `resultJson` plus the new `scan_history._id` as
   `scanId` in the response.
4. **If no match exists:** call Gemini per Part 2 §7. On success, insert a new
   `cached_results` document with the returned JSON. Create a new `scan_history`
   document with `wasCacheHit: false`, referencing the new `cachedResultId`. Return the
   result plus the new `scan_history._id` as `scanId`.

## 10. Field Naming Consistency Requirement
All field names in this document must be used verbatim across backend code, API
responses, and frontend consumption — e.g. always `dietaryPreferences`, never
`dietary_prefs` or `diet_preferences` in some other layer. Inconsistent naming between
schema, API, and frontend is the single most common integration bug in projects like
this — treat the field names in this document as fixed contracts, not suggestions.

## 11. Definition of Done for This PRD
- All six collections (`users`, `health_profiles`, `cached_results`, `scan_history`,
  `proceed_anyway_results`, `rules`) exist in MongoDB with the exact fields and types specified.
- Required indexes are created (`users.email` unique, `health_profiles.userId`, `cached_results.imageHash`
  unique, `scan_history` compound index, `proceed_anyway_results.scanHistoryId`, `rules.term` unique).
- The rules collection is automatically seeded on startup if empty.
- The caching flow in §9 is implemented exactly as described and is verifiable: scanning
  the same image twice produces two `scan_history` entries but only one `cached_results`
  entry, with the second scan's entry showing `wasCacheHit: true`.
- Every API response field name matches this document exactly — no snake_case/
  camelCase mismatches between schema and API layer.
- No collection, field, or relationship exists in the running database that isn't
  documented here, and nothing documented here is missing from the running database.