import { getPool } from '../db/pool.js';

/**
 * Middleware to require email verification before accessing protected routes
 * Use this middleware on routes that require verified email
 */
export async function requireEmailVerification(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email address to access this feature.',
        email_verified: false
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
