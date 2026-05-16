# Planning-Theorem Artifact: Our Civic Atlas / Flint Atlas v1 Launch

## Executive Summary

- Goal: make Flint Atlas the first launchable node in Our Civic Atlas, a federated public-good civic atlas network.
- Intent: implement the vault ideas as planned product scope unless this plan explicitly marks them as a non-goal, deferral, or "not the primary path."
- Summary of work: evolve the current standalone reader into a mobile-first Atlas Scene with manifest-first federation, contract-level civic objects, place/object dossiers, contribution review, Lost Flint, Civic Intervention Ledger, Street Safety Lab foundations, a source connection view, SceneManifest, public read packages, and public governance.

## Current Condition

- The idea vault at `/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org` is a planning vault, not a git repo.
- The vault is an idea source, not a launchable app root. Its human-authored markdown notes are mirrored under `docs/product-vault/flint-ouratlast/source-notes/` so they can travel with the repo without Obsidian internals, trash, or local workspace state.
- `our-civic-atlas-ui-db-spec-v0.2.md` is approved and names the umbrella as Our Civic Atlas, the first city site as Flint Atlas, and `flint.ourcivicatlas.org` as the launch target.
- `Plan edits and additions.md` is an approved planning addendum. It is not code-grounded yet, but its ideas are intended scope unless this plan explicitly defers them.
- The current implementation repo is `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas`.
- The repo currently has a standalone Next.js app at `/open-flint-atlas`, fixture-backed public read endpoints, MapLibre/deck.gl desktop map, Leaflet mobile map, Mosaic/vgplot timeline, Cosmos provenance panel, and a restored canvas backdrop.
- Writes are intentionally disabled in `src/app/api/v2/theseus/open-flint-atlas/[[...path]]/route.ts`; capture/review endpoints return `501`.
- `docs/SYSTEM-BLUEPRINT.md` already captures public contribution, TF.js preflight, ACC/ACT review, explanation cockpit, public package, and governance lanes.
- Existing docs still use both Open Flint Atlas and Flint Atlas language. The launch plan should converge the product identity without erasing the repo history.

## Intent

The user is trying to make a civic atlas network, not only a Flint map. Flint should launch first because it can be grounded in lived local knowledge, but the system must be reusable by other places with very low creation friction.

Every approved idea in the attached vault is treated as implementation scope unless listed in "Explicit Non-Goals and Deferrals."

The launch repo should stay `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas`. The raw vault should remain a working notebook; the repo should contain a sanitized product-vault mirror and grounded planning artifacts. If the public product is later renamed or moved to match `flint.ourcivicatlas.org`, do that as a repo/package rename, not by turning the Obsidian vault into the app root.

## Scope Update: 2026-05-15

- `r3f-atlas-scene-quality` is a parked experiment, not the active release lane.
- Remaining active delivery scope is the OCA checklist from OCA-003 through OCA-027, with Lost Flint treated as a top-priority product lane.
- User-facing surface copy should avoid terms like `evidence`, `provenance`, and `epistemic`; keep source/trust concepts in plain civic language.
- The old "Evidence Constellation" naming is retired from the public plan. If the underlying graph/view remains useful, it must ship behind resident-friendly copy and interaction labels.

## Goal

- User-visible outcome: a visitor can open `flint.ourcivicatlas.org`, understand Flint as a bounded civic world, tap or search a place, inspect sources/confidence/history, and see routes into memory, safety, interventions, sources, and contribution.
- System behavior: manifests and static read models define public federation; hosted services add contribution intake, review queues, ACC/ACT scoring, TF.js preflight, provenance, and source refresh.
- Data/model changes: add AtlasNode, CivicObject, Claim, Observation, SceneManifest, ContributionReceipt, ReviewDecision, RawArtifact, ExtractionCandidate, public read packages, federation manifests, source catalogs, and public read-model contracts.
- Operational impact: support static-only atlas nodes first, then hosted and graph-backed nodes. Keep public exports cheap, inspectable, and privacy-safe.
- What must not regress: do not bury Flint work in core Theseus, do not publish uploads automatically, do not use models as truth, do not depend on Revit/licensed tools, do not replace the map with a heavier runtime before visual gates pass, and do not let the current reader stagnate as the final product.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Routes, components, API contracts, and static read models work. | `npm run typecheck`, `npm run lint`, `npm run build`, rendered smoke. | planned |
| Product complete | Enabled UI is equal-or-better than current reader and supports launch workflows. | Before/after/target screenshots, mobile and desktop. | planned |
| Vision complete | Flint becomes first node in reusable federated civic atlas system. | Vision Delta and checklist reconciliation. | planned |
| Baseline capture | Current `/open-flint-atlas` reader and approved vault references are captured. | Screenshot set plus vault citation list. | planned |
| Do Not Downgrade | Mature map, dossier, timeline, provenance, and mobile behavior are preserved until replacements are better. | Visual review gate. | planned |
| Reversible boundary | New surfaces land behind route/module boundaries until launch parity. | Separate route, components, and commit boundaries. | planned |

## Vision Delta

- Target vision: Our Civic Atlas is a fractal, decentralized civic web. Flint is the first bounded civic scene, with nearby/child/parent atlas nodes discoverable through Node Horizon.
- Current visual condition: the standalone reader is useful but still feels like a map with panels. It has some source-linked explanation behavior, but not the immersive civic-world feeling, contribution workflows, or launch routes.
- This plan makes true: the frontend backlog becomes launch-scoped with stable checklist IDs, a product identity transition, route model, visual gates, implementation order, and contract-first schema work before the major UI build.
- This plan does not make true: it does not implement public uploads, real PostGIS, live Memgraph writes, 3D asset generation, or ML training.
- Visual downgrade risks: generic basemap feel, excessive dashboard chrome, map layers disconnected from dossiers, 3D spectacle overwhelming civic legibility, and mobile controls crowding the map.
- Remaining renderer/data/interaction/design gaps: custom bounded basemap, Node Horizon, Atlas Scene camera presets, contribution receipt UI, dossier tabs, Lost Flint ghost grammar, intervention ledger views, source-connection map, and SceneManifest renderer.

## Codebase Grounding

| Area | Evidence | Notes |
|---|---|---|
| App shell | `src/app/open-flint-atlas/page.tsx` | Current route loads places/events/provenance and renders AtlasShell. |
| Public fixture API | `src/app/api/v2/theseus/open-flint-atlas/[[...path]]/route.ts` | Read endpoints exist; writes return `501`. |
| API client | `src/lib/api/openFlintAtlas.ts` | Typed read wrappers plus admin/capture stubs inherited from Index-API. |
| Visual baseline | `src/components/atlas/*` | Map, mobile map, tab bar, dossier/control, provenance, timeline, canvas backdrop. |
| Target system | `docs/SYSTEM-BLUEPRINT.md` | Already describes contribution lifecycle and ACC/TF.js review split. |
| Privacy/review | `docs/plans/open-flint-atlas/contribution-review-privacy.md` | Approved observation state machine and public/private field split. |
| Vault spec | `Flint.OurAtlast.org/our-civic-atlas-ui-db-spec-v0.2.md` | Approved Our Civic Atlas UI/database spec. |
| Plan addendum | `docs/product-vault/flint-ouratlast/source-notes/Plan edits and additions.md` | Contract-level additions for CivicObject, AtlasNode, source retrieval, mobile access, governance, and observability. |
| Vault upgrades | `UI Upgrade*.md`, `Base UI.md`, `temporal building registry..md` | Approved ideas for Atlas Scene, Lost Flint, Scene Foundry, ML, intervention ledger, and federation. |
| Product vault mirror | `docs/product-vault/flint-ouratlast/source-notes/` | Sanitized repo-local copy of intended ideas; excludes Obsidian internals and trash. |

## Contract Spine

Everything in the system should become a source-backed civic object with place, time, confidence, review state, render mode, evidence, and federation identity.

Core `CivicObject` fields: `id`, `atlas_node_id`, `object_type`, `name`, `description`, `geometry_ref`, `time_start`, `time_end`, `temporal_status`, `current_status`, `confidence_score`, `confidence_reasons`, `review_state`, `source_ids`, `claim_ids`, `render_modes`, `dossier_url`, `public_visibility`, `privacy_class`, `last_checked_at`, and `updated_at`.

Core object types: `atlas_node`, `place`, `parcel`, `building_presence`, `street`, `road_segment`, `corridor`, `historical_event`, `news_article`, `source`, `dataset`, `claim`, `observation`, `intervention`, `metric`, `scene_object`, `brush_asset`, and `ifc_asset`.

Core `AtlasNode` manifest fields: `atlas_id`, `name`, `slug`, `canonical_url`, `scope_type`, parent/child/neighbor node ids, `boundary_geojson_url`, `bbox`, `centroid`, maintainers, public contact, licenses, source/layer/node/read-model catalog URLs, capabilities, federation status, and `last_updated_at`.

Static public atlas package required files: `/.well-known/our-civic-atlas.json`, `/data/atlas-node.json`, `/data/source-registry.json`, `/data/layer-catalog.json`, `/data/node-catalog.json`, `/data/civic-objects.parquet`, `/data/places.geoparquet`, `/data/events.geoparquet`, `/data/sources.parquet`, `/data/claims-summary.parquet`, `/data/confidence-cards.json`, `/data/scene-manifests/*.json`, `/tiles/basemap.pmtiles`, and `/tiles/layers/*.pmtiles`. Optional hosted files include GLB/splat/thumb assets and API routes for features, dossiers, and contribution.

Storage split: PostGIS owns spatial truth and temporal geometry tables; Memgraph/Theseus owns provenance, claims, records, scene manifests, and review graph relationships; Redis/Rusty Red Graph owns hot nearby/session/queue state only.

Atlas Scene, SceneManifest, and Scene Foundry must remain distinct: Atlas Scene is the live web UI; SceneManifest is the contract between data and renderers; Scene Foundry is the background asset generation pipeline for Blender, Brush, IFC, GLB, 3D Tiles, thumbnails, and previews.

## Orchestration Map

| Work type | Route to | Why |
|---|---|---|
| Frontend/product planning | `production-theorem:orchestrate` and `planning-theorem` | Checklist and visual gates are required. |
| Visual design implementation | Build Web Apps / frontend visual QA | UI launch readiness depends on screenshot evidence. |
| Map/scene renderer | MapLibre, deck.gl, Three/R3F, PMTiles | Atlas Scene is the primary product surface. |
| Analytics panels | Mosaic, vgplot, DuckDB-WASM | Crossfiltering and time analysis should be data-native. |
| Source/relationship map | Cosmograph / graph view | Explain how places, sources, and records connect without academic graph jargon on the public surface. |
| Contribution/review | security/privacy route | Upload is evidence intake, not publication. |
| ACC/TF.js moderation | Theseus/ACT plus client preflight route | Automation aids review but does not promote facts. |
| Scene Foundry | renderer/data pipeline route | Deterministic manifests should drive 3D outputs. |
| ML | later research route | Baselines and data sufficiency must precede TimesFM/ST-GNN/DyGFormer. |

## Checklist

| ID | Task | Codebase grounding | Agent/skill route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| OCA-001 | Rename and route product identity from Open Flint Atlas toward Our Civic Atlas / Flint Atlas without losing repo history. | README, AGENTS, `docs/SYSTEM-BLUEPRINT.md`, vault v0.2 spec | docs/product | Public copy distinguishes umbrella Our Civic Atlas, Flint Atlas city node, and repo/history names. | Copy review, route smoke. | Confusing brand or launch domain. | done |
| OCA-002 | Define manifest-first federation contracts. | v0.2 spec endpoints | data/docs | Add schemas for `/.well-known/our-civic-atlas.json`, manifest, catalog, layers, nodes, sources, and read-model URLs. | JSON schema validation and sample Flint/Carriage Town/Grand Blanc/Michigan manifests. | Protocol overbuild or non-discoverable nodes. | partial |
| OCA-002A | Define CivicObject contract v0. | Plan addendum, v0.2 spec | data/docs | Shared schema covers all civic objects with place, time, confidence, review state, source links, render modes, public visibility, and privacy class. | JSON schema and typed fixture validation. | One-off layer schemas fragment the system. | partial |
| OCA-002B | Define AtlasNode manifest schema v0. | Plan addendum, Node Horizon spec | data/docs | Node schema covers identity, scope, boundary, parent/child/neighbor links, capabilities, maintainers, licenses, and public read-model URLs. | Flint, Carriage Town, Grand Blanc, Michigan fixture validation. | Federation remains decorative instead of discoverable. | partial |
| OCA-002C | Build minimal static atlas starter v0. | low-friction creation goal | docs/tooling | A backend-free atlas starter emits well-known manifest, node/source/layer catalogs, public read models, about/sources/methodology/contribute pages, and validator output. | Starter generation smoke and schema validation. | "Start an atlas" remains too hard for civic users. | partial |
| OCA-003 | Build public root and city route structure. | README, current `/open-flint-atlas` route | frontend | Routes exist for home/explore/memory/safety/interventions/sources/contribute/methodology/node/place/object/scene. | Typecheck/build, route smoke, accessibility snapshot. | Launch still feels like prototype route. | done |
| OCA-003A | Define UI component map. | `src/components/atlas/*`, Plan addendum | frontend/docs | App shell names `AtlasAppShell`, `AtlasScene`, `AtlasModeRail`, search header, dossier panels/sheets, layer stack, Node Horizon, confidence, receipt/review/source panels, Mosaic drawer, scene preview, and timeline scrubber. | Component inventory review and implementation tickets. | UI work drifts into duplicate ad hoc panels. | partial |
| OCA-004 | Create Atlas Scene bounded-world shell. | `AtlasMap.tsx`, `MobileAtlasMap.tsx`, `AtlasCanvasBackdrop.tsx`, UI Upgrade notes | frontend/map | Flint/Genesee opens as bounded civic world with mask, custom style, local labels, and camera presets. | Desktop/mobile screenshots, Do Not Downgrade review. | Generic basemap continues to set weak product tone. | partial |
| OCA-005 | Add Node Horizon UI. | v0.2 spec Node Horizon | frontend/federation | Parent, child, and neighbor atlas nodes render as spatial portals or horizon markers with preview, open-node transition, breadcrumbs, compare state, stale badges, and source/contribution/capability metadata. | Manifest fixtures plus visual smoke. | Federation remains invisible to users. | partial |
| OCA-006 | Build reusable Place/Object Dossier v1. | `PlaceDossier.tsx`, contribution/privacy docs | frontend | Dossier supports overview, sources, history, nearby, interventions, safety, metrics, connections, and contribute. | Component tests or story fixtures, mobile screenshot. | Dossier remains a thin side panel. | partial |
| OCA-006A | Define Dossier Payload contract v0. | Plan addendum, current dossier component | data/frontend | One typed payload shape supports Place, Object, Event, Source, Intervention, RoadSegment, and AtlasNode dossiers with subject, summary, confidence, sources, timeline, metrics, nearby objects, related records, graph refs, scene refs, actions, privacy flags, and citation download. | Fixture and type validation. | Each dossier becomes a bespoke payload. | partial |
| OCA-006B | Define mobile dossier interaction spec. | mobile map, UI gates, Plan addendum | frontend/a11y | Bottom sheet has three snap points, search-first flow, no hover dependency, visible source/confidence on first screen, accessible tabs, and reduced-motion behavior. | 390 x 844 screenshot and keyboard/touch smoke. | Civic access is desktop-biased. | partial |
| OCA-007 | Implement confidence/progress explanation system. | `docs/plans/act-evidence-cockpit-implementation-plan.md`, contribution/privacy docs | frontend/ACC | Confidence is shown as support progress with reasons and click-through explanation. | Visual QA and copy review. | Opaque score or truth-meter framing. | planned |
| OCA-008 | Add public contribution receipt flow. | `contribution-review-privacy.md`, API writes currently `501` | frontend/backend | Observation/correction/source-link/document/comment submissions create private `ContributionReceipt` records with PII/private text separated from public candidate fields. | API tests, privacy field allowlist, abuse cases. | Uploads leak or become facts. | planned |
| OCA-009 | Add maintainer review queue. | review state machine docs | frontend/backend/security | Reviewer can promote/reject/ask for more evidence/supersede with public-safe reason. | API tests, permission tests, UI smoke. | Staff-only/admin lane replaces public trust UX. | planned |
| OCA-010 | Wire TF.js preflight. | `docs/SYSTEM-BLUEPRINT.md`, vault moderation notes | frontend/model | Client warns on toxicity, unsafe image, face/license plate, geolocation precision, private contact/address, duplicate upload, URL safety, and person-targeting risk before submit, but cannot publish or reject finally. | Unit tests with fixtures and manual form smoke. | Model score treated as moderation truth. | planned |
| OCA-011 | Wire ACC/ACT review snapshots. | ACT Evidence Cockpit plan | backend/frontend | Server-side scoring writes stable, auditable snapshots connected to contribution/review state. | Contract fixtures and explanation panel smoke. | Scores drift or become non-reproducible. | planned |
| OCA-012 | Build Lost Flint v0.1. | temporal building registry note, v0.2 spec | frontend/data | Bounded area shows building-presence intervals, ghost render grammar, and historical dossier evidence. | Fixture validation, map screenshot, dossier review. | Historical uncertainty displayed with false precision. | planned |
| OCA-012A | Define Temporal Building Registry schema. | `temporal building registry..md`, Plan addendum | data/docs | Building presence schema models historical existence, absence, demolition uncertainty, footprints, height/archetype/render style, source evidence, confidence, articles, review state, and places with no current object. | Schema fixtures for present, vanished, inferred, disputed, and current-absence cases. | Lost buildings get forced into current-place records. | planned |
| OCA-012B | Add Historical Article/Event layer v0. | Plan addendum, Memory route | data/frontend | HistoricalArticle, HistoricalEvent, PlaceMention, ArticlePlaceLink, and ArticleDossier objects support archive URL, OCR hash, excerpt, extracted people/orgs/place mentions, candidate coordinates, confidence, time range, and review state. | Fixture ingestion and article dossier smoke. | The most emotionally compelling memory layer stays vague. | planned |
| OCA-013 | Add Civic Intervention Ledger v0.1. | Base UI, v0.2 spec | frontend/data | Place/corridor/ward dossiers show promises, funding, actors, documents, and outcomes. | Fixture review and dossier visual smoke. | Accountability layer becomes disconnected list. | planned |
| OCA-014 | Build Street Safety Lab foundations. | temporal registry, UI Upgrade 4 | data/frontend | Crash history, road/corridor aggregates, caveat copy, and baseline trend cards exist before forecasts. | Data sufficiency report, baseline fixtures, copy review. | Prediction theater. | planned |
| OCA-015 | Add Source Connection Map. | `CosmosProvenancePanel.tsx`, Cosmograph notes | frontend/graph | Selected dossier can open a source/dataset/record/event/place relationship map using resident-friendly copy and no public `evidence`/`provenance`/`epistemic` labels. | Graph fixture smoke and screenshot review. | Graph is decorative rather than explanatory. | planned |
| OCA-016 | Add SceneManifest v0 schema. | v0.2 spec, UI Upgrade 3/4 | data/renderer | Manifest covers place, bbox/time, objects, sources, confidence, render styles, assets, dossier links. | JSON schema and fixture validator. | Renderers invent unsupported civic objects. | planned |
| OCA-017 | Add Civic Object Renderer v0. | SceneManifest plan | frontend/renderer | Current, vanished, inferred, disputed, intervention, crash, source, and Brush asset render modes are represented. | Visual grammar fixtures and screenshots. | More layers without shared object grammar. | planned |
| OCA-017A | Define Visual Grammar Tokens. | Plan addendum, UI Upgrade notes | frontend/design | Render states and encodings exist for confirmed/current, low-confidence, vanished, inferred, historical event, intervention, pending/reviewed observation, disputed claim, prediction, stale/high-confidence source, Brush reconstruction, and IFC model. | Visual token inventory and screenshot fixtures. | Visual soup obscures source status. | partial |
| OCA-017B | Define Node Horizon interaction contract. | Plan addendum, OCA-005 | frontend/federation | Preview cards include node name, scope, distance/direction, maintainer, freshness, capabilities, source count, contribution status, open/compare actions, and parent return. | Interaction spec and fixture smoke. | Node Horizon cannot scale past hand-wired demos. | partial |
| OCA-018 | Plan Scene Foundry background generation. | UI Upgrade 2/3 | renderer/pipeline | Blender/GLB/still/3D Tiles/Brush outputs are generated from reviewed manifests, not live LLM page loads, and every generated object links back to evidence. | Architecture doc and one sample manifest/output stub. | Public site depends on MCP or live generation. | planned |
| OCA-018A | Define Scene Foundry asset pipeline. | Plan addendum, SceneManifest work | renderer/pipeline | Inputs, processors, outputs, validators, and provenance rules are documented for procedural, Blender, Brush, IFC, GLB optimization, thumbnails, previews, 3D Tiles, and splats. | Pipeline contract review and sample asset metadata fixture. | Atlas Scene and asset generation blur into one fragile runtime. | partial |
| OCA-019 | Add static atlas creator kit. | low-friction creation goal | docs/tooling | Template includes manifest, boundary, starter pages, source registry, validator, governance, and contribution policy. | New atlas fixture generation smoke. | Platform cannot spread beyond Flint. | planned |
| OCA-020 | Define public read-model performance stack. | v0.2 storage architecture | data/frontend | PMTiles, GeoParquet, Parquet, DuckDB-WASM, FlatGeobuf, GLB, 3D Tiles roles are explicit and lazy-loaded. | Bundle review and load-path smoke. | Mobile payload grows beyond usable launch size. | planned |
| OCA-020A | Define Public Atlas Package contract. | Plan addendum, OCA-002C | data/docs | Required and optional static files are specified for every publishable atlas node, including manifests, catalogs, Parquet/GeoParquet, confidence cards, scene manifests, and tiles. | Package fixture validation. | Static federation cannot interoperate. | partial |
| OCA-020B | Define offline/low-bandwidth mode. | Plan addendum, mobile gate | frontend/perf | Initial load, lazy assets, optional 3D, cache behavior, text-first fallback, and degraded map behavior are explicit. | Throttled browser smoke and bundle review. | Public access fails on phones or weak networks. | planned |
| OCA-021 | Keep Rusty Red Graph/Redis as hot layer only. | vault notes and repo architecture guidance | backend/architecture | Plan states PostGIS owns spatial truth, Memgraph/Theseus owns provenance, Redis/RRG owns hot nearby/session/queue state. | Architecture review. | Hot cache becomes accidental canon. | planned |
| OCA-022 | Defer TimesFM/ST-GNN/DyGFormer until data sufficiency gates pass. | ML vault notes | ML/research | Baselines, road graph, target labels, fairness/caveat language, and proposal-only policy are documented before model work. | Data sufficiency checklist. | ML results presented as facts. | planned |
| OCA-022A | Define ML Readiness Contract. | Plan addendum, Street Safety Lab | ML/research | Street Safety model ladder, road graph, crash matching, monthly target table, baselines, fairness/risk review, advisory labeling, and proposal-only public rule are documented. | Data sufficiency and caveat-copy review. | Future model work becomes misty or overclaims. | planned |
| OCA-023 | Launch governance and public docs. | public-package docs, vault governance notes | docs/product | Governance, privacy, methodology, source registry guide, contribution policy, city index, and start-an-atlas docs exist. | Link crawl and copy review. | Public trust boundary is vague. | planned |
| OCA-023A | Define governance and dispute model. | Plan addendum, public docs | docs/governance | Docs cover non-official status, maintainer duties, correction/takedown, stale nodes, competing nodes, source disputes, contributor appeals, changelog, license/reuse, and do-no-harm policy. | Governance doc review. | Open civic data conflict has no fair process. | planned |
| OCA-024 | UI visual release gate. | Orchestrate UI gates | validation | Baseline, target, desktop, mobile, and populated-data screenshots are reviewed before Product complete. | Screenshot ledger and Do Not Downgrade result. | Runtime complete gets mistaken for launch-ready. | planned |
| OCA-025 | Define Source Retrieval and Artifact Archive. | Plan addendum, Index-API capture/search context | backend/data | Source registry, retrieval job, raw artifact checksum archive, extraction candidates, review, projection into PostGIS/Memgraph, read-model rebuild, robots/terms/frequency rules, and changelog are specified. | Pipeline contract and artifact fixture review. | Ingestion becomes a bespoke scraper island. | planned |
| OCA-026 | Define public API and endpoint contract. | Plan addendum, current fixture API | frontend/backend | Frontend and API route shapes exist for manifest, nodes, layers, sources, dossiers, search, contributions, review, scene manifests, source connection map, source refresh, and static package fallbacks. | Route contract tests or fixtures. | UI and data contracts drift. | partial |
| OCA-027 | Add Mobile Civic Access Gate. | UI gates, Plan addendum | validation/a11y | 390 x 844 works; search precedes controls; facts do not require hover; source/confidence appear early; contribution is phone-completable; tap targets, reduced motion, no chart-only communication, low bandwidth, and lazy 3D are verified. | Mobile screenshots, accessibility checks, throttled smoke. | Civic access becomes polish instead of launch requirement. | planned |
| OCA-028 | Add observability and public changelog contract. | production gates, Plan addendum | ops/docs | Track source refresh, failures, submissions, preflight flags, review decisions, read-model rebuilds, manifest failures, map performance, dossier opens, zero-result searches, stale sources, failed assets, privacy blocks, and public update logs. | Event inventory and admin/public transparency review. | The system cannot explain its own freshness or moderation health. | planned |

## Test Strategy

- Preflight checks: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`.
- Focused tests: API route fixtures, CivicObject/AtlasNode/Dossier/SceneManifest validators, public atlas package validators, contribution privacy allowlist, review-state transitions, retrieval artifact fixtures.
- Integration tests: route smoke for all launch routes, fixture-backed search/dossier/provenance, contribution receipt and review promotion flow, source retrieval artifact-to-public-read-model projection smoke.
- Regression tests: current `/open-flint-atlas` map/timeline/provenance behavior must stay available until replacement passes visual gates.
- Type/lint/static checks: TypeScript, ESLint, JSON schema checks, markdown link/copy review where practical.
- Manual smoke checks: desktop and mobile for Explore, place dossier, Node Horizon, contribution receipt, Lost Flint, interventions, safety, evidence graph, static atlas starter, and low-bandwidth mode.
- Performance/security checks: bundle/load budget, lazy-loading DuckDB/Cosmograph/3D assets, privacy threat model, no public raw uploads or private metadata, robots/terms-aware retrieval, and observability coverage for review/source-refresh failures.

## Latest Recovery Evidence

- Dossier payload validator is now wired into `npm run validate:atlas` with strict warning failure, plus `npm run validate:dossier` and `npm run validate:dossier:live` for focused fixture/live API checks.
- Current strict fixture and live API checks validate 222/222 dossier payloads without unresolved source-card warnings.
- Current visual smoke covers `/open-flint-atlas/evidence` at 1024 x 768 for panel overlap and at 390 x 844 for mobile evidence provenance access.
- Public route smoke now covers 13 URLs across map/explore/lenses, sources, contribute, methodology, node, place, object, and scene routes with `npm run validate:routes:live`.
- Node Horizon `Open` actions now route from the map shell into node detail pages with accessible `Open {node}` names; Playwright MCP clicked the first horizon link to `/open-flint-atlas/node/atlas%3Amichigan` and confirmed the Michigan node detail page with no horizontal overflow. Compare, breadcrumbs, and spatial portal transitions remain partial.
- Production deployment now targets Vercel project `travis-gilberts-projects/our-civic-atlas`; `flint.ourcivicatlas.org` is attached to the ready production deployment and verified in Vercel project-domain records.
- Node detail pages now include Federation path metadata and a `Node Horizon` return action anchored to `/open-flint-atlas#node-horizon`; Playwright MCP confirmed the Michigan node path and back-navigation anchor without horizontal overflow. Compare and spatial portal transitions remain partial.

## Production Gates

- [ ] Tests pass or failures are explained.
- [ ] No unchecked migration or data risk.
- [ ] No secrets or destructive commands introduced.
- [ ] Error paths considered.
- [ ] Observability/logging considered for submissions, review, source refresh, read-model rebuilds, manifest validation, asset failures, privacy blocks, and public changelog.
- [ ] Rollback/revert path exists.
- [ ] Docs/ADR updated or explicitly deferred.
- [ ] UI visual work has before/after/target evidence or an explicit validation gap.
- [ ] UI visual work passes the Do Not Downgrade gate before Product complete.
- [ ] Execution report can reconcile every checklist item.

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | Our Civic Atlas should be manifest-first and federated before protocol-heavy. | v0.2 spec and Our Civic Atlas note | high | Start with static manifests and node catalog. |
| Claim | Flint-specific geography should live in a bounded project/app, not core Theseus. | UI Upgrade 3 and repo separation | high | Keep standalone repo and generic abstractions. |
| Claim | Atlas Scene should deepen MapLibre/deck.gl with bounded world, PMTiles, and selected Three/R3F effects, not jump to a game engine default. | UI Upgrade notes | high | Implement Atlas Scene shell first. |
| Claim | Contribution upload is evidence intake, not publication. | privacy workflow and vault notes | high | Build receipt/review before public publication. |
| Claim | Scene Foundry should render from reviewed SceneManifests, not live LLM/MCP. | UI Upgrade 2/3 | high | Build deterministic manifest and renderer path. |
| Tension | Immersive 3D can make Flint feel closer but can also bury source clarity. | visual upgrade notes | medium | Require evidence/dossier links on every render object. |
| Tension | ML can help review and discovery but can harm public trust if framed as fact. | ML notes and public principles | high | Prediction/proposal labels and baseline gates. |

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk of deferral | Follow-up |
|---|---|---|---|
| Full game engine as default public UI | Too heavy for mobile, text, deep links, and civic source workflows. | Atlas may still feel less immersive initially. | Atlas Scene first, optional immersive route later. |
| Revit as required dependency | Licensing and workflow friction conflict with public-good reuse. | Some BIM semantics arrive later. | Use IfcOpenShell/Bonsai/FreeCAD/web-ifc first; keep Revit optional. |
| Live Blender/Revit MCP for page rendering | Public site should not need live LLM/tool sessions. | Rich assets require background jobs. | Scene Foundry job queue. |
| Public uploads immediately visible | Privacy and rumor risk. | Contribution UX launches in stages. | Receipt + review queue first. |
| TimesFM/ST-GNN/DyGFormer in launch path | Requires data sufficiency, baselines, labels, and careful copy. | Advanced ML waits. | Street Safety Lab data and baseline gates first. |
| Rusty Red Graph as canonical store | Hot graph/cache is not spatial/provenance canon. | Some performance gains delayed. | Use as hot nearby/session/queue accelerator after truth stores are clear. |
| ActivityPub-style event federation | Static federation is enough for v1. | Live cross-atlas events come later. | Add after manifest discovery is real. |

## Execution Instructions

- Start with checklist item: OCA-001, then OCA-002, OCA-002A, OCA-002B, and OCA-002C before the major UI build. Continue with OCA-003/OCA-003A/OCA-004 as the first visible slice, then OCA-005, OCA-006/OCA-006A/OCA-006B, OCA-008/OCA-009, OCA-012/OCA-012A/OCA-012B, OCA-013, OCA-015/OCA-016/OCA-017/OCA-017A/OCA-017B, OCA-019/OCA-020/OCA-020A/OCA-020B, and OCA-022/OCA-022A.
- Preserve these invariants: public-good framing, non-official status, source visibility, confidence as progress/explanation, review before publication, static atlas compatibility, and standalone repo boundary.
- Run these commands before reporting implementation done: `npm run typecheck`, `npm run lint`, `npm run build`, rendered desktop/mobile smoke for the affected routes, schema/privacy/package validators as they are added, and low-bandwidth/mobile checks when UI surfaces change.
- Report using the Orchestrate Report format, including UI Visual Milestone reconciliation.
