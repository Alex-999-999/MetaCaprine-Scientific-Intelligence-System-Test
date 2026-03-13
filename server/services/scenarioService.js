/**
 * Scenario Service
 * Business logic for scenario management
 */

import { getPool } from '../db/pool.js';
import { runSimulation } from '../core/simulationEngine.js';
import { ensureGestationTable, getGestationDataByScenarioId } from './gestationService.js';

/**
 * Get all scenarios for a user
 * @param {number} userId - User ID
 * @param {string} type - Optional scenario type filter
 * @returns {Promise<Array>} Array of scenarios
 */
export async function getUserScenarios(userId, type = null) {
  const pool = getPool();

  let query = 'SELECT * FROM scenarios WHERE user_id = $1';
  const params = [userId];

  if (type) {
    query += ' AND type = $2';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single scenario with all related data
 * @param {number} scenarioId - Scenario ID
 * @param {number} userId - User ID (for ownership verification)
 * @returns {Promise<Object>} Scenario with all related data
 * @throws {Error} If scenario not found or access denied
 */
export async function getScenarioById(scenarioId, userId) {
  const pool = getPool();

  // Verify ownership
  const scenarioResult = await pool.query(
    'SELECT * FROM scenarios WHERE id = $1 AND user_id = $2',
    [scenarioId, userId]
  );

  if (scenarioResult.rows.length === 0) {
    throw new Error('Access denied: Scenario not found or you do not have permission');
  }

  const scenario = scenarioResult.rows[0];

  // Get all related data
  const [productionData, transformationData, transformationProducts, lactationData, yieldData, results, gestationData] = await Promise.all([
    pool.query('SELECT * FROM production_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_products WHERE scenario_id = $1 ORDER BY id', [scenarioId]),
    pool.query('SELECT * FROM lactation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM yield_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM results WHERE scenario_id = $1', [scenarioId]),
    getGestationDataByScenarioId(pool, scenarioId),
  ]);

  return {
    ...scenario,
    productionData: productionData.rows[0] || null,
    transformationData: transformationData.rows[0] || null,
    transformationProducts: transformationProducts.rows || [],
    lactationData: lactationData.rows[0] || null,
    yieldData: yieldData.rows[0] || null,
    results: results.rows[0] || null,
    gestationData: gestationData.gestationData || null,
    calculatedGestationTimeline: gestationData.calculatedGestationTimeline || null,
  };
}

/**
 * Create a new scenario
 * @param {number} userId - User ID
 * @param {string} name - Scenario name
 * @param {string} type - Scenario type
 * @param {string} description - Optional description
 * @returns {Promise<Object>} Created scenario
 */
export async function createScenario(userId, name, type, description = null) {
  const pool = getPool();

  const result = await pool.query(
    `INSERT INTO scenarios (user_id, name, type, description) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [userId, name, type, description]
  );

  return result.rows[0];
}

/**
 * Update scenario
 * @param {number} scenarioId - Scenario ID
 * @param {number} userId - User ID (for ownership verification)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated scenario
 * @throws {Error} If scenario not found or access denied
 */
export async function updateScenario(scenarioId, userId, updates) {
  const pool = getPool();

  // Verify ownership
  const checkResult = await pool.query(
    'SELECT id FROM scenarios WHERE id = $1 AND user_id = $2',
    [scenarioId, userId]
  );

  if (checkResult.rows.length === 0) {
    throw new Error('Access denied: Scenario not found or you do not have permission');
  }

  // Build update query
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.type !== undefined) {
    fields.push(`type = $${paramIndex++}`);
    values.push(updates.type);
  }

  if (fields.length === 0) {
    return checkResult.rows[0];
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(scenarioId, userId);

  const result = await pool.query(
    `UPDATE scenarios 
     SET ${fields.join(', ')} 
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Delete scenario
 * @param {number} scenarioId - Scenario ID
 * @param {number} userId - User ID (for ownership verification)
 * @returns {Promise<void>}
 * @throws {Error} If scenario not found or access denied
 */
export async function deleteScenario(scenarioId, userId) {
  const pool = getPool();

  // Verify ownership
  const checkResult = await pool.query(
    'SELECT id FROM scenarios WHERE id = $1 AND user_id = $2',
    [scenarioId, userId]
  );

  if (checkResult.rows.length === 0) {
    throw new Error('Access denied: Scenario not found or you do not have permission');
  }

  // Delete scenario (CASCADE will handle related data)
  await pool.query('DELETE FROM scenarios WHERE id = $1', [scenarioId]);
}

/**
 * Duplicate scenario
 * @param {number} scenarioId - Scenario ID to duplicate
 * @param {number} userId - User ID (for ownership verification)
 * @param {string} newName - Optional new name for duplicated scenario
 * @returns {Promise<Object>} New scenario
 * @throws {Error} If scenario not found or access denied
 */
export async function duplicateScenario(scenarioId, userId, newName = null) {
  const pool = getPool();
  await ensureGestationTable(pool);

  // Get original scenario
  const original = await getScenarioById(scenarioId, userId);

  // Create new scenario
  const scenarioName = newName || `${original.name} (Copy)`;
  const newScenario = await createScenario(
    userId,
    scenarioName,
    original.type,
    original.description
  );

  // Copy all related data
  await Promise.all([
    // Copy production_data
    original.productionData && pool.query(
      `INSERT INTO production_data (scenario_id, daily_production_liters, production_days, animals_count,
       feed_cost_per_liter, labor_cost_per_liter, health_cost_per_liter, infrastructure_cost_per_liter,
       other_costs_per_liter, milk_price_per_liter)
       SELECT $1, daily_production_liters, production_days, animals_count,
       feed_cost_per_liter, labor_cost_per_liter, health_cost_per_liter, infrastructure_cost_per_liter,
       other_costs_per_liter, milk_price_per_liter
       FROM production_data WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
    // Copy transformation_data
    original.transformationData && pool.query(
      `INSERT INTO transformation_data (
        scenario_id, product_type, liters_per_kg_product,
        processing_cost_per_liter, product_price_per_kg,
        sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
        direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
      )
       SELECT $1, product_type, liters_per_kg_product, processing_cost_per_liter, product_price_per_kg,
       sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
       direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
       FROM transformation_data WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
    // Copy transformation_products
    original.transformationProducts && original.transformationProducts.length > 0 && pool.query(
      `INSERT INTO transformation_products (
        scenario_id, product_name, product_type, liters_per_kg_product,
        processing_cost_per_liter, product_price_per_kg,
        sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
        direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
      )
       SELECT $1, product_name, product_type, liters_per_kg_product,
       processing_cost_per_liter, product_price_per_kg,
       sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
       direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
       FROM transformation_products WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
    // Copy lactation_data
    original.lactationData && pool.query(
      `INSERT INTO lactation_data (scenario_id, lactation_days, dry_days, productive_life_years, replacement_rate)
       SELECT $1, lactation_days, dry_days, productive_life_years, replacement_rate
       FROM lactation_data WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
    // Copy yield_data
    original.yieldData && pool.query(
      `INSERT INTO yield_data (scenario_id, conversion_rate, efficiency_percentage)
       SELECT $1, conversion_rate, efficiency_percentage
       FROM yield_data WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
    // Copy gestation_data
    original.gestationData && pool.query(
      `INSERT INTO gestation_data (scenario_id, gestation_data, calculated_gestation_timeline)
       SELECT $1, gestation_data, calculated_gestation_timeline
       FROM gestation_data WHERE scenario_id = $2`,
      [newScenario.id, scenarioId]
    ),
  ].filter(Boolean)); // Remove null/undefined promises

  return newScenario;
}

/**
 * Calculate and save results for a scenario
 * @param {number} scenarioId - Scenario ID
 * @returns {Promise<Object>} Calculated results
 */
export async function calculateScenarioResults(scenarioId) {
  const pool = getPool();

  // Get all scenario data
  const [scenario, productionData, transformationData, transformationProducts, lactationData, yieldData] = await Promise.all([
    pool.query('SELECT * FROM scenarios WHERE id = $1', [scenarioId]),
    pool.query('SELECT * FROM production_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_products WHERE scenario_id = $1 ORDER BY id', [scenarioId]),
    pool.query('SELECT * FROM lactation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM yield_data WHERE scenario_id = $1', [scenarioId]),
  ]);

  if (scenario.rows.length === 0) {
    throw new Error('Scenario not found');
  }

  const scenarioData = {
    productionData: productionData.rows[0] || null,
    transformationData: transformationData.rows[0] || null,
    transformationProducts: transformationProducts.rows || [],
    lactationData: lactationData.rows[0] || null,
    yieldData: yieldData.rows[0] || null,
    scenarioType: scenario.rows[0].type,
  };

  // Run simulation
  const results = runSimulation(scenarioData);

  // Save results
  await pool.query(
    `INSERT INTO results (scenario_id, results_data, calculated_at) 
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (scenario_id) 
     DO UPDATE SET results_data = EXCLUDED.results_data, calculated_at = CURRENT_TIMESTAMP`,
    [scenarioId, JSON.stringify(results)]
  );

  return results;
}
