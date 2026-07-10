# Label-X — Part 4: UI / Design PRD (Rebuild)

## 1. Scope of This Document
This defines every screen, its required content/data bindings, states, and
micro-interaction requirements. It is meant to be used TOGETHER with your design
inspiration images when generating UI in Stitch — this doc tells Stitch/your coding
agent WHAT must be on each screen and what data drives it; your inspo images tell it
WHAT STYLE to render it in. Neither replaces the other.

Every screen listed here must bind to the exact field names defined in Part 2 (API
contracts) and Part 3 (data schema) — no screen should be built against placeholder/
fake data structures that don't match those documents.

## 2. Global Design Requirements
- Framework: React (MERN frontend), Tailwind for styling (or whatever utility approach
  Stitch outputs by default — keep consistent across all screens, don't mix systems).
- Animation library: **Framer Motion**. Every micro-interaction listed per-screen below
  must use Framer Motion primitives (`motion.div`, `AnimatePresence`, `variants`) —
  not raw CSS transitions, so animations stay consistent and composable.
- Mobile-first: primary usage is camera-based scanning on a phone. Every screen must
  be designed for a narrow viewport first, then scale up.
- Referenced skill: a `skills.md` will be added separately covering design-token/style
  conventions — treat that as authoritative for exact colors, spacing, typography once
  provided; this document only specifies structure, content, and behavior, not exact
  visual tokens.

## 3. Screen-by-Screen Specification

### 3.1 Auth — Signup / Login
**Purpose:** minimal email + password account creation and login (per Part 2 §3 auth routes).
**Content required:**
- Signup: email field, password field, submit button, link to switch to login
- Login: email field, password field, submit button, link to switch to signup
- Inline validation error states (invalid email format, wrong password, account exists)
**Micro-animations:**
- Form fields: subtle focus-state scale/border animation on focus (Framer `whileFocus`)
- Submit button: loading spinner state transition while auth request is in flight
- Error messages: animate in with a slide-down + fade (`AnimatePresence`), not an abrupt appear

### 3.2 Dashboard
**Purpose:** post-login landing screen.
**Content required:**
- Two primary action cards: "Scan a Product" and "Health Profile" (bind to whether a
  profile already exists — if none exists yet, "Health Profile" card should visually
  indicate setup is incomplete/required)
- Recent scan history preview (pull from `GET /api/scan/history/:userId`, show most
  recent 3-5 with product name, risk band, thumbnail if available)
**Micro-animations:**
- Action cards: hover/tap scale (`whileHover`, `whileTap`)
- History list items: staggered fade/slide-in on mount (`staggerChildren` in a parent
  `motion.div` variant)

### 3.3 Health Profile Setup (multi-step)
**Purpose:** capture conditions, allergies, dietary preferences, goals, notes — bound
to the `health_profiles` schema (Part 3 §3) exactly: `conditions[]`, `allergies[]`,
`dietaryPreferences[]`, `goals[]`, `additionalNotes`.
**Content required per step:**
- Step 1: Medical Conditions — multi-select chips/cards
- Step 2: Allergies — multi-select chips/cards
- Step 3: Dietary Preferences — multi-select chips/cards
- Step 4: Goals + Additional Notes (free text) — multi-select + textarea
- Persistent side panel or summary strip showing all selections made so far across
  steps (running "Your Health Context" summary), with a live count of items selected
- Progress indicator (step X of 4) visible on every step
**Micro-animations:**
- Chip/card selection: scale + color transition on select/deselect (`animate` prop
  keyed to selected state, not just a CSS class swap)
- Step transitions: slide horizontally between steps (`AnimatePresence` with
  `initial`/`animate`/`exit` x-offset variants)
- Progress bar: animate width change smoothly on step change, not an instant jump
- Summary panel: new tags animate in (scale + fade) as they're added, animate out when removed

### 3.4 Scan
**Purpose:** capture or upload front-pack (required) and back-pack (recommended)
images, per Part 1 §5.2.
**Content required:**
- Two clearly separated upload slots: "Product Front Pack" and "Product Back Pack /
  Nutrition Label" (back pack optional but should be visually encouraged, not hidden)
- Each slot: a button/area offering **"Click Image"** (opens live camera capture) and
  **"Upload from Gallery"** (opens file picker) — both must be genuinely distinct and
  functional, not one control disguised as two
- Image preview thumbnail once captured/uploaded, with a remove/retake (X) control
- "Analyse Product" primary action button, disabled until at least the front image is present
**Micro-animations:**
- Camera/gallery choice: a small action-sheet or popover animates in (slide-up +
  fade) rather than an instant native-feeling dropdown
- Image preview: scale/fade in once captured or selected
- Remove (X) button: scale-in on hover, and the image tile animates out (scale-down +
  fade) when removed, not an abrupt disappearance
- "Analyse Product" button: disabled → enabled state should transition (opacity/color),
  not snap

### 3.5 Analyzing / Loading State
**Purpose:** shown while `POST /api/scan` is in flight.
**Content required:**
- Modal or full-panel overlay with a progress checklist reflecting real steps:
  Extracting Data → Checking Claims → Comparing Marketing vs Reality → Personalizing
  Verdict (matches Part 1 §5.2) — each step shows a check once complete
- Reassurance text (e.g. expected duration)
**Micro-animations:**
- Each checklist item: icon transitions from pending → spinner → checkmark, animated,
  not an instant swap
- Overall modal: fade + scale in on appear
- If steps are simulated rather than tied to real backend progress events, stagger
  their "completion" timing so it doesn't look mechanically uniform

### 3.6 Result Page
**Purpose:** display the full scan result object (Part 2 §6) — this is the most
content-dense screen and must bind every section to real API fields, in this exact
order (per Part 1 §5.3):

1. **Risk Score ring** — bind to `risk_score` (0-100) and `risk_band`
   - Micro-animation: ring fills/animates from 0 to the actual score value on mount
     (animate the stroke-dashoffset or equivalent), color transitions based on band
2. **AI Verdict** — bind to `personalized_verdict.summary`
   - Micro-animation: text fades/slides in after the risk ring animation completes
     (sequenced, not simultaneous)
3. **Proceed Anyway button** — triggers `POST /api/scan/proceed-anyway`
   - Micro-animation: button press feedback (`whileTap` scale), and on click, expands
     into the harm-reduction tabbed panel (Immediate Actions / Same Day / Next Meal /
     Behavioral Corrections) — bind each tab's list to the corresponding array in the
     Proceed Anyway response shape (Part 2 §8)
   - Tab switching: animate content cross-fade/slide, not an instant swap
4. **Key Risk Insights** — bind to a derived list (condition-tagged risk bullets)
   - Micro-animation: cards stagger in on scroll into view (use `whileInView` +
     `staggerChildren`)
5. **Nutrient Impact Analysis** — bind to `personalized_verdict.sugar_pct_daily_limit`,
   `sodium_pct_daily_limit`, `sat_fat_pct_daily_limit`, plus raw values from
   `product.nutrition_per_serving` — bars must show **% of Indian RDA daily limit**
   as the primary label, not just a qualitative tag
   - Micro-animation: each bar animates its fill width from 0 to actual value on
     scroll into view, staggered per row
6. **Claim Compliance Check (NEW)** — bind to `claim_compliance[]` array exactly;
   each card shows claim text, status badge, reason, source
   - Micro-animation: status badge color/icon should feel distinct per status value
     (non-compliant vs needs-evidence vs context-needed vs high-risk-category) — use
     consistent color coding across this section and don't reuse the risk-band colors
     from the ring for a different meaning
7. **Reality vs Marketing / QUID (NEW)** — bind to `quid_analysis[]` array; each card
   shows the ingredient and its generated statement
   - Micro-animation: consider a "before/after" or "pictured vs actual" visual framing
     (e.g. two small stat chips side by side) that animates in — this is a key
     differentiator section, give it visual weight, not just plain text in a card
8. **Ingredient Distribution** — pie/donut chart, bind to categorized ingredient data
   derived from `product.ingredients`
   - Micro-animation: chart segments animate in (grow from center or fade-sequence
     per segment), legend items fade in synced with their segment
9. **Better Choices For You** — alternatives list, or honest empty state if none available
   - Micro-animation: cards fade/slide in if populated; empty state should still feel
     designed (not a bare gray box), fade in normally
10. **Scan Another Product** — resets flow
    - Micro-animation: standard button tap feedback

**Confidence indicator:** if `confidence` is `"low"` or `"medium"`, the result page
should visibly (not intrusively) indicate this — e.g. a small badge near the AI
Verdict — since it reflects real extraction uncertainty from Gemini, not a cosmetic detail.

### 3.7 Failure / Fallback State
**Purpose:** shown when `/api/scan` returns the structured failure shape (Part 2 §9).
**Content required:**
- Clear message that analysis couldn't complete
- "Try Again" button (single retry)
- If declined or retry also fails: degraded view showing raw OCR text (Tesseract.js
  fallback per Part 1 §10), explicitly labeled "Unverified — basic text extraction
  only, no compliance or QUID check available," with Claim Compliance and Reality vs
  Marketing sections visibly omitted (not shown empty — actually absent, with a short
  note why)
**Micro-animations:**
- Error state: gentle shake or fade-in on appear (avoid anything that feels alarming/jarring)
- Transition from "Try Again" to degraded view: standard fade/slide, keep it calm, not dramatic

## 4. Data Binding Discipline
Every bind mentioned above must reference actual field names from Part 2 §6 (scan
result), Part 2 §8 (Proceed Anyway result), and Part 3 (schema) — verbatim. If Stitch
or your coding agent generates a screen with placeholder data that doesn't match these
field names exactly, treat that as a bug to fix immediately, not a cosmetic detail to
address later — mismatched field names between UI and API are the most common source
of "it works in the mockup but breaks when wired up" failures.

## 5. Animation Performance Note
Framer Motion animations should be tasteful and fast (150-350ms typical duration) —
this is a utility/health app, not a game. Avoid animation durations over 500ms except
for deliberate, slower sequences like the risk-score ring fill. Nothing should feel
like it's blocking the user from proceeding; animations should decorate state changes,
never gate them (e.g. don't make the user wait for a card's entrance animation to
finish before they can tap the next action).

## 6. Definition of Done for This PRD
- Every screen listed in §3 exists and binds to the real field names from Part 2/3 —
  no screen ships with hardcoded/placeholder data standing in for real API responses.
- Camera capture ("Click Image") is a genuine live camera trigger, not a relabeled
  file input, on devices/browsers where camera access is available; gallery upload
  works as a separate, clearly distinct path.
- Every micro-animation listed per screen is implemented with Framer Motion, not raw
  CSS transitions, and respects the performance note in §5.
- Claim Compliance Check and Reality vs Marketing sections are visually distinct from
  each other and from the general Nutrient Impact section — they should not look like
  reskinned copies of the same card component with different text.
- The Failure/Fallback state (§3.7) is a real, reachable screen, not just documented —
  it should be testable by forcing a Gemini call to fail.