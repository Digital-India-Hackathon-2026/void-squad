import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' });

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(signupForm.name, signupForm.email, signupForm.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t) {
    setError('');
    setTab(t);
  }

  return (
    <div className="bg-background min-h-dvh flex items-center justify-center relative overflow-hidden px-safe-margin font-body-md">
      {/* Ambient grid */}
      <div className="ambient-grid" />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-gradient-radial from-primary/5 to-transparent pointer-events-none z-0" />

      <main className="w-full max-w-[420px] z-10">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-lg"
        >
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>biotech</span>
            DeCode.it
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Quantify your optimal self.</p>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-2xl p-md shadow-2xl relative overflow-hidden"
        >
          {/* Gradient top edge */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Tab Navigation */}
          <div className="flex mb-lg border-b border-white/10">
            {['login', 'signup'].map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-xs pb-2 font-label-caps text-label-caps border-b-2 transition-all duration-300 ${
                  tab === t
                    ? 'text-primary border-primary'
                    : 'text-on-surface-variant border-transparent hover:text-on-background'
                }`}
              >
                {t === 'login' ? 'LOGIN' : 'SIGN UP'}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-md"
              >
                <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-3 py-2 text-error font-body-md text-[14px]">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLogin}
                className="space-y-md"
              >
                <div className="space-y-sm">
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase tracking-wide" htmlFor="login-email">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={loginForm.email}
                        onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@domain.com"
                        className="glass-input"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-xs">
                      <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wide" htmlFor="login-password">Password</label>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                      <input
                        id="login-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={loginForm.password}
                        onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="glass-input"
                      />
                    </div>
                  </div>
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary-glow w-full py-3 rounded-xl font-headline-md text-[16px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authenticating...
                    </>
                  ) : 'Authenticate'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignup}
                className="space-y-md"
              >
                <div className="space-y-sm">
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase tracking-wide" htmlFor="signup-name">Full Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">person</span>
                      <input
                        id="signup-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={signupForm.name}
                        onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Jane Doe"
                        className="glass-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase tracking-wide" htmlFor="signup-email">Email Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={signupForm.email}
                        onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@domain.com"
                        className="glass-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase tracking-wide" htmlFor="signup-password">Create Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                      <input
                        id="signup-password"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={signupForm.password}
                        onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="glass-input"
                      />
                    </div>
                  </div>
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary-glow w-full py-3 rounded-xl font-headline-md text-[16px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Initializing...
                    </>
                  ) : 'Initialize Profile'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-md text-center">
            <p className="font-label-caps text-[11px] text-on-surface-variant/50">
              By proceeding, you agree to our{' '}
              <span className="text-primary cursor-pointer hover:underline">Terms</span> &{' '}
              <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
