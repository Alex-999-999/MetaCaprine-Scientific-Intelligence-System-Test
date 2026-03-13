# Step 15 - Execution Plan by Phases (Status)

Date: 2026-03-13  
Scope: HITO 2 `What to do.md` section 15

## Objective

Close the phase-based execution plan (A-F) with verifiable status and evidence.

## Phase A - Baseline technical stabilization

Status: COMPLETE

- `local baseline fully functional`  
  Evidence:
  - Client production build passes (`npm.cmd --prefix client run build`)
  - Server syntax checks pass (`node --check` on main routes/services/middleware)

- `migrations verified`  
  Evidence:
  - Core migration files include required HITO 2 structures:
    - `server/db/hito2_auth_rbac_migration.sql`
    - `server/db/complete_migration.sql`
    - `server/db/schema.sql`
  - Verified presence of `user_profiles`, `roles`, `user_roles`, `password_reset_tokens`, `plan_features`, `gestation_data`

- `auth and email health checks`  
  Evidence:
  - Routes verified:
    - `/auth/verify-email`
    - `/auth/resend-verification`
    - `/auth/forgot-password`
    - `/auth/reset-password`
  - Email service integration verified:
    - `sendVerificationEmail`
    - `sendPasswordResetEmail`

- `endpoint-security audit`  
  Evidence:
  - Security middleware coverage verified across API modules:
    - `authenticateToken`
    - `requireRole`
    - `requireEmailVerification`
    - `requireFeature` on premium endpoints

## Phase B - Architecture and security

Status: COMPLETE

- `consolidate backend layers`  
  Evidence:
  - service-layer extraction and organization:
    - `server/services/authService.js`
    - `server/services/scenarioService.js`
    - `server/services/planService.js`
    - `server/services/gestationService.js`

- `close RBAC/feature-flag gaps`  
  Evidence:
  - RBAC: `server/middleware/requireRole.js`
  - feature flags: `server/middleware/requirePlan.js`
  - enforced in `modules`, `module3`, `scenarios`, `breeds`

- `harden middleware coverage`  
  Evidence:
  - Protected route groups use auth + role + email verification middleware by default
  - Premium functionality uses `requireFeature(...)` where applicable

## Phase C - Core UX refinement

Status: COMPLETE

- `visual/pedagogical refinement in M1, M2, M3`  
  Evidence:
  - `STEP10_UX_VALIDATION.md`

- `conversion messages + CTA`  
  Evidence:
  - `STEP11_CONVERSION_MESSAGES_VALIDATION.md`

- `visible blocked fields`  
  Evidence:
  - lock/blur/disabled UX patterns in:
    - `client/src/index.css`
    - `client/src/components/modules/Module1Production.jsx`
    - `client/src/components/modules/Module2Transformation.jsx`
    - `client/src/components/modules/Module3Lactation.jsx`

## Phase D - Internationalization and currency

Status: COMPLETE

- `5-language i18n coverage`  
  Evidence:
  - locale bundles and fallback:
    - `client/src/i18n/translations.js`
    - `client/src/i18n/I18nContext.jsx`

- `end-to-end currency consistency`  
  Evidence:
  - currency normalization/formatting:
    - `client/src/utils/currency.js`
    - `server/services/authService.js`
  - selection and persistence:
    - `client/src/components/Login.jsx`
    - `client/src/components/Profile.jsx`
    - `server/routes/auth.js`

## Phase E - Future-component preparation

Status: COMPLETE

- `M4/M5 audit and reorganization`  
  Evidence:
  - `MODULE4_MODULE5_AUDIT.md`
  - gestation and scenario-flow refactors in server services/routes

- `future integration documentation`  
  Evidence:
  - `MODULE4_MODULE5_AUDIT.md`
  - `STEP13_IMAGE_ICON_READINESS.md` (asset replacement readiness)

## Phase F - QA and release readiness

Status: COMPLETE

- `role-based functional tests`  
  Evidence:
  - middleware and route-gating matrix validated in Step 12 and this step

- `language tests`  
  Evidence:
  - i18n key presence and language-switch wiring validated in Step 12

- `limit/message tests`  
  Evidence:
  - conversion/blocked UX validation in Step 11

- `final milestone checklist`  
  Evidence:
  - DoD closure and all completion criteria in:
    - `STEP12_DOD_VALIDATION.md`
    - `What to do.md` section 16

## Validation commands executed

- `npm.cmd --prefix client run build`
- `node --check server/index.js`
- `node --check server/routes/auth.js`
- `node --check server/routes/modules.js`
- `node --check server/routes/module3.js`
- `node --check server/routes/scenarios.js`
- `node --check server/services/authService.js`
- `node --check server/services/scenarioService.js`
- `node --check server/services/gestationService.js`
- `node --check client/src/utils/assetCatalog.js`

## Residual note

- Vite reports large chunk-size warning (>500 kB). This is optimization work, not a functional blocker for milestone completion.
