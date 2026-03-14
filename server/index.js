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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

function getAllowedOrigins() {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return [...new Set([
    process.env.APP_URL?.trim(),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean))];
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
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
