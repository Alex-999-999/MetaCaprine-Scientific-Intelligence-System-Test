# Refinement Notes Board

Master tracker for HITO 2 refinement notes.

Statuses:
- `open`
- `in_progress`
- `blocked`
- `ready_for_qa`
- `closed`

| Ticket | Date | Module | Category | Priority | Status | Owner | Before Evidence | After Evidence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| RN-001 | 2026-03-13 | M2 | pedagogy-text | medium | closed | codex | `docs/refinement-evidence/RN-001/before-01.png` | `docs/refinement-evidence/RN-001/after-01.png` | Conversion block standardized to `upgrade-info-block` |
| RN-002 | 2026-03-13 | Shared | iconography | low | closed | codex | `docs/refinement-evidence/RN-002/before-01.png` | `docs/refinement-evidence/RN-002/after-01.png` | Sidebar icons restored |
| RN-003 | 2026-03-13 | M3 | field-behavior | medium | closed | codex | `docs/refinement-evidence/RN-003/before-01.png` | `docs/refinement-evidence/RN-003/after-01.png` | Image resolution now prioritizes `image_asset_key` |

## Usage Rules

1. Every new correction gets a ticket ID (`RN-###`).
2. A ticket cannot be marked `closed` without:
   - before/after evidence paths
   - changed file references
   - validation result.
3. If a note is blocked, add blocker reason in `Notes` and next action date.
