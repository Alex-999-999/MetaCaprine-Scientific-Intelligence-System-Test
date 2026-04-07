/**
 * Shared TABLA MAESTRA M4 CSV parsing (European number format).
 * Used by parse-m4-master-csv.js and reconcile-m4-csv.js.
 */

export function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Spanish / Excel: $ 1.308,63 → 1308.63 */
export function parseMoneyOrNumber(raw) {
  if (raw == null || raw === '') return null;
  let t = String(raw).trim();
  if (!t || t === ',') return null;
  t = t.replace(/\$/g, '').replace(/\s/g, '');
  if (t.endsWith('%')) return null;
  if (t.includes('.') && t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function parsePercent(raw) {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim().replace(/\s/g, '').replace('%', '');
  if (!t) return null;
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n / 100 : null;
}

export function rowToBreed(cells) {
  const name = (cells[0] || '').trim();
  if (!name) return null;

  const milk = parseMoneyOrNumber(cells[1]);
  const days = parseMoneyOrNumber(cells[2]);
  if (milk == null || days == null) return null;

  const fatPct = parseMoneyOrNumber(cells[3]);
  const fatKg = parseMoneyOrNumber(cells[4]);
  const protPct = parseMoneyOrNumber(cells[5]);
  const protKg = parseMoneyOrNumber(cells[6]);
  const fatProtKg = parseMoneyOrNumber(cells[7]);
  const ecmLact = parseMoneyOrNumber(cells[8]);
  const lactLife = parseMoneyOrNumber(cells[9]);

  const validation = (cells[10] || '').trim() || null;
  const lifeMilk = parseMoneyOrNumber(cells[11]);
  const lifeFat = parseMoneyOrNumber(cells[12]);
  const lifeProt = parseMoneyOrNumber(cells[13]);
  const lifeFatProt = parseMoneyOrNumber(cells[14]);
  const ecmLife = parseMoneyOrNumber(cells[15]);

  const region = (cells[16] || '').trim() || null;
  const suggested = (cells[17] || '').trim() || null;

  const milkCost = parseMoneyOrNumber(cells[18]);
  const milkPrice = parseMoneyOrNumber(cells[19]);
  const milkMargin = parseMoneyOrNumber(cells[20]);
  const cheeseYield = parseMoneyOrNumber(cells[21]);
  const lifeCheese = parseMoneyOrNumber(cells[22]);
  const cheeseCostMilk = parseMoneyOrNumber(cells[23]);

  const chP1 = parseMoneyOrNumber(cells[24]);
  const chPack1 = parseMoneyOrNumber(cells[25]);
  const chMar1 = parseMoneyOrNumber(cells[26]);
  const chP2 = parseMoneyOrNumber(cells[27]);
  const chPack2 = parseMoneyOrNumber(cells[28]);
  const chMar2 = parseMoneyOrNumber(cells[29]);
  const chP3 = parseMoneyOrNumber(cells[30]);
  const chPack3 = parseMoneyOrNumber(cells[31]);
  const chMar3 = parseMoneyOrNumber(cells[32]);

  const daughters = parseMoneyOrNumber(cells[33]);
  const femRatio = parseMoneyOrNumber(cells[34]);
  const femVal = parseMoneyOrNumber(cells[35]);
  const acq = parseMoneyOrNumber(cells[36]);
  const raise = parseMoneyOrNumber(cells[37]);
  const repl = parsePercent(cells[38]);
  const mort = parsePercent(cells[39]);
  const capRef = parseMoneyOrNumber(cells[40]);

  return {
    name,
    milk_per_lactation_kg: milk,
    lactation_days: Math.round(days),
    fat_pct: fatPct ?? 0,
    fat_kg: fatKg ?? 0,
    protein_pct: protPct ?? 0,
    protein_kg: protKg ?? 0,
    fat_protein_kg: fatProtKg ?? 0,
    ecm_per_lactation_kg: ecmLact ?? 0,
    avg_lifetime_lactations: lactLife ?? 0,
    validation_source: validation,
    lifetime_milk_kg: lifeMilk ?? 0,
    lifetime_fat_kg: lifeFat ?? 0,
    lifetime_protein_kg: lifeProt ?? 0,
    lifetime_fat_protein_kg: lifeFatProt ?? 0,
    ecm_lifetime_total_kg: ecmLife ?? 0,
    region,
    suggested_system: suggested,
    milk_cost_per_liter: milkCost ?? 0,
    milk_sale_price_per_liter: milkPrice ?? 0,
    raw_milk_margin_per_liter: milkMargin ?? 0,
    cheese_yield_liters_per_kg: cheeseYield ?? 0,
    lifetime_cheese_kg: lifeCheese ?? 0,
    cheese_cost_from_milk_per_kg: cheeseCostMilk ?? 0,
    cheese_price_c1: chP1 ?? 0,
    cheese_cost_pack_c1: chPack1 ?? 0,
    cheese_margin_c1: chMar1 ?? 0,
    cheese_price_c2: chP2 ?? 0,
    cheese_cost_pack_c2: chPack2 ?? 0,
    cheese_margin_c2: chMar2 ?? 0,
    cheese_price_c3: chP3 ?? 0,
    cheese_cost_pack_c3: chPack3 ?? 0,
    cheese_margin_c3: chMar3 ?? 0,
    daughters_per_life: daughters ?? 0,
    female_ratio: femRatio ?? 0.5,
    female_value: femVal ?? 0,
    acquisition_logistics_cost: acq ?? 0,
    raising_cost: raise ?? 0,
    replacement_pct: repl ?? 0,
    mortality_pct: mort ?? 0,
    cap_reference: capRef,
  };
}

/** Column indices on TABLA MAESTRA row 1 after CAP (0-based): five scenario net results. */
export const CSV_SCENARIO_NET_COL = {
  s1: 41,
  s2: 42,
  s3_c1: 43,
  s3_c2: 44,
  s3_c3: 45,
};
