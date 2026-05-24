# The Atelier: Codebase Inventory

Generated 2026-05-23 as Deliverable A of the Atelier planning artifact (see `README.md` index).

This document grounds the Atelier implementation plan in the actual state of the Open Flint Atlas codebase and the sibling `our-civic-atlas-backend` Rust crate. It supersedes any reading of the spec that assumes a greenfield start: the reconstruction stack is substantially more mature than the spec implies, and the atelier UI layers cleanly onto primitives that already exist.

## How to read this document

The Atelier spec (`SPEC-THE-ATELIER.md`) §"What this requires from the rest of the system" (lines 277 to 287) names four prerequisites for v1. Each one gets its own section below:

1. The reconstruction engine producing real specs
2. A real evidence corpus for at least one building
3. A glTF asset generation pipeline producing atelier-compatible building masses
4. The atelier UI itself

For each prerequisite the inventory tells you:

- **Works**: code that exists, is wired, and produces real outputs today
- **Skeleton**: code that exists with the right shape but is gated off, returns placeholder values, or is documented as "skeleton"
- **Absent**: code, schema, or data the atelier needs that does not exist yet

Each entry cites file paths (with line numbers where useful) so the implementation-plan checklist items can backreference exactly what they extend, replace, or add. Where a piece of work also appears in the project's existing planning corpus (Track 2 audit, Lost Flint brainstorm, reconstruction-node-tree-adapter design doc), the cross-reference is named so we do not duplicate or contradict prior planning.

## Prerequisite 1: The reconstruction engine producing real specs

### Works

- **All four reconstruction-engine interfaces have real production implementations** in the Rust crate `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs` (3,325 lines, single crate). Per the Track 2 audit at `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md` §"#1 Stub audit":
  - `EvidenceRepository`: `PostgisRepository` impl at lines 1188 to 1311 of the Rust file (~123 lines of SQL-backed code); `InMemoryRepository` test variant at lines 2387 to 2410
  - `BlockSubgraphRepository`: `PostgisRepository` impl at lines 1312 to 1830 (~500 lines); `InMemoryRepository` at line 2411 onward
  - `EmbeddingProvider`: `TheseusBatchEmbeddingProvider` at lines 1081 to 1118 (real gRPC client to Theseus); `ZeroEmbeddingProvider` honest fallback at lines 1044 to 1067 (tags every `NodeEmbedding` with `missing: true`, `model: "zero-spacetime-embedding"`)
  - `AssetGenerator`: `SceneFoundryManifestGenerator` at lines 1140 to 1187 (integrates with `civic_atlas_ingest.scene_foundry`)
- **Pairformer architecture is fully built** at `civic_atlas_ingest/building_head_pairformer.py` (421 lines): `CivicPairformerConfig` (node_dim 320, hidden 128, 3 layers, 4 heads); 10-relation vocabulary (`adjacent_to`, `fronts_street`, `same_block_as`, `anchored_by`, `temporal_predecessor_of`, `temporal_successor_of`, `similar_to`, `shares_party_wall`, `shares_setback_line`, `shares_cornice_line`); 5 categorical decoder heads (`mass_form`, `story_count`, `facade_material`, `roof_form`, `ground_floor_use`); 3 regression heads (`height_meters`, `bay_count`, `roof_pitch_degrees`); PyTorch + `torch_geometric.RGCNConv`; defensive imports for offline runs
- **Training corpus schema is locked** at `civic_atlas_ingest/training_corpus.py` (444 lines): `TrainingCorpusRecord` dataclass with tenant context, source metadata, geometry, per-field provenance lanes, coverage quality, archetype label, part labels, training graph subgraph; stable schema version `civic-atlas-training-corpus/v1`
- **`scene_foundry.render` Ray task is operational** (Phase B Blender geo-nodes pipeline; the spec refers to this at line 283)

### Skeleton

- **Pairformer training loop**: `civic_atlas_ingest/building_head_train.py` (144 lines). Docstring states "Status: skeleton. Real training loop pending finalization of the ReconstructionSpec part schema." Architecture is laid out (frozen Theseus DyGFormer encoder via gRPC bridge matching `TheseusBatchEmbeddingProvider`, `CivicPairformerBuildingHead` over block subgraphs, masked-field prediction loss weighted by `coverage_quality`, two-pass training, S3 model output at `s3://civic-atlas/models/building_head/<version>/`). Missing: actual loss instantiation, optimizer, data loader plus collate, checkpoint write loop. Track 2 audit §"#3" estimates ~300 to 500 lines of fill-in
- **Pairformer inference path**: `civic_atlas_ingest/building_head_infer.py` (124 lines). Parallel skeleton awaiting the trained model
- **Pairformer weights**: untrained today. Spec line 279 names this directly

### Absent

- **A frontend representation of the 8 pipeline stages** named in the spec (Entry, Evidence gathering, Direct extraction, Block subgraph, Pairformer inference, Merge with conflict surfacing, Asset generation, Settled state). The backend `ReconstructionSpec` is the final artifact; per-stage events that the atelier animation choreographer needs are not emitted by today's pipeline. The atelier ships against a frontend-side stage choreographer that consumes a static reconstruction spec and replays the steps; backend instrumentation to emit real per-stage events is a v1.x track. The spec at line 287 acknowledges this directly: "The atelier UI can be built and demoed against mock reconstructions while the model and corpus mature."
- **`MergeConflict` exposure to the frontend**: the merge step lives in the Rust engine and produces structured conflicts (the spec line 134 to 142 shows the example), but the conflict array is not currently exposed in the GraphQL contract. The atelier needs this field added (see `graphql-contract.md`)
- **`EvidenceBundle` exposure to the frontend**: the `EvidenceRepository` returns evidence in the Rust engine but the bundle is not surfaced in the GraphQL contract. The atelier needs an extension (see `graphql-contract.md`)

## Prerequisite 2: Real evidence corpus for at least one building

### Works

- **Five hand-encoded Carriage Town reconstruction specs** with real per-part confidences live in the codebase TWICE:
  - Frontend fixture: `src/lib/atlas/historical-reconstruction.ts` lines 120 to 244 (the `FLINT_LOST_RECONSTRUCTIONS` constant). Five buildings: Whaley House (1885), 628 E Kearsley Frame House, Carriage Town Storefront, Worker's Cottage (1898), Stockton House (1872). Each carries `confidence` (Mass), `facade_confidence`, `roof_confidence`, `ground_floor_confidence`, `roof_form`, `time_start`, `time_end`, `source_ids` (real source references), `position` (visible-from-camera coordinates inside the historic district), `footprint` width and depth in meters
  - Backend authority: `our-civic-atlas-backend/migrations/0004_seed_carriage_town_specs.sql` (referenced from the fixture's comment at line 100). The frontend fixture is the camera-friendly visible-from-frustum subset; the migration is the canonical seed
- **Real source IDs in the fixture map to real archival sources**:
  - Whaley House: `habs:mi-318` (Historic American Buildings Survey #MI-318), `loc:sanborn:flint:1899:s18` (Library of Congress Sanborn Flint 1899 sheet 18)
  - 628 E Kearsley: `loc:sanborn:flint:1899:s18`
  - Storefront: `sloan:storefront-1925`, `loc:sanborn:flint:1899:s18`
  - Worker's Cottage: `loc:sanborn:flint:1899:s18`
  - Stockton House: `loc:sanborn:flint:1899:s18`, `genesee:stockton-genealogy`
  This is the floor of evidence diversity: every building has 1 to 2 sources. The spec line 76 says "Five to twelve cards arrive depending on what evidence the engine assembled. If the parcel is evidence-poor, fewer cards appear and the user sees that scarcity directly." Carriage Town v1 is evidence-poor; that is honest
- **Static JSON shim path for the fixture**: `useHistoricalReconstructions` hook at `src/lib/atlas/use-historical-reconstructions.ts` fetches `/atlas/historical/<bookmark>.json` and falls back to the in-file fixture on any error. The hook comment at line 10 to 19 says the JSON shape "was authored to match the `HistoricalReconstructionsAt` query in `src/lib/api/graphql/queries/historical.graphql` already, so the mapping is mostly a 1:1 field rename" when the GraphQL bridge lands
- **Sanborn ingest skeleton wired to Mapwarper**: `ingest_sanborn.py` (247 lines) has `list_sheets_for_bbox` against `mapwarper.net/maps.json?bbox=...`, Ray task structure, per-sheet metadata fetch via httpx, `make_training_record` emission, `ProvenanceLane.PRIMARY_ARCHIVAL` tagging, bbox-based geometry fallback. Per Track 2 audit §"#2 Corpus inventory": "the bottleneck is engineering the ingest path"; the data is available

### Skeleton

- **Sanborn vectorizer + color-key decoder + OCR**: per Track 2 audit, ~100 to 200 lines of HSV color thresholding plus connected-component labeling, ~80 lines of digit OCR (Tesseract or VLM), ~150 lines of per-polygon vectorization using rasterio + shapely
- **Direct-upload loader**: ~50 lines to accept a local raster plus georeferencing JSON for hand-held files (LoC TIFFs, UM-Flint scans)
- **PostGIS commit path**: `commit_to_postgis` is gated off; returns `"postgis_status": "not-wired"`. ~100 lines plus a Rust-side gRPC bridge call

### Absent

- **`DecodedArtifact` rows in production PostGIS**: zero (Track 2 audit §"#2"). The end-to-end pipeline is the engineering effort; the data inputs are not the bottleneck
- **Photograph, directory, text-mention evidence repositories at parity with Sanborn**: spec lines 84 to 92 reference all four source types contributing to direct extraction. Sanborn is the current ingest target; photograph, directory, and text-mention ingests live in spec but not yet in `civic_atlas_ingest`
- **Source-type to visual-identity mapping**: the spec at lines 36 to 38 prescribes per-source-type visual cards (Sanborn = amber paper + sepia, photographs = chamfered frames, directory entries = typewritten cards, text mentions = italic quote slips). The existing `SourceType` enum in the GraphQL schema covers the categories (`HISTORICAL_ARCHIVE`, `PHOTO_ARCHIVE`, `PUBLIC_RECORD`, `NEWS`, etc.), but no frontend component maps source type to visual card identity yet

## Prerequisite 3: A glTF asset generation pipeline producing atelier-compatible building masses

### Works

- **Three-tier asset dispatch is implemented** in `src/components/atlas/AtlasLostFlintDeckLayer.ts` lines 49 to 290:
  - `.glb` / `.gltf` URLs route to a `ScenegraphLayer`, one draw call per unique URL (lines 411 to 431)
  - `.splat` / `.ply` URLs are recognized and reserved (lines 13 to 16 of the docstring); currently fall through to the procedural box until a dedicated Gaussian-splat WebGL layer ships
  - `geometry_url === null` renders a procedural extruded box through the `ConfidenceMixMeshLayer` shader subclass
- **Per-part confidence shader is shipped** (`ConfidenceMixMeshLayer` at lines 164 to 276). Four per-instance attributes (`instanceMassConfidence`, `instanceFacadeConfidence`, `instanceRoofConfidence`, `instanceGroundFloorConfidence`). Fragment shader picks a zone by `vMeshPos.z` (ground floor under 0.15, facade between 0.15 and 0.85, roof above 0.85), takes `effective = min(zoneConfidence, vMassConfidence)`, and scatters porcelain over faithful warm stone via a hash-based 2D value noise. Mass acts as floor on every zone
- **Asset hosting convention is documented**: glTF assets at `public/atlas/historical/<slug>/<file>.glb`, referenced as `/atlas/historical/<slug>/<file>.glb` (`AtlasLostFlintDeckLayer.ts` lines 86 to 90). Same-origin keeps CORS out of the loader path
- **Pre-built roof-form geometries**: `createFlatBoxGeometry`, `createGableRoofedBoxGeometry`, `createHippedRoofedBoxGeometry` at `src/components/atlas/LostFlintGeometries.ts`. Built once at module load, shared across all instances of a given form to keep draw-call batching effective
- **R3F variant of the lost-flint layer**: `AtlasLostFlintLayer` at `src/components/atlas/AtlasBuildingsLayer.tsx` lines 218 to 281. Renders procedural extruded boxes with `GHOST_PALETTE` material (`shadow` color, `mid` emissive) in the R3F scene path. The deck.gl path is the production renderer; the R3F variant is the renderer-mode-`scene` alternative
- **Phase B Blender geo-nodes pipeline operational** (Track 2 audit §"#3 What's complete"). Produces glTF + per-part metadata. The atelier inherits this directly: glTF assets with per-part metadata slot into the existing `ScenegraphLayer` path

### Skeleton

- **Splat layer**: reserved in the dispatch but not yet implemented. `AtlasLostFlintDeckLayer.ts` line 13 marks it explicitly. Not on the v1 atelier critical path
- **R3F per-part shader port** (XRL-D-002 in the Lost Flint brainstorm): the deck.gl `ConfidenceMixMeshLayer` shader is the production renderer; an R3F port for landmark glTF buildings is reserved but optional for atelier v1

### Absent

- **Per-part `nodeId` attached to glTF mesh metadata**: the spec at line 283 prescribes "glTF + per-part metadata (which parts have what confidence, which parts came from which source) so the dossier and conflict markers can attach to specific geometry." The Blender pipeline produces glTF; per-part `nodeId` metadata (matching the `ReconstructionNodeTree` Pascal-node IDs) is not yet wired through. The atelier needs this addressing primitive to make conflict markers and source-card connection lines attach to specific parts. Plan item

## Prerequisite 4: The atelier UI itself

### Works

- **The `HistoricalReconstruction` type maps 1 to 1 with the spec's reconstruction record**: `src/lib/atlas/historical-reconstruction.ts` lines 28 to 95. Per-part confidence fields, footprint, height, bearing, time_start, time_end, source_ids, geometry_url, foundry_asset_url. Aligns with spec lines 197 to 235 (the dossier "RECONSTRUCTION DOSSIER" example) field by field
- **The `ReconstructionNodeTree` Pascal-node tree exists**: `src/lib/atlas/reconstruction-node-tree.ts` (572 lines, current in-degree zero in the import graph per the compute_code PPR). Provides stable node IDs like `reconstruction-node:historical:carriage-town:whaley-house:facade` for every part (site, building, level, mass, facade, opening_grid, ground_floor, roof, texture_face). `createReconstructionNodeTree(reconstructions)` constructs the tree from `HistoricalReconstruction[]`; `applyNodeTreeToHistoricalReconstruction(...)` round-trips edits back; `getReconstructionNodePath(...)` walks parent chain; `diffReconstructionNodeTrees(before, after)` produces patch ops (add/remove/update). Design doc: `docs/design/reconstruction-node-tree-adapter.md`. The atelier is the natural first consumer of this tree: per-part conflict markers and per-part dossier rows address parts by `nodeId`
- **The Carriage Town pilot route exists**: `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx`. Mounts `OpenFlintAtlasScene` with `initialBookmark="carriage-town"` and `initialSearchValue="1925"`. The atelier route layers ON TOP of this: a takeover surface entered from this route, not a replacement
- **The `DossierPayload` shape exists**: `src/lib/atlas/dossier-payload.ts` (480 lines). Has tabs for overview, sources, history, nearby, interventions, safety, metrics, evidence, contribute. The atelier dossier extends this shape with a "reconstruction" view that renders the per-part spec (the spec lines 197 to 235 example). The atelier dossier panel is a different visual register inside the atelier surface; it is NOT the existing `PlaceDossier` component but it consumes a related payload
- **The dynamic island has tab infrastructure**: `src/components/atlas/AtlasDynamicIsland.tsx` `IslandTab` union (line 39): `"ask" | "layers" | "scenarios" | "time" | "place" | "horizon"`. Tab list assembly at line 193 to 205. The spec proposes a new "Open Atelier" entry-point icon (line 26), which can plug in either as a new tab adjacent to "ask" or as a button inside the "place" tab. The existing `BuildingDossier` component at lines 901 to 975 already has a `DossierDisabledAction` button labeled "Reconstruct historical view" (line 969) explicitly marked `Coming soon`. That button is the atelier's natural entry-point trigger. The atelier replaces this disabled action with a real one
- **The search bar already detects temporal queries**: `parseAtlasYear(searchValue)` at `src/lib/atlas/atlas-time.ts` returns the year for a 4-digit input. The collapsed island shows "Time travel" mode when a year is set (`AtlasDynamicIsland.tsx` lines 346 to 361). The spec at lines 27 to 27 proposes that when a temporal query is detected, the search bar surfaces a "Reconstruct this view" affordance. This is a small extension on top of the existing year-detection
- **Right-click / long-press hooks**: building selection flows through `onBuildingSelect` and `selectedBuilding` state in `OpenFlintAtlasScene.tsx`. Adding a right-click handler for buildings with `status: lost` (or any parcel with a known temporal predecessor) routes into the atelier. The infrastructure is in place; the predicate ("is this a lost building") needs the historical-reconstruction set as a filter
- **The visual register the atelier inverts is locked**: `--ctx-paper #f2f1ec`, `--ctx-paper-soft #eae8e0`, `--ctx-paper-deep #dcd9cf` at `src/app/open-flint-atlas/atlas.css` lines 47 to 49. The atelier's proposed `#26221c` warm graphite (spec line 35) extends this scale with a fourth darker tone. Natural token name (matches existing convention): `--ctx-paper-night` or scoped `--atelier-paper`. The atelier's CSS file lives at `src/app/open-flint-atlas/atelier/atelier.css` (new), following the existing `atlas.css` scoping pattern
- **The ghost palette is mirrored in code**: `GHOST_PALETTE` constant at `src/lib/atlas/historical-reconstruction.ts` lines 251 to 255. `highlight #F2F8F7`, `mid #CFE0DC`, `shadow #9CC0B8`. These ARE the building material colors per `docs/design/visual-grammar-v1.md` §"Confidence palette". The atelier's building shader stays on this palette. The atelier surface DARKNESS is a chrome decision, not a material decision: the atelier inverts the SURFACE (paper grid background) while the buildings inside it stay porcelain
- **Animation infrastructure is available**: `framer-motion` is in `package.json` (used in `AtlasDynamicIsland.tsx` for island shape-shift, in chrome for tab transitions). R3F `useFrame` is in use in `AtlasThreeScene.tsx`. R3F `Line` from `@react-three/drei` renders provenance lines. The terracotta evidence-to-part connection lines (spec line 39) reuse `Line` with a custom material
- **`prefers-reduced-motion` pattern is established**: `OpenFlintAtlasScene.tsx` lines 363 to 370 use `window.matchMedia("(prefers-reduced-motion: reduce)").matches` to gate camera easing. The atelier choreographer uses the same gate
- **GraphQL pattern for service-tier-auth-server-side is set**: the `civicResearch` mutation at `docs/design/flint-graphql-schema-v1.graphql` lines 619 to 641 is the canonical worked example. Theseus harness → gRPC bridge → Axum civic-atlas-server resolver → GraphQL response → urql in the frontend. No frontend Theseus token. The atelier's new fields follow this exact pattern (see `graphql-contract.md`)

### Skeleton

- The `BuildingDossier` "Reconstruct historical view" disabled action at `AtlasDynamicIsland.tsx` line 969. This is the spec's right-click entry point in a different form (line 28 to 28 of the spec). Plan item: wire it
- The Lost Flint UI brainstorm at `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` synthesized a related set of decisions in the prior session (CU-L3-001). Approved-direction items that the atelier inherits without re-deciding:
  - Confidence thresholds 60/90 across present-day and historical (T1)
  - Year deep-link via `?year=N` query param with 250ms debounce (Track 2 option 2b)
  - R3F overlay is landmark glTF only; procedural stays on deck.gl (T4)
  - Porcelain fraction = 0.05 + (1 - confidence) * 0.90 (Track 4 option 4b)
  - Stacked-row layout for parts inside expanded island (Track 5 option 5c)
  - Civic-language map for node-tree terms (T6)
  - Pending corrections badge hidden when count is zero (Track 6 option 6b)
- The brainstorm's approved direction was "the expanded dynamic island IS the place page" (Track 1 option 1a). The atelier proposes a DIFFERENT decision: a separate full-screen takeover surface for the reconstruction-as-process moment. The two decisions are not in conflict; they govern different surfaces. The place page (in the island) shows place metadata. The atelier shows the reconstruction-as-it-happens. The atelier is entered FROM the place page (via the BuildingDossier disabled action made real)

### Absent

- **The atelier route**: `/open-flint-atlas/atelier/[parcelId]/[year]` does not exist. Plan item
- **The atelier surface itself**: no component yet. The spec at lines 22 to 31 prescribes a full-screen takeover that fades the map/dynamic island/top bar to a darker treatment. Plan item
- **The reconstruction animation choreographer**: no module yet. Plan item (see `animation-choreography.md`)
- **Source card visual identity per type**: no per-type source card components. The atelier needs Sanborn, Photograph, Directory, TextMention variants (spec lines 36 to 38). Plan item
- **Evidence-to-part terracotta connection lines**: no module yet. Plan item
- **Conflict markers (3D space)**: no module yet. Plan item
- **The atelier dossier side panel**: the spec at lines 197 to 235 prescribes a side panel with MASS / FACADE / ROOF / GROUND FLOOR / ORNAMENTS / CONFLICTS / SOURCES sections. The existing `PlaceDossier` component is the wrong shape (place metadata, not per-part reconstruction spec). Plan item
- **Skip / replay / auto-play-at-1.5x state machine**: no module yet. Plan item
- **The atelier exit transition back to the Lost Flint layer**: the spec at line 246 says "with the reconstructed building visible in the atlas as a Lost Flint layer overlay (faint, present-as-ghost on the present-day map). The user can re-enter the atelier on this building anytime." The Lost Flint overlay exists; the transition choreography does not. Plan item

## Quick-reference cross-index for the implementation plan

The implementation plan checklist items (`PT-001` onward in `implementation-plan.md`) reference this inventory by path. To save round-trips when reading the plan, here is a flat lookup of the most-referenced files:

| Concern | File | Key role |
|---|---|---|
| Reconstruction type | `src/lib/atlas/historical-reconstruction.ts` | Per-part confidence, Carriage Town seed, GHOST_PALETTE |
| Pascal node tree | `src/lib/atlas/reconstruction-node-tree.ts` | Per-part addressing for markers + dossier |
| Dossier payload (existing) | `src/lib/atlas/dossier-payload.ts` | Reference shape; atelier dossier extends |
| Carriage Town route | `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx` | Entry-point sibling to the atelier route |
| Scene assembly | `src/components/atlas/OpenFlintAtlasScene.tsx` | The shell the atelier replaces in takeover mode |
| Dynamic island | `src/components/atlas/AtlasDynamicIsland.tsx` | The "Reconstruct historical view" entry point |
| Scene chrome | `src/components/atlas/AtlasSceneChrome.tsx` | Where atelier-entry chrome adds an affordance |
| Lost Flint deck layer | `src/components/atlas/AtlasLostFlintDeckLayer.ts` | Three-tier dispatch + per-part confidence shader |
| Lost Flint R3F layer | `src/components/atlas/AtlasBuildingsLayer.tsx` | R3F variant the atelier extends for in-scene markers |
| R3F scene | `src/components/atlas/AtlasThreeScene.tsx` | Camera rig + scene base layer the atelier overrides |
| Reconstructions data hook | `src/lib/atlas/use-historical-reconstructions.ts` | Fetch path; GraphQL swap target |
| GraphQL schema | `docs/design/flint-graphql-schema-v1.graphql` | "Draft for review"; atelier extends |
| Visual grammar | `docs/design/visual-grammar-v1.md` | Locks ghost palette, jargon ban, dynamic-island universal chrome |
| Lost Flint brainstorm | `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` | Prior approved decisions the atelier inherits |
| Node-tree adapter | `docs/design/reconstruction-node-tree-adapter.md` | Decision rationale for the Pascal tree |
| Track 2 audit | `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md` | Backend status as of yesterday |
| Atlas tokens | `src/app/open-flint-atlas/atlas.css` lines 47 to 49 | `--ctx-paper*` scale the atelier extends |
| Atlas global CSS | `src/app/globals.css` | Sparse 45-line file; new tokens live in atlas.css, not here |
| Backend Rust engine | `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs` | 3,325 lines; all four interfaces implemented |
| Backend Carriage Town seed | `our-civic-atlas-backend/migrations/0004_seed_carriage_town_specs.sql` | Authority for the five-building set |
| Backend Pairformer | `civic_atlas_ingest/building_head_pairformer.py` | 421 lines; weights untrained |
| Backend training loop | `civic_atlas_ingest/building_head_train.py` | Skeleton, ~300 to 500 lines from production |
| Backend Sanborn ingest | `civic_atlas_ingest/ingest_sanborn.py` | 30% complete |

## Three honest claims that drive the plan

1. **The reconstruction stack is closer to production than the Sanborn data pipeline.** Per Track 2 audit: zero `DecodedArtifact` rows today, but the Pairformer architecture is fully built and the Rust engine interfaces are real. The fastest path to a demonstrable Carriage Town reconstruction is the Sanborn vectorizer plus the training-loop fill-in, both parallelizable.
2. **The atelier UI can ship visually correct against the existing Carriage Town fixture** (`FLINT_LOST_RECONSTRUCTIONS`) before the model trains or the ingest catches up. The spec at line 287 authorizes this. The v1 SHIP gate is "Carriage Town real-data end-to-end" (spec line 281, 287); the v1 BUILD gate is "atelier surface working against the existing fixture." These are different milestones.
3. **The atelier surface is a sibling of `AtlasThreeScene` plus `AtlasMap`, not a deep refactor.** Per the compute_code communities analysis (modularity 0.605), the atlas community is one big tightly-coupled cluster (49 of 76 src/ nodes). The atelier slots in as another node in that community, consuming the same `HistoricalReconstruction` data, the same projection math, the same R3F + deck.gl runtime. It does not break existing patterns.

End of codebase inventory.
