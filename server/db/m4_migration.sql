-- M4: La Cabra como Inversión — Schema aligned with TABLA MAESTRA M4
-- Run after complete_migration.sql (requires public.users).

CREATE TABLE IF NOT EXISTS m4_breeds (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,

  milk_per_lactation_kg     NUMERIC(12,4) NOT NULL DEFAULT 0,
  lactation_days            INTEGER NOT NULL DEFAULT 0,
  fat_pct                   NUMERIC(8,4) NOT NULL DEFAULT 0,
  fat_kg                    NUMERIC(12,4) NOT NULL DEFAULT 0,
  protein_pct               NUMERIC(8,4) NOT NULL DEFAULT 0,
  protein_kg                NUMERIC(12,4) NOT NULL DEFAULT 0,
  fat_protein_kg            NUMERIC(12,4) NOT NULL DEFAULT 0,
  ecm_per_lactation_kg      NUMERIC(12,4) NOT NULL DEFAULT 0,
  avg_lifetime_lactations   NUMERIC(8,4) NOT NULL DEFAULT 0,

  validation_source         TEXT,

  lifetime_milk_kg          NUMERIC(14,4) NOT NULL DEFAULT 0,
  lifetime_fat_kg           NUMERIC(14,4) NOT NULL DEFAULT 0,
  lifetime_protein_kg       NUMERIC(14,4) NOT NULL DEFAULT 0,
  lifetime_fat_protein_kg   NUMERIC(14,4) NOT NULL DEFAULT 0,
  ecm_lifetime_total_kg     NUMERIC(14,4) NOT NULL DEFAULT 0,

  region                    TEXT,
  suggested_system          TEXT,

  milk_cost_per_liter           NUMERIC(12,6) NOT NULL DEFAULT 0,
  milk_sale_price_per_liter     NUMERIC(12,6) NOT NULL DEFAULT 0,
  raw_milk_margin_per_liter     NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_yield_liters_per_kg    NUMERIC(12,6) NOT NULL DEFAULT 0,
  lifetime_cheese_kg            NUMERIC(14,4) NOT NULL DEFAULT 0,
  cheese_cost_from_milk_per_kg  NUMERIC(12,6) NOT NULL DEFAULT 0,

  cheese_price_c1         NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_cost_pack_c1       NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_margin_c1        NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_price_c2         NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_cost_pack_c2     NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_margin_c2        NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_price_c3         NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_cost_pack_c3     NUMERIC(12,6) NOT NULL DEFAULT 0,
  cheese_margin_c3        NUMERIC(12,6) NOT NULL DEFAULT 0,

  daughters_per_life        NUMERIC(8,4) NOT NULL DEFAULT 0,
  female_ratio              NUMERIC(8,4) NOT NULL DEFAULT 0.5,
  female_value              NUMERIC(14,4) NOT NULL DEFAULT 0,

  acquisition_logistics_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  raising_cost               NUMERIC(14,4) NOT NULL DEFAULT 0,
  replacement_pct            NUMERIC(10,6) NOT NULL DEFAULT 0,
  mortality_pct              NUMERIC(10,6) NOT NULL DEFAULT 0,

  cap_reference              NUMERIC(14,4),
  scenario_s1_reference      NUMERIC(14,4),
  scenario_s2_reference      NUMERIC(14,4),
  scenario_s3_c1_reference   NUMERIC(14,4),
  scenario_s3_c2_reference   NUMERIC(14,4),
  scenario_s3_c3_reference   NUMERIC(14,4),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade from earlier m4_breeds definitions (idempotent)
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS fat_kg NUMERIC(12,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS protein_kg NUMERIC(12,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS fat_protein_kg NUMERIC(12,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS validation_source TEXT;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS lifetime_fat_kg NUMERIC(14,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS lifetime_protein_kg NUMERIC(14,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS lifetime_fat_protein_kg NUMERIC(14,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS ecm_lifetime_total_kg NUMERIC(14,4) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS milk_cost_per_liter NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS milk_sale_price_per_liter NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_yield_liters_per_kg NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_cost_from_milk_per_kg NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_price_c1 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_cost_pack_c1 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_price_c2 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_cost_pack_c2 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_price_c3 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cheese_cost_pack_c3 NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS cap_reference NUMERIC(14,4);
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS scenario_s1_reference NUMERIC(14,4);
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS scenario_s2_reference NUMERIC(14,4);
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS scenario_s3_c1_reference NUMERIC(14,4);
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS scenario_s3_c2_reference NUMERIC(14,4);
ALTER TABLE m4_breeds ADD COLUMN IF NOT EXISTS scenario_s3_c3_reference NUMERIC(14,4);

CREATE TABLE IF NOT EXISTS m4_user_scenarios (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  breed_id        INTEGER NOT NULL REFERENCES m4_breeds(id) ON DELETE CASCADE,
  custom_name     TEXT,

  acquisition_logistics_cost NUMERIC(10,2),
  raising_cost               NUMERIC(10,2),
  replacement_pct            NUMERIC(5,4),
  mortality_pct              NUMERIC(5,4),

  milk_sale_price_override   NUMERIC(8,4),
  milk_cost_override         NUMERIC(8,4),

  cheese_price_c1_override   NUMERIC(8,4),
  cheese_cost_c1_override    NUMERIC(8,4),
  cheese_price_c2_override   NUMERIC(8,4),
  cheese_cost_c2_override    NUMERIC(8,4),
  cheese_price_c3_override   NUMERIC(8,4),
  cheese_cost_c3_override    NUMERIC(8,4),

  female_value_override      NUMERIC(10,2),
  daughters_per_life_override NUMERIC(5,2),
  female_ratio_override      NUMERIC(5,2),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_m4_user_scenarios_user ON m4_user_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_m4_user_scenarios_breed ON m4_user_scenarios(breed_id);
