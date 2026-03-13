# Step 9 Audit - Existing Components (Module 4 and Module 5)

Date: 2026-03-12
Scope: HITO 2 Section 10 (existing components in code base, not required in sidebar)

## 1) Objective

Audit, organize, and prepare Module 4 and Module 5 for future integration without forcing public navigation exposure in this milestone.

## 2) Current Status

- Sidebar exposure:
  - Module 4 and Module 5 remain hidden in sidebar (`client/src/components/Layout.jsx`).
- Route availability:
  - `/module4` -> `Module4Yield`
  - `/module5` -> `Module5Gestation`
- Backend endpoints:
  - `POST /modules/yield/:scenarioId`
  - `POST /modules/gestation/:scenarioId`

## 3) Audit Findings

### Module 4

- Existing component: `client/src/components/modules/Module4Yield.jsx`
- Existing persistence: `yield_data` table and `POST /modules/yield/:scenarioId`
- Scenario architecture: scenario type `yield`
- Status: functional and preserved for controlled future integration.

### Module 5

- Existing component: `client/src/components/modules/Module5Gestation.jsx`
- Existing persistence: gestation JSON data storage
- Key risk found:
  - Table creation was happening inside request handling (`POST /modules/gestation/:scenarioId`), which is not ideal for scalability and architecture clarity.
- Scenario architecture mismatch found:
  - Dashboard creation/filter options emphasized `summary` instead of `gestation`.

## 4) Changes Applied in Step 9

### Backend structure and data organization

- Added dedicated gestation service:
  - `server/services/gestationService.js`
  - Centralizes:
    - table initialization (`ensureGestationTable`)
    - save operation (`saveGestationData`)
    - retrieval (`getGestationDataByScenarioId`)
- Refactored Module 5 route to use service:
  - `server/routes/modules.js`
  - Removed inline table-creation logic from route handler.
- Unified scenario retrieval:
  - `server/services/scenarioService.js` now returns:
    - `gestationData`
    - `calculatedGestationTimeline`
- Removed duplicate gestation querying in route layer:
  - `server/routes/scenarios.js`
- Improved duplication behavior:
  - `server/services/scenarioService.js` now copies `gestation_data` when duplicating scenarios.

### Database schema readiness

- Added `gestation_data` table definition and index in:
  - `server/db/schema.sql`
  - `server/db/complete_migration.sql`
- Updated scenario type comments to include `gestation`.
- Updated migration verification list to include `gestation_data`.

### Frontend scenario architecture alignment

- Dashboard mapping updated:
  - `client/src/components/Dashboard.jsx`
  - Supports `gestation -> /module5` explicitly.
- Dashboard creation/filter options updated:
  - Added `lactation`
  - Added `gestation`
  - Replaced `summary` option in create/filter controls for this workflow.
- Module 5 scenario list alignment:
  - `client/src/components/modules/Module5Gestation.jsx`
  - Filters scenarios to `gestation` and legacy `summary` for compatibility.

## 5) Deployment Visibility Policy (unchanged in this milestone)

- Module 4 and Module 5 stay hidden in sidebar.
- They remain technically available for controlled access/testing.

## 6) Ready-for-Next Integration Checklist

- [x] Code audited
- [x] Persistence organized
- [x] Scenario architecture aligned for gestation flow
- [x] Legacy compatibility retained where needed
- [x] Sidebar remains controlled (not publicly exposed)

