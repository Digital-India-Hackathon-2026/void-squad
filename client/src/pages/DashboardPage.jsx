import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scanAPI, profileAPI } from '../api/index.js';
import BottomNavBar from '../components/shared/BottomNavBar';

const RISK_CONFIG = {
  Low: { color: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/30', label: 'Safe' },
  Moderate: { color: 'text-secondary', bg: 'bg-secondary/15', border: 'border-secondary/30', label: 'Moderate' },
  High: { color: 'text-error', bg: 'bg-error/15', border: 'border-error/30', label: 'High Risk' },
};

function RiskMini({ score, band }) {
  const cfg = RISK_CONFIG[band] || RISK_CONFIG.Low;
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (Math.min(score ?? 0, 100) / 100) * circumference;
  const strokeColor = band === 'High' ? '#ffb4ab' : band === 'Moderate' ? '#ffb95f' : '#4edea3';
  return (
    <div className="flex items-center gap-3">
      <div className={`px-2 py-0.5 rounded-md ${cfg.bg} border ${cfg.border}`}>
        <span className={`font-label-caps text-label-caps ${cfg.color}`}>{cfg.label}</span>
      </div>
      <div className="relative w-8 h-8">
        <svg className="w-full h-full" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="14" fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 16 16)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-label-caps text-[9px] text-on-background">
          {score ?? '—'}
        </span>
      </div>
    </div>
  );
}

function ScanHistoryItem({ scan, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className="level-1-surface rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-white/10">
          <span className="material-symbols-outlined text-on-surface-variant">restaurant</span>
        </div>
        <div>
          <div className="font-body-md text-body-md text-on-background font-medium line-clamp-1">
            {scan.productName || 'Unknown Product'}
          </div>
          <div className="font-metric-label text-metric-label text-on-surface-variant mt-0.5">
            {scan.brand ? `${scan.brand} · ` : ''}
            {new Date(scan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>
      <RiskMini score={scan.riskScore} band={scan.riskBand} />
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [profileExists, setProfileExists] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;
    let mounted = true;
    async function load() {
      try {
        const [histRes, profRes] = await Promise.allSettled([
          scanAPI.history(user.userId),
          profileAPI.get(user.userId),
        ]);
        if (!mounted) return;
        if (histRes.status === 'fulfilled') {
          setHistory(histRes.value.data?.scans ?? []);
        }
        if (profRes.status === 'fulfilled') {
          setProfileExists(!!profRes.value.data?.profile);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user?.userId]);

  const greeting = user?.name ? `Hello, ${user.name.split(' ')[0]}!` : 'Hello!';

  return (
    <div className="bg-background min-h-dvh flex flex-col font-body-md overflow-x-hidden pb-24 md:pb-0">
      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-[60] flex items-center justify-between px-safe-margin h-16 w-full">
        <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
          DeCode.it
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="text-on-surface-variant hover:text-error hover:bg-white/5 p-2 rounded-full transition-colors"
            aria-label="Sign out"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-safe-margin pt-md pb-xl max-w-2xl mx-auto w-full">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-center mb-lg"
        >
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">{greeting}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Ready to decode your food today?
            </p>
          </div>
        </motion.div>

        {/* Profile incomplete warning */}
        <AnimatePresence>
          {profileExists === false && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-md glass-panel rounded-xl p-4 flex items-center gap-3 border border-secondary/30 bg-secondary/5"
            >
              <span className="material-symbols-outlined text-secondary">warning</span>
              <div className="flex-1">
                <p className="font-metric-label text-metric-label text-on-background">
                  Complete your health profile for personalised results
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="text-secondary font-label-caps text-label-caps underline"
              >
                Set Up
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bento Action Cards */}
        <div className="grid grid-cols-2 gap-md mb-xl">
          {/* Scan Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/scan')}
            className="glass-panel rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between min-h-[180px] cursor-pointer group"
          >
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-[40px] group-hover:bg-primary/30 transition-all duration-700" />
            <div className="relative z-10 flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center neon-glow-primary border border-primary/30">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>document_scanner</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20">
                <span className="font-label-caps text-label-caps text-primary tracking-wider">NEW</span>
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <h2 className="font-headline-md text-headline-md text-on-background mb-0.5">Scan a Product</h2>
              <p className="font-body-md text-[13px] text-on-surface-variant">Analyze instantly</p>
            </div>
          </motion.div>

          {/* Health Profile Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/profile')}
            className="glass-panel rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between min-h-[180px] cursor-pointer group"
          >
            {/* Profile completion ring */}
            <div className="absolute top-0 right-0 p-4 z-10">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" fill="none" r="40"
                    stroke={profileExists ? '#4edea3' : '#ffb95f'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={profileExists ? '0' : '62.8'}
                    style={{ filter: `drop-shadow(0 0 4px ${profileExists ? 'rgba(78,222,163,0.5)' : 'rgba(255,185,95,0.5)'})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-metric-label text-metric-label text-on-background text-xs">
                    {profileExists ? '100%' : '75%'}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-start">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10">
                <span className="material-symbols-outlined text-secondary text-2xl">monitor_heart</span>
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <h2 className="font-headline-md text-headline-md text-on-background mb-0.5">Health Profile</h2>
              <p className="font-body-md text-[13px] text-on-surface-variant">
                {profileExists ? 'Edit preferences' : 'Setup required'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Recent Scans */}
        <div>
          <div className="flex justify-between items-center mb-sm">
            <h3 className="font-headline-md text-headline-md text-on-background">Recent Scans</h3>
          </div>

          {loading ? (
            <div className="space-y-xs">
              {[1, 2, 3].map(i => (
                <div key={i} className="level-1-surface rounded-xl p-4 animate-pulse h-[72px]" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl p-8 flex flex-col items-center gap-3 text-center"
            >
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">document_scanner</span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                No scans yet. Scan a product to get started!
              </p>
              <button
                onClick={() => navigate('/scan')}
                className="btn-primary-glow px-6 py-2 rounded-xl font-metric-label text-metric-label mt-1"
              >
                Scan Now
              </button>
            </motion.div>
          ) : (
            <div className="space-y-xs">
              {history.slice(0, 5).map((scan, i) => (
                <ScanHistoryItem
                  key={scan.scanId}
                  scan={scan}
                  index={i}
                  onClick={() => navigate(`/results/${scan.scanId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
