# DeCode.it — Part 1: Core Product PRD (Rebuild)

## 1. What This Product Is

DeCode.it is a mobile-first web app for Indian consumers that scans packaged food labels
(front pack + back nutrition label) and returns a personalized, regulation-grounded
health verdict — not a generic health score. It is built for a national hackathon and
must visually and functionally differentiate itself from a competing team with an
~90%-similar base concept ("AI reads labels, personalizes to your health").

This is a complete rebuild. No code, UI, or visual design from any prior version is
reused. Only the underlying product logic (rules, prompts, personalization approach)
carries forward from prior planning documents.

## 2. Problem This Solves

India has a severe diet-related disease burden: ICMR-NIN attributes 56.4% of India's
total disease burden to unhealthy diet habits. NFHS-5 shows 41.3% of women and 38% of
men aged 15-49 are overweight/obese, and anaemia affects 57% of women, 25% of men, and
67.1% of children 6-59 months. Meanwhile, a 2025-26 LabelBlind audit found 33.6% of
audited food claims in India fail full FSSAI compliance, with honey (80%), ghee
(65.5%), tea/herbal infusions (54.3%), and edible oils (52.9%) as the worst categories.

Consumers cannot interpret nutrition labels, cannot tell if front-of-pack claims
("Health Drink," "100% Natural," "Diabetic Friendly") are legally compliant, and get no
disease-specific or Indian-RDA-relative guidance from existing tools.

## 3. Differentiation (must be visibly present in the built product, not just claimed)

Existing apps and their specific, documented gaps:
- **FactsScan**: gives A-E health scores, ingredient analysis — no claim-legality check.
- **URFoodLenz**: multilingual label summaries, allergen flags — no FSSAI compliance check, no QUID.
- **Open Food Facts**: Nutri-Score/NOVA — European framework, not tuned to Indian RDAs or disease context.

DeCode.it must implement three things none of the above do:
1. **FSSAI Claim Compliance Check** — cross-check front-pack claims against a curated,
   cited rule-set of known FSSAI violation patterns.
2. **Reality vs Marketing (QUID) Lens** — compare ingredients emphasized on the front
   pack against their actual position/percentage in the printed ingredient list.
3. **Indian-RDA-grounded personalization** — express nutrient impact as % of Indian
   daily RDA limits (2000 kcal, 50g added sugar, 22g saturated fat, 2g trans fat,
   2000mg sodium/day), not generic High/Medium/Low labels.

If any of these three is missing or superficial in the built product, the core
differentiation goal has failed — treat these as non-negotiable, not nice-to-haves.

## 4. Tech Stack (fixed, do not substitute without explicit instruction)

- **Frontend**: React (MERN stack). UI generated via Stitch + team design references —
  UI/UX detail is out of scope for this PRD; build to match whatever screen specs or
  Stitch output is provided separately.
- **Backend**: Node.js + Express.
- **Database**: MongoDB (connection string provided separately by the team — do not
  hardcode or invent one).
- **AI**: Gemini API — image input sent directly, no separate OCR/text-extraction
  library in the primary path. Gemini receives the raw front/back pack images and
  returns structured JSON directly.
- **Fallback (secondary path only)**: Tesseract.js, client-side, used ONLY if the
  Gemini API call fails (error, timeout, rate-limit) — never used as the primary
  extraction method.
- **No barcode dependency** in the core flow — camera/upload of package photos is the
  primary and only required input method. Barcode scanning is not required for MVP.
- **Authentication**: simple email + password. Signup creates account (email + hashed password), login validates against existing account. No OAuth, no JWT complexity required beyond a basic session/token to identify the logged-in user for subsequent requests.

## 5. Complete User Flow (build all of this — nothing here is optional for MVP)

### 5.1 Onboarding / Health Profile
- User provides: medical conditions (multi-select), allergies (multi-select), dietary
  preferences (multi-select), goals (multi-select), optional free-text notes.
- Profile is persisted (MongoDB) and re-editable at any time.
- Profile data must be available to every scan request — every AI call must receive
  the user's current profile, not a stale/cached copy from account creation.

### 5.2 Scan
- User taps "Scan a Product" → UI offers two clear options: Click Image (opens device camera directly for live capture) and Upload from Gallery (opens file picker). Both paths must work for front-pack and back-pack image separately. This must be a real camera capture on mobile (not just a file input that happens to show a picker) — use the capture attribute / getUserMedia or platform-appropriate camera API so it visibly opens the camera, not just a generic upload dialog.
- On submit: compute a hash of the submitted image(s) and check for a cached result
  before calling Gemini (see §7, caching).
- Show a multi-step loading state reflecting real backend progress, not a fake timer:
  Extracting Data → Checking Claims → Comparing Marketing vs Reality → Personalizing
  Verdict. If backend can report actual step completion, wire it to real state; if not,
  a reasonable simulated sequence matching this order is acceptable but should not be
  static/decorative only.

### 5.3 Result Page — Required Sections, in Order
1. **Risk Score** — numeric score (0-100) + risk band (Low / Moderate / High), derived
   from the personalization logic in §8, not an arbitrary number.
2. **AI Verdict** — a short (2-4 sentence) plain-English, personalized paragraph
   referencing the user's specific conditions/allergies/goals by name where relevant.
3. **Proceed Anyway** — a button, NOT a retry/error-fallback control. Semantics: the
   user has seen a moderate/high risk verdict and wants to consume the product anyway.
   Clicking it triggers a SECOND, separate Gemini call (see §9) that returns
   harm-reduction guidance. It must never simply re-show the same warning.
4. **Key Risk Insights** — a list of specific, condition-tagged risk statements (e.g.
   "Contains refined wheat flour — conflicts with your gluten allergy — High Impact"),
   each tagged with the relevant user condition/goal and an impact level.
5. **Nutrient Impact Analysis** — per-nutrient bars (sugar, sodium, saturated fat, trans
   fat, total fat, carbs, fibre, protein, cholesterol, artificial additives) — each
   must show **% of Indian daily RDA limit consumed by this one serving**, not a bare
   High/Moderate/Low label with no numeric grounding.
6. **Claim Compliance Check** (NEW — must be present) — lists every front-pack claim
   that matched a rule in the FSSAI rules book (§8.1), each showing: the claim text,
   compliance status (non-compliant / needs-evidence / context-needed /
   high-risk-category), a plain-English reason, and the regulatory source it's grounded
   in. Claims with no rule match are not shown here (do not fabricate judgments).
7. **Reality vs Marketing (QUID)** (NEW — must be present) — for each ingredient
   emphasized on the front pack (via text or imagery), state either its explicit
   disclosed percentage (if present on-pack) or its position in the printed ingredient
   list relative to total ingredient count, with a plain-English implication (see §8.2
   for exact logic and example outputs).
8. **Ingredient Distribution** — visual breakdown of ingredients by category (e.g.
   Refined Grains, Natural Sweeteners, Vegetable Oils, Dairy Derivatives, Emulsifiers,
   etc.) — categorization derived from the Gemini extraction, not hardcoded per product.
9. **Better Choices For You** — alternative product suggestions matched to the user's
   health profile. If no alternative data source exists yet, this section may show an
   honest "still building our alternatives database" state rather than fabricated
   suggestions — never invent fake product names/brands here.
10. **Scan Another Product** — resets to scan flow.

### 5.4 Proceed Anyway Flow (detailed)
- Triggered only from the result page, only after an initial verdict is shown.
- Sends the original scan result JSON + user profile to a second, distinct Gemini
  prompt (see §9).
- Returns guidance grouped into four categories: Immediate Actions, Same Day, Next
  Meal, Behavioral Corrections — each item has an action and a short "why this helps"
  explanation tied to the specific nutrients/claims flagged in the original scan.
- This response should be cached/stored so re-opening the same scan's Proceed Anyway
  panel doesn't re-trigger a new Gemini call unnecessarily.

## 6. Explicit Non-Goals (do not build these, do not let scope creep in)

- Not a calorie tracker or day-by-day diet planner.
- Not a medical diagnosis tool — never states or implies a diagnosis, even indirectly.
- Never outputs a bare "good/bad" label without an accompanying explanation.
- No live integration with any official FSSAI API — none publicly exists. Claim
  checking is done entirely via the curated rules book (§8.1), not a live regulatory
  lookup.
- No barcode-database dependency for core functionality.
- User authentication is minimal by design: email + password only. No social login, no password reset flow, no email verification required for hackathon scope — just create-account and login.

## 7. Caching Requirement

- Every scan computes an image hash (front image, and back image if present) before
  calling Gemini.
- Check for an existing cached result matching that hash first. If found, skip the
  Gemini call entirely and return the cached result. Still log a lightweight scan
  history entry for the user referencing the cached result (do not duplicate the full
  payload in storage).
- If not found, call Gemini, store the full result keyed by the hash, then log the scan
  history entry.
- This exists specifically to prevent repeated API calls on the same product during
  live demo/judging — treat this as a functional requirement, not an optimization to
  skip if time is short.

## 8. AI Logic Requirements (what the single scan-analysis Gemini call must do)

In one API call per scan (image input, JSON output), the system must:

1. **Extract** structured data: product name, brand, all front-pack claims, full
   ingredient list in printed order (this order reflects descending weight under
   Indian labeling law — never reorder it), nutrition-per-serving values, serving
   size, allergen statements, ingredients emphasized on the front pack, and any
   explicit QUID percentage shown on-pack. Any field that cannot be read must be
   returned as `null` — never fabricated or guessed.

2. **Check claims (§8.1)** against a rules book of curated FSSAI violation patterns.
   Only flag claims that match a rule (exactly or by known alias) — never invent a
   compliance judgment beyond what the rules book supports.

### 8.1 FSSAI Rules Book — Required Content
Build a rules file (`rules.json` or equivalent) with entries covering at minimum:
- The FSSAI "health drink" term ban.
- Vague purity/naturalness claims ("100% natural," "farm fresh") requiring substantiation.
- Unsubstantiated health claims ("immunity boosting," "heart healthy," "diabetic friendly").
- At least four high-risk product categories with their documented non-compliance
  rates: honey (80%), ghee (65.5%), tea/herbal infusions (54.3%), edible oils (52.9%).
- The QUID (quantitative ingredient declaration) requirement — when an ingredient is
  emphasized in words or imagery, its percentage must be disclosed.
- The "no added sugar" nuance — legally valid, but may still contain natural sugars or
  concentrates contributing to total sugar load.
- Each rule entry needs: term, aliases, status (non-compliant / needs-evidence /
  context-needed / high-risk-category), a short plain-English reason, and a cited
  regulatory/report source. Do not invent rules beyond what is grounded in real FSSAI
  regulations or the LabelBlind audit findings referenced above.

### 8.2 QUID / Reality-vs-Marketing Logic — Required Behavior
- Input: highlighted ingredients, full ordered ingredient list, explicit QUID % if present.
- If an explicit percentage exists for a highlighted ingredient, state it directly:
  e.g. "Almonds are disclosed at 4% of the product."
- If no explicit percentage exists, infer from ingredient-list position relative to
  total count: e.g. "Almonds are pictured prominently on the front pack, but are the
  8th of 10 ingredients listed — likely a small percentage of the product."
- If a highlighted ingredient ranks near the top of the list, state this positively
  rather than implying deception — e.g. "Fruit is emphasized on the front pack and
  ranked 2nd of 6 ingredients — present in meaningful quantity."

### 8.3 Personalization Logic — Required Behavior
- Use fixed Indian RDA reference values: 2000 kcal, 50g added sugar, 22g saturated fat,
  2g trans fat, 2000mg sodium per day.
- For each scan, compute this serving's percentage of daily limit for sugar, sodium,
  and saturated fat, and surface these percentages directly in the Nutrient Impact
  Analysis section — not just qualitative labels.
- The AI Verdict paragraph must reference the user's specific stated conditions,
  allergies, and goals by name, not generic language — e.g. "given your diabetes and
  hypertension" rather than "given your health conditions."
- Never state or imply a medical diagnosis. Only relate nutrition facts to the user's
  self-reported profile.

## 9. Proceed Anyway — Second AI Call Requirements
- Separate prompt from the main scan analysis, triggered only on explicit user action.
- Input: the full original scan result JSON + the user's health profile.
- Must explicitly avoid repeating warnings or trying to dissuade the user — the premise
  is they have already decided to consume the product.
- Output: four categories — Immediate Actions, Same Day, Next Meal, Behavioral
  Corrections — each containing 1-3 items, each item with an action and a short "why"
  explanation tied to the specific nutrients/claims flagged in the original scan
  (not generic wellness advice unrelated to the actual product scanned).
- Cache/store this response per scan so repeat views don't re-trigger the API call.

## 10. Failure Handling Requirements
- Set an explicit timeout on the primary Gemini call (approx. 8-10 seconds).
- On error, timeout, or rate-limit response: do not fail silently. Offer the user a
  single retry option.
- If retry also fails (or is declined), fall back to: run Tesseract.js client-side OCR
  on the submitted image(s), display whatever raw text is recovered, clearly labeled as
  "Unverified — basic text extraction only, no compliance or QUID check available,"
  and explicitly skip the Claim Compliance Check and Reality vs Marketing sections
  rather than fabricating results for them. Attempt basic personalization only if
  nutrition numbers are recoverable via simple pattern matching on the OCR text
  (e.g. numbers adjacent to "sugar," "sodium," etc.) — best-effort only, not guaranteed.

## 11. Data Persistence Requirements (high-level — full schema is a separate document)
The system must persist: user health profiles (editable), scan history per user,
cached scan results keyed by image hash (to support §7), and Proceed Anyway results
linked to their originating scan (to avoid regenerating on repeat views). Exact
collection names, fields, and relationships are defined in the accompanying Data
Schema PRD — build against that document's schema, do not invent a different one.

## 12. Definition of Done for This PRD
The build satisfies this PRD only if all of the following are true:
- A user can create a health profile and it visibly changes the verdict/risk score
  for the same scanned product compared to a different profile.
- Claim Compliance Check section is present and shows real, rules-book-grounded flags
  — not empty, not placeholder text, not fabricated judgments outside the rules book.
- Reality vs Marketing section is present and shows a genuine ingredient-position or
  percentage-based comparison — not a generic statement.
- Nutrient Impact Analysis shows % of Indian RDA daily limits, not bare High/Low tags.
- Proceed Anyway produces content meaningfully different from the initial verdict —
  actionable harm-reduction guidance, not a repeated warning.
- The app functions end-to-end (profile → scan → result → proceed anyway) without
  requiring a barcode or any hardcoded product data.
- Failure handling (§10) is implemented, not just described — a forced API failure
  should visibly trigger the fallback path, not crash the app.

## 13. Screen & Component Hierarchy (Frontend Reference)

To ensure high-quality UI/UX scaffolding, implement the following screen structure:

1. **Authentication Screen (`/auth`)**
   - Clean, centered Card layout.
   - Login & Signup tabs/views.
   - Inputs: Email, Password. Signup includes an optional Name field.
   - Handles token storage (localStorage/sessionStorage) and redirects to `/profile` (if no profile exists) or `/` (scan page).

2. **Health Profile / Onboarding Screen (`/profile`)**
   - Header with a clear progress/edit indicator.
   - Form controls for profile preferences:
     - **Medical Conditions** (Multi-select pills: e.g., Type 2 Diabetes, Hypertension, High Cholesterol, Heart Disease).
     - **Allergies** (Multi-select pills: e.g., Gluten, Peanuts, Lactose Intolerance, Shellfish).
     - **Dietary Preferences** (Multi-select pills: e.g., Vegetarian, Vegan, Low Sugar, High Protein).
     - **Goals** (Multi-select pills: e.g., Lose Weight, Manage Blood Sugar, Build Muscle, Heart Health).
     - **Additional Notes** (Textarea field for free-form instructions).
   - "Save Profile" floating action button (FAB) or sticky footer button.

3. **Scan / Dashboard Screen (`/`)**
   - Primary interactive page.
   - Quick stats/greeting displaying user's name (if set) and link to edit `/profile`.
   - **Upload/Capture Area**:
     - Visual toggle/buttons: **Click Image** (opens camera with `capture="environment"` or getUserMedia API) and **Upload from Gallery** (standard file inputs).
     - Separate capture slots for **Front of Pack** (required) and **Back of Pack** (optional).
     - Thumbnails/previews of captured images with an option to remove/replace them.
     - "Analyze Product" submit button (disabled until front pack image is captured).
   - **Loading Overlay**: Multi-step indicator that updates state based on API milestones:
     1. "Uploading Images..."
     2. "Extracting Label Data..."
     3. "Checking Regulatory Compliance..."
     4. "Calculating Personalized Verdict..."

4. **Results Screen (`/results/:scanId`)**
   - **Header Risk Card**: Giant circular progress indicator representing the `risk_score` (0-100), color-coded by `risk_band` (Red for High, Orange for Moderate, Green for Low), next to the personalized verdict summary.
   - **Proceed Anyway Button**: Displayed prominently under the risk card if risk is Moderate/High. Triggers the harm-reduction drawer.
   - **RDA Progress Bars**: Vertical or horizontal bars showing actual consumed percentage of Indian RDA limits (sugar, saturated fat, sodium, calories).
   - **FSSAI Compliance Alerts**: List of cards for non-compliant or warning claims, featuring badges like `needs-evidence` or `non-compliant` with plain-English reasons and legal sources.
   - **Marketing vs. Reality (QUID) Cards**: Text comparisons of emphasized ingredients vs their actual ordered rank.
   - **Ingredient Classification Breakdown**: A clean tag cloud or bar chart grouping ingredients into categories (e.g., Sweeteners, Refined Grains, Additives).
   - **Alternative Suggestions**: Placeholder slot for "Better Choices" (displays a graceful "loading alternatives database" notice).

5. **Harm Reduction Drawer (`/results/:scanId/proceed`)**
   - Bottom sheet or sliding panel that opens when clicking "Proceed Anyway".
   - Four distinct tabbed views or structured sections:
     - **Immediate Actions** (pills to take post-consumption, with "Why" popups).
     - **Same Day Adjustments** (meal balancing adjustments for the day).
     - **Next Meal Suggestions** (nutritional balancing guides).
     - **Behavioral Tips** (long-term guidance tied to user goals).