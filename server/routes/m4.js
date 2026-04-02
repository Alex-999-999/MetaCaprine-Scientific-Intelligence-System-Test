import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireEmailVerification } from '../middleware/requireEmailVerification.js';
import { hasFeatureAccess } from '../services/planService.js';
import { calculateM4 } from '../core/m4Engine.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['free', 'pro', 'admin']));
router.use(requireEmailVerification);

const FREE_BREED_LIMIT = 6;

// ── GET /api/m4/breeds — catalogue (free gets first N, pro gets all) ───────
router.get('/breeds', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM m4_breeds ORDER BY lifetime_cheese_kg DESC'
    );

    const isPro = await hasFeatureAccess(req.user.userId, 'advanced_calculations');

    const breeds = isPro
      ? rows
      : rows.map((b, i) => (i < FREE_BREED_LIMIT ? b : { id: b.id, name: b.name, locked: true }));

    res.json({ breeds, isPro });
  } catch (error) {
    console.error('M4 breeds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/m4/breeds/:id — single breed with full calculations ───────────
router.get('/breeds/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const breed = rows[0];
    const result = calculateM4(breed);
    const isPro = await hasFeatureAccess(req.user.userId, 'advanced_calculations');

    res.json({ breed, result, isPro });
  } catch (error) {
    console.error('M4 breed detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/m4/calculate — ad-hoc calculation with optional overrides ────
router.post('/calculate', async (req, res) => {
  try {
    const { breed_id, overrides } = req.body;
    if (!breed_id) return res.status(400).json({ error: 'breed_id is required' });

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [breed_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const isPro = await hasFeatureAccess(req.user.userId, 'advanced_calculations');

    if (!isPro && overrides && Object.keys(overrides).length > 0) {
      return res.status(403).json({
        error: 'Feature access required',
        message: 'La edicion de parametros es exclusiva para usuarios PRO.',
        upgrade_required: true,
      });
    }

    const result = calculateM4(rows[0], overrides || {});
    res.json({ result, isPro });
  } catch (error) {
    console.error('M4 calculate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/m4/ranking/cheese — cheese ranking (free = top 3) ─────────────
router.get('/ranking/cheese', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, name, lifetime_cheese_kg FROM m4_breeds ORDER BY lifetime_cheese_kg DESC'
    );

    const isPro = await hasFeatureAccess(req.user.userId, 'advanced_calculations');
    const ranking = isPro ? rows : rows.slice(0, 3);

    res.json({ ranking, total: rows.length, isPro });
  } catch (error) {
    console.error('M4 cheese ranking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/m4/profile/:id — economic profile for one breed ───────────────
router.get('/profile/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const breed = rows[0];
    const result = calculateM4(breed);
    const isPro = await hasFeatureAccess(req.user.userId, 'advanced_calculations');

    res.json({ breed, result, isPro });
  } catch (error) {
    console.error('M4 profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
