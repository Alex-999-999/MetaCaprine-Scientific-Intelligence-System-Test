/**
 * Plan Service
 * Business logic for user plans and feature access control
 * Base structure for future subscription system
 */

import { getPool } from '../db/pool.js';

/**
 * Get user's current plan
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User plan with plan details
 */
export async function getUserPlan(userId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT up.*, p.name as plan_name, p.display_name, p.features as plan_features
     FROM user_plans up
     JOIN plans p ON up.plan_id = p.id
     WHERE up.user_id = $1 AND up.status = 'active'`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Return default free plan if user has no plan assigned
    const freePlan = await pool.query(
      "SELECT * FROM plans WHERE name = 'free' AND is_active = true LIMIT 1"
    );

    if (freePlan.rows.length > 0) {
      // Assign free plan to user
      await assignPlanToUser(userId, freePlan.rows[0].id);
      return {
        ...freePlan.rows[0],
        user_id: userId,
        plan_id: freePlan.rows[0].id,
        status: 'active'
      };
    }

    throw new Error('No plan available');
  }

  return result.rows[0];
}

/**
 * Get all features enabled for a user's plan
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of enabled feature keys
 */
export async function getUserFeatures(userId) {
  const pool = getPool();

  const userPlan = await getUserPlan(userId);

  // Get features from plan_features table
  const result = await pool.query(
    `SELECT feature_key, feature_name 
     FROM plan_features 
     WHERE plan_id = $1 AND is_enabled = true`,
    [userPlan.plan_id]
  );

  return result.rows.map(row => row.feature_key);
}

/**
 * Check if user has access to a specific feature
 * @param {number} userId - User ID
 * @param {string} featureKey - Feature key to check (e.g., 'module1', 'module3')
 * @returns {Promise<boolean>} True if user has access
 */
export async function hasFeatureAccess(userId, featureKey) {
  try {
    const features = await getUserFeatures(userId);
    return features.includes(featureKey);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false; // Default to no access on error
  }
}

/**
 * Assign a plan to a user
 * @param {number} userId - User ID
 * @param {number} planId - Plan ID
 * @param {string} status - Plan status (default: 'active')
 * @returns {Promise<Object>} Created user plan
 */
export async function assignPlanToUser(userId, planId, status = 'active') {
  const pool = getPool();

  // Check if user already has a plan
  const existing = await pool.query(
    'SELECT id FROM user_plans WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    // Update existing plan
    const result = await pool.query(
      `UPDATE user_plans 
       SET plan_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING *`,
      [planId, status, userId]
    );
    return result.rows[0];
  } else {
    // Create new user plan
    const result = await pool.query(
      `INSERT INTO user_plans (user_id, plan_id, status) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userId, planId, status]
    );
    return result.rows[0];
  }
}

/**
 * Get all available plans
 * @returns {Promise<Array>} Array of all active plans
 */
export async function getAllPlans() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT p.*, 
     (SELECT COUNT(*) FROM plan_features pf WHERE pf.plan_id = p.id AND pf.is_enabled = true) as feature_count
     FROM plans p
     WHERE p.is_active = true
     ORDER BY p.price_monthly ASC`
  );

  return result.rows;
}

/**
 * Get plan by name
 * @param {string} planName - Plan name (e.g., 'free', 'premium')
 * @returns {Promise<Object>} Plan object
 */
export async function getPlanByName(planName) {
  const pool = getPool();

  const result = await pool.query(
    'SELECT * FROM plans WHERE name = $1 AND is_active = true LIMIT 1',
    [planName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Plan '${planName}' not found`);
  }

  return result.rows[0];
}
