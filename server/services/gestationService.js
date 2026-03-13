/**
 * Gestation Service
 * Centralizes Module 5 data persistence and retrieval.
 */

let ensureGestationTablePromise = null;

/**
 * Ensure gestation storage table exists.
 * Uses a shared promise so concurrent requests do not race.
 * @param {import('pg').Pool} pool
 * @returns {Promise<void>}
 */
export async function ensureGestationTable(pool) {
  if (!ensureGestationTablePromise) {
    ensureGestationTablePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS gestation_data (
          id SERIAL PRIMARY KEY,
          scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
          gestation_data JSONB,
          calculated_gestation_timeline JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(scenario_id)
        )
      `);

      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_gestation_data_scenario_id ON gestation_data(scenario_id)'
      );
    })().catch((error) => {
      // Allow retry on next request if initialization failed.
      ensureGestationTablePromise = null;
      throw error;
    });
  }

  await ensureGestationTablePromise;
}

/**
 * Save gestation payload for a scenario.
 * @param {import('pg').Pool} pool
 * @param {number} scenarioId
 * @param {object} gestationData
 * @param {object|null} calculatedGestationTimeline
 * @returns {Promise<object>}
 */
export async function saveGestationData(
  pool,
  scenarioId,
  gestationData = {},
  calculatedGestationTimeline = null
) {
  await ensureGestationTable(pool);

  const result = await pool.query(
    `INSERT INTO gestation_data (scenario_id, gestation_data, calculated_gestation_timeline)
     VALUES ($1, $2, $3)
     ON CONFLICT (scenario_id) DO UPDATE SET
       gestation_data = EXCLUDED.gestation_data,
       calculated_gestation_timeline = EXCLUDED.calculated_gestation_timeline,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      scenarioId,
      JSON.stringify(gestationData || {}),
      JSON.stringify(calculatedGestationTimeline || null),
    ]
  );

  const row = result.rows[0];
  return {
    ...row,
    gestationData: row.gestation_data || null,
    calculatedGestationTimeline: row.calculated_gestation_timeline || null,
  };
}

/**
 * Get gestation payload by scenario.
 * @param {import('pg').Pool} pool
 * @param {number} scenarioId
 * @returns {Promise<{gestationData: object|null, calculatedGestationTimeline: object|null}>}
 */
export async function getGestationDataByScenarioId(pool, scenarioId) {
  await ensureGestationTable(pool);

  const result = await pool.query(
    'SELECT gestation_data, calculated_gestation_timeline FROM gestation_data WHERE scenario_id = $1',
    [scenarioId]
  );

  const row = result.rows[0];
  return {
    gestationData: row?.gestation_data || null,
    calculatedGestationTimeline: row?.calculated_gestation_timeline || null,
  };
}

