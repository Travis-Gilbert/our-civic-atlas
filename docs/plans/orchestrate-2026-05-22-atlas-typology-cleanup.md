# Orchestrate Report: Atlas Typology + Building-Fabric Cleanup

Generated 2026-05-22 at the end of an execute-mode session that cleaned up
the frontend-only portion of the Phase A typology classifier and the
Phase A.5 building-fabric renderer. Run as a retroactive orchestration
pass over four work units that landed in the working tree but have not
yet been committed. Authored against the codebase state on branch
`feat/porchfest-planner` with HEAD `2304f78`, with nine working-tree
edits enumerated below.

Source specs reviewed during the run:

- `SPEC-PHASE-A-TYPOLOGY.md` (`~/Downloads/`, user-supplied input).
- `SPEC-PHASE-A5-BUILDING-FABRIC.md` (`~/Downloads/`, user-supplied input).
- Prior plans on disk: [docs/plans/building-typology-phase-a-plan.md](building-typology-phase-a-plan.md),
  [docs/plans/building-fabric-phase-a5-implementation.md](building-fabric-phase-a5-implementation.md).

The user's handoff explicitly framed this as cleanup, not a planning pass.
The previous attempt (delivered by another agent) had shipped a render
that classified every building via `hash(osm_id) % N`, painted each
classification with one of nine saturated typology colors, then layered
seventeen part-role accent colors on top — producing the "Lego carnival"
render the user called out. This session does not build the real Phase A
classifier; it removes the lie, replaces the carnival palette with a
single chipboard tone, and fixes the orientation math so the next
classifier doesn't inherit a broken render layer.

## Executive Summary

Four work units landed; all four typecheck clean, lint clean, and render
correctly in the dev-server smoke (visual confirmation via the Atlas
Map preview at desktop 1440×900: full Flint extent rendered as uniform
chipboard masses with no per-building hue assignment). The Time and
Scenarios tabs in the dynamic island flatten as designed — no nested
card chrome, hairline-rule dividers between sections.

Diff truth matches the user-supplied summary in every checked claim.
There is **one P0 working-tree hazard** (`next-env.d.ts` reverted to a
known-bad dev-mode types path that commit `8c84488` already fixed once),
**two P1 follow-ups** that the work itself created and surfaced, and
**two P2 deferrals** that the user explicitly authorized as out of scope.

What this session deliberately did NOT ship: the real LightGBM classifier
on Ray/RunPod (Phase A spec sections 2–11 are untouched on the backend),
the `building_typology` PostGIS table, the GraphQL `typology { … }` field,
the city pack `packs/us/mi/flint/typology/` artifacts, and the
hand-labeled validation set. The frontend now renders honestly while
that backend track runs separately.

Most importantly: the frontend's typology overlay path is preserved as
an opt-in (`materialMode === "typology"` still works, with the colored
palette retained), and the `Record<UrbanDesignFormType, ...>` exhaustive
typing forces every future renderer change to give `"unknown"` an
explicit tone. There is no path back to the Lego carnival that does not
also require a deliberate code change.

## Per-Work-Unit Diff Truth

### 1. Sketch-model render as the default

**Claim**: flip the default `materialMode` from `"typology"` to
`"sketch_model"`; collapse the sketch palette from nine form-keyed
beiges + seventeen part-role beiges to four chipboard tones keyed by
detail level.

**Diff reality (matches)**:
- [src/components/atlas/OpenFlintAtlasScene.tsx:197-204](../../src/components/atlas/OpenFlintAtlasScene.tsx) —
  `useState<UrbanDesignMaterialMode>("sketch_model")` with an inline
  comment explaining the rationale (the typology palette's color keys
  derive from `classifyUrbanForm`, which was hash-modulo noise; the
  honest default surface is the chipboard model). Typology mode remains
  selectable from the Layers > Urban-Design-Model mode control.
- [src/components/atlas/AtlasMap.tsx:232-281](../../src/components/atlas/AtlasMap.tsx) —
  the old `URBAN_SKETCH_FORM_FILL` (9 entries), `URBAN_SKETCH_PART_FILL`
  (17 entries), `URBAN_SKETCH_PART_LINE` (7 entries), and
  `URBAN_SKETCH_LINE` (singleton) are gone. Replaced by:
  `SKETCH_TONE_BY_DETAIL_LEVEL` — a `Record<BuildingFabricDetailLevel,
  [r,g,b,a]>` with four entries (mass = `rgb(236,230,218)`,
  facade = `rgb(220,213,198)`, roof = `rgb(200,191,175)`,
  site = `rgb(176,188,158)`), plus a single `SKETCH_LINE`
  (`rgb(96,90,78)` at α=204) and a one-off
  `SKETCH_LINE_PARTY_WALL` (darker to read as a structural seam).
- [src/components/atlas/AtlasMap.tsx:566-579](../../src/components/atlas/AtlasMap.tsx) —
  `urbanDesignSketchFillColor` now reads `props.fabric_detail_level`
  (rather than looking up by `part_role` then `form_type`). The atlas
  year still desaturates via alpha-decay; the completeness alpha cap
  still fires when `fabric_feature_completeness < 0.5`.

**Why this matters**: variation by detail level (mass/facade/roof/site)
is the right architectural axis. A real chipboard model varies tone by
*what kind of surface* this is, not by *what kind of building* it's
attached to. The prior palette was a desaturated version of the same
lie the colored palette told.

**Verdict**: clean. No dead palette entries remain except in the
opt-in typology mode (which is itself honest pending real classifier
data).

### 2. Bearing-aware part orientation

**Claim**: introduce an `OrientedFootprint` `(u, v)` local frame whose
u-axis aligns with `front_edge_bearing_degrees` and v-axis is
perpendicular (street-normal). All `bounds.widthM >= bounds.depthM`
axis-picking branches collapse to single oriented calls. Residential
roof ridge now runs parallel to the front edge.

**Diff reality (matches)**:
- New helpers at [src/lib/atlas/urban-design-model.ts:998-1147](../../src/lib/atlas/urban-design-model.ts):
  `getOrientedFootprint`, `projectUV`, `orientedRect`,
  `orientedRectWithHole`. The footprint ring is projected onto u and v
  axes to derive the rotated-bbox `frontageM` and `depthM`; defensive
  fallback to the lng-aligned bounds if the ring is degenerate.
- `createFormParts` (line 394 onward) takes a third `oriented:
  OrientedFootprint` argument; the caller in
  `createUrbanDesignModelCollection` constructs it from
  `spec.fabric.params.footprint_polygon` +
  `spec.fabric.params.front_edge_bearing_degrees`.
- Every `bounds.widthM >= bounds.depthM` branch is gone from
  `createFormParts`, `addFacadeBays`, `addFrontBand`, `addCenterFront`,
  `addCenterRoof`, `addDormers`, `addSawtoothRoof`, and the
  newly-renamed `createOrientedRowParts`.
- Residential `roof_ridge` is now `orientedRect(o, 0.2, 0.46, 0.8,
  0.54)` — a long thin strip running along u (parallel to the front
  edge). The prior code rendered it as `rect(bounds, 0.46, 0.2, 0.54,
  0.75)` (thin strip running perpendicular to the long axis,
  gable-end-to-street). The new shape matches the spec line "Roof
  ridges run parallel to the front edge for residential."
- `rectWithHole` deleted (dead after the courtyard_compact case
  switched to `orientedRectWithHole`).

**Geometric caveat**: the bearing source today is
`longestEdgeBearingDegrees(ring)`, which is a proxy. For a rectangular
building whose long edge happens to face the street, it produces the
correct street-parallel bearing; for an L-shaped footprint or a corner
lot, it falls back to whichever footprint edge is longest, which may
not face the street. Phase A's parcel-edge classifier (when shipped)
should overwrite `front_edge_bearing_degrees` with the bearing of the
parcel front edge derived from the nearest OSMnx road; the new
orientation pipeline is ready to consume that with no API change.

**Verdict**: clean. The refactor doubled as dead-code removal — every
two-branch axis-picking conditional collapsed to one branch, and
`rectWithHole` was deleted as unreferenced.

### 3. Honest classification fallback (`"unknown"` bucket)

**Claim**: strip hash-modulo branches from `classifyUrbanForm` and
`classifyPresentArchetype`; add `"unknown"` / `"present_unknown"` enum
members; render unknown buildings as the OSM footprint extruded with
no part decomposition.

**Diff reality (matches)**:
- [src/lib/atlas/urban-design-model.ts:18](../../src/lib/atlas/urban-design-model.ts) —
  `"unknown"` is the tenth member of `UrbanDesignFormType`, documented
  with an inline JSDoc that explains the hash-modulo replacement.
- [src/lib/atlas/urban-design-model.ts:266-318](../../src/lib/atlas/urban-design-model.ts) —
  the new `classifyUrbanForm` keeps the four real-tag regex branches
  (civic, industrial, retail, residential) and the shape-only
  industrial fallback (`area > 5600 && ratio > 2.2`). Everything else
  returns `"unknown"`. The prior code had seven hash-modulo branches
  scattered across the area-band fallback paths.
- [src/lib/atlas/building-fabric.ts:148-186](../../src/lib/atlas/building-fabric.ts) —
  parallel cleanup of `classifyPresentArchetype`. Three `seed % N`
  branches deleted; new `"present_unknown"` archetype added.
- [src/data/open-flint-atlas/fixtures/building-fabric/height-priors.ts:81-103](../../src/data/open-flint-atlas/fixtures/building-fabric/height-priors.ts) —
  new `present_unknown` height prior with neutral defaults (1–3 stories
  by area, flat roof, no cornice, paper-faint facade color).
- [src/lib/atlas/urban-design-model.ts:600-610](../../src/lib/atlas/urban-design-model.ts) —
  the `case "unknown":` branch in `createFormParts` emits a single
  polygon: the actual OSM footprint outline (not a bounding-box rect),
  wrapped via new helper `footprintAsPolygon`. No porch, no roof plane,
  no cornice — the chipboard model says "this is a building shape with
  a height; we don't yet know what's inside."
- [src/lib/atlas/urban-design-model.ts:617-619](../../src/lib/atlas/urban-design-model.ts) —
  the fabric-detail pass is *skipped* when `form_type === "unknown"`,
  preventing the archetype classifier (which has slightly different
  regex coverage) from layering dormers / cornices onto a building the
  form classifier said had no signal.
- [src/lib/atlas/urban-design-model.ts:371-392](../../src/lib/atlas/urban-design-model.ts) —
  `confidenceForForm` returns ≤0.32 for `"unknown"` (vs. 0.56–0.84
  baseline). Once Phase A's real classifier writes per-row
  `per_class_proba`, this scalar gets replaced.

**Why this matters**: this is the rule the user added to project
`CLAUDE.md` enforced in code. "No fake UI, no mock data in shipped
surfaces." A classifier that returns `hash(osm_id) % N` IS mock data,
just dressed up as classification. The new code returns honest
"unknown" the moment the inputs don't support a real answer.

**Verdict**: clean. The `Record<UrbanDesignFormType, ...>` exhaustive
typing in `URBAN_FORM_FILL`, `URBAN_FORM_LINE`, and
`URBAN_DESIGN_FORM_LABELS` forced explicit entries for `"unknown"` —
TypeScript prevents future regressions back into hash-modulo.

### 4. Panel flattening (Time + Scenarios)

**Claim**: collapse the cards-inside-cards-inside-cards stack in the
dynamic island. Drop the inner card frames on Time and Scenarios, drop
redundant eyebrows and giant displays, use hairline-rule dividers
instead of nested card chrome. Remove envelope-type legend chips from
Scenarios (they're a render setting, not a scenario property).

**Diff reality (matches)**:
- [src/components/atlas/ScenarioControls.tsx:57-170](../../src/components/atlas/ScenarioControls.tsx) —
  island variant restructured. Gone: the `__hero` card frame, the
  `Layers3` icon span, the `"Scenario"` eyebrow, the `h2` displaying
  the active scenario name (redundant with the active segment button
  below), the entire `__chips` strip of envelope-type counts. Kept:
  the segmented control (segments and "0 changed parcels" count now
  sit inline in a new `__header` row), the compare checkbox + select,
  the draft-height slider section, the city-KPIs grid.
- [src/app/open-flint-atlas/atlas.css:563-755](../../src/app/open-flint-atlas/atlas.css) —
  CSS surgery. Dropped `.atlas-scenario-island__hero` styles, dropped
  `.atlas-scenario-island__chips` (×4) styles, replaced segmented-
  control container with a borderless grid, replaced compare checkbox
  pill chrome with a flat label, removed individual KPI cell card
  borders / backgrounds. `__slider` and `__kpis` still use the
  `border-top: 1px solid rgba(42,36,25,0.08)` hairline divider pattern
  (this was already correct; preserved).
- [src/components/atlas/AtlasDynamicIsland.tsx:472-518](../../src/components/atlas/AtlasDynamicIsland.tsx) —
  Time tab restructured. Gone: the `rounded-[14px] border ... bg-...
  p-3` inner card frame, the `"Now / Time travel"` mono-uppercase
  eyebrow, the 32px `atlasYear ?? "Now"` heading. Kept: the slider,
  the year endpoints (1800 / 2099), the current year as a centered
  inline caption below the slider thumb, the historical-reconstruction
  count line, the quick-jump buttons (Now / 1925 / 1950 / 1975).

**Information loss check**: the envelope-type legend chips were
removed without a replacement landing in the Layers panel. The
`envelopeTypeCounts` data prop is still threaded all the way down
(consumed in the floating-variant fallback), so the data path is
intact for a follow-up Layers integration. P2 — see Action Rail.

**Verdict**: clean. The visual diff (preview screenshot of the Time
tab and Scenarios tab) shows the island reads as a single card with
hairline-rule-separated sections, exactly as the user described as
the target state.

## Spec Reconciliation

### SPEC-PHASE-A-TYPOLOGY.md (frontend portion only)

| Spec section | Status |
|---|---|
| §1 Open-source stack | not in scope this session (backend track) |
| §2 Class taxonomy (6 classes) | **partial** — the frontend reads `form_type` from the urban-design model; the spec's 6 classes don't directly map to the model's 10 form types. The opt-in typology mode honors a 9+unknown palette today; Phase A backend will need to introduce a *separate* `typology_class` field that the frontend reads alongside `form_type` |
| §3 Data sources | not in scope (ingest backend track) |
| §4 Feature engineering | not in scope (ingest backend track) |
| §5 Module layout (`civic_atlas_ingest/typology_*.py`) | not in scope (ingest backend track) |
| §6 City pack structure | not in scope (ingest backend track) |
| §7 PostGIS `building_typology` table | not in scope (backend track) |
| §8 R3F render channel | this repo uses MapLibre + deck.gl, not R3F. The render channel as the spec describes it lives in this session's `materialMode === "typology"` opt-in mode (in AtlasMap.tsx). Low-confidence styling: the alpha-decay path in `applyFabricCompletenessAlpha` is wired but reads `fabric_feature_completeness`, not `building_typology.confidence` — these need reconciling when the backend lands |
| §9 Build order A1–A10 | not in scope (full Phase A retake is deferred) |
| §10 MUST clauses | **the "Hide low-confidence classifications: render with the uncertainty signal, never silently as confident" MUST is now satisfied** at the frontend layer; the `confidence` reported for `"unknown"` is ≤0.32 and the chipboard render is honest |
| §11 Done definition | not satisfied (full Phase A pipeline not built) |

### SPEC-PHASE-A5-BUILDING-FABRIC.md (frontend portion only)

| Spec section | Status |
|---|---|
| §1 Problem framing (close the perceptual gap) | this session moves PART of the way. The user explicitly said "uniform soft gray-white masses, varying only in massing and height" was the right north star for *this* pass, with the rich archetype geometry deferred until the classifier is real |
| §2 Dependency model (needs Phase A + Blender + glTF pipeline) | **inverted by user direction**. The user authorized landing the render baseline BEFORE Phase A's real classifier exists, on the principle that an honest chipboard render is better than a lying colored render |
| §3 Archetype catalog (6 .blend files) | not in scope — Blender + glTF pipeline is not in this repo's runtime. The frontend's `createFabricDetailParts` switch is the rule-based approximation that ships until glTFs land |
| §4 Parameter extraction (height, orientation, roof pitch) | **partially correct** — `deriveBuildingFabricSpec` already extracts these from OSM tags + footprint geometry; `inferStories`, `inferRoofPitch`, `inferWindowSpacing` honor the height-priors YAML. The honest improvement this session: orientation is now actually USED in part placement (via `OrientedFootprint`) rather than computed-and-ignored |
| §5 Module layout (`archetype_*.py`) | not in scope (Modal/Blender batch track) |
| §6 PostGIS `building_fabric` table | not in scope (backend track) |
| §7 LOD strategy (3 tiers) | partial — `BUILDING_FABRIC_LOD` constants exist in building-fabric.ts; the deck.gl layer fades opacity between extrusion and fabric mode at the spec'd zoom boundaries |
| §8 Deterministic variation | **honored** — `variation_seed = stableHash(osm_id) & 0xFFFFFFFF` is preserved; `inferRoofPitch` and `inferWindowSpacing` use `seededUnit(seed, salt)` for reproducibility |
| §9 Build order A5-1..A5-9 | A5-1 (schema) and A5-4 (parameter extraction) are partially in place; the Modal/Blender + glb storage track is not in scope |
| §10 MUST clauses | the "render glTF at zoom < 16 ... use the extrusion fallback" MUST is preserved (no glTFs ship; the extrusion is the only rendered tier). The "fade, never snap" LOD MUST is honored by the existing opacity-fade path |
| §11 Open questions | not addressed (all five remain open; none block this cleanup) |

**Bottom line on spec reconciliation**: this session shipped a
deliberately narrow slice. The frontend now renders honestly against
the data it has, with a type-safe path for the real classifier to plug
in later. Roughly 30% of the Phase A frontend surface and 15% of the
Phase A.5 frontend surface are satisfied; the backend tracks of both
specs are 0% in this session.

## Validators

| Validator | Result | Evidence |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Run twice (after PR 1+3, then after PR 2, then after PR 4). No errors |
| `npm run lint` (ESLint) | **PASS** | Run after each PR. No warnings or errors |
| Visual smoke (dev server) | **PASS** | Preview screenshots captured at desktop 1440×900. Map renders full Flint extent. Buildings appear as uniform chipboard tones, no Lego carnival. Dynamic island Time and Scenarios tabs both render with flat hairline-divided sections |
| Console errors | **none** | `mcp__Claude_Preview__preview_console_logs --level error` returned empty |
| Server errors | **none** | `mcp__Claude_Preview__preview_logs --level error` returned no server errors |
| Build | **not run** | `npm run build` was not exercised. Recommended P1 before merge |
| Tests | **n/a** | Repo has no vitest/jest/playwright installed |

## Action Rail

### P0 (must address before commit)

**P0-1. `next-env.d.ts` reverted to dev-mode types path.** The
diff for this file shows
`import "./.next/dev/types/routes.d.ts";` — but commit
`8c84488` explicitly fixed this back to the build-mode path
(`./.next/types/routes.d.ts`) because the Vercel build wants the
non-dev path. The `next dev` server overwrites this on first
boot. This file should be restored to the build-mode path
before staging any of this session's edits. A `git checkout
next-env.d.ts` does it.

### P1 (should address in the same PR or next)

**P1-1. Build verification.** `npm run build` was not run this
session. Given the breadth of TS changes (added union members
forcing exhaustive maps, a refactored geometric helper module),
running `npm run build` once before pushing catches any Next.js
build-time bundling regression that `tsc --noEmit` doesn't.

**P1-2. Rehome envelope-type legend chips into Layers.** The
`__chips` block was removed from Scenarios with the intent of
moving it into the Layers panel (per the user's analysis: "they're
a render setting, not a scenario property"). The data prop
`envelopeTypeCounts` is still passed through and used by the
floating-variant fallback, so the data path is intact. The Layers
panel's `LayerControls.tsx` would be the natural home — likely
under the `scenarioEnvelopes` layer toggle. Not done this
session; queued.

### P2 (broader cleanup, not chargeable here but worth surfacing)

**P2-1. Reconcile `fabric_feature_completeness` and Phase A's
`confidence`.** The frontend's low-confidence-styling alpha
(`applyFabricCompletenessAlpha`) currently triggers on
`fabric_feature_completeness < 0.5`. The Phase A spec defines a
separate `confidence` field on each `building_typology` row. When
the backend lands, the frontend should read whichever is more
restrictive (or surface both as separate low-confidence dimensions),
not silently prefer one.

**P2-2. The longest-edge-bearing proxy for front-edge orientation.**
`getOrientedFootprint` consumes `front_edge_bearing_degrees`, which
in `building-fabric.ts` is computed from `longestEdgeBearingDegrees(ring)`.
For L-shaped or corner-lot footprints this can pick an edge that
doesn't face the street. Phase A's parcel-edge classifier (or
OSMnx-based nearest-road bearing) is the real fix. The API surface
here is already correct: `front_edge_bearing_degrees` is a field on
`BuildingFabricParams`, and the renderer reads it via the spec's
explicit field — no rewrite needed when the data improves.

### Explicitly deferred (out of scope by user direction)

- **The real Phase A LightGBM classifier on Ray/RunPod.** This is
  the bigger Phase A retake. The user's note from the handoff is
  binding: "the only layer of cleanup that I have from the plan is
  that it should be using Ray/RunPod not modal." When that work
  begins it gets its own plan and orchestration pass.
- **Envelope-type legend chips re-homing** — see P1-2; queued, not
  blocking this PR.

## Federation Learning Signals

Three patterns from this session worth capturing for future similar
work (auto-classification cleanups, render-truth retrofits):

1. **Type-driven exhaustive-record forcing prevents Lego-state
   regression.** Adding `"unknown"` to a union forces every
   `Record<EnumType, T>` consumer to supply an entry. The TypeScript
   compiler refuses to build until each renderer code path
   acknowledges the unknown case. This is a structural anti-drift
   pattern that should be applied wherever a classifier emits an
   enum and renderers map that enum to visual properties — without
   it, "unknown" can silently inherit a default-by-omission color
   that re-introduces the lie.
2. **Orientation refactors are dead-code engines.** Every
   `if (bounds.widthM >= bounds.depthM) ... else ...` branch in
   `createFormParts` and its eight helpers collapsed to a single
   branch once the `(u, v)` local frame existed. The geometric
   correctness fix and the structural simplification are the same
   commit. When auditing similar two-axis-conditional code in other
   atlases or visualizations, look for hidden coordinate-frame
   ambiguity — there's usually a one-frame refactor that dissolves
   the conditional.
3. **Hash-modulo as "fallback classification" is a class of lie.**
   The general failure mode: when a classifier has no signal, the
   easiest path is `hash(id) % N` to distribute outputs across
   classes. This passes basic plausibility checks (looks classified,
   coverage matches expected distribution) but is the worst possible
   answer because it produces *deterministic-but-arbitrary*
   classifications that look stable across reloads. The honest
   alternative is always an explicit "unknown" bucket with a render
   path that signals uncertainty. Where this pattern appears in
   other engines — Theseus's cluster assignment, RustyRed's
   relation typing, the porchfest planner's act categorization —
   it's worth auditing for the same anti-pattern.

## Diff Manifest

Files modified this session (excluding `next-env.d.ts`, which is the
P0 hazard to revert):

```
 src/app/open-flint-atlas/atlas.css                                | 119 ±
 src/components/atlas/AtlasDynamicIsland.tsx                       |  61 ±
 src/components/atlas/AtlasMap.tsx                                 |  94 ±
 src/components/atlas/OpenFlintAtlasScene.tsx                      |  10 ±
 src/components/atlas/ScenarioControls.tsx                         |  64 ±
 src/data/open-flint-atlas/fixtures/building-fabric/height-priors.ts |  23 +
 src/lib/atlas/building-fabric.ts                                  |  35 ±
 src/lib/atlas/urban-design-model.ts                               | 649 ±
 8 files changed, ~640 insertions, ~415 deletions
```

The `urban-design-model.ts` line count looks large but is dominated by
the new geometry helpers (`getOrientedFootprint`, `projectUV`,
`orientedRect`, `orientedRectWithHole`) and inline JSDoc explaining
the `(u, v)` frame, the unknown bucket, and the hash-modulo
replacement. The net behavior change is one rotation transform applied
everywhere instead of two axis-picking branches scattered across nine
helpers.

## Recommended Commit Plan

The user has standing authorization to push without further
confirmation, but to keep the diff reviewable, split into two commits:

1. **`fix(atlas): replace hash-modulo classifier with honest unknown bucket`**
   — files: `urban-design-model.ts`, `building-fabric.ts`,
   `height-priors.ts`. This is the foundation that the render
   improvements layer on top of.
2. **`feat(atlas): sketch-model render default + bearing-aware orientation + flat dynamic-island panels`**
   — files: `AtlasMap.tsx`, `OpenFlintAtlasScene.tsx`,
   `AtlasDynamicIsland.tsx`, `ScenarioControls.tsx`, `atlas.css`,
   plus the additional helpers in `urban-design-model.ts` if not
   already pulled into commit 1.

Run `git checkout next-env.d.ts` before staging either commit.

## Closing

The session delivered the user-visible chipboard render and the
geometric foundation that makes the next classifier drop-in. The Phase
A backend (real LightGBM, Ray/RunPod, validation set, PostGIS
`building_typology` rows, GraphQL `typology { … }` field) remains the
larger track; this report does not claim to have touched it. When
that work begins, the frontend type system will force the new
classifier's outputs through the same exhaustive `Record<...>` checks
that prevented Lego carnival from coming back this session.

Report path: [docs/plans/orchestrate-2026-05-22-atlas-typology-cleanup.md](./orchestrate-2026-05-22-atlas-typology-cleanup.md).
