import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../api/index.js';
import BottomNavBar from '../components/shared/BottomNavBar';

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    title: 'Any existing conditions?',
    subtitle: 'Select all that apply to help us tailor your insights.',
    field: 'conditions',
    options: [
      'Type 1 Diabetes', 'Type 2 Diabetes', 'Hypertension', 'High Cholesterol',
      'Heart Disease', 'Thyroid Disorder', 'Asthma', 'Kidney Disease',
      'PCOD / PCOS', 'Celiac Disease', 'None',
    ],
  },
  {
    id: 2,
    title: 'Any food allergies?',
    subtitle: 'We will flag anything that could trigger a reaction.',
    field: 'allergies',
    options: [
      'Peanuts', 'Tree Nuts', 'Gluten / Wheat', 'Dairy / Lactose',
      'Eggs', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Mustard', 'None',
    ],
  },
  {
    id: 3,
    title: 'Dietary preferences?',
    subtitle: 'Your food choices and restrictions.',
    field: 'dietaryPreferences',
    options: [
      'Vegetarian', 'Vegan', 'Halal', 'Jain', 'Keto',
      'Low-Sodium', 'Low-Sugar', 'Low-Fat', 'High-Protein', 'Gluten-Free',
    ],
  },
  {
    id: 4,
    title: 'What are your health goals?',
    subtitle: 'We will personalise insights to help you reach them.',
    field: 'goals',
    options: [
      'Lose Weight', 'Manage Blood Sugar', 'Reduce Sodium Intake',
      'Improve Heart Health', 'Build Muscle', 'General Fitness',
      'Reduce Cholesterol', 'Better Gut Health',
    ],
    hasNotes: true,
  },
];

// ── Pill component ────────────────────────────────────────────────────────────

function Pill({ label, selected, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      animate={selected ? { scale: 1.04 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`border rounded-full px-sm py-xs font-metric-label text-metric-label transition-all duration-200 ${
        selected ? 'pill-active' : 'pill-inactive'
      }`}
    >
      {label}
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0-indexed
  const [form, setForm] = useState({
    conditions: [],
    allergies: [],
    dietaryPreferences: [],
    goals: [],
    additionalNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Load existing profile
  useEffect(() => {
    if (!user?.userId) return;
    profileAPI.get(user.userId).then(res => {
      const p = res.data?.profile;
      if (p) {
        setForm({
          conditions: p.conditions || [],
          allergies: p.allergies || [],
          dietaryPreferences: p.dietaryPreferences || [],
          goals: p.goals || [],
          additionalNotes: p.additionalNotes || '',
        });
      }
    }).catch(() => {});
  }, [user?.userId]);

  const current = STEPS[step];
  const totalSelected = Object.values(form).flat().filter(v => typeof v === 'string' && v).length;

  function toggle(field, value) {
    setForm(prev => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      handleSave();
    }
  }

  function goBack() {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    } else {
      navigate('/');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await profileAPI.save(form);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const progressPct = ((step + 1) / STEPS.length) * 100;

  // All selections for context tray
  const allSelected = [
    ...form.conditions,
    ...form.allergies,
    ...form.dietaryPreferences,
    ...form.goals,
  ];

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col font-body-md overflow-x-hidden">
      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[60] flex items-center justify-between px-safe-margin h-16 w-full">
        <button
          onClick={goBack}
          className="text-primary hover:bg-white/5 p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-md text-headline-md font-bold text-primary">Health Profile</h1>
        <div className="w-10" />
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col px-safe-margin pt-md pb-[160px]">
        {/* Progress Bar */}
        <div className="mb-lg">
          <div className="flex justify-between font-metric-label text-metric-label text-on-surface-variant mb-xs">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{current.title.split('?')[0]}</span>
          </div>
          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ boxShadow: '0 0 8px rgba(78,222,163,0.5)' }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="flex-grow"
          >
            <h2 className="font-headline-lg text-headline-lg mb-xs">{current.title}</h2>
            <p className="text-on-surface-variant font-body-md text-body-md mb-md">{current.subtitle}</p>

            <div className="flex flex-wrap gap-sm">
              {current.options.map(opt => (
                <Pill
                  key={opt}
                  label={opt}
                  selected={form[current.field].includes(opt)}
                  onToggle={() => toggle(current.field, opt)}
                />
              ))}
            </div>

            {/* Notes field on last step */}
            {current.hasNotes && (
              <div className="mt-md">
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase tracking-wide">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={form.additionalNotes}
                  onChange={e => setForm(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any other health info, medications, or dietary restrictions..."
                  className="w-full bg-surface-container-low border border-white/10 rounded-xl px-4 py-3 text-on-surface text-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all duration-200"
                />
              </div>
            )}

            {error && (
              <div className="mt-md flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-body-md">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Context Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full glass-panel z-50 p-safe-margin border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-xs">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wide">
            Your Context
          </span>
          <span className="font-metric-label text-metric-label text-primary">
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Selected tags tray */}
        <div className="flex gap-xs overflow-x-auto pb-1 mb-sm scrollbar-hide min-h-[28px]">
          <AnimatePresence>
            {allSelected.length === 0 ? (
              <span className="text-on-surface-variant/50 font-body-md text-[13px] italic">Nothing selected yet...</span>
            ) : (
              allSelected.map(tag => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-label-caps text-label-caps whitespace-nowrap"
                >
                  {tag}
                </motion.span>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Continue button */}
        <motion.button
          onClick={goNext}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-primary text-on-primary font-headline-md text-[16px] py-sm rounded-lg hover:bg-primary-fixed transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving...
            </>
          ) : step < STEPS.length - 1 ? (
            'Continue'
          ) : (
            'Save Profile'
          )}
        </motion.button>
      </div>
    </div>
  );
}
