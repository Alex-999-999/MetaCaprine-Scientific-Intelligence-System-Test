# Step 13 - Image and Icon Replacement Readiness

Date: 2026-03-13  
Scope: HITO 2 requirement point 15 + `What to do.md` section 13

## Objective

Prepare the project so goat images and core visual assets can be replaced quickly, without code hunting across multiple files.

## Implemented

### 1) Centralized visual asset catalog

File:
- `client/src/utils/assetCatalog.js`

What is centralized now:
- Brand asset path:
  - `BRAND_ASSETS.logo`
- Breed image resolution:
  - canonical map (`canonical_key -> filename`)
  - alias map (`breed name variants -> canonical_key`)
  - fallback image
  - resolver with priority:
    1. `image_asset_key` (preferred)
    2. breed name alias matching
    3. default fallback

Behavior supported by resolver:
- `image_asset_key` as `/breeds/file.png`
- `image_asset_key` as `breeds/file.png`
- `image_asset_key` as direct filename (`file.png`)
- canonical/alias style keys (`saanen_americana`, `Saanen Americana`, etc.)

### 2) Breed image helper refactor

File:
- `client/src/utils/breedImages.js`

Changes:
- Removed scattered hardcoded `/breeds/...` rules from helper.
- Helper now delegates to centralized catalog resolver.

### 3) Module 3 integration with DB asset key

File:
- `client/src/components/modules/Module3Lactation.jsx`

Changes:
- Updated image calls to pass both values:
  - `getBreedImage(breed_name, image_asset_key)`

Result:
- When DB provides `image_asset_key`, it is now the first-class source.
- Breed-name matching remains as fallback for compatibility.

### 4) Removed scattered brand logo paths

Files:
- `client/src/components/Layout.jsx`
- `client/src/components/Login.jsx`
- `client/src/components/OnboardingModal.jsx`

Changes:
- Replaced literal `"/logo.png"` usages with `BRAND_ASSETS.logo`.

## Replacement Process (for future image deliveries)

### Naming

- Preferred DB convention for `image_asset_key`:
  - canonical snake case, example: `saanen_americana`
- Also accepted:
  - direct filename, example: `SaanenFrancesa.png`
  - full public path, example: `/breeds/SaanenFrancesa.png`

### File location

- Place breed images in:
  - `client/public/breeds/`

### File formats

- Accepted by resolver:
  - `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

### Recommended visual specs

- Aspect ratio: `4:3` (recommended for current Module 3 cards/modals)
- Suggested minimum: `1200x900`
- Keep subject centered with safe margins to avoid cropping in `object-fit: cover`.

### Update flow for new images

1. Add files to `client/public/breeds/`.
2. If needed, add/adjust canonical or alias entries in:
   - `client/src/utils/assetCatalog.js`
3. For DB-driven mapping, store `image_asset_key` in `breed_reference.image_asset_key`.
4. Validate Module 3 ranking cards and breed detail modal.
5. Run client build.

## Validation

- Confirmed no direct `/breeds/...` usage outside asset catalog.
- Confirmed no direct `/logo.png` usage outside asset catalog.
- Confirmed Module 3 image calls now include `image_asset_key`.
