/**
 * Middleware to require specific plan/feature access
 * Use this middleware on routes that require premium features
 */

import { hasFeatureAccess } from '../services/planService.js';

function getUpgradeMessageForFeature(featureKey) {
  if (featureKey === 'module2') {
    return 'Estas utilizando el nivel basico de simulacion de transformacion. No adivines el futuro de tu granja, calculalo. La simulacion de escenarios, costos de derivados y optimizacion de canales de venta son exclusivos para Usuarios PRO. Pasate a PRO y deja de dejar dinero sobre la mesa!';
  }

  if (featureKey === 'advanced_calculations') {
    return 'Estas viendo el nivel base de comparacion productiva entre razas. MetaCaprine Intelligence incluye analisis comparativos mas profundos para entender el potencial productivo completo de cada tipo de cabra lechera. El analisis de prediccion genetica para esta raza son herramientas exclusivas. Desbloquea el nivel PRO y compite con los mejores rebanos del mundo.';
  }

  return `This feature requires a plan that includes '${featureKey}'. Please upgrade your plan.`;
}

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
          message: getUpgradeMessageForFeature(featureKey),
          feature: featureKey,
          upgrade_required: true,
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
