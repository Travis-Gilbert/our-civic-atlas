# Theorem Brief: Lost Flint UI (CU-L3-001 Brainstorm)

Status: BRAINSTORM. Not the approved design proposal. The user reviews
this in chat. The next session promotes the approved direction into the
canonical `docs/design/lost-flint-ui-proposal.md` (per catchup plan
CU-L3-001 acceptance).

Generated 2026-05-21 via `production-theorem:orchestrate mode=theorize`.
Survey grounding: UCA-013 spec, `visual-grammar-v1.md`,
`phase-4-correction-loop-ui.md`, `reconstruction-node-tree-adapter.md`,
`AtlasLostFlintDeckLayer.ts`, `ghost-palette-preview.html`, and the
curated component library at
`Index-API/Theseus/Design Components/` (42 components scanned, 12 named
as Lost Flint candidates).

## Executive Summary

- **Current condition**: Lost Flint's procedural confidence rendering
  already ships in `AtlasLostFlintDeckLayer.ts` (4-part per-instance
  shader). Carriage Town route mounts with bookmark + searchValue=1925.
  5 hand-encoded specs sit in `0004_seed_carriage_town_specs.sql`
  waiting for GraphQL hookup. Two design documents lock the visual
  language at different layers (`visual-grammar-v1.md` for grammar,
  `phase-4-correction-loop-ui.md` for correction-loop interaction).
- **Intent**: produce a UI design that (a) lets a visitor walk
  Carriage Town in 1925, see 20 buildings rendered with per-part
  honest uncertainty, tap a building, see per-part sources and
  confidence; (b) is consistent across desktop and 390 x 844 mobile;
  (c) respects the locked visual grammar v1 (dynamic island universal
  chrome, no jargon, time as search input, ghost material amount as
  the confidence indicator); (d) survives Phase 4 correction-loop
  layering when it lands later.
- **Goal**: a chat-approved direction sufficient for the next session
  to write the design proposal at
  `docs/design/lost-flint-ui-proposal.md` and for Phase D XRL-D-002
  and XRL-D-003 to consume it.
- **Why this matters now**: Lost Flint is named in AGENTS.md and the
  unified plan as the highest-priority remaining product slice.
  Carriage Town is the launch milestone (XRL-E-001). Without an
  approved UI direction, Phase D frontend hand-back stalls.

## Problem Shape

### Known Facts

- The dynamic island is the universal chrome on both form factors
  (compressed, compressed-focus, expanded place page, expanded
  search, expanded filter, expanded compose). Visual grammar v1
  binds this and points at the `mainline-island-port` baseline
  screenshots.
- Time is a search input. Search bar accepts `1925`. Year is held
  in the compressed island as metadata when year is not present.
  Per-object "jump to year X" affordance lives in the expanded
  island when prior-state records exist.
- Historical confidence is encoded in geometry as the amount of
  ghost material. Per-element substitution (per brick, per panel),
  not a smooth gradient. Ghost palette tokens are locked: `--ghost-highlight #F2F8F7`,
  `--ghost-mid #CFE0DC`, `--ghost-shadow #9CC0B8`. Hues 168 deg to
  173 deg avoid the CartoDB water blue at 204 deg.
- Render modes already collapsed from 14 to 8. `historical` is the
  Lost Flint mode. `historical_event` is reserved for events.
- The Pascal node tree is implemented:
  Site / Building / Level / Mass / Facade / OpeningGrid /
  TextureFace / GroundFloor / Roof. Node IDs are stable addresses
  usable as correction targets.
- The current deck.gl shader (`ConfidenceMixMeshLayer`) handles
  procedural box rendering with 4-part per-instance confidence
  (Mass / Facade / Roof / GroundFloor), Mass as floor across zones,
  z-fraction zone split (ground under 0.15, facade 0.15 to 0.85,
  roof over 0.85). `sizeScale: 10` is a diagnostic value to be
  dropped to 3 or 4 once visual grammar differentiation lands.
- 3-tier dispatch: glTF (ScenegraphLayer) for Scene Foundry assets,
  splat (planned), procedural box (default).
- Jargon ban applies to UI strings. The word "dossier" retires from
  user-facing copy; the expanded island IS the place page.
- 5 hand-encoded Carriage Town specs are in
  `our-civic-atlas-backend/migrations/0004_seed_carriage_town_specs.sql`
  and surface here once XRL-D-001 (GraphQL cutover) lands.
- Codex is concurrently working on `r3f-atlas-scene-quality`
  worktree at the sibling checkout. This brainstorm produces no
  code and no commit.

### Unknowns

- ACC/ACT explanation output shape. Phase 4 doc reserves an
  explanation panel but the contract from Theseus is not yet
  defined. Lost Flint UI v1 may need to render a placeholder until
  ACC/ACT lands.
- Whether historical events have spec-level geometry (point, area)
  or are tied to existing civic objects.
- The basemap palette beyond the ghost palette. Visual grammar v1
  marks `--confidence-bar-fill`, `--confidence-bar-track`, and
  `--contested-text` as TBD pending the basemap pass.
- The five Carriage Town specs' actual per-part confidence values.
  The hand-encoded migration likely sets test values; the
  Pairformer prior pass (Phase B post-V1) overwrites them.

### Constraints

- No worktrees. No em or en dashes. No emojis in code or docs.
- No fake UI. No mock data in shipped surfaces. No silent MVP cuts.
  Spec is the floor.
- Design-gate is mandatory. Visual code is forbidden until the user
  approves the synthesized direction.
- Multi-tenancy invariant: TenantContext on every backend call;
  PostGIS `tenant_id` with RLS; RustyRed tenant-scoped namespace.
  Lost Flint UI must read tenant from URL or context, never
  hard-code Flint.
- Color is never the only signal. Every state distinguished by
  color is also distinguished by at least one of shape, material,
  line style, label, position, or animation. WCAG 2.2 AA contrast.
- Reduced-motion fallback required on island shape-shift.

### Assumptions

- Phase D R3F per-part overlay (XRL-D-002) will land for landmark
  buildings that ship glTF assets from Scene Foundry. Procedural
  buildings stay on the deck.gl ConfidenceMixMeshLayer path.
- The expanded dynamic island absorbs the previous "dossier"
  surface entirely. There is one expanded place-page state.
- The Phase 4 dossier navigation layers (Layer 1 Building,
  Layer 2 Part, Layer 3 Field via correction form) survive inside
  the expanded island.
- The visual grammar v1 confidence thresholds (60 / 90) override
  the Phase 4 thresholds (50 / 85) because visual grammar v1 is
  newer and explicitly supersedes the prior model.
- A year query string param (`?year=N`) is acceptable in the
  route URL for deep-linkability.

### Tensions

| ID | Tension | Resolution this brief proposes |
|---|---|---|
| T1 | Confidence band thresholds disagree between visual grammar v1 (60 / 90) and Phase 4 doc (50 / 85). | Adopt 60 / 90 across present-day and historical. Visual grammar v1 is newer authority and explicitly supersedes 14-value RenderMode. Phase 4 doc gets updated to 60 / 90 when implementation resumes. |
| T2 | Per-part confidence indicator location: Phase 4 places it on the dossier with click-to-explanation; visual grammar v1 places it in the expanded island. | Collapse. The expanded dynamic island IS the place page. Per-part indicators render inside the expanded island. The Phase 4 explanation-panel pattern survives as a deeper state within the expanded island, not as a parallel surface. |
| T3 | Per-part spatial picking is deferred for procedural buildings, but the Pascal node tree explicitly enables per-part correction targets. | Entry to Layer 2 (Part) is via tap on the part row inside the expanded island Layer 1, on both desktop and mobile. Spatial picking on procedural geometry remains deferred. Hand-modeled landmarks (e.g., Whaley House) get spatial picking when modeled, post-Phase E. |
| T4 | R3F per-part shader port (XRL-D-002) vs the existing deck.gl per-part shader. | Path (a): port to R3F for landmark glTF buildings only (the buildings Scene Foundry produces in Phase C). Procedural buildings stay on the deck.gl ConfidenceMixMeshLayer indefinitely. R3F is the selective immersive overlay, not the substrate. This matches the visual grammar v1 line "R3F adds selected immersive objects instead of replacing the map substrate." |
| T5 | UCA-013's historical-article and event linkage has no shader or place-page expression yet. | Events are first-class objects on the map with their own render mode (`historical_event` already in the collapsed 8-mode set). They have geo position (point or polygon), year range, title, summary, source links. Rendered as a small icon visible only when the active year overlaps the event's year range. Tap opens the expanded island with event content. Same on mobile. |
| T6 | Pascal node-tree internal terms (Mass, Facade, OpeningGrid, GroundFloor, TextureFace) violate the jargon ban for civic-facing UI. | Add a civic-label map alongside the visual grammar's existing jargon table: Mass to "Shape and size", Facade to "Walls", OpeningGrid to "Windows and doors", Roof to "Roof", GroundFloor to "Street level", TextureFace to "Surface details". Lives in `src/lib/atlas/civic-labels.ts` (new) or extends `visual-grammar.ts`. |

### Failure Modes

- **Two confidence languages on one screen**. If the present-day
  and historical thresholds disagree, the same building viewed
  through two times reads as two different epistemic systems. T1
  resolution closes this.
- **Dossier survives in copy**. If the word "dossier" leaks into
  any UI string while the chrome is "place page", the screen
  speaks two languages. Lint-style grep against banned terms in
  `src/app/**/*.tsx` and `src/components/**/*.tsx` per the release
  checklist.
- **Per-part rows feel like a spreadsheet**. Four rows of part +
  confidence on the expanded island could feel like a form. The
  visual grammar must give each row enough hierarchy and contrast
  to read as building anatomy, not tabular data. Curated-library
  reference: list rows with confidence indicator inline, not a
  table layout.
- **The 5% porcelain floor reads as defect**. If the floor is too
  high, even 100%-confident buildings look damaged. If too low,
  no perceptible distinction from contemporary. Recommendation
  below ships floor at 5% and ceiling at 95% and the visual-gate
  review tunes.
- **Year input outside Carriage Town lifespan silently drops the
  layer**. A visitor types 1850 and the screen goes empty without
  explanation. Must show a friendly "No buildings documented for
  1850" line in the compressed island.
- **Codex collision**. R3F worktree work overlaps Lost Flint
  rendering in spirit. Any code change to `src/components/atlas/`
  in this checkout risks merge conflict. Brainstorm produces no
  code. Coordination is the next session's responsibility.

## Options

Six design tracks within Lost Flint v1. Each carries a recommendation.

### Track 1: Dynamic island state machine for Lost Flint

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 1a Specified-by-visual-grammar | Follow `visual-grammar-v1.md` state table verbatim: compressed (year only when not present), compressed-focus (object name + minimal metadata), expanded (place page), expanded-search, expanded-filter. | Already locked. No new chrome shape. | Visual grammar v1 does not define the "exit" rule from expanded back to compressed. | Lock visual grammar v1's table. Add one explicit exit rule: tap outside island returns to compressed-noFocus; explicit close button returns to compressed-focus (keeps the building selected). |
| 1b Add an explicit historical sub-state | When year is set, expanded island carries a top-of-card year badge + year-jump affordance. | Makes time travel feel persistent. | Adds chrome inside the island. May infringe on the "every pixel earns its place" rule. | Reject. Year in the compressed island is sufficient. The expanded island already shows year-jump per visual grammar v1. |

### Track 2: Year handling on the Carriage Town route

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 2a Year is client state only | Route stays at `/lost-flint/carriage-town`. Year held in component state. | Simplest. No URL change. | Not deep-linkable. A resident cannot share "Carriage Town in 1925" as a URL. | Reject. |
| 2b Year as query parameter | Route becomes `/lost-flint/carriage-town?year=1925`. URL updates as user retypes year. | Deep-linkable. Browser back button works for year changes. Shareable. | Slight URL churn. Need to debounce so every keystroke does not rewrite history. | Recommend. Debounce 250 ms. URL updates only after parse succeeds. |
| 2c Year in path | `/lost-flint/carriage-town/1925`. | Cleaner URL. | Conflicts with future per-building paths. Hard to combine with other query params. | Reject. |

### Track 3: Historical event and article linkage

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 3a Events as their own objects with the `historical_event` render mode | Each event has geo position (point or polygon), year range, title, summary, source links. Rendered as a small icon visible only when the active year overlaps the event's year range. | Consistent with visual grammar v1's collapsed 8-mode set. Reuses dynamic island for the event place page. | Needs an event data model that the Carriage Town seed does not yet have. | Recommend. Land the schema as part of the design proposal; the 0004 migration extends to seed a small number of events. |
| 3b Events as fields on buildings | A building's place page carries an "Events here" tab. | No new map icon. | Loses the geographic stories that did not happen at a building (e.g., a 1925 strike on a street corner). | Reject. |
| 3c Events as a separate timeline strip below the map | A persistent strip lists events for the current year. | Always visible. | Adds permanent chrome outside the island, violating visual grammar v1's chrome-minimal rule. | Reject. |

### Track 4: Confidence amount calibration

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 4a Linear porcelain fraction | `porcelain_fraction = 1 - confidence`. Current shader behavior. | Predictable. | At 100% confidence the building looks identical to contemporary stone. Reads as not-historical. | Reject. |
| 4b Linear with floor and ceiling | `porcelain_fraction = 0.05 + (1 - confidence) * 0.90`. Floor at 5%, ceiling at 95%. | Even 100%-confident historical buildings have a perceptible porcelain dusting; even 0%-confident buildings retain a recognizable silhouette. | Tuning may be needed against the live basemap; not a free decision. | Recommend. Land floor 5% and ceiling 95% as defaults. Tune during the visual gate (XRL-E-003). |
| 4c Perceptual curve | Non-linear mapping (e.g., `pow((1 - confidence), 1.5)`) to flatten the high-confidence end. | Better perceptual uniformity. | Adds a tuning parameter without evidence the linear-with-bounds is insufficient. | Defer. Visual gate review can promote to this if linear-with-bounds reads wrong. |

### Track 5: Part navigation on mobile and desktop

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 5a Tab strip across parts | Tabs (curated: `Tabs 2.md` / `Simple tabs.md`) with one part per tab. | Compact. Each tab can show rich detail. | Confidence states for non-active parts are invisible until tapped. Visitor cannot scan all four parts at a glance. | Reject. |
| 5b Bento grid of parts | 2x2 grid (curated: `Bento cards layout.md`) with one part per card. | All four parts visible. Card-shaped feels concrete. | On mobile a 2x2 grid plus headers does not fit in the expanded island's vertical budget. Confidence indicators (bar or "contested") are harder to scan vertically across rows. | Reject. |
| 5c Stacked rows with inline confidence | Each part is one row in the expanded island. Row content: civic-language label, confidence treatment, part-icon. | All four parts visible. Confidence states are vertically scannable. Works the same on mobile and desktop. Curated: list-with-inline-indicator pattern from `Dynamic Island TOC.md`. | None substantive. | Recommend. Each row: civic label on the left; confidence treatment (bar, "contested", or silent) on the right; small icon affordance on the row indicating "tap for detail" (Layer 2). |

### Track 6: Pending corrections badge behavior on Lost Flint v1

| Option | Description | Upside | Risk | Recommendation |
|---|---|---|---|---|
| 6a Always render the badge with count 0 | Show "0 pending" on every part row pre-launch. | Consistent treatment with Phase 4. | Reads as broken UI when zero is omnipresent. Violates "no UI when count is zero." | Reject. |
| 6b Hide the badge when count is zero | Render the pill only when `pending_count > 0`. Phase 4 wiring identical; visibility gated by the count predicate. | Lost Flint v1 ships with zero corrections so the badge is invisible until residents start submitting. Phase 4 plugs in cleanly. | None. | Recommend. |
| 6c Defer the wiring entirely | Skip the badge from the data path until Phase 4 ships. | Less code. | Phase 4 retrofit becomes invasive across every part-row component. | Reject. |

## Recommended Direction

Adopt the recommended option from each of the six tracks. Combined,
the Lost Flint v1 UI shape is:

1. **Chrome**: the dynamic island as defined in visual grammar v1.
   Add one exit rule: tap outside island clears focus and returns to
   compressed-noFocus; explicit close keeps the building selected.
2. **Time**: the search bar drives year. Year reflects in the URL
   as `?year=N`, debounced 250 ms, updated only after parse
   succeeds. Out-of-lifespan year shows a friendly empty-state line
   in the compressed island.
3. **Material**: existing deck.gl `ConfidenceMixMeshLayer` ships
   procedural per-part confidence. R3F selective overlay
   (XRL-D-002) handles landmark glTF buildings only when Scene
   Foundry produces them. Porcelain fraction is
   `0.05 + (1 - confidence) * 0.90` (floor 5%, ceiling 95%).
4. **Place page (expanded island)**: stacked-row layout with one
   row per part. Each row shows civic-language label, inline
   confidence treatment (bar / contested / silent), small affordance
   to enter Layer 2 (Part detail). Layer 2 is reached by tapping
   the row, never by spatial picking on procedural geometry.
5. **Events**: a new render mode `historical_event` (reserved in the
   collapsed 8-mode set). Events are first-class objects with geo
   position, year range, title, summary, sources. Rendered as a
   small icon when the active year overlaps the year range.
   Tapping opens the expanded island with event content. Schema
   addition lands as part of the design proposal.
6. **Civic labels**: ship a civic-label map alongside the visual
   grammar's jargon table. Mass to "Shape and size"; Facade to
   "Walls"; OpeningGrid to "Windows and doors"; Roof to "Roof";
   GroundFloor to "Street level"; TextureFace to "Surface details".
   Lives in `src/lib/atlas/civic-labels.ts` (new file).
7. **Confidence thresholds**: 60 / 90 across present-day and
   historical. Phase 4 doc gets a follow-up edit to align when
   correction-loop implementation resumes.
8. **Pending corrections badge**: hidden when count is zero,
   identical wiring as Phase 4. Lost Flint v1 ships with the badge
   path wired but invisible.

## Decisions Resolved

| Decision | Rationale | Evidence | Reversible? | ADR? |
|---|---|---|---|---|
| Confidence thresholds 60 / 90 across present-day and historical | `visual-grammar-v1.md` is the newer authority and explicitly supersedes 14-value RenderMode. Wider "contested" band (under 60) catches more uncertainty. Higher silent threshold (90) is stricter. | `visual-grammar-v1.md` Confidence encoding table; `phase-4-correction-loop-ui.md` Confidence indicator table | yes (one number swap in two docs + the threshold constants when they land in `contracts.ts`) | yes when locked |
| Expanded dynamic island IS the place page | visual grammar v1 binds this: no side panel, no bottom sheet, island absorbs that role on both form factors | `visual-grammar-v1.md` § Dynamic island as universal chrome | yes (would require introducing a separate dossier component) | already in visual grammar v1 |
| Year deep-link via `?year=N` query param | Civic sharing value. Browser back button works for year changes. | n/a (new) | yes (drop the URL sync) | no |
| R3F overlay is landmark glTF only; procedural stays on deck.gl | Matches visual grammar v1's "R3F adds selected immersive objects instead of replacing the map substrate" | `visual-grammar-v1.md` Principles; current `AtlasLostFlintDeckLayer.ts` 3-tier dispatch | yes (could expand R3F to procedural later, but no reason to today) | yes when written into the design proposal |
| Porcelain fraction = 0.05 + (1 - confidence) * 0.90 | Floor 5% so even 100%-confident historical reads as historical. Ceiling 95% preserves silhouette. | `ghost-palette-preview.html` SVG demo; current shader's linear `1 - confidence` is the unbounded baseline | yes (one shader constant) | no, tuneable per visual gate |
| Stacked-row layout for parts inside expanded island | All four parts and their confidence states scannable at once on mobile and desktop. Tabs hide content; bento grid is mobile-hostile. | curated lib `Dynamic Island TOC.md` pattern | yes (could swap to tabs if testing shows row layout is wrong) | no |
| Civic-language map for node-tree terms | Visual grammar v1 jargon ban applies. Node-tree terms must read in plain civic English. | `visual-grammar-v1.md` jargon table; `reconstruction-node-tree-adapter.md` tree shape | yes (relabel) | no |
| Events as first-class objects with `historical_event` render mode | Reuses the collapsed 8-mode set. Carries event geography that does not attach to any building. | `visual-grammar-v1.md` Render modes table | yes (could collapse to building-attached events later) | no |
| Pending corrections badge hidden when count is zero | Phase 4 wiring lands cleanly; no broken-looking zero counts before residents start submitting. | `visual-grammar-v1.md` "no review state in UI"; `phase-4-correction-loop-ui.md` pending badge spec | yes (visibility predicate) | no |

## Open Questions

These cannot be answered from code, docs, or this brainstorm and
need user judgment.

1. **Year query param vs path slot vs neither**. Recommendation is
   `?year=N` query param with 250 ms debounce. User should
   confirm before the design proposal commits to one form.
2. **Civic labels for ambiguous parts**. The brief proposes "Walls"
   for Facade and "Street level" for GroundFloor. User may prefer
   alternatives. "Surface details" for TextureFace is especially
   open; "Materials" is a near-tie candidate.
3. **Multi-facade buildings**. Some buildings have multiple facades
   (front, side, back). The Pascal tree supports per-side facades.
   Does the civic label become "Walls" (singular collective) or
   "Front, sides, back" (enumerated)? Pre-launch buildings in
   Carriage Town may all be single-facade; revisit when multi-side
   data arrives.
4. **Event icon glyph**. Visual grammar v1 names a newspaper icon
   for credible-source news on the live signal layer, distinct
   from historical events. The historical event icon shape is not
   yet drawn. Brief proposes a small period-photo-frame icon
   (rectangle with rounded corners, year inside). User to confirm
   or counter.
5. **Empty-state line copy when year is outside lifespan**.
   "No buildings documented for 1850 yet" is one option. Plainer:
   "Nothing here in 1850 yet." User to choose tone.
6. **Phase 4 doc updates**. The brief's confidence-thresholds
   recommendation requires editing
   `docs/design/phase-4-correction-loop-ui.md` from 50 / 85 to
   60 / 90. User to confirm this edit is acceptable as part of the
   design proposal (one small commit).

## Planning Inputs

When the user approves the direction, the next session writes
`docs/design/lost-flint-ui-proposal.md` with these sections:

1. **Status header** locking the approved direction.
2. **State machine** for the dynamic island: every transition,
   every exit, every keyboard reachable equivalent.
3. **Year handling**: query param contract, debounce constant,
   empty-state copy, year-jump affordance copy.
4. **Material recipe**: shader constants (porcelain fraction
   formula, noise frequency, ghost palette tokens, sizeScale fall
   from 10 to 3 or 4), 3-tier dispatch confirmation,
   reduced-motion fallback definition.
5. **Place-page layout**: row component shape, civic-label map
   import, confidence-band component contract (bar, "contested"
   label, silent), Layer 2 (Part) detail layout.
6. **Event schema and rendering**: data shape addition, the
   `historical_event` render mode wiring, icon glyph spec, tap
   behavior.
7. **Civic-label map**: full table including the six node-tree
   terms plus any additional banned-jargon mappings unique to
   Lost Flint.
8. **Confidence threshold migration plan**: the one-number swap
   in `visual-grammar-v1.md`, the matching update in
   `phase-4-correction-loop-ui.md`, the eventual locked constant
   in `src/lib/atlas/contracts.ts`.
9. **Pending corrections badge**: component contract, visibility
   predicate, Phase 4 wiring readiness.
10. **WCAG 2.2 AA and reduced-motion acceptance criteria**.
11. **Visual gate plan**: which screenshots get captured for
    XRL-E-003 Do Not Downgrade.

## Cross-References

- `docs/design/visual-grammar-v1.md` (locks the chrome + ghost
  palette + jargon ban)
- `docs/design/phase-4-correction-loop-ui.md` (locked but
  implementation-deferred; threshold and per-part nav update needed)
- `docs/design/reconstruction-node-tree-adapter.md` (Pascal tree)
- `docs/design/ghost-palette-preview.html` (palette swatch and SVG
  demo)
- `src/components/atlas/AtlasLostFlintDeckLayer.ts` (current
  deck.gl confidence shader)
- `src/lib/atlas/reconstruction-node-tree.ts` (frontend node tree)
- `src/app/open-flint-atlas/lost-flint/carriage-town/page.tsx`
  (current route)
- `Index-API/Theseus/Design Components/Dynamic Island TOC.md`
  (curated pattern reference)
- `docs/plans/catchup-plan-2026-05-20.md` CU-L3-001
  (acceptance criteria)
- `docs/plans/cross-repo-launch-plan-2026-05-20.md` XRL-D-002,
  XRL-D-003 (consumers when design lands)

End of brief. User reviews direction in chat. On approval, next
session writes the design proposal.
