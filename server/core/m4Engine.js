/**
 * Module 4: La Cabra como Inversión — Calculation Engine
 *
 * All economic logic lives here. No component should duplicate these formulas.
 *
 * Glossary:
 *   CAP  – Costo real del Activo Productivo
 *   ROI  – Retorno sobre la inversión (lifetime)
 *   S1   – Escenario: solo leche
 *   S2   – Escenario: leche + hijas
 *   S3   – Escenarios: queso + hijas por canal (C1, C2, C3)
 */

const HORIZON_YEARS = 5;

// ── CAP ────────────────────────────────────────────────────────────────────────
export function calculateCAP(acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct) {
  if (mortalityPct >= 1) return 0;
  return ((acquisitionLogisticsCost + raisingCost) / (1 - mortalityPct)) * (1 + replacementPct);
}

// ── Hijas ──────────────────────────────────────────────────────────────────────
export function calculateFemaleDaughters(daughtersPerLife, femaleRatio) {
  return daughtersPerLife * femaleRatio;
}

// ── Escenarios ─────────────────────────────────────────────────────────────────
export function calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap) {
  return (lifetimeMilkKg * milkMarginPerLiter) - cap;
}

export function calculateScenarioS2(lifetimeMilkKg, milkMarginPerLiter, femaleDaughters, femaleValue, cap) {
  return (lifetimeMilkKg * milkMarginPerLiter) + (femaleDaughters * femaleValue) - cap;
}

export function calculateScenarioS3(femaleDaughters, femaleValue, lifetimeCheeseKg, cheeseMargin, cap) {
  return (femaleDaughters * femaleValue) + (lifetimeCheeseKg * cheeseMargin) - cap;
}

// ── KPIs ───────────────────────────────────────────────────────────────────────
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

// ── Recovery Curve ─────────────────────────────────────────────────────────────
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

// ── Scenario status label ──────────────────────────────────────────────────────
export function getScenarioStatus(payback) {
  if (payback === null) return 'no_recovery';
  if (payback < 2) return 'fast';
  if (payback < 4) return 'healthy';
  if (payback < 6) return 'slow';
  return 'weak';
}

// ── Best scenario selector ─────────────────────────────────────────────────────
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

// ── Full M4 computation for one breed ──────────────────────────────────────────
export function calculateM4(breed, overrides = {}) {
  const v = (field) => {
    const ov = overrides[field];
    if (ov !== null && ov !== undefined && ov !== '') return Number(ov);
    return Number(breed[field]) || 0;
  };

  const acquisitionLogisticsCost = v('acquisition_logistics_cost');
  const raisingCost = v('raising_cost');
  const mortalityPct = v('mortality_pct');
  const replacementPct = v('replacement_pct');

  const cap = calculateCAP(acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct);

  const lifetimeMilkKg = Number(breed.lifetime_milk_kg) || 0;
  const lifetimeCheeseKg = Number(breed.lifetime_cheese_kg) || 0;

  const milkMarginPerLiter = v('raw_milk_margin_per_liter');
  const cheeseMarginC1 = v('cheese_margin_c1');
  const cheeseMarginC2 = v('cheese_margin_c2');
  const cheeseMarginC3 = v('cheese_margin_c3');

  const daughtersPerLife = v('daughters_per_life');
  const femaleRatio = v('female_ratio');
  const femaleValue = v('female_value');
  const femaleDaughters = calculateFemaleDaughters(daughtersPerLife, femaleRatio);

  const s1 = calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap);
  const s2 = calculateScenarioS2(lifetimeMilkKg, milkMarginPerLiter, femaleDaughters, femaleValue, cap);
  const s3_c1 = calculateScenarioS3(femaleDaughters, femaleValue, lifetimeCheeseKg, cheeseMarginC1, cap);
  const s3_c2 = calculateScenarioS3(femaleDaughters, femaleValue, lifetimeCheeseKg, cheeseMarginC2, cap);
  const s3_c3 = calculateScenarioS3(femaleDaughters, femaleValue, lifetimeCheeseKg, cheeseMarginC3, cap);

  const scenarioResults = { s1, s2, s3_c1, s3_c2, s3_c3 };
  const bestScenarioKey = getBestScenarioKey(scenarioResults);
  const bestScenarioValue = scenarioResults[bestScenarioKey] ?? 0;

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
    femaleDaughters,
    scenarios: {
      s1: kpis(s1),
      s2: kpis(s2),
      s3_c1: kpis(s3_c1),
      s3_c2: kpis(s3_c2),
      s3_c3: kpis(s3_c3),
    },
    bestScenarioKey,
    bestScenarioValue,
    lifetimeMilkKg,
    lifetimeCheeseKg,
    milkPerLactation: Number(breed.milk_per_lactation_kg) || 0,
  };
}
