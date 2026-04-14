/** Module 4: max fraction digits for inputs, outputs, and charts */
export const M4_MAX_DECIMALS = 2;

export function m4Round(value, maxDecimals = M4_MAX_DECIMALS) {
  const num = Number(value);
  if (!Number.isFinite(num)) return num;
  const md = Math.min(maxDecimals, M4_MAX_DECIMALS);
  const f = 10 ** md;
  return Math.round(num * f) / f;
}

/**
 * Locale number string with at most `fractionDigits` decimal places (capped at 2).
 */
export function m4Fmt(n, fractionDigits = M4_MAX_DECIMALS) {
  const d = Math.min(Math.max(0, fractionDigits), M4_MAX_DECIMALS);
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

export function m4FmtMoney(n, fractionDigits = M4_MAX_DECIMALS) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  const d = Math.min(Math.max(0, fractionDigits), M4_MAX_DECIMALS);
  const s = Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
  return `$${s}`;
}

/** Ratio in 0..1 → percent string, max 2 fraction digits */
export function m4FmtRatioPct(n, fractionDigits = M4_MAX_DECIMALS) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  const d = Math.min(Math.max(0, fractionDigits), M4_MAX_DECIMALS);
  return `${(Number(n) * 100).toFixed(d)}%`;
}

/** Compact $ for chart axes / ticks (max 2 decimals) */
export function m4CompactMoney(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const d = M4_MAX_DECIMALS;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(d)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(d)}k`;
  return m4FmtMoney(v, d);
}
