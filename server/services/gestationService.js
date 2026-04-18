/**
 * Gestation Service
 * Centralizes Module 5 data persistence and retrieval.
 */

let ensureGestationTablePromise = null;

const STAGE_PERSISTENCE_TEMPLATE = [
  {
    stageKey: 'early',
    dayStart: 0,
    dayEnd: 50,
    physiologicalStatus: 'Implantacion y estabilizacion embrionaria.',
    riskLevel: 'stable',
    nutrition: {
      dry_matter_pct_bw: '2.8% - 3.0%',
      recommended_diet: 'Forraje de calidad + balance basal sin cambios bruscos.',
    },
    health: {
      deworming: 'Solo si plan sanitario lo requiere y con aprobacion veterinaria.',
      vaccination: 'Programar segun plan preventivo de la finca.',
      vitamins_minerals: 'Bloque mineral completo y vitamina E/selenio si aplica.',
    },
    management: {
      do: 'Reducir estres y confirmar consumo diario.',
      avoid: 'Mover o reagrupar animales sin necesidad.',
    },
    illustrationPath: '/assets/gestation/stage-early.svg',
  },
  {
    stageKey: 'mid',
    dayStart: 50,
    dayEnd: 100,
    physiologicalStatus: 'Desarrollo fetal acelerado y demanda nutricional creciente.',
    riskLevel: 'attention',
    nutrition: {
      dry_matter_pct_bw: '3.0% - 3.2%',
      recommended_diet: 'Aumentar densidad nutricional y energia metabolizable.',
    },
    health: {
      deworming: 'Revisar carga parasitaria y desparasitar segun calendario.',
      vaccination: 'Refuerzos segun protocolo sanitario local.',
      vitamins_minerals: 'Asegurar aporte de calcio, fosforo y trazas.',
    },
    management: {
      do: 'Monitorear condicion corporal cada 2 semanas.',
      avoid: 'Subalimentacion o cambios drasticos de racion.',
    },
    illustrationPath: '/assets/gestation/stage-mid.svg',
  },
  {
    stageKey: 'late',
    dayStart: 100,
    dayEnd: 150,
    physiologicalStatus: 'Maduracion final fetal y preparacion de parto.',
    riskLevel: 'critical',
    nutrition: {
      dry_matter_pct_bw: '3.2% - 3.5%',
      recommended_diet: 'Racion de preparto con alta calidad y fraccionamiento.',
    },
    health: {
      deworming: 'Aplicar solo si esta indicado por veterinaria.',
      vaccination: 'Completar refuerzos preparto segun protocolo.',
      vitamins_minerals: 'Refuerzo de minerales y vitaminas de soporte inmunitario.',
    },
    management: {
      do: 'Preparar area de parto y monitoreo frecuente.',
      avoid: 'Sobrecarga, transporte o manejo brusco en ultimos dias.',
    },
    illustrationPath: '/assets/gestation/stage-late.svg',
  },
];

function normalizeDateInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

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

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gestations (
          id SERIAL PRIMARY KEY,
          scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
          service_date DATE NOT NULL,
          breed_key TEXT,
          gestation_days INTEGER NOT NULL DEFAULT 150,
          doe_count INTEGER NOT NULL DEFAULT 1,
          expected_kids_per_doe NUMERIC(6,2) DEFAULT 1.70,
          pregnancy_loss_pct NUMERIC(5,2) DEFAULT 8.00,
          reminder_window_days INTEGER DEFAULT 14,
          management_level VARCHAR(20) DEFAULT 'standard',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (scenario_id)
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_gestations_service_date ON gestations(service_date)');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gestation_events (
          id SERIAL PRIMARY KEY,
          gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
          event_key TEXT NOT NULL,
          event_day INTEGER NOT NULL,
          event_date DATE NOT NULL,
          event_type VARCHAR(20) DEFAULT 'info',
          title TEXT,
          description TEXT,
          status VARCHAR(20) DEFAULT 'upcoming',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (gestation_id, event_key, event_day)
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_gestation_events_date ON gestation_events(event_date)');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gestation_stage_data (
          id SERIAL PRIMARY KEY,
          gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
          stage_key VARCHAR(20) NOT NULL,
          day_start INTEGER NOT NULL,
          day_end INTEGER NOT NULL,
          physiological_status TEXT,
          risk_level VARCHAR(20),
          nutrition JSONB,
          health JSONB,
          management JSONB,
          illustration_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (gestation_id, stage_key)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_alerts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
          gestation_id INTEGER REFERENCES gestations(id) ON DELETE CASCADE,
          alert_key TEXT NOT NULL,
          alert_type VARCHAR(20) DEFAULT 'info',
          alert_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          message TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, scenario_id, alert_key, alert_date)
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_date ON user_alerts(alert_date)');
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
  calculatedGestationTimeline = null,
  userId = null
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
  const serviceDate = normalizeDateInput(gestationData?.mating_date);
  let gestationId = null;

  if (!serviceDate) {
    await pool.query('DELETE FROM gestations WHERE scenario_id = $1', [scenarioId]);
  } else {
    const gestationResult = await pool.query(
      `INSERT INTO gestations (
        scenario_id, service_date, breed_key, gestation_days, doe_count, expected_kids_per_doe,
        pregnancy_loss_pct, reminder_window_days, management_level, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (scenario_id) DO UPDATE SET
        service_date = EXCLUDED.service_date,
        breed_key = EXCLUDED.breed_key,
        gestation_days = EXCLUDED.gestation_days,
        doe_count = EXCLUDED.doe_count,
        expected_kids_per_doe = EXCLUDED.expected_kids_per_doe,
        pregnancy_loss_pct = EXCLUDED.pregnancy_loss_pct,
        reminder_window_days = EXCLUDED.reminder_window_days,
        management_level = EXCLUDED.management_level,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, gestation_days`,
      [
        scenarioId,
        serviceDate,
        gestationData?.breed_key || null,
        Number(gestationData?.gestation_days) || 150,
        Number(gestationData?.doe_count) || 1,
        Number(gestationData?.expected_kids_per_doe) || 1.7,
        Number(gestationData?.pregnancy_loss_pct) || 8,
        Number(gestationData?.reminder_window_days) || 14,
        gestationData?.management_level || 'standard',
        gestationData?.notes || null,
      ]
    );

    gestationId = gestationResult.rows[0]?.id || null;
    const resolvedGestationDays = Number(gestationResult.rows[0]?.gestation_days) || 150;

    await pool.query('DELETE FROM gestation_stage_data WHERE gestation_id = $1', [gestationId]);
    for (const stage of STAGE_PERSISTENCE_TEMPLATE) {
      const dayEnd = stage.stageKey === 'late' ? resolvedGestationDays : stage.dayEnd;
      if (stage.dayStart > dayEnd) continue;
      await pool.query(
        `INSERT INTO gestation_stage_data (
          gestation_id, stage_key, day_start, day_end, physiological_status, risk_level,
          nutrition, health, management, illustration_path
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          gestationId,
          stage.stageKey,
          stage.dayStart,
          dayEnd,
          stage.physiologicalStatus,
          stage.riskLevel,
          JSON.stringify(stage.nutrition),
          JSON.stringify(stage.health),
          JSON.stringify(stage.management),
          stage.illustrationPath,
        ]
      );
    }

    const events = Array.isArray(calculatedGestationTimeline?.events) ? calculatedGestationTimeline.events : [];
    await pool.query('DELETE FROM gestation_events WHERE gestation_id = $1', [gestationId]);
    for (const event of events) {
      const eventDate = normalizeDateInput(event?.date);
      if (!eventDate) continue;
      await pool.query(
        `INSERT INTO gestation_events (
          gestation_id, event_key, event_day, event_date, event_type, title, description, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (gestation_id, event_key, event_day) DO UPDATE SET
          event_date = EXCLUDED.event_date,
          event_type = EXCLUDED.event_type,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status`,
        [
          gestationId,
          String(event?.id || 'event'),
          Number(event?.dayOffset) || 0,
          eventDate,
          String(event?.type || 'info'),
          event?.title || null,
          event?.desc || null,
          String(event?.status || 'upcoming'),
        ]
      );
    }

    if (userId) {
      await pool.query('DELETE FROM user_alerts WHERE user_id = $1 AND scenario_id = $2', [userId, scenarioId]);
      const alerts = Array.isArray(calculatedGestationTimeline?.upcomingEvents)
        ? calculatedGestationTimeline.upcomingEvents
        : events.filter((event) => event?.status === 'today' || event?.status === 'upcoming');

      for (const alert of alerts) {
        const alertDate = normalizeDateInput(alert?.date);
        if (!alertDate) continue;
        await pool.query(
          `INSERT INTO user_alerts (
            user_id, scenario_id, gestation_id, alert_key, alert_type, alert_date, status, message, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (user_id, scenario_id, alert_key, alert_date) DO UPDATE SET
            alert_type = EXCLUDED.alert_type,
            status = EXCLUDED.status,
            message = EXCLUDED.message,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP`,
          [
            userId,
            scenarioId,
            gestationId,
            String(alert?.id || 'alert'),
            String(alert?.type || 'info'),
            alertDate,
            alert?.status === 'past' ? 'sent' : 'pending',
            alert?.title || alert?.desc || null,
            JSON.stringify({
              day_offset: Number(alert?.dayOffset) || 0,
              delta_days: Number(alert?.deltaDays) || 0,
              description: alert?.desc || null,
            }),
          ]
        );
      }
    }
  }

  return {
    ...row,
    gestationData: row.gestation_data || null,
    calculatedGestationTimeline: row.calculated_gestation_timeline || null,
    gestationId,
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
