#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  buildBreedReferenceRows,
  readBreedSourceFile,
  serializeRowsToCsv,
  serializeRowsToInsertSql
} from '../db/breedReferenceSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const sourceFile = join(projectRoot, 'server', 'metacaprine_module3_breed_reference_ranked_ecm.json');
const outputDir = join(projectRoot, 'server', 'db');
const outputJson = join(outputDir, 'breed_reference_seed.json');
const outputCsv = join(outputDir, 'breed_reference_import.csv');
const outputSql = join(outputDir, 'breed_reference_seed.sql');

mkdirSync(outputDir, { recursive: true });

const sourceDocument = readBreedSourceFile(sourceFile);
const rows = buildBreedReferenceRows(sourceDocument);

writeFileSync(
  outputJson,
  `${JSON.stringify({ source_file: 'server/metacaprine_module3_breed_reference_ranked_ecm.json', rows }, null, 2)}\n`,
  'utf8'
);
writeFileSync(outputCsv, serializeRowsToCsv(rows), 'utf8');
writeFileSync(outputSql, serializeRowsToInsertSql(rows), 'utf8');

console.log(`Generated breed_reference seed artifacts for ${rows.length} breeds.`);
console.log(outputJson);
console.log(outputCsv);
console.log(outputSql);
