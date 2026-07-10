require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedRules = require('./services/seeder');

// Route imports
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const scanRoutes = require('./routes/scan');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Startup env validation ───────────────────────────────────────────────────
function requireEnv(name, { minLength } = {}) {
  const v = process.env[name];
  if (!v || v.startsWith('REPLACE')) {
    console.error(`❌ Missing or placeholder value for ${name}. Set it in .env.`);
    process.exit(1);
  }
  if (minLength && v.length < minLength) {
    console.error(`❌ ${name} must be at least ${minLength} characters.`);
    process.exit(1);
  }
}
requireEnv('MONGODB_URI');
requireEnv('JWT_SECRET', { minLength: 32 });
// GEMINI_API_KEY is allowed to be unset at boot — auth.js routes will return a structured failure,
// but logs at startup make misconfiguration discoverable before traffic arrives.
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('REPLACE')) {
  console.warn('⚠️  GEMINI_API_KEY not set — /api/scan will return structured failures until configured.');
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  // In production the user did not give us an explicit origin list — omit rather than disable
  // so same-origin/curl/cron requests still work; CORS header is then not added cross-origin.
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' })); // large for base64 images
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/scan', scanRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  await seedRules(); // seed FSSAI rules on startup if empty
  app.listen(PORT, () => {
    console.log(`✅ DeCode.it server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
