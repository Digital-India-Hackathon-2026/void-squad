import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scanAPI, translateAPI } from '../api/index.js';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
];

// ── Risk config ────────────────────────────────────────────────────────────────
const RISK = {
  Low:      { color: 'text-primary',   stroke: '#4edea3', bg: 'bg-primary/15',   border: 'border-primary/30',   glow: '0 0 20px rgba(78,222,163,0.3)',  label: 'Low Risk'  },
  Moderate: { color: 'text-secondary', stroke: '#ffb95f', bg: 'bg-secondary/15', border: 'border-secondary/30', glow: '0 0 20px rgba(255,185,95,0.3)', label: 'Moderate'  },
  High:     { color: 'text-error',     stroke: '#ffb4ab', bg: 'bg-error/15',     border: 'border-error/30',     glow: '0 0 20px rgba(255,180,171,0.3)',label: 'High Risk' },
};

// ── Claim compliance badge colours ──────────────────────────────────────────
const CLAIM_STATUS = {
  'non-compliant':      { bg: 'bg-error/10',     border: 'border-error/30',     text: 'text-error',     icon: 'cancel' },
  'needs-evidence':     { bg: 'bg-secondary/10', border: 'border-secondary/30', text: 'text-secondary', icon: 'help'   },
  'context-needed':     { bg: 'bg-secondary/10', border: 'border-secondary/30', text: 'text-secondary', icon: 'info'   },
  'high-risk-category': { bg: 'bg-error/10',     border: 'border-error/30',     text: 'text-error',     icon: 'warning'},
  'compliant':          { bg: 'bg-primary/10',   border: 'border-primary/30',   text: 'text-primary',   icon: 'check_circle' },
};

// ── Proceed Anyway tab config ──────────────────────────────────────────────
const PROCEED_TABS = [
  { key: 'immediate_actions', label: 'Immediate' },
  { key: 'same_day',          label: 'Same Day'  },
  { key: 'next_meal',         label: 'Next Meal' },
  { key: 'behavioral_corrections', label: 'Behavioural' },
];

// ── Risk Ring component ────────────────────────────────────────────────────
function RiskRing({ score, band }) {
  const r = 40;
  const circumference = 2 * Math.PI * r; // 251.2
  const [offset, setOffset] = useState(circumference);
  const cfg = RISK[band] || RISK.Low;

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(circumference - (Math.min(score ?? 0, 100) / 100) * circumference);
    }, 200);
    return () => clearTimeout(t);
  }, [score, circumference]);

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="transparent"
          stroke={cfg.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
          style={{ filter: `drop-shadow(0 0 6px ${cfg.stroke}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-display-metrics text-display-metrics ${cfg.color}`}>{score ?? '—'}</span>
        <span className="font-metric-label text-metric-label text-on-surface-variant">/100</span>
      </div>
    </div>
  );
}

// ── RDA nutrient bar ───────────────────────────────────────────────────────
function NutrientBar({ label, pct, raw, limit, unit, index }) {
  const capped = Math.min(pct ?? 0, 100);
  const barColor = pct >= 90 ? '#ffb4ab' : pct >= 60 ? '#ffb95f' : '#4edea3';
  const textColor = pct >= 90 ? 'text-error' : pct >= 60 ? 'text-secondary' : 'text-primary';
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(capped), 400 + index * 120);
    return () => clearTimeout(t);
  }, [capped, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="level-1-surface rounded-xl p-sm"
    >
      <div className="flex justify-between items-end mb-xs">
        <div>
          <span className="font-metric-label text-metric-label block text-on-background">{label}</span>
          <span className={`font-body-md text-body-md ${textColor}`}>{pct != null ? `${Math.round(pct)}% of RDA` : 'N/A'}</span>
        </div>
        {raw != null && limit != null && (
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            {raw}{unit} / {limit}{unit}
          </span>
        )}
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill"
          style={{ width: `${width}%`, backgroundColor: barColor, boxShadow: pct >= 90 ? '0 0 8px rgba(255,180,171,0.4)' : 'none' }}
        />
      </div>
    </motion.div>
  );
}

// ── Claim compliance card ──────────────────────────────────────────────────
function ClaimCard({ claim, index }) {
  const s = CLAIM_STATUS[claim.status] || CLAIM_STATUS['needs-evidence'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className={`flex items-start gap-3 p-3 ${s.bg} rounded-xl border ${s.border}`}
    >
      <span className={`material-symbols-outlined ${s.text} mt-0.5 flex-shrink-0`} style={{ fontVariationSettings: "'FILL' 1" }}>
        {s.icon}
      </span>
      <div className="flex-grow min-w-0">
        <span className="block font-metric-label text-metric-label text-on-background line-clamp-1">
          "{claim.claim_text}"
        </span>
        <span className={`block font-label-caps text-label-caps ${s.text} mt-0.5`}>
          {claim.status?.replace(/-/g, ' ').toUpperCase()}
        </span>
        {claim.reason && (
          <p className="font-body-md text-[13px] text-on-surface-variant mt-1 leading-snug">{claim.reason}</p>
        )}
        {claim.source && (
          <span className="font-label-caps text-[10px] text-on-surface-variant/60 mt-1 block">Source: {claim.source}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── QUID card ─────────────────────────────────────────────────────────────
function QuidCard({ item, index }) {
  // Infer rank from statement text if position is mentioned
  const rankMatch = item.statement?.match(/(1st|2nd|3rd|\d+th|#\d+|position \d+|rank \d+)/i);
  const isHighlighted = item.highlighted === true || index < 2;
  const rankColor = index === 0 ? 'text-error bg-error/10 border-error/20'
    : index === 1 ? 'text-secondary bg-secondary/10 border-secondary/20'
    : 'text-on-surface-variant bg-white/5 border-white/10';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="level-1-surface rounded-xl p-sm flex gap-3 items-start"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-metric-label text-[11px] font-bold border ${rankColor}`}>
        #{index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-metric-label text-metric-label text-on-background block">{item.ingredient}</span>
        <p className="font-body-md text-[13px] text-on-surface-variant mt-0.5 leading-snug">{item.statement}</p>
      </div>
    </motion.div>
  );
}

// ── Proceed Anyway Drawer ─────────────────────────────────────────────────
function ProceedDrawer({ open, scanId, onClose }) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !scanId) return;
    setLoading(true);
    setError('');
    scanAPI.proceedAnyway({ scanId })
      .then(res => { if (res.data?.success) setData(res.data); else setError(res.data?.message || 'Failed to load guidance.'); })
      .catch(() => setError('Failed to load guidance. Please try again.'))
      .finally(() => setLoading(false));
  }, [open, scanId]);

  const tabData = data?.[PROCEED_TABS[tab].key] ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="w-full glass-panel rounded-t-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 bg-on-surface-variant/30 rounded-full" />
            </div>

            <div className="flex-shrink-0 px-safe-margin py-md border-b border-white/10 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-background">Harm Reduction Guide</h3>
              <button onClick={onClose} className="text-on-surface-variant hover:text-on-background transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-white/10 px-safe-margin">
              {PROCEED_TABS.map((t, i) => (
                <button
                  key={t.key}
                  onClick={() => setTab(i)}
                  className={`flex-1 py-2 font-label-caps text-label-caps transition-colors relative ${
                    tab === i ? 'text-primary' : 'text-on-surface-variant hover:text-on-background'
                  }`}
                >
                  {t.label}
                  {tab === i && (
                    <motion.div layoutId="proceed-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-safe-margin py-md space-y-sm">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-on-surface-variant font-body-md">Loading guidance...</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error font-body-md">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              {!loading && !error && data && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-sm pb-4"
                  >
                    {tabData.length === 0 ? (
                      <p className="text-on-surface-variant font-body-md text-center py-4">No items for this category.</p>
                    ) : (
                      tabData.map((item, i) => (
                        <div key={i} className="level-1-surface rounded-xl p-sm">
                          <p className="font-metric-label text-metric-label text-on-background">{item.action}</p>
                          {item.why && <p className="font-body-md text-[13px] text-on-surface-variant mt-1">{item.why}</p>}
                        </div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Ingredient Distribution bar chart ─────────────────────────────────────
function IngredientDistribution({ ingredients }) {
  if (!ingredients?.length) return null;

  // Group by category from the ingredients array
  const categories = {};
  ingredients.forEach(ing => {
    const cat = ing.category || 'Other';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  const total = ingredients.length;
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const COLORS = ['#4edea3', '#ffb95f', '#ffb4ab', '#6ffbbe', '#ff7a73', '#bbcabf'];

  return (
    <div className="w-full space-y-3">
      {sorted.map(([cat, count], i) => {
        const pct = Math.round((count / total) * 100);
        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="space-y-1"
          >
            <div className="flex justify-between font-label-caps text-label-caps text-on-surface-variant">
              <span>{cat}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 + 0.2, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Failure state ─────────────────────────────────────────────────────────
function FailureState({ message, onRetry, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60dvh] px-safe-margin text-center gap-md"
    >
      <div className="w-20 h-20 rounded-full bg-error/10 border border-error/30 flex items-center justify-center">
        <span className="material-symbols-outlined text-error text-3xl">sentiment_dissatisfied</span>
      </div>
      <div>
        <h2 className="font-headline-md text-headline-md text-on-background mb-xs">Analysis Incomplete</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{message || 'We could not complete the analysis. Please try again.'}</p>
      </div>
      <div className="flex gap-sm w-full max-w-xs">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/15 text-on-surface-variant font-metric-label text-metric-label hover:bg-white/5 transition-colors">
          Go Back
        </button>
        <button onClick={onRetry} className="flex-1 py-3 rounded-xl btn-primary-glow font-metric-label text-metric-label">
          Try Again
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Results Page ──────────────────────────────────────────────────────
export default function ResultsPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proceedOpen, setProceedOpen] = useState(false);
  const fetchRef = useRef(false);

  // Translation State
  const [targetLang, setTargetLang] = useState('en');
  const [translatedData, setTranslatedData] = useState(null);
  const [translating, setTranslating] = useState(false);

  async function fetchScan() {
    setLoading(true);
    setError('');
    try {
      const res = await scanAPI.getById(scanId);
      const d = res.data;
      if (!d.success) {
        setError(d.message || 'Analysis could not be completed.');
      } else {
        setData(d);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    fetchScan();
  }, [scanId]);

  async function handleTranslate(e) {
    const lang = e.target.value;
    setTargetLang(lang);
    if (lang === 'en') {
      setTranslatedData(null);
      return;
    }
    setTranslating(true);
    try {
      const res = await translateAPI.translateScan({
        scanId,
        targetLanguage: lang,
        includeProceedAnyway: false
      });
      if (res.data?.success) {
        setTranslatedData(res.data);
      }
    } catch (err) {
      console.error('Translation failed', err);
    } finally {
      setTranslating(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-background min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
            <span className="material-symbols-outlined text-2xl text-primary">biotech</span>
          </div>
          <p className="text-on-surface-variant font-body-md">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-background min-h-dvh flex flex-col">
        <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[60] flex items-center px-safe-margin h-16 w-full">
          <button onClick={() => navigate('/scan')} className="hover:bg-white/5 p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary ml-2">DeCode.it</span>
        </header>
        <FailureState message={error} onRetry={fetchScan} onBack={() => navigate('/scan')} />
      </div>
    );
  }

  const rawBand = data.risk_band || 'low';
  const band = rawBand.charAt(0).toUpperCase() + rawBand.slice(1).toLowerCase();
  const cfg = RISK[band] || RISK.Low;
  
  const tFields = translatedData?.translatedFields || {};
  const verdict = { ...data.personalized_verdict, ...tFields.personalized_verdict };
  const nutrition = data.product?.nutrition_per_serving ?? {};
  const claims = (data.claim_compliance ?? []).map((c, i) => ({ ...c, ...tFields.claim_compliance?.[i] }));
  const quid = (data.quid_analysis ?? []).map((q, i) => ({ ...q, ...tFields.quid_analysis?.[i] }));
  const insights = (data.key_risk_insights ?? []).map((ins, i) => ({ ...ins, ...tFields.key_risk_insights?.[i] }));
  const alternatives = data.alternatives ?? [];
  const confidence = data.confidence;

  // Compute nutrient bars from personalized_verdict RDA percentages
  const nutrientBars = [
    { label: 'Added Sugar',    pct: verdict?.sugar_pct_daily_limit,    raw: nutrition.sugar,         limit: 50,    unit: 'g'  },
    { label: 'Sodium',         pct: verdict?.sodium_pct_daily_limit,   raw: nutrition.sodium,        limit: 2000,  unit: 'mg' },
    { label: 'Saturated Fat',  pct: verdict?.sat_fat_pct_daily_limit,  raw: nutrition.saturated_fat, limit: 22,    unit: 'g'  },
    { label: 'Trans Fat',      pct: nutrition.trans_fat != null ? (nutrition.trans_fat / 2) * 100 : null, raw: nutrition.trans_fat, limit: 2, unit: 'g' },
    { label: 'Total Calories', pct: nutrition.calories != null ? (nutrition.calories / 2000) * 100 : null, raw: nutrition.calories, limit: 2000, unit: 'kcal' },
  ].filter(n => n.pct != null);

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col font-body-md overflow-x-hidden">
      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[60] flex items-center justify-between px-safe-margin h-16 w-full">
        <button onClick={() => navigate('/')} className="hover:bg-white/5 p-2 rounded-full transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-primary">arrow_back</span>
        </button>
        <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">DeCode.it</div>
        <div className="flex items-center gap-2">
          {translating && <span className="material-symbols-outlined animate-spin text-on-surface-variant text-sm">sync</span>}
          <div className="relative">
            <select
              value={targetLang}
              onChange={handleTranslate}
              disabled={translating}
              className="appearance-none bg-white/5 border border-white/10 rounded-full px-3 py-1.5 pr-8 text-on-background font-body-md text-sm outline-none focus:border-primary/50 transition-colors cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-background text-on-background">
                  {lang.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow px-safe-margin pb-20 pt-md w-full max-w-[1200px] mx-auto md:pl-[120px] lg:pl-[140px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 xl:gap-16 items-start">
          
          {/* Left Column: Sticky Summary */}
          <div className="flex flex-col gap-6 md:sticky md:top-24">
            {/* ── 1. Risk Score Ring ─────────────────────────────────────────── */}
            <section className="flex flex-col items-center justify-center py-md">
          <RiskRing score={data.risk_score} band={band} />
          <div className="mt-sm text-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full ${cfg.bg} ${cfg.color} font-label-caps text-label-caps border ${cfg.border}`}
              style={{ boxShadow: cfg.glow }}
            >
              {cfg.label}
            </span>
            <h1 className="font-headline-lg text-headline-lg mt-xs">
              {data.product?.product_name || 'Product Analysis'}
            </h1>
            {data.product?.brand && (
              <p className="font-metric-label text-metric-label text-on-surface-variant">{data.product.brand}</p>
            )}
          </div>
        </section>

        {/* ── 2. AI Verdict ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="glass-panel rounded-xl p-md relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl">psychology</span>
          </div>
          <h2 className="font-headline-md text-headline-md mb-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            AI Verdict
            {/* Confidence badge */}
            {confidence && confidence !== 'high' && (
              <span className={`ml-auto font-label-caps text-label-caps px-2 py-0.5 rounded-full border ${
                confidence === 'low' ? 'text-error bg-error/10 border-error/30' : 'text-secondary bg-secondary/10 border-secondary/30'
              }`}>
                {confidence.toUpperCase()} CONFIDENCE
              </span>
            )}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            {verdict?.summary || 'Analysis complete. See nutrient details below.'}
          </p>
        </motion.section>

        {/* ── 3. Proceed Anyway button ───────────────────────────────────── */}
        {(band === 'High' || band === 'Moderate') && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setProceedOpen(true)}
            className="w-full bg-error-container/20 text-error border border-error/50 font-metric-label text-metric-label py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-error-container/30 transition-colors backdrop-blur-sm"
          >
            <span className="material-symbols-outlined">warning</span>
            Proceed Anyway — Get Harm Reduction Guide
          </motion.button>
        )}
          </div>

          {/* Right Column: Detailed Breakdown */}
          <div className="flex flex-col gap-10">
        {/* ── 4. Key Risk Insights ───────────────────────────────────────── */}
        {insights.length > 0 && (
          <section>
            <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">local_fire_department</span>
              Key Risk Insights
            </h3>
            <div className="space-y-xs">
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="level-1-surface rounded-xl p-sm flex gap-3 items-start"
                >
                  <span className={`material-symbols-outlined mt-0.5 flex-shrink-0 ${
                    insight.impact === 'High' ? 'text-error' : insight.impact === 'Moderate' ? 'text-secondary' : 'text-primary'
                  }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {insight.impact === 'High' ? 'report' : insight.impact === 'Moderate' ? 'warning' : 'info'}
                  </span>
                  <div>
                    <p className="font-metric-label text-metric-label text-on-background">{insight.statement}</p>
                    {insight.condition && (
                      <span className="font-label-caps text-[10px] text-on-surface-variant/60 mt-0.5 block">
                        Related to: {insight.condition}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── 5. Nutrient Impact Analysis (RDA Bars) ────────────────────── */}
        {nutrientBars.length > 0 && (
          <section>
            <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              Daily Limit Impact (Indian RDA)
            </h3>
            <div className="space-y-sm">
              {nutrientBars.map((n, i) => <NutrientBar key={n.label} {...n} index={i} />)}
            </div>
          </section>
        )}

        {/* ── 6. Claim Compliance ───────────────────────────────────────── */}
        {claims.length > 0 && (
          <section>
            <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">gavel</span>
              Claim Compliance
            </h3>
            <div className="space-y-xs">
              {claims.map((c, i) => <ClaimCard key={i} claim={c} index={i} />)}
            </div>
          </section>
        )}

        {/* ── 7. Reality vs Marketing (QUID) ───────────────────────────── */}
        {quid.length > 0 && (
          <section>
            <h3 className="font-headline-md text-headline-md mb-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">difference</span>
              Reality vs Marketing
            </h3>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-md">
              Ingredients ranked by actual weight on label — #1 is the most abundant.
            </p>
            <div className="space-y-xs">
              {quid.map((q, i) => <QuidCard key={i} item={q} index={i} />)}
            </div>
          </section>
        )}
        {quid.length === 0 && (
          <section>
            <h3 className="font-headline-md text-headline-md mb-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">difference</span>
              Reality vs Marketing
            </h3>
            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border border-dashed border-white/10">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl">info</span>
              <p className="font-body-md text-[13px] text-on-surface-variant">
                No ingredient ordering data extracted — try scanning with a clearer photo of the ingredients list.
              </p>
            </div>
          </section>
        )}

        {/* ── 8. Ingredient Distribution ───────────────────────────────── */}
        {data.product?.ingredients?.length > 0 && (
          <section className="glass-panel rounded-xl p-md">
            <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">pie_chart</span>
              Ingredient Distribution
            </h3>
            <IngredientDistribution ingredients={data.product.ingredients} />
          </section>
        )}

        {/* ── 9. Better Choices ─────────────────────────────────────────── */}
        <section>
          <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">thumb_up</span>
            Better Choices For You
          </h3>
          {alternatives.length > 0 ? (
            <div className="space-y-xs">
              {alternatives.map((alt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="level-1-surface rounded-xl p-sm flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">check_circle</span>
                  <div>
                    <p className="font-metric-label text-metric-label text-on-background">{alt.name}</p>
                    {alt.reason && <p className="font-body-md text-[13px] text-on-surface-variant mt-0.5">{alt.reason}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="glass-panel rounded-xl p-6 flex flex-col items-center gap-3 text-center border border-dashed border-white/10"
            >
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">inventory_2</span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Still building our alternatives database — check back soon.
              </p>
            </motion.div>
          )}
        </section>

        {/* ── 10. Scan Another ──────────────────────────────────────────── */}
        <section className="pb-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/scan')}
            className="w-full py-4 rounded-xl btn-primary-glow font-headline-md text-[16px] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">document_scanner</span>
            Scan Another Product
          </motion.button>
        </section>
          </div>
        </div>
      </main>

      {/* Proceed Anyway Drawer */}
      <ProceedDrawer open={proceedOpen} scanId={scanId} onClose={() => setProceedOpen(false)} />
    </div>
  );
}
