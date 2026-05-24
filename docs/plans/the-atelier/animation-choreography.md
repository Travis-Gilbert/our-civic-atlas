# The Atelier: 8-Stage Reconstruction Animation Choreography

Generated 2026-05-23 as Deliverable E of the Atelier planning artifact.

This document specifies the 8-stage reconstruction animation in detail, per the spec at lines 51 to 170. It defines per-stage timing, easing curves, sub-event ordering, prefers-reduced-motion behavior, skip semantics, replay semantics, and the auto-play-at-1.5x policy for subsequent reconstructions in the same session.

The implementation specialist (`animation-pro:scene-animator`, `animation-pro:spring-engineer`, `animation-pro:camera-choreographer`, and `animation-pro:a11y-motion-auditor`) is REQUIRED to consult this document and the `~/.claude/skills/visual-work-design-gate/SKILL.md` forcing function BEFORE writing any animation code. The visual register decisions below trace back to the spec; the technical implementation is open for design-specialist refinement.

## Total timing budget verification

Spec line 49: "Total animation length: 6 to 8 seconds."

Sum of per-stage budgets from the spec:

| Stage | Budget | Spec line |
|---|---|---|
| Stage 0: Entry | 0.5s | 53 |
| Stage 1: Evidence gathering | 1.0s | 64 |
| Stage 2: Direct extraction | 1.5s | 78 |
| Stage 3: Block subgraph | 0.8s | 98 |
| Stage 4: Pairformer inference | 1.0s | 106 |
| Stage 5: Merge with conflict surfacing | 1.0s | 128 |
| Stage 6: Asset generation | 1.5s | 148 |
| Stage 7: Settled state (entry) | 0.2s | 162 |
| **Total** | **7.5s** | within 6 to 8 |

The 7.5s baseline lands at the upper-middle of the spec's tolerance. Stages can flex within ±100ms each during implementation tuning without breaking the spec; total stays in band.

## Choreographer architecture (frontend-side, v1)

The choreographer is a deterministic timeline driven by a single `ReconstructionDossier` payload (see `graphql-contract.md`). Per spec line 287, v1 ships against fixture data with a frontend-side synthesizer; the same choreographer drives real backend-emitted traces in v1.x without code changes.

Mental model: the choreographer is a series of timed "directives" that modify scene state. Each directive has a `startTimeMs`, `durationMs`, an `easing` curve, and a `payload` describing what changes. The atelier renders the scene at every frame by interpolating directive state. This is the same pattern used in `OpenFlintAtlasScene.tsx` lines 363 to 370 for camera easing under prefers-reduced-motion.

Technology stack (per existing project dependencies):

- `framer-motion` for 2D card animations (source cards arriving, dossier panel reveal), already in `package.json`
- R3F `useFrame` for 3D animations (camera glide, building fill-in, conflict marker placement), already in use in `AtlasThreeScene.tsx`
- R3F `Line` from `@react-three/drei` for terracotta provenance lines, already imported in `AtlasThreeScene.tsx`
- deck.gl `ConfidenceMixMeshLayer` for the building surface (existing per-part confidence shader)
- React Spring is NOT introduced; the existing motion stack covers every spec requirement and adding a third animation library violates the project's "no premature dependency" rule

The choreographer is a single module: `src/lib/atlas/atelier-choreographer.ts`. It exports:

```ts
type ChoreographerState = {
  stage: PipelineStage;
  stageStartedAt: number;
  stageProgress: number; // 0 to 1
  skipped: boolean;
  prefersReducedMotion: boolean;
};

function createChoreographer(opts: {
  dossier: ReconstructionDossier;
  onStateChange: (state: ChoreographerState) => void;
  prefersReducedMotion: boolean;
  playbackSpeed: 1.0 | 1.5; // 1.5 for subsequent reconstructions per spec line 175
}): {
  start(): void;
  skip(): void;
  replay(): void;
  dispose(): void;
};
```

## Easing curves

Default ease for cards, lines, and camera: `cubic-bezier(0.22, 1, 0.36, 1)`. This is the easing already used in `AtlasDynamicIsland.tsx` line 108 (`islandTransition`) and matches the spec's "slow and deliberate" language at line 43. Reuse keeps motion identity consistent across the atlas and the atelier.

Specific easings per sub-event are called out in the per-stage details below.

## Stage 0: Entry (0.5s)

**Spec backreference:** lines 51 to 62.

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 0 | 500 | Atelier surface fades in (background, paper grid, dust motes) | ease-out |
| 100 | 400 | Camera positions looking down at empty paper grid | ease-out |
| 200 | 300 | Label "RECONSTRUCTING / 1500 N SAGINAW ST · CIRCA 1925" fades in top-left | ease-out |

### Spec-bound details

- Background settles to atelier register (`--ctx-paper-night` or `--atelier-paper`, scoped: see `codebase-inventory.md`). DOES NOT change the atlas background; the atelier surface is a takeover element on top
- "Faint dust-mote ambient particle field drifts, very slow" (line 55). Implementation: a small `<points>` instance with ~40 particles, drifting at ~0.05 units/second on the Y axis. The drift continues throughout the animation, not just Stage 0
- Camera position: looking down (~70° pitch) at the empty paper grid where the building will eventually stand. This is similar to but distinct from the atlas `viewMode = "atlas"` rig (which is true-top-down); the atelier camera tilts forward so the eventual quarter-orbit in Stage 6 reads
- Label uses `--text-mono` style (uppercase, tracked, per spec line 56). In the existing token system this is the `font-mono` Tailwind class with `uppercase` and `tracking-[0.14em]` (the same treatment used in `AtlasDynamicIsland.tsx` for `MetaPill` labels)
- Label remains throughout the animation (spec line 63)

### Skip behavior

Skip at any point in Stage 0 jumps to Stage 7 settled state directly (no partial completion of subsequent stages).

### prefers-reduced-motion

- Fade-in collapses to instant render
- Dust-mote particle field is REMOVED entirely (not just stopped); ambient drift is a vestibular trigger
- Label appears immediately at full opacity
- Camera jumps to the Stage 6 final framing (a 30° quarter-orbit completion position) instead of starting at top-down and orbiting later. This keeps the building visible immediately

## Stage 1: Evidence gathering (1.0s)

**Spec backreference:** lines 64 to 77.

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 500 | 1000 | Source cards arrive in staggered sequence from off-screen | cubic-bezier(0.22, 1, 0.36, 1) |

For 5 source cards (the Carriage Town fixture maximum), arrival stagger is 100ms per card: cards arrive at t = 500, 600, 700, 800, 900 ms. Each card animates over the remaining 400ms, settling at its target position. Total stage closes at t = 1500.

For higher card counts (up to 12 per spec line 76), the stagger compresses to 60ms per card so the last card still arrives by t = 1500.

For lower card counts (1 to 2), the stagger extends to 200ms per card so each card has visual weight as it arrives.

### Spec-bound details

- Cards arrive from off-screen and settle at coordinates "around the building's eventual footprint" (line 65). Geographic provenance drives the resting position: a Sanborn sheet for this block lands northeast; a city directory referencing this address lands behind it as a stack; a period photograph from across the street lands on the opposite side (line 66)
- Card visual identity per `EvidenceType` (spec lines 36 to 38, see `graphql-contract.md`):
  - `SANBORN`: amber paper with sepia lines; folded-paper icon top-left
  - `PHOTOGRAPH`: small framed image with chamfered corners; framed-photo icon
  - `DIRECTORY` / `CITY_DIRECTORY`: typewritten card; typewriter icon
  - `TEXT_MENTION`: italicized quoted slip; quote-mark icon
  - `HABS_RECORD`, `PLAT_MAP`, `OTHER`: neutral paper card; default icon
- Each card carries (spec lines 68 to 73): icon, paper texture, confidence chip in `--text-micro` (renders as `font-mono text-[10px]` per the existing token system), tooltip on hover showing source title and year and "View source" affordance
- Optional sound (spec line 74): "soft paper-rustling sound (optional, needs sound design and accessibility-conscious mute default)". v1 ships sound MUTED by default; user opts in via a control inside the atelier. The sound asset is queued for the design-specialist hand-off but is not blocking
- For evidence-poor parcels with fewer than 5 cards, the user sees the scarcity directly (spec line 76). NO fake cards are added; honest empty-state is preserved. For Whaley House's actual data (2 sources: HABS MI-318 + Sanborn 1899 sheet 18), exactly 2 cards arrive

### Skip behavior

Skip during Stage 1 places cards instantly at their resting positions (no in-flight cards) and jumps to Stage 7.

### prefers-reduced-motion

- Cards appear at their resting positions instantly (no flight path)
- The stagger collapses to 0ms; all cards appear in the same frame
- Stage duration collapses to ~150ms (just enough to fade in the card opacity from 0 to 1 with a snap)

## Stage 2: Direct extraction (1.5s)

**Spec backreference:** lines 78 to 96. Spec calls this "the defining sequence."

### Sub-events

Each source sends a wireframe line to the building footprint. Order matches the spec's confidence ordering (line 82 to 92):

| t (ms) | duration (ms) | event | from | deposits |
|---|---|---|---|---|
| 1500 | 280 | First Sanborn line arrives | Sanborn card (highest confidence) | Building footprint wireframe + ghost-wireframe walls |
| 1780 | 50 | Beat | — | — |
| 1830 | 250 | Second Sanborn line arrives | Sanborn (different sheet) | Material color wash + roof outline wireframe |
| 2080 | 50 | Beat | — | — |
| 2130 | 230 | Photograph line arrives | Photograph card | Story count + height with ±range indicator + bay rhythm wireframe ticks |
| 2360 | 70 | Beat | — | — |
| 2430 | 200 | Directory line arrives | Directory card | Ground-floor use label ("BAKERY", "DRY GOODS", etc.) |
| 2630 | 70 | Beat | — | — |
| 2700 | 200 | Text mention line arrives (if present) | Quote slip | Ornament markers (terracotta dots at cornice line) |
| 2900 | 100 | Settle | — | — |

Total Stage 2: 1500 → 3000, duration 1500ms. Per-line duration is the spec's "200-300ms to draw" (line 94); per-beat is the spec's "50-100ms of beat between" (line 94).

For Carriage Town's fixture, only Whaley House and Storefront have ≥ 2 source types; the rest deposit fewer lines. Stage 2 timing adapts:

- 1 source: line draws over 600ms, settle 900ms
- 2 sources: lines at 600ms each + 50ms beat, settle 250ms
- 3 to 5 sources: full schedule above
- 6+ sources: stagger compresses to fit within 1500ms

The choreographer reads the actual `EvidenceItem[]` and schedules accordingly. No fake lines.

### Spec-bound details

- Each line is "terracotta, half-opacity" (line 81): color `--ctx-accent` (terracotta) at `opacity: 0.5`. Implementation: R3F `Line` from `@react-three/drei` with `transparent: true`, `opacity: 0.5`
- "As each line lands, it deposits a partial structure" (line 81). Implementation: each line's tail-arrival point triggers a side-effect (footprint wireframe appears, then wall wireframe, then material wash, etc.). The visual choreography is two-track: the LINE animates from card to footprint, and the BUILDING geometry grows/changes as the line arrives
- "Each deposit is accompanied by a brief soft thrum, felt more than heard" (line 94). v1 ships sound MUTED. Sound design hand-off for v1.x
- "Confidence: 0.92" etc. (line 84 onward) ARE the actual values from the fixture or the resolver; not invented for the animation. The atelier surfaces the real numbers

### Skip behavior

Skip during Stage 2 instantly applies all line deposits (full wireframe + material wash + bay ticks + ground-floor label + ornament markers visible) and jumps to Stage 7.

### prefers-reduced-motion

- Lines do NOT animate; deposits appear at the building location simultaneously
- The 200-300ms per-line draws collapse to a single 200ms cross-fade where all deposits appear at once
- Stage duration collapses to ~250ms

## Stage 3: Block subgraph (0.8s)

**Spec backreference:** lines 98 to 104.

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 3000 | 250 | Neighboring buildings highlight (ghost-wireframes appear around focus) | ease-out |
| 3000 | 500 | Connection lines shimmer between focus and 3 to 5 neighbors, with relation chips | cubic-bezier(0.22, 1, 0.36, 1) |
| 3000 | 600 | Chip labels fade in next to each connection line ("adjacent_to", "fronts_street", "anchored_by", etc.) | ease-out |
| 3500 | 300 | Connection lines fade away; neighbor wireframes recede to low opacity | ease-in-out |

Total Stage 3: 3000 → 3800, duration 800ms.

### Spec-bound details

- Connection lines use the same terracotta `--ctx-accent` at 0.5 opacity as Stage 2 provenance lines, but shimmer once (a pulse from focus outward) to distinguish them as relations, not extractions
- Relation chips read the relation labels from the `BlockSubgraph.neighbors[].relation` field. Civic-language map applies (per the Lost Flint brainstorm T6): if the relation vocabulary needs civic translation for visibility, the chip uses the translated label; the technical relation stays in the data layer
- After Stage 3, neighbor wireframes stay at ~0.2 opacity so the user retains spatial context (spec line 104: "Neighboring wireframes recede to a low opacity but remain visible. The graph is shown; it doesn't dominate.")

### Skip behavior

Skip during Stage 3 instantly resolves to the final state (neighbors at low opacity, connection lines gone) and jumps to Stage 7.

### prefers-reduced-motion

- Connection-line shimmer is removed; chips and lines appear in place at full opacity then fade out together
- Stage duration collapses to ~200ms (a brief cross-fade)

## Stage 4: Pairformer inference (1.0s)

**Spec backreference:** lines 106 to 126.

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 3800 | 200 | Screen darkens slightly (background opacity shifts ~8% toward the atelier-night token) | ease-in |
| 3800 | 800 | Computational pulse: two soft expanding rings centered on focus building | ease-out (per ring) |
| 4000 | 600 | Missing details solidify: window-bay openings, roof pitch transition, story-count adjustments, material details | cubic-bezier(0.22, 1, 0.36, 1) |
| 4400 | 400 | Side-panel "PRIORS APPLIED" label updates (Pairformer v0.2, Confidence overlay ON) | fade-in |

Total Stage 4: 3800 → 4800, duration 1000ms.

### Spec-bound details

- The two pulses radiate sequentially: first pulse 3800 to 4200, second pulse 4200 to 4600 (one ring of each: outer + inner). Both use the same `--ctx-accent` color at low opacity
- Window-bay solidification (line 113): high-confidence bays transition from wireframe ticks to rectangular openings; low-confidence bays STAY as ghost ticks. The visible confidence cue is non-negotiable per spec line 117: "anything inferred renders with a visible 'I'm a guess' treatment." Implementation: the `ConfidenceMixMeshLayer` shader's per-bay confidence drives the porcelain proportion
- Roof pitch (line 114): high-confidence pitch transitions to its inferred angle; low-confidence remains "ambiguous with a flickering indicator." Implementation: a 600ms low-amplitude oscillation on the roof mesh's vertical scale (e.g., ±5% at 4 Hz) for confidences below 0.6
- Story-count adjustment (line 115): if the model disagrees with the photograph, the building height re-animates to the resolved value. This generates a `MergeConflict` in Stage 5 if the disagreement was non-trivial
- "PRIORS APPLIED" label uses the same `--text-mono` style as the Stage 0 RECONSTRUCTING label, but appears in the side panel rather than the top-left

### Skip behavior

Skip during Stage 4 instantly applies all inferred details (no pulse, no flicker) and jumps to Stage 7.

### prefers-reduced-motion

- Pulse rings are REMOVED entirely (radial motion can be vestibular-triggering)
- Inferred details cross-fade in over 200ms (no per-detail timing)
- Flickering indicator for low-confidence parts is REPLACED with a static ghost-wireframe style; the visible confidence cue is preserved without motion
- Side-panel label fade-in collapses to instant
- Stage duration collapses to ~250ms

## Stage 5: Merge with conflict surfacing (1.0s)

**Spec backreference:** lines 128 to 146.

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 4800 | 600 | Conflict markers appear at each disagreement point on the building | ease-out |
| 4800 | 1000 | Markers settle (stay visible thereafter) | cubic-bezier(0.22, 1, 0.36, 1) |

Total Stage 5: 4800 → 5800, duration 1000ms.

### Spec-bound details

- Each conflict marker is a small terracotta dot at the geometry coordinate of `MergeConflict.targetNodeId`'s part. Marker placement uses the Pascal-node-tree addressing: for `reconstruction-node:...:facade`, the marker hovers at the midpoint of the facade face; for `:roof`, at the roof's centroid; etc.
- Marker click reveals the disagreement detail panel per spec lines 134 to 141. Implementation: a small popover anchored to the marker, listing each `MergeDisagreement` (source name, stated value, confidence) and the `resolutionExplanation`
- Markers stay visible as long as the atelier is open (spec line 144). They are interactive at any time after Stage 5
- "No conflicts (a fully consistent set of evidence)" results in zero markers; the merge stage is "a silent half-second" (spec line 146). For evidence-poor parcels (single source), conflict counts are zero by definition. The Carriage Town fixture's Whaley House could have a stories-or-roof-material conflict if the HABS record disagrees with the Sanborn 1899 sheet 18; this depends on backend output. Honest behavior: if conflicts are zero, no markers; the stage runs silent

### Skip behavior

Skip during Stage 5 instantly places all markers and jumps to Stage 7. Markers remain interactive in Stage 7 regardless.

### prefers-reduced-motion

- Markers appear at their positions instantly (no ease-out flight)
- Stage duration collapses to ~200ms

## Stage 6: Asset generation (1.5s)

**Spec backreference:** lines 148 to 160. Spec calls this "the cinematic moment."

### Sub-events

| t (ms) | duration (ms) | event | easing |
|---|---|---|---|
| 5800 | 400 | Wireframe walls fill with material color at full opacity | ease-in |
| 5900 | 400 | Wireframe roof completes with inferred pitch and material | ease-in |
| 6100 | 300 | Window openings deepen from outlines to actual recesses | ease-out |
| 6300 | 400 | Ornaments emerge as subtle relief (cornice line, sill courses) | cubic-bezier(0.22, 1, 0.36, 1) |
| 6400 | 600 | Camera glides slowly in a quarter-orbit around the building | ease-in-out |
| 6500 | 800 | Faint paper-sketch outline persists around the building | cross-fade |
| 6800 | 500 | Background ambient lighting brightens by 10-15% | ease-in |

Total Stage 6: 5800 → 7300, duration 1500ms.

### Spec-bound details

- The wall fill is the moment the `ConfidenceMixMeshLayer` shader transitions from wireframe-mode to full-mesh-mode. For procedural buildings (no glTF), this is a porcelain-vs-faithful mix per the existing shader. For glTF assets (when they exist), the `ScenegraphLayer` swaps in
- Camera quarter-orbit (spec line 158): the camera was near-static through Stages 0-5; in Stage 6 it eases through a 90° arc around the building at constant distance. This is the spec's "drone-shot aesthetic, not a first-person aesthetic" (line 43). Implementation: a 600ms `camera.position.lerp` along a circular path centered on the building, with `lookAt` locked to the building's centroid
- Background lighting brightens by 10-15% (spec line 161): "the ambient light intensity in the R3F scene transitions from ~0.8 (atelier-darker) to ~0.92 (atelier-finished). The directional fill light from camera-right brightens proportionally
- Optional finishing sound (spec line 161): "a soft single tone, like a hand placing the model on a table." v1 ships sound MUTED; queued for sound design v1.x

### Skip behavior

Skip during Stage 6 instantly completes the asset generation: walls filled, roof completed, openings deepened, ornaments emerged, camera at the quarter-orbit final position, ambient lighting at its higher value. Jumps to Stage 7.

### prefers-reduced-motion

- Wall fill, roof completion, opening deepening, and ornament emergence cross-fade together over 400ms (no per-sub-event ease)
- Camera quarter-orbit is REPLACED with a 200ms jump to the final position (no orbit)
- Background lighting brightens over 300ms (preserved, not motion-triggering)
- Stage duration collapses to ~500ms

## Stage 7: Settled state (0.2s + persistent)

**Spec backreference:** lines 162 to 170.

### Sub-events

| t (ms) | duration (ms) | event |
|---|---|---|
| 7300 | 200 | Dossier side panel fades to full opacity |
| 7300 | 200 | "PRIORS APPLIED" label transitions to "RECONSTRUCTED" label |
| 7300 | persistent | Reconstruction at center, source cards on periphery, conflict markers on building, dossier panel on the right, replay/exit/save controls |

Total Stage 7 entry: 7300 → 7500, duration 200ms. Animation ends at t = 7500. State is persistent thereafter.

### Spec-bound details

- The user is left looking at (spec lines 164 to 170):
  - The completed reconstruction at the center
  - Source cards arranged around the periphery, still clickable
  - Conflict markers on the building, still clickable
  - A side panel showing the full reconstruction spec
  - Controls to replay the animation, exit the atelier, or save the reconstruction (v2)
- Source cards in Stage 7 are at their Stage 1 resting positions, still interactive
- Conflict markers from Stage 5 are still in place, still interactive

### Skip target

Stage 7 IS the skip target. Skipping at any earlier stage jumps directly to Stage 7's persistent state.

### prefers-reduced-motion

- Dossier panel appears instantly at full opacity
- Label transition is instant

## Skip and replay semantics

**Spec backreference:** lines 172 to 176.

### Skip

- A tap, click, or keypress at any point during the animation jumps to Stage 7 (settled state)
- Skip is bound to: the Escape key, single-tap on the atelier surface (away from source cards or conflict markers), or click on the "Skip" button in the bottom-right of the atelier surface
- Source card clicks and conflict marker clicks are NOT skip triggers; they open their respective detail views
- After skip, the user is in Stage 7 with all interactive elements intact

### Replay

- "Replay reconstruction" button appears in the side panel in Stage 7
- Clicking it resets the choreographer to t = 0 and plays the full sequence again
- Replay always plays at full duration (7.5s), regardless of the subsequent-reconstruction auto-play policy below

### Subsequent-reconstruction auto-play at 1.5x

**Spec line 175 to 176:** "After the user has seen one reconstruction animation in a session, subsequent reconstructions of other buildings auto-play at 1.5x speed unless the user explicitly requests full-length replay. The first reconstruction is the showcase; subsequent ones get the substance without re-spending the user's attention."

Implementation:

- `sessionStorage` flag `atelier-has-seen-one-reconstruction` set to `true` after the first Stage 7 settle
- Subsequent atelier opens construct the choreographer with `playbackSpeed: 1.5`
- All stage durations scale by 1/1.5 (so total drops to ~5.0s)
- Easing curves are preserved (the visible motion still feels intentional, just faster)
- Replay button always plays at 1.0x regardless of the session flag
- Clearing the session (page refresh, new tab) resets the flag

## prefers-reduced-motion: total budget

Spec line 350 in `visual-grammar-v1.md`: "Reduced motion: the island shape-shift between compressed and expanded uses motion that respects `prefers-reduced-motion`. Reduced-motion fallback is an instant state change."

For the atelier, "instant state change" is too aggressive (the user loses the per-stage narrative entirely). Instead, prefers-reduced-motion collapses each stage as documented above. Total reduced-motion animation length:

| Stage | Reduced duration |
|---|---|
| 0 | 0ms (jump to Stage 6 final framing) |
| 1 | ~150ms (card opacity fade) |
| 2 | ~250ms (deposit cross-fade) |
| 3 | ~200ms (line fade) |
| 4 | ~250ms (detail cross-fade) |
| 5 | ~200ms (marker placement) |
| 6 | ~500ms (cinematic-moment cross-fade + lighting) |
| 7 | 200ms |
| **Total reduced** | **~1750ms** |

Under reduced-motion, the atelier still tells the same per-stage story but in ~1.75s instead of 7.5s. No motion that would trigger vestibular reactions (pulse rings, camera orbit, in-flight cards, flickering ambiguity indicators).

## Accessibility validation gates

The animation specialist (`animation-pro:a11y-motion-auditor`) audits these gates before the animation ships:

- [ ] prefers-reduced-motion fallback is tested and the total reduced-motion length is ≤ 2 seconds
- [ ] No motion exceeds 3 Hz oscillation (vestibular safety threshold)
- [ ] Camera orbit motion has an explicit reduced-motion fallback (jump cut)
- [ ] All animated elements have an accessible static state (a screen reader announces "reconstruction is being assembled, stage 4 of 8" or equivalent)
- [ ] Skip button is keyboard-focusable from Stage 0 onward
- [ ] Source cards and conflict markers are keyboard-navigable in Stage 7
- [ ] No content is conveyed by motion alone (color, label, position also convey the same information)
- [ ] WCAG 2.2 AA contrast on all text overlays against the `--atelier-paper` background

## Implementation file map

These files materialize the choreography. Each goes through the design gate per `~/.claude/skills/visual-work-design-gate/SKILL.md` before code is written.

| File | Purpose |
|---|---|
| `src/lib/atlas/atelier-choreographer.ts` | The deterministic timeline and state machine |
| `src/lib/atlas/atelier-stage-timings.ts` | Constants: per-stage durations, easings, sub-event offsets |
| `src/components/atlas/atelier/AtelierSurface.tsx` | The takeover surface; mounts the R3F canvas, side panel, source cards |
| `src/components/atlas/atelier/AtelierR3FScene.tsx` | The R3F scene for the atelier; camera rig, building meshes, conflict markers, provenance lines, dust motes |
| `src/components/atlas/atelier/AtelierEvidenceCard.tsx` | Source card with type-dispatched visual identity |
| `src/components/atlas/atelier/AtelierConflictMarker.tsx` | Terracotta marker + popover |
| `src/components/atlas/atelier/AtelierProvenanceLine.tsx` | Terracotta evidence-to-part line (R3F Line) |
| `src/components/atlas/atelier/AtelierDossierPanel.tsx` | Side panel with per-part spec and source list |
| `src/components/atlas/atelier/AtelierControls.tsx` | Skip / replay / exit / save buttons |
| `src/components/atlas/atelier/AtelierDustMotes.tsx` | Ambient particle field |
| `src/app/open-flint-atlas/atelier/atelier.css` | Atelier-scoped CSS tokens, including `--atelier-paper` (the warm graphite) |
| `src/app/open-flint-atlas/atelier/[parcelId]/[year]/page.tsx` | The atelier route |

End of animation choreography.
