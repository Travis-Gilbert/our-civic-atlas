# Session Checkpoint — 2026-05-18

Atlas commit `9fc772b` landed on `origin/main`. Codex picks up Phases 0-3
in a new backend repo + bridge sidecar in Theseus + a primitives repo.
This frontend stays largely passive while Codex builds; the handback
in Phase 3 is the next big chunk of work for this repo.

Read this whole file before resuming. `/catchup` will surface it
(`.open.md` suffix).

## What just shipped (commit `9fc772b`)

`feat(atlas): deck.gl unification, Lost Flint pipeline, time travel`

UCA mapping per `docs/plans/our-civic-atlas-north-star-execution-plan.md`:

| UCA   | Status   | Note                                                                                                  |
|-------|----------|-------------------------------------------------------------------------------------------------------|
| 002   | done     | Single deck.gl render path; Leaflet retired entirely (not just demoted)                               |
| 003   | partial  | Mobile renders deck.gl natively; formal mobile budget gates remain follow-ups                          |
| 004   | done     | maxBounds + vignette + camera choreography (easeTo on viewMode change, reduced-motion safe)            |
| 006   | partial  | Visual grammar v1 + 4 camera bookmarks + unified island layout w/ compass                              |
| 013   | slice    | Lost Flint dispatch table + ConfidenceMixMeshLayer shader + ScenegraphLayer route                     |

44 files, ~21 MB (most of that is `src/data/open-flint-atlas/fixtures/osm-buildings.json` — 21,182 Flint building footprints).

### Key surfaces that landed

- `src/lib/atlas/atlas-time.ts` — `parseAtlasYear`, `osmBuildingExistsInYear`, `reconstructionExistsInYear`. Time-travel filter via search bar.
- `src/components/atlas/AtlasLostFlintDeckLayer.ts` — three-tier dispatch (null → ConfidenceMix, .glb/.gltf → Scenegraph, .splat/.ply → fallback). The shader injects `instanceConfidence` and noise-mixes faithful vs porcelain per fragment.
- `src/components/atlas/AtlasMap.tsx` — OSM extrusion via GeoJsonLayer, maxBounds, vignette, year filter via memoized FeatureCollection.
- `src/components/atlas/OpenFlintAtlasScene.tsx` — camera choreography hoisted from AtlasMap (so it coordinates with bookmarks); `?bookmark=<id>` URL plumbing; `atlasYear` derived from search.
- `src/components/atlas/AtlasDynamicIsland.tsx` — `CompassControl` with live MapLibre bearing + click-to-reset-north; unified compact layout (compass left, lens label center, search right); year displays in label when time-travel active.
- `src/lib/atlas/scene-view.ts` — `ATLAS_CAMERA_BOOKMARKS` (carriage-town, downtown, north-end, mott-park).
- `public/atlas/historical/README.md` — asset-slot contract for glTF / splat / IFC files.
- `scripts/fetch-osm-buildings.mjs` — Flint city bbox (42.965..43.085 × −83.795..−83.595), re-runnable.

### One bug carried into next session

User reports typing a year in the search bar "doesn't seem to do anything." Two likely causes:
1. Most OSM features have no `year_built` tag, so the permissive filter (`null → show`) doesn't remove anything visible.
2. The Lost Flint reconstructions are small at city zoom and confidence-shader scatter doesn't read as a year transition.

Diagnostic plan when we get back to this repo: add a deliberate on-screen `Year 1925` overlay so the wiring is verifiable, then dial back. Logged at the bottom of the open todo list.

## What Codex is building (Phases 0-3)

Codex is taking over for backend work in a NEW REPO (`our-civic-atlas-backend`), a NEW SIDECAR in `Index-API` (Theseus), and a NEW REPO of Blender archetypes (`civic-atlas-primitives`). **This frontend repo is the eventual consumer, not the implementor.**

### Architectural shape after Phases 0-3

```
Browser (this repo, GraphQL client UNCHANGED)
   |
   v
Node sidecar (apps/graphql-server — Apollo or Yoga)
   |
   v gRPC (tonic-web / Connect)
Axum backend (our-civic-atlas-backend — Cargo workspace)
   |--- gRPC ---> Theseus bridge (sidecar in Index-API Django process)
   |--- gRPC ---> RustyRed (new geotemporal layers)
   |--- SQL  ---> PostGIS (spatial truth)
   |--- SDK  ---> Modal (Blender renders via Scene Foundry)
```

**Hard invariants:**
- GraphQL on the browser is preserved. Frontend's GraphQL client URL flips behind a feature flag query-by-query.
- Multi-tenancy from day one. Every gRPC carries `TenantContext`. Every PostGIS table has `tenant_id` with RLS. Every RustyRed namespace is tenant-scoped. `flint` is one tenant. `civic-atlas tenant new <slug>` provisions a complete second tenant in one transaction.
- No plan-pro language or templates — Codex runs in orchestrate mode.
- No time estimates anywhere in commits, PRs, or docs.

### Phase 0 — Backend skeleton

New repo `our-civic-atlas-backend`, Cargo workspace.

Proto:
- `proto/civic_atlas/v1/civic_atlas.proto` — `TenantContext`, `CivicObject`, `CivicAtlasService { GetPlace, ListPlaces, GetNode, GetDossier, ResolveTenant, Health }`
- `proto/theseus_bridge/v1/bridge.proto` — `TheseusBridge { ResolveSpacetimeTopic (streaming), GetSpacetimeEmbedding, SearchObjects, IngestArtifact }`

Crates:
- `civic-atlas-types` (generated from proto via tonic-build)
- `civic-atlas-server` (Axum binary, tonic gRPC server)
- `theseus-client` (gRPC client wrapping the bridge)
- `tenant-resolver` (tower middleware, rejects requests without tenant_id)

Node sidecar at `apps/graphql-server` (Apollo v4 or Yoga). Resolvers call into Axum over gRPC-Web/Connect. DataLoader batches within a request.

Theseus bridge sidecar at `apps/notebook/grpc/bridge_server.py` (in Index-API repo). Separate process. Wraps existing Ninja v2 endpoints.

PostgreSQL/PostGIS migration: `tenants` table, RLS policies, sqlx middleware that sets `app.tenant_id` per transaction.

Frontend touch in Phase 0:
- Re-point the GraphQL client URL behind a feature flag to the new Node sidecar.
- First migrated query is `placesList`.
- Old endpoint stays alive until cutover.

Gate before Phase 1:
- live atlas serves 222 places through the new path
- `civic-atlas tenant new test-city` provisions a second tenant end-to-end
- Theseus bridge returns a real DyGFormer 256d embedding for a known graph node id
- `cargo test`, `cargo check`, `npm run typecheck`, `npm run build` all pass

### Phase 1 — RustyRed geotemporal layers

In the RustyRed repo:
- new crate `crates/thg-geotemporal` composing existing H3 `SpatialIndex` with a `TimeInterval` node property. Exposes `execute(GeoTemporalQuery) -> Vec<NodeId>`.
- extension to `thg-core`'s `GraphStore`: `get_node_interval()` reads standard `t_start_ms` / `t_end_ms` properties.
- new crate `civic-atlas-schema` documenting node label conventions: `BuildingPresence`, `ArtifactAnchor`, `StreetSegment`, `Parcel`. Edge types `ANCHORED_BY`, `FRONTS_STREET`, `ADJACENT_TO`, `REPLACED_BY`. Required properties per label.

Proto:
- `proto/civic_atlas/v1/spacetime_atlas.proto` — public endpoint `spacetime-atlas`, service `SpacetimeAtlasService { GetViewportAtTime, GetBlockSubgraph, GetParcelHistory, GetNearbyArtifacts }`

Server: `civic-atlas-server` composes the internal geotemporal primitive with existing `expand_bounded` graph traversal for block subgraph queries.

H3 stays a pure spatial primitive — time goes in node properties, composition happens in `thg-geotemporal`, not inside `SpatialIndex`. Every spatial index is tenant-scoped; cross-tenant queries impossible by construction.

Gate before Phase 2:
- unit test creates fake Flint block at 1925 with five `BuildingPresence` nodes (two with photo anchors), queries `GetBlockSubgraph`, asserts typed neighborhood
- second test tenant exists in same process; its data does not appear in Flint queries
- `GetViewportAtTime` returns empty for time slices outside any building's interval

### Phase 2 — ReconstructionSpec + PostGIS

Proto:
- `proto/civic_atlas/v1/reconstruction.proto` — hierarchical spec: `Mass`, `Facade`, `OpeningGrid`, `Roof`, `Ornament`, `GroundFloor`, each carrying `PartProvenance { sources, confidence, from_gnn_prior }`.
- `proto/civic_atlas/v1/reconstruction_service.proto` — `ReconstructionService { GetReconstructionSpec, ListReconstructionSpecs, SaveDraftSpec, SubmitSpecForReview, ApproveSpec, ListAssetsForSpec }`. `ApproveSpec` triggers projection to RustyRed + queues a Scene Foundry job.

Generated types in all three boundaries: Rust, TypeScript via `ts-proto`, Python via `grpcio-tools`. CI fails build on stale generated output.

PostGIS schema (RLS on every table):
- `tenants`
- `parcels`
- `buildings`
- `building_parts` — flexible `payload_jsonb` with mirrored `confidence` + `source_ids[]` columns for indexing
- `artifacts`
- `artifact_anchors`
- `reconstruction_specs` — versioned, immutable when approved
- `generated_assets`
- `corrections`

Projection job: when a spec is approved, write building parts to PostGIS, then project the summary to RustyRed as a `BuildingPresence` node with anchors.

CLI: `civic-atlas spec validate <file>`, `civic-atlas spec submit <file>`.

PostGIS is truth. RustyRed never originates data. Projection is idempotent and replayable. Confidence is per-part; building-level confidence is derived, never stored independently.

Gate before Phase 3:
- five hand-encoded Carriage Town specs in PostGIS, status approved, projected to RustyRed
- `GetBlockSubgraph` via gRPC returns those buildings with full per-part confidence
- spec round-trips through proto → Rust → TypeScript → Python with all fields preserved

### Phase 3 — Carriage Town pilot (FRONTEND CONSUMER)

This is where this repo gets meaningfully busy again. The frontend pieces:

1. **Frontend route**: `/open-flint-atlas/lost-flint/carriage-town`. Fetches 20 spec IDs via GraphQL, renders GLBs through R3F at correct parcel positions and time slice, composed with the existing MapLibre+deck.gl base.

2. **Per-part confidence shader in R3F**. Each typed part (Facade, OpeningGrid, Roof, etc.) is a separate mesh group. Material reads `PartProvenance.confidence` and tints:
   - documented → full opacity
   - GNN prior → scattered noise overlay (the existing `ConfidenceMixMeshLayer` math, but for sub-meshes)
   - low confidence → porcelain treatment
   
   **This is the existing shader extended to per-part — the math is already in `AtlasLostFlintDeckLayer.ts`. Port to R3F equivalent.**

3. **Per-part dossier extension**. Tapping a window opens the existing dossier sheet with new tabs showing `OpeningGrid.sources`, per-source confidence, and a "this part is inferred / documented / partial" badge.

4. **Time-slider integration**. Search-bar year input drives the temporal query through `GetViewportAtTime`. Changing the year re-queries and updates the rendered set.
   **This is 60% done already**: `parseAtlasYear` + `atlasYear` state in `OpenFlintAtlasScene.tsx` already exist. Rebinding the consumer from `osmBuildingExistsInYear`/`reconstructionExistsInYear` to `GetViewportAtTime` is a resolver swap.

5. **MapLibre+deck.gl remains the base.** R3F is selective overlay only. Do Not Downgrade gate applies.

Codex side of Phase 3:
- `civic-atlas-primitives` repo with 8 Blender geo-nodes archetypes: two-story brick commercial, wood-frame house with porch, factory bay, warehouse, church, school, gas station, mixed-use storefront. Each parameterized by `ReconstructionSpec` fields.
- Modal app `civic_atlas_scene_foundry` with `render_spec_to_glb`. Takes spec JSON, selects archetype, renders GLB, uploads to `s3://civic-atlas/<tenant>/assets/<spec_id>/<version>/<hash>.glb`.
- Axum Scene Foundry orchestration: `render_jobs` table, outbox over PostgreSQL row locks, retry on failure, projects `generated_assets` to RustyRed on success.
- 20 hand-encoded Carriage Town specs covering footprint-only, photo-informed, and fully documented evidence mix. Submitted through `SubmitSpecForReview` then `ApproveSpec`.

Final gate (Phase 3 closes the loop):
- visitor types `1925` in live atlas search, navigates to Carriage Town, sees 20 buildings rendered with per-part confidence, taps a building, sees per-part dossier with full source provenance
- whole pipeline runs through new Axum stack with NO fallback to old GraphQL-to-Theseus path
- a sample second tenant (e.g. Saginaw bootstrap) shows no Flint data and an empty Carriage Town

## What this repo does NOT do during Codex work

- Do NOT mutate `AtlasLostFlintDeckLayer.ts`, the OSM extrusion path, or the existing search/year wiring. Codex's frontend deltas land cleanly on top of `9fc772b`.
- Do NOT add a second renderer. R3F overlay is a NEW route surface (`/lost-flint/carriage-town`), not a replacement.
- Do NOT change the GraphQL schema unilaterally. Schema lives at `docs/design/flint-graphql-schema-v1.graphql` and Codex's new Node sidecar will read from there.
- Do NOT commit to the `Index-API` repo's Strawberry endpoint as the long-term home. Codex's plan replaces it with the Axum gRPC bridge.

## Architecture clarifications NOT yet in AGENTS.md

These three update AGENTS.md when we get back. Don't write them yet — file as session note:

1. **Leaflet is fully retired.** `AGENTS.md` currently says "Leaflet remains only as a mobile fallback." That's no longer true; the deletion landed in `9fc772b`. Update on next pass.
2. **R3F is selectively revived** for the Lost Flint per-part overlay only. AGENTS.md says "parked" — qualify to: "parked as a standalone scene renderer; revived as selective overlay for Lost Flint per-part reconstruction, never as the base."
3. **Multi-tenancy from day one.** Add to AGENTS.md once Phase 0 lands: every backend call carries `TenantContext`; every PostGIS table has `tenant_id` with RLS; every RustyRed namespace is tenant-scoped.

## Files the next session should re-read first

1. This file.
2. `docs/plans/our-civic-atlas-north-star-execution-plan.md` — UCA-001..024 table for grounding.
3. `AGENTS.md` — project guardrails.
4. `src/components/atlas/AtlasLostFlintDeckLayer.ts` — confidence shader implementation (math to port to R3F per-part).
5. `src/lib/atlas/atlas-time.ts` — year filter helpers (to be re-pointed at `GetViewportAtTime`).
6. `src/lib/atlas/scene-view.ts` — camera bookmarks (Carriage Town preset is the staging for Phase 3 demo).
7. `docs/design/flint-graphql-schema-v1.graphql` — the schema Codex's Node sidecar will serve.
8. `public/atlas/historical/README.md` — asset-slot contract; Codex's Modal job writes here (or to S3 under same naming convention).

## Open todos when we resume

1. **Diagnose time-travel visual confirmation.** Add an unmistakable on-screen `Year 1925` overlay when `atlasYear !== null` so the wiring is verifiable, then tune the OSM dimming. (Pre-Codex; this repo only.)
2. **Update AGENTS.md** with the three corrections above (Leaflet retired, R3F qualified revival, multi-tenancy invariant).
3. **Wait for Codex Phase 0 hand-back**: feature-flag GraphQL URL re-pointing for `placesList`. First touchpoint.
4. **Wait for Codex Phase 3 hand-back**: build `/lost-flint/carriage-town` route + per-part R3F shader + dossier extension + time-slider rebinding.
5. **Deferred (post-Phase 3)**: smart query router for civic-history-aware Theseus crawls; manual seed for Carriage Town civic sources (Sanborn, LOC HABS/HAER, OldFlint).

## Repo state

| Repo                                                   | Branch | Status                                       |
|--------------------------------------------------------|--------|----------------------------------------------|
| `Open-Flint-Atlas-main-release/`                       | `main` | `9fc772b` pushed; `.claude/` untracked       |
| `Open-Flint-Atlas/`                                    | ?      | Sibling worktree (plan path); not touched     |
| `Index-API/`                                           | `main` | 2 commits ahead of origin from prior session; not touched this session |
| `our-civic-atlas-backend/`                             | —      | Does not exist yet; Codex creates in Phase 0 |
| `civic-atlas-primitives/`                              | —      | Does not exist yet; Codex creates in Phase 3 |
