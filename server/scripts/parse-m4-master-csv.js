#!/usr/bin/env node
/**
 * Parse TABLA MAESTRA M4 CSV (European number format) → m4_breeds_seed.json
 * Usage: node server/scripts/parse-m4-master-csv.js [path/to.csv]
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { splitCsvLine, rowToBreed } from './lib/m4MasterCsvParse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const csvPath = process.argv[2] || join(__dirname, '..', 'data', 'm4_master_table.csv');
const text = readFileSync(csvPath, 'utf8');
const lines = text.split(/\r?\n/);
const breeds = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  const cells = splitCsvLine(line);
  const b = rowToBreed(cells);
  if (b) breeds.push(b);
}

breeds.sort((a, b) => b.lifetime_cheese_kg - a.lifetime_cheese_kg);

const outPath = join(__dirname, '..', 'data', 'm4_breeds_seed.json');
writeFileSync(outPath, `${JSON.stringify(breeds, null, 2)}\n`, 'utf8');
console.log(`Wrote ${breeds.length} breeds to ${outPath}`);
