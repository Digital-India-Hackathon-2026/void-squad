import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scanAPI } from '../api/index.js';
import BottomNavBar from '../components/shared/BottomNavBar';

// ── Loading overlay steps ─────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { label: 'Uploading Images', icon: 'cloud_upload' },
  { label: 'Extracting Label Data', icon: 'document_scanner' },
  { label: 'Checking Regulatory Compliance', icon: 'gavel' },
  { label: 'Calculating Personalised Verdict', icon: 'psychology' },
];

// ── Image Slot component ──────────────────────────────────────────────────────
function ImageSlot({ label, badge, badgeColor, icon, required, preview, onOpen, onRemove }) {
  return (
    <section className="glass-panel rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-background text-[20px]">{label}</h2>
          <span
            className={`font-label-caps text-label-caps uppercase tracking-wider ${
              required ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {badge}
          </span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
      </div>

      {!preview ? (
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={onOpen}
          className="border-2 border-dashed border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center gap-sm transition-colors hover:border-primary/50 cursor-pointer min-h-[160px]"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-xs">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-primary transition-colors">
              add_a_photo
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tap to capture or upload the {label.toLowerCase()}.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full rounded-lg overflow-hidden border border-outline-variant"
          style={{ height: required ? '192px' : '128px' }}
        >
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          {/* Remove button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container/80 backdrop-blur-md flex items-center justify-center text-error hover:bg-error/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </motion.button>
          {/* Ready badge */}
          <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-surface-container/80 backdrop-blur-md font-label-caps text-label-caps text-on-background flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Ready
          </div>
        </motion.div>
      )}
    </section>
  );
}

// ── Action Sheet ──────────────────────────────────────────────────────────────
function ActionSheet({ open, title, onCamera, onGallery, onClose }) {
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
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-surface-container-high rounded-t-2xl p-safe-margin pb-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="w-10 h-1.5 bg-on-surface-variant/30 rounded-full mx-auto mb-md" />
            <h3 className="font-headline-md text-headline-md text-on-background mb-md text-center">{title}</h3>
            <div className="flex flex-col gap-sm">
              {/* Camera */}
              <button
                onClick={onCamera}
                className="w-full p-4 glass-panel rounded-xl flex items-center justify-start gap-md hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                </div>
                <span className="font-body-lg text-body-lg text-on-background font-medium">Click Image</span>
              </button>
              {/* Gallery */}
              <button
                onClick={onGallery}
                className="w-full p-4 glass-panel rounded-xl flex items-center justify-start gap-md hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">photo_library</span>
                </div>
                <span className="font-body-lg text-body-lg text-on-background font-medium">Upload from Gallery</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-md p-4 rounded-xl font-body-lg text-body-lg text-on-surface-variant hover:bg-white/5 transition-colors text-center"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
function AnalysisOverlay({ active }) {
  const [currentStep, setCurrentStep] = useState(0);

  useState(() => {
    if (!active) return;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
      if (step >= ANALYSIS_STEPS.length - 1) clearInterval(interval);
    }, 1200);
    return () => clearInterval(interval);
  });

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-xl z-[80] flex flex-col items-center justify-center px-safe-margin"
        >
          {/* Ambient glow */}
          <div className="absolute w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-2xl p-8 w-full max-w-sm relative z-10"
          >
            {/* Spinning icon */}
            <div className="w-20 h-20 rounded-full border-2 border-primary/30 mx-auto mb-lg flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              <span className="material-symbols-outlined text-3xl text-primary">biotech</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-background text-center mb-xs">
              Analysing Product
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-md">
              This takes about 8–10 seconds
            </p>
            <div className="space-y-sm">
              {ANALYSIS_STEPS.map((s, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      done ? 'bg-primary/20 border border-primary/40' :
                      active ? 'border border-primary/40 bg-surface-container' :
                      'border border-white/10 bg-surface-container'
                    }`}>
                      {done ? (
                        <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      ) : active ? (
                        <svg className="animate-spin w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">{s.icon}</span>
                      )}
                    </div>
                    <span className={`font-metric-label text-metric-label ${
                      done ? 'text-primary' : active ? 'text-on-background' : 'text-on-surface-variant/50'
                    }`}>
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const navigate = useNavigate();

  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontBase64, setFrontBase64] = useState(null);
  const [backBase64, setBackBase64] = useState(null);
  const [sheetTarget, setSheetTarget] = useState(null); // 'front' | 'back' | null
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState('');

  const frontCameraRef = useRef();
  const frontGalleryRef = useRef();
  const backCameraRef = useRef();
  const backGalleryRef = useRef();

  function readFile(file, onData) {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];
      onData(dataUrl, base64);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e, target) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (dataUrl, base64) => {
      if (target === 'front') { setFrontPreview(dataUrl); setFrontBase64(base64); }
      else { setBackPreview(dataUrl); setBackBase64(base64); }
    });
    setSheetTarget(null);
    // Reset input so same file can be reselected
    e.target.value = '';
  }

  function openSheet(target) { setSheetTarget(target); }

  function triggerCamera(target) {
    const ref = target === 'front' ? frontCameraRef : backCameraRef;
    ref.current?.click();
  }

  function triggerGallery(target) {
    const ref = target === 'front' ? frontGalleryRef : backGalleryRef;
    ref.current?.click();
  }

  async function handleAnalyse() {
    if (!backBase64) return;
    setError('');
    setAnalysing(true);
    try {
      const res = await scanAPI.analyze({
        backImageBase64: backBase64,
        ...(frontBase64 ? { frontImageBase64: frontBase64 } : {}),
      });
      const data = res.data;
      if (!data.success) {
        setError(data.message || 'Analysis failed. Please try again.');
        return;
      }
      navigate(`/results/${data.scanId}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setAnalysing(false);
    }
  }

  const sheetLabel = sheetTarget === 'front' ? 'Upload Front Label' : 'Upload Ingredients';

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col font-body-md overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Hidden file inputs */}
      <input ref={frontCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, 'front')} />
      <input ref={frontGalleryRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'front')} />
      <input ref={backCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, 'back')} />
      <input ref={backGalleryRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'back')} />

      {/* Analysis loading */}
      <AnalysisOverlay active={analysing} />

      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[60] flex items-center justify-between px-safe-margin h-16 w-full">
        <button
          onClick={() => navigate('/')}
          className="hover:bg-white/5 p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">DeCode.it</div>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 px-safe-margin py-lg pb-[100px] w-full max-w-[1200px] mx-auto md:pl-[120px] lg:pl-[140px] flex flex-col gap-lg">
        <div className="text-center md:text-left mb-4">
          <h1 className="font-headline-lg text-[32px] md:text-[44px] text-on-background mb-base text-balance tracking-tight">Analyse Product</h1>
          <p className="font-body-md md:text-[18px] text-on-surface-variant">
            Upload images to decode ingredients and health impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-xl">

        {/* Back of Pack */}
        <ImageSlot
          label="Ingredients / Back"
          badge="Required"
          badgeColor="text-primary"
          icon="receipt_long"
          required
          preview={backPreview}
          onOpen={() => openSheet('back')}
          onRemove={() => { setBackPreview(null); setBackBase64(null); }}
        />

        {/* Front of Pack */}
        <ImageSlot
          label="Front of Pack"
          badge="Optional"
          badgeColor="text-on-surface-variant"
          icon="package"
          required={false}
          preview={frontPreview}
          onOpen={() => openSheet('front')}
          onRemove={() => { setFrontPreview(null); setFrontBase64(null); }}
        />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error font-body-md"
            >
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyse Button */}
        <div className="mt-auto flex flex-col items-center gap-sm">
          <motion.button
            disabled={!backBase64}
            onClick={handleAnalyse}
            whileTap={{ scale: backBase64 ? 0.97 : 1 }}
            className={`w-full max-w-md py-4 rounded-xl font-headline-md text-[18px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              backBase64
                ? 'bg-gradient-to-r from-primary to-primary-fixed-dim text-on-primary-fixed shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:shadow-[0_0_30px_rgba(78,222,163,0.5)] cursor-pointer'
                : 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70'
            }`}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Analyse Product
          </motion.button>
          {!backBase64 && (
            <p className="font-label-caps text-label-caps text-on-surface-variant text-center">
              Requires Ingredients (Back) image
            </p>
          )}
        </div>
      </main>

      {/* Action Sheet */}
      <ActionSheet
        open={!!sheetTarget}
        title={sheetLabel}
        onClose={() => setSheetTarget(null)}
        onCamera={() => { setSheetTarget(null); setTimeout(() => triggerCamera(sheetTarget), 200); }}
        onGallery={() => { setSheetTarget(null); setTimeout(() => triggerGallery(sheetTarget), 200); }}
      />

      <BottomNavBar />
    </div>
  );
}
