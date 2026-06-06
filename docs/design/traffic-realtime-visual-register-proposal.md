# Realtime Traffic Flow: Visual Register Design Proposal

Status: **UPDATED 2026-06-06 / Anime.js renderer required**. Design-gate deliverable for the on-map
traffic flow render. Routed through the visual-work design-gate forcing function
(`~/.claude/skills/visual-work-design-gate/SKILL.md`) and the project posture in
`AGENTS.md`. A first render is already implemented through the
GraphQL-canonical `useTrafficRealtime` hook with a REST fixture fallback; this
document is the gate for hardening it before the traffic slice is treated as
product-ready.

This proposal honors the existing register rather than inventing one. It anchors
to: `docs/design/visual-grammar-v1.md` (the provenance + confidence contract,
"Color is never the only signal," "No Fake UI"), the two approved atelier
proposals (`atelier-animation-proposal.md`, `atelier-visual-register-proposal.md`)
for the locked motion vocabulary and craft discipline, and the `.civic-atlas`
tokens in `src/app/open-flint-atlas/atlas.css`.

## What already exists (this is a hardening pass, not greenfield)

A first traffic slice is already in the tree. The proposal's job is to formalize
and correct it, not to start over:

- **Canonical data source + render view model**:
  `src/lib/atlas/use-traffic-realtime.ts` fetches canonical GraphQL
  `trafficRealtime(networkId)` data and adapts it into
  `TrafficRealtimeSnapshot`, the render-ready GeoJSON view model defined in
  `src/lib/api/openFlintAtlas.ts`. The REST route
  `/api/v2/theseus/open-flint-atlas/traffic/realtime` remains a dev /
  resolver-not-ready fallback only.
- **Main map component**: `src/components/atlas/AtlasMap.tsx`, loaded through
  `ResponsiveAtlasMap` and mounted by `src/components/atlas/OpenFlintAtlasScene.tsx`.
  deck.gl composes onto MapLibre via `MapboxOverlay` + `useControl`
  (`DeckGLOverlay`, AtlasMap.tsx line 873). This is where `createLostFlintDeckLayers`
  and every other deck layer attach. **The traffic render mounts here, not in a new file.**
- **Render-in-flight**: AtlasMap.tsx carries `trafficColor` and `trafficWidth`,
  a deck.gl `GeoJsonLayer` (`atlas-traffic-flow-segments`) for static solid
  segment strokes / picking, and an Anime.js SVG overlay
  (`AnimeTrafficFlowOverlay`, `data-traffic-renderer="animejs"`) for moving
  flow particles. The old hand-rolled `createTrafficParticles` +
  `ScatterplotLayer` path has been retired.
- **Panel**: `src/components/atlas/TrafficFlowPanel.tsx` renders the snapshot as a
  data panel inside the dynamic island (no map motion).
- **Contract to harden**: the render reads the adapted view-model shape
  (`congestion_ratio`, `volume_per_hour`, `estimate_basis`, `source_status`).
  The hook owns GraphQL polling and REST fallback, so the render layer does not
  need to know whether a snapshot came from the backend resolver or a fixture.

So "the new visual surface" is concretely: **the animated flow render of the
traffic snapshot, made contract-correct, support-honest, token-disciplined, and
reduced-motion-safe.** The panel is done; the motion is not.

## The central tension this proposal resolves

The handoff (`CIVIC-ATLAS-TRAFFIC-DOMAIN-HANDOFF.md`) names Anime.js because it
is the sourced renderer Travis wanted, not an interchangeable example. Project
rule captured 2026-06-06: **when Travis lists a specific library in a handoff,
that library is a requirement unless he explicitly says it is illustrative.**

The implementation tension is therefore not "Anime.js versus deck.gl." It is
how to honor Anime.js while preserving the atlas map stack. The resolved shape:
MapLibre remains the geographic camera and deck.gl keeps the static,
source-status-aware road segment layer for picking; Anime.js owns moving flow
particles through `svg.createMotionPath()` over projected SVG road paths.

---

## Decision 1: Surface vs layer -> **toggleable LAYER on the main atlas map**

**Recommendation: a layer on the existing main atlas map, not a standalone route.**

The handoff frames traffic as flow "on the map," modulating particle density and
speed over the road network. The atlas map already owns the deck.gl `MapboxOverlay`
stack, the Mosaic/DuckDB `timeFilter` selection (`OpenFlintAtlasScene.tsx` line
631), the dynamic island, and the layer-visibility map (`layerVisibility.traffic`,
already referenced at AtlasMap.tsx line 1734). A standalone `/open-flint-atlas/traffic/`
route would fork all of that: a second map instance, a second camera, a duplicate
basemap, a second copy of the layer-compose memo. visual-grammar-v1 Principle 2
("Map is primary; chrome is minimal") and Principle 6 ("Time is a first-class
navigation dimension") both point at one map that gains a dimension, not a sibling
map.

IA / navigation implication:

- Traffic is a **layer toggle**, surfaced wherever layer visibility lives today
  (`LayerControls`), reading "Traffic flow." It is OFF by default (motion is
  opt-in; see Decision 6).
- When the layer is ON, the dynamic island's expanded state holds the existing
  `TrafficFlowPanel` (already wired at `OpenFlintAtlasScene.tsx` line 1124),
  which absorbs per-segment detail. No new side panel (Principle 3: the island is
  the universal chrome).
- This composes with time-travel and scenario branching for free: the same map
  that scrubs years and renders Lost Flint can later replay historic AADT and
  scenario-diff flow on the identical segment geometry (the handoff's milestones 2
  and 3), with no second surface to keep in sync.

The only argument for a standalone surface is a future "traffic studio" with
scenario-authoring tools. That is the SUMO before/after work (handoff milestone
2), not this realtime slice. If it ever lands it can reuse this layer as its
render; it does not justify a route now.

## Decision 2: Renderer -> **Anime.js motion paths over projected SVG road paths**

**Decision: use Anime.js for moving traffic flow.** Specifically: keep a dual
layer, but split responsibilities deliberately:

- deck.gl `GeoJsonLayer` remains the static road segment layer. It carries
  congestion color, source-status opacity, selected-segment picking, and the
  reduced-motion fallback.
- Anime.js renders the moving particles in an absolutely-positioned SVG overlay.
  Each traffic segment LineString is projected from `[lng, lat]` into a
  screen-space `<path>`, then each flow particle calls
  `svg.createMotionPath(pathElement, offset)` and `animate(..., { loop: true })`.

This honors the handoff sentence directly: **`createMotionPath` displays; SUMO
models.** The frontend does not compute traffic. It receives segment volume,
speed, free-flow speed, source status, and provenance; Anime.js turns those
already-computed values into motion. Volume sets particle count. Speed sets tween
duration. Provenance controls stroke/fill treatment.

Implementation caveat: the SVG paths are screen-space, so they must be rebuilt
when MapLibre camera state changes. `AtlasMap` now uses the map's `project()`
method to regenerate path geometry on move/zoom/pitch/bearing changes, then
Anime.js is scoped and reverted through React cleanup.

Geometry caveat: Anime.js only follows the path it receives. The current preview
fixture uses six coarse corridor LineStrings, while the atlas already has a
checked-in OSM street-centerline layer with local, collector, and arterial road
features. If a traffic path cuts through blocks, the fix is to trace or snap the
traffic segment to street-centerline geometry before rendering; the Anime.js
motion-path code can stay unchanged.

## Decision 3: Encoding (volume -> density, speed -> duration, congestion -> color)

The handoff's contract is binding: **volume drives particle count, speed drives
tween duration.** REST fields are `volume_per_hour`, `speed_mph`,
`free_flow_speed_mph`, and `congestion_ratio`.

### Volume -> flow density

Map `volume_per_hour` to the number of flow heads seeded along the segment's
path. A legible, non-saturating curve (refining the existing line 845 logic,
which already does `volume / 360` clamped to 1-8):

```
heads = clamp(round(volume_per_hour / 350), 1, 8)
```

Rationale: ~350 veh/hr per visible head keeps a quiet residential street at 1-2
heads and a saturated arterial (~2800+ veh/hr) at the 8-head ceiling. The ceiling
matters: past ~8 heads on a short downtown segment the dots merge into a smear and
stop reading as discrete traffic. For Anime.js, "heads" = the count of
staggered DOM/SVG particles attached to the same `createMotionPath` path
(phase-offset by `i / heads`). When `volume_per_hour` is missing or zero, heads
= 0 and only the road stroke renders.

### Speed -> tween duration

Map the speed *deficit* (how far below free-flow) to traversal duration, so slow
traffic visibly crawls and free traffic zips:

```
ratio          = clamp(speed_mph / max(free_flow_speed_mph, 1), 0.1, 1) // 1 = free flow
base_duration  = lerp(2.0s, 9.0s, 1 - ratio)                          // free=2.0s, jammed=9.0s
duration       = base_duration / 0.4                                  // reduce visual speed by 60%
```

So a free-flow segment now traverses in ~5s, and a stop-and-go segment takes
~22.5s. This keeps the exact "congested street carries many slow particles, free
one carries few faster ones" reading, but calms the display after Travis's
2026-06-06 request to reduce perceived flow speed by about 60%. In Anime.js
terms, duration is the per-particle tween duration passed to `animate(..., {
duration, loop: true, ...svg.createMotionPath(path, offset) })`. Falls back to
the `congestion_ratio` midpoint duration when `free_flow_speed_mph` or
`speed_mph` is null.

### Congestion -> color, within the existing token palette

The numeric `congestion_ratio` maps into five display bands that use tokens the
atlas already defines. The in-flight render uses raw RGBA constants (AtlasMap.tsx
lines 283-286) that *already equal* existing tokens; this proposal names them so
the traffic register is a re-use, not a new color system. **No new hex is
introduced.**

| Display band | Token (in `atlas.css`) | Hex | Reading |
|---|---|---|---|
| `FREE_FLOW` | `--atlas-infrastructure` | `#4a8a82` (teal) | moving freely; the calm/cool end |
| `LIGHT` | `--typology-commercial` | `#4a8a82` blended toward warning | light load |
| `MODERATE` | `--atlas-warning` | `#c08a3a` (amber) | building |
| `HEAVY` | `--ctx-accent` | `#c14a2c` (terracotta) | congested; the atlas's existing "hot/attention" accent |
| `STOP_AND_GO` | `--ctx-commit` | `#6b2c33` (deep oxblood) | the densest, slowest, darkest end |
| `UNKNOWN` | `--ctx-ink-faint` | `#a89c84` (muted paper-ink) | no band; reads as inert, not as a state |

This is a cool-to-hot ramp (teal -> amber -> terracotta -> oxblood) that the eye
already reads as "good -> bad" and that sits legibly on the warm-paper basemap
(`--ctx-paper #f2f1ec`). It deliberately reuses the accent (`--ctx-accent`) the
atlas already spends on "attention," so congested traffic feels native to the
surface rather than a foreign heatmap. Per visual-grammar-v1 Principle 7 ("Color
is never the only signal"), congestion is ALSO encoded by particle density
(volume) and crawl speed (duration) and line width, so a color-blind user reads
congestion from motion and thickness even if the hue is ambiguous. The five bands
must still pass a Deuteranopia/Protanopia/Tritanopia sim before lock (the
teal/amber/terracotta separation is the at-risk pair).

Road-stroke width keeps the existing `trafficWidth` intent (volume-driven, clamped
2-11px) so the static stroke also carries volume even when motion is off.

## Decision 4: Provenance rendering (the honesty gate -> binding "No Fake UI")

This is the load-bearing decision. visual-grammar-v1 Principle 1 ("Trust through
signals") and the realtime REST contract's `source_status`, `estimate_basis`,
`confidence`, and `support_note` fields make support non-optional. Motion is
seductive; moving dots *read as live* whether or not they are. The treatment must
make live readings visibly different from fixture or pending-live estimates, and
must make a whole-snapshot `status: fixture_fallback` impossible to miss.

**Per-segment treatment** (encoded by solid-line opacity + dot fill, not color
alone, so it survives the congestion color ramp):

| `source_status` / `estimate_basis` | Road stroke | Flow heads | Reading |
|---|---|---|---|
| `live` / `live_feed` | **solid** line, highest opacity | **solid** filled heads, full opacity, crisp white 1px ring | "a source saw this" |
| `pending_live_source` / `hourly_pattern` | **solid** line, medium opacity | **hollow** heads (stroked ring, no fill) | "we can map the corridor, but the live source is not wired yet" |
| `fixture` / `hourly_pattern` | **solid** line, low opacity | **faint** heads, ~50% opacity, no ring | "fixture/time-of-day estimate for preview" |
| missing or unavailable | **hairline ghost** stroke in `--ctx-ink-faint`, no motion | **none** | "no usable traffic reading here"; the road shows but never animates |

The solid-line opacity vocabulary keeps the dense street network legible while
still making support visible: live reads strongest, pending reads softer, and
fixture reads provisional. confidence (0..1) modulates opacity within a band as
a secondary cue (a low-confidence live segment is slightly more translucent),
never overriding the source-status tier.

**Whole-snapshot `status: fixture_fallback`** (the misleading-the-user failure mode):

1. **Chrome label, always present when the layer is on.** A small status chip in
   the traffic layer's chrome and at the top of `TrafficFlowPanel`, in
   `--font-mono` uppercase tracked (matching existing atlas label treatment):
   - `status: live` -> `LIVE FEED` with `source_label` and relative age from
     `generated_at` / segment `observed_at`.
   - `status: fixture_fallback` -> `FIXTURE ESTIMATE - NOT A LIVE FEED`, never
     the word "live" by itself, using each segment's `support_note` verbatim
     where useful.
   This replaces the in-flight panel's softer "fixture fallback" / "feed-shaped
   fixture" wording (TrafficFlowPanel.tsx lines 26-40), which is too gentle for a
   moving-dots surface. The REST snapshot already supplies the honest strings;
   render them.
2. **Motion damping under no-live-feed.** When `status: fixture_fallback`, the
   flow runs at reduced opacity and the road strokes use lower-opacity solid
   lines. The surface should *feel* provisional, not authoritative. A confident,
   crisp, high-opacity flow is reserved for `source_status: live` data.
3. **A legend** (collapsible, in the layer chrome or island) mapping the five
   congestion colors AND the source-status opacity tiers. The legend is the
   non-motion key that makes the encoding learnable and is also the reduced-motion
   fallback's primary teaching surface (Decision 6).

Plain civic language throughout (visual-grammar-v1 Principle 5): "where this came
from," not "provenance"; "estimate," "measured," and "live source" are fine
civic words; "epistemic" and raw enum names never reach the UI.

## Decision 5: Time scrubber -> **build a thin shared primitive now; wire traffic + historical, stub the seam for the rest**

The handoff wants ONE scrubber across traffic temporal playback, PorchFest band
scheduling, and historical reconstruction. The atlas already has the temporal
substrate: the Mosaic/DuckDB `timeFilter` selection (`OpenFlintAtlasScene.tsx`
line 631) and the `AtlasTimelineHistogram`. The move is to extract a small,
presentation-only scrubber primitive, not to invent a new temporal engine.

Shape (what it controls and how it is built):

- **What it controls**: a single normalized seek position over a domain
  `[start, end]`, emitting `onSeek(t)` and a play/pause state. It is a
  *controller*, not a data source. For traffic it seeks the snapshot's `observedAt`
  window (and later, historic hourly curves / scenario branches); for historical
  reconstruction it seeks the year; for PorchFest it seeks the schedule clock.
- **How it is built**: a `framer-motion` draggable handle over a track (chrome
  motion is exactly framer-motion's job, and it is already the island's motion
  library), plus a play/pause toggle and a small `requestAnimationFrame` clock
  when playing. It renders in the clear area beneath the island that
  visual-grammar-v1 reserves for "the time scrubber and secondary chrome." It does
  NOT own a render engine directly; it emits seek events that each consumer maps
  to its own animation clock (traffic maps `onSeek` to Anime.js timeline seek;
  the year search maps it to the era).
- **Build now vs stub**: build the primitive now AND wire two real consumers
  (traffic playback + the existing year/historical seek, which already exists as
  search input and just gains a draggable affordance). Stub the PorchFest and
  scenario-branch seams as typed `onSeek` consumers that are not yet mounted. This
  satisfies "build it once" without blocking traffic on PorchFest's geotemporal
  work landing. The primitive lives at something like
  `src/components/atlas/TimeScrubber.tsx` with a typed `ScrubberDomain` contract so
  later surfaces plug in rather than re-author.

This is deliberately a *thin* primitive: it is a seek control, not a timeline
database. The heavy temporal logic stays where it already is (Mosaic, the year
search, future SUMO branches).

## Decision 6: Accessibility / reduced-motion (required)

The flow animation is continuous looping motion over the whole map: a textbook
vestibular concern (WCAG 2.2 SC 2.3.3). The atlas already respects
`prefers-reduced-motion` via `matchMedia` in several places
(`OpenFlintAtlasScene.tsx` lines 371/394/848, `AtelierDustMotes.tsx` line 43,
`AtlasCanvasBackdrop.tsx` line 224); the traffic layer must do the same, and the
non-motion fallback must still communicate congestion.

Binding requirements:

1. **`prefers-reduced-motion: reduce` -> NO continuous flow.** The Anime.js SVG
   particle overlay is not rendered. The road stroke renders **static**, colored
   by the congestion band (Decision 3) and widthed by volume (Decision 3), with
   the source-status opacity tier still applied (Decision 4). Congestion is fully
   legible from color + width + opacity with zero motion.
2. **A non-motion congestion readout, always available regardless of motion
   preference.** Each segment, on hover/tap (and in `TrafficFlowPanel`), shows a
   plain text line: the congestion band word ("Stop and go," "Moving freely"), the
   speed ("18 mph of 45"), and the volume ("about 2,400 vehicles/hour"). This is
   the count-and-color fallback the requirement asks for: a user who never sees a
   single moving pixel still knows exactly where traffic is bad and how bad. It
   doubles as the screen-reader content (no information is motion-only, per
   visual-grammar-v1 Accessibility and the atelier gate's "accessible static
   state" rule).
3. **The legend (Decision 4) is the teaching surface** under reduced motion: it
   maps color -> congestion band and opacity -> source status without relying
   on the animation to explain itself.
4. **Layer default OFF + an in-layer motion toggle.** The traffic layer is off by
   default (opt-in motion). Even with motion preference unset, a "Pause flow"
   control in the layer chrome lets any user freeze it to the static-color state.
   This mirrors the atelier's `Skip` primary control: a manual escape from motion
   that does not depend on OS settings.
5. **No vestibular triggers in the flow itself.** No large-scale parallax, no
   camera moves driven by the traffic layer, no full-viewport sweep. The motion is
   small dots tracking thin lines on the ground plane; head travel is well under
   3Hz visible oscillation per segment (the atelier gate's ceiling). Exit/disable
   of the layer is an instant state change (< 200ms), not an animated teardown.

Lock gate (mirrors the atelier validation gates, binding before implementation is
"done"):
- [x] `prefers-reduced-motion: reduce` stops the flow clock; static colored
      strokes remain fully legible. Evidence:
      `docs/validation/traffic-realtime/traffic-anime-browser-smoke.json`.
- [x] Every segment has a text congestion readout (band + speed + volume); no
      state is motion-only.
- [ ] Legend maps all congestion colors and all source-status opacity tiers.
- [x] `status: fixture_fallback` renders `FIXTURE ESTIMATE - NOT A LIVE FEED`
      and never the word "live" by itself; segment `support_note` values are
      shown where useful.
- [x] `source_status: live` vs `fixture` vs `pending_live_source` are
      distinguishable by opacity (not color alone).
- [ ] Five-band color ramp passes Deuteranopia/Protanopia/Tritanopia sim against
      `--ctx-paper`.
- [ ] Layer OFF by default; a "Pause flow" control freezes motion independent of
      OS setting.
- [ ] WCAG 2.2 AA contrast for every band + label against the basemap.

---

## What this proposal does NOT cover

- The historic-replay (AADT hourly curve) and scenario before/after diff renders
  (handoff milestones 2-3). They reuse this segment geometry + this flow render +
  this scrubber, but are later contract extensions and their own gate.
- The backend live feed endpoint for `traffic/realtime` (Axum/RustyRed, in
  `our-civic-atlas-backend`). This is frontend render only; the backend lane
  tracks separately.
- Re-litigating the API seam. The Git coordination decision in
  `docs/plans/traffic-domain-realtime/decision-2026-06-05-graphql-canonical.md`
  keeps GraphQL canonical and uses the REST route only as the dev fallback.
- The exact source-status opacity tiers and Anime.js particle opacity/radius
  tuning (implementation-time, validated at the visual gate).
- Emissions / crash-risk overlays (handoff "cheap overlays"); separate surfaces.

## Open question for Travis (genuine product/taste calls)

1. **Layer vs route (Decision 1).** *Recommendation: toggleable layer on the main
   map.* Sign off, or do you want traffic to live at its own
   `/open-flint-atlas/traffic/` surface (which I'd advise against now, since the
   in-flight code already wires it as a map layer and a route forks the whole map)?
2. **Anime.js renderer lock (Decision 2).** Resolved 2026-06-06: Anime.js is the
   required renderer because it was named in the sourced handoff. The old
   `ScatterplotLayer` particle path is retired; deck.gl remains only for the
   static/pickable traffic segment layer.
3. **Congestion color ramp (Decision 3).** *Recommendation: teal -> amber ->
   terracotta -> oxblood using `--atlas-infrastructure` / `--atlas-warning` /
   `--ctx-accent` / `--ctx-commit`, no new hex.* This spends the atlas's
   attention-accent (`--ctx-accent`) on HEAVY traffic. Acceptable, or should HEAVY
   use a traffic-specific red so the accent stays reserved for civic
   attention elsewhere?
4. **`status: fixture_fallback` wording (Decision 4).** *Recommendation: hard
   `FIXTURE ESTIMATE - NOT A LIVE FEED` chrome, replacing the current softer "fixture
   fallback" copy.* Confirm the blunt phrasing is the house voice for this honesty
   gate, since the fixture will be the default state until MDOT is wired.
5. **Scrubber scope now (Decision 5).** *Recommendation: build the thin shared
   primitive now, wire traffic + the existing year seek, stub PorchFest/scenario.*
   Or keep traffic on a free-running loop with no scrubber for v1 and build the
   shared primitive only when PorchFest forces it?
6. **Default-off + opt-in motion (Decision 6).** *Recommendation: traffic layer
   OFF by default, motion opt-in.* Confirm, given the surface is continuous motion
   and the project's vestibular posture, versus shipping it on-by-default for
   immediate visibility.

End of proposal.
