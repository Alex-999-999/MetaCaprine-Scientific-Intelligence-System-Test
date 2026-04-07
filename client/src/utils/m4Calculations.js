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

/**
 * Lifetime gross sales (ventas) for the scenario mix — antes de CAP / asignación de costos fijos.
 * Leche: kg × precio venta ($/L); queso: kg × precio venta canal; hijas: hijas/vida × valor.
 */
export function grossLifetimeRevenueForScenario(breed, scenarioKey) {
  const lmk = v(breed, 'lifetime_milk_kg');
  const lck = v(breed, 'lifetime_cheese_kg');
  const milkPrice = v(breed, 'milk_sale_price_per_liter');
  const dpl = v(breed, 'daughters_per_life');
  const fv = v(breed, 'female_value');
  const milkGross = lmk * milkPrice;
  const daughterGross = dpl * fv;
  if (scenarioKey === 's1') return milkGross;
  if (scenarioKey === 's2') return milkGross + daughterGross;
  const priceField =
    scenarioKey === 's3_c1' ? 'cheese_price_c1' : scenarioKey === 's3_c2' ? 'cheese_price_c2' : 'cheese_price_c3';
  const cheesePrice = v(breed, priceField);
  return daughterGross + lck * cheesePrice;
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

export function computeM4(breed, options = {}) {
  const useReferenceScenarios = options.useReferenceScenarios !== false;

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

  const s1Formula = scenarioS1(lmk, mm, cap);
  const s2Formula = scenarioS2(lmk, mm, dpl, fv, cap);
  const s3c1Formula = scenarioS3(dpl, fv, lck, cm1, cap);
  const s3c2Formula = scenarioS3(dpl, fv, lck, cm2, cap);
  const s3c3Formula = scenarioS3(dpl, fv, lck, cm3, cap);

  const chooseScenario = (formulaValue, referenceField) => {
    const rawRef = breed[referenceField];
    const ref = Number(rawRef);
    if (useReferenceScenarios && rawRef !== null && rawRef !== undefined && rawRef !== '' && Number.isFinite(ref)) {
      return ref;
    }
    return formulaValue;
  };

  const s1 = chooseScenario(s1Formula, 'scenario_s1_reference');
  const s2 = chooseScenario(s2Formula, 'scenario_s2_reference');
  const s3c1 = chooseScenario(s3c1Formula, 'scenario_s3_c1_reference');
  const s3c2 = chooseScenario(s3c2Formula, 'scenario_s3_c2_reference');
  const s3c3 = chooseScenario(s3c3Formula, 'scenario_s3_c3_reference');

  const raw = { s1, s2, s3_c1: s3c1, s3_c2: s3c2, s3_c3: s3c3 };
  const bestKey = getBestScenarioKey(raw);
  const meanScenarioValue = getMeanScenarioValue(raw);

  return {
    cap,
    capComputed,
    capReference: capRef > 0 ? capRef : null,
    scenarioSource: useReferenceScenarios ? 'master_reference' : 'calculated',
    scenarioFormulaResults: {
      s1: s1Formula,
      s2: s2Formula,
      s3_c1: s3c1Formula,
      s3_c2: s3c2Formula,
      s3_c3: s3c3Formula,
    },
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
