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

const FREE_M3_BREED_TOKENS = new Set([
  'alpina_generica',
  'alpine_generica',
  'saanen_generica',
  'criolla_colombiana',
  'criolla_peruana',
  'nigerian_dwarf',
]);

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function isFreeCatalogBreed(row) {
  const nameToken = normalizeToken(row?.name);

  if (FREE_M3_BREED_TOKENS.has(nameToken)) {
    return true;
  }

  const alpinaGenerica =
    (nameToken.includes('alpina') || nameToken.includes('alpine')) && nameToken.includes('generica');
  const saanenGenerica = nameToken.includes('saanen') && nameToken.includes('generica');
  const criollaColombiana = nameToken.includes('criolla') && nameToken.includes('colombiana');
  const criollaPeruana = nameToken.includes('criolla') && nameToken.includes('peruana');
  const nigerianDwarf = nameToken.includes('nigerian') && nameToken.includes('dwarf');

  return alpinaGenerica || saanenGenerica || criollaColombiana || criollaPeruana || nigerianDwarf;
}

/**
 * FREE catalog: return full breed row so the client can run the same M4 engine
 * for scenario S1 (Solo leche) only — same inputs as PRO for that scenario.
 */
function buildFreeBreedPayload(row) {
  return { ...row };
}

async function getIsPro(userId) {
  return hasFeatureAccess(userId, 'advanced_calculations');
}

function proRequiredResponse(res) {
  return res.status(403).json({
    error: 'Feature access required',
    message: 'Este analisis completo es exclusivo para usuarios PRO.',
    feature: 'advanced_calculations',
    upgrade_required: true,
  });
}

// GET /api/m4/breeds
router.get('/breeds', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds ORDER BY lifetime_cheese_kg DESC');
    const isPro = await getIsPro(req.user.userId);

    if (isPro) {
      return res.json({
        breeds: rows,
        isPro: true,
        fullCatalog: true,
      });
    }

    const freeBreeds = rows.filter(isFreeCatalogBreed).map(buildFreeBreedPayload);

    return res.json({
      breeds: freeBreeds,
      isPro: false,
      fullCatalog: false,
    });
  } catch (error) {
    console.error('M4 breeds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/m4/breeds/:id
router.get('/breeds/:id', async (req, res) => {
  try {
    const isPro = await getIsPro(req.user.userId);
    if (!isPro) return proRequiredResponse(res);

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const breed = rows[0];
    const result = calculateM4(breed);

    res.json({ breed, result, isPro: true });
  } catch (error) {
    console.error('M4 breed detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/m4/calculate
router.post('/calculate', async (req, res) => {
  try {
    const isPro = await getIsPro(req.user.userId);
    if (!isPro) return proRequiredResponse(res);

    const { breed_id, overrides } = req.body;
    if (!breed_id) return res.status(400).json({ error: 'breed_id is required' });

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [breed_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const result = calculateM4(rows[0], overrides || {});
    res.json({ result, isPro: true });
  } catch (error) {
    console.error('M4 calculate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/m4/ranking/cheese
router.get('/ranking/cheese', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, name, lifetime_cheese_kg, cheese_yield_liters_per_kg FROM m4_breeds ORDER BY lifetime_cheese_kg DESC',
    );

    const isPro = await getIsPro(req.user.userId);
    const ranking = isPro ? rows : rows.filter(isFreeCatalogBreed);

    res.json({ ranking, total: rows.length, isPro });
  } catch (error) {
    console.error('M4 cheese ranking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/m4/profile/:id
router.get('/profile/:id', async (req, res) => {
  try {
    const isPro = await getIsPro(req.user.userId);
    if (!isPro) return proRequiredResponse(res);

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM m4_breeds WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Breed not found' });

    const breed = rows[0];
    const result = calculateM4(breed);

    res.json({ breed, result, isPro: true });
  } catch (error) {
    console.error('M4 profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
