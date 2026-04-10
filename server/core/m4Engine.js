/**
 * Module 4 economic engine.
 * Keeps formula logic centralized for backend and client sync.
 */

const HORIZON_YEARS = 5;

/** Optional conversion for pedagogy notes only. */
export const MILK_KG_PER_LITER = 1.03;

export function lifetimeMilkLitersFromKg(lifetimeMilkKg) {
  return lifetimeMilkKg / MILK_KG_PER_LITER;
}

/** CAP definition (updated): acquisition + logistics + raising only. */
export function calculateCAP(acquisitionLogisticsCost, raisingCost) {
  return acquisitionLogisticsCost + raisingCost;
}

/** Prefer explicit CAP reference from dataset when present. */
export function resolveCapForEconomics(capReference, acquisitionLogisticsCost, raisingCost) {
  const ref = Number(capReference);
  if (ref > 0 && Number.isFinite(ref)) return ref;
  return calculateCAP(acquisitionLogisticsCost, raisingCost);
}

export function calculateFemaleDaughters(daughtersPerLife, femaleRatio) {
  return daughtersPerLife * femaleRatio;
}

/**
 * Replacement and mortality apply only to scenarios that include daughters.
 * Effective daughters sale value = gross daughters value - replacement reserve - mortality reserve.
 */
export function calculateAdjustedDaughterRevenue(
  daughtersPerLife,
  femaleValue,
  replacementPct = 0.2,
  mortalityPct = 0.08,
) {
  const gross = daughtersPerLife * femaleValue;
  const repl = Number.isFinite(replacementPct) ? Math.max(0, replacementPct) : 0.2;
  const mort = Number.isFinite(mortalityPct) ? Math.max(0, mortalityPct) : 0.08;
  const adjusted = gross * (1 - repl - mort);
  return Math.max(0, adjusted);
}

/** Milk only scenario. */
export function calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap) {
  return lifetimeMilkKg * milkMarginPerLiter - cap;
}

/** Milk + daughters scenario. */
export function calculateScenarioS2(
  lifetimeMilkKg,
  milkMarginPerLiter,
  daughtersPerLife,
  femaleValue,
  replacementPct,
  mortalityPct,
  cap,
) {
  const daughtersRevenue = calculateAdjustedDaughterRevenue(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
  );
  return lifetimeMilkKg * milkMarginPerLiter + daughtersRevenue - cap;
}

/** Cheese + daughters scenario by channel. */
export function calculateScenarioS3(
  daughtersPerLife,
  femaleValue,
  replacementPct,
  mortalityPct,
  lifetimeCheeseKg,
  cheeseMargin,
  cap,
) {
  const daughtersRevenue = calculateAdjustedDaughterRevenue(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
  );
  return daughtersRevenue + lifetimeCheeseKg * cheeseMargin - cap;
}

export function calculateROI(scenarioResult, cap) {
  if (!cap || cap === 0) return null;
  return scenarioResult / cap;
}

export function calculateAnnualROI(roi) {
  if (roi === null || roi === undefined) return null;
  return roi / HORIZON_YEARS;
}

export function calculatePayback(scenarioResult, cap) {
  const annualFlow = scenarioResult / HORIZON_YEARS;
  if (annualFlow <= 0) return null;
  return cap / annualFlow;
}

export function buildRecoveryCurve(cap, scenarioResult) {
  const annualFlow = scenarioResult / HORIZON_YEARS;
  const points = [];
  for (let year = 0; year <= HORIZON_YEARS; year++) {
    points.push({
      year,
      value: -cap + annualFlow * year,
    });
  }
  return points;
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
  let bestValue = -Infinity;
  for (const [key, result] of Object.entries(scenarios)) {
    if (typeof result === 'number' && result > bestValue) {
      bestValue = result;
      bestKey = key;
    }
  }
  return bestKey;
}

export function getMeanScenarioValue(scenarios) {
  const vals = Object.values(scenarios).filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function calculateM4(breed, overrides = {}) {
  const useReferenceScenarios = Object.keys(overrides || {}).length === 0;

  const v = (field) => {
    const ov = overrides[field];
    if (ov !== null && ov !== undefined && ov !== '') return Number(ov);
    return Number(breed[field]) || 0;
  };

  const acquisitionLogisticsCost = v('acquisition_logistics_cost');
  const raisingCost = v('raising_cost');
  const mortalityPct = v('mortality_pct');
  const replacementPct = v('replacement_pct');
  const capReference = v('cap_reference');

  const capComputed = calculateCAP(acquisitionLogisticsCost, raisingCost);
  const cap = resolveCapForEconomics(capReference, acquisitionLogisticsCost, raisingCost);

  const lifetimeMilkKg = v('lifetime_milk_kg');
  const lifetimeCheeseKg = v('lifetime_cheese_kg');

  const milkMarginPerLiter = v('raw_milk_margin_per_liter');
  const cheeseMarginC1 = v('cheese_margin_c1');
  const cheeseMarginC2 = v('cheese_margin_c2');
  const cheeseMarginC3 = v('cheese_margin_c3');

  const daughtersPerLife = v('daughters_per_life');
  const femaleRatio = v('female_ratio');
  const femaleValue = v('female_value');
  const femaleDaughters = calculateFemaleDaughters(daughtersPerLife, femaleRatio);
  const adjustedDaughterRevenue = calculateAdjustedDaughterRevenue(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
  );

  const s1Formula = calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap);
  const s2Formula = calculateScenarioS2(
    lifetimeMilkKg,
    milkMarginPerLiter,
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
    cap,
  );
  const s3C1Formula = calculateScenarioS3(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
    lifetimeCheeseKg,
    cheeseMarginC1,
    cap,
  );
  const s3C2Formula = calculateScenarioS3(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
    lifetimeCheeseKg,
    cheeseMarginC2,
    cap,
  );
  const s3C3Formula = calculateScenarioS3(
    daughtersPerLife,
    femaleValue,
    replacementPct,
    mortalityPct,
    lifetimeCheeseKg,
    cheeseMarginC3,
    cap,
  );

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
  const s3_c1 = chooseScenario(s3C1Formula, 'scenario_s3_c1_reference');
  const s3_c2 = chooseScenario(s3C2Formula, 'scenario_s3_c2_reference');
  const s3_c3 = chooseScenario(s3C3Formula, 'scenario_s3_c3_reference');

  const scenarioResults = { s1, s2, s3_c1, s3_c2, s3_c3 };
  const bestScenarioKey = getBestScenarioKey(scenarioResults);
  const bestScenarioValue = scenarioResults[bestScenarioKey] ?? 0;
  const meanScenarioValue = getMeanScenarioValue(scenarioResults);

  function kpis(result) {
    const roi = calculateROI(result, cap);
    const annualROI = calculateAnnualROI(roi);
    const payback = calculatePayback(result, cap);
    return {
      result,
      roi,
      annualROI,
      payback,
      status: getScenarioStatus(payback),
      recoveryCurve: buildRecoveryCurve(cap, result),
    };
  }

  return {
    breed_id: breed.id,
    breed_name: breed.name || breed.breed_name,
    cap,
    capComputed,
    capReference: capReference > 0 ? capReference : null,
    femaleDaughters,
    adjustedDaughterRevenue,
    scenarios: {
      s1: kpis(s1),
      s2: kpis(s2),
      s3_c1: kpis(s3_c1),
      s3_c2: kpis(s3_c2),
      s3_c3: kpis(s3_c3),
    },
    scenarioSource: useReferenceScenarios ? 'dataset_reference' : 'calculated',
    scenarioFormulaResults: {
      s1: s1Formula,
      s2: s2Formula,
      s3_c1: s3C1Formula,
      s3_c2: s3C2Formula,
      s3_c3: s3C3Formula,
    },
    bestScenarioKey,
    bestScenarioValue,
    meanScenarioValue,
    lifetimeMilkKg,
    lifetimeCheeseKg,
    milkPerLactation: v('milk_per_lactation_kg'),
  };
}
