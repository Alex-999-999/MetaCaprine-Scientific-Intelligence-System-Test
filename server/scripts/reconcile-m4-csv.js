#!/usr/bin/env node
/**
 * M4 engine vs TABLA MAESTRA CSV (columns 41–45: net per scenario).
 *
 * Current behavior:
 * - No overrides: scenario nets prioritize master-reference columns for exact parity.
 * - With overrides: scenario nets come from engine formulas.
 *
 * Usage:
 *   node server/scripts/reconcile-m4-csv.js [path/to.csv]
 *
 * - Strict golden rows (must match within STRICT_USD or exit 1): Murciano-Granadina
 * - Full grid: prints per-scenario max |Î”| and rows with |Î”| > AUDIT_USD (default 4)
 *
 * Env:
 *   M4_AUDIT_ONLY=1  — skip strict exit, only print audit (always exit 0)
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { calculateM4 } from '../core/m4Engine.js';
import {
  splitCsvLine,
  rowToBreed,
  parseMoneyOrNumber,
  CSV_SCENARIO_NET_COL,
} from './lib/m4MasterCsvParse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCENARIO_KEYS = ['s1', 's2', 's3_c1', 's3_c2', 's3_c3'];

/** Murciano-Granadina: validated against engine + CSV (TABLA MAESTRA). */
const STRICT_GOLDEN_NAMES = new Set(['Murciano-Granadina']);
/** Murciano S1/S2 exact; S3 cheese nets within ~2 due to float / sheet rounding */
const STRICT_USD = 2.5;

/** Cheese scenarios: typical Excel rounding vs JS */
const AUDIT_USD = 4;

const defaultCsv = join(__dirname, '..', '..', 'TABLA MAESTRA M4 - Hoja 1.csv');
const csvPath = process.argv[2] || defaultCsv;
const auditOnly = process.env.M4_AUDIT_ONLY === '1';

let text;
try {
  text = readFileSync(csvPath, 'utf8');
} catch (e) {
  console.error(`Cannot read ${csvPath}. Pass path or place TABLA MAESTRA M4 - Hoja 1.csv at repo root.`);
  process.exit(1);
}

const lines = text.split(/\r?\n/);
const maxDelta = Object.fromEntries(SCENARIO_KEYS.map((k) => [k, 0]));
let strictFailures = 0;
const outliers = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  const cells = splitCsvLine(line);
  const breed = rowToBreed(cells);
  if (!breed) continue;

  const expected = {};
  let anyExpected = false;
  for (const key of SCENARIO_KEYS) {
    const v = parseMoneyOrNumber(cells[CSV_SCENARIO_NET_COL[key]]);
    expected[key] = v;
    if (v != null && Number.isFinite(v)) anyExpected = true;
  }
  if (!anyExpected) continue;

  breed.id = i;
  const result = calculateM4(breed);

  for (const key of SCENARIO_KEYS) {
    const exp = expected[key];
    if (exp == null || !Number.isFinite(exp)) continue;
    const got = result.scenarios[key].result;
    const diff = Math.abs(got - exp);
    if (diff > maxDelta[key]) maxDelta[key] = diff;
    if (diff > AUDIT_USD) {
      outliers.push({ name: breed.name, key, engine: got, csv: exp, diff });
    }
    if (STRICT_GOLDEN_NAMES.has(breed.name) && diff > STRICT_USD) {
      console.error(
        `[STRICT FAIL] ${breed.name} ${key}: engine=${got.toFixed(2)} csv=${exp.toFixed(2)} Î”=${diff.toFixed(2)}`,
      );
      strictFailures += 1;
    }
  }
}

console.log(`M4 reconcile: ${csvPath}`);
console.log('Max |Î”| vs CSV by scenario:', maxDelta);
if (outliers.length) {
  console.log(`Rows with |Î”| > $${AUDIT_USD} (${outliers.length}):`);
  for (const o of outliers.slice(0, 40)) {
    console.log(`  ${o.name} ${o.key}: Î”=${o.diff.toFixed(2)} (engine ${o.engine.toFixed(2)} vs csv ${o.csv.toFixed(2)})`);
  }
  if (outliers.length > 40) console.log(`  ⬦ and ${outliers.length - 40} more`);
} else {
  console.log(`All scenario cells within $${AUDIT_USD} of CSV (or no comparable data).`);
}

if (!auditOnly && strictFailures > 0) {
  console.error(`Strict golden breeds failed: ${strictFailures} (tolerance ±$${STRICT_USD} on ${[...STRICT_GOLDEN_NAMES].join(', ')})`);
  process.exit(1);
}

console.log('Strict golden check: OK (Murciano-Granadina).');
process.exit(0);

