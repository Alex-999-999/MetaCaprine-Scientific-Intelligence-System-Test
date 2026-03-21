import { resolveBreedImagePath, shouldMirrorBreedImage as shouldMirrorBreedImageFromCatalog } from './assetCatalog';

/**
 * Resolve breed image from DB asset key (preferred) and fallback breed name.
 * @param {string} breedName
 * @param {string} imageAssetKey
 * @returns {string}
 */
export function getBreedImage(breedName, imageAssetKey) {
  return resolveBreedImagePath({ breedName, imageAssetKey });
}

export function shouldMirrorBreedImage(breedName, imageAssetKey) {
  return shouldMirrorBreedImageFromCatalog({ breedName, imageAssetKey });
}

/**
 * Get breed initials for placeholder
 * @param {string} breedName - The name of the breed
 * @returns {string} - The initials (max 2 characters)
 */
export function getBreedInitials(breedName) {
  if (!breedName) return '??';
  
  const words = breedName.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
