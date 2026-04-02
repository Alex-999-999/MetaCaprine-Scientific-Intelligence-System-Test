import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import scenarioRoutes from './routes/scenarios.js';
import moduleRoutes from './routes/modules.js';
import breedRoutes from './routes/breeds.js';
import module3Routes from './routes/module3.js';
import billingRoutes, { handleStripeWebhook } from './routes/billing.js';
import m4Routes from './routes/m4.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

function normalizeOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return '';
  if (raw === '*') return '*';

  // Remove wrapping quotes from env values like:
  // "https://app.example.com" or 'https://app.example.com'
  const unquoted = raw.replace(/^['"]|['"]$/g, '');

  // Keep wildcard marker, but normalize protocol and trailing slash.
  if (unquoted.includes('*')) {
    const wildcardWithProtocol = unquoted.includes('://') ? unquoted : `https://${unquoted}`;
    return wildcardWithProtocol.replace(/\/+$/, '');
  }

  // Accept full URLs with paths and keep only protocol + host.
  try {
    const withProtocol = unquoted.includes('://') ? unquoted : `https://${unquoted}`;
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, '');
  } catch {
    return unquoted.replace(/\/+$/, '');
  }
}

function matchesWildcardOrigin(origin, pattern) {
  // Supported wildcard format: https://*.example.com
  if (!pattern.includes('*')) return false;

  try {
    const originUrl = new URL(origin);
    const patternUrl = new URL(pattern.replace('*.', 'wildcard.'));
    const wildcardHost = patternUrl.hostname.replace(/^wildcard\./, '');
    return (
      originUrl.protocol === patternUrl.protocol &&
      (originUrl.hostname === wildcardHost || originUrl.hostname.endsWith(`.${wildcardHost}`))
    );
  } catch {
    return false;
  }
}

function isVercelAppOrigin(origin) {
  try {
    const normalized = normalizeOrigin(origin);
    if (!normalized || normalized === '*') return false;
    const hostname = new URL(normalized).hostname.toLowerCase();
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function getAllowedOrigins() {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const defaults = [
    normalizeOrigin(process.env.APP_URL),
    normalizeOrigin(process.env.VERCEL_URL),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].map((origin) => normalizeOrigin(origin)).filter(Boolean);

  // Merge configured + defaults to avoid lockout when a whitelist is incomplete.
  // This is especially important on Vercel preview URLs where origin can vary.
  return [...new Set([...configured, ...defaults])];
}

const allowedOrigins = getAllowedOrigins();
const isOriginAllowed = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;

  // On Vercel, allow Vercel-hosted frontend origins to avoid preview-domain lockouts.
  if (process.env.VERCEL === '1' && isVercelAppOrigin(normalized)) {
    return true;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin.includes('*')) return matchesWildcardOrigin(normalized, allowedOrigin);
    return normalizeOrigin(allowedOrigin) === normalized;
  });
};

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    console.warn('CORS rejected origin:', origin, 'Allowed origins:', allowedOrigins);
    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
}));

// Stripe requires the raw request body for webhook signature verification.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Routes (database will be initialized lazily when needed)
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/module3', module3Routes);
app.use('/api/billing', billingRoutes);
app.use('/api/m4', m4Routes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      return res.json({
        status: 'ok',
        message: 'MVP Web API is running',
        database: 'not configured',
        warning: 'DATABASE_URL environment variable is not set',
      });
    }

    const pool = createPool();
    if (!pool) {
      return res.json({
        status: 'ok',
        message: 'MVP Web API is running',
        database: 'not configured',
        warning: 'Database pool could not be created',
      });
    }
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      message: 'MVP Web API is running',
      database: 'connected',
    });
  } catch (error) {
    res.json({
      status: 'ok',
      message: 'MVP Web API is running',
      database: 'disconnected',
      error: error.message,
      hint: 'Check your DATABASE_URL environment variable in Vercel',
    });
  }
});

app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    url: req.url,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
