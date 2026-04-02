#!/usr/bin/env node
/**
 * Load m4_breeds from server/data/m4_breeds_seed.json (generated from TABLA MAESTRA CSV).
 * Requires: DATABASE_URL, and m4_migration.sql applied.
 *
 * Usage: node server/scripts/seed-m4-breeds.js
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

const COLUMNS = [
  'name',
  'milk_per_lactation_kg',
  'lactation_days',
  'fat_pct',
  'fat_kg',
  'protein_pct',
  'protein_kg',
  'fat_protein_kg',
  'ecm_per_lactation_kg',
  'avg_lifetime_lactations',
  'validation_source',
  'lifetime_milk_kg',
  'lifetime_fat_kg',
  'lifetime_protein_kg',
  'lifetime_fat_protein_kg',
  'ecm_lifetime_total_kg',
  'region',
  'suggested_system',
  'milk_cost_per_liter',
  'milk_sale_price_per_liter',
  'raw_milk_margin_per_liter',
  'cheese_yield_liters_per_kg',
  'lifetime_cheese_kg',
  'cheese_cost_from_milk_per_kg',
  'cheese_price_c1',
  'cheese_cost_pack_c1',
  'cheese_margin_c1',
  'cheese_price_c2',
  'cheese_cost_pack_c2',
  'cheese_margin_c2',
  'cheese_price_c3',
  'cheese_cost_pack_c3',
  'cheese_margin_c3',
  'daughters_per_life',
  'female_ratio',
  'female_value',
  'acquisition_logistics_cost',
  'raising_cost',
  'replacement_pct',
  'mortality_pct',
  'cap_reference',
];

function val(b, key) {
  const v = b[key];
  if (v === undefined || v === null) return null;
  return v;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const jsonPath = join(__dirname, '..', 'data', 'm4_breeds_seed.json');
  const breeds = JSON.parse(readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(breeds) || breeds.length === 0) {
    console.error('No breeds in JSON');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('supabase') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
  const updates = COLUMNS.filter((c) => c !== 'name')
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const sql = `
    INSERT INTO m4_breeds (${COLUMNS.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (name) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP
  `;

  let n = 0;
  for (const b of breeds) {
    const params = COLUMNS.map((c) => val(b, c));
    await pool.query(sql, params);
    n++;
  }

  await pool.end();
  console.log(`Seeded ${n} m4_breeds rows from ${jsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
