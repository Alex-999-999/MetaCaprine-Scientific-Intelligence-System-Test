import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireEmailVerification } from '../middleware/requireEmailVerification.js';
import { hasFeatureAccess } from '../services/planService.js';

const router = express.Router();

const AUDIENCES = new Set(['productor_actual', 'nuevo_inversionista', 'ambos']);
const CONTENT_TYPES = new Set(['video_hook', 'video_pro', 'articulo', 'concepto_libro', 'caso_real']);
const ACCESS_LEVELS = new Set(['free', 'pro', 'elite']);
const RELATED_MODULES = new Set(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'none']);

router.use(authenticateToken);
router.use(requireRole(['free', 'pro', 'elite', 'admin']));
router.use(requireEmailVerification);

function normalizeRoleName(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return 'free';
  if (raw === 'pro_user' || raw === 'premium' || raw === 'pro-user') return 'pro';
  return raw;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function asNullableText(value) {
  if (value == null) return null;
  const clean = String(value).trim();
  return clean.length ? clean : null;
}

function asInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableInteger(value) {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getUserRole(pool, userId) {
  const result = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     LIMIT 1`,
    [userId],
  );
  return normalizeRoleName(result.rows[0]?.name || 'free');
}

async function getAccessProfile(pool, userId) {
  const role = await getUserRole(pool, userId);
  const isAdmin = role === 'admin';
  const isEliteRole = role === 'elite';
  const isProRole = role === 'pro';

  const hasAdvancedFeature = await hasFeatureAccess(userId, 'advanced_calculations');
  const hasModule7Feature = await hasFeatureAccess(userId, 'module7');
  const hasEliteFeature = await hasFeatureAccess(userId, 'module7_elite');

  const hasProAccess = isAdmin || isEliteRole || isProRole || hasAdvancedFeature || hasModule7Feature;
  const hasEliteAccess = isAdmin || isEliteRole || hasEliteFeature;

  return {
    role,
    isAdmin,
    hasProAccess,
    hasEliteAccess,
  };
}

function canAccessContent(accessProfile, accessLevel) {
  const level = String(accessLevel || 'free').toLowerCase();
  if (level === 'free') return true;
  if (level === 'pro') return accessProfile.hasProAccess;
  if (level === 'elite') return accessProfile.hasEliteAccess;
  return false;
}

function validateContentPayload(payload, { partial = false } = {}) {
  const requiredFields = ['title', 'audience', 'content_type', 'access_level'];
  const errors = [];

  if (!partial) {
    requiredFields.forEach((field) => {
      const value = asNullableText(payload[field]);
      if (!value) errors.push(`${field} is required`);
    });
  }

  const audience = asNullableText(payload.audience);
  if (audience && !AUDIENCES.has(audience)) errors.push('Invalid audience value');

  const contentType = asNullableText(payload.content_type);
  if (contentType && !CONTENT_TYPES.has(contentType)) errors.push('Invalid content_type value');

  const accessLevel = asNullableText(payload.access_level);
  if (accessLevel && !ACCESS_LEVELS.has(accessLevel)) errors.push('Invalid access_level value');

  const relatedModule = asNullableText(payload.related_module) || 'none';
  if (relatedModule && !RELATED_MODULES.has(relatedModule)) errors.push('Invalid related_module value');

  const completeNormalized = {
    title: asNullableText(payload.title),
    subtitle: asNullableText(payload.subtitle),
    summary: asNullableText(payload.summary),
    business_impact: asNullableText(payload.business_impact),
    audience: audience || 'ambos',
    content_type: contentType || 'video_hook',
    access_level: accessLevel || 'free',
    video_url: asNullableText(payload.video_url),
    thumbnail_url: asNullableText(payload.thumbnail_url),
    article_url: asNullableText(payload.article_url),
    duration_seconds: asNullableInteger(payload.duration_seconds),
    related_module: relatedModule || 'none',
    cta_text: asNullableText(payload.cta_text),
    cta_url: asNullableText(payload.cta_url),
    sort_order: asInteger(payload.sort_order, 0),
    is_active: parseBoolean(payload.is_active, true),
  };

  if (partial) {
    const has = (field) => Object.prototype.hasOwnProperty.call(payload, field);
    const partialNormalized = {};

    if (has('title')) partialNormalized.title = asNullableText(payload.title);
    if (has('subtitle')) partialNormalized.subtitle = asNullableText(payload.subtitle);
    if (has('summary')) partialNormalized.summary = asNullableText(payload.summary);
    if (has('business_impact')) partialNormalized.business_impact = asNullableText(payload.business_impact);
    if (has('audience')) partialNormalized.audience = audience || null;
    if (has('content_type')) partialNormalized.content_type = contentType || null;
    if (has('access_level')) partialNormalized.access_level = accessLevel || null;
    if (has('video_url')) partialNormalized.video_url = asNullableText(payload.video_url);
    if (has('thumbnail_url')) partialNormalized.thumbnail_url = asNullableText(payload.thumbnail_url);
    if (has('article_url')) partialNormalized.article_url = asNullableText(payload.article_url);
    if (has('duration_seconds')) partialNormalized.duration_seconds = asNullableInteger(payload.duration_seconds);
    if (has('related_module')) partialNormalized.related_module = relatedModule || 'none';
    if (has('cta_text')) partialNormalized.cta_text = asNullableText(payload.cta_text);
    if (has('cta_url')) partialNormalized.cta_url = asNullableText(payload.cta_url);
    if (has('sort_order')) partialNormalized.sort_order = asInteger(payload.sort_order, 0);
    if (has('is_active')) partialNormalized.is_active = parseBoolean(payload.is_active, true);

    return { errors, normalized: partialNormalized };
  }

  return {
    errors,
    normalized: completeNormalized,
  };
}

router.get('/content', async (req, res) => {
  try {
    const pool = getPool();
    const access = await getAccessProfile(pool, req.user.userId);
    const includeInactive = access.isAdmin && parseBoolean(req.query.include_inactive, false);
    const audience = asNullableText(req.query.audience);

    if (audience && !AUDIENCES.has(audience)) {
      return res.status(400).json({ error: 'Invalid audience filter' });
    }

    const params = [];
    const where = [];

    if (!includeInactive) {
      where.push('is_active = true');
    }

    if (audience) {
      params.push(audience);
      where.push(`(audience = $${params.length} OR audience = 'ambos')`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const query = `
      SELECT
        id,
        title,
        subtitle,
        summary,
        business_impact,
        audience,
        content_type,
        access_level,
        video_url,
        thumbnail_url,
        article_url,
        duration_seconds,
        related_module,
        cta_text,
        cta_url,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM m7_content
      ${whereClause}
      ORDER BY sort_order ASC, created_at ASC
    `;

    const { rows } = await pool.query(query, params);
    const content = rows.map((row) => ({
      ...row,
      locked: !canAccessContent(access, row.access_level),
    }));

    res.json({
      content,
      access: {
        role: access.role,
        is_admin: access.isAdmin,
        pro: access.hasProAccess,
        elite: access.hasEliteAccess,
      },
    });
  } catch (error) {
    console.error('M7 list content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/content/:id', async (req, res) => {
  try {
    const pool = getPool();
    const access = await getAccessProfile(pool, req.user.userId);
    const { rows } = await pool.query(
      `SELECT
        id,
        title,
        subtitle,
        summary,
        business_impact,
        audience,
        content_type,
        access_level,
        video_url,
        thumbnail_url,
        article_url,
        duration_seconds,
        related_module,
        cta_text,
        cta_url,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM m7_content
      WHERE id = $1
      LIMIT 1`,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = rows[0];
    if (!content.is_active && !access.isAdmin) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const allowed = canAccessContent(access, content.access_level);
    if (!allowed) {
      return res.status(403).json({
        error: 'Feature access required',
        message: 'Este contenido pertenece a MetaCaprine PRO.',
        access_level: content.access_level,
      });
    }

    res.json({ content });
  } catch (error) {
    console.error('M7 content detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/content', async (req, res) => {
  try {
    const pool = getPool();
    const access = await getAccessProfile(pool, req.user.userId);
    if (!access.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { errors, normalized } = validateContentPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const { rows } = await pool.query(
      `INSERT INTO m7_content (
        title, subtitle, summary, business_impact,
        audience, content_type, access_level,
        video_url, thumbnail_url, article_url,
        duration_seconds, related_module, cta_text, cta_url,
        sort_order, is_active
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16
      )
      RETURNING *`,
      [
        normalized.title,
        normalized.subtitle,
        normalized.summary,
        normalized.business_impact,
        normalized.audience,
        normalized.content_type,
        normalized.access_level,
        normalized.video_url,
        normalized.thumbnail_url,
        normalized.article_url,
        normalized.duration_seconds,
        normalized.related_module,
        normalized.cta_text,
        normalized.cta_url,
        normalized.sort_order,
        normalized.is_active,
      ],
    );

    res.status(201).json({ content: rows[0] });
  } catch (error) {
    console.error('M7 create content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/content/:id', async (req, res) => {
  try {
    const pool = getPool();
    const access = await getAccessProfile(pool, req.user.userId);
    if (!access.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { errors, normalized } = validateContentPayload(req.body || {}, { partial: true });
    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const { rows: existingRows } = await pool.query('SELECT * FROM m7_content WHERE id = $1 LIMIT 1', [req.params.id]);
    if (!existingRows.length) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const current = existingRows[0];
    const merged = {
      ...current,
      ...Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)),
    };

    const { rows } = await pool.query(
      `UPDATE m7_content
       SET
         title = $1,
         subtitle = $2,
         summary = $3,
         business_impact = $4,
         audience = $5,
         content_type = $6,
         access_level = $7,
         video_url = $8,
         thumbnail_url = $9,
         article_url = $10,
         duration_seconds = $11,
         related_module = $12,
         cta_text = $13,
         cta_url = $14,
         sort_order = $15,
         is_active = $16,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [
        merged.title,
        merged.subtitle,
        merged.summary,
        merged.business_impact,
        merged.audience,
        merged.content_type,
        merged.access_level,
        merged.video_url,
        merged.thumbnail_url,
        merged.article_url,
        merged.duration_seconds,
        merged.related_module,
        merged.cta_text,
        merged.cta_url,
        merged.sort_order,
        merged.is_active,
        req.params.id,
      ],
    );

    res.json({ content: rows[0] });
  } catch (error) {
    console.error('M7 update content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/content/:id', async (req, res) => {
  try {
    const pool = getPool();
    const access = await getAccessProfile(pool, req.user.userId);
    if (!access.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hardDelete = parseBoolean(req.query.hard, false);
    if (hardDelete) {
      const result = await pool.query('DELETE FROM m7_content WHERE id = $1', [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ error: 'Content not found' });
      return res.json({ deleted: true, hard: true });
    }

    const result = await pool.query(
      `UPDATE m7_content
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Content not found' });
    return res.json({ deleted: true, hard: false });
  } catch (error) {
    console.error('M7 delete content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
