export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'CAD',
  'MXN',
  'COP',
  'ARS',
  'CLP',
  'PEN',
  'BRL',
  'UYU',
];

const FALLBACK_CURRENCY = 'USD';

export function normalizeCurrency(currencyCode) {
  const code = String(currencyCode || '').toUpperCase();
  return SUPPORTED_CURRENCIES.includes(code) ? code : FALLBACK_CURRENCY;
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatCurrency(value, currencyCode = FALLBACK_CURRENCY, options = {}) {
  const currency = normalizeCurrency(currencyCode);
  const amount = normalizeNumber(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch (error) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: FALLBACK_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  }
}

export function formatCurrencyCompact(value, currencyCode = FALLBACK_CURRENCY, options = {}) {
  const currency = normalizeCurrency(currencyCode);
  const amount = normalizeNumber(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      ...options,
    }).format(amount);
  } catch (error) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: FALLBACK_CURRENCY,
      notation: 'compact',
      maximumFractionDigits: 1,
      ...options,
    }).format(amount);
  }
}

export function getCurrencySymbol(currencyCode = FALLBACK_CURRENCY) {
  const currency = normalizeCurrency(currencyCode);
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const currencyPart = parts.find((part) => part.type === 'currency');
    return currencyPart ? currencyPart.value : '$';
  } catch (error) {
    return '$';
  }
}
