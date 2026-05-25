# The Atelier: Planning Artifact Index

Generated 2026-05-23. This directory holds the v1 planning artifact for the Atelier feature in Open Flint Atlas, per `SPEC-THE-ATELIER.md` (304-line spec attached to the planning task).

## Spec context

The Atelier is the surface in the Civic Atlas where the procedural reconstruction engine's eight stages become visible, cinematic, and clickable. Per the spec at line 7: "The Ask tab is research. The Place tab is dossier. The atelier is the workshop where the reconstruction engine's eight stages become visible, cinematic, and clickable." Per the spec's closing note at line 303: "The atelier should make people stop scrolling."

The user authorized this work with: "I think this is one of the most exciting features we have ever worked on, especially as far as visuals go, so let's give it a go."

## Files in this plan

| File | Purpose | Deliverable from planning-theorem brief |
|---|---|---|
| `README.md` (this file) | Index plus design-gate compliance trace | Deliverable D + entry point |
| `codebase-inventory.md` | What exists in the codebase for each of the four spec prerequisites | Deliverable A |
| `graphql-contract.md` | GraphQL schema extensions the Atelier needs | Deliverable B |
| `animation-choreography.md` | The 8-stage animation in detail with timing, easings, prefers-reduced-motion | Deliverable E |
| `implementation-plan.md` | The PT-NNN checklist with UI Visual Milestone, risk register, deferrals, validation gates, dependencies, open questions | Deliverables C, F, G, H, I, J |

Read in this order:

1. **First:** `codebase-inventory.md` to understand the substantial existing infrastructure. The most common planning failure mode this artifact prevents is "proposing to build what already exists." The reconstruction backend is far more mature than the spec assumes; many of the spec's prerequisites are already met.
2. **Second:** `graphql-contract.md` for the data layer extensions.
3. **Third:** `animation-choreography.md` for the 8-stage animation specifics.
4. **Fourth:** `implementation-plan.md` for the full PT-NNN checklist and execution sequence.

## Key planning decisions (cross-file)

These decisions are sourced from the spec + the existing project planning corpus (Lost Flint UI brainstorm, visual-grammar-v1, Track 2 audit) and apply across all files in this plan. They are documented here so the executing session does not have to re-derive them.

1. **BUILD vs SHIP gates are different.** v1 BUILD = atelier surface working against the existing `FLINT_LOST_RECONSTRUCTIONS` fixture (the 5 Carriage Town buildings with real per-part confidences and real source IDs). v1 SHIP = the same surface working against real backend resolver data end-to-end. The spec at line 287 authorizes this split: "These four can move independently. The atelier UI can be built and demoed against mock reconstructions while the model and corpus mature."
2. **The atelier is a sibling, not a refactor.** The compute_code communities analysis (modularity 0.605) confirms the atlas community is one big tightly-coupled cluster. The atelier slots in as another node, consuming existing primitives (`HistoricalReconstruction`, `ReconstructionNodeTree`, `ConfidenceMixMeshLayer`, projection math, R3F + deck.gl runtime). It does not break existing patterns.
3. **The Lost Flint UI brainstorm's prior decisions are inherited.** Confidence thresholds 60/90, year deep-link `?year=N` with 250ms debounce, R3F overlay landmark-only (procedural stays on deck.gl), porcelain fraction `0.05 + (1 - confidence) * 0.90`, stacked-row part layout, civic-language map for node-tree terms, pending-corrections badge zero-hidden. These are NOT re-litigated in this plan.
4. **The atelier surface is a NEW DECISION not in the Lost Flint UI brainstorm.** The brainstorm decided "the expanded dynamic island IS the place page" (Track 1 option 1a). The atelier spec decides "the atelier earns its own surface" (line 11). These are NOT in conflict; they govern different surfaces. The place page (in the island) shows place metadata; the atelier shows the reconstruction-as-it-happens. The atelier is entered FROM the place page (via the `DossierDisabledAction` "Reconstruct historical view" button at `AtlasDynamicIsland.tsx` line 969 made real).
5. **The visual register decision has a designed-in tension.** The atelier spec proposes a darker surface register (warm graphite paper near-black). The existing visual-grammar-v1 locks the ghost palette as cool teal porcelain for historical building MATERIAL. The synthesis: the atelier's darker register is for the SURFACE (background, paper grid, chrome) while the building MATERIAL stays porcelain. Two registers, two layers, not one over the other. This tension is surfaced explicitly to the design-gate at PT-001 for user-approved synthesis.
6. **All service-tier auth lives server-side.** Per project CLAUDE.md, the Civic Atlas frontend talks to one boundary only: GraphQL. No frontend-held Theseus tokens, no Next.js Route Handlers with credentials. The Atelier follows the canonical `civicResearch` mutation pattern: Theseus harness → gRPC → Axum resolver → GraphQL → urql.

## Design-Gate Compliance Trace

Per project CLAUDE.md (## Visual Design & CSS, ## No Fake UI, ## Service-Tier Auth) and `~/.claude/skills/visual-work-design-gate/SKILL.md`, design specialists must run BEFORE any visual code is written for a new visual surface or rebuild. The Atelier is a NEW SURFACE; the gate is binding.

This section documents:

- What was done at PLANNING TIME (the artifact in this directory)
- What MUST be done at IMPLEMENTATION TIME (before any `.tsx` / `.css` / `.glsl` / shader / canvas / R3F / motion-design code is committed)

### PT-001 design-gate APPROVED 2026-05-23

The user approved the atelier visual register at `docs/design/atelier-visual-register-proposal.md`. Locked decisions:

| # | Decision | Locked value |
|---|---|---|
| 1 | `--atelier-paper` hex | `#26221c` (spec line 35 literal) |
| 2 | Paper grid style | Vellum warm-cream lines on graphite (spec line 41) |
| 3 | Source card per-type identities | All 7 ship per the proposal table (Sanborn amber+sepia, Photograph chamfered frame, Directory typewritten, Text Mention italic slip, HABS gov-blue, Plat Map line-drawing, Other neutral) |
| 4 | Dynamic island atelier icon | C tracing-paper-over-building (custom SVG; spec did not pick) |
| 5 | Surface layout | Approved as proposed (building left-of-center, dossier 380px right, source cards at geographic-provenance positions, top chrome with Skip / Exit, dossier with Replay / **real Save**) |
| 6 | Save button v1 | **Build with real backend wiring** (NOT disabled, NOT deferred). Smallest viable: `submitObservation`-style mutation, anonymous-with-optional-email receipt, share URL bookmark-able. v2 adds user-edited corrections per spec line 169 parenthetical |
| 7 | Atlas underlayer veil | Approved: opacity 0.12 + 1.5s blur ramp on atelier-mount |
| 8 | Stage 0 dust motes | Approved as proposed (removed under reduced-motion) |

The save-scope expansion adds: `graphql-contract.md` Extension 7 (saveReconstruction mutation, SavedReconstruction type, savedReconstruction query); `implementation-plan.md` PT-103b (frontend save hook), PT-103c (frontend saved-recall hook), PT-104b (backend mutation, blocked-by-backend), PT-405b (saved-reconstruction route); `implementation-plan.md` PT-405 revised to wire the Save button to the real mutation.

### Binding implementation note APPROVED 2026-05-23

The user emphasized: "It's good that you're drawing from existing components rather than hand rolling. Be sure to customize them for the task."

Captured as binding discipline for every visual component checklist item:

- **START from the 7 Theseus Design Components primitives** named in `atelier-visual-register-proposal.md` §"Theseus Design Components inherited" (Bento cards layout, Dynamic Island TOC, Dotted animation surface, Glowing Shadow, Tilt card, Moving border, Marketing hero)
- **CUSTOMIZE them for atelier-specific requirements** (warm graphite surface, paper grid context, per-source-type identities, terracotta provenance language, drone-shot camera framing, conflict marker placement, dossier per-part rows)
- Do NOT ship primitives as-is (they were authored for a different design domain)
- Do NOT rebuild from scratch (the curated primitives are the project's authored visual vocabulary)
- Each implementation PT item explicitly cites which primitive it starts from and where it diverges

### Planning-time consultation (this session)

| Specialist / source | What it produced | What got incorporated |
|---|---|---|
| `SPEC-THE-ATELIER.md` (304 lines, attached) | The spec itself: visual register prescription (darker paper, paper grid, terracotta provenance, drone-shot camera, source-card per-type visual identity), 8-stage animation prescription, dossier panel example, exit prescription, v1/v2/v3 scope | The spec IS the floor of the plan; every plan deliverable backreferences its spec line range |
| `~/.claude/skills/visual-work-design-gate/SKILL.md` (forcing function) | The mandatory-gate rule: brainstorming + impeccable + design-theory + Theseus/Design Components/ scan BEFORE any visual code | Plan checklist items PT-001, PT-002, PT-003 codify the gate; no implementation work is authorized before user-approved design proposals |
| `docs/design/visual-grammar-v1.md` (377 lines) | The locked ghost palette, the locked jargon ban, the dynamic-island-is-universal-chrome principle, the locked confidence encoding (60/90), the reduced-motion fallback principle | All plan items honor these locks; the atelier extends but does not override |
| `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` (366 lines) | Prior approved decisions from a prior `superpowers:brainstorming` session (Track 1 through Track 6): year deep-link, porcelain fraction formula, stacked-row part layout, civic-language map, pending-corrections badge zero-hidden | All inherited without re-deciding; the atelier's NEW surface decision is documented as additive, not conflicting |
| `docs/design/reconstruction-node-tree-adapter.md` (76 lines) | The Pascal-node-tree decision and the per-part addressing primitive | The atelier's conflict markers and dossier section dispatch address parts via the tree's stable nodeId strings |
| `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md` (220 lines) | Yesterday's audit of the reconstruction backend: all four interfaces real, Pairformer architecture complete (weights untrained), Sanborn ingest 30% complete, zero `DecodedArtifact` rows today | The plan's BUILD/SHIP gate split reflects this honestly; the spec's "These four can move independently" at line 287 is operationalized |
| compute_code MCP (RustyRed inline PPR, PageRank, Communities) | Structural code-search analysis: PPR seeded at the reconstruction surface ranked the 8 most-relevant files; PageRank surfaced the load-bearing trinity (`openFlintAtlas.ts`, `contracts.ts`, `dossier-payload.ts`); Communities found the atlas cluster with modularity 0.605 | The plan's "atelier as sibling, not refactor" claim is grounded in the communities result; the plan's "reconstruction primitives already exist" claim is grounded in the PPR result |

### Implementation-time consultation (REQUIRED before any code is committed)

Per the planning-theorem skill's UI Visual Project Gates reference and the project's design-gate skill, the following specialists MUST run before any visual code is committed. Each consultation produces a design proposal artifact that the user approves explicitly. The plan codifies these as checklist items PT-001, PT-002, PT-003.

| Specialist | When required | What it produces | User approval required? |
|---|---|---|---|
| `superpowers:brainstorming` | PT-001 (before any visual code) | Widened design space on the atelier's visual register: 2 to 3 candidate directions for the darker paper tone, the paper grid styling, the chrome integration | Yes (the user picks a direction) |
| `anthropic-skills:impeccable` (Impeccable shape) | PT-001 | Craft layer: anti-AI-slop discipline, ensuring the atelier feels like a workshop entered, not a tab selected; first-order and second-order slop tests | Yes (the user confirms the craft bar) |
| `ui-design-pro:design-theory` | PT-001 (mandatory for any new layout per the skill's own description) | Spatial composition: layout architecture (source cards on periphery, building at center, dossier on right, controls on bottom), camera composition for drone-shot aesthetic, visual hierarchy | Yes (the user approves the layout) |
| `anthropic-skills:design-pro` | PT-001 (after the synthesis pass) | Final design proposal at `docs/design/atelier-visual-register-proposal.md` synthesizing brainstorming + impeccable + design-theory | Yes (the user approves the synthesis) |
| Scan of `Theseus/Design Components/` (43 curated components) | PT-001 | Pre-curated visual primitives the atelier should start from (e.g., Bento cards layout, Dynamic Island TOC, Tilt card, Glowing shadow). New components must feel continuous with what is already curated, not introduce a parallel visual language | Implicit; informs PT-001 synthesis |
| `anthropic-skills:animation-design` | PT-002 (before any choreographer code) | Per-stage animation proposal: timing tuning, easing curve confirmation, sub-event ordering, sound-design queue | Yes (the user approves the animation contract) |
| `animation-pro:scene-animator` | PT-002 | R3F-specific choreography for the building meshes and conflict markers | Yes (the user approves) |
| `animation-pro:camera-choreographer` | PT-002 | Camera rig design for the Stage 6 quarter-orbit + the Stage 0 top-down entry | Yes (the user approves) |
| `animation-pro:a11y-motion-auditor` | PT-002 + PT-003 | Vestibular safety audit: pulse rings, camera orbit, flickering ambiguity indicators; prefers-reduced-motion path verified | Yes (the audit gates the merge) |
| `ui-design-pro:a11y-auditor` | PT-003 | WCAG 2.2 AA contrast audit on `--atelier-paper` background; keyboard navigation; screen-reader announcements | Yes (the audit gates the merge) |
| `ux-pro:Accessibility Auditor` | PT-003 | Complementary a11y audit covering ARIA patterns and focus management | Yes |
| `ux-pro:UX Writer` | PT-901 (continuous through visual components) | UX copy for surface labels, source-card summaries, conflict popovers, controls, exit; jargon-ban verification | Yes (the user approves copy) |
| `ui-design-pro:design-critic` | PT-801, PT-802 (after implementation, before SHIP) | Do Not Downgrade gate review: side-by-side before/after of atlas Lost Flint layer, dynamic island, existing Carriage Town route; "make people stop scrolling" critique against the spec's tone | Yes (the critic's findings gate SHIP) |

### What the plan does NOT pre-empt

The plan documents the spec's prescriptions (which the user authored or approved) but does NOT invent visual decisions that should come from design specialists. Specifically:

- The exact hex value for `--atelier-paper` (spec line 35 names "#26221c-ish" as an example; PT-001 produces 2+ candidates)
- The atelier dynamic island entry-point icon shape (spec line 26 mentions options; PT-503 + PT-001 finalize)
- The exact source-card visual identities (spec lines 36 to 38 prescribe the direction; PT-401 + PT-001 finalize component-by-component)
- The atelier route's URL parameter format (spec line 285 prescribes the format; PT-206 documents the mapping; if implementation feels awkward, revisit)
- The save-button rendering decision in Stage 7 (render-disabled-with-tooltip vs omit entirely; the user picks)

These are explicitly listed in the implementation plan's "Open Questions" section.

## Quick links for the executing session

- Spec: `SPEC-THE-ATELIER.md` (attached to the user's planning prompt)
- This plan: `docs/plans/the-atelier/` (this directory)
- Existing reconstruction primitives: `src/lib/atlas/historical-reconstruction.ts`, `src/lib/atlas/reconstruction-node-tree.ts`, `src/components/atlas/AtlasLostFlintDeckLayer.ts`
- Existing GraphQL contract: `docs/design/flint-graphql-schema-v1.graphql`
- Visual register source of truth: `docs/design/visual-grammar-v1.md`
- Prior approved decisions: `docs/design/lost-flint-ui-brainstorm-2026-05-21.md`
- Backend status: `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md`
- Backend repo (where resolvers and the Rust engine live): `our-civic-atlas-backend/` (sibling repo)
- Carriage Town pilot route: `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx`
- Dynamic island (where the atelier entry chip and "Reconstruct historical view" button live): `src/components/atlas/AtlasDynamicIsland.tsx`

## Ready to execute

This plan is ready for `/production-theorem:execute` (or equivalent execution workflow). The first checklist item is PT-001 (design-gate proposal). NO visual code may be written until PT-001 is user-approved.

If the user wants to iterate on the plan itself before execution, areas to consider:

- The BUILD vs SHIP gate split (currently: BUILD against fixture, SHIP against real backend; the spec's line 287 authorizes this but the user may prefer a single shipped gate)
- The save-button v1 rendering decision (open question #6)
- The atelier entry-point placement in the dynamic island (open question #2)
- The atelier route URL parameter format (open question #3)

All other planning decisions are sourced from the spec or the existing project planning corpus; the user has already authored or approved them.

## Execution status (post v1 BUILD pass + overnight gap-close)

Updated 2026-05-24 after the v1 BUILD pass and the autonomous overnight
gap-close pass that landed PT-504, Stage 4 pulse rings, PT-701 smoke,
and PT-801 visual evidence scaffold.

| Item | Status | Notes |
|---|---|---|
| PT-001 design-gate proposal | Complete (approved) | `docs/design/atelier-visual-register-proposal.md` |
| PT-002 animation specialist proposal | Complete | `docs/design/atelier-animation-proposal.md` |
| PT-101/102 GraphQL schema + queries + codegen | Complete | Extensions 1-5, 7 in schema; codegen + typecheck green |
| PT-103, 103b, 103c hooks | Complete | `useReconstructionDossier`, `useReconstructionSave`, `useSavedReconstruction` |
| PT-104, 104b backend resolvers | PT-104 partial bridge landed 2026-05-24; PT-104b blocked | `our-civic-atlas-backend/apps/graphql-server` now exposes the Atelier read fields through the Rust `ReconstructionService` gRPC boundary. It can return backend `ReconstructionSpec` rows instead of forcing the frontend fixture fallback when the backend is running. Still needs live backend smoke, richer attached source provenance, and real save persistence (`saveReconstruction` / `savedReconstruction`). |
| PT-201 atelier CSS tokens | Complete | `src/app/open-flint-atlas/atelier/atelier.css` |
| PT-202/203 atelier route + surface | Complete | `/open-flint-atlas/atelier/[parcelId]/[year]` |
| PT-204 R3F scene | Complete | Shared geometry via `lumaGeometryToBufferGeometry` adapter; LostFlintGeometries flat-cube bug fixed |
| PT-205 dust motes | Complete | `AtelierDustMotes` R3F point particles, reduced-motion safe |
| PT-301 choreographer state machine + 311 reduced-motion | Complete | `atelier-choreographer.ts` + `useAtelierChoreographer` |
| PT-302-309 per-stage visuals | Mostly complete | Cards arrival (Stage 1), provenance lines draw (Stage 2), Stage 4 pulse rings (`46b251f`), camera orbit (Stage 6), settled label transition (Stage 7) all ship. Only Stage 6 ornament emergence remains deferred to v1.x (needs backend per-part geometry segments per `atelier-animation-proposal.md`) |
| PT-310 skip/replay/auto-1.5x | Complete | `sessionStorage` flag + skip/replay APIs |
| PT-401 source cards | Complete (revised 2026-05-24) | Unified archival card style after live review; source type remains metadata, not separate card styling |
| PT-402 conflict markers | Complete (zero conflicts in fixture; component renders zero, lights up when backend ships real conflicts) | `AtelierConflictMarkers` R3F-Html anchored |
| PT-403 provenance lines | Complete | SVG with stroke-dashoffset, stage-gated |
| PT-404 dossier polish | Complete | Honest empty states; per-part "Cited by" footers |
| PT-405 controls + Save real wire | Complete | Skip/Replay/Save/Exit; Save errors honestly when backend pending |
| PT-405b saved-reconstruction route | Complete | `/open-flint-atlas/atelier/saved/[savedId]` |
| PT-406 exit transition | Complete | 500ms opacity fade before navigation |
| PT-501 BuildingDossier entry | Complete | "Reconstruct in Atelier" link appears when selected building within ~150m of a reconstruction |
| PT-502 search-bar temporal-query affordance | Complete | Dropdown lists reconstructions visible at typed year |
| PT-503 atelier nav link | Complete | Top-strip header link (variant of spec's "dynamic island icon") |
| PT-504 right-click on lost building | Complete (`d0bd134`) | Native `contextmenu` (desktop) + long-press (touch, 600ms with 8px move tolerance) bound on `.atlas-scene-map`. `MapboxOverlay` ref lifted via new `onReady` prop on `DeckGLOverlay` so the handler can call `pickObject` against the picking buffer. Empty-area right-click still falls through to browser default. Year resolution shared with PT-501 via `resolveAtelierEntryYear` in `atelier-route.ts`. |
| PT-601 Carriage Town BUILD gate | Complete | All 5 fixture reconstructions render end-to-end via direct URL |
| PT-602 Carriage Town SHIP gate | Partially unblocked; not passed | Read-path GraphQL bridge exists in `our-civic-atlas-backend`, but SHIP still requires live Carriage Town backend smoke against all 5 specs, attached source/evidence rows sufficient for the animation, and save persistence or an explicit product deferral. |
| PT-701 Playwright smoke | Complete (`61974eb`) | Two of five Carriage Town fixture routes (`building:carriage-town:1` at 1885, `building:carriage-town:3` at 1925) added to `scripts/smoke-open-flint-routes.mjs`. Smoke is a `fetch()`-based SSR-metadata assertion (no actual Playwright in this repo yet). 29/29 checks pass against live dev server. |
| PT-702 validate scripts | Deferred | Atelier inherits existing validators |
| PT-801 visual evidence capture | Scaffolded (`9f20a59`) | `docs/visual-evidence/atelier/2026-05-24-overnight-pass/README.md` documents what was verified live this pass + the manual capture procedure + the Playwright path the next session can authorize. Live screenshots in conversation log show full atelier end-to-end with Whaley House porcelain mass, HABS + Sanborn cards, terracotta provenance lines, dossier panel, Replay + Save controls. Stage 4 mid-pulse still capture deferred (needs foreground browser with full RAF). |
| PT-802 Do Not Downgrade gate | Pending review | Manual side-by-side of atlas/island/Carriage Town routes |
| PT-901 UX copy | Mostly complete (inline) | Final UX-writer pass on save confirmation copy + skip button label is a follow-up |
| PT-902 docs/public-package | Deferred | Add atelier description + screenshot |

## End-of-pass summary

After the overnight gap-close: v1 BUILD gate fully met against the
`FLINT_LOST_RECONSTRUCTIONS` fixture. All three spec-line-23-28 entry
points now wired (dynamic island nav, search-bar temporal-query
affordance, right-click / long-press). Stage 4 pulse rings ship per
spec lines 106-110. Smoke covers the atelier route in CI. A 2026-05-24
backend sidecar pass partially unblocked PT-104 by adding the missing
Atelier GraphQL read fields and mapping them to the Rust
`ReconstructionService` gRPC boundary; PT-602 still has not passed
because the live backend needs smoke coverage, attached source/evidence
rows, and save persistence.

What landed beyond the original plan:

- A latent bug in `LostFlintGeometries.createFlatBoxGeometry` (returned `[-1,+1]` CubeGeometry while gable/hipped used `[-0.5,+0.5]`) was discovered while writing the luma→three adapter. Fixed at root in `LostFlintGeometries`; both deck.gl Lost Flint render and atelier R3F render now use unified coordinate convention. Single source of truth for building geometry.
- Year-resolution rule for atelier entry (`atlasYear ?? parse(time_start) ?? 1925`) extracted from PT-501's inline logic into `resolveAtelierEntryYear` in `atelier-route.ts` so PT-501 and PT-504 share one rule. Behavior unchanged.

Remaining for the next session to authorize:

- Backend source/evidence richness for the read bridge. The sidecar can now
  read `ReconstructionSpec`; the current seed specs may still have empty
  per-part `sources`, so cards can disappear when the backend path is active
  unless Phase 5 ingestion or seed provenance attaches source records.
- Sound design (Stage 1 paper rustle, Stage 2 thrum, Stage 6 tone; spec lines 74/94/161; "optional" per spec, accessibility-conscious mute default required)
- Stage 6 ornament emergence (needs backend per-part geometry segments + ornament metadata in GraphQL contract)
- PT-802 Do Not Downgrade design-critic review pass
- PT-902 docs/public-package marketing copy + screenshot
- Playwright opt-in to enable automated Stage 4 mid-pulse capture for PT-801

End of README.
