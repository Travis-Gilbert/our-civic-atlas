# Orchestrate Plan: Phase C Zoning Model And Buildable Envelope

## Executive Summary

- Goal: compute and visualize current Flint buildable envelopes per parcel under real zoning rules.
- Intent: create the ArcGIS Urban-style "maximum envelope" capability for OpenAtlas while preserving the public atlas renderer boundary and preparing Phase D scenario branching.
- Summary of work: add tenant-scoped zoning rules and buildable-envelope storage in `our-civic-atlas-backend`, add zoning/envelope ingestion and mesh generation in `civic-atlas-ingest`, expose a GraphQL read surface, and render transparent envelope volumes in the public atlas behind a reversible layer toggle.

## Current Condition

- This repo's public atlas route uses `MapLibre + deck.gl` as the geospatial base. R3F is not the atlas base; it is a selective scene/object overlay path.
- Phase A planning is now captured in `docs/plans/building-typology-phase-a-plan.md`. Its typology classes become the allowed-use vocabulary for zoning-envelope rules.
- `src/components/atlas/AtlasMap.tsx` already renders current OSM buildings as deck.gl extrusions over MapLibre.
- `src/components/atlas/AtlasLostFlintDeckLayer.ts` already has a GLB/GTLF dispatch path for Lost Flint assets, but Phase C should not depend on Blender or the Lost Flint reconstruction producer.
- `docs/design/flint-graphql-schema-v1.graphql` exists as the frontend schema boundary; GraphQL codegen is wired but not regenerated in this plan.
- `our-civic-atlas-backend` already has PostGIS, `parcels`, `buildings`, `generated_assets`, `TenantContext`, and RLS policies. Phase C tables must add `tenant_id` rather than copying the downloaded SQL literally.
- `civic-atlas-ingest` has Ray/RunPod execution stubs, `scene_foundry.py`, OSM/assessor source lanes, Phase C zoning/envelope modules, and `OSMnx` for road-network snapshots. `trimesh`/`pygltflib` are still deferred because the single-parcel proof now emits deterministic GLB bytes without those heavier mesh libraries.
- Official Flint zoning sources are available now:
  - City zoning page lists the current zoning map dated February 6, 2025, zoning code adopted October 29, 2022 and last amended effective December 7, 2025, plus a use table updated March 5, 2026.
  - City ArcGIS services expose `Main_COF_Parcel` geometry with `PIDdash`, `PIDText`, `Zoning`, `LandUse`, and related parcel fields.
  - City ArcGIS services expose `COF_Parcel_Zoning_Viewtbl` with `PIDdash`, `Current_Zoning`, `Current_Landuse`, `Previous_Zoning`, and `Ward`.

## Goal

- User-visible outcome: selected parcels can show a semi-transparent "zoning allows" volume above current buildings, with a Place tab summary for currently built, zoning allows, and headroom.
- System behavior: given tenant, city pack, parcel, zoning rule, road-network snapshot, and `scenario_id`, the envelope computation is deterministic and idempotent.
- Data/model changes: zoning rules, source-backed rule provenance, buildable envelopes, GLB/cache metadata, scenario seams, and envelope metrics become first-class data.
- Operational impact: zoning ingestion and envelope computation run as Ray/RunPod batch jobs, while PostGIS remains truth and the frontend consumes GraphQL/read-model outputs only.
- What must not regress: current OSM building rendering, MapLibre/deck.gl map authority, tenant isolation, no frontend service secrets, no raw owner fields in public fixtures, and no hidden scenario schema migration in Phase D.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Envelope data path returns a parcel envelope and the layer can render/toggle. | Backend/query smoke, `npm run typecheck`, browser smoke. | planned |
| Product complete | Envelope view is legible, transparent, and equal-or-better than the current map when enabled. | Before/after screenshots desktop + mobile. | planned |
| Vision complete | OpenAtlas shows real zoning headroom tied to current Flint rules and Phase D-ready scenarios. | Scenario seam + headroom panel + visual gate. | planned |
| Baseline capture | Current parcel/building view captured before envelope layer. | Visual evidence PNGs. | planned |
| Do Not Downgrade | Envelope rendering cannot replace or obscure current buildings by default. | Toggle off by default, screenshot review. | planned |
| Reversible boundary | Envelope layer is independently disableable and can fall back to deck.gl extrusion if R3F/GLB loader is not ready. | Layer flag and renderer-mode review. | planned |

## Vision Delta

- Target vision: OpenAtlas can show what Flint zoning permits on a parcel, not just what exists today.
- Current visual condition: current buildings render as present-day mass, but zoning, headroom, setbacks, FAR, and buildable volume are not visible.
- This plan makes true: real Flint zoning sources are modeled, current parcel envelopes are computed, and UI exposes envelope metrics in resident-readable language.
- This plan does not make true: editable zoning scenarios, side-by-side scenario compare, KPI deltas, public comment/e-submission, or full Civic Model Studio.
- Visual downgrade risks: transparent volumes can occlude current buildings, color systems can collide with typology colors, and mobile can become unreadable if every parcel renders at once.
- Remaining gaps: rule extraction from the zoning code, setbacks and corner-lot handling, R3F/GLB loader confirmation, and scenario/KPI/comment phases.

## Context Stack

| Context | Source | Trust | Why it matters |
|---|---|---|---|
| Phase C downloaded spec | `/Users/travisgilbert/Downloads/SPEC-PHASE-C-ZONING-ENVELOPE.md` | high as user intent, advisory on renderer details | Defines zoning rule schema, envelope algorithm, scenario seams, and done definition. |
| Repo renderer policy | `AGENTS.md`, `docs/SYSTEM-BLUEPRINT.md`, `AtlasMap.tsx` | high | Forces MapLibre/deck.gl as public base; R3F remains selective overlay. |
| Phase A plan | `docs/plans/building-typology-phase-a-plan.md` | high | Provides allowed-use vocabulary and ArcGIS Urban parity framing. |
| Flint zoning official page | City of Flint zoning page | high | Current code/map/use-table source of truth. |
| Flint ArcGIS parcel services | `Main_COF_Parcel_view`, `COF_Parcel_Zoning_Viewtbl` | high for public GIS structure | Provides stable parcel IDs/zoning fields and geometry path. |
| Backend truth boundary | `our-civic-atlas-backend/migrations/*`, `TenantContext` proto | high | Every Phase C table/API must be tenant scoped. |
| Ingest execution boundary | `civic-atlas-ingest/pyproject.toml`, `scene_foundry.py` | high | Phase C belongs in Ray/RunPod Python geospatial batch work, not frontend code. |
| ArcGIS Urban docs | Esri Urban docs | medium/high product comparator | Confirms the target: zoning rules in 3D, maximum envelopes, scenario planning, metrics. |

## Delegation Map

| Work type | Route to | Why |
|---|---|---|
| Source verification | data/docs | Zoning code, use table, parcel service, and zoning table must be captured before code. |
| Zoning schema + parser | `civic-atlas-ingest` | Python is the right home for PDF/GIS ingestion and validation. |
| Envelope compute | `civic-atlas-ingest` | Shapely/trimesh/Ray batch path belongs upstream. |
| Tenant-safe persistence/API | `our-civic-atlas-backend` | PostGIS truth, RLS, gRPC, and GraphQL sidecar live there. |
| Public rendering | this repo | Layer controls, map rendering, Place tab, and visual gate live here. |
| Visual validation | browser/screenshot gate | Product complete depends on real rendering, not just data. |

## Action Rail

| Action | Risk | Validator | Approval | Route |
|---|---|---|---|---|
| ZE-A1: Verify and snapshot Flint zoning sources | Low | Fetch PDFs/services and record hashes/fields | No | data/docs |
| ZE-A2: Add tenant-scoped backend schema first | Medium | Migration/RLS review | No | backend |
| ZE-A3: Build one-parcel envelope prototype | Medium | GLB valid + envelope metrics match hand calculation | No | ingest |
| ZE-A4: Add GraphQL envelope contract | Medium | Codegen/query smoke | No | backend/frontend |
| ZE-A5: Add frontend layer toggle after runtime proof | Medium/high visual risk | Before/after screenshot gate | No | frontend |
| ZE-A6: Promote R3F/GLB overlay only if loader passes visual gate | High | R3F/deck.gl comparison | Yes if it would replace primary path | frontend/renderer |

## Checklist

| ID | Task | Grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| ZE-000 | Reconcile Phase C spec with current repo boundaries. | Downloaded spec, `AGENTS.md`, `AtlasMap.tsx`, backend RLS. | planning | This plan exists and names deck.gl/R3F, tenant, and Phase D seams. | Markdown review. | Phase C starts in the wrong renderer or repo. | done |
| ZE-001 | Snapshot official Flint zoning source package. | City zoning page, zoning map PDF, zoning code PDF, use table, quick reference. | data/docs | Store source URLs, retrieval date, document hashes, version notes, and code/use-table effective dates in a city pack manifest. | Fetch/hash smoke. | Rules are computed from stale or uncited law. | done |
| ZE-002 | Verify public parcel/zoning services and field mapping. | `Main_COF_Parcel`, `COF_Parcel_Zoning_Viewtbl`. | data/docs | Confirm geometry source, `PIDdash`/`PIDText`, `Zoning`, `Current_Zoning`, land-use fields, coordinate system, and public-query limits. | ArcGIS REST query sample. | Envelope rows cannot join to parcels. | done |
| ZE-003 | Add Phase C dependencies and schemas in ingest. | `civic-atlas-ingest/pyproject.toml`. | ingest | Add `trimesh`, `pygltflib`, `osmnx`, `pandera`, and Pydantic v2 if missing; create `zoning_schema.py`. | Unit test round-trips sample rule JSON. | Dependency drift or invalid rule payloads. | partial |
| ZE-004 | Parse zoning rules into city-pack data. | `zoning_schema.py`, Flint PDFs/services. | ingest/data | `zoning_ingest.py` emits all current Flint zoning codes with massing limits, use lists, source section, confidence, and valid dates. | Pandera/Pydantic validation and code-count audit. | Legal text extraction silently drops constraints. | done |
| ZE-005 | Add tenant-scoped PostGIS tables. | backend migrations. | backend | `zoning_rules`, `zoning_boundaries`, and `buildable_envelopes` include `tenant_id`, `city_pack`, `scenario_id`, source fields, indexes, RLS, and idempotent keys. | Migration review/RLS test. | Cross-tenant data leakage or Phase D schema churn. | done |
| ZE-006 | Add edge classification for setbacks. | Spec algorithm, OSMnx roads. | ingest | `envelope_edge_classifier.py` deterministically assigns front/side/rear edges and flags corner lots; `road_network_sources.py` snapshots OSMnx drive roads into GeoJSON LineStrings. | Unit tests plus 20-parcel spot check, including corner lots. | Wrong setbacks produce false envelopes. | done |
| ZE-007 | Compute one envelope deterministically. | Shapely/trimesh algorithm. | ingest | `envelope_compute.py` accepts parcel + rule + edge classes and returns `PolygonZ`, GLB bytes, hash, floors, GFA, units/null, binding constraint, and warnings. | Unit test with simple rectangle + hand-calculated expected metrics. | Envelope math looks plausible but is wrong. | done |
| ZE-008 | Batch current Flint envelopes. | Ray/RunPod runtime. | ingest/backend | `envelope_batch.py` writes `scenario_id='current'` rows, emits content-addressed GLB assets when enabled, and records skip reasons for parcels that cannot produce a valid envelope. | Full no-assets run, 200-row checked-in sample, asset-write smoke, and idempotent hash smoke. | Expensive recompute or missing parcels. | done |
| ZE-009 | Add backend service/API contract. | backend gRPC/GraphQL sidecar, `flint-graphql-schema-v1.graphql`. | backend/frontend | `parcel(id).envelope(scenarioId)` returns rule, metrics, binding constraint, confidence, GLB/read-model URI, and warnings. | Query smoke and codegen. | Frontend fetches raw backend/service credentials. | planned |
| ZE-010 | Add frontend read model and layer state. | `OpenFlintAtlasScene.tsx`, `LayerControls.tsx`, `renderer-bridge.ts`. | frontend | "Buildable envelope" toggle exists, off by default, and selected-parcel loading is stateful. | Typecheck and interaction smoke. | Layer affects all parcels before performance is proven. | planned |
| ZE-011 | Render transparent envelope volume. | `AtlasMap.tsx`, Lost Flint GLB dispatch, Phase B loader. | frontend/renderer | Envelope is visible above current buildings, with deck.gl extrusion as baseline and optional R3F/GLB overlay after loader gate. | Desktop/mobile screenshots and nonblank render check. | Envelope occludes buildings or downgrades map UX. | planned |
| ZE-012 | Add Place tab headroom panel. | Control/Place dossier surfaces. | frontend | Selected parcel shows currently built, zoning allows, headroom, binding constraint, and caveat in plain civic language. | Browser smoke with fixture parcel. | Numbers disagree with backend metrics. | planned |
| ZE-013 | Add docs and Phase D handoff. | `docs/zoning-envelope.md`, scenario manifests. | docs/product | Docs explain rule schema, sources, envelope math, confidence, renderer path, and Phase D scenario extension. | Docs review. | Future scenario work reopens table/API design. | planned |

## Test Strategy

- Preflight: fetch Flint zoning documents, query ArcGIS parcel services, inspect field mappings, and verify no owner/contact fields enter public fixtures.
- Focused: Pydantic/pandera schema tests, zoning parser fixtures, OSMnx road-snapshot fixtures, setback edge-classifier fixtures, rectangle/irregular parcel envelope math tests, GLB validity test.
- Integration: backend migration/RLS tests, batch idempotency, GraphQL query smoke, frontend codegen, selected-parcel envelope load.
- Regression: `npm run typecheck`, `npm run lint`, `npm run validate:atlas`, backend `cargo test --workspace`, ingest `pytest`.
- Static/type/lint: Python `ruff`/mypy where configured, SQL migration review, TypeScript codegen/typecheck.
- Manual smoke: `/open-flint-atlas` desktop and mobile, selected parcel with envelope off/on, current buildings still readable, headroom panel matches backend payload.
- Performance/security: render only selected parcel or viewport-limited envelopes first; cache GLB/read-model artifacts by hash; no secrets or raw private parcel owner fields in frontend.

## Production Gates

- [ ] Tests pass or failures are explained.
- [ ] No unchecked migration or data risk.
- [ ] No secrets or destructive commands introduced.
- [ ] Error paths considered.
- [ ] Observability/logging considered.
- [ ] Rollback/revert path exists.
- [ ] Docs/ADR updated or explicitly deferred.
- [ ] Redis/harness writeback is proven or explicitly deferred.
- [ ] UI visual work has before/after/target evidence or an explicit validation gap.
- [ ] UI visual work passes the Do Not Downgrade gate before Product complete.
- [ ] Final report can reconcile every checklist item.

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | Phase C must be tenant-scoped from the first migration. | Project invariant, backend RLS migrations. | high | Add `tenant_id` to every zoning/envelope table. |
| Claim | `scenario_id` belongs in Phase C even when only `current` exists. | Downloaded spec and Phase D user outline. | high | Put `scenario_id` in storage and API now. |
| Claim | Flint has usable public zoning/parcel source seams today. | City zoning page and ArcGIS REST services. | high | Start with source snapshot and service query smoke. |
| Claim | Envelope render should preserve MapLibre/deck.gl as the public base. | AGENTS and system blueprint. | high | Use deck.gl extrusion/read model as baseline; R3F/GLB overlay only behind visual gate. |
| Tension | The spec says R3F, but repo policy parks R3F outside Lost Flint/selective overlays. | Downloaded spec vs AGENTS. | high | Keep R3F optional/selective; do not replace the map base. |
| Tension | Zoning PDFs and GIS attributes may disagree. | City page lists current docs; ArcGIS services have edit dates and field values. | medium | Record source precedence and confidence per rule/boundary. |

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk | Follow-up |
|---|---|---|---|
| Phase D scenario branching UI | Phase C only writes `scenario_id='current'`. | Scenario ambition remains invisible until next phase. | Add scenario table/overrides after current envelopes are stable. |
| Phase E KPI service | Requires demographics, multipliers, and scenario-aware metrics. | Headroom panel may feel narrow. | Build after scenario storage exists. |
| Phase F public comment/e-submission | Requires workflow, moderation, privacy, and auth decisions. | Civic engagement arrives later. | Use contribution lifecycle plan as later lane. |
| CityEngine/PyPRT/Vitruvio | Licensing blocks web-service deployment. | None. | Stay with Shapely/trimesh/Ray. |
| Blender for envelopes | Overkill for simple extruded zoning volumes. | None. | Blender remains for reconstruction assets only. |
| Interactive sub-100ms scenario recompute | Python batch is v1; Rust hot path is only needed after scenario editing proves latency pressure. | Scenario edits may be slow later. | Add `civic-atlas-envelope-engine` Rust crate if needed. |

## Execution Instructions

- Start with `ZE-001` and `ZE-002`, then `ZE-003` and `ZE-005` in parallel.
- Preserve: tenant isolation, PostGIS truth, frontend GraphQL boundary, MapLibre/deck.gl public base, reversible visual layer, no private parcel owner data, and `scenario_id` across all Phase C surfaces.
- Run: source fetch/query smoke, ingest `pytest`, backend migration/RLS tests, `cargo test --workspace`, frontend `npm run typecheck`, `npm run lint`, and browser screenshot review for `/open-flint-atlas`.
- Report using Orchestrate Report and reconcile Runtime complete, Product complete, and Vision complete separately.

## Execution Notes

- 2026-05-22: `civic-atlas-ingest` now has `zoning_sources.py`, `zoning_schema.py`, focused tests, and `city_packs/flint/zoning/source-manifest.json`. The source manifest hashes 8 official Flint source/REST metadata URLs, confirms both required REST layers have no missing fields, and joins 5 parcel geometry rows to parcel zoning rows with 0 mismatches. It also records the explicit policy that ArcGIS REST is a public HTTP/JSON source only, with no Esri SDK, ArcGIS Urban, CityEngine, or ArcGIS Runtime dependency.
- 2026-05-22: `our-civic-atlas-backend` now has `migrations/0007_zoning_envelope_schema.sql` plus `zoning_envelope_schema.rs` tests for tenant scope, RLS, source hashes, scenario readiness, and no Esri product dependency.
- 2026-05-22: `ZE-003` is partial because the typed ingest records and `osmnx` road dependency are in place, but `trimesh`, `pygltflib`, and pandera/Pydantic rule models are still deferred until batch geometry complexity requires them.
- 2026-05-22: `zoning_ingest.py` emits `city_packs/flint/zoning/rules-current.json` with 18 current Flint zoning district rules, source table names, dimensional standards in meters, and confidence values. No numeric FAR caps were found in the extracted district dimensional tables; use-table categories are kept as Phase A hints rather than legal replacements for raw P/S/A/ARU semantics.
- 2026-05-22: `envelope_edge_classifier.py` adds a deterministic cardinal front/rear/side classifier from parcel geometry and road-line snapshots, including corner-lot flags. `road_network_sources.py` adds the OSMnx boundary for Flint drive-road snapshots and normalizes 13,102 OSM drive-road edges into GeoJSON LineStrings. `city_packs/flint/zoning/edge-spotcheck-current.json` records a 20-parcel spot check with 5 corner lots and 0 skips, so `ZE-006` is done for the Phase C classifier.
- 2026-05-22: `envelope_compute.py` adds a deterministic pure-Python single-parcel envelope proof that returns a `BuildableEnvelopeSeed` plus GLB bytes, GLB SHA-256, PolygonZ, footprint area, floor area, residential unit estimate/null, headroom, and binding constraint. `ZE-007` is done for the single-parcel contract; batch persistence/rendering remains `ZE-008` onward.
- 2026-05-22: `parcel_sources.py` and `envelope_batch.py` add the current-envelope batch path. A checked-in 200-parcel live sample produced 200 rows, 0 skips, and content hash `84b2f40734922f66bd75b5eab4de2aadce7e61f09a7fb8c92a6bebb1b2034157`. A separate full no-assets run to `/tmp/civic-atlas-envelopes-current-full.json` traversed the public parcel source and produced 52,562 envelope rows with 2,356 explicit skips: 1,383 parcels where setbacks exceeded buildable area and 973 parcel rows whose public zoning value was `None`. A 20-row asset-write smoke produced 20 content-addressed GLB files under `/tmp/civic-atlas-envelope-assets`, so `ZE-008` is done for the batch contract while PostGIS/API publication remains `ZE-009`.

## References

- City of Flint Zoning Division: https://www.cityofflint.com/zoning-division/
- City ArcGIS parcel zoning table: https://services5.arcgis.com/lqqWNtSxx8Akj04A/ArcGIS/rest/services/COF_Parcel_Zoning_Viewtbl/FeatureServer/0
- City ArcGIS parcel geometry view: https://services5.arcgis.com/lqqWNtSxx8Akj04A/ArcGIS/rest/services/Main_COF_Parcel_view/FeatureServer/0
- ArcGIS Urban "What is Urban": https://doc.arcgis.com/en/urban/latest/get-started/get-started-what-is-urban.htm
- ArcGIS Urban "Manage zoning": https://doc.arcgis.com/en/urban/latest/data/data-manager-zoning.htm
- ArcGIS Urban "Plans": https://doc.arcgis.com/en/urban/latest/get-started/get-started-plans.htm
