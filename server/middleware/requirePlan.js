/**
 * Middleware to require specific plan/feature access
 * Use this middleware on routes that require premium features
 */

import { hasFeatureAccess } from '../services/planService.js';

/**
 * Middleware factory to check if user has access to a feature
 * @param {string} featureKey - Feature key to check (e.g., 'module3', 'premium')
 * @returns {Function} Express middleware
 */
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const hasAccess = await hasFeatureAccess(userId, featureKey);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature access required',
          message: `This feature requires a plan that includes '${featureKey}'. Please upgrade your plan.`,
          feature: featureKey,
          upgrade_required: true
        });
      }
      
      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check if user has premium plan
 * Shorthand for requireFeature('premium')
 */
export const requirePremium = requireFeature('premium');
