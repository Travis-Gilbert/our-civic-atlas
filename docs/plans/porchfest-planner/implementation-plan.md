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
  documented endpoint and degrades silently when absent. Live multi-planner
  echo depends on the backend stream.

### Deferral source

- **Geotemporal scrubber (spec section 8):** deferred **by the spec itself**
  ("later, once the core loop works"). Not a self-imposed cut.

## Buildable checklist (this repo)

Each item backrefs the spec section it implements.

- [ ] **PP-1 (spec 2):** Align `PlannerClientProvider` endpoint to Axum `:4001`
  + shared `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`; drop stale `:4010` sidecar /
  cookie framing. Partial gating fix (FE half of G1).
- [ ] **PP-2 (spec 2, 3):** Client-side data ownership. Add `version` to the
  placement shape consumed by the planner; have the client run
  `EventPlacements` via urql (seeded by SSR `initialPlacements`) so mutations +
  SSE update a live cache and drag has `expectedVersion`.
- [ ] **PP-3 (spec 4.1):** New `src/lib/atlas/procedural-porchfest-meshes.ts`.
  Mirror archetype catalog: `pushQuad`/`pushTri`/`triNormal`, `[-0.5,+0.5]^3`,
  `getPorchfestAffordanceGeometry(category)` + `Map` cache. 9 forms: music
  (figure+instrument), vendor (canopy), food_court/food (truck), kid_zone
  (play cluster), parking (car), restroom (portable), rest_area (bench+shade),
  after_party (stage+marquee), amenity (fallback post).
- [ ] **PP-4 (spec 4.2):** New `src/components/atlas/PorchfestAffordanceMeshLayer.ts`.
  Mirror `AtlasArchetypeMeshLayer`: one `SimpleMeshLayer` per category, per-cat
  geometry, per-cat scale (meters), bearing override via metadata, color from
  `CATEGORY_COLOR`, pickable `onClick` -> selection payload.
- [ ] **PP-5 (spec 3, 4.3):** Wire `buildPlannerEditableLayer` into the planner
  client. `onTranslate` -> `UpdatePlacement` (staleWrite -> refetch + toast),
  `onDraw` -> `CreatePlacement` (category from palette). Mesh layer renders;
  editable layer handles drag; both keyed on same placements via `extraDeckLayers`.
- [ ] **PP-6 (spec 6):** Wire `PlannerPalette` (PaletteMode -> editable mode +
  delete), `PlannerLayerControls` (visibility), `PlannerTaskRail` +
  `PlannerTaskLayer` (eventTasks query + task mutations + GraphQL-task ->
  `PlannerTaskNode` adapter), `PlannerBookmarks` (self-contained urql).
- [ ] **PP-7 (spec 5):** Reframe view: Carriage Town boundary polygon layer,
  street-level default zoom, perspective/pitched camera default.
- [ ] **PP-8 (spec 7):** `EventSource` SSE consumer in the planner client;
  apply `planner_change` events to the urql cache (refetch on event). Degrades
  silently when the stream endpoint is absent (FE half of G2).
- [ ] **PP-9:** `npm run typecheck` + `npm run lint` clean; browser-verify the
  planner renders, palette arms draw, layer toggles work, affordances render as
  3D forms, drag fires the mutation (against backend if reachable, honest empty
  / error state otherwise).

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
