/**
 * M4: La Cabra como Inversión — Client-side calculation mirror.
 * Keeps the UI instant-reactive; must stay in sync with server/core/m4Engine.js.
 */

const HORIZON = 5;

/** Must match server/core/m4Engine.js */
export const MILK_KG_PER_LITER = 1.03;

export function lifetimeMilkLitersFromKg(lifetimeMilkKg) {
  return lifetimeMilkKg / MILK_KG_PER_LITER;
}

export function calculateCAP(acqLogCost, raisingCost, mortalityPct, replacementPct) {
  if (mortalityPct >= 1) return 0;
  return ((acqLogCost + raisingCost) / (1 - mortalityPct)) * (1 + replacementPct);
}

export function resolveCapForEconomics(capReference, acqLogCost, raisingCost, mortalityPct, replacementPct) {
  const ref = Number(capReference);
  if (ref > 0 && Number.isFinite(ref)) return ref;
  return calculateCAP(acqLogCost, raisingCost, mortalityPct, replacementPct);
}

export function calculateFemaleDaughters(daughtersPerLife, femaleRatio) {
  return daughtersPerLife * femaleRatio;
}

export function scenarioS1(lifetimeMilkKg, milkMargin, cap) {
  return lifetimeMilkKg * milkMargin - cap;
}

export function scenarioS2(lifetimeMilkKg, milkMargin, daughtersPerLife, femaleValue, cap) {
  return lifetimeMilkKg * milkMargin + daughtersPerLife * femaleValue - cap;
}

export function scenarioS3(daughtersPerLife, femaleValue, lifetimeCheeseKg, cheeseMargin, cap) {
  return daughtersPerLife * femaleValue + lifetimeCheeseKg * cheeseMargin - cap;
}

export function calcROI(result, cap) {
  if (!cap) return null;
  return result / cap;
}

export function calcAnnualROI(roi) {
  if (roi === null || roi === undefined) return null;
  return roi / HORIZON;
}

export function calcPayback(result, cap) {
  const flow = result / HORIZON;
  if (flow <= 0) return null;
  return cap / flow;
}

export function buildRecoveryCurve(cap, result) {
  const flow = result / HORIZON;
  return Array.from({ length: HORIZON + 1 }, (_, y) => ({
    year: y,
    value: -cap + flow * y,
  }));
}

export function getScenarioStatus(payback) {
  if (payback === null) return 'no_recovery';
  if (payback < 2) return 'fast';
  if (payback < 4) return 'healthy';
  if (payback < 6) return 'slow';
  return 'weak';
}

export function getBestScenarioKey(scenarios) {
  let bestKey = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(scenarios)) {
    if (typeof v === 'number' && v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

export function getMeanScenarioValue(scenarios) {
  const vals = Object.values(scenarios).filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function v(breed, field) {
  return Number(breed[field]) || 0;
}

function kpis(result, cap) {
  const roi = calcROI(result, cap);
  return {
    result,
    roi,
    annualROI: calcAnnualROI(roi),
    payback: calcPayback(result, cap),
    status: getScenarioStatus(calcPayback(result, cap)),
    recoveryCurve: buildRecoveryCurve(cap, result),
  };
}

export function computeM4(breed) {
  const acq = v(breed, 'acquisition_logistics_cost');
  const raise = v(breed, 'raising_cost');
  const mort = v(breed, 'mortality_pct');
  const repl = v(breed, 'replacement_pct');
  const capRef = v(breed, 'cap_reference');
  const capComputed = calculateCAP(acq, raise, mort, repl);
  const cap = resolveCapForEconomics(capRef, acq, raise, mort, repl);

  const lmk = v(breed, 'lifetime_milk_kg');
  const lck = v(breed, 'lifetime_cheese_kg');
  const mm = v(breed, 'raw_milk_margin_per_liter');
  const cm1 = v(breed, 'cheese_margin_c1');
  const cm2 = v(breed, 'cheese_margin_c2');
  const cm3 = v(breed, 'cheese_margin_c3');

  const dpl = v(breed, 'daughters_per_life');
  const fr = v(breed, 'female_ratio');
  const fv = v(breed, 'female_value');
  const fd = calculateFemaleDaughters(dpl, fr);

  const s1 = scenarioS1(lmk, mm, cap);
  const s2 = scenarioS2(lmk, mm, dpl, fv, cap);
  const s3c1 = scenarioS3(dpl, fv, lck, cm1, cap);
  const s3c2 = scenarioS3(dpl, fv, lck, cm2, cap);
  const s3c3 = scenarioS3(dpl, fv, lck, cm3, cap);

  const raw = { s1, s2, s3_c1: s3c1, s3_c2: s3c2, s3_c3: s3c3 };
  const bestKey = getBestScenarioKey(raw);
  const meanScenarioValue = getMeanScenarioValue(raw);

  return {
    cap,
    capComputed,
    capReference: capRef > 0 ? capRef : null,
    femaleDaughters: fd,
    scenarios: {
      s1: kpis(s1, cap),
      s2: kpis(s2, cap),
      s3_c1: kpis(s3c1, cap),
      s3_c2: kpis(s3c2, cap),
      s3_c3: kpis(s3c3, cap),
    },
    bestScenarioKey: bestKey,
    bestScenarioValue: raw[bestKey] ?? 0,
    meanScenarioValue,
    milkPerLactation: v(breed, 'milk_per_lactation_kg'),
    lifetimeMilkKg: lmk,
    lifetimeCheeseKg: lck,
  };
}
