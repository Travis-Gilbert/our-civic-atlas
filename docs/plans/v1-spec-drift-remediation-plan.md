# Orchestrate Plan: V1 Spec Drift Remediation

## Executive Summary

- Goal: resolve DRIFT-001 through DRIFT-010 against the full V1 intent, not the minimum existing app.
- Intent: treat the V1 visual spec as the floor. The target product is a Three/R3F-first Atlas Scene where MapLibre/deck.gl remain baselines, fallbacks, and data/geography helpers rather than the final emotional renderer.
- Summary of work: correct renderer posture, add drift-specific implementation work items, preserve current read-model behavior while building the richer scene stack, then move to the remaining GAP plan after drift is reconciled.

## Current Condition

- The launch app repo is `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas`.
- The idea vault remains `/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org`.
- Current runtime is Next.js with MapLibre/deck.gl desktop, Leaflet mobile, Mosaic/vgplot/DuckDB-WASM timeline, cosmos.gl provenance, fixture-backed routes, and static package contracts.
- Current docs still describe MapLibre/deck.gl as the primary live atlas renderer and Three/R3F as selective overlays.
- The corrected product intent is: R3F/Three owns the primary civic-world renderer; MapLibre/deck.gl are baseline/fallback renderers and useful geospatial/data overlay surfaces; Mosaic/DuckDB/WASM powers fast analytical loading and crossfilter; Brush/IFC/OpenBIM feed reviewed SceneManifest assets; Rusty Red/Redis-style hot graph services can support geocaching, hashing, nearby lookup, and viewport/session acceleration without becoming canonical truth.

## Goal

- User-visible outcome: Flint opens as an authored civic scene, not a generic map with panels. Users can inspect place, time, evidence, source support, node federation, contribution state, and historical memory from a full-canvas scene.
- System behavior: the app retains the current public read route while adding a Three/R3F SceneHost path driven by CivicObject, SceneManifest, Mosaic/DuckDB selections, and hot geocache/hash lookups.
- Data/model changes: add or extend scene payloads for civic objects, render states, geocache keys, hashable viewport packages, selected-object scene refs, Lost Flint fixtures, document anchors, and contribution receipt states.
- Operational impact: current MapLibre/deck.gl route remains as baseline/fallback until the Three/R3F scene passes runtime and visual gates; Rusty Red/hot graph acceleration is planned as an optimization lane, not a source of truth.
- What must not regress: source visibility, public/private contribution boundary, dossier/provenance access, fixture route stability, mobile usability, non-official public-good framing, and reproducible read models.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Three/R3F scene path mounts with fixture data, selection, and fallback route intact. | Typecheck, build, route smoke, canvas nonblank smoke. | partial |
| Product complete | R3F Atlas Scene is equal-or-better than baseline and reaches V1 visual intent. | Before/after/target screenshots at desktop and 390 x 844. | planned |
| Vision complete | Flint feels like a bounded civic world with source-backed memory, evidence, Node Horizon, and contribution affordances. | DRIFT-001 through DRIFT-010 reconciliation. | planned |
| Baseline capture | Current MapLibre/deck.gl and mobile Leaflet states are captured. | Screenshot ledger. | planned |
| Do Not Downgrade | Baseline map/dossier/timeline/provenance remain available until replacement passes gates. | Fallback route or renderer toggle plus screenshot review. | planned |
| Reversible boundary | R3F renderer lands as a separate component/route/adapter before primary replacement. | Component boundary and git diff. | done |

## Vision Delta

- Target vision: full-canvas R3F/Three civic scene with MapLibre/deck.gl as fallback and geospatial helpers, Mosaic/DuckDB as the analysis/data plane, Brush/IFC/OpenBIM as asset sources, and Rusty Red/hot graph geocaching for speed.
- Current condition: useful routed reader, but renderer docs and implementation still center MapLibre/deck.gl and panel overlays.
- This drift plan makes true: every drift item has a direct remediation path and the renderer ambition is corrected in the repo.
- This drift plan does not by itself complete: all R3F implementation, contribution backend writes, Lost Flint full data ingestion, Rusty Red deployment, or all GAP items.
- Accepted risk posture: visual ambition and renderer complexity are allowed. Risks are tracked as execution constraints and validation evidence, not as reasons to reduce the target.

## Context Stack

| Context | Source | Trust | Why it matters |
|---|---|---|---|
| V1 visual spec drift list | `Flint.OurAtlast.org/UI for First Release/V1 UI Spec.md` | high | Names DRIFT-001 through DRIFT-010 and the intended V1 UI pieces. |
| Launch plan | `docs/plans/our-civic-atlas-v1-launch-plan.md` | high | Existing OCA checklist and recovery evidence. |
| Renderer plan | `docs/plans/renderer-stack-integration.md` | high, now corrected | Owns runtime role definitions. |
| System blueprint | `docs/SYSTEM-BLUEPRINT.md` | high | Contribution, review, confidence/progress, and source boundaries. |
| Current app | `src/components/atlas/*`, `src/lib/atlas/*` | high | Live runtime truth. |
| Product vault | `docs/product-vault/flint-ouratlast/source-notes/*` | advisory/product intent | Holds the broader R3F, Brush, IFC/OpenBIM, Mosaic, and Rusty Red intent. |

## Delegation Map

| Work type | Route to | Why |
|---|---|---|
| Drift plan and checklist | `production-theorem:orchestrate` | Stable IDs and visual gates. |
| R3F/Three renderer | Three/R3F implementation lane | Primary V1 scene runtime. |
| Baseline/fallback map | MapLibre/deck.gl lane | Preserve working map and geospatial fallback. |
| Analytical data plane | Mosaic/vgplot/DuckDB-WASM lane | Fast crossfilter and read-model slicing. |
| Scene assets | Brush/IFC/OpenBIM Scene Foundry lane | Reviewed built-form and reconstruction assets. |
| Hot geocache/hash | Rusty Red/Redis hot graph lane | Viewport, nearby, and hash acceleration. |
| Visual validation | Browser/Playwright route smoke | UI visual gates require screenshots. |

## Action Rail

| Action | Risk | Validator | Approval | Route |
|---|---|---|---|---|
| Correct renderer docs | Low | `git diff --check` and review | none | docs |
| Add R3F SceneHost plan boundary | Medium | typecheck once implemented | none | renderer |
| Capture baseline screenshots | Low | screenshot ledger | none | validation |
| Implement Three/R3F scene shell | High | canvas nonblank, selection smoke, fallback smoke | none | renderer |
| Wire Mosaic selection into scene payloads | Medium | brushed event/place fixture smoke | none | data/frontend |
| Add Rusty Red geocache contract | Medium | hash/idempotency fixtures | none | data/backend |
| Replace primary path after parity | High | Do Not Downgrade gate | user review recommended | visual/product |

## Checklist

| ID | Task | Grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| DRIFT-001 | Reframe stale empty-state drift around live fixture data and sparse-mode transparency. | V1 spec, current 222 places / 7 events / 15 sources | frontend/product | Counts are treated as package status; sparse modes show source-backed planned states, not broken emptiness. | Route screenshots and copy review. | Solving stale "0 data" symptom instead of launch data clarity. | planned |
| DRIFT-002 | Correct renderer target to Three/R3F-first Atlas Scene with MapLibre/deck.gl baseline/fallback. | user correction, renderer docs, product vault | renderer/docs | Repo docs and implementation plan name R3F/Three as primary target, MapLibre/deck.gl as fallback/baseline, and preserve fallback route. | `git diff --check`, doc review. | Future sessions keep flattening the target to a map overlay. | done |
| DRIFT-003 | Add document/source inspection states without public Evidence mode. | V1 camera spec, `scene-view.ts`, user correction | renderer/frontend | Public mode rail stays Explore/Memory/Safety/Interventions plus camera controls; document/source inspection is a private/detail workflow until product-approved. | Typecheck and route smoke after implementation. | Internal evidence concepts leak into the public navigation. | planned |
| DRIFT-004 | Resolve Scene as a first-class V1 experience without breaking current routed lenses. | V1 mode system, `/scene/[sceneId]` route | frontend/renderer | Scene can begin as a route-backed R3F preview and graduate to primary lens after visual gates. Dynamic Island chrome should carry the active focus, navigation, dossier, and horizon context instead of reopening heavy rails. | Route smoke and screenshot review. | Scene remains hidden detail page rather than product mode. | partial |
| DRIFT-005 | Replace right-side Node Horizon list with spatial horizon control. | `AtlasSceneChrome.tsx`, Node Horizon spec | frontend/federation | Horizon reads as a spatial field in-world, while chrome access is compressed into the Dynamic Island instead of a persistent right-side dossier rail. | Desktop/mobile screenshots, route click smoke. | Federation feels administrative. | done |
| DRIFT-006 | Replace truth-meter confidence wording with support/progress system. | `PlaceDossier.tsx`, system blueprint | frontend/content | Public UI uses support/progress labels, reasons, next checks, and evidence links. | Copy grep, screenshot review. | Trust UI overclaims. | planned |
| DRIFT-007 | Redesign Sources page from equal cards to registry table plus detail drawer. | `sources/page.tsx`, V1 source spec | frontend/sources | Table/list hybrid supports filtering by tier, freshness, risk, layer type, and used-in objects. | Route screenshot and keyboard smoke. | Source review stays slow/heavy. | done |
| DRIFT-008 | Plan and implement contribution intake/receipt UI boundary. | `contribute/page.tsx`, contribution schema | frontend/backend | Object-origin contribution actions show receipt states and public/private split; backend writes remain honest until implemented. | Route smoke and privacy copy review. | Users infer unreviewed publication. | planned |
| DRIFT-009 | Add Lost Flint R3F visual prototype path. | V1 Lost Flint, temporal registry note | renderer/data | One bounded area can render current, vanished, inferred, and article-linked objects with support/source links. | Fixture validation, R3F screenshot smoke. | Emotional center remains conceptual. | planned |
| DRIFT-010 | Add screenshot ledger and Do Not Downgrade gate for drift execution. | Orchestrate UI gates | validation | Before/after/target ledger exists and blocks Product complete until reviewed. | Browser screenshots, final report reconciliation. | Runtime complete gets mistaken for product complete. | partial |

## Drift Execution Phases

| Phase | Drift IDs | Outcome |
|---|---|---|
| Phase A: Correct intent | DRIFT-002, DRIFT-010 | Renderer target and validation gate are no longer ambiguous. |
| Phase B: Preserve baseline while opening R3F path | DRIFT-003, DRIFT-004 | SceneHost/R3F path begins without breaking current route. |
| Phase C: Product surface cleanup | DRIFT-001, DRIFT-005, DRIFT-006, DRIFT-007, DRIFT-008 | Current UI stops contradicting the V1 intent. |
| Phase D: Memory/asset depth | DRIFT-009 | Lost Flint becomes a visible R3F prototype. |

## Visual Evidence Ledger

Product complete is blocked until these are captured and reviewed. The first
documentation slice creates the ledger; screenshot capture happens when the
renderer work begins.

| Evidence ID | Route/state | Viewport | Baseline | Target | After | Status |
|---|---|---:|---|---|---|---|
| VEL-001 | `/open-flint-atlas` Explore, populated data | 1440 x 900 | captured | required | captured | partial |
| VEL-002 | `/open-flint-atlas` Explore, populated data | 390 x 844 | captured | required | captured | partial |
| VEL-003 | Selected-place dossier/source support state | 1440 x 900 | required | required | required | planned |
| VEL-004 | `/open-flint-atlas/sources` registry view | 1440 x 900 | required | required | required | planned |
| VEL-005 | `/open-flint-atlas/sources` registry view | 390 x 844 | required | required | required | planned |
| VEL-006 | `/open-flint-atlas/contribute` receipt/intake boundary | 1440 x 900 | required | required | required | planned |
| VEL-007 | `/open-flint-atlas/contribute` receipt/intake boundary | 390 x 844 | required | required | required | planned |
| VEL-008 | R3F SceneHost prototype with fallback available | 1440 x 900 | not applicable | required | captured | partial |
| VEL-009 | R3F SceneHost prototype with fallback available | 390 x 844 | not applicable | required | captured | partial |

## Execution Status

| Item | Status | Evidence |
|---|---|---|
| Drift plan artifact created | done | `docs/plans/v1-spec-drift-remediation-plan.md` |
| Renderer posture corrected | done | `docs/plans/renderer-stack-integration.md`, `docs/plans/our-civic-atlas-v1-launch-plan.md`, `docs/SYSTEM-BLUEPRINT.md`, `AGENTS.md` |
| Screenshot gate created | partial | Visual Evidence Ledger exists; first screenshots live in `docs/visual-evidence/v1-drift/`. Target/reference screenshots and remaining routes still need capture. |
| Runtime implementation | partial | `src/components/atlas/AtlasThreeScene.tsx` exists as an opt-in prototype via `?renderer=scene`; MapLibre/Leaflet remains the public default until R3F passes visual parity. |
| Public Evidence mode removal | done | Evidence is no longer in the public lens list or routed public lens params. |
| Spatial horizon markers | done | R3F SceneHost now renders direction-aware distant atlas surfaces, while focus/navigation/dossier/horizon chrome is compressed into the Dynamic Island instead of the old right-side rail. |

## Renderer Architecture Target

| Layer | V1 role | Notes |
|---|---|---|
| Three/R3F SceneHost | Primary visual renderer | Full-canvas civic world, camera choreography, ghost objects, source halos, Node Horizon spatial portals, document/evidence spatial states. |
| MapLibre | Baseline/fallback and coordinate/tile helper | Keep current route, use for fallback map, bounds, vector tiles, PMTiles and geospatial camera reference. |
| deck.gl | GPU data overlay fallback and utility | Keep useful layers for crash/corridor/point/Tile3D experiments and fallback data weather. |
| Mosaic/vgplot/DuckDB-WASM | Data loading and linked analysis plane | Crossfilter, brush, Parquet/GeoParquet slicing, chart/table state feeding scene selections. |
| Brush | Reviewed reconstruction asset lane | Splat/reconstruction assets only when backed by real images. |
| IFC/OpenBIM | Built-form semantic lane | Parse/inspect/convert open building semantics into SceneManifest assets. |
| Rusty Red/hot graph | Geocache/hash acceleration | Viewport hashes, nearby object lookup, session hot graph, source crawl state, active scene cache. Not canonical truth. |
| PostGIS/DuckDB/GeoParquet/PMTiles | Spatial/read-model truth/export lane | Geometry and public read models. |
| Memgraph/Theseus | Provenance/civic graph truth | Source, claim, review, conflict, observation, and relationship graph. |

## Test Strategy

- Preflight: `git diff --check`, `npm run typecheck`, `npm run lint`, `npm run validate:atlas`.
- Focused: renderer role doc review, route smoke for `/open-flint-atlas`, selected-place source-support state, `/open-flint-atlas/sources`, `/open-flint-atlas/contribute`, `/open-flint-atlas/scene/*`.
- Integration: R3F SceneHost selection, fallback renderer toggle, Mosaic brush to scene selection, dossier/provenance link.
- Regression: current MapLibre/deck.gl and Leaflet routes remain open until replacement passes visual gates.
- Static/type/lint: TypeScript for renderer adapters and data contracts.
- Manual smoke: desktop 1440 x 900 and mobile 390 x 844.
- Performance/security: nonblank canvas, lazy asset loading, no raw uploads, no private data in public fixtures, hashed viewport/cache keys do not expose secrets.

## Production Gates

- [ ] Tests pass or failures are explained.
- [ ] No unchecked migration or data risk.
- [ ] No secrets or destructive commands introduced.
- [ ] Error paths considered.
- [ ] Observability/logging considered for renderer load, fallback, source refresh, read-model rebuild, scene asset failure, and privacy blocks.
- [ ] Rollback/revert path exists through MapLibre/deck.gl fallback.
- [ ] Docs/ADR updated or explicitly deferred.
- [ ] Rusty Red/hot graph writeback is proven or explicitly deferred.
- [ ] UI visual work has before/after/target evidence or an explicit validation gap.
- [ ] UI visual work passes the Do Not Downgrade gate before Product complete.
- [ ] Final report reconciles DRIFT-001 through DRIFT-010.

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | R3F/Three is the intended primary V1 renderer, not merely an overlay. | User correction plus product vault renderer notes. | high | Correct docs and plan implementation around SceneHost. |
| Claim | MapLibre/deck.gl remain valuable as baseline/fallback and geospatial/data helpers. | Current runtime and installed dependencies. | high | Preserve fallback until R3F passes visual gates. |
| Claim | Mosaic/DuckDB-WASM is part of the performance architecture, not just a chart add-on. | Existing `mosaic.ts`, `atlas-data.ts`, timeline integration. | high | Feed scene selections from the same data plane. |
| Claim | Rusty Red/hot graph can accelerate geocaching/hashing without becoming canonical truth. | Product vault notes and launch plan OCA-021. | medium | Add cache/hash contract before backend dependency. |
| Tension | The full visual ambition increases complexity and mobile risk. | R3F/WebGL/asset stack. | high | Accept ambition, preserve fallback, validate visually. |

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk | Follow-up |
|---|---|---|---|
| Removing MapLibre/deck.gl immediately | Baseline/fallback is needed until R3F parity. | Duplicate renderer work temporarily. | Replace primary only after visual gates. |
| Treating Rusty Red as canonical spatial/provenance store | It is a hot geocache/hash/session layer. | Cache truth drift. | Keep source of truth in spatial/read-model and provenance stores. |
| Publishing raw contribution writes during drift remediation | Receipt/review/privacy must land first. | Privacy or rumor risk. | DRIFT-008 then GAP contribution plan. |
| Full Brush/IFC asset generation in the first drift slice | Need SceneManifest and reviewed asset provenance first. | R3F prototype may use simpler fixtures first. | DRIFT-009 plus Scene Foundry gap plan. |

## Execution Instructions

- Start with DRIFT-002 and DRIFT-010 documentation/validation corrections.
- Preserve current route behavior and fallback map until R3F is equal-or-better.
- Build R3F/Three as the primary target, not a decorative overlay.
- Use Mosaic/DuckDB selections as a real data plane for the scene.
- Treat Brush/IFC/OpenBIM and Rusty Red geocache/hash as planned architecture lanes.
- After DRIFT-001 through DRIFT-010 have explicit reconciliation, create the follow-on GAP plan for GAP-001 through GAP-012.
