# Planning-Theorem Artifact: The Atelier

Generated 2026-05-23. This is the central implementation plan for the Atelier feature. It is the production definition of done for v1; checklist items below trace 1 to 1 with the spec at `SPEC-THE-ATELIER.md` and the grounding analyses at `codebase-inventory.md`, `graphql-contract.md`, and `animation-choreography.md`.

## Executive Summary

- **Goal:** Ship the v1 Atelier surface as defined in `SPEC-THE-ATELIER.md` (lines 250 to 260), at full spec floor: a separate full-screen surface entered from one of three places (dynamic island icon, search-bar temporal-query affordance, right-click on a lost building), running the 8-stage reconstruction animation (6 to 8 seconds, skippable, replayable), rendering real source cards with per-type visual identity, real conflict markers, real per-part dossier panel, all hosted by the existing Civic Atlas frontend and resolved through new GraphQL fields on the Axum backend.
- **Intent:** Make the procedural reconstruction engine's eight stages visible, cinematic, and clickable. Make the reconstruction-as-process moment the demo-worthy artifact of the entire stack. Match the spec's ambition with planning rigor.
- **Summary of work:** Extend the existing reconstruction stack (which is more mature than the spec assumes; see `codebase-inventory.md`) with a new presentation surface. The frontend route, the takeover surface, the choreographer, the per-type source cards, the conflict markers, the dossier panel, and the entry-point wiring are all new components. The backend extends `flint-graphql-schema-v1.graphql` with 5 new types and 4 new query fields (per `graphql-contract.md`). The Pairformer weights remain untrained for v1 visual build; the SHIP gate is Carriage Town real-data end-to-end and the BUILD gate is the visual surface against the existing `FLINT_LOST_RECONSTRUCTIONS` fixture; both gates are explicitly distinct.

## Current Condition

See `codebase-inventory.md` for the full grounding. In short:

- **Reconstruction backend is substantially more mature than the spec assumes.** All four Rust engine interfaces (`EvidenceRepository`, `BlockSubgraphRepository`, `EmbeddingProvider`, `AssetGenerator`) have production impls (3,325 lines in `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs`). The Pairformer architecture is fully built; weights are untrained but the spec at line 287 explicitly authorizes building the atelier UI against fixture data while corpus and model mature.
- **The frontend reconstruction primitives are mostly already in place**: `HistoricalReconstruction` type with per-part confidence, the Carriage Town fixture (5 buildings with real source IDs), the `ReconstructionNodeTree` Pascal-node tree (currently unwired; the atelier is its first consumer), the `ConfidenceMixMeshLayer` deck.gl shader, the existing Carriage Town route, the `GHOST_PALETTE` constants.
- **The GraphQL schema is "draft for review"** at `docs/design/flint-graphql-schema-v1.graphql` (line 1 header). The atelier extends it; see `graphql-contract.md`.
- **The dynamic island has tab infrastructure** and already includes a `DossierDisabledAction` labeled "Reconstruct historical view" (`AtlasDynamicIsland.tsx` line 969) marked "Coming soon" — the atelier replaces this with a real entry point.
- **No atelier scaffolding exists**: a grep for "atelier" returns 2 hits, both unrelated. The atelier surface is entirely new.
- **The Lost Flint UI brainstorm at `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` resolved a related set of decisions** (confidence thresholds 60/90, year deep-link `?year=N`, R3F overlay landmark-only, porcelain fraction 0.05 to 0.95, stacked-row part layout, civic-language map, pending-corrections badge zero-hidden). The atelier INHERITS these decisions without re-deciding; the atelier surface itself was NOT in the brainstorm's scope.

## Intent

The user wants to ship the most ambitious visual feature of the Civic Atlas: a workshop surface where archival fragments compose themselves into a building in front of the user's eyes, with every source clickable, every confidence visible, every conflict honest. Per the user's own framing: "one of the most exciting features we have ever worked on, especially as far as visuals go." Match that ambition with planning rigor.

## Goal

- **User-visible outcome:** From any of three entry points (dynamic island icon, search-bar temporal-query "Reconstruct" affordance, right-click on a lost building), the user enters a full-screen atelier surface visually distinct from the rest of the atlas (darker paper register, paper architect's grid, drone-shot camera). The reconstruction animation plays over ~7.5 seconds (or ~5 seconds for subsequent reconstructions in the same session), showing source cards arriving from off-screen and depositing wireframe + material details into a building model. Conflicts surface as clickable terracotta markers. A dossier side panel shows the per-part spec with citations. Skip / replay / exit controls are always accessible. Exiting drops the user back to the atlas with the reconstructed building visible as a Lost Flint overlay.
- **System behavior:** A new Next.js route `/open-flint-atlas/atelier/[parcelId]/[year]` mounts an `AtelierSurface` component that fetches one `ReconstructionDossier` GraphQL query and drives a deterministic per-stage animation choreographer. The choreographer respects `prefers-reduced-motion`, scales playback for subsequent reconstructions, supports skip / replay, and exposes a clean exit transition back to the atlas Lost Flint layer.
- **Data / model changes:** New types in the GraphQL schema: `EvidenceItem`, `EvidenceBundle`, `MergeConflict`, `MergeDisagreement`, `BlockSubgraph`, `BlockNeighbor`, `ReconstructionDossier`, plus an extension to `HistoricalReconstruction` for per-part confidence fields. 4 new queries: `evidenceForReconstruction`, `conflictsForReconstruction`, `blockSubgraphForReconstruction`, `reconstructionDossier`. All resolvers attach `TenantContext` server-side and carry no frontend credentials.
- **Operational impact:** Adds one bundle entry per route under `/open-flint-atlas/atelier/`. Adds one urql query roundtrip per atelier open. The frontend animation runs entirely client-side; no WebSocket, no server orchestration. Bundle size increase: estimate ~25 KB gzipped for the new components (rough order; the visual gate will verify).
- **What must not regress:**
  - The existing Carriage Town route (`/open-flint-atlas/lost-flint/carriage-town`) continues to render the atlas Lost Flint layer at full fidelity; the atelier is additive, not replacing
  - The dynamic island remains the universal chrome for the atlas (visual-grammar-v1.md decision); the atelier surface is a takeover that the user enters and exits, not a permanent replacement
  - All locked decisions from the Lost Flint UI brainstorm (`docs/design/lost-flint-ui-brainstorm-2026-05-21.md`) remain in force: 60/90 thresholds, porcelain fraction formula, civic-language map, stacked-row part layout, pending-corrections badge zero-hidden
  - The existing ghost palette (`#F2F8F7` / `#CFE0DC` / `#9CC0B8`) remains the BUILDING material register; the atelier's darker paper is a SURFACE register, not a material one. Two different layers, two different palettes
  - The locked visual-grammar-v1 jargon ban applies to all atelier UI strings: no "evidence", no "provenance", no "epistemic" in user-facing copy. Internal type names keep technical labels

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Atelier route mounts, dossier query resolves, choreographer plays 8 stages, skip/replay/exit work, no console errors | Playwright smoke (`scripts/smoke-open-flint-routes.mjs`) extended for the atelier route; manual preview-tool walkthrough of all 8 stages; reduced-motion path verified | planned |
| Product complete | All entry points wired, all source-card types render with distinct visual identity, conflict markers populate from real merge output, dossier panel reads per-part data, exit transition leaves user on the atlas with the reconstructed building visible in the Lost Flint layer | Visual gate review (design-pro + impeccable + ui-design-pro:design-theory consulted; before/after/target screenshots captured) | planned |
| Vision complete | The atelier matches the spec's ambition: the user feels they have entered a workshop where archival fragments compose into a building. Stops scrolling. Demo-worthy without further polish | Design-critic review against the spec's tone (`SPEC-THE-ATELIER.md` lines 289 to 304); user sign-off on the visual register | planned |
| Baseline capture | Current Carriage Town route screenshot, target reference (the spec's prose evocations + reference images chosen by the design specialists), "do not change" screenshots for the atlas Lost Flint layer and the dynamic island chrome | `docs/visual-evidence/atelier-baseline/` directory with named screenshots | planned |
| Do Not Downgrade | The atlas Lost Flint layer, the dynamic island, the existing Carriage Town route, and the ghost-palette confidence rendering all remain at equal-or-better fidelity after the atelier lands | Visual-gate review side-by-side; explicit confirmation each surface is unchanged | planned |
| Reversible boundary | Atelier route is a separate path; the existing routes are untouched. Feature can be disabled by removing the route's link from the dynamic island and the search-bar affordance without removing the underlying code | The atelier route exists as a parallel surface, not a replacement | planned |

## Vision Delta

- **Target vision:** The Atelier is the moment in the Civic Atlas that has no equivalent anywhere else. ArcGIS Urban doesn't reconstruct; HistoricMapWorks doesn't extrude; Google Earth Time Machine doesn't show evidence. The Atelier shows the evidence assembling into a building with every source clickable and every conflict honest. It is the demo moment, the press-story moment, the grant-application moment. The visual register feels like entering a workshop, not selecting a tab.
- **Current visual condition:** No atelier surface exists today. The Carriage Town route renders the atlas scene with the Lost Flint deck layer; users can see the porcelain-mixed buildings but cannot see how the reconstruction was assembled or which sources contributed what. The dynamic island Place tab has a "Reconstruct historical view" button that is explicitly disabled and labeled "Coming soon."
- **This plan makes true (v1):**
  - The atelier surface exists at `/open-flint-atlas/atelier/[parcelId]/[year]`
  - The 8-stage reconstruction animation plays at full timing budget (spec lines 51 to 170)
  - Source cards render with per-type visual identity for Sanborn / Photograph / Directory / Text Mention / HABS / Plat Map / Other (spec lines 36 to 38, 64 to 77)
  - Terracotta provenance lines connect cards to parts (spec lines 39, 80 to 96)
  - Conflict markers appear at disagreement points and reveal merge detail on click (spec lines 128 to 146)
  - Dossier side panel renders per-part spec with civic-language labels and citation links (spec lines 197 to 235)
  - Skip, replay, exit controls work (spec lines 172 to 176, 240 to 246)
  - **Save button works with real backend wiring (spec line 169 base save; per PT-001 approval, smallest viable scope: anonymous-with-optional-email receipt via the `submitObservation`-style mutation; share URL the user can bookmark; uses existing Axum + Postgres + PostGIS)**
  - **Saved-reconstruction route `/open-flint-atlas/atelier/saved/[savedId]` resolves a save back to the atelier surface preloaded with the correct reconstruction + year**
  - Subsequent reconstructions auto-play at 1.5x (spec line 175)
  - prefers-reduced-motion reduces the animation to ~1.75s while preserving the per-stage narrative
  - All three entry points are wired (spec lines 25 to 31)
  - Carriage Town pilot building (Whaley House first, then the other 4) renders end-to-end against the existing `FLINT_LOST_RECONSTRUCTIONS` fixture
- **This plan does NOT make true (v1):**
  - The Pairformer model is trained on Flint corpus (defer; spec lines 277 to 281 acknowledge this is a parallel track)
  - Real `DecodedArtifact` rows in PostGIS (defer; Track 2 audit's named engineering)
  - Per-part `nodeId` metadata embedded in Blender-generated glTF assets (defer; the atelier uses the Pascal-node-tree on the frontend side via `reconstruction-node-tree.ts`)
  - The atelier's evidence-card thumbnails (defer; thumbnail URLs render as text-only cards in v1 until the thumbnail pipeline exists)
  - Sound design for the paper-rustling and asset-placement audio cues (defer; v1 ships sound MUTED with explicit opt-in)
  - **User-edited corrections to a save (spec line 169 parenthetical; v2 extension; requires the upcoming files SDK + the deploying RustyRed graph DB)**
  - The scrubbable time slider inside the atelier (spec lines 263, v2)
  - Multi-building reconstructions for whole blocks (spec line 264, v2)
  - User-contributed sources (spec line 265, v2)
  - Conflict resolution proposals from the user (spec line 266, v2)
  - Export the reconstruction as glTF / image / video (spec line 267, v2)
  - AR view (spec line 271, v3)
  - Community reconstruction sessions (spec line 272, v3)
- **Visual downgrade risks:**
  - The atelier introduces a darker visual register. If the implementation gets the warm-graphite tone wrong, the atelier reads as "different aesthetic" rather than "workshop you entered." Mitigation: design-gate proposal with reference images, multiple-token-value comparison
  - The 8-stage choreography is highly authored. Implementation mismatches against the spec's per-stage prescriptions risk reading as generic loading rather than per-stage narrative. Mitigation: per-stage screenshot review, frame-by-frame against the spec's per-stage text
  - The source cards' per-type visual identities (Sanborn = amber paper + sepia, photograph = chamfered frame, etc.) are highly specific. Generic card styles undermine the spec's "each source has a real visual identity tied to what it is in the physical world" (line 37). Mitigation: card-type-specific design specialist consult during PT-302 to PT-307
  - The reconstruction-process moment is the spec's most-screenshot-able artifact. A polished atelier with poor first-second framing fails the spec's "make people stop scrolling" goal (line 303). Mitigation: Stage 0 entry frame is critical; needs explicit visual-gate review
- **Remaining renderer / data / interaction / design gaps after v1 ships:**
  - Untrained Pairformer means Stage 4 "PRIORS APPLIED" output is fixture-derived deterministic synthesis, not a real model run. The user does not see this gap (the visible behavior is identical); the gap is in the data layer, not the UI
  - Zero `DecodedArtifact` rows means the source cards in v1 represent the fixture's `source_ids` rather than backend-resolved evidence items. The fallback synthesizer in `useReconstructionDossier` produces plausible cards from fixture; the gap closes silently when the backend lands
  - No per-stage backend trace means the choreographer's deterministic synthesis is the only path. The optional `ReconstructionPipelineTrace` query (per `graphql-contract.md` Extension 6) is a v1.x upgrade

## Codebase Grounding

See `codebase-inventory.md` for the full grounding. The most-referenced files for this plan:

| Area | Evidence | Notes |
|---|---|---|
| Reconstruction type | `src/lib/atlas/historical-reconstruction.ts` lines 28-95 | Per-part confidence + Carriage Town seed |
| Node tree | `src/lib/atlas/reconstruction-node-tree.ts` | Pascal-node addressing primitive |
| Existing dossier | `src/lib/atlas/dossier-payload.ts` | Reference shape; atelier extends |
| Carriage Town route | `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx` | Sibling pattern to atelier route |
| Scene assembly | `src/components/atlas/OpenFlintAtlasScene.tsx` | The shell the atelier coexists with |
| Dynamic island | `src/components/atlas/AtlasDynamicIsland.tsx` lines 901-975 | "Reconstruct historical view" disabled button |
| Scene chrome | `src/components/atlas/AtlasSceneChrome.tsx` | Where atelier-entry chrome adds an affordance |
| Lost Flint deck | `src/components/atlas/AtlasLostFlintDeckLayer.ts` | 3-tier dispatch + per-part shader |
| Reconstructions hook | `src/lib/atlas/use-historical-reconstructions.ts` | Fetch path; GraphQL swap target |
| GraphQL schema | `docs/design/flint-graphql-schema-v1.graphql` | "Draft for review"; atelier extends |
| Visual grammar | `docs/design/visual-grammar-v1.md` | Ghost palette, jargon ban |
| Lost Flint brainstorm | `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` | Prior approved decisions |
| Track 2 audit | `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md` | Backend status |
| Atlas tokens | `src/app/open-flint-atlas/atlas.css` lines 47-49 | `--ctx-paper*` scale |

## Orchestration Map

| Work type | Route to | Why |
|---|---|---|
| Visual register decision (before any code) | `superpowers:brainstorming` + `anthropic-skills:impeccable` + `ui-design-pro:design-theory` + scan of `Theseus/Design Components/` | Project CLAUDE.md design-gate is binding for any new visual surface |
| Animation choreography (per-stage timing, easing, reduced-motion) | `anthropic-skills:animation-design` + `animation-pro:scene-animator` + `animation-pro:camera-choreographer` + `animation-pro:a11y-motion-auditor` | Spec lines 51-176 prescribe animation; specialist required for vestibular safety |
| R3F scene + custom shader work (per-part confidence, conflict markers) | `three-pro:three-developer` + `js-pro:three-developer` + `animation-pro:scene-animator` | R3F + WebGL implementation |
| TypeScript implementation (choreographer state machine, hooks, types) | `js-pro:typescript-pro` + `js-pro:react-specialist` | TS + React 19 + Next.js 16 idioms |
| GraphQL schema extension + urql wiring | `django-engine-pro:api-architect` (for resolver design discussion; the backend itself lives in another repo) + standard urql codegen pattern | Existing pattern from `civicResearch` mutation |
| Accessibility audit (motion, ARIA, keyboard navigation) | `ui-design-pro:a11y-auditor` + `animation-pro:a11y-motion-auditor` + `ux-pro:Accessibility Auditor` | WCAG 2.2 AA per visual-grammar-v1 |
| UX writing for atelier copy (labels, source-card summaries, conflict explanations, exit copy) | `ux-pro:UX Writer` | Plain-civic-language jargon ban applies |
| Code review at PR time | `coderabbit:code-reviewer` + `feature-dev:code-reviewer` | Standard project pattern |
| Backend Rust resolver implementation | Backend team in `our-civic-atlas-backend` (out of this plan's scope) | This frontend plan specifies the contract; the backend repo owns implementation |

## Checklist

Stage tags: `[G]` = design-gate group, `[D]` = data/GraphQL group, `[S]` = surface scaffolding group, `[A]` = animation group, `[E]` = entry-point group, `[V]` = validation group, `[B]` = backend dependency group (not implemented in this repo).

| ID | Task | Codebase grounding | Agent/skill route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| PT-001 [G] | Run design-gate proposal: synthesize atelier visual register (warm graphite paper, paper grid, terracotta provenance, source-card type identities, drone-shot camera). Surface the visual-grammar-v1 vs spec-line-33 tension explicitly. Produce a design proposal with reference images and at least 2 candidate token values for `--atelier-paper`. User approves before any visual code. Spec lines 33 to 44. | `~/.claude/skills/visual-work-design-gate/SKILL.md`; `docs/design/visual-grammar-v1.md`; `SPEC-THE-ATELIER.md` lines 33-44; `Theseus/Design Components/` (curated library, ~43 components) | superpowers:brainstorming + anthropic-skills:impeccable + ui-design-pro:design-theory + (after synthesis) anthropic-skills:design-pro | Design proposal document committed at `docs/design/atelier-visual-register-proposal.md`; user approved in chat; design-gate compliance trace updated in `README.md` | User explicit approval; no visual code committed before approval | High: scope misalignment if specialists invent register; the spec already prescribes much of the visual direction | pending |
| PT-002 [G] | Run animation choreography proposal: review `animation-choreography.md`, surface any per-stage timing or easing concerns, validate prefers-reduced-motion approach against vestibular-safety thresholds. Spec lines 51 to 176. | `docs/plans/the-atelier/animation-choreography.md`; `SPEC-THE-ATELIER.md` lines 51-176 | anthropic-skills:animation-design + animation-pro:scene-animator + animation-pro:a11y-motion-auditor + animation-pro:camera-choreographer | Animation proposal accepted or refined; per-stage budgets locked; reduced-motion fallback signed off | Specialist review document at `docs/design/atelier-animation-proposal.md` | Medium: specialist may propose budget changes that conflict with spec line 49 (6 to 8 seconds) | pending |
| PT-003 [G] | Run accessibility proposal: walk the atelier through keyboard navigation, screen-reader announcements, WCAG 2.2 AA contrast, and motion safety. Spec lines 173 to 176 (skip), the animation-choreography.md accessibility gates. | `docs/plans/the-atelier/animation-choreography.md` §"Accessibility validation gates"; `docs/design/visual-grammar-v1.md` §"Accessibility" | ui-design-pro:a11y-auditor + ux-pro:Accessibility Auditor + animation-pro:a11y-motion-auditor | A11y proposal at `docs/design/atelier-a11y-proposal.md`; checklist of WCAG conformance items | Specialist review | Low: project already has strong a11y baseline | pending |
| PT-101 [D] | Extend `flint-graphql-schema-v1.graphql` with the new types and queries per `graphql-contract.md` Extensions 1 to 5: per-part confidence fields on HistoricalReconstruction; EvidenceItem + EvidenceBundle; MergeConflict + MergeDisagreement; BlockSubgraph + BlockNeighbor; ReconstructionDossier; the four new queries. Spec lines 64 to 235. | `docs/design/flint-graphql-schema-v1.graphql`; `docs/plans/the-atelier/graphql-contract.md` Extensions 1-5 | django-engine-pro:api-architect (for the schema design discussion; the backend repo owns implementation) | Schema changes committed; existing tests pass; `npm run codegen` produces updated TypeScript types without error | `npm run codegen` succeeds; `npm run typecheck` succeeds | Low: extensions are additive; existing queries unchanged | pending |
| PT-102 [D] | Add GraphQL query files for the four new queries (`atelier-dossier.graphql`, `atelier-evidence.graphql`, `atelier-conflicts.graphql`, `atelier-block-subgraph.graphql`) under `src/lib/api/graphql/queries/`. Run codegen. Spec lines 64 to 235. | `src/lib/api/graphql/queries/*.graphql` existing pattern; `graphql-contract.md` Extensions 2 to 5 | js-pro:typescript-pro | New `.graphql` files exist; codegen emits typed hooks; no codegen errors | `npm run codegen`; `npm run typecheck` | Low | pending |
| PT-103 [D] | Create the `useReconstructionDossier(reconstructionId, { fallback: true })` hook at `src/lib/atlas/use-reconstruction-dossier.ts`. Mirrors the `useHistoricalReconstructions` pattern: real GraphQL fetch via urql, falls back to in-memory synthesizer from `FLINT_LOST_RECONSTRUCTIONS` + plausible EvidenceItem / MergeConflict construction from the fixture's source_ids and per-part confidences. Synthesizer marked dev-only and gated; production always uses the GraphQL resolver. Spec line 287 authorizes this. | `src/lib/atlas/use-historical-reconstructions.ts` (pattern); `graphql-contract.md` §"Frontend consumption pattern"; `src/lib/atlas/historical-reconstruction.ts` (fixture) | js-pro:typescript-pro + js-pro:react-specialist | Hook returns `{ dossier, loading, error, source: "graphql" | "fallback" }`; fallback path produces a deterministic synthesis from fixture; production path uses real GraphQL; never returns null | Unit tests cover both code paths; Storybook scenario for both | Medium: synthesizer must produce honest cards (no inventing facts); must match the spec's "evidence-poor parcels show scarcity directly" line 76 | pending |
| PT-103b [D] | Create the `useReconstructionSave` hook at `src/lib/atlas/use-reconstruction-save.ts`. Exposes `saveReconstruction(reconstructionId, year, email?, caption?)` returning `{ savedId, shareUrl, savedAt }` and `{ loading, error }`. Mirrors the existing `submitObservation`-consumer pattern. NO fallback synthesizer (writes must succeed against the real backend; if the resolver is down, the save fails honestly with a user-visible error). Spec line 169 (base save). | `graphql-contract.md` Extension 7; existing observation submission pattern | js-pro:typescript-pro + js-pro:react-specialist | Hook calls the GraphQL mutation; returns success or error; in dev when backend unreachable, returns explicit error (no fake success) | Unit tests for the mutation call; integration smoke against staging | Medium: write paths need careful error handling | pending |
| PT-103c [D] | Create the `useSavedReconstruction` hook at `src/lib/atlas/use-saved-reconstruction.ts`. Queries `savedReconstruction(id)` and returns `{ savedReconstruction, loading, error }`. Used by the new saved-route to preload the atelier from a saved id. Spec line 169 (base save). | `graphql-contract.md` Extension 7 `savedReconstruction(id)` query | js-pro:typescript-pro + js-pro:react-specialist | Hook resolves saved id to a `SavedReconstruction` shape with reconstructionId + year; 404 case returns null + error | Unit tests | Low | pending |
| PT-104 [D] | Wire the backend resolver dependencies for the read queries (`reconstructionDossier`, `evidenceForReconstruction`, `conflictsForReconstruction`, `blockSubgraphForReconstruction`). NOT IMPLEMENTED IN THIS REPO. Track this checklist item with status "blocked-by-backend" until `our-civic-atlas-backend` implements the resolvers per `graphql-contract.md`. Spec lines 64 to 235. | `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs` lines 1188-1830 (existing Rust impls); `graphql-contract.md` Extensions 1-5 | Backend team (out of this plan's scope) | Backend read resolvers exist; the `useReconstructionDossier` hook returns `source: "graphql"` in production environment | Manual smoke test against staging backend | High: backend dependency; until resolved, frontend uses fallback synthesizer in dev and the atelier ships honest empty states in production | blocked-by-backend |
| PT-104b [B] | Wire the backend resolver and Postgres table for the `saveReconstruction` mutation + `savedReconstruction(id)` query. NOT IMPLEMENTED IN THIS REPO. New Postgres table `saved_reconstructions` with columns per `graphql-contract.md` Extension 7. Axum resolver attaches `TenantContext` server-side. Receipt email follows the existing `submitObservation` delivery path. Spec line 169 (base save). | `our-civic-atlas-backend` Axum civic-atlas-server (existing pattern for `submitObservation`); `graphql-contract.md` Extension 7 | Backend team (out of this plan's scope) | Mutation persists the save; query retrieves; receipt email delivers when contributor_email provided | Manual smoke test against staging backend; row-count check in Postgres | Medium: new table requires migration; pattern is well-established | blocked-by-backend |
| PT-201 [S] | Create the atelier-scoped CSS file at `src/app/open-flint-atlas/atelier/atelier.css`. Defines `--atelier-paper` (the warm graphite, value from PT-001 design proposal), `--atelier-grid` (the architect's drafting grid color), `--atelier-source-amber` (Sanborn paper tone), `--atelier-photo-frame` (chamfered frame edge color), `--atelier-directory-paper` (typewritten card tone), `--atelier-text-mention-ink` (italic quote slip color), and any other atelier-specific tokens. Scoped to `.atelier-theme` class. Spec lines 33 to 44. | `src/app/open-flint-atlas/atlas.css` lines 47-49 (existing `--ctx-paper*` scale); PT-001 output | Output of PT-001 | All tokens defined; theme class applied scoped to the atelier surface only; existing routes unchanged | `npm run validate:visual-grammar`; visual gate review | Low | pending |
| PT-202 [S] | Create the atelier route `src/app/open-flint-atlas/atelier/[parcelId]/[year]/page.tsx`. Server component with `generateMetadata` (title and description per spec line 56 example); Suspense fallback; mounts `<AtelierSurface>`. Spec line 285. | `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx` (sibling pattern); `src/app/open-flint-atlas/[lens]/page.tsx` (dynamic route pattern) | js-pro:nextjs-developer | Route exists; navigates to `/open-flint-atlas/atelier/carriage-town:whaley-house/1925` and renders the surface; 404 for invalid parcelId | Playwright smoke; manual navigation | Low | pending |
| PT-203 [S] | Create `<AtelierSurface>` at `src/components/atlas/atelier/AtelierSurface.tsx`. Full-screen takeover layer above the atlas; mounts the R3F canvas, dossier panel, source cards container, controls. Accepts `parcelId` and `year` props; calls `useReconstructionDossier(reconstructionId)`. Manages overall state: stage progress, skip status, replay count. Spec lines 22 to 31. | `src/components/atlas/OpenFlintAtlasScene.tsx` (existing scene assembly pattern); `animation-choreography.md` §"Implementation file map" | js-pro:react-specialist + js-pro:nextjs-developer (after PT-001 visual approval) | Surface renders the dark register, the paper grid base, mounts child components, and starts the choreographer on mount | Storybook scenario; preview-tool smoke; visual review | Medium: hosts the bulk of the atelier UX | pending |
| PT-204 [S] | Create `<AtelierR3FScene>` at `src/components/atlas/atelier/AtelierR3FScene.tsx`. The R3F canvas with the camera rig, the building meshes, the dust motes, the lighting, the conflict markers, the provenance lines. Reuses `ConfidenceMixMeshLayer` for the building shader (per Lost Flint brainstorm T4 decision). Spec lines 35 to 44 (visual register), lines 51 to 170 (animation contents). | `src/components/atlas/AtlasThreeScene.tsx` (existing R3F scene pattern); `src/components/atlas/AtlasBuildingsLayer.tsx` `AtlasLostFlintLayer`; `animation-choreography.md` §"Stage 6: Asset generation" | three-pro:three-developer + animation-pro:scene-animator + js-pro:three-developer | R3F canvas mounts in the atelier surface; camera rig at the Stage 0 starting position; building, lighting, dust motes are present (Stage 7 final positions when choreographer is paused at end) | Preview-tool snapshot; visual review | High: shader composition with the existing ConfidenceMixMeshLayer is non-trivial in R3F (the shader is currently deck.gl-only) | pending |
| PT-205 [S] | Create `<AtelierDustMotes>` at `src/components/atlas/atelier/AtelierDustMotes.tsx`. Ambient particle field, ~40 particles, drifting at ~0.05 units/sec on Y axis. Spec line 55. | `animation-choreography.md` §"Stage 0: Entry" | animation-pro:creative-coder | Particles render; drift is visible but slow; reduced-motion path removes them entirely | Visual review; reduced-motion smoke | Low | pending |
| PT-206 [S] | Define the atelier route navigation contract: `parcelId` is a `civic_object_id` value (e.g., `building:carriage-town:1`); `year` is a 4-digit ISO year. URL-decoded in the route; mapped to `reconstructionId` (e.g., `historical:carriage-town:whaley-house`) via a fixture lookup in v1, GraphQL resolver in v1.x. Spec lines 25 to 31, 285. | `src/lib/atlas/historical-reconstruction.ts` (fixture has both `id` and `civic_object_id`) | js-pro:typescript-pro | Route accepts both formats and resolves to the correct reconstruction; helper function at `src/lib/atlas/atelier-route.ts` for parcelId-to-reconstructionId mapping | Unit tests | Low | pending |
| PT-301 [A] | Implement the choreographer state machine at `src/lib/atlas/atelier-choreographer.ts`. Per the spec at `animation-choreography.md` §"Choreographer architecture": deterministic timeline, per-stage directives, prefers-reduced-motion gate, playback speed gate (1.0 or 1.5), skip and replay APIs. Spec lines 51 to 176. | `animation-choreography.md` §"Choreographer architecture (frontend-side, v1)" | js-pro:typescript-pro + animation-pro:scene-animator | `createChoreographer(opts)` returns the documented API; state transitions are observable; skip and replay work | Unit tests for state transitions; integration test for full playthrough | Medium | pending |
| PT-302 [A] | Implement Stage 0: Entry (0.5s). Atelier surface fade-in, camera positions looking down, "RECONSTRUCTING" label appears, dust motes start drifting. Spec lines 51 to 62. | `animation-choreography.md` §"Stage 0: Entry" | animation-pro:scene-animator + animation-pro:camera-choreographer | Stage 0 renders per spec; reduced-motion path tested | Visual review per-stage; preview-tool screenshot at Stage 0 end | Low | pending |
| PT-303 [A] | Implement Stage 1: Evidence gathering (1.0s). Source cards arrive from off-screen in staggered sequence, settling at coordinates near the building footprint. Spec lines 64 to 77. | `animation-choreography.md` §"Stage 1: Evidence gathering" | animation-pro:scene-animator + animation-pro:gesture-engineer | Cards arrive at correct positions, stagger respects card count, per-type visual identity applied (handed off from PT-401) | Visual review; preview-tool snapshot at Stage 1 end | Medium: card identity must be in place from PT-401 | pending |
| PT-304 [A] | Implement Stage 2: Direct extraction (1.5s). Terracotta provenance lines arrive from each card, depositing wireframe + material details into the building. Per-source-type deposit semantics (Sanborn first, then second Sanborn, then photograph, then directory, then text-mention). Spec lines 78 to 96. | `animation-choreography.md` §"Stage 2: Direct extraction" | animation-pro:scene-animator + three-pro:three-developer | Lines arrive on schedule, deposits trigger correct building state transitions | Visual review; per-deposit smoke | Medium | pending |
| PT-305 [A] | Implement Stage 3: Block subgraph (0.8s). Neighboring buildings highlight as ghost-wireframes; connection lines shimmer with relation chips; lines fade after the stage. Spec lines 98 to 104. | `animation-choreography.md` §"Stage 3: Block subgraph"; `graphql-contract.md` Extension 4 | animation-pro:scene-animator + three-pro:three-developer | Neighbors appear, connections shimmer, chips visible, fade is smooth | Visual review | Medium: relies on BlockSubgraph data from GraphQL resolver (PT-104) | pending |
| PT-306 [A] | Implement Stage 4: Pairformer inference (1.0s). Screen darkens, two pulse rings expand from focus building, missing details solidify (high confidence = solid; low confidence = ghost or flicker), side-panel label updates. Spec lines 106 to 126. | `animation-choreography.md` §"Stage 4: Pairformer inference" | animation-pro:scene-animator + three-pro:three-developer | Pulses render, detail solidification is per-confidence, flicker is at 4 Hz with ±5% amplitude for low-confidence parts | Visual review; reduced-motion path verified (flicker replaced with static ghost) | Medium | pending |
| PT-307 [A] | Implement Stage 5: Merge with conflict surfacing (1.0s). Conflict markers appear at each disagreement point; markers stay visible thereafter. Spec lines 128 to 146. | `animation-choreography.md` §"Stage 5: Merge with conflict surfacing"; PT-501 (conflict marker component) | animation-pro:scene-animator + three-pro:three-developer | Markers appear at correct geometry (per `MergeConflict.targetNodeId`); zero-conflict case is silent | Visual review; manual test with zero-conflict and multi-conflict scenarios | Medium | pending |
| PT-308 [A] | Implement Stage 6: Asset generation (1.5s). Wireframe walls fill with material, roof completes, openings deepen, ornaments emerge, camera glides through quarter-orbit, ambient lighting brightens. Spec lines 148 to 160. | `animation-choreography.md` §"Stage 6: Asset generation"; `src/components/atlas/AtlasLostFlintDeckLayer.ts` (existing per-part shader) | three-pro:three-developer + animation-pro:camera-choreographer + animation-pro:scene-animator | Wall fill renders, roof completes, camera orbit is smooth, lighting transition is gradual; reduced-motion path verified | Visual review (this is the cinematic moment; design-critic review required) | High: this is the spec's "cinematic moment" (line 149); execution quality matters most | pending |
| PT-309 [A] | Implement Stage 7: Settled state (0.2s + persistent). Dossier panel fades to full opacity, label transitions to "RECONSTRUCTED", all interactive elements remain. Spec lines 162 to 170. | `animation-choreography.md` §"Stage 7: Settled state" | animation-pro:scene-animator | Settled state is reached; all interactives respond | Visual review; interaction smoke (card clicks, marker clicks, replay button) | Low | pending |
| PT-310 [A] | Implement skip / replay / auto-play-at-1.5x semantics. Spec lines 172 to 176. | `animation-choreography.md` §"Skip and replay semantics" | js-pro:typescript-pro + animation-pro:scene-animator | Skip jumps to Stage 7 from any stage; replay restarts; subsequent atelier opens in the same session auto-play at 1.5x; `sessionStorage` flag set after first Stage 7 | Manual smoke covering skip from each stage; replay sanity; multi-building session test | Low | pending |
| PT-311 [A] | Implement prefers-reduced-motion path for the entire choreography. Each stage's reduced-motion variant per `animation-choreography.md` per-stage section. Total reduced duration ≤ 2 seconds. Spec line 350 in visual-grammar-v1.md. | `animation-choreography.md` §"prefers-reduced-motion: total budget" | animation-pro:a11y-motion-auditor + animation-pro:scene-animator | Reduced-motion smoke renders all stages in ≤ 2 seconds; no pulse rings, no flickers, no camera orbits | preview-tool with reduced-motion preference set; a11y audit pass | Medium: vestibular safety threshold | pending |
| PT-401 [V] | Create per-source-type visual cards. Implement at `src/components/atlas/atelier/AtelierEvidenceCard.tsx` with type-dispatched rendering: Sanborn (amber paper + sepia lines), Photograph (chamfered frame), Directory (typewritten), TextMention (italic quote slip), HABS Record (default + HABS chip), Plat Map (default + plat chip), Other (neutral). Spec lines 36 to 38, 64 to 77. | `animation-choreography.md` §"Stage 1: Evidence gathering"; PT-201 atelier CSS tokens for the source styles | anthropic-skills:impeccable + ui-design-pro:component-builder + ux-pro:UX Writer | Each card type has distinct visual identity; Storybook covers all 7 types; hover tooltip shows source name + year + "View source" affordance; click opens source detail panel | Storybook; visual review; UX writing review | High: per-type identity is core to the spec's "each source has a real visual identity tied to what it is in the physical world" (line 37) | pending |
| PT-402 [V] | Create `<AtelierConflictMarker>` at `src/components/atlas/atelier/AtelierConflictMarker.tsx`. Terracotta dot in 3D space at the geometry coordinate of `MergeConflict.targetNodeId`; click opens a popover with the merge detail (disagreeing sources, stated values, confidences, resolution explanation). Spec lines 128 to 146. | `animation-choreography.md` §"Stage 5: Merge with conflict surfacing"; `graphql-contract.md` Extension 3 | three-pro:three-developer + ui-design-pro:component-builder + ux-pro:UX Writer | Markers render at correct positions; click opens popover; popover content is per spec lines 134 to 141 | Manual smoke per-conflict; Storybook for popover | Medium | pending |
| PT-403 [V] | Create `<AtelierProvenanceLine>` at `src/components/atlas/atelier/AtelierProvenanceLine.tsx`. R3F Line from `@react-three/drei`; terracotta `--ctx-accent` color at 0.5 opacity; supports timeline-driven draw progress (0 to 1) for the choreographer's Stage 2 line-arrival animations. Spec lines 39, 80 to 96. | `animation-choreography.md` §"Stage 2: Direct extraction"; `src/components/atlas/AtlasThreeScene.tsx` (existing `Line` import) | three-pro:three-developer + animation-pro:scene-animator | Lines render between configurable endpoints; draw progress is animatable; opacity matches spec | Visual review; Storybook | Low | pending |
| PT-404 [V] | Create `<AtelierDossierPanel>` at `src/components/atlas/atelier/AtelierDossierPanel.tsx`. Side panel rendering per-part spec: typology, mass (form, stories, height), facade (material, color, bays), roof (type, pitch), ground floor (use), ornaments, conflicts (with click-to-detail), sources (with click-to-source-card). Civic-language labels per Lost Flint brainstorm T6. Spec lines 197 to 235. | `animation-choreography.md` §"Stage 7: Settled state"; `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` T6; PT-201 atelier CSS | ui-design-pro:component-builder + ux-pro:UX Writer | Panel renders complete spec; civic labels applied; click-through to sources and conflicts works | Storybook; visual review; UX writing review | Medium | pending |
| PT-405 [V] | Create `<AtelierControls>` at `src/components/atlas/atelier/AtelierControls.tsx`. Skip button (top-right), Replay button (side panel), Exit button (top-right "Back to atlas"), **Save button (REAL, wires to `useReconstructionSave` from PT-103b)**. On save success, show inline confirmation with the share URL + a "Copy link" affordance. On save error, show explicit user-visible error (no silent failure). Spec lines 168 to 170, 240 to 245, 169 (real save). | `animation-choreography.md` §"Skip and replay semantics"; spec lines 240 to 245; PT-103b | ui-design-pro:component-builder + ux-pro:UX Writer | All controls render; skip/replay/exit are functional; **save calls the mutation, shows share URL on success, shows error on failure** | Manual smoke; keyboard navigation; a11y audit; save success path with valid email; save error path with backend unreachable | Medium: write-path UX needs honest error states | pending |
| PT-405b [V] | Create the saved-reconstruction route `src/app/open-flint-atlas/atelier/saved/[savedId]/page.tsx`. Server component with `generateMetadata`; Suspense fallback; uses `useSavedReconstruction` from PT-103c to resolve the saved id; mounts `<AtelierSurface>` with the resolved `reconstructionId` + `year`. 404 when saved id not found. Spec line 169 (base save). | PT-103c hook; PT-202 atelier route pattern | js-pro:nextjs-developer | Route exists; navigates to `/open-flint-atlas/atelier/saved/saved-reconstruction:abc123` and renders the saved atelier surface; 404 for invalid savedId | Playwright smoke; manual navigation | Low | pending |
| PT-406 [V] | Wire the exit transition. On exit, atelier surface fades to atlas with half-second transition; user lands at previous map view; reconstructed building visible in atlas Lost Flint layer overlay (faint, ghost-on-present). User can re-enter atelier anytime. Spec lines 240 to 246. | `src/components/atlas/AtlasLostFlintDeckLayer.ts` (existing Lost Flint overlay); spec lines 240 to 246 | js-pro:react-specialist + animation-pro:scene-animator | Exit works from any state; atlas state preserves previous view; reconstructed building is visible in Lost Flint overlay | Manual smoke; integration test of round-trip atelier-to-atlas-to-atelier | Medium: state coordination across the route boundary | pending |
| PT-501 [E] | Replace the "Reconstruct historical view" disabled action in `AtlasDynamicIsland.tsx` lines 968 to 969 with a real `<Link>` to the atelier route. Resolve the target parcelId from the currently-selected building's `osm_id` via a frontend `osm_id` to `civic_object_id` mapping. Spec line 28. | `src/components/atlas/AtlasDynamicIsland.tsx` lines 901 to 975 (existing `BuildingDossier`); `src/lib/atlas/historical-reconstruction.ts` (civic_object_id field) | js-pro:react-specialist | Disabled button becomes a real link; clicking navigates to the atelier route with correct `parcelId` and `year` query | Manual smoke; Playwright | Low | pending |
| PT-502 [E] | Wire the search-bar temporal-query atelier affordance. When `parseAtlasYear(searchValue)` returns a year and a reconstruction exists for the current viewport at that year, surface a "Reconstruct" affordance in the search-results dropdown. Spec lines 26 to 27, 178 to 195. | `src/components/atlas/AtlasDynamicIsland.tsx` (collapsed search results lines 275 to 303); `src/lib/atlas/atlas-time.ts` (`parseAtlasYear`) | js-pro:react-specialist + ux-pro:UX Writer | Search results show "Reconstruct: open atelier at [Place] circa [Year]" when conditions match | Manual smoke with year queries (e.g., "1925 saginaw"); Storybook | Medium | pending |
| PT-503 [E] | Wire the dynamic island atelier icon entry. Add a new "Atelier" entry point chip next to the Ask button (or as an action inside the place tab; final decision per PT-001 design proposal). Icon: small clock-overlay-on-building glyph or stippled building silhouette per spec line 26. Spec lines 25 to 26. | `src/components/atlas/AtlasDynamicIsland.tsx` (tab list); PT-001 design output (icon choice) | ui-design-pro:component-builder + js-pro:react-specialist | Icon appears in the dynamic island; click navigates to the atelier route for the currently-focused parcel (or to a parcel picker if nothing is selected) | Manual smoke; design review of the icon | Low | pending |
| PT-504 [E] | Wire the right-click / long-press atelier entry. Right-click on any building with `status: lost` (or any parcel with a known temporal predecessor) shows a context-menu item "Open Atelier". On mobile, long-press triggers the same. Spec line 28. | `src/components/atlas/OpenFlintAtlasScene.tsx` (`handleBuildingSelect`); `src/lib/atlas/historical-reconstruction.ts` (lost-building predicate) | js-pro:react-specialist + animation-pro:gesture-engineer | Right-click and long-press both work on lost buildings; navigation succeeds | Manual smoke desktop + mobile; preview-tool resize | Medium: gesture handling on mobile is finicky | pending |
| PT-601 [V] | Implement the Carriage Town v1 BUILD gate. Open `/open-flint-atlas/atelier/building:carriage-town:1/1925` (Whaley House). Verify the full atelier surface renders against the existing `FLINT_LOST_RECONSTRUCTIONS` fixture (with the fallback synthesizer for evidence and conflicts in dev). All 8 stages play; source cards render with HABS + Sanborn identities; per-part dossier renders Mass, Facade, Roof, Ground Floor with the fixture's confidences. Spec lines 281, 287. | PT-302 to PT-309, PT-401 to PT-406; `src/lib/atlas/historical-reconstruction.ts` lines 129 to 151 (Whaley House fixture) | feature-dev:code-reviewer + product-management:product-brainstorming (for spec-review against the visible product) | Whaley House atelier opens; animation plays; all visual elements per spec are present; preview-tool screenshot at Stage 7 captured | Manual walkthrough; preview-tool snapshot; design-critic review | Medium | pending |
| PT-602 [V] | Implement the Carriage Town v1 SHIP gate. Open all 5 Carriage Town atelier routes against real backend resolver (PT-104 must be complete). Verify the surface, animation, cards, conflicts, dossier, controls, and exit all work end-to-end against real GraphQL data. Spec line 281. | All v1 PT-* items complete; PT-104 backend complete | feature-dev:code-reviewer + design-critic | All 5 buildings render with real evidence and real conflicts; first-time animation plays at 1.0x, subsequent at 1.5x; exit drops back to the Carriage Town atlas view | Manual walkthrough all 5 buildings; preview-tool screenshots; product-readiness sign-off | High: depends on backend completion | blocked-by-PT-104 |
| PT-701 [V] | Update Playwright smoke (`scripts/smoke-open-flint-routes.mjs`) to cover the new atelier route. Add `/open-flint-atlas/atelier/building:carriage-town:1/1925` to the route list; assert 200 status, no JS errors, Stage 7 reached within 8 seconds. | `scripts/smoke-open-flint-routes.mjs` | js-pro:typescript-pro | Smoke test passes for the atelier route | `npm run validate:routes:live` | Low | pending |
| PT-702 [V] | Update `npm run validate:atlas` to include atelier-specific validators if needed (e.g., `npm run validate:reconstruction-node-tree` already exists; verify the atelier consumes the tree correctly). | `package.json` validate:* scripts | js-pro:typescript-pro | Existing validators continue to pass; any new atelier-specific validators added | `npm run validate:atlas` | Low | pending |
| PT-801 [V] | Capture before/after/target screenshots for the UI Visual Milestone. "Before" = current Carriage Town route at Stage 7-equivalent; "After" = atelier route at Stage 7; "Target reference" = the spec's prose evocations + reference images chosen by the design specialists in PT-001. Save under `docs/visual-evidence/atelier-baseline/`. | UI Visual Milestone gate UIV-002 | ui-design-pro:design-critic | Screenshots committed; visual gate review can run | Manual capture using preview-tool | Low | pending |
| PT-802 [V] | Execute the Do Not Downgrade gate. Side-by-side comparison: atlas Lost Flint layer before vs after the atelier ships; dynamic island before vs after; existing Carriage Town route before vs after. All three must be equal-or-better. | UI Visual Milestone gate UIV-004 | ui-design-pro:design-critic | Each surface confirmed equal-or-better; document signed off | Visual gate review | Medium | pending |
| PT-901 [V] | Write the atelier UX copy: surface labels (RECONSTRUCTING, PRIORS APPLIED, RECONSTRUCTED), source-card summaries, conflict-marker popover copy, exit-button label ("Back to atlas"), save-button disabled-state tooltip ("Saving lands in v2; see the spec"), skip-button copy. Civic language jargon ban applies. | `docs/design/visual-grammar-v1.md` §"Jargon -> civic language"; spec lines 197 to 235 (dossier copy examples) | ux-pro:UX Writer | All atelier copy committed; jargon ban verified via grep against banned terms | UX writing review; jargon-scan script | Low | pending |
| PT-902 [V] | Document the atelier in `docs/public-package/` for the production readme. Add a short-form description, a screenshot, and the route URL. Spec lines 289 to 304 (product significance). | `docs/public-package/` existing READMEs | feature-dev:code-explorer | Public-package doc updated | Manual review | Low | pending |

Total checklist items: 36, organized into 8 groups (G, D, S, A, V, E, validation, copy).

Every spec section has at least one checklist item:

| Spec section | Spec lines | Plan items |
|---|---|---|
| Why this deserves its own surface | 11-20 | (justification; informs PT-001) |
| What the atelier is | 22-31 | PT-202, PT-203, PT-501, PT-502, PT-503, PT-504 |
| Visual language | 33-44 | PT-001, PT-201, PT-204, PT-205, PT-401, PT-403 |
| Reconstruction animation total | 46-49 | PT-301 |
| Stage 0 Entry | 51-62 | PT-302 |
| Stage 1 Evidence gathering | 64-77 | PT-303, PT-401 |
| Stage 2 Direct extraction | 78-96 | PT-304, PT-403 |
| Stage 3 Block subgraph | 98-104 | PT-305 |
| Stage 4 Pairformer inference | 106-126 | PT-306 |
| Stage 5 Merge with conflict surfacing | 128-146 | PT-307, PT-402 |
| Stage 6 Asset generation | 148-160 | PT-308 |
| Stage 7 Settled state | 162-170 | PT-309 |
| Skipping and replay | 172-176 | PT-310, PT-405 |
| Search-bar integration | 178-195 | PT-502 |
| Side panel reconstruction dossier | 197-235 | PT-404, PT-901 |
| Exit | 240-246 | PT-406, PT-405 |
| v1 minimum viable atelier | 250-260 | All v1 items (PT-001 through PT-902) |
| v2 deferrals | 262-267 | Explicit Non-Goals table below |
| v3 deferrals | 269-273 | Explicit Non-Goals table below |
| Backend prerequisites | 277-287 | Codebase inventory; PT-104, PT-602 |
| Why this is worth building | 289-297 | (informs PT-902) |
| Closing note (tone) | 299-304 | (informs PT-001, PT-801) |

No spec section has zero items. This satisfies the project CLAUDE.md rule "If a spec section has zero checklist items pointing at it, that is a planning bug."

## Test Strategy

- **Preflight checks (before any code writes):**
  - `npm run typecheck` clean
  - `npm run lint` clean
  - Existing `npm run validate:atlas` passes
  - Design-gate (PT-001) approved by user
  - Animation specialist proposal (PT-002) approved
- **Focused tests:**
  - Unit tests for the choreographer state machine (`atelier-choreographer.test.ts`)
  - Unit tests for the `useReconstructionDossier` hook (`use-reconstruction-dossier.test.ts`) covering GraphQL path and fallback path
  - Component tests for each new component under `src/components/atlas/atelier/` (props, accessibility, keyboard navigation)
- **Integration tests:**
  - Atelier route mounts, fetches dossier, choreographer reaches Stage 7
  - Skip from each stage works
  - Replay restarts choreographer
  - Second open in same session auto-plays at 1.5x
  - Exit returns user to atlas with reconstructed building visible in Lost Flint layer
  - All three entry points navigate to the correct atelier route
- **Regression tests:**
  - Existing `npm run validate:atlas` continues to pass
  - Existing `npm run validate:routes:live` continues to pass for `/open-flint-atlas/lost-flint/carriage-town`
  - The dynamic island still renders correctly when no building is selected
  - The Lost Flint layer still renders in the atlas view
- **Type / lint / static checks:**
  - `npm run typecheck`
  - `npm run lint`
  - `npm run validate:visual-grammar`
  - `npm run validate:dossier`
- **Manual smoke checks:**
  - All 8 stages render per spec
  - Each source card type has distinct visual identity
  - Conflict markers click through to detail popover
  - Per-part dossier renders all sections
  - Skip from each stage works
  - Replay restarts
  - Subsequent reconstructions auto-play at 1.5x
  - Reduced-motion path collapses animation appropriately
  - Atelier route works in mobile viewport (test in preview-tool at 390x844)
  - Exit returns to atlas with Lost Flint overlay visible
- **Performance / security checks:**
  - Animation runs at 60fps on mid-range laptop (target: M1 MacBook Air; floor: 4-year-old Intel i5)
  - No console errors or warnings in any stage
  - No frontend-held service-tier credentials introduced (greps for `_TOKEN`, `_API_KEY`, etc. in client-side bundles)
  - GraphQL resolvers attach `TenantContext` (verified at backend repo, not this plan's scope)

## Production Gates

- [ ] Tests pass or failures are explained
- [ ] No unchecked migration or data risk (no PostGIS schema changes from this plan; backend is additive)
- [ ] No secrets or destructive commands introduced (atelier has no write paths in v1)
- [ ] Error paths considered (`useReconstructionDossier` has fallback synthesizer; loading and error states render)
- [ ] Observability / logging considered (telemetry events for stage transitions, skip, replay, exit; specified in PT-902 follow-up)
- [ ] Rollback / revert path exists (atelier route is a separate path; can be unlinked from entry points without removing code)
- [ ] Docs / ADR updated or explicitly deferred (`docs/public-package/` updated per PT-902; design-gate proposals at `docs/design/atelier-*` per PT-001 to PT-003)
- [ ] UI visual work has before/after/target evidence or an explicit validation gap (PT-801)
- [ ] UI visual work passes the Do Not Downgrade gate before Product complete (PT-802)
- [ ] Execution report can reconcile every checklist item (the PT-NNN structure supports per-item status updates)

## Epistemic Ledger

| Primitive | Entry | Evidence | Confidence | Action |
|---|---|---|---|---|
| Claim | The reconstruction backend is far more mature than the spec assumes | Track 2 audit (`docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md`); the 3,325-line Rust crate with all four interfaces real | 0.95 | Build atelier UI in parallel with backend training; gate SHIP on real-data, gate BUILD on fixture |
| Claim | The atelier is a sibling of the existing atlas surface, not a refactor of it | compute_code communities analysis (modularity 0.605); the atelier route is parallel to `/open-flint-atlas/lost-flint/carriage-town` | 0.90 | Plan checklist organized around new files, not changes to existing ones |
| Claim | The visual-grammar-v1 ghost palette and the spec's atelier-darker register are different layers, not conflicting decisions | Visual-grammar-v1 §"Faithful geometry for history"; spec line 35 "deep paper tones, near-black where the rest of the atlas is paper-cream" | 0.80 | PT-001 design-gate surfaces this explicitly and produces a user-approved synthesis |
| Tension | The Lost Flint UI brainstorm decided "the expanded dynamic island IS the place page"; the atelier spec decides "the atelier earns its own surface" | `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` Track 1; `SPEC-THE-ATELIER.md` line 11 to 18 | 0.85 | Resolved: the two decisions govern different surfaces. Place page is in the island; atelier is its own takeover. Plan reflects this throughout |
| Tension | The atelier needs per-stage events; the backend engine does not emit them | `graphql-contract.md` Extension 6; Track 2 audit | 0.95 | Resolved: v1 ships against client-side deterministic synthesis from `ReconstructionDossier`; v1.x adds backend instrumentation as additive fidelity upgrade |
| Question | What is the exact warm-graphite token value for `--atelier-paper`? | Spec line 35 names "#26221c-ish" as an example; the design-gate refines | 0.70 | PT-001 produces 2+ candidate values and the user picks |
| Question | What is the icon for the dynamic island atelier entry chip? | Spec line 26 mentions "clock-overlay-on-building glyph or stippled building silhouette" | 0.60 | PT-503 + PT-001 design-gate proposes and user picks |
| Question | Should the atelier route's URL parameter use `civic_object_id` or `reconstruction_id`? | Both are valid; `civic_object_id` is more natural for the spec's "right-click on building" entry | 0.75 | PT-206 documents the mapping; if URL feels awkward in implementation, revisit |

## Explicit Non-Goals and Deferrals

The spec at lines 250 to 273 explicitly phases the work into v1, v2, and v3. This plan implements v1. The items below are DEFERRED BY THE SPEC ITSELF, not by this plan; they are listed for completeness so future sessions know they are anticipated, not forgotten.

| Item | Spec line | Why deferred (per spec) | Risk of deferral | Follow-up |
|---|---|---|---|---|
| Scrubbable time slider inside the atelier | 263 | Spec says "v2 feature; v1 ships static-year reconstructions only" (line 195) | Low; v1 atelier reaches one year at a time, which is sufficient for the demo moment | v2 plan |
| Multi-building reconstructions ("reconstruct this whole block in 1925") | 264 | Spec says v2 | Low; v1 building-at-a-time is the spec's recommended pacing | v2 plan |
| User-contributed sources (photo upload that becomes a source card) | 265 | Spec says v2 | Medium; this is the participatory hook the spec celebrates at lines 296 to 297; but v1 must ship without user-generated content paths | v2 plan; coordinate with backend contribution intake (existing `submitObservation` mutation pattern) |
| Conflict resolution proposals from the user | 266 | Spec says v2 | Low; v1 surfaces conflicts; user proposing resolution is the next layer | v2 plan |
| Export reconstruction as 3D model / image / short video | 267 | Spec says v2 | Low; v1 is screen-only | v2 plan; integrate with `scene_foundry` export |
| AR view (phone-at-real-location overlay) | 271 | Spec says v3 | Low; v3 is the long horizon | v3 plan |
| Community reconstruction sessions (multiple users contributing live) | 272 | Spec says v3 | Low | v3 plan |

Items NOT deferred (must ship in v1; listed here for clarity that they are NOT in the deferral table):

- All 8 animation stages (PT-302 to PT-309)
- All three entry points (PT-501 to PT-504)
- Per-source-type visual cards (PT-401)
- Conflict markers (PT-402)
- Per-part dossier (PT-404)
- Skip, replay, auto-play-1.5x (PT-310)
- Carriage Town pilot building end-to-end against real data (PT-602)

Items the SPEC implies are v1 but where the plan splits them into BUILD vs SHIP gates (with the user's explicit understanding):

- The Pairformer model being trained: the SHIP gate (PT-602) requires real backend resolver responses (which depend on the model being trained for fidelity in Stage 4); the BUILD gate (PT-601) does not. The spec at line 287 authorizes this split: "The atelier UI can be built and demoed against mock reconstructions while the model and corpus mature."
- Real `DecodedArtifact` rows in PostGIS for Carriage Town: same split as Pairformer above
- glTF assets for Carriage Town buildings (which would replace the procedural box rendering with Blender-generated meshes in Stage 6): the SHIP gate does NOT require this; procedural rendering is the existing path and is fully supported. glTF assets are an UPGRADE that lands silently when produced (since the `geometry_url` path already exists)

## Risk Register

The four explicit unknowns from the planning brief, each with current best-known mitigation:

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Pairformer untrained | Certain (today) | Stage 4 "PRIORS APPLIED" output is deterministic synthesis, not a real model run | v1 BUILD gate does not require trained model (spec line 287); v1.x backend track lands trained Pairformer and the choreographer reads real model output without code change to the frontend |
| Evidence corpus depth for Carriage Town | Certain (today: zero `DecodedArtifact` rows) | Source cards in production v1 represent fixture `source_ids` rather than backend-resolved evidence | `useReconstructionDossier` fallback synthesizer produces honest cards from fixture; the visible product is identical until backend lands; the spec at line 76 explicitly approves showing evidence scarcity directly when it exists |
| glTF per-part metadata pipeline | Likely incomplete v1 | Stage 6 "asset generation" cinematic moment uses procedural fill-in instead of glTF mesh swap-in | Procedural rendering is the existing production path; the cinematic moment works visually against procedural meshes. When glTF lands with per-part metadata, the `ScenegraphLayer` swaps in transparently |
| Atelier route choreography novelty | High (no precedent in the project) | The choreographer is the largest single piece of new frontend work; risk of timing mismatches, prefers-reduced-motion bugs, vestibular safety regressions | Design-gate (PT-002) with animation specialists required before any choreographer code; per-stage screenshot review during build (PT-302 to PT-309); a11y audit (PT-003) gates Stage Vision-complete |

Additional risks identified during planning:

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Visual register confusion between atelier-darker (chrome) and ghost-palette (material) | Medium | Reads as "different aesthetic" rather than "workshop entered" | PT-001 design-gate surfaces this tension explicitly; user approves the synthesis; PT-204 implementation keeps the two registers visibly distinct |
| The dynamic island already has 5 to 6 tabs; adding the atelier as a new tab would crowd it | Medium | Dynamic island over-stuffed; the chrome-minimal principle in visual-grammar-v1 violated | PT-503 design-gate decides between "new tab" vs "action inside Place tab" vs "search-bar-only entry"; final placement informed by visual-grammar-v1's "every pixel of chrome must earn its place" |
| Performance budget on mid-range laptops | Medium | Animation drops below 60fps; spec's cinematic ambition undermined | PT-204 budgets the R3F scene's draw calls and particle count; PT-308's quarter-orbit is bounded; preview-tool used to verify on M1 baseline |
| Backend resolver completion blocks SHIP gate | High | v1 cannot ship per spec line 281 without real Carriage Town data end-to-end | Backend track is parallel (Track 2 audit estimates 2-3 focused engineering sessions); frontend ships BUILD gate against fixture first to keep work parallelizable |

## Validation Gates

V1 is shipped when these all PASS:

- [ ] All 36 PT-NNN items in `Status: completed` (or explicitly `Status: deferred-by-spec` per the Non-Goals table)
- [ ] The Carriage Town pilot building (Whaley House) renders end-to-end against real backend resolver data; the SHIP gate (PT-602) passes
- [ ] All three entry points navigate to the correct atelier route
- [ ] Animation total duration is within spec's 6 to 8 seconds at 1.0x playback; subsequent reconstructions auto-play at 1.5x
- [ ] `prefers-reduced-motion` reduces total animation to ≤ 2 seconds with the per-stage narrative preserved
- [ ] Skip works from every stage; replay restarts; exit returns to atlas with the reconstructed building visible in the Lost Flint overlay
- [ ] WCAG 2.2 AA contrast verified on all atelier text against the `--atelier-paper` background
- [ ] Keyboard navigation: all interactive elements reachable; tab order is logical; focus indicators visible
- [ ] Mobile (390x844): atelier is usable; skip and exit are within thumb reach
- [ ] No console errors or warnings in any stage
- [ ] `npm run validate:atlas` passes
- [ ] `npm run validate:routes:live` passes for the atelier route
- [ ] No frontend-held service-tier credentials introduced (verified via dependency audit)
- [ ] Do Not Downgrade gate (PT-802) passes: atlas Lost Flint layer, dynamic island, existing Carriage Town route all equal-or-better
- [ ] Design-critic review confirms the atelier reaches the spec's "make people stop scrolling" bar (spec line 303)
- [ ] User explicit sign-off on the visual register and the animation choreography

The SHIP gate explicitly does NOT require:

- Pairformer trained weights (the SHIP gate accepts deterministic synthesis from fixture)
- Real `DecodedArtifact` rows beyond what the Carriage Town backend resolver returns
- glTF asset replacements for procedural meshes
- Sound design (v1 ships sound MUTED)
- v2 / v3 features

## Dependencies on Existing Systems

| Subsystem | What the atelier needs from it | Where it lives | Status |
|---|---|---|---|
| Lost Flint deck layer | Atelier exit transition leaves the reconstructed building visible in this overlay | `src/components/atlas/AtlasLostFlintDeckLayer.ts` | Works today |
| Reconstruction node tree | Atelier addresses per-part conflict markers and dossier sections by `nodeId` from this tree | `src/lib/atlas/reconstruction-node-tree.ts` | Works today; in-degree 0 (the atelier is the first consumer) |
| Atlas time module | Year input parsing for the search-bar entry point | `src/lib/atlas/atlas-time.ts` | Works today |
| Historical reconstruction fixture | Carriage Town v1 BUILD gate runs against this | `src/lib/atlas/historical-reconstruction.ts` lines 120 to 244 | Works today |
| ConfidenceMixMeshLayer shader | Atelier reuses this for the building material register inside the atelier surface | `src/components/atlas/AtlasLostFlintDeckLayer.ts` lines 164 to 276 | Works today; deck.gl-only |
| Pre-built roof geometries | Atelier reuses these | `src/components/atlas/LostFlintGeometries.ts` | Works today |
| `--ctx-paper*` token scale | Atelier extends this with `--atelier-paper` | `src/app/open-flint-atlas/atlas.css` lines 47 to 49 | Works today |
| Dynamic island chrome | Atelier entry points integrate with this | `src/components/atlas/AtlasDynamicIsland.tsx` | Works today; line 969 disabled action becomes the atelier entry |
| GraphQL urql client | Atelier consumes the new queries through this | `@urql/next` per `package.json` | Works today |
| Reconstruction-engine Rust interfaces | Backend resolvers read from these | `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs` | All four real (Track 2 audit §"#1") |
| Pairformer architecture | Backend Stage 4 inference uses this (untrained for v1 BUILD) | `civic_atlas_ingest/building_head_pairformer.py` | Built, untrained |

## Open Questions

Listed here only for items that searching the codebase and the design documents could not resolve. Each item is something the user must judge.

1. **`--atelier-paper` exact hex value.** Spec line 35 names "#26221c-ish" as an example; PT-001 design-gate produces at least 2 candidate values for the user to pick. Until PT-001 runs, the plan uses the spec example as a working stand-in.
2. **Atelier entry-point placement in the dynamic island.** Three options surfaced (per PT-503): new "Atelier" tab adjacent to "Ask", or action inside the existing "Place" tab (replacing the `BuildingDossier` disabled "Reconstruct historical view" button), or search-bar-affordance only. PT-001 design-gate decides; the plan currently assumes all three entry points are live for v1 (per spec lines 25 to 28).
3. **Atelier route URL parameter format.** Plan currently uses `[parcelId]/[year]` (civic_object_id + 4-digit year). Alternative: `[reconstructionId]` (historical:... slug). Plan picks parcelId for natural integration with the spec's "right-click on a lost building" entry; PT-206 documents the mapping. If implementation feels awkward, revisit.
4. **Exit transition target view.** Spec line 246 says exit returns user to "their previous map view" with the reconstructed building visible in the Lost Flint overlay. If the user arrived via the search-bar from a non-Lost-Flint atlas view (e.g., a 2050 scenario view), should exit return them to the original year or to 1925 (the atelier's year)? Plan defaults to "original year"; PT-406 may revisit.
5. **Source-card per-type identities for sources not in the canonical list.** The spec mentions Sanborn, photograph, directory, text mention. The fixture has `habs:mi-318` (HABS Record) and `genesee:stockton-genealogy` (genealogy directory). PT-401 must cover these; the GraphQL `EvidenceType` enum (graphql-contract.md Extension 2) extends to `HABS_RECORD`, `PLAT_MAP`, `CITY_DIRECTORY`, `OTHER`. v1 ships with 7 type identities; the user may approve more or fewer in PT-001 design-gate.
6. **The "save" button in Stage 7.** Spec line 169 says "Controls to replay the animation, exit the atelier, or save the reconstruction (in a future iteration, contribute corrections)." Save is v2 (spec line 266). Should the save button RENDER in v1 with a "v2" tooltip (the plan currently proposes this per PT-405), or should it be omitted entirely from v1 to avoid presenting a non-functional control? Project CLAUDE.md no-fake-UI rule applies. The plan currently leans toward render-disabled-with-honest-tooltip per the existing `DossierDisabledAction` pattern in `AtlasDynamicIsland.tsx`; the user may prefer omission.

## Execution Instructions

- **Start with checklist item:** PT-001 (design-gate proposal). NO visual code may be written before PT-001 is user-approved. This is binding per project CLAUDE.md and `~/.claude/skills/visual-work-design-gate/SKILL.md`.
- **After PT-001, PT-002, PT-003 approval**, proceed in this order:
  1. PT-101, PT-102, PT-103 (data layer)
  2. PT-201 (atelier CSS tokens)
  3. PT-202 (atelier route shell)
  4. PT-203, PT-204, PT-205 (surface components)
  5. PT-301 (choreographer state machine)
  6. PT-401, PT-402, PT-403, PT-404, PT-405 (visual components) in parallel
  7. PT-302 to PT-311 (per-stage animations + reduced-motion + skip/replay) in dependency order
  8. PT-406 (exit transition)
  9. PT-501, PT-502, PT-503, PT-504 (entry points) in parallel
  10. PT-601 (BUILD gate validation)
  11. PT-701, PT-702 (test scripts)
  12. PT-801, PT-802 (visual gates)
  13. PT-901, PT-902 (copy + docs)
  14. PT-602 (SHIP gate validation; depends on PT-104 backend completion)
- **Preserve these invariants:**
  - The atlas Lost Flint layer, dynamic island, and existing Carriage Town route remain at equal-or-better fidelity throughout
  - The visual-grammar-v1 ghost palette stays as the BUILDING material register
  - The Lost Flint UI brainstorm's prior approved decisions remain in force (60/90 thresholds, civic-language map, etc.)
  - No frontend-held service-tier credentials
  - No fake UI; honest empty states for evidence-poor parcels
  - No worktrees (work directly in main checkout per project CLAUDE.md)
  - No dashes (em or en) in any plan or code file
  - No time / effort estimates in plan files
- **Run these commands at key gates:**
  - After PT-101 / PT-102: `npm run codegen && npm run typecheck`
  - After PT-201: `npm run validate:visual-grammar`
  - After PT-202: `npm run validate:routes:live`
  - After PT-301: choreographer unit tests
  - After each PT-3xx animation stage: preview-tool snapshot at stage end + visual review
  - After PT-401: Storybook for each card type + UX writing review
  - Before each commit: `npm run typecheck && npm run lint && npm run validate:atlas`
  - At PT-801 / PT-802 / PT-602: design-critic review with full screenshot evidence
- **Report using the Execute-Theorem Report format.** The execution report must reconcile every PT-NNN item: status, evidence, deviations from plan, follow-ups.

End of implementation plan.
