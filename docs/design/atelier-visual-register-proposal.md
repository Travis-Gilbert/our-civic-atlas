# The Atelier: Visual Register Design Proposal

Status: **APPROVED 2026-05-23**. PT-001 complete. Implementation proceeds at PT-201 (atelier CSS tokens) onward.

Generated 2026-05-23. Routed through the design-gate forcing function: brainstorming widened the design space, impeccable enforced the craft layer (anti-AI-slop discipline, no first-order or second-order template patterns), ui-design-pro:design-theory anchored spatial composition, and a scan of `Index-API/Theseus/Design Components/` (43 curated patterns) sourced visual primitives the atelier inherits rather than reinvents.

## Locked decisions (approved 2026-05-23)

| # | Decision | Locked value |
|---|---|---|
| 1 | `--atelier-paper` hex | A `#26221c` (spec line 35 literal) |
| 2 | Paper grid style | A vellum (warm-cream lines on graphite, spec line 41) |
| 3 | Source card identities | Ship all 7 per the table in Decision 3 below |
| 4 | Dynamic island atelier icon | C tracing-paper-over-building (spec did not pick; design-gate synthesis) |
| 5 | Surface layout | Approved as proposed |
| 6 | Save button | **Build with real backend wiring** (smallest viable: `submitObservation`-style mutation, anonymous-with-optional-email receipt). Not disabled, not deferred. v2 extends with user-edited corrections per spec line 169 parenthetical |
| 7 | Atlas underlayer veil | Approved: opacity 0.12 + 1.5s blur ramp on atelier-mount |
| 8 | Stage 0 dust motes | Approved as proposed (removed under reduced-motion) |

## Binding implementation note (approved 2026-05-23)

**Start from the 7 Theseus Design Components primitives listed in the "Theseus Design Components inherited" section, and CUSTOMIZE them for atelier-specific requirements.** Do not ship primitives as-is; do not rebuild from scratch. Each implementation checklist item (PT-203, PT-204, PT-401 to PT-405) explicitly references which primitive it starts from and where it diverges.

The original proposal text follows. The "Open decisions" section at the bottom is preserved for traceability; each entry now shows the locked answer.

## The central tension this proposal resolves

The spec at `SPEC-THE-ATELIER.md` lines 33 to 44 prescribes a darker visual register for the atelier surface: warm graphite paper near-black where the rest of the atlas uses warm cream, with paper architect's grid as the ground plane. The existing `docs/design/visual-grammar-v1.md` §"Principles" line 8 locks the opposite for historical reconstructions: "Faithful geometry for history. Historical reconstructions render at the highest fidelity the Brush pipeline can produce. Uncertainty is encoded through material substitution, not through ghost tints layered over real geometry." The ghost palette is COOL teal porcelain (`#F2F8F7` / `#CFE0DC` / `#9CC0B8`).

If the atelier surface is darker AND the buildings inside it stay porcelain, the two registers compete for the eye and the spec's "buildings glow faintly, lit from camera-right as if on a museum pedestal" reading (spec line 35) is undermined.

The synthesis this proposal recommends: **the atelier's darker register is for the SURFACE LAYER (background, paper grid, chrome, periphery), not for the BUILDING MATERIAL.** The building material stays porcelain per visual-grammar-v1. The two layers are spatially and visually distinct: the surface is the workshop you have entered; the buildings inside it are studied at full fidelity. This is the museum-pedestal reading the spec invokes: dark gallery walls, lit chipboard model on a paper plinth. NOT one palette over the other.

This synthesis is the foundation of every option below. If the user rejects this synthesis (e.g., wants the building material to ALSO darken inside the atelier), the rest of the proposal needs to be revisited.

## Decision 1: `--atelier-paper` (the surface tone)

The spec at line 35 names "#26221c-ish" as an example. The existing `--ctx-paper*` scale at `src/app/open-flint-atlas/atlas.css` lines 47 to 49 sets the lineage:

- `--ctx-paper: #f2f1ec` (the cream baseline)
- `--ctx-paper-soft: #eae8e0`
- `--ctx-paper-deep: #dcd9cf`

The atelier extends this scale with a fourth darker step. Three candidates:

| Option | Hex | Reading | Notes |
|---|---|---|---|
| **A** (recommended) | `#26221c` | Warm graphite, the spec's literal example | Matches spec line 35 verbatim. Contrast against `--ghost-highlight #F2F8F7` for porcelain buildings: ~12.3:1 (well above WCAG AAA). |
| **B** | `#1f1c17` | Deeper near-black | More dramatic. Risk: the building's porcelain glow reads as artificially bright; could feel like a stage set rather than a workshop. Contrast: ~14.2:1. |
| **C** | `#2c281f` | Lighter warm graphite | Closer to `--ctx-paper-deep` (the existing fourth step). Lower contrast against the rest of the atlas means the atelier transition feels more like a tonal shift than a register break. Contrast: ~10.8:1. |

**Recommendation: A** (`#26221c`). It is the spec's authored value and the contrast against porcelain buildings is in the sweet spot. The token name `--atelier-paper` lives in a new file `src/app/open-flint-atlas/atelier/atelier.css`, scoped to the `.atelier-theme` class so it does not affect the rest of the atlas.

For completeness, the proposed CSS additions (under PT-201):

```css
.atelier-theme {
  --atelier-paper: #26221c;            /* Decision 1 above */
  --atelier-paper-glow: #2f2a22;       /* Slight lift for chrome surface elevation */
  --atelier-grid: #6b5a45;             /* Decision 2 below */
  --atelier-grid-soft: #4a3e2f;        /* Fainter grid lines (secondary, off-major-axis) */
  --atelier-ink: #f2f1ec;              /* Text on atelier surface; matches existing --ctx-paper */
  --atelier-ink-mute: #cab8a0;         /* Muted text (labels, captions) */
  --atelier-accent: var(--ctx-accent); /* Terracotta provenance lines; inherits */
}
```

The token names follow the existing `--ctx-*` convention so future cross-references read naturally.

## Decision 2: Paper architect's grid (the ground plane)

The spec at lines 41 to 42 prescribes "a faint architect's drafting grid, the kind that appears on tracing paper or vellum. This grounds the building in a working surface rather than floating in space."

The grid renders as a textured plane below the building, visible at oblique camera angles. Two reference traditions inform candidate choices:

| Option | Reading | Stroke value | Spacing | Notes |
|---|---|---|---|---|
| **A** (recommended) | Vellum / tracing paper (warm-cream lines on graphite) | `--atelier-grid #6b5a45` | 1m major / 0.2m minor | Matches the spec's "tracing paper or vellum" reference exactly. The warm tone keeps the surface feeling like paper, not screen. |
| **B** | Architectural blueprint (cyan-blue lines on dark) | `#5da7c4` | 1m major / 0.2m minor | Stronger blueprint metaphor. Risk: cyan competes with the terracotta provenance lines for the accent register; the eye reads two color systems instead of one. |
| **C** | Subtle dust-cream (faint cream, very low opacity) | `--ctx-paper` at 0.12 opacity | 2m major / 0.5m minor | Most restrained. Risk: grid recedes too much; the spec's "grounds the building in a working surface" goal weakens. |

**Recommendation: A** (warm-cream lines, vellum reading). Stroke width: 1.5px for major lines, 0.5px for minor. The grid plane is rendered in the R3F scene as a `<mesh>` with a procedural shader (similar pattern to the existing dot grid in `AtlasCanvasBackdrop.tsx`), positioned at y = 0 (the same plane the buildings sit on). Visibility falls off with camera distance via the shader's distance-based opacity term.

## Decision 3: Source card per-type visual identity

The spec at lines 36 to 38 prescribes: "Sanborn sheets render as faintly amber paper with sepia lines. Period photographs render as small framed images with chamfered edges. Directory entries render as typewritten cards. Text mentions render as quoted slips, italicized. Each source has a real visual identity tied to what it is in the physical world."

The atelier supports 7 source types per the GraphQL contract (`graphql-contract.md` Extension 2): Sanborn, Photograph, Directory / City Directory, Text Mention, HABS Record, Plat Map, Other. Per-type proposals:

| Type | Background | Border / frame | Typography | Icon |
|---|---|---|---|---|
| **Sanborn** | `#e8d8a8` (faint amber paper) | 1px sepia rule lines (`#6b4a2e` at 0.4 opacity) overlaid as horizontal hairlines at 4mm spacing | Body text: `--font-sans`; sheet-number chip: `--font-mono` | Folded-paper icon (lucide-react `FileText` rotated) |
| **Photograph** | `#f2efe6` (neutral paper) | Chamfered corners (8px cut on each of 4 corners; no border-radius); ~6px white border inside the chamfer, like a 1920s photo print | Body text: `--font-sans`; caption: `--font-sans italic` | Framed-photo icon (lucide-react `Image`) |
| **Directory / City Directory** | `#f4f1e8` (off-white typewriter paper) | None; subtle bottom horizontal rule (`#8a7155` at 0.3) at the card base | All text: `--font-mono` (IBM Plex Sans Condensed treated as monospace via the `--font-mono` token) | Typewriter icon (lucide-react `Keyboard`) |
| **Text Mention** | None (no card; the quoted slip floats) | None | Body text: `--font-sans italic`, slightly larger size; opens and closes with U+201C / U+201D quote glyphs in `--ctx-accent` | Quote-mark icon embedded in the text itself (no separate icon block) |
| **HABS Record** | `#eee8de` (government-archive paper) | 2px solid border in `#5471b7` (HABS blue, from existing palette `--current`) at 0.6 opacity | Body text: `--font-sans`; HABS reference chip: `--font-mono` | Government-archive icon (lucide-react `Archive`) |
| **Plat Map** | `#eef0ec` (drafting-vellum tone) | None; thin line-drawing border (1px in `#5a6677` at 0.5 opacity) | Body text: `--font-sans`; coordinates chip: `--font-mono` | Map-grid icon (lucide-react `Grid3x3` rotated 45°) |
| **Other** | `#f2f1ec` (neutral cream, same as `--ctx-paper`) | None | Body text: `--font-sans` | Default document icon (lucide-react `File`) |

All cards share: ~280px wide × ~120px tall on desktop (compressed to ~220×100 on mobile); 12px internal padding; rounded-[2px] corners (matches existing atlas card chrome); soft drop-shadow tuned for the atelier surface (the cards need to read as floating ON the dark paper, not flat against it): `box-shadow: 0 4px 12px -2px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.25)`.

Per-card content (consistent across types):

- Header: source name, year (small chip), confidence chip (only when confidence ≥ 0.85 the chip is hidden; per the visual-grammar-v1 60/90 threshold inverted for card display)
- Body: 1- to 2-line summary from the GraphQL `EvidenceItem.summary` field
- Footer (hover-revealed): "View source" affordance that opens a detail panel; "Cited in" links to the parts this source supports via the `targetNodeId` mapping
- Tooltip on hover: source title + year + "View source" affordance, per spec line 73

**Recommendation: ship all 7 type identities in v1 per the table above.** The visual differentiation is the spec's core ambition. Generic cards undermine the "each source has a real visual identity tied to what it is in the physical world" line.

Open question for the user: are the candidate hex values acceptable, or should the design specialist iterate to specific Sanborn amber and HABS blue references? The hex values above are first-pass approximations grounded in the physical references (Sanborn original sheets are tan-amber; HABS records carry the federal-blue letterhead); the design specialist can refine against actual scans.

## Decision 4: Dynamic island atelier entry chip icon

The spec at line 26 mentions options: "a small clock-overlay-on-building glyph, or a stippled building silhouette." A third option emerged from the design-gate synthesis: tracing-paper-over-building.

| Option | Glyph metaphor | Why |
|---|---|---|
| **A** | Clock-overlay-on-building | Literal "time-travel for a building"; spec's first option | Risk: clock metaphor reads as scheduling/calendar in the dynamic island context where Time tab is adjacent. |
| **B** | Stippled building silhouette | Literal "this is a (lost) building" treatment; spec's second option | Risk: reads as a generic building marker; does not differentiate atelier from "Place" tab |
| **C** (recommended) | Tracing-paper-over-building | Architectural workshop metaphor; nests the building inside a paper layer | Captures both "reconstruction" and "workshop" without conflicting adjacent tabs. Custom SVG (not in lucide-react); 16×16px |

**Recommendation: C** (tracing-paper-over-building). A small bespoke SVG glyph. Two strokes: a building silhouette in the back, a translucent paper rectangle overlaying it with slight rotation (5° clockwise), the building's roofline peeking through the top edge of the paper. Stroke color: `--ctx-ink` (the existing dynamic island foreground). The asset lives at `public/icons/atelier-icon.svg`; rendered inline in the island chip.

If the user prefers A or B (literal spec options), both work; the chrome impact is the same. The recommendation prioritizes differentiation from adjacent dynamic island affordances.

## Decision 5: Atelier surface layout architecture

The spec at lines 22 to 31 prescribes "the atelier takes over the viewport. The map, dynamic island, top bar all fade to a darker treatment, not invisible, but recessed."

The proposed layout:

```
+-----------------------------------------------------------------+
|  RECONSTRUCTING                                  Skip   Exit ↗  |  ← top chrome (24px above surface)
|  1500 N SAGINAW ST · CIRCA 1925                                 |
|                                                                  |
|                  [source card]                                   |
|                                                                  |
|     [source card]                          +------------------+  |
|                                            | RECONSTRUCTION   |  |
|                                            | DOSSIER          |  |
|              [BUILDING]                    |                  |  |
|              (centered)                    | MASS             |  |
|                                            | FACADE           |  |
|     [source card]                          | ROOF             |  |
|                                            | GROUND FLOOR     |  |
|                  [source card]             | ORNAMENTS        |  |
|                                            | CONFLICTS (1)    |  |
|                                            | SOURCES (5)      |  |
|                                            |                  |  |
|                                            | Replay  Save (v2)|  |
|                                            +------------------+  |
|                                                                  |
+-----------------------------------------------------------------+
            (paper grid plane extends through entire surface)
```

Specifics:

- **Building**: centered at approximately 40% horizontal, 50% vertical (slightly left of center to leave dossier room). Sits on the paper grid plane at y = 0. Camera positioned at 25-30° oblique angle, drifting through a 90° quarter-orbit during Stage 6 per `animation-choreography.md`.
- **Source cards**: arranged around the building footprint at coordinates corresponding to the source's geographic provenance (spec line 66). For Carriage Town with Whaley House: HABS card lands ~5m southeast of the building, Sanborn card lands ~7m northwest (where the Sanborn 1899 sheet was surveyed from). For evidence-poor parcels with 1-2 cards, the cards lean against the building from the camera-near side so they read as "what we have" rather than "where we put what we had."
- **Dossier panel**: 380px wide, anchored to the right edge, full-height, scrollable. Background `--atelier-paper-glow` (slight lift from base). Internal sections per spec lines 197 to 235.
- **Top chrome**: 56px tall strip at top. Left: "RECONSTRUCTING / 1500 N SAGINAW ST · CIRCA 1925" label in `--font-mono` uppercase tracked (matches existing dynamic island label treatment). Right: Skip button (icon + label, keyboard accessible via Escape), Exit button (icon + "Back to atlas").
- **Controls in dossier**: Replay button (always visible after Stage 7), Save button (disabled with "v2" tooltip per Decision 6 below).
- **Conflict markers**: render in 3D at the building part coordinates (no chrome containment); click opens a popover.

### Spatial composition rationale (design-theory anchors)

- **Figure-ground**: the dark surface and paper grid form the ground; the building and source cards are the figure. The contrast is non-negotiable; if the building does not glow against the surface, the spec's "museum pedestal" reading fails.
- **Visual hierarchy**: building > dossier > source cards > top chrome > paper grid. Sized and positioned accordingly. The building owns the largest visual mass; the dossier is a peer; cards are satellites; chrome is the frame.
- **Fitts's Law on controls**: Skip and Exit at top-right corner (always within ~80px reach); Replay inside the dossier (intentional — replay is a deliberate action, not an emergency).
- **Gestalt closure**: the source cards form a soft ring around the building, even when only 1-2 cards exist. The user reads "evidence surrounding the reconstruction."
- **Progressive disclosure**: the dossier collapses on small viewports (mobile: dossier becomes a drawer that the user expands explicitly; building takes the full screen by default).
- **Cognitive load**: the surface intentionally hides the atlas chrome (dynamic island, top bar) so the atelier feels like a dedicated workspace. Cognitive load is reserved for understanding the reconstruction, not for navigating chrome.

### Mobile (390×844) layout

- Top chrome: full width, 56px tall. "RECONSTRUCTING" label collapses to single line.
- Building: occupies the top 60% of the viewport, full width.
- Dossier: appears as a drawer at the bottom 40%, dismissible. User can swipe up to expand to full height. Per the existing mobile `MOBILE_SNAP_HEIGHTS` pattern in `PlaceDossier.tsx`.
- Source cards: render as a horizontal scroll strip below the building, full-width. Each card is ~260×100. Tap to expand.
- Conflict markers: render in 3D at building parts; tap shows a bottom-sheet popover.
- Skip / Exit: top-right of the top chrome, larger tap targets (44×44px minimum per iOS Human Interface Guidelines).

## Decision 6: Save button (LOCKED 2026-05-23: build with real backend wiring)

Spec line 169 says "Controls to replay the animation, exit the atelier, or save the reconstruction (in a future iteration, contribute corrections)." The parenthetical defers CORRECTIONS to v2; the base SAVE-the-reconstruction capability is in scope for v1.

The user confirmed at PT-001 approval time: "The back end should be able to save. There is the Axum Rust back end, and there's also the Postgres with PostGIS. Additionally, there will be a files SDK and a rusty red is being deployed now. So we should build the save button."

**Locked: build the save button with real backend wiring.** Smallest viable scope:

- Save = persist this reconstruction view (parcel + year + optional contributor email) so the user can return to it
- Follows the existing `submitObservation` mutation pattern (anonymous-but-receipt-able write): no auth required, optional contributor email for a receipt, server-side persistence via Axum to Postgres
- Returns a stable URL like `/open-flint-atlas/atelier/saved/<saved-id>` the user can bookmark or share
- Uses ONLY infrastructure that exists today: Axum + Postgres + PostGIS. Does NOT block on the files SDK (upcoming) or RustyRed graph DB (deploying)
- v2 extensions (per spec line 169 parenthetical): user-edited corrections persist alongside the save; this requires the files SDK + RustyRed graph state to land first

GraphQL contract: see `docs/plans/the-atelier/graphql-contract.md` Extension 7 (`saveReconstruction` mutation, `SavedReconstruction` type).

Implementation plan items: PT-103b (frontend `useReconstructionSave` hook), PT-104b (backend Axum mutation), PT-405 (controls component wires the Save button).

The earlier proposed "render disabled with v2 tooltip" option is superseded.

## Decision 7: Background veil for the under-island atlas

When the atelier is active, the spec at line 28 says "the map, dynamic island, top bar all fade to a darker treatment, not invisible, but recessed."

This is a transition-layer decision: how dark, how the atlas "shows through" the atelier surface.

**Recommendation: opacity 0.12 atlas underlayer with a 1.5s blur ramp on atelier-mount.** The atlas remains visible (the user has not navigated away; they have stepped into a workshop INSIDE the atlas) but is recessed sufficiently that the atelier reads as the primary surface. On atelier-unmount, the blur clears over 0.5s and the atlas returns to full opacity, with the reconstructed building now visible in the Lost Flint overlay (per spec line 246).

## Decision 8: Particle field for Stage 0 dust motes

Spec line 55 says "A faint dust-mote ambient particle field drifts, very slow."

Drawing on the existing `Dotted animation surface.md` pattern from the Theseus Design Components (a Three.js particle field with configurable spacing), the atelier dust motes:

- **Count**: ~40 particles (sparse; the spec says "faint")
- **Size**: 1.5px to 3px (varied; size correlates with depth)
- **Color**: `--atelier-ink-mute` at 0.4 opacity (warm cream, low contrast against the dark surface)
- **Motion**: vertical drift at ~0.05 units/sec; horizontal sway via subtle sin-wave at ~0.02 units/sec amplitude, ~10s period
- **Distribution**: spans the full atelier viewport; clusters slightly in the negative space around the building (not behind it; the building should not occlude its own ambient motes)
- **Reduced-motion**: removed entirely (the drift is the trigger; static motes would read as dirt on the screen)

The implementation uses an R3F `<points>` with `BufferGeometry` updated in `useFrame`, similar to the existing pattern in `Dotted animation surface.md` but at much lower particle count and with the atelier-specific palette.

## Theseus Design Components inherited

The atelier draws from these existing curated patterns rather than reinventing:

| Pattern | Used for | Reference file |
|---|---|---|
| Bento cards layout | Source-card geometry / hover lift / dashed-border treatment for the "Other" type | `Index-API/Theseus/Design Components/Bento cards layout.md` |
| Dynamic Island TOC | The motion idiom (framer-motion island transition); the dossier "Replay" button uses the CircleProgress pattern for atelier playback progress | `Index-API/Theseus/Design Components/Dynamic Island TOC.md` |
| Dotted animation surface | Stage 0 dust motes (lower particle count, atelier palette) | `Index-API/Theseus/Design Components/Dotted animation surface.md` |
| Glowing Shadow | Building's "lit from camera-right as if on a museum pedestal" (spec line 35); via R3F directional light + soft shadow | `Index-API/Theseus/Design Components/Glowing Shadow.md` |
| Tilt card | Source-card hover behavior (subtle 3D tilt response to cursor); ~2° max tilt to keep the cards reading as paper, not as gimmick | `Index-API/Theseus/Design Components/Tilt card.md` |
| Moving border | Terracotta provenance line draw-on animation during Stage 2 | `Index-API/Theseus/Design Components/Moving border.md` |
| Marketing hero | Top chrome label composition (the "RECONSTRUCTING / 1500 N SAGINAW ST · CIRCA 1925" treatment) | `Index-API/Theseus/Design Components/Marketing hero.md` |

This list is binding for implementation: PT-203, PT-204, PT-401, PT-402, PT-403 implementations must START from these primitives (not from scratch) and modify only where the atelier's requirements demand it.

## Tone and craft layer (impeccable discipline)

The atelier must not feel like a generic dark-mode UI. The first-order slop test (the user should not be able to guess "dark UI for a civic atlas" from the design alone) and the second-order slop test (the user should not be able to guess "AI-generated dark workshop aesthetic" from category-plus-anti-references) both apply.

To pass these tests:

1. **Material specificity**: the atelier's darkness is PAPER (warm graphite vellum), not GLASS (gray-tinted transparency), not METAL (cool-tinted brushed steel). Every detail (the grid pattern, the dust motes, the card materials) reinforces "paper workshop" rather than "tech product dark mode."
2. **No glassmorphism**: the dossier panel does NOT use `backdrop-filter: blur()` over a translucent fill. It uses a solid `--atelier-paper-glow` with a soft top border. Glassmorphism is a banned-by-impeccable default.
3. **No big-number hero**: the dossier panel does NOT lead with a large confidence percentage or a metric headline. Per-part rows are the dossier's structure (matches Lost Flint brainstorm Track 5 option 5c).
4. **No gradient text**: no `background-clip: text` + gradient on any label. The atelier register stays opaque.
5. **No identical card grid**: source cards have per-type identities (Decision 3) and are arranged geographically, not in a 2×N grid.
6. **No drop-shadow-everywhere**: shadows are reserved for source cards (which need to float) and the dossier panel (which needs to lift from the surface). The building does not get a synthetic drop shadow; it sits on the grid plane and casts a real R3F shadow from the directional light.
7. **No emoji, no decorative iconography**: every icon serves a purpose (per-type identity, control action, status indicator). The atelier is a workshop, not a marketing landing page.

## Decisions (LOCKED 2026-05-23, preserved for traceability)

| Decision | Locked answer |
|---|---|
| 1: `--atelier-paper` hex | **A** `#26221c` (spec literal) |
| 2: Paper grid style | **A** vellum warm-cream lines on graphite |
| 3: Source card identities | **Ship all 7** per the table in Decision 3 above |
| 4: Dynamic island atelier icon | **C** tracing-paper-over-building (spec did not pick; design-gate synthesis) |
| 5: Surface layout | **Approved as proposed** (building left-of-center, dossier 380px right, source cards at geographic-provenance positions, top chrome with Skip and Exit, dossier with Replay and **real Save**) |
| 6: Save button v1 | **C** (NEW): build with real backend wiring (`submitObservation`-style mutation, anonymous-with-optional-email receipt). See Decision 6 detail above |
| 7: Atlas underlayer veil | **Approved** (opacity 0.12 + 1.5s blur ramp on atelier-mount) |
| 8: Dust motes | **Approved** (~40 particles, warm cream, removed under reduced-motion) |

Atelier visual register is locked. PT-001 marked complete in the plan's task tracker. The implementation plan PT-201 (atelier CSS tokens) is the next executable item. The plan's design-gate compliance trace in `docs/plans/the-atelier/README.md` is updated to reflect approval.

## What this proposal does NOT cover

- **The exact SVG geometry for the dynamic island atelier icon (Decision 4)**: the proposal recommends Decision 4 option C as a concept; the actual SVG asset is produced when the implementation begins at PT-503 by an iconography specialist or pulled from a curated source.
- **The exact hex values for Sanborn amber and HABS blue (Decision 3)**: first-pass approximations are listed; the design specialist can refine against actual Sanborn-sheet scans and HABS letterhead during PT-401.
- **The sound design**: spec lines 74, 94, 161 mention optional sound; the atelier ships sound MUTED in v1 per the implementation plan, with the user opt-in control queued. Sound design is a v1.x track.
- **The thumbnail pipeline for source cards**: per the GraphQL contract, `EvidenceItem.thumbnailUrl` is optional; v1 cards render text-only until the thumbnail pipeline exists.
- **Animation-stage-specific easing curves and per-stage timing fine-tuning**: covered in `animation-choreography.md`. PT-002 (animation specialist proposal) handles further refinement.

End of proposal.
