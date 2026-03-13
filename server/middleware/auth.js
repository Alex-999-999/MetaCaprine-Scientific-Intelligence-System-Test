import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;
  const [scheme, token] = String(authHeader).split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function verifyLegacyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded?.userId) {
    throw new Error('Not a legacy app token');
  }
  return {
    userId: decoded.userId,
    email: decoded.email || null,
    authUserId: decoded.authUserId || null,
    tokenProvider: 'legacy',
  };
}

async function verifySupabaseTokenAndResolveUser(token) {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET not configured');
  }

  const claims = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
  if (!claims?.sub) {
    throw new Error('Supabase token missing subject');
  }

  const supabaseUserId = claims.sub;
  const email = claims.email || null;
  const pool = getPool();

  const lookup = await pool.query(
    `SELECT id, email, auth_user_id
     FROM users
     WHERE auth_user_id = $1
        OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
     ORDER BY CASE WHEN auth_user_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [supabaseUserId, email]
  );

  if (lookup.rows.length === 0) {
    throw new Error('No app user mapped to this Supabase identity');
  }

  const user = lookup.rows[0];

  if (!user.auth_user_id) {
    await pool.query(
      `UPDATE users
       SET auth_user_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [supabaseUserId, user.id]
    );
  }

  return {
    userId: user.id,
    email: user.email,
    authUserId: supabaseUserId,
    tokenProvider: 'supabase',
    supabaseRole: claims.role || null,
  };
}

export async function authenticateToken(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    req.user = verifyLegacyToken(token);
    next();
    return;
  } catch (_) {
    // Fallback to Supabase JWT verification for phased migration.
  }

  try {
    req.user = await verifySupabaseTokenAndResolveUser(token);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token', details: error.message });
  }
}

export function generateToken(userId, email, authUserId = null) {
  return jwt.sign({ userId, email, authUserId }, JWT_SECRET, { expiresIn: '7d' });
}
