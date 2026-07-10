import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { authAPI } from '../api/index.js';
import { useAuth } from '../context/AuthContext';

// ─── Validation helpers ───────────────────────────────────────────────────────

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const validateLogin = ({ email, password }) => {
  if (!email.trim()) return 'Email is required.';
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

const validateSignup = ({ name, email, password }) => {
  if (!email.trim()) return 'Email is required.';
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InputField = ({ id, label, type = 'text', value, onChange, placeholder, icon: Icon, rightElement }) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-sm font-medium text-gray-400 tracking-wide"
    >
      {label}
    </label>
    <motion.div
      className="relative"
      whileFocus={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Glow wrapper reacts to focus inside */}
      <FocusGlowWrapper>
        <div className="relative flex items-center">
          {Icon && (
            <Icon
              size={16}
              className="absolute left-3.5 text-gray-500 pointer-events-none z-10"
            />
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={id}
            className="input-field w-full pl-10 pr-10 py-3 bg-bg-secondary border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-primary/60 transition-colors duration-200"
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center z-10">
              {rightElement}
            </div>
          )}
        </div>
      </FocusGlowWrapper>
    </motion.div>
  </div>
);

// Wraps children; on internal focus applies a glow ring via a motion div
const FocusGlowWrapper = ({ children }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      className="relative rounded-xl"
    >
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={
          focused
            ? { boxShadow: '0 0 0 2px rgba(99,102,241,0.45), 0 0 18px 2px rgba(99,102,241,0.18)' }
            : { boxShadow: '0 0 0 0px rgba(99,102,241,0)' }
        }
        transition={{ duration: 0.22 }}
      />
      {children}
    </div>
  );
};

const ErrorBanner = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        key="error-banner"
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mt-1">
          <AlertCircle size={15} className="shrink-0" />
          <span>{message}</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Main AuthPage ────────────────────────────────────────────────────────────

const TABS = ['login', 'signup'];

export default function AuthPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Switch tab and clear state
  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Inline validation
    const validationError =
      activeTab === 'login'
        ? validateLogin({ email, password })
        : validateSignup({ name, email, password });

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      let userData, token;

      if (activeTab === 'login') {
        const response = await authAPI.login({ email: email.trim(), password });
        userData = response.data?.user ?? response.user;
        token = response.data?.token ?? response.token;
      } else {
        const payload = { email: email.trim(), password };
        if (name.trim()) payload.name = name.trim();
        const response = await authAPI.signup(payload);
        userData = response.data?.user ?? response.user;
        token = response.data?.token ?? response.token;
      }

      authLogin(userData, token);
      navigate('/');
    } catch (err) {
      // Surface server error message when available
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (serverMsg?.toLowerCase().includes('password')) {
        setError('Incorrect password. Please try again.');
      } else if (serverMsg?.toLowerCase().includes('email') || serverMsg?.toLowerCase().includes('user')) {
        setError('No account found with that email address.');
      } else {
        setError(serverMsg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = activeTab === 'login';

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 py-12">

      {/* ── Background ambient blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-3xl" />
      </div>

      {/* ── Brand ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-10 flex flex-col items-center gap-2 z-10"
      >
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-1">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="3" y="8" width="22" height="14" rx="3" stroke="white" strokeWidth="2" />
            <path d="M8 8V6a6 6 0 0 1 12 0v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="15" r="2.5" fill="white" />
            <path d="M14 17.5v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          De<span className="text-indigo-400">Code</span>.it
        </h1>
        <p className="text-sm text-gray-500 tracking-wider uppercase font-medium">
          Decode What You Eat
        </p>
      </motion.div>

      {/* ── Glass card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
        className="glass-card relative w-full max-w-md rounded-2xl border border-white/10 bg-bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-10"
      >
        {/* ── Tab switcher ── */}
        <div className="relative flex border-b border-white/8 bg-bg-secondary/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={`relative flex-1 py-4 text-sm font-semibold capitalize tracking-wide transition-colors duration-200 z-10 ${
                activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab === 'login' ? 'Log In' : 'Sign Up'}
              {/* Active tab indicator */}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Form ── */}
        <div className="px-6 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.form
              key={activeTab}
              initial={{ opacity: 0, x: isLogin ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 16 : -16 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              {/* Error banner */}
              <ErrorBanner message={error} />

              {/* Name field — signup only */}
              {!isLogin && (
                <InputField
                  id="name"
                  label="Name (optional)"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  icon={User}
                />
              )}

              {/* Email */}
              <InputField
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={Mail}
              />

              {/* Password */}
              <InputField
                id={isLogin ? 'current-password' : 'new-password'}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Enter your password' : 'Create a password (min. 6 chars)'}
                icon={Lock}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {/* Forgot password hint — login only */}
              {isLogin && (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    onClick={() => {
                      /* TODO: implement forgot password */
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="btn-primary relative mt-1 flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-700/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>{isLogin ? 'Logging in…' : 'Creating account…'}</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Log In' : 'Create Account'}</span>
                )}
              </motion.button>

              {/* Switch tab hint */}
              <p className="text-center text-xs text-gray-500 mt-1">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('signup')}
                      className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      Sign up free
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('login')}
                      className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Footer ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-8 text-xs text-gray-600 text-center z-10"
      >
        By continuing, you agree to our{' '}
        <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
        {' '}and{' '}
        <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>.
      </motion.p>
    </div>
  );
}
