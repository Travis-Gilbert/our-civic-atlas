# PorchFest Planner: wiring + 3D affordances implementation plan

Source spec: `PORCHFEST-PLANNER-SPEC.md` (Downloads, read into the run).
Harness run: `run:f1307eda55324224b953b4836493a971`.

## Spec-vs-repo reconciliation (read before building)

The spec was written against a monorepo layout. This repo
(`Open-Flint-Atlas-main-release`) is the **frontend only**. Reconciliation:

| Spec claim | Reality in this repo |
|---|---|
| Backend at `apps/graphql-server/src/schema/event-planner/index.ts` + `sse/event-planner-stream.ts` | Does NOT exist. Node sidecar was removed; Axum native GraphQL is canonical (`src/lib/api/graphql/client.ts`). Resolvers live in sibling `our-civic-atlas-backend`. |
| "Backend complete and deployed" | The GraphQL **contract** is complete here (schema + generated Documents). Whether a server resolves it at runtime is a sibling-repo + Railway concern (same posture as Atelier PT-602). |
| Phase 2/3 FE components exist, unwired | TRUE. All `Planner*.tsx` present and unwired. |
| 3D mesh system exists | TRUE. `procedural-archetype-meshes.ts` + `AtlasArchetypeMeshLayer.ts`. |
| Live page falls back to fixture | TRUE. `page.tsx` tries GraphQL, catches, returns fixture. |

### Named gaps (NOT buildable in this repo; flagged, not silently dropped)

- **G1 (spec section 2, gating data load):** the DB seed of 76 placements, the
  Railway env var for the GraphQL URL, and Axum reachability are all
  sibling-repo / infra. This repo can only fix the **FE data path** (endpoint
  alignment, request `version`, thread version through, client-side query so
  mutations update cache). Live data appearing depends on the backend.
- **G2 (spec section 7, SSE):** the `LISTEN/NOTIFY` -> EventSource stream server
  is backend. FE can wire an `EventSource` consumer that connects to the
  documented endpoint and degrades silently when absent. Backend commit
  `f5833ef` now exposes the native Axum stream at `/sse/event-planner`.

### Deferral source

- **Geotemporal scrubber (spec section 8):** deferred **by the spec itself**
  ("later, once the core loop works"). Not a self-imposed cut.

## Status checkpoint: 2026-06-11

The original planner wiring checklist below is now complete in this frontend
repo and has been extended by the Civic Atlas event-planning plan from
`docs/Planning the planner /` in the backend repo.

Current receipts:

- Frontend planner wiring is on `main` through `d32ad32`
  (`feat(civic): civic objects on the planner map with two-way location
  binding`).
- The public PorchFest form, Formspree import tooling, embedded BlockSuite
  workspace, ledger-to-workspace ingestion, and civic-object map binding are
  present.
- The live production backend ledger contains 75 unique imported application
  rows from the private Formspree CSV. The importer parsed 76 rows, detected 1
  duplicate source key, and recorded 76 backup receipts. One imported row is
  missing `canDoThirty` and should be organizer-reviewed in the workspace.
- Backend commit `f5833ef` (`feat(planner): add native event stream`) resolves
  the GraphQL placement/task SSE decision by moving the planner stream onto the
  canonical Axum backend. It listens on `event_planner_<tenant>` and emits
  `planner_change` events at `/sse/event-planner`.
- Validation run without Playwright/Chrome by user direction:
  `npm run validate:civic-map-binding`,
  `npm run validate:civic-ledger-ingest`, `npm run validate:civic-store`,
  `npm run typecheck`, `npm run lint`, `npm run build`, a `curl -I` smoke for
  `http://127.0.0.1:3000/porchfest/workspace`, and a production GraphQL
  `eventApplications` count query.
- Backend SSE validation: `cargo test -p civic-atlas-server
  planner_sse_reports_missing_database_without_opening_stream`,
  `cargo test -p civic-atlas-server event_planner::tests`, `cargo test -p
  civic-atlas-server schema_builds_with_event_planner_fields`, `cargo test -p
  civic-atlas-server --test event_application_intake_schema`, and `cargo check
  -p civic-atlas-server`.

Remaining gates for the approved end-to-end plan:

- [ ] **RG-1 RustyRed/YCRDT sync backend:** replace the current
  IndexedDB-only BlockSuite doc source with a shared RustyRed/YCRDT doc source
  and prove two BlockSuite clients converge with no lost write.
- [ ] **RG-2 Multi-organizer proof:** after RG-1, verify two organizers can
  edit planning fields in table/kanban and move map anchors while both clients
  see the same civic object state.
- [ ] **RG-3 Square billing:** add the post-acceptance Square payment request
  flow, keep billing in a small relational store, and write the resulting
  billing reference/status back onto the civic object.
- [ ] **RG-4 Deployment:** ship the event-planning surface on
  `porchfestflint.com` with the production GraphQL URL, sync URL, and billing
  env configured. Local note: the Vercel CLI is not installed on this machine.
- [x] **RG-5 Backend realtime stream decision:** finish the planner SSE stream
  for GraphQL placements/tasks on the native Axum backend (`f5833ef`). YCRDT
  still owns the shared BlockSuite workspace lane under RG-1/RG-2.

## Buildable checklist (this repo)

Each item backrefs the spec section it implements.

- [x] **PP-1 (spec 2):** Align `PlannerClientProvider` endpoint to Axum `:4001`
  + shared `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`; drop stale `:4010` sidecar /
  cookie framing. Partial gating fix (FE half of G1).
- [x] **PP-2 (spec 2, 3):** Client-side data ownership. Add `version` to the
  placement shape consumed by the planner; have the client run
  `EventPlacements` via urql (seeded by SSR `initialPlacements`) so mutations +
  SSE update a live cache and drag has `expectedVersion`.
- [x] **PP-3 (spec 4.1):** New `src/lib/atlas/procedural-porchfest-meshes.ts`.
  Mirror archetype catalog: `pushQuad`/`pushTri`/`triNormal`, `[-0.5,+0.5]^3`,
  `getPorchfestAffordanceGeometry(category)` + `Map` cache. 9 forms: music
  (figure+instrument), vendor (canopy), food_court/food (truck), kid_zone
  (play cluster), parking (car), restroom (portable), rest_area (bench+shade),
  after_party (stage+marquee), amenity (fallback post).
- [x] **PP-4 (spec 4.2):** New `src/components/atlas/PorchfestAffordanceMeshLayer.ts`.
  Mirror `AtlasArchetypeMeshLayer`: one `SimpleMeshLayer` per category, per-cat
  geometry, per-cat scale (meters), bearing override via metadata, color from
  `CATEGORY_COLOR`, pickable `onClick` -> selection payload.
- [x] **PP-5 (spec 3, 4.3):** Wire `buildPlannerEditableLayer` into the planner
  client. `onTranslate` -> `UpdatePlacement` (staleWrite -> refetch + toast),
  `onDraw` -> `CreatePlacement` (category from palette). Mesh layer renders;
  editable layer handles drag; both keyed on same placements via `extraDeckLayers`.
  Civic-object rows from the BlockSuite workspace now also render through this
  path, and map drags write their `location` field back to the civic store.
- [x] **PP-6 (spec 6):** Wire `PlannerPalette` (PaletteMode -> editable mode +
  delete), `PlannerLayerControls` (visibility), `PlannerTaskRail` +
  `PlannerTaskLayer` (eventTasks query + task mutations + GraphQL-task ->
  `PlannerTaskNode` adapter), `PlannerBookmarks` (self-contained urql).
- [x] **PP-7 (spec 5):** Reframe view: Carriage Town boundary polygon layer,
  street-level default zoom, perspective/pitched camera default.
- [x] **PP-8 (spec 7):** `EventSource` SSE consumer in the planner client;
  apply `planner_change` events to the urql cache (refetch on event). Degrades
  silently when the stream endpoint is absent (FE half of G2).
- [x] **PP-9:** `npm run typecheck` + `npm run lint` clean. Browser/Playwright
  verification was skipped by explicit user direction because Chrome is not
  usable on this machine; current proof is the no-Chrome validation set in the
  status checkpoint above.

## Compose architecture (the seam)

```
PorchfestPlannerClient (mounts PlannerClientProvider)
  useQuery(EventPlacements)  ← live cache, seeded by SSR
  useQuery(EventTasksList)
  state: paletteMode, selectedPlacementId, visibility, mapRef
  extraDeckLayers = [
    PorchfestAffordanceMeshLayer(placements)   // 3D body  (PP-4)
    buildPlannerEditableLayer(placements,mode) // drag muscle (PP-5)
    createPlannerTaskLayers(taskNodes)         // task badges (PP-6)
    carriageTownBoundaryLayer                   // frame (PP-7)
  ]
  chrome: PlannerLayerControls | PlannerPalette | PlannerTaskRail | PlannerBookmarks
```

## Out of scope this repo (tracked, not built)

- Backend resolver implementation + DB seed + Railway env (G1) -> sibling repo.
- SSE stream server (G2) -> sibling repo.
- Geotemporal scrubber (spec 8) -> deferred by spec.
- Magic-link auth (spec 9) -> deferred by spec; `canEdit=true` for the internal tool.
