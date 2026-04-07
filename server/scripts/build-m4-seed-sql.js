#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inputPath = join(root, 'data', 'm4_breeds_seed.json');
const outputPath = join(root, 'db', 'm4_seed.sql');

const cols = [
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
  'scenario_s1_reference',
  'scenario_s2_reference',
  'scenario_s3_c1_reference',
  'scenario_s3_c2_reference',
  'scenario_s3_c3_reference',
];

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

const rows = JSON.parse(readFileSync(inputPath, 'utf8'));

const insertValues = rows
  .map((row) => `(${cols.map((c) => sqlValue(row[c])).join(', ')})`)
  .join(',\n');

const updates = cols
  .filter((c) => c !== 'name')
  .map((c) => `${c} = EXCLUDED.${c}`)
  .join(',\n  ');

const sql = `-- Auto-generated from server/data/m4_breeds_seed.json
-- Regenerate with: node server/scripts/build-m4-seed-sql.js

INSERT INTO m4_breeds (
  ${cols.join(',\n  ')}
)
VALUES
${insertValues}
ON CONFLICT (name) DO UPDATE SET
  ${updates},
  updated_at = CURRENT_TIMESTAMP;
`;

writeFileSync(outputPath, sql, 'utf8');
console.log(`Generated ${outputPath} with ${rows.length} rows.`);
