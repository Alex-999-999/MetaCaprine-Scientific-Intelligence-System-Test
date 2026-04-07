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

/** Optional: approximate kg per liter for UI notes (economics use kg × $/L per validated Excel). */
export const MILK_KG_PER_LITER = 1.03;

export function lifetimeMilkLitersFromKg(lifetimeMilkKg) {
  return lifetimeMilkKg / MILK_KG_PER_LITER;
}

/**
 * CAP used in scenarios/KPIs: prefer tabla maestra ("Costo ajustado final CAP") when present, else formula from components.
 */
export function resolveCapForEconomics(capReference, acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct) {
  const ref = Number(capReference);
  if (ref > 0 && Number.isFinite(ref)) return ref;
  return calculateCAP(acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct);
}

// ── CAP ────────────────────────────────────────────────────────────────────────
export function calculateCAP(acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct) {
  if (mortalityPct >= 1) return 0;
  return ((acquisitionLogisticsCost + raisingCost) / (1 - mortalityPct)) * (1 + replacementPct);
}

// ── Hijas ──────────────────────────────────────────────────────────────────────
export function calculateFemaleDaughters(daughtersPerLife, femaleRatio) {
  return daughtersPerLife * femaleRatio;
}

// ── Escenarios (alineados a TABLA MAESTRA M4 / Excel validado) ─────────────────
/** Solo leche: leche vitalicia (kg) × margen ($/L) − CAP */
export function calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap) {
  return lifetimeMilkKg * milkMarginPerLiter - cap;
}

/** Leche + venta hijas: mismo término leche que S1 + hijas/vida × valor hija − CAP */
export function calculateScenarioS2(lifetimeMilkKg, milkMarginPerLiter, daughtersPerLife, femaleValue, cap) {
  return lifetimeMilkKg * milkMarginPerLiter + daughtersPerLife * femaleValue - cap;
}

/** Queso + hijas: hijas/vida × valor hija + queso vitalicio × margen canal − CAP */
export function calculateScenarioS3(daughtersPerLife, femaleValue, lifetimeCheeseKg, cheeseMargin, cap) {
  return daughtersPerLife * femaleValue + lifetimeCheeseKg * cheeseMargin - cap;
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

/** Arithmetic mean of the five scenario nets — “escenario promedio de referencia”. */
export function getMeanScenarioValue(scenarios) {
  const vals = Object.values(scenarios).filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
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
  const capReference = v('cap_reference');

  const capComputed = calculateCAP(acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct);
  const cap = resolveCapForEconomics(capReference, acquisitionLogisticsCost, raisingCost, mortalityPct, replacementPct);

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

  const s1 = calculateScenarioS1(lifetimeMilkKg, milkMarginPerLiter, cap);
  const s2 = calculateScenarioS2(lifetimeMilkKg, milkMarginPerLiter, daughtersPerLife, femaleValue, cap);
  const s3_c1 = calculateScenarioS3(daughtersPerLife, femaleValue, lifetimeCheeseKg, cheeseMarginC1, cap);
  const s3_c2 = calculateScenarioS3(daughtersPerLife, femaleValue, lifetimeCheeseKg, cheeseMarginC2, cap);
  const s3_c3 = calculateScenarioS3(daughtersPerLife, femaleValue, lifetimeCheeseKg, cheeseMarginC3, cap);

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
    scenarios: {
      s1: kpis(s1),
      s2: kpis(s2),
      s3_c1: kpis(s3_c1),
      s3_c2: kpis(s3_c2),
      s3_c3: kpis(s3_c3),
    },
    bestScenarioKey,
    bestScenarioValue,
    meanScenarioValue,
    lifetimeMilkKg,
    lifetimeCheeseKg,
    milkPerLactation: v('milk_per_lactation_kg'),
  };
}
