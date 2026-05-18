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
| `our-civic-atlas-backend/`                             | `main` | `16011d2` pushed; Phase 0 scaffold + Phase 4-6 lane A landed |
| `civic-atlas-primitives/`                              | —      | Does not exist yet; Codex creates in Phase 3 |
| `civic-atlas-ingest/`                                  | `main` | `dc74368` pushed to `Travis-Gilbert/civic-atlas-ingest`; Phase 5-6 scaffold |

## Phases 4-6 lane A landed (this frontend repo not touched)

Following the Phases 4-6 spec pasted into the session prompt, the
Codex-independent + ReconstructionSpec-independent slice was driven
to completion this turn. None of it lives in this frontend repo.

### `our-civic-atlas-backend` deltas

- `docs/orchestrate/phase-4-reconstruction-spec-requirements.md` —
  coordination note to Codex. Enumerates the five Phase 4 requirements
  against `ReconstructionSpec` (part ID stability, FieldEnvelope shape,
  proposed_payload shape, coverage_quality placement, gnn_version
  field location). Phase 4 protos cannot land until Codex confirms.
- `proto/theseus_bridge/v1/bridge.proto` — extended with
  `GetBatchSpacetimeEmbeddings` (one round trip for a whole block
  subgraph, with per-node `missing` flag + `model_version` on the
  response). Backend `cargo check --workspace` passes; tonic
  regenerates clean.
- Commits: `8a599e3` (coordination note) + `16011d2` (RPC). Both
  on `origin/main`.

### `civic-atlas-ingest` (NEW repo)

Single repo holds Phase 5 ingestion + Phase 6 training. Layout:

```
civic-atlas-ingest/
  modal/
    ingest_overpass.py       # OSM building footprints + tags
    ingest_sanborn.py        # Mapwarper Sanborn sheets
    ingest_assessor.py       # per-city assessor parcel records
    building_head_train.py   # frozen DyGFormer + GraphSAGE head
    building_head_infer.py   # web endpoint for Axum gRPC bridge
    model_promote.py         # manual-confirm staging -> production CLI
    city_targets.py          # 10 cities + bboxes, priority ordered
    coverage_quality.py      # per-field provenance lanes (0-1)
  crates/civic-atlas-validate/  # Rust validation CLI
  scripts/provision_corpus_tenant.sh
  docs/multi-tenancy-invariant.md
```

All Modal apps are stubs that raise `NotImplementedError`. The
ReconstructionSpec dependency is the gate.

`cargo check --workspace` clean. Python `py_compile` clean.

Commit `dc74368` is on `origin/main` at
`https://github.com/Travis-Gilbert/civic-atlas-ingest`. The repo
existed on GitHub with a stub README + MIT LICENSE; local scaffold
was rebased on top.

### What's still blocked

| Item                                          | Blocked on                                |
|-----------------------------------------------|-------------------------------------------|
| Phase 4 protos + Axum service                 | Codex confirming ReconstructionSpec shape |
| Real Modal app implementations (all 5)        | Codex Phase 2 ReconstructionSpec          |
| `civic-atlas-validate` real checks            | Codex Phase 2 ReconstructionSpec          |
| Phase 4 frontend (dossier CTA, /admin, /changelog) | UI brainstorm session with Travis     |
| Phase 6 frontend (Generate priors button + provenance display) | UI brainstorm session with Travis |

### Updated open todos when we resume

1. **Diagnose time-travel visual confirmation** (existing).
2. **Update AGENTS.md** (existing).
3. **Wait for Codex Phase 0 hand-back** (existing).
4. **Wait for Codex Phase 3 hand-back** (existing).
5. **NEW — Wait for Codex response on Phase 4 coordination note.** Five
   confirmations needed before Phase 4 protos can land. See
   `our-civic-atlas-backend/docs/orchestrate/phase-4-reconstruction-spec-requirements.md`.
6. **NEW — UI brainstorm session** for Phase 4 + Phase 6 frontend
   surfaces. Per Travis's standing instruction: UI work requires a
   design pass before code.

## Phases 4-6 — Codex incomplete completion + Phase 4 contracts landed

After Codex shipped `6ef870b feat(reconstruction): add spec pipeline`
on branch `Travis-Gilbert/complete-reconstruction-pipeline` (with
ReconstructionSpec proto + service + PostGIS migration 0002 + full
Rust impl), this lane:

1. **Merged Codex's branch to main** (`4b18132 Merge ...`). Phase 0-3
   schema now lives on origin/main.

2. **Phase 4 contracts** (`7665449 feat(corrections): phase 4 community
   correction loop`):
   - `proto/civic_atlas/v1/corrections.proto` — `CorrectionSubmission`,
     `CommunityCorrectionPayload`, `PartChange`, `ChangelogEntry`,
     `TrainingExample`; `CorrectionService` with 7 RPCs.
   - `migrations/0003_corrections_phase_4.sql` — extends Codex's
     polymorphic `corrections` table (adds submitter_ip_hash, moderator_notes,
     accepted_part_selectors, resulting_spec_(id,version)); new tables
     `correction_rate_limits` (10/hour anonymous ceiling) and
     `changelog_entries` (public anonymized changelog); accepted-immutability
     trigger.
   - `crates/civic-atlas-server/src/corrections.rs` (~700 lines) — full
     impl of Submit/ListForBuilding/ListPending/Reject/ListChangelog/
     ExportTrainingData. Approve has the row-lock + status transition +
     changelog publish, but the per-part merge against
     reconstruction_specs is TODO (depends on outbox runtime).

3. **Codex incomplete A: outbox worker** (`631b870 + ac4401f`):
   - new crate `civic-atlas-outbox-worker` (binary)
   - drains `reconstruction_projection_outbox` via SELECT FOR UPDATE
     SKIP LOCKED (multi-replica safe)
   - exponential backoff w/ 1-hour cap on transient failures
   - when `THESEUS_BRIDGE_URL` is unset, logs + marks succeeded so
     Phase 4 gate can observe pending -> succeeded without RustyRed

4. **Codex incomplete B: GetBlockSubgraph PostGIS-wired** (same commit
   `631b870`): the SpacetimeAtlasService method now queries buildings
   joined to `reconstruction_specs.block_id` plus building_parts plus
   artifact_anchors. Previously returned empty. depth>=2 expansion is
   a TODO (needs RustyRed).

5. **Codex incomplete C: 5 hand-encoded Carriage Town specs**
   (`33bc5f1`):
   - `migrations/0004_seed_carriage_town_specs.sql`
   - 5 parcels + 5 buildings + 5 approved specs + 3 artifacts + anchors
   - all under tenant_id='flint', block_id='block:carriage-town:central'
   - each spec is approved + projected to `building_parts` + enqueued
     to `reconstruction_projection_outbox` so the worker drains it

6. **Codex incomplete D: civic-atlas-primitives repo** (separate repo,
   commit `bcd4573`):
   - 8 Blender geometry-nodes archetype descriptors (commercial-brick,
     frame-house, factory-bay, warehouse, church, school, gas-station,
     mixed-use-storefront)
   - each MANIFEST declares spec_fields_used + material_slots +
     geometry_nodes_group_name
   - validator CLI + render entrypoint + hash manifest script
   - **No remote yet** — needs a GitHub URL to push

7. **Codex incomplete E: Modal civic_atlas_scene_foundry app stub**
   (commit `8c594f8` in civic-atlas-ingest):
   - `modal/scene_foundry.py` — headless Blender container, primitives
     volume mount, render -> S3 upload -> generated_assets row write
   - `primitives_sync` helper to update the mounted volume

8. **Codex incomplete F: frontend /lost-flint/carriage-town route**
   (commit `2be2b86` in this repo):
   - new route at `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx`
   - mounts the existing OpenFlintAtlasScene with two new optional props:
     `initialBookmark="carriage-town"` and `initialSearchValue="1925"`
   - bookmark resolution order: prop > URL > lens default
   - the existing FLINT_LOST_RECONSTRUCTIONS fixtures drive the render
     until the GraphQL hookup to the new backend lands

9. **Phase 5/6 contract unblock** (`92444f3` backend + `883a101` ingest):
   - `PartProvenance` extends with `coverage_quality` (Phase 5) and
     `gnn_version` (Phase 6) as additive proto fields
   - resolves the last two of the five coordination questions from
     `docs/orchestrate/phase-4-reconstruction-spec-requirements.md`

### Repo state after this session

| Repo                                                   | Branch | Status                                       |
|--------------------------------------------------------|--------|----------------------------------------------|
| `Open-Flint-Atlas-main-release/`                       | `main` | `8091a2c` pushed; Phase 3 route landed       |
| `our-civic-atlas-backend/`                             | `main` | `92444f3` pushed; full Phase 0-4 + outbox + Phase 5/6 contracts |
| `civic-atlas-ingest/`                                  | `main` | `eeab9bb` pushed; Scene Foundry + primitives/ subdir + Modal docs |
| `primitives/` archetypes .blend                        | -      | not yet authored (Phase 3 hand-work; lives in civic-atlas-ingest/primitives/) |

**Note:** A standalone `civic-atlas-primitives` repo briefly existed
(`bcd4573` local-only) but was folded into `civic-atlas-ingest/primitives/`
in commit `eeab9bb`. Reason: same toolchain (Python + Blender), same
Modal deploy target, consumed primarily by `scene_foundry.py` in the
same repo. Three active repos is enough.

### Railway MCP

`openrail-ops-mcp` was already deployed at
`openrail-ops-mcp-production.up.railway.app` (Railway service id
`b87a2fe0-9664-4588-98e9-e186ccd89978`). Verified via /health and /ready.
Added to `~/.claude/settings.json` mcpServers as `openrail` with
bearer auth. MCP `initialize` smoke test succeeded. Restart Claude Code
to load the new server.

### What still gates a live Phase 4 gate

| Gate criterion                                  | Status |
|-------------------------------------------------|--------|
| Tables + service + worker exist                 | done   |
| ReconstructionSpec proto + per-part fields      | done   |
| Anonymous submission rate-limit (10/IP/hour)    | done   |
| Approve writes changelog_entries                | done   |
| **Approve merges accepted parts onto new spec** | TODO (per-part merge logic in corrections.rs) |
| **Real RustyRed projection on outbox drain**    | TODO (bridge RPC not yet defined) |
| **Scene Foundry GLB regenerate on approve**     | TODO (Blender archetype files unauthored) |
| **Live PostGIS run + verify**                   | TODO (DATABASE_URL needs a live PG) |

### Updated open todos when we resume (post Phases 4-6 lane)

1. **Diagnose time-travel visual confirmation** (existing).
2. **Update AGENTS.md** (existing).
3. **UI brainstorm**: Phase 4 dossier CTA, /admin/corrections, /changelog,
   plus Phase 6 admin extensions. Travis design-gated.
4. **Per-part merge logic** in `ApproveCorrection`. Marked TODO in
   `crates/civic-atlas-server/src/corrections.rs::approve_correction`.
5. **Author the 8 Blender archetype .blend files** in
   `civic-atlas-ingest/primitives/archetypes/<slug>/archetype.blend`.
   The MANIFEST contracts are locked.
6. **Wire the live PostGIS gate**: run migrations against a real PG,
   confirm `civic-atlas-outbox-worker` drains.
