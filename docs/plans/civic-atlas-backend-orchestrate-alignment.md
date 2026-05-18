# Orchestrate Alignment: Civic Atlas Backend Cutover

## Active Boundary

- Public atlas repo: `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas-main-release`
- Backend repo: `/Users/travisgilbert/Tech Dev Local/Creative/Website/our-civic-atlas-backend`
- Theseus upstream: `/Users/travisgilbert/Tech Dev Local/Creative/Website/Index-API`
- RustyRed code path: `Index-API/theseus_native`

## Current Frontend Contract

Browser GraphQL operations stay unchanged. The first backend cutover switch is
only the endpoint URL:

- default: existing Theseus Strawberry endpoint
- new path: `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_PATH=node-sidecar`
- sidecar URL: `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`

This keeps the old GraphQL-to-Theseus path alive while the Node sidecar starts
calling the new Axum boundary.

## Task Ledger

The backend-owned task ledger lives at:

`../our-civic-atlas-backend/docs/orchestrate/phases-0-3-task-ledger.md`

Frontend-specific follow-through:

| ID | Task | Acceptance | Validation | Status |
|---|---|---|---|---|
| OCA-FE-BE-001 | Keep GraphQL operation files stable during sidecar migration. | `src/lib/api/graphql/queries/*.graphql` does not need a browser rewrite. | `npm run typecheck`, `npm run codegen` when schema changes. | planned |
| OCA-FE-BE-002 | Cut over `placesList` behind the sidecar feature flag. | `placesList` resolves through the Node sidecar and returns the same public place shape. | sidecar smoke plus atlas route smoke. | planned |
| OCA-FE-BE-003 | Preserve MapLibre/deck.gl base for Carriage Town. | R3F/GLB is a selective overlay, not the base map. | desktop/mobile screenshot gate. | planned |
| OCA-FE-BE-004 | Add per-part confidence dossier tabs after ReconstructionSpec lands. | Tapping a part opens source/support details for that part. | browser smoke with approved Carriage Town fixture. | planned |

