# Planning-Theorem Artifact: Our Civic Atlas Unified North-Star Execution Plan

## Executive Summary

- Goal: create one repo-local execution plan that supersedes the split between the older launch checklist, the downloaded north-star plan, and the separate mobile runtime notes.
- Intent: treat the north-star direction as the active product target, keep every task grounded in the live standalone atlas repo, and absorb the mobile `deck.gl` runtime lane into the same checklist.
- Summary of work: unify renderer decisions, mobile runtime decisions, public package/data contracts, civic object and scene contracts, and the public product roadmap into one auditable plan with stable execution IDs.

## Current Condition

- The implementation repo is `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas`.
- The current atlas already has a strong desktop geospatial base in `MapLibre + deck.gl` via `src/components/atlas/AtlasMap.tsx`.
- The visible repo source still routes phone-class devices to a dedicated Leaflet implementation in `src/components/atlas/MobileAtlasMap.tsx` and `src/components/atlas/ResponsiveAtlasMap.tsx`.
- The repo already has worker-backed `DuckDB-WASM` through `src/lib/atlas/mosaic.ts`, typed `CivicObject` and `SceneManifest` contracts in `src/lib/atlas/contracts.ts`, and static package fixtures under `src/data/open-flint-atlas/fixtures/static-package/`.
- Node Horizon, dossier routing, scene routes, and the R3F experiment already exist in partial form across `src/app/open-flint-atlas/*`, `src/lib/atlas/node-horizon.ts`, and `docs/plans/r3f-atlas-scene-quality-plan.md`.
- Repo-local plans are currently split across `docs/plans/our-civic-atlas-v1-launch-plan.md`, `docs/plans/open-flint-atlas/remaining-v1-execution-checklist.md`, `docs/plans/renderer-stack-integration.md`, `docs/plans/v1-spec-drift-remediation-plan.md`, and `docs/plans/r3f-atlas-scene-quality-plan.md`.
- The newer strategic product plan came from the downloaded file `our-civic-atlas-codex-north-star-implementation-plan.md`, while the detailed mobile performance/runtime plan currently lives only in the sibling `Open-Flint-Atlas-main` worktree.
- The user clarified one important correction that this plan now treats as authoritative: mobile should also use `deck.gl`. In this checkout that state is not yet visible in source, so the plan records it as the intended runtime target and a current reconciliation gap.

## Intent

The user wants one source of truth that future Codex sessions can execute directly without re-litigating which plan is active.

That source of truth should:

- keep the north-star product architecture as the active target,
- preserve the standalone public atlas repo as the implementation boundary,
- keep public-good, source-backed, resident-readable framing intact,
- treat mobile as a first-class atlas surface rather than a permanently reduced fallback,
- and keep all unfinished work behind reversible runtime, route, or feature boundaries until it passes product gates.

## Reconciliation Rules

| Prior source | New handling |
|---|---|
| `docs/plans/our-civic-atlas-v1-launch-plan.md` | Historical grounding for OCA-001 through OCA-028 and prior launch recovery evidence. Do not continue extending it as the active execution checklist. |
| Downloaded `our-civic-atlas-codex-north-star-implementation-plan.md` | Strategic basis for the renderer, object, model, engagement, live-signal, and Scene Foundry roadmap. |
| Sibling `atlas-mobile-efficiency-and-runtime-plan.md` | Absorbed into the mobile/runtime parts of this checklist. Its `GeoParquet`, `PMTiles`, `FlatGeobuf`, `DuckDB-WASM`, packet, spatial-index, Rusty Red, and Rust acceleration decisions are now first-class here. |
| `docs/plans/renderer-stack-integration.md` | Remains a supporting renderer contract, not the active delivery checklist. |
| User correction: mobile should also use `deck.gl` | Source-of-truth product decision. The repo-visible Leaflet branch becomes a fallback/recovery boundary, not the intended end state. |

## Goal

- User-visible outcome: desktop and mobile both feel like the same bounded civic atlas, with strong dossiers, visible source trail, place-memory layers, model/engagement entry points, and consistent public-product language.
- System behavior: `MapLibre + deck.gl` own the geospatial base across form factors; R3F/Three is a selective immersive overlay or scene path; Mosaic and `DuckDB-WASM` own linked analysis; scene packets and binary read models keep mobile and large layers viable.
- Data/model changes: extend `CivicObject`, `AtlasNode`, `SceneManifest`, and `ScenarioManifest`; add packet/read-model contracts; add primitive, scenario, engagement, and live-signal schemas; keep Scene Foundry offline and manifest-driven.
- Operational impact: the repo needs one plan-driven path for package contracts, validation, mobile promotion gates, static starter generation, governance docs, and observability.
- What must not regress: public trust language, source visibility, low-bandwidth access, review-before-publication, current map readability, and the rule that Rusty Red or any hot cache is not canonical truth.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | New route or runtime path compiles, loads, and passes focused validators. | `npm run typecheck`, `npm run lint`, `npm run build`, atlas validators, route smoke. | planned |
| Product complete | The enabled atlas path is equal-or-better than the current public route on desktop and mobile. | Before/after/target screenshots, touch smoke, dossier smoke, reduced-motion check. | planned |
| Vision complete | The atlas reads as one civic-world system rather than a map plus sidecars. | Vision Delta reconciliation. | planned |
| Baseline capture | Current desktop deck path, current mobile Leaflet path, and current scene path are all preserved as review references. | Existing visual evidence plus refreshed desktop/mobile screenshots. | partial |
| Do Not Downgrade | No new primary path replaces a mature surface until it is clearly better. | Screenshot review, route fallback, and rollback boundary review. | planned |
| Reversible boundary | Leaflet fallback, current deck route, and scene route remain separable until promotion gates pass. | Component/route boundary review. | partial |

## Vision Delta

- Target vision: one atlas runtime where `MapLibre + deck.gl` provide the geospatial world on desktop and mobile, R3F adds selected immersive objects instead of replacing the map substrate, and Lost Flint, GeoComments, live signals, scenarios, and source packages all hang off the same civic object spine.
- Current visual condition: desktop already has the strongest public map path, mobile still swaps to Leaflet in visible source, and the R3F branch is promising but still feels more experimental than primary.
- This plan makes true: future execution starts from one checklist, mobile performance architecture is no longer separate from product planning, and north-star modules stop competing with the older launch plan for authority.
- This plan does not make true: it does not by itself ship the deck-based mobile path, model studio, GeoComments, live signals, or full Scene Foundry runtime.
- Visual downgrade risks: replacing a legible mobile flow too early, promoting scene spectacle over map authority, overloading phones with desktop-grade layers, and letting the atlas fragment into separate map, scene, and lab products.
- Remaining renderer/data/interaction/design gaps: mobile deck promotion, bounded basemap/camera work, packetized mobile data loading, Lost Flint public rendering, scenario authoring, GeoComments, live signals, source-package creation flow, and manifest-driven foundry export.

## Codebase Grounding

| Area | Evidence | Notes |
|---|---|---|
| Desktop atlas base | `src/components/atlas/AtlasMap.tsx` | Current strongest public map runtime already uses `MapLibre + deck.gl`. |
| Mobile runtime split | `src/components/atlas/MobileAtlasMap.tsx`, `src/components/atlas/ResponsiveAtlasMap.tsx` | Visible repo source still prefers Leaflet on mobile. |
| Worker-backed analytics | `src/lib/atlas/mosaic.ts` | Existing worker discipline gives the plan a real browser-runtime foundation. |
| Renderer contract | `src/lib/atlas/renderer-bridge.ts` | Confirms baseline vs scene renderer boundary already exists in code. |
| Contract spine | `src/lib/atlas/contracts.ts`, `src/data/open-flint-atlas/contracts/civic-object.schema.json` | `CivicObject` and `SceneManifest` are already partially grounded. |
| Static package fixtures | `src/data/open-flint-atlas/fixtures/static-package/data/*` | Repo already ships public atlas package fixtures, scene manifests, node catalog, and read-model seeds. |
| Current launch checklist | `docs/plans/our-civic-atlas-v1-launch-plan.md` | Preserves earlier OCA launch grounding and recovery evidence. |
| Runtime/renderer notes | `docs/plans/renderer-stack-integration.md`, `docs/plans/r3f-atlas-scene-quality-plan.md` | Preserve current scene-vs-baseline boundaries and R3F rescue context. |
| Product-vault architecture notes | `docs/product-vault/flint-ouratlast/source-notes/UI Upgrade 4.md`, `docs/product-vault/flint-ouratlast/source-notes/Plan edits and additions.md`, `docs/product-vault/flint-ouratlast/source-notes/our-civic-atlas-ui-db-spec-v0.2.md` | Carry the broader civic-object, Lost Flint, source package, and package/performance intent. |

## Orchestration Map

| Work type | Route to | Why |
|---|---|---|
| Map/mobile runtime | frontend/runtime | Primary near-term risk is promotion of the wrong mobile renderer path. |
| Civic contracts and validators | data/docs | `CivicObject`, `SceneManifest`, packet, and atlas-package contracts must stay typed and auditable. |
| Lost Flint and scenario primitives | frontend/data | These are product-defining surfaces, not only backend schema work. |
| Public contribution/review | frontend/backend/privacy | Submission safety and public trust boundaries are part of the product, not a back-office detail. |
| Data Lab and read-model stack | frontend/data packaging | `DuckDB-WASM`, `GeoParquet`, `PMTiles`, and `FlatGeobuf` affect both UX and hosting. |
| Scene Foundry and asset export | renderer/pipeline | This must remain background and manifest-driven. |
| Governance and launch docs | docs/product/ops | Open civic atlas trust depends on public documentation and change visibility. |

## Checklist

| ID | Task | Codebase grounding | Agent/skill route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| UCA-001 | Establish this artifact as the single execution source of truth. | Existing plan split across `docs/plans/*` plus external north-star/mobile notes. | docs/product | This file is committed repo-locally and older plan files point here as the active checklist. | Markdown review and redirect-note verification. | Future sessions keep resuming the wrong plan. | done |
| UCA-002 | Promote one deck-based Atlas Scene base across desktop and mobile behind a reversible boundary. | `AtlasMap.tsx`, `MobileAtlasMap.tsx`, `ResponsiveAtlasMap.tsx`; absorbs north-star OCA-049 and mobile promotion work. | frontend/runtime | Desktop remains `MapLibre + deck.gl`; mobile gains a `deck.gl`-capable candidate path; Leaflet remains only as fallback until promotion gates pass. | Typecheck/build plus desktop/mobile route smoke and screenshot comparison. | A mature mobile flow is replaced too early or mobile never reaches the intended runtime. | partial |
| UCA-003 | Add mobile runtime profile, worker discipline, and promotion budgets. | `mosaic.ts`, current mobile split, existing validator culture. | frontend/perf | Device tiers, network tiers, optional layer caps, worker boundaries, time-to-first-pan, time-to-first-dossier, and rollback rules are explicit. | Throttled smoke, worker smoke, and documented budget checklist. | `deck.gl` mobile becomes a taste debate instead of an enforceable product contract. | partial |
| UCA-004 | Add bounded-world basemap styling and camera choreography. | Current atlas map shell and north-star OCA-051/OCA-052 goals. | frontend/design | Flint/Genesee reads as a bounded civic world with clear camera modes and reduced-motion-safe transitions. | Desktop/mobile screenshots and route smoke. | The atlas stays visually generic even with stronger data and contracts. | planned |
| UCA-005 | Keep R3F as a selective overlay/scene path and finish experimental-scene triage. | `renderer-bridge.ts`, `/open-flint-atlas/scene`, `r3f-atlas-scene-quality-plan.md`; absorbs OCA-050 and OCA-082 through OCA-084. | frontend/renderer | R3F renders selected scene objects and immersive modes without replacing the geospatial base; weak experimental scenes stay quarantined. | Scene-route smoke, screenshot review, and rollback-boundary check. | Pure-scene ambition downgrades cartographic authority or duplicates the atlas shell. | partial |
| UCA-006 | Add one shared visual grammar for atlas states. | Existing ad hoc colors plus `RenderMode` types; absorbs OCA-053, OCA-054, and older OCA-017A. | frontend/design | Tokens and fixtures distinguish current, lost, inferred, proposed, comment, live, intervention, source, and review states by more than color alone. | Token inventory, fixture review, and populated screenshot set. | Layers and objects become visually ambiguous as the atlas grows. | partial |
| UCA-007 | Extend the civic contract spine to `AtlasNode`, `CivicObject`, `SceneManifest`, and `ScenarioManifest` v1. | `src/lib/atlas/contracts.ts`, `civic-object.schema.json`, scene fixtures; absorbs older OCA-002A/OCA-002B/OCA-016 and north-star OCA-055 through OCA-057. | data/docs | Contracts cover observed, remembered, proposed, and voiced objects with place/time/review/source/privacy fields plus scenario lineage and export-ready scene state. | Type validation, schema validation, fixture validation. | Product modules drift into incompatible payload shapes. | partial |
| UCA-008 | Define viewport vector and scene-packet contracts. | No repo-local packet contract yet; absorbed from the external mobile runtime plan. | data/runtime | Public packet contracts describe viewport-aware, zoom-aware, layer-aware payloads for renderers instead of whole-city JSON delivery. | Contract review and packet-fixture validation. | Mobile and large-layer performance remain bound to raw JSON feature sets. | planned |
| UCA-009 | Define the binary-first public read-model stack. | Static package fixtures, `mosaic.ts`, product-vault notes; absorbs north-star OCA-076 and mobile read-model work. | data/frontend | `GeoParquet`, Arrow/typed arrays, `PMTiles`, `FlatGeobuf`, and JSON fallback roles are explicit for atlas publication and client loading. | Package-contract review and load-path smoke. | The atlas keeps mixing publication and runtime formats ad hoc. | partial |
| UCA-010 | Define multi-resolution spatial indexing, Rusty Red scene hydration, and Rust-owned heavy lanes. | Product-vault notes, existing storage split, and mobile runtime notes. | backend/runtime | One indexing family, viewport cache key strategy, Rusty Red hot-state boundaries, and the first Rust preprocessing lanes are explicit and non-canonical. | Architecture review and contract fixtures. | Hot cache becomes truth, or performance work stays vague and unowned. | planned |
| UCA-011 | Finish Node Horizon as a real navigation system. | Existing node routes, `node-horizon.ts`, remaining checklist, and old OCA-005/OCA-017B evidence. | frontend/federation | Compare, breadcrumbs, preview metadata, and spatial portal transitions work beyond hand-wired demo links. | Route smoke, fixture smoke, and screenshot review. | Federation remains decorative instead of navigable. | partial |
| UCA-012 | Finish reusable dossier contracts and mobile dossier behavior. | Existing dossier payload work and older OCA-006/OCA-006A/OCA-006B. | frontend/data | Place, object, node, source, intervention, event, and scenario dossiers share one typed payload shape and phone-first sheet behavior. | Typecheck, focused dossier validators, and 390 x 844 screenshot smoke. | Atlas detail views fork into incompatible one-off panels. | partial |
| UCA-013 | Build Lost Flint as a real public module. | Existing Lost Flint notes, source registry hints, and older OCA-012/OCA-012A/OCA-012B. | frontend/data | One bounded historical area ships with temporal building presence, historical article/event linkage, and honest uncertainty language. | Fixture validation, dossier smoke, and populated screenshots. | Lost Flint remains aspirational despite being central to the product story. | planned |
| UCA-014 | Build the primitive and reconstruction vocabulary. | Product-vault notes and north-star OCA-058 through OCA-060. | data/design | The repo has a primitive library, architectural dictionary, and reconstruction-level rules that can drive both Lost Flint and model mode. | Fixture validation and docs review. | Historical and proposed objects lack a reusable semantic grammar. | planned |
| UCA-015 | Build Civic Model Studio and scenario authoring. | No current scenario lane in repo; north-star OCA-062 through OCA-066. | frontend/geometry | Model mode, scenario objects, street tools, building massing, and scenario exports work through shared atlas contracts. | Route smoke, focused geometry tests, and scenario fixture validation. | “Future civic modeling” remains an idea instead of a concrete product lane. | planned |
| UCA-016 | Build GeoComments, engagement projects, and poll/search surfaces. | No current public geocomment lane; north-star OCA-067 through OCA-069. | frontend/engagement | GeoComments attach to civic objects and map geometry, with project/poll wrappers, moderation states, and atlas-native search/aggregation. | Contract validation and route smoke. | Public voice is postponed until too late to shape the core product. | planned |
| UCA-017 | Build live civic signals with a non-canonical hot geo index. | No current live-signal lane; north-star OCA-070 through OCA-073. | backend/frontend | Live signals have clear source, mapping, review, visibility, expiry, and promotion rules plus a cautious UI. | Schema validation, TTL/index contract review, and route smoke. | Live data becomes rumor amplification or an unbounded ingestion problem. | planned |
| UCA-018 | Build the atlas-native Data Lab and analysis cards. | Existing Mosaic/DuckDB foundation, north-star OCA-074/OCA-075. | frontend/data | `/lab` or equivalent loads atlas read models, supports filtering/playback/export, and powers atlas-native analysis cards that link back to the scene. | Route smoke and linked-filter behavior review. | The atlas never gets a coherent public analysis surface. | planned |
| UCA-019 | Build source-package creation and static atlas starter flows. | Existing static package fixtures, well-known manifest, older starter goals, north-star OCA-077/OCA-078. | docs/tooling | Maintainers can choose source packages, generate starter catalogs/pages, and validate a backend-free atlas node from repo-local tooling. | Starter generation smoke and package validation. | “Start an atlas” remains too difficult to spread beyond Flint. | partial |
| UCA-020 | Build contribution receipt, review queue, and moderation boundaries. | Existing `501` write stubs, privacy docs, older OCA-007 through OCA-011. | frontend/backend/privacy | Submissions produce private receipts, public-safe review states, and clear TF.js/ACT advisory boundaries without auto-publication. | API/contract tests, privacy allowlist checks, and UI smoke. | Contribution becomes unsafe or stays non-functional. | planned |
| UCA-021 | Build interventions, safety, and source-connection public surfaces. | Existing place routes and product-vault notes; older OCA-013 through OCA-015. | frontend/data | Dossiers and atlas views expose interventions, safety context, and source/object relationship views with resident-friendly copy. | Route smoke, fixture validation, and screenshot review. | The atlas lacks public accountability and explanatory depth. | planned |
| UCA-022 | Keep Scene Foundry manifest-driven and offline. | Existing scene fixtures, `SceneManifest` types, R3F plan, and north-star OCA-079 through OCA-081. | renderer/pipeline | Reviewed manifests can drive USD/GLB/Brush outputs without making public page load depend on live tools or local authoring software. | Contract review, sample asset metadata fixture, and validator plan. | Asset generation bleeds into runtime or loses provenance clarity. | partial |
| UCA-023 | Finish governance, observability, changelog, and public documentation. | Existing public package docs and older OCA-023/OCA-023A/OCA-028. | docs/ops | Public docs cover governance, disputes, contribution policy, methodology, creator flow, observability events, and update logs. | Link review and event-inventory review. | Public trust boundaries stay implicit. | planned |
| UCA-024 | Run the unified release and visual gate workflow. | Existing validators, route smoke, and visual evidence folders. | validation | The repo has one repeatable release checklist for runtime, product, and vision evidence across desktop and mobile. | `npm run typecheck`, `npm run lint`, `npm run build`, atlas validators, live route smoke, and screenshot review. | Work is marked complete without cross-checking the new unified plan. | partial |

## Test Strategy

- Preflight checks: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`.
- Focused tests: civic contract validators, dossier validators, static atlas package validators, packet/read-model validators, privacy allowlist checks, and scenario/engagement schema validation as those slices land.
- Integration tests: route smoke for atlas, node, object, scene, lab, contribution, and model routes; mobile dossier flows; Node Horizon transitions; public atlas starter generation.
- Regression tests: preserve the current strongest desktop deck route and the current safe mobile fallback until the replacement path passes the Do Not Downgrade gate.
- Type/lint/static checks: TypeScript, ESLint, JSON/schema validation, package-manifest checks, and markdown redirect-note sanity.
- Manual smoke checks: desktop and 390 x 844 for explore, node, dossier, Lost Flint, source connections, mobile search-first flow, and any promoted deck-mobile path.
- Performance/security checks: throttled mobile smoke, worker failure paths, packet fallback paths, cache-canonicality review, no public raw uploads, and observability coverage for submission/review/source-refresh/runtime failures.

## Production Gates

- [ ] Tests pass or failures are explained.
- [ ] No unchecked migration or data risk.
- [ ] No secrets or destructive commands introduced.
- [ ] Error paths considered.
- [ ] Observability/logging considered.
- [ ] Rollback/revert path exists.
- [ ] Docs/ADR updated or explicitly deferred.
- [ ] UI visual work has before/after/target evidence or an explicit validation gap.
- [ ] UI visual work passes the Do Not Downgrade gate before Product complete.
- [ ] Execution report can reconcile every checklist item.

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | The repo now needs one execution plan more than it needs another parallel checklist. | Current plan fragmentation and user correction. | high | Use this artifact as the active source of truth. |
| Claim | `MapLibre + deck.gl` is the right geospatial base for both desktop and mobile ambition. | Current desktop runtime, downloaded north-star plan, and absorbed mobile runtime notes. | high | Treat Leaflet as fallback only until a deck mobile path passes gates. |
| Claim | R3F should add immersive civic objects and scene modes, not erase cartographic grounding. | Existing scene branch condition, `renderer-bridge.ts`, and R3F recovery docs. | high | Keep it behind a selective overlay/scene boundary. |
| Claim | Binary read models, worker boundaries, and packetization are required for viable mobile atlas performance. | Existing `DuckDB-WASM` worker lane plus absorbed mobile runtime plan. | high | Make packet/read-model work a first-class execution lane. |
| Claim | Rusty Red belongs on the hot viewport/session path, not in the canonical truth path. | Existing storage split across repo plans and product-vault notes. | high | Keep cache and truth stores explicitly separate. |
| Tension | The repo already contains partial R3F and mobile fallback work, which can create false confidence that the unified product runtime is almost done. | Current partial scene and mobile split. | high | Keep statuses explicit and gate promotion on real screenshots and validators. |
| Tension | Mobile deck ambition can still produce a worse public product if it chases parity instead of civic access. | Current Leaflet rationale and mobile constraints. | high | Tie promotion to budget, touch-flow, and trust-surface evidence. |

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk of deferral | Follow-up |
|---|---|---|---|
| Immediate deletion of the Leaflet mobile path | The visible repo source has not yet earned a promoted mobile deck replacement. | Dual-path maintenance for a while. | Keep as fallback until UCA-002 and UCA-003 pass. |
| Pure R3F replacement of the public atlas base | It weakens current map authority and complicates mobile/public read-model behavior. | Some scene ideas land later than they otherwise might. | Use selective overlay and scene routes first. |
| Full native mobile renderer decision now | The current task is to unify the web product plan, not commit to a native app stack. | Some packet constraints remain future-facing. | Revisit after packet contracts and deck-mobile budgets are real. |
| Turning Rusty Red into canon | Violates the repo’s trust and storage boundaries. | None if kept explicit. | Use it only for hot scene hydration, nearby lookup, and viewport/session acceleration. |
| Live public rendering that depends on MCP or local authoring tools | Public pages need reproducible, hostable runtime behavior. | Richer media may arrive later. | Keep Scene Foundry offline/background and manifest-driven. |

## Execution Instructions

- Start with checklist item: `UCA-002`, then `UCA-003`, `UCA-007`, `UCA-008`, and `UCA-009` before reopening large UI surface changes. That sequence aligns the runtime base, mobile promotion logic, core contracts, packet boundaries, and read-model stack before expanding product modules.
- Preserve these invariants: public-good framing, review-before-publication, resident-readable trust language, `MapLibre + deck.gl` geospatial authority, R3F as selective scene augmentation, binary/public read-model discipline, and Rusty Red as hot state only.
- Run these commands: `npm run typecheck`, `npm run lint`, `npm run build`, atlas/package validators, live route smoke when a local server is running, and desktop/mobile screenshot review for any promoted visual path.
- Report using the Execute-Theorem Report format, and reconcile Runtime complete, Product complete, and Vision complete separately for any UI-facing slice.
