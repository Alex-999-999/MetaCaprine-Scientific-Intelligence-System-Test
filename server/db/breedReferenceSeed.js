import { readFileSync } from 'fs';

const ECM_FACTOR_BASE = 0.327;
const ECM_FACTOR_FAT = 0.122;
const ECM_FACTOR_PROTEIN = 0.077;
const KG_TO_LITER_DIVISOR = 1.03;

function normalizeTextValue(value) {
  if (value === null || value === undefined) return value;

  const text = String(value).trim();
  if (!text) return text;

  if (/[Ãâ€]/.test(text)) {
    try {
      const repaired = Buffer.from(text, 'latin1').toString('utf8').trim();
      if (repaired && !/[Ãâ€]/.test(repaired)) {
        return repaired;
      }
    } catch {
      return text;
    }
  }

  return text;
}

function slugifyBreedKey(value) {
  return normalizeTextValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitSourceTags(validationSource) {
  if (!validationSource) return [];

  return normalizeTextValue(validationSource)
    .split(/[\/,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseCountryOrSystem(validationSource) {
  if (!validationSource) return null;

  const normalized = normalizeTextValue(validationSource);
  const match = normalized.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : normalized;
}

function formatApproxLitersNote(milkKgYr) {
  const liters = Math.round(Number(milkKgYr || 0) / KG_TO_LITER_DIVISOR);
  return `~ ${liters} L/year`;
}

function calculateEcmKgYr(milkKgYr, fatPct, proteinPct) {
  return Number(milkKgYr) * (
    ECM_FACTOR_BASE +
    (ECM_FACTOR_FAT * Number(fatPct)) +
    (ECM_FACTOR_PROTEIN * Number(proteinPct))
  );
}

function mapBreedRecord(rawBreed) {
  const breedName = normalizeTextValue(rawBreed.breed || rawBreed.breed_name);

  if (!breedName) {
    throw new Error('Breed record is missing breed name');
  }

  const validationSource = normalizeTextValue(rawBreed.validation_source);
  const milkKgYr = Number(rawBreed.milk_per_lactation_kg ?? rawBreed.milk_kg_yr);
  const fatPct = Number(rawBreed.fat_pct);
  const proteinPct = Number(rawBreed.protein_pct);
  const lactDaysAvg = Number(rawBreed.lactation_days_avg ?? rawBreed.lact_days_avg);
  const lactationsLifetimeAvg = Number(rawBreed.lactations_per_life_avg ?? rawBreed.lactations_lifetime_avg);

  if ([milkKgYr, fatPct, proteinPct, lactDaysAvg, lactationsLifetimeAvg].some((value) => Number.isNaN(value))) {
    throw new Error(`Breed "${breedName}" contains invalid numeric fields`);
  }

  const fatKgYr = Number(rawBreed.fat_kg_per_lactation ?? (milkKgYr * (fatPct / 100)));
  const proteinKgYr = Number(rawBreed.protein_kg_per_lactation ?? (milkKgYr * (proteinPct / 100)));
  const fatPlusProteinPct = Number((fatPct + proteinPct).toFixed(4));
  const fatPlusProteinKgYr = Number(rawBreed.fat_plus_protein_kg_per_lactation ?? (fatKgYr + proteinKgYr));
  const ecmKgYr = Number(rawBreed.ecm_per_lactation_kg ?? calculateEcmKgYr(milkKgYr, fatPct, proteinPct));
  const ecmKgLifetime = Number(rawBreed.lifetime?.ecm_kg ?? (ecmKgYr * lactationsLifetimeAvg));

  return {
    breed_name: breedName,
    breed_key: rawBreed.breed_key || slugifyBreedKey(breedName),
    country_or_system: parseCountryOrSystem(validationSource),
    source_tags: Array.isArray(rawBreed.source_tags)
      ? rawBreed.source_tags.map((tag) => normalizeTextValue(tag))
      : splitSourceTags(validationSource),
    notes: normalizeTextValue(rawBreed.notes) || validationSource || null,
    milk_kg_yr: Number(milkKgYr.toFixed(4)),
    fat_pct: Number(fatPct.toFixed(4)),
    protein_pct: Number(proteinPct.toFixed(4)),
    lact_days_avg: Number(lactDaysAvg.toFixed(4)),
    lactations_lifetime_avg: Number(lactationsLifetimeAvg.toFixed(4)),
    fat_kg_yr: Number(fatKgYr.toFixed(4)),
    protein_kg_yr: Number(proteinKgYr.toFixed(4)),
    fat_plus_protein_pct: Number(fatPlusProteinPct.toFixed(4)),
    fat_plus_protein_kg_yr: Number(fatPlusProteinKgYr.toFixed(4)),
    ecm_kg_yr: Number(ecmKgYr.toFixed(4)),
    ecm_kg_lifetime: Number(ecmKgLifetime.toFixed(4)),
    approx_liters_note: normalizeTextValue(rawBreed.approx_liters_note) || formatApproxLitersNote(milkKgYr),
    image_asset_key: normalizeTextValue(rawBreed.image_asset_key) || slugifyBreedKey(breedName)
  };
}

function readBreedSourceFile(sourceFilePath) {
  const rawContent = readFileSync(sourceFilePath, 'utf8');
  const parsed = JSON.parse(rawContent);
  const breeds = Array.isArray(parsed) ? parsed : parsed.breeds;

  if (!Array.isArray(breeds) || breeds.length === 0) {
    throw new Error('Breed source file does not contain a valid breeds array');
  }

  return parsed;
}

function buildBreedReferenceRows(sourceDocument) {
  const breeds = Array.isArray(sourceDocument) ? sourceDocument : sourceDocument.breeds;
  return breeds.map(mapBreedRecord);
}

function formatPgArrayLiteral(items) {
  return `{${items.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(',')}}`;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value)
    ? formatPgArrayLiteral(value)
    : (typeof value === 'string' ? value : String(value));
  const needsQuotes = /[",\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function serializeRowsToCsv(rows) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))
  ];

  return `${lines.join('\n')}\n`;
}

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function formatSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (Array.isArray(value)) {
    const members = value.map((item) => `'${escapeSqlString(item)}'`).join(', ');
    return `ARRAY[${members}]::text[]`;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${escapeSqlString(value)}'`;
}

function serializeRowsToInsertSql(rows, tableName = 'public.breed_reference') {
  if (!rows.length) {
    return `-- No rows to insert into ${tableName}\n`;
  }

  const headers = Object.keys(rows[0]);
  const valuesSql = rows
    .map((row) => `  (${headers.map((header) => formatSqlValue(row[header])).join(', ')})`)
    .join(',\n');

  return [
    `TRUNCATE TABLE ${tableName} CASCADE;`,
    '',
    `INSERT INTO ${tableName} (`,
    `  ${headers.join(', ')}`,
    ') VALUES',
    valuesSql,
    ';',
    ''
  ].join('\n');
}

export {
  buildBreedReferenceRows,
  readBreedSourceFile,
  serializeRowsToCsv,
  serializeRowsToInsertSql
};
