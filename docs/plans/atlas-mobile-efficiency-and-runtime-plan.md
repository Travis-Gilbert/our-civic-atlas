# Orchestrate Plan: Atlas Mobile Efficiency and Runtime Modernization

## Executive Summary

- Goal: define the production mobile-web efficiency stack that makes a `deck.gl`-first Atlas Scene viable on phones without regressing civic access, trust, or low-bandwidth usability.
- Intent: keep the current mobile Leaflet branch as the safe baseline while specifying the data/runtime changes required for a WebGL mobile route to earn promotion.
- Summary of work: formalize a binary-first public read-model stack, worker-heavy browser runtime, hot viewport cache strategy, multi-resolution spatial indexing, Rust acceleration lanes, and a reversible path from the current Leaflet mobile shell to a `deck.gl` mobile-web route.

## Current Condition

- The live repo is `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas-main`.
- The current mobile map is a deliberate fallback, not an accident. [MobileAtlasMap.tsx](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/components/atlas/MobileAtlasMap.tsx:1) documents why the repo currently swaps phone-class devices to `react-leaflet` instead of `MapLibre + deck.gl`.
- The desktop/public atlas base is already aligned around `MapLibre`, `deck.gl`, `PMTiles`, and `DuckDB-WASM` in [renderer-stack-integration.md](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/docs/plans/renderer-stack-integration.md:1).
- The launch plan already reserves explicit performance and low-bandwidth work under `OCA-020`, `OCA-020B`, `OCA-021`, and `OCA-027` in [our-civic-atlas-v1-launch-plan.md](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/docs/plans/our-civic-atlas-v1-launch-plan.md:143).
- The app already runs `DuckDB-WASM` in a worker-backed singleton through [mosaic.ts](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/lib/atlas/mosaic.ts:1), so the repo has one important piece of the intended runtime discipline today.
- The machine-readable mobile contract now also exposes [viewport-vector-contracts.json](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/data/open-flint-atlas/fixtures/static-package/data/viewport-vector-contracts.json:1), [scene-packet-compiler.json](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/data/open-flint-atlas/fixtures/static-package/data/scene-packet-compiler.json:1), and [scene-packets/index.json](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/data/open-flint-atlas/fixtures/static-package/data/scene-packets/index.json:1) so `FlatGeobuf` selection and packet assembly are public contracts, not just plan prose.
- Product-vault notes already name `GeoParquet`, `PMTiles`, `FlatGeobuf`, `DuckDB-WASM`, and Rusty Red as part of the intended public read-model and hot-state stack, but those ideas are not yet consolidated into one grounded execution plan.

## Goal

- User-visible outcome: mobile visitors get the same civic-world atlas identity as desktop, with fast first interaction, explainable layers, strong dossier access, and graceful degradation on weak networks or older devices.
- System behavior: the runtime serves lightweight, zoom-aware, viewport-aware scene data to the mobile client instead of shipping whole-city JSON blobs or desktop-only renderer assumptions.
- Data/model changes: add binary read-model contracts, viewport scene packets, multi-resolution spatial indexing, mobile performance budgets, and renderer-agnostic packet boundaries that can later map to native mobile runtimes.
- Operational impact: static/public artifacts become more intentionally packaged; workers, caches, and binary loaders become first-class runtime infrastructure; some preprocessing/build steps move toward Rust for throughput and determinism.
- What must not regress: current mobile usability, source/confidence clarity, low-bandwidth access, public reproducibility, and the storage split where Rusty Red is hot state rather than canonical truth.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Mobile runtime can load the atlas scene with the new stack. | Route smoke, worker smoke, bundle/load checks. | planned |
| Product complete | Mobile atlas feels equal-or-better than the current Leaflet fallback. | Before/after screenshots, touch smoke, dossier flow review. | planned |
| Vision complete | Mobile web becomes a first-class civic atlas surface instead of a reduced companion view. | Vision Delta and checklist reconciliation. | planned |
| Baseline capture | Current Leaflet mobile and current desktop atlas are captured as baseline references. | Existing mobile/desktop visual evidence. | planned |
| Do Not Downgrade | No mobile promotion happens unless civic access, trust, and clarity are preserved. | Visual gate review and throttled mobile smoke. | planned |
| Reversible boundary | The Leaflet path or equivalent baseline remains recoverable until the new path passes gates. | Route/module boundary review. | planned |

## Vision Delta

- Current mobile state is safe, legible, and lighter than desktop, but it is still a fallback path with reduced geospatial ambition.
- Target mobile state keeps civic access first while moving closer to the desktop atlas grammar: deck-backed overlays, viewport-aware loading, zoom-sensitive density, and faster scene hydration.
- This plan makes true: the mobile atlas performance stack becomes explicit, testable, and renderer-aware instead of remaining scattered across notes and assumptions.
- This plan does not make true: it does not immediately replace the mobile Leaflet route, promise native parity, or force all preprocessing into Rust regardless of payoff.
- The main risk is confusing “more capable renderer” with “better public product.” Mobile atlas quality is determined by load budget, touch clarity, source visibility, and degraded-mode behavior, not only by GPU capability.

## Context Stack

| Context | Source | Trust | Why it matters |
|---|---|---|---|
| Current mobile fallback rationale | [MobileAtlasMap.tsx](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/components/atlas/MobileAtlasMap.tsx:1) | high | Explains why the current mobile branch exists and what must be preserved before replacement. |
| Existing worker-backed analytics path | [mosaic.ts](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/src/lib/atlas/mosaic.ts:1) | high | Proves the repo already uses worker-backed `DuckDB-WASM` and can extend that discipline. |
| Renderer ownership and runtime boundaries | [renderer-stack-integration.md](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/docs/plans/renderer-stack-integration.md:1) | high | Keeps the plan inside the repo’s current stack instead of inventing a new one. |
| Launch checklist and low-bandwidth/mobile gates | [our-civic-atlas-v1-launch-plan.md](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/docs/plans/our-civic-atlas-v1-launch-plan.md:143) | high | Connects this plan to the existing OCA launch contract. |
| System product boundary | [SYSTEM-BLUEPRINT.md](/Users/travisgilbert/Tech%20Dev%20Local/Creative/Website/Open-Flint-Atlas-main/docs/SYSTEM-BLUEPRINT.md:1) | high | Keeps civic access, contribution, and trust UX ahead of renderer bravado. |
| Product-vault performance notes | `docs/product-vault/flint-ouratlast/source-notes/UI Upgrade 4.md` and `our-civic-atlas-ui-db-spec-v0.2.md` | medium | Supplies approved intent for `GeoParquet`, `PMTiles`, `FlatGeobuf`, and Rusty Red hot-state roles. |
| Current external runtime guidance | `deck.gl`, `loaders.gl`, `DuckDB-WASM`, `Mapbox GL JS`, `@rnmapbox/maps`, and `MapLibre React Native` docs | high | Grounds the binary/worker/mobile guidance and the future native boundary in current official docs. |

## Glossary

- `GeoParquet`: a `Parquet` file with geospatial metadata. In practice, it is a columnar geospatial read model that works well with `DuckDB`, Arrow, and browser analytics.
- `PMTiles`: a single-file map tile archive that can be hosted cheaply on static storage and fetched with HTTP range requests.
- `FlatGeobuf`: a binary geospatial format with spatial indexing that is useful for viewport-bounded feature retrieval over the network.
- `Scene packet`: a viewport/zoom/layer-specific binary payload shaped for a renderer, ideally as typed arrays rather than nested JSON feature objects.
- `H3` or `S2`: multi-resolution spatial indexing systems that make zoom-aware bucketing, nearby search, density, and cache keying far cheaper than scanning raw features.

## Delegation Map

| Work type | Route to | Why |
|---|---|---|
| Mobile runtime design | frontend/runtime | The main question is how to make the public map feel good on phones. |
| Binary data pipeline | data/frontend | `deck.gl` performance depends heavily on data shape and update discipline. |
| Read-model packaging | geospatial packaging/tooling | `GeoParquet`, `PMTiles`, and `FlatGeobuf` belong to the publish/build lane, not only the page layer. |
| Spatial indexing | backend/data systems | `H3`/`S2` and hot viewport keys should be deliberate infrastructure. |
| Rust acceleration | systems/tooling | Rust is valuable where preprocessing, indexing, packet building, or tile generation are CPU-heavy and deterministic. |
| Hot cache integration | Rusty Red / hot-state lane | Rusty Red should accelerate viewport hydration and nearby lookups without becoming canon. |
| Native future compatibility | mobile architecture | The packet contract should survive a later move to `@rnmapbox/maps` or equivalent. |

## Action Rail

| Action | Risk | Validator | Approval | Route |
|---|---|---|---|---|
| Freeze the current Leaflet mobile path as baseline evidence. | low | Screenshot + touch smoke. | no | frontend/validation |
| Define binary public read-model contracts for places, events, and heavy overlays. | medium | Fixture/package contract review. | no | data/docs |
| Design the viewport scene-packet compiler. | medium | Contract review + sample packet fixture. | no | data/runtime |
| Add a multi-resolution spatial index plan using `H3` or `S2`. | medium | Architecture review. | no | backend/data |
| Add worker boundaries for load/parse/query/render-prep. | medium | Main-thread profiling + worker smoke. | no | frontend/runtime |
| Create a feature-flagged deck mobile-web candidate route. | medium | Bundle review + mobile route smoke. | yes | frontend/map |
| Define Rust-owned preprocessing lanes. | low | Build contract review. | no | tooling/systems |

## Checklist

| ID | Task | Grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| MEP-001 | Define the mobile atlas runtime target and promotion gates. | Current Leaflet mobile fallback, OCA mobile gates | docs/product | The repo has one clear written answer for when Leaflet stays, when deck mobile is allowed, and what metrics/screens pass promotion. | Plan review against launch gates. | Mobile rewrite drifts into taste arguments. | done |
| MEP-002 | Adopt a binary-first public read-model contract. | Existing `DuckDB-WASM` and Mosaic lane | data/docs | Places, events, and dense overlays have a documented preferred shape: `GeoParquet`/Arrow/typed arrays first, JSON only for small control payloads and fallback. | Contract review and sample fixture plan. | JS object churn continues to dominate mobile runtime cost. | done |
| MEP-003 | Add `PMTiles` as the default heavy static map publication lane. | Renderer stack and product-vault notes | data/frontend | Basemap and large mostly-static map layers are explicitly assigned to `PMTiles`, with hosting, cache, and rebuild expectations documented. | Packaging review and tile smoke plan. | Public atlas keeps expensive ad hoc map fetch behavior. | done |
| MEP-004 | Add `FlatGeobuf` as the dynamic viewport retrieval lane. | Product-vault notes and mobile budget goals | data/frontend | Dynamic, review-oriented, or non-tiled vector subsets have a documented `FlatGeobuf` path with range-request and cache expectations. | Contract review and one sample layer selection rule. | Teams misuse `GeoJSON` for medium-sized dynamic slices. | done |
| MEP-005 | Design the viewport scene-packet compiler. | `deck.gl` binary attributes, Rusty Red hot-state role | data/runtime | A documented compiler stage emits zoom-aware, viewport-aware, layer-aware typed-array packets for renderers instead of raw full-city feature sets. | Packet schema review and one example packet sketch. | Runtime stays renderer-driven instead of budget-driven. | done |
| MEP-006 | Add a multi-resolution spatial index plan using `H3` or `S2`. | Nearby lookup, density, low-bandwidth goals | backend/data | The plan selects one indexing family and defines zoom buckets, cache keys, preaggregation, nearby lookup, and heat/density use cases. | Architecture review. | Viewport and density features remain too expensive on mobile. | planned |
| MEP-007 | Expand Rusty Red geocache into a first-class scene hydrator. | Existing hot-state boundary | backend/runtime | Rusty Red’s non-canonical role is explicit: nearby, viewport, session, ranking, and packet warm-up only. | Architecture review against storage split. | Hot cache slowly becomes accidental truth store. | planned |
| MEP-008 | Push heavy preprocessing/build lanes toward Rust where it clearly pays off. | User preference for Rust, packet/index/tile build needs | systems/tooling | The plan explicitly assigns packet compilation, spatial indexing helpers, format conversion, or tile generation to Rust when throughput/determinism matter, while leaving shell/product glue in TypeScript. | Tooling plan review. | Premature Rust migration increases complexity without mobile payoff. | planned |
| MEP-009 | Keep all heavy browser compute off the main thread. | Existing `mosaic.ts` worker pattern | frontend/runtime | `DuckDB-WASM`, large parse/decode tasks, and packet assembly have documented worker boundaries and failure/fallback behavior. | Profiling plan and worker smoke checklist. | Touch/scroll performance regresses even with better formats. | partial |
| MEP-010 | Add low-bandwidth and device-tier behavior rules. | OCA-020B and OCA-027 | frontend/perf | Device classes, network classes, fallback layers, feature caps, optional 3D, and text-first degraded mode are explicit. | Throttled smoke checklist. | “Mobile support” only works on strong devices. | planned |
| MEP-011 | Define the deck mobile-web candidate route behind a reversible boundary. | Current Leaflet route and visual gates | frontend/map | A new mobile-web candidate can ship behind a flag/route boundary without deleting the current fallback until it passes gates. | Route smoke, screenshot review, rollback review. | Mature mobile flow gets replaced too early. | planned |
| MEP-012 | Preserve a renderer-agnostic packet contract for future native apps. | Future React Native path | mobile architecture | The plan states clearly that web may use `deck.gl`, but scene packets, read models, and hot-state lookups must remain reusable for `@rnmapbox/maps` or a future native renderer. | Architecture review. | Web success paints the native path into a corner. | planned |
| MEP-013 | Add mobile atlas performance budgets and validation harness. | Existing build/visual validation culture | validation | The repo defines budgets for initial JS, worker spin-up, time-to-first-pan, time-to-first-dossier, layer count, memory pressure, and throttled-device behavior. | Budget checklist and smoke plan. | Performance arguments stay subjective and hard to enforce. | planned |

## Test Strategy

- Preflight: keep `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and atlas validators green for any runtime migration.
- Focused: validate binary read-model fixtures, scene-packet schemas, spatial-index lookup rules, and worker bootstrap paths.
- Integration: run mobile route smoke on at least one low-end Android profile and one iOS Safari-compatible profile; verify tap-to-dossier, search-first flow, and layer toggles.
- Regression: preserve the current Leaflet route or equivalent baseline until the candidate route passes visual and budget gates.
- Static/type/lint: keep packet contracts, loader wrappers, and read-model manifests typed and validated.
- Manual smoke: 390 x 844, throttled network, reduced motion, cold load, warm load, and repeat viewport pan around Flint/Genesee.
- Performance/security: profile main-thread blocking time, worker memory, payload sizes, HTTP range behavior, stale cache handling, and source/confidence visibility on degraded routes.

## Production Gates

- [ ] Tests pass or failures are explained.
- [ ] No unchecked data-pipeline or cache-canonicality risk.
- [ ] No secrets or destructive commands introduced.
- [ ] Worker and fallback error paths are considered.
- [ ] Observability covers mobile load failures, worker failures, packet fallbacks, and cache misses.
- [ ] Rollback/revert path exists.
- [ ] Docs/ADR updated or explicitly deferred.
- [ ] UI visual work has before/after/target evidence or an explicit validation gap.
- [ ] Mobile promotion does not ship without Do Not Downgrade review.
- [ ] Final report can reconcile every checklist item.

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | A `deck.gl`-first mobile web atlas is plausible only with a binary-first, worker-heavy data path. | `deck.gl`, `loaders.gl`, and `DuckDB-WASM` docs plus current mobile fallback rationale | high | Design around packets and workers, not JSON arrays. |
| Claim | `GeoParquet` should be treated as a default analytical read model, not an exotic extra. | Product-vault notes and DuckDB/browser fit | high | Add it to public package and loader contracts. |
| Claim | `PMTiles` and `FlatGeobuf` solve different problems and should coexist. | Existing vault direction and current mobile goals | high | Use `PMTiles` for static heavy layers and `FlatGeobuf` for dynamic viewport slices. |
| Claim | Rusty Red is best used as a hot viewport/session accelerator, not canon. | Existing repo/vault architecture | high | Keep it on the scene hydration path only. |
| Claim | Rust is a good fit for packet compilation, indexing, and geospatial packaging where deterministic throughput matters. | User preference and expected preprocessing cost | medium | Keep product-shell work in TS; move heavy build/runtime primitives case-by-case. |
| Tension | The most capable renderer can still produce a worse public mobile product if it overloads the device. | Current Leaflet fallback and mobile constraints | high | Require budget and touch-flow gates before promotion. |
| Tension | A web-first packet model must not quietly assume `deck.gl` is the only future renderer. | Future React Native interest | high | Keep packet contracts renderer-agnostic. |

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk | Follow-up |
|---|---|---|---|
| Immediate deletion of the Leaflet mobile path | The new mobile-web runtime has not earned promotion yet. | Dual-path maintenance for a period. | Promote only after MEP-011 and MEP-013 pass. |
| Full React Native renderer decision now | The user asked for a general mobile efficiency plan, not an immediate native build choice. | Some native constraints stay provisional. | Revisit after packet contracts and mobile web budgets are real. |
| Forcing all geospatial preprocessing into Rust at once | Some lanes will move faster in TS/Node initially. | Mixed-language build complexity remains. | Start with the highest-throughput preprocessing hotspots. |
| Replacing truth stores with Rusty Red geocache | Violates current architecture and trust boundaries. | None if explicitly avoided. | Keep hot-state-only role. |
| Treating `GeoParquet` as a required first-paint browser download | It is an analytical/read-model primitive, not a mandatory eager payload. | Misuse could bloat startup. | Lazy-load analytical tables and packet compilers. |

## Execution Instructions

- Start with `MEP-001`, `MEP-002`, `MEP-003`, and `MEP-009` so the runtime contract is clear before UI rewrites begin.
- Preserve the current mobile civic-access baseline while the new route is experimental.
- Use Rust where it reduces repeated CPU cost or improves deterministic packaging: scene-packet compilers, spatial-index builders, tile packaging helpers, and heavy geospatial transforms are the most promising first candidates.
- Keep `DuckDB-WASM` in a worker and extend that discipline to binary parsing and packet assembly.
- Treat this plan as the detailed execution companion for `OCA-020`, `OCA-020B`, `OCA-021`, and `OCA-027`.
- Report future work using the Orchestrate Report format with explicit mobile budget evidence.
