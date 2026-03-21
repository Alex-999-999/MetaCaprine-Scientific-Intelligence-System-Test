const BREEDS_BASE_PATH = '/breeds';

export const BRAND_ASSETS = Object.freeze({
  logo: '/logo.png',
  goatMirabella: '/assets/cabra_mirabella.png',
  welcomeHero: '/assets/welcome_official_hr.png',
});

export const BREED_DEFAULT_IMAGE = `${BREEDS_BASE_PATH}/Mestiza.png`;

const BREED_IMAGE_FILENAME_BY_CANONICAL_KEY = Object.freeze({
  dutch: 'Dutch.png',
  saanen_americana: 'SAANENAmericana.png',
  saanen_francesa: 'SaanenFrancesa.png',
  saanen_generica: 'SaanenGenerica.png',
  alpine_americana: 'ALPINE.png',
  alpine_francesa: 'AlpineFrancesa.png',
  alpine_generica: 'AlpineGenerica.png',
  british_alpine: 'BristishAlpine.png',
  lamancha: 'LAMANCHA.png',
  toggenburg: 'TOGGUNBURG.png',
  sable: 'Sable.png',
  florida: 'FLORIDA.png',
  poitevine: 'POITEVINE.png',
  murciana: 'MURCIANA.png',
  malaguena: 'MALAGUENA.png',
  oberhasli: 'Oberhasli.png',
  nubian: 'NUBIAN.png',
  majorera: 'MAJORERA.png',
  serrana: 'Serrana.png',
  nigerian_dwarf: 'NigerianDwarf.PNG',
  mestiza: 'Mestiza.png',
  criolla_generica: 'Criollagenerica.png',
  criolla_argentina: 'Criollaargentina.png',
  criolla_mexicana: 'CriollaMexicana.png',
  criolla_colombiana: 'Criollacolombiana.png',
  criolla_venezolana: 'CriollaVenezolana.png',
  criolla_peruana: 'CriollaPeruana.png',
});

const MIRRORED_BREED_CANONICAL_KEYS = new Set([
  'alpine_francesa',
  'saanen_francesa',
  'saanen_generica',
]);

const BREED_ALIAS_TO_CANONICAL = Object.freeze({
  dutch: 'dutch',
  holandesa: 'dutch',

  saanen: 'saanen_generica',
  'saanen americana': 'saanen_americana',
  'saanen francesa': 'saanen_francesa',
  'saanen generica': 'saanen_generica',

  alpine: 'alpine_americana',
  alpina: 'alpine_americana',
  'alpina americana': 'alpine_americana',
  'alpina francesa': 'alpine_francesa',
  'alpina generica': 'alpine_generica',
  'alpina britanica': 'british_alpine',
  'british alpine': 'british_alpine',

  lamancha: 'lamancha',
  'la mancha': 'lamancha',
  'la-mancha': 'lamancha',

  toggenburg: 'toggenburg',
  'toggenburg americana': 'toggenburg',

  sable: 'sable',
  florida: 'florida',
  poitevine: 'poitevine',

  'murciano granadina': 'murciana',
  'murciano-granadina': 'murciana',
  murciana: 'murciana',

  malaguena: 'malaguena',
  oberhasli: 'oberhasli',
  nubian: 'nubian',
  nubia: 'nubian',
  majorera: 'majorera',
  serrana: 'serrana',
  nigerian: 'nigerian_dwarf',
  'nigerian dwarf': 'nigerian_dwarf',

  mestiza: 'mestiza',
  'mestiza generica': 'mestiza',

  criolla: 'criolla_generica',
  'criolla generica': 'criolla_generica',
  'criolla argentina': 'criolla_argentina',
  'criolla mexicana': 'criolla_mexicana',
  'criolla colombiana': 'criolla_colombiana',
  'criolla venezolana': 'criolla_venezolana',
  'criolla peruana': 'criolla_peruana',
});

const BREED_ALIAS_KEYS_SORTED = Object.keys(BREED_ALIAS_TO_CANONICAL).sort((a, b) => b.length - a.length);

const BREED_CANONICAL_BY_COLLAPSED = Object.freeze(
  Object.fromEntries(
    Object.keys(BREED_IMAGE_FILENAME_BY_CANONICAL_KEY).map((canonicalKey) => [
      canonicalKey.replace(/_/g, ''),
      canonicalKey,
    ])
  )
);

const BREED_CANONICAL_BY_COLLAPSED_ALIAS = Object.freeze(
  Object.fromEntries(
    Object.entries(BREED_ALIAS_TO_CANONICAL).map(([alias, canonicalKey]) => [
      alias.replace(/\s+/g, ''),
      canonicalKey,
    ])
  )
);

function normalizeLookup(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toBreedImagePath(fileName) {
  return `${BREEDS_BASE_PATH}/${fileName}`;
}

function resolveCanonicalBreedKey(token) {
  const normalized = normalizeLookup(token);
  if (!normalized) return null;

  if (BREED_ALIAS_TO_CANONICAL[normalized]) {
    return BREED_ALIAS_TO_CANONICAL[normalized];
  }

  const underscoreVariant = normalized.replace(/\s+/g, '_');
  if (BREED_IMAGE_FILENAME_BY_CANONICAL_KEY[underscoreVariant]) {
    return underscoreVariant;
  }

  const collapsed = normalized.replace(/\s+/g, '');
  if (BREED_CANONICAL_BY_COLLAPSED[collapsed]) {
    return BREED_CANONICAL_BY_COLLAPSED[collapsed];
  }

  if (BREED_CANONICAL_BY_COLLAPSED_ALIAS[collapsed]) {
    return BREED_CANONICAL_BY_COLLAPSED_ALIAS[collapsed];
  }

  return null;
}

function resolveImagePathFromAssetKey(imageAssetKey) {
  if (!imageAssetKey) return null;

  const raw = String(imageAssetKey).trim();
  if (!raw) return null;

  if (raw.startsWith('/breeds/')) {
    return raw;
  }
  if (raw.startsWith('breeds/')) {
    return `/${raw}`;
  }

  const rawFileName = raw.split('/').pop();
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(rawFileName)) {
    return toBreedImagePath(rawFileName);
  }

  const canonicalKey = resolveCanonicalBreedKey(raw);
  if (!canonicalKey) return null;

  const fileName = BREED_IMAGE_FILENAME_BY_CANONICAL_KEY[canonicalKey];
  return fileName ? toBreedImagePath(fileName) : null;
}

function resolveCanonicalFromAssetKey(imageAssetKey) {
  if (!imageAssetKey) return null;

  const raw = String(imageAssetKey).trim();
  if (!raw) return null;

  const rawFileName = raw.split('/').pop();
  const rawFileNameWithoutExt = rawFileName.replace(/\.[^.]+$/, '');

  return (
    resolveCanonicalBreedKey(raw) ||
    resolveCanonicalBreedKey(rawFileName) ||
    resolveCanonicalBreedKey(rawFileNameWithoutExt)
  );
}

function resolveImagePathFromBreedName(breedName) {
  const normalizedName = normalizeLookup(breedName);
  if (!normalizedName) return null;

  const exactCanonical = resolveCanonicalBreedKey(normalizedName);
  if (exactCanonical) {
    const fileName = BREED_IMAGE_FILENAME_BY_CANONICAL_KEY[exactCanonical];
    if (fileName) return toBreedImagePath(fileName);
  }

  for (const alias of BREED_ALIAS_KEYS_SORTED) {
    if (normalizedName.includes(alias)) {
      const canonicalKey = BREED_ALIAS_TO_CANONICAL[alias];
      const fileName = BREED_IMAGE_FILENAME_BY_CANONICAL_KEY[canonicalKey];
      if (fileName) return toBreedImagePath(fileName);
    }
  }

  return null;
}

export function resolveBreedImagePath({ breedName, imageAssetKey } = {}) {
  return (
    resolveImagePathFromAssetKey(imageAssetKey) ||
    resolveImagePathFromBreedName(breedName) ||
    BREED_DEFAULT_IMAGE
  );
}

export function shouldMirrorBreedImage({ breedName, imageAssetKey } = {}) {
  const canonicalKey =
    resolveCanonicalFromAssetKey(imageAssetKey) ||
    resolveCanonicalBreedKey(breedName);

  return MIRRORED_BREED_CANONICAL_KEYS.has(canonicalKey);
}
