import { getPool } from '../db/pool.js';

export function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

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

      const role = result.rows[0]?.name;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({
          error: 'Role access required',
          allowed_roles: roles,
          current_role: role || null,
        });
      }

      next();
    } catch (error) {
      console.error('Role access check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
