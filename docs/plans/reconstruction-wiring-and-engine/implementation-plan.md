# Planning-Theorem Artifact: Reconstruction wiring, data, OCR, and the building-generation engine

Sequencing directive (user, binding): WIRING FIRST. Data and OCR/ingestion are
the critical path. The building-generation engine (procedural grammar +
photogrammetry, researched in `../building-generation-engine/research-and-architecture.md`)
is DOWNSTREAM and must not be sequenced ahead of wiring. Generation pointed at
fixtures is worthless; it only earns its place once real data flows.

## Executive Summary
- Goal: make the Atelier and the broader map render REAL reconstruction data
  from the Axum backend (killing the honest "no network connection" fallback),
  feed that backend good data via OCR + ingestion, then layer the building
  generation engine and the OSMnx map substrate on top.
- Intent: the system the user can see should be the real thing, connected to
  good data, not a beautiful fixture.
- Summary of work: Phase 1 run/connect/deploy the existing Axum
  `civic-atlas-server` and prove one building end-to-end on the real surface.
  Phase 2 connect real data providers to the reconstruction attributes. Phase 3
  wire Sanborn OCR + document ingestion into those attributes. Phase 4 add the
  OSMnx street-grid + footprint base layer. Phase 5 (downstream) the building
  generation engine.

## Current Condition
Grounded in the local working trees on 2026-05-30.

- The frontend GraphQL client (`src/lib/api/graphql/client.ts`) targets the Axum
  `civic-atlas-server` at `http://127.0.0.1:4001/graphql` (override
  `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`). Architecture in effect: urql ->
  Axum async-graphql -> in-process Rust services -> Postgres/PostGIS (sqlx) +
  Theseus harness (bridge URL). Frontend ships no service-tier auth (correct per
  the service-tier rule).
- The Axum service is NOT running locally: `curl http://127.0.0.1:4001/graphql`
  returns `000`. THIS is the direct cause of the "no network connection" the
  user sees. `useReconstructionDossier({fallback:true})`
  (`src/lib/atlas/use-reconstruction-dossier.ts`) then drops to the in-repo
  fixture synthesizer (`atelier-fallback-synthesizer.ts`), so the Whaley House
  the screenshots show is the HONEST fallback, not live data.
- Correction (user, 2026-05-30): the cause was a RAILWAY outage, not a missing
  deployment. The Railway-deployed Axum service (or its Railway Postgres/Theseus
  upstream) was offline and is recovering. Local probes show no `.env` override
  and no Claude-side dev server, so the build the user sees is theirs and reaches
  the Railway endpoint. Implication: the wiring is more complete than the worst
  case assumed. Phase 1 shifts from "deploy + run from scratch" toward "verify
  the deployed service serves real data, confirm the Atelier flips to
  `source:"graphql"`, and close the `THESEUS_BRIDGE_URL` (#9) + affordance-gRPC
  (#19) gaps." The local `:4001` path remains the dev fallback.
- The Axum repo (`our-civic-atlas-backend`) has the crates to do this:
  `civic-atlas-server`, `civic-atlas-reconstruction-engine`, `civic-atlas-types`,
  `theseus-client`, `rustyred-client`, `tenant-resolver`,
  `civic-atlas-outbox-worker`, `civic-atlas-cli`. Reconstruction schema tests
  exist (`civic-atlas-server/tests/reconstruction_truth_schema.rs`,
  `reconstruction_jobs_schema.rs`; `civic-atlas-types/tests/reconstruction_spec_roundtrip.rs`).
  Two blockers are open in the task list: set `THESEUS_BRIDGE_URL` on Railway,
  and wire the affordance gRPC end to end.
- OCR + ingestion spine already exists in Index-API: `apps/notebook/web/ocr.py`
  (+ `web/tests/test_ocr.py`), `artifact_views/docling_adapter.py` (Docling
  layout-aware document parsing), `file_ingestion.py`, `multimodal/`
  (provider/contracts/validators). No Sanborn-specific symbology parse yet.
- Data providers are wired in `apps/notebook/search/kernel/providers/`:
  `arcgis_rest, burst_crawler, internet_archive, library_of_congress,
  mediawiki, osm_overpass, semantic_scholar, world_bank`.
- Reconstruction attributes `Material / Color / Bays / Use` render as
  `PartUndocumented` placeholders in `AtelierDossierPanel.tsx`: the engine does
  not yet populate them, so a grammar has no signal beyond footprint/height/roof.
- OSMnx (verified against its GitHub README): downloads/models street networks,
  building footprints, and POIs from OpenStreetMap; outputs GeoDataFrame +
  networkx graph. Sits above the existing raw `osm_overpass.py` provider. Exact
  v2 `features` module API to confirm at implementation
  (https://osmnx.readthedocs.io/en/stable/user-reference.html).

## Intent
The user looked at the live build, saw a convincing building, and correctly
distrusted it because the UI said "no network connection." They want the real
thing connected to good data, with OCR/ingestion feeding it, before any more
investment in how buildings look. Make the visible product the real product.

## Goal
- User-visible outcome: the Atelier and map render reconstructions from the live
  backend (`source: "graphql"`), with real per-part attributes, and no
  "no network connection" state on a healthy system.
- System behavior: Axum `civic-atlas-server` runs in dev (:4001) and prod
  (Railway), reachable by the frontend; reconstruction resolvers return real
  Postgres/PostGIS + Theseus-derived data; OCR/ingestion populates reconstruction
  attributes.
- Data/model changes: populate `material/bays/use/storeys/style` from real
  sources; persist OSMnx footprints to PostGIS; persist Sanborn-OCR outputs as
  evidence feeding the attributes.
- Operational impact: one more long-lived service (Axum) in local dev + Railway;
  ingestion/OCR jobs (RQ / Modal) for Sanborn batches.
- What must not regress: the honest-fallback behavior (production must still
  surface backend outages as errors, never silently fake data); the
  service-tier-auth rule (no upstream credentials in the frontend); the existing
  deck.gl GLB map rendering.

## UI Visual Milestone
| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Axum answers :4001; Atelier query returns `source:"graphql"`. | curl :4001/graphql 200; network panel shows the GraphQL request. | planned |
| Product complete | Live Atelier is equal-or-better than the fixture Atelier (same or richer dossier, real attributes). | Before (fixture screenshot, captured) / after (live) review. | planned |
| Vision complete | Real data drives a recognizable building; "no network connection" gone on healthy system. | Live screenshot + dossier with non-placeholder attributes. | planned |
| Baseline capture | Fixture Atelier + box-vs-grammar shots captured this session (`/tmp/atelier-*.png`). | Existing screenshots; recapture on the live path. | partial |
| Do Not Downgrade | The procedural grammar prototype + deck.gl GLB map stay equal-or-better when fed live data. | Visual gate review before enabling. | planned |
| Reversible boundary | `{fallback:true}` dev path + the parametric box remain as the reversible boundary. | Hook option + roof-form branch already in place. | done |

## Vision Delta
- Target vision: a civic reconstruction the public can trust, drawn from real
  evidence, honest about confidence, connected end-to-end.
- Current visual condition: a porcelain grammar house rendered from fixture data
  with "no network connection" shown.
- This plan makes true: real backend data in the Atelier/map; real per-part
  attributes; Sanborn OCR feeding the engine; OSMnx base map; generation gated
  behind real data.
- This plan does not make true (yet): photoreal buildings; full city coverage;
  the generative/single-image-to-3D speculative layer.
- Visual downgrade risks: live data could be sparser than the fixture (a building
  with fewer attributes looks plainer). Mitigation: the grammar + box fallbacks
  keep a floor; ghosting shows what is unknown rather than faking it.
- Remaining renderer/data/interaction/design gaps: SPLAT/PLY R3F loaders; the
  per-part-confidence ghosting; Sanborn symbology coverage.

## Codebase Grounding
| Area | Evidence | Notes |
|---|---|---|
| FE GraphQL endpoint | `src/lib/api/graphql/client.ts` | :4001 default, `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL` prod |
| Fallback decision | `src/lib/atlas/use-reconstruction-dossier.ts` | fixture only on schema-error/network-fail; prod `fallback:false` |
| No-connection cause | `curl :4001/graphql -> 000` | Axum service not running |
| Axum crates | `our-civic-atlas-backend/crates/*` | server + reconstruction-engine + theseus-client present |
| Resolver presence | `civic-atlas-server/tests/reconstruction_*_schema.rs` | schema tests exist; verify resolvers return real (not stub) data |
| Open blockers | task list #9 `THESEUS_BRIDGE_URL`, #19 affordance gRPC | required for engine->Theseus |
| OCR/ingestion | `apps/notebook/web/ocr.py`, `artifact_views/docling_adapter.py`, `file_ingestion.py` | spine exists; no Sanborn symbology parse |
| Data providers | `apps/notebook/search/kernel/providers/*` | osm_overpass, library_of_congress, arcgis_rest, internet_archive, ... |
| Undocumented attrs | `AtelierDossierPanel.tsx` `PartUndocumented` | material/bays/use/color empty |
| Generation research | `../building-generation-engine/research-and-architecture.md` | grammar->GLB cascade + honesty guardrail |
| GLB/SPLAT contract | `flint-graphql-schema-v1.graphql` `enum GeometryFormat` | GLB GLTF PLY SPLAT USD USDZ |
| OSMnx | GitHub README | footprints + networks + POIs -> GeoDataFrame/networkx |

## Orchestration Map
| Work type | Route to | Why |
|---|---|---|
| Axum run/deploy/resolver verify (Rust) | Codex (owns the Axum backend) + `/execute` | Rust backend is Codex's lane; coordinate via harness |
| Railway deploy + env | `use-railway` skill / railway MCP | service + env vars |
| OCR/Sanborn pipeline (Python/Django) | `scipy-pro:web-acquisition` + `nlp-pipeline` | ingestion + extraction |
| OSMnx footprint/network (Python) | `data-bridge` + PostGIS | geopandas -> PostGIS |
| Atelier geometryUrl cascade + ghosting (R3F) | `three-pro:three-developer` + design gate | visual, after wiring |
| Ambiguity / option pressure | `/theorize` | e.g. OSMnx-vs-Overpass reconciliation |

## Checklist
| ID | Task | Codebase grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| PT-W1 | Run `civic-atlas-server` locally on :4001 against Postgres/PostGIS | `crates/civic-atlas-server/src/main.rs` | Codex/`/execute` | `curl :4001/graphql` returns 200; GraphiQL loads | curl + introspection | DB/env config drift | planned |
| PT-W2 | Verify `reconstructionDossier`/`reconstructionFor` return REAL data for Carriage Town/Whaley House (not stubs) | `reconstruction_*_schema.rs`, reconstruction-engine crate | Codex | Atelier hook returns `source:"graphql"` with real fields | network panel + dossier render | resolver returns partial/stub | planned |
| PT-W3 | VERTICAL SLICE: one building renders real data end-to-end in the live Atelier | FE `useReconstructionDossier`, BE resolver | Claude+Codex | Live Atelier shows the Whaley House from GraphQL, no fallback banner | screenshot + `source` field | seam mismatch FE/BE | planned |
| PT-W4 | Set `THESEUS_BRIDGE_URL` + wire affordance gRPC so engine reaches Theseus/Index-API | task list #9, #19; `theseus-client` crate | Codex | reconstruction engine call resolves via bridge; civic research works | integration test | bridge/gRPC contract drift | planned |
| PT-W5 | Deploy `civic-atlas-server` to Railway; set `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL` on Vercel | `client.ts` env contract | `use-railway` | prod Atelier renders real data; no "no network connection" on healthy prod | prod smoke | deploy/CORS/env | planned |
| PT-D1 | Map each provider to the reconstruction attribute it can fill (footprint, stories, material, use) | `providers/*`, `building-fabric.ts` params | `web-acquisition` | a written provider->attribute matrix committed | doc review | source coverage gaps | planned |
| PT-D2 | Populate `material/bays/use/storeys` for Carriage Town from real sources; kill `PartUndocumented` | `AtelierDossierPanel.tsx`, scene_os reconstruction | Codex/Django | dossier shows real attributes, not placeholders | live dossier | sparse data per building | planned |
| PT-O1 | Sanborn ingestion: LoC provider -> map image -> Docling/OCR -> symbology parse (footprint, stories, material, use) | `library_of_congress.py`, `web/ocr.py`, `docling_adapter.py` | `web-acquisition`+`nlp-pipeline` | one Sanborn sheet yields structured attrs for >=1 building | unit + golden-file test | Sanborn symbology variety | planned |
| PT-O2 | Wire OCR output -> reconstruction attributes as evidence (with confidence + provenance) | reconstruction-engine `assemble_evidence` | Codex/Django | OCR-derived attrs appear in the dossier with citations | end-to-end test | attribution correctness | planned |
| PT-O3 | Ingest historical photos (Internet Archive/LoC) tagged as facade evidence for later capture/grounding | `internet_archive.py`, `multimodal/` | `web-acquisition` | photos linked to a reconstruction as typed evidence | dossier evidence list | licensing/coverage | planned |
| PT-M1 | OSMnx fetch Flint footprints + street network (verify v2 `features` API) -> GeoDataFrame -> PostGIS | `osm_overpass.py` (reconcile), PostGIS | `data-bridge` | Flint footprints + street graph persisted; counts sane | row counts + map render | OSMnx v2 API drift, Overpass rate limit | planned |
| PT-M2 | Render broader-map base (street grid + footprints) on the real map surface | `AtlasMap.tsx`, deck.gl/maplibre | `three-developer`/FE | base layer visible on the live map, not a demo route | screenshot | perf at city scale | planned |
| PT-G1 | Atelier geometryUrl cascade: load GLB via drei `useGLTF`; grammar prototype + box as fallbacks | `AtelierR3FScene.tsx`, `AtelierProceduralHouse.tsx`, schema `geometryUrl` | `three-developer` | GLB asset renders when present; falls back cleanly | screenshot + unit | loader/scale bugs | planned (after W+D+O) |
| PT-G2 | Grammar->GLB bake: complete `building-fabric` `pending_offline_generation` (headless Blender or three exporter) | `building-fabric.ts` `glb_status` | `data-bridge`/Modal | `glb_uri` resolves to a real asset, cached by `params_hash` | asset exists + renders | headless render infra | planned |
| PT-G3 | Honesty guardrail: per-part confidence -> ghost generated vs evidenced parts | GHOST palette, per-part confidence, conflict markers | `three-developer`+design gate | generated parts visibly ghosted; evidenced solid | visual review | confidence plumbing | planned |
| PT-G4 | Capture track: SPLAT/PLY R3F loaders + few-view/photogrammetry job (gated on surviving photos) | `enum GeometryFormat` SPLAT/PLY | `ml-builder` | a captured asset renders where photos exist | smoke | data scarcity, hallucination | deferred (last) |

## Test Strategy
- Preflight: `curl :4001/graphql`; `npm run typecheck`; `cargo test -p civic-atlas-server` (resolver schema tests); provider unit tests.
- Focused: reconstructionDossier resolver returns real fields for a known parcel; OCR golden-file test on one Sanborn sheet; OSMnx fetch returns non-empty footprints.
- Integration: FE Atelier query end-to-end returns `source:"graphql"`; engine->Theseus bridge call resolves.
- Regression: production `fallback:false` still surfaces outages as errors (no silent fixture); deck.gl GLB map unaffected; `validate:atlas` suite.
- Type/lint/static: `npm run typecheck`, `npm run lint`, `cargo clippy`.
- Manual smoke: live Atelier screenshot with no "no network connection"; dossier shows real attributes.
- Performance/security: city-scale footprint render budget; confirm no service-tier token reaches the frontend bundle.

## Production Gates
- [ ] Tests pass or failures explained (Rust resolver tests, OCR golden test, FE typecheck).
- [ ] No unchecked migration/data risk (PostGIS footprint + OCR-evidence writes reviewed).
- [ ] No secrets in the frontend; all upstream auth on Axum (service-tier rule).
- [ ] Error paths: backend outage still surfaces honestly in prod.
- [ ] Observability: log fallback activation; log resolver source.
- [ ] Rollback: `{fallback:true}` dev path + box fallback remain.
- [ ] Docs/ADR updated (this plan + building-generation-engine plan).
- [ ] UI visual: before(fixture)/after(live) screenshots captured.
- [ ] Do Not Downgrade gate passed before enabling generation on live data.
- [ ] Execution report reconciles every PT- item.

## Epistemic Ledger
| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | "No network connection" = Axum not running on :4001 | `curl :4001 -> 000`, fallback hook | High | Phase 1 PT-W1 |
| Claim | Reconstruction resolvers exist (not greenfield) | schema test files + task #20 completed | Medium-High | Verify real-vs-stub in PT-W2 |
| Claim | OCR/ingestion spine exists | `web/ocr.py`, `docling_adapter.py` | High | Build Sanborn parse on top (PT-O1) |
| Claim | OSMnx supplies footprints+networks | GitHub README | High | Verify v2 `features` API at PT-M1 |
| Tension | Live data may look plainer than the fixture | sparse real attrs vs rich fixture | Medium | Ghosting + grammar/box floor |
| Question | Are the Axum resolvers returning real or stub data? | unresolved | - | PT-W2 resolves it |

## Explicit Non-Goals and Deferrals
| Item | Why deferred | Risk of deferral | Follow-up |
|---|---|---|---|
| Generative single-image->3D (TRELLIS-class) | Hallucinates unobserved geometry; needs the honesty guardrail first | Low (grammar covers default) | PT-G4 successor, guard-railed |
| Full Flint coverage | Start vertical (Carriage Town) | Low | After the slice proves out |
| Photoreal materials (clapboard/brick textures) | Register is porcelain; form first | Low | Optional later layer |
| Mosaic/DuckDB cross-filter changes | Out of scope for wiring | Low | Existing surface untouched |

## Execution Instructions
- Start with: PT-W1 (run the Axum service), then the PT-W3 vertical slice (one
  building, real data, live Atelier). Do not start Phase 5 (PT-G*) until Phases
  1-3 are green.
- Preserve invariants: production never fakes data (`fallback:false` stays
  honest); no service-tier credential in the frontend; deck.gl GLB map and the
  grammar/box fallbacks remain equal-or-better.
- Coordinate the Rust/Axum items (PT-W*, PT-D2, PT-O2) with Codex via the harness
  (it owns `our-civic-atlas-backend`); claim before building on the shared tree.
- Run: `curl :4001/graphql`, `cargo test -p civic-atlas-server`,
  `npm run typecheck`, the `validate:atlas` suite, and a live Atelier screenshot.
- Report using the Execute-Theorem Report format, reconciling every PT- item.
