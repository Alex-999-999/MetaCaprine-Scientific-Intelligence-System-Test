import { getPool } from '../db/pool.js';

function normalizeRoleName(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'pro_user' || raw === 'premium' || raw === 'pro-user') {
    return 'pro';
  }

  return raw;
}

export function requireRole(allowedRoles = []) {
  const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map(normalizeRoleName)
    .filter(Boolean);

  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const pool = getPool();
      const result = await pool.query(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
         LIMIT 1`,
        [userId]
      );

      const role = result.rows[0]?.name || null;
      const normalizedRole = normalizeRoleName(role);

      if (!normalizedRole || !roles.includes(normalizedRole)) {
        return res.status(403).json({
          error: 'Role access required',
          allowed_roles: roles,
          current_role: role,
          current_role_normalized: normalizedRole,
        });
      }

      next();
    } catch (error) {
      console.error('Role access check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
