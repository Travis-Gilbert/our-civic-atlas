# Remaining V1 Execution Checklist

Source of truth for this note:
- `docs/plans/our-civic-atlas-v1-launch-plan.md` (OCA checklist + production gates)
- `docs/plans/renderer-stack-integration.md` (Atlas runtime/renderer contract)

Scope note: local UI/API/code work in this recovery stream includes active Atlas Scene / Node Horizon / dossier path edits.
This recovery session completed the immediate timed-out slice for the reusable place dossier contract, strict dossier validation, source-card linkage cleanup, tablet evidence panel spacing, and mobile evidence provenance access. The launch plan still shows broader product work as partial or planned, especially non-place dossier subjects, contribution/review, full Evidence Constellation interactions, and public launch governance.

## Current recovery evidence
- Strict fixture dossier contract: `node scripts/validate-dossier-payload.mjs --fail-on-warning` validates 222/222 dossiers with no warnings.
- Static atlas gate: `npm run validate:atlas` validates the static atlas package and the strict dossier payload contract.
- Live API contract: `npm run validate:dossier:live` validates 222/222 live `/api/v2/theseus/open-flint-atlas/dossiers/*` payloads against `localhost:3000`.
- Product gates rerun: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`.
- Visual gate rerun: Playwright MCP checked `/open-flint-atlas/evidence` at 1024 x 768 with no overlapping floating panels and 390 x 844 with a visible mobile provenance sheet.
- Route envelope gate: OCA-003 now has routed pages for map/explore/lenses, sources, contribute, methodology, node, place, object, and scene; `npm run validate:routes:live` checks 13 public URLs.
- Node Horizon gate: OCA-005/OCA-017B now exposes parent/child/neighbor `Open` actions as accessible links to `/open-flint-atlas/node/[atlasId]`; Playwright MCP clicked the first horizon link and confirmed the Michigan node detail route, no horizontal overflow, and named `Open {node}` actions. `Compare`, breadcrumbs, and spatial portal transitions remain partial.
- Node Horizon return gate: node detail pages now expose a Federation path and `Node Horizon` return action anchored to `/open-flint-atlas#node-horizon`; Playwright MCP confirmed the Michigan node route has the return affordance and clicks back to the anchored map shell without horizontal overflow. `Compare` and spatial portal transitions remain partial.

## Immediate next slices
- OCA-003A: finalize component map for the new Atlas Scene shell (`AtlasAppShell`, mode rail, Node Horizon, confidence receipt/review/evidence panels, mosaic/timeline controls).
- OCA-004: finish bounded-world Atlas Scene treatment (custom boundary/camera presets/style and fallback consistency with mobile map).
- OCA-005: continue Node Horizon interaction hardening with compare/breadcrumb behavior and spatial portal transitions now that neighboring/parent/child nodes are route-backed navigation affordances.

## Data / contract slices
- OCA-002, OCA-002A, OCA-002B: finish manifest-first federation schema and AtlasNode/CivicObject contracts.
- OCA-002C: complete minimal static atlas starter generation contract and validator surface.
- OCA-006A: finalize single reusable dossier payload contract across place/object/event/source/intervention/road segment/atlas node dossiers.
- OCA-019: add the static atlas creator kit so other places can start from manifest, boundary, source registry, validator, governance, and contribution-policy templates.
- OCA-020, OCA-020A, OCA-020B: define public read package, static file contract, and offline/low-bandwidth behavior end-to-end for launch-ready publishable nodes.
- OCA-026: close route/API contract surface parity for manifest, nodes, layers, sources, dossiers, search, scene manifests, and refresh fallbacks.

## Public contribution / review slices
- OCA-007: ship confidence/progress explanation UX tied to explicit support reasons and citation paths.
- OCA-008: implement contribution receipt end-to-end so submissions produce private/public boundary-safe records.
- OCA-009: complete maintainer review queue and decision transitions with explicit public-safe reason states.
- OCA-010: integrate TF.js preflight guardrails before acceptance into any public submission path.
- OCA-011: wire ACC/ACT review snapshots into contribution states with auditable, reproducible scoring outputs.
- OCA-023, OCA-023A: finish public contribution policy/governance documentation bundle and dispute/remediation process.
- OCA-028: add observability events for moderation, source refresh, submissions, and stale/fail states.

## Civic content / public atlas feature slices
- OCA-012, OCA-012A, OCA-012B: build Lost Flint foundations, Temporal Building Registry schema, and historical article/event layer without implying false certainty.
- OCA-013: add Civic Intervention Ledger v0.1 so place/corridor/ward dossiers show promises, funding, actors, documents, and outcomes.
- OCA-014: build Street Safety Lab foundations from crash history, road/corridor aggregates, trend cards, and caveat copy before forecasts.
- OCA-015: add Evidence Constellation so a selected dossier can open the source/dataset/claim/event/place graph.

## Renderer / SceneManifest slices
- OCA-016: finalize SceneManifest v0 schema (objects, bbox/time, render styles, sources, dossiers, assets).
- OCA-017: implement civic object render modes at least for current, vanished, inferred, disputed, intervention, crash, source, and Brush.
- OCA-017A: finish visual grammar token set and usage map (also aligns with `renderer-stack-integration.md` rule that every rendered object includes civic id + source/confidence/review + dossier link).
- OCA-017B: finalize Node Horizon interaction contract details so interaction scales beyond hand-wired demos.
- OCA-018, OCA-018A: keep renderer and Scene Foundry separated; complete manifest-driven asset pipeline contract before runtime dependency expansion.

## Governance / ops slices
- OCA-024: complete visual gate evidence and Do Not Downgrade confirmation before product completion.
- OCA-025: define source retrieval + artifact archive contract (raw artifacts, extraction candidates, rights/retrieval refresh cadence).
- OCA-021: document and enforce canonical storage split in implementation surfaces (PostGIS spatial, Memgraph provenance, Redis/RRG hot state only).
- OCA-027: add the Mobile Civic Access Gate so 390 x 844 search, dossier, tap targets, source/confidence visibility, and reduced-motion behavior are launch checks rather than polish.

## Deferred ML / foundry slices
- OCA-022 / OCA-022A: defer model or predictive layers until data sufficiency, baselines, and proposal-only labeling are proven.
- OCA-018 / OCA-018A: defer broad Scene Foundry automation while contracts are stabilized; execute only behind deterministic manifest reviews.

## Render stack alignment check (from renderer-stack-integration.md)
- Atlas Scene remains primary UI runtime (MapLibre + deck.gl + PMTiles + Mosaic/vgplot/3D overlays where needed).
- SceneManifest stays the renderer contract boundary; no live-LLM/tool runtime in route rendering.
- IFC/Brush/Blender/3D Tiles paths stay on the scene-factory side and must emit provenance-coupled assets.
