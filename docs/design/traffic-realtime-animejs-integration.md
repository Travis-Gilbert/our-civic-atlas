# Traffic Realtime — anime.js `createMotionPath` Integration

Status: **design proposal, pending Travis approval** (design-gate per `CLAUDE.md`)
Library: `animejs ^4.4.1` (installed; verified against `node_modules/animejs/dist/modules/**`)
Replaces: the deck.gl traffic render in `src/components/atlas/AtlasMap.tsx`
(`atlas-traffic-flow-segments` GeoJsonLayer + `ScatterplotLayer<TrafficParticle>`)

> **anime.js is the mandated renderer for traffic flow.** This document does not
> relitigate that. A prior pass replaced the SVG/motion-path approach with a
> deck.gl `ScatterplotLayer` advected by a React tick; that is what we are
> removing. The design problem is *how to do the anime.js SVG overlay well over a
> WebGL map*, not *whether* to use anime.js.

---

## 1. The seam (where this attaches, verified)

Read of `AtlasMap.tsx` confirms the integration points:

- **Mount target**: the outer container `mapContainerRef` (`<div ref={mapContainerRef}>`,
  ~line 2742) already wraps both the MapLibre canvas and the deck overlay. The
  traffic SVG mounts here as a **sibling above** the `maplibregl-map`, absolutely
  positioned `inset-0`, `pointer-events-none` (segments stay pickable through the
  *existing* deck stroke layer; see §6), `z` between the map canvas and the
  building hover tooltip (tooltip is `z-[10]`, vignette is `z-[5]`; the flow SVG
  sits at `z-[4]` — above basemap, below chrome).
- **Map instance for `.project()`**: `mapRef.current` is a `react-map-gl` `MapRef`;
  call `mapRef.current.getMap()` to get the raw MapLibre `Map`, whose
  `map.project([lng, lat]) -> {x, y}` and `map.on('move'|'zoom'|'pitch'|'moveend', …)`
  drive geo-registration. `onMapReady` already hands the `MapRef` up to the parent,
  so a dedicated `<TrafficFlowOverlay map={map} snapshot={…} />` child can receive it.
- **Already-present scaffolding to reuse** (a prior SVG attempt left these in
  `AtlasMap.tsx`, currently dormant): `projectedTrafficPath(map, feature)` (line 874)
  projects a LineString to an SVG `d` string; `cssSafeTrafficId(segmentId)` (line 870);
  the `ProjectedTrafficPath` / `ProjectedTrafficParticle` types (lines 285-300). The
  encoding helpers `trafficParticleCount` (829), `trafficParticleDurationMs` (833),
  `trafficColor` (794), `trafficDashArray` (815) are all reusable as-is.
- **Reduced motion**: `usePrefersReducedMotion()` is already imported and live
  (line 1040); the deck path already short-circuits on it. We inherit that gate.

**Recommendation**: extract the traffic render into a new
`src/components/atlas/traffic/TrafficFlowOverlay.tsx` (DOM/SVG, not deck) plus a
`src/lib/atlas/traffic-motion.ts` (pure encoding + projection helpers, migrated from
the in-file helpers). `AtlasMap` stops pushing the two traffic deck layers and instead
renders `<TrafficFlowOverlay>` after `<DeckGLOverlay>`. Net deletion: `createTrafficParticles`,
the `ScatterplotLayer<TrafficParticle>`, `trafficAnimationTick`, the 900ms `setInterval`.

---

## 2. anime.js v4 API (verified, exact call shapes)

ESM named exports (confirmed `node_modules/animejs/dist/modules/index.d.ts`):

```ts
import { animate, createTimeline, svg, utils } from "animejs";
// svg is a namespace: svg.createMotionPath, svg.createDrawable, svg.morphTo
```

`createMotionPath` (verified `svg/motionpath.d.ts`) — note it returns three
**FunctionValues** you spread into the tween, it does not animate by itself:

```ts
const { translateX, translateY, rotate } = svg.createMotionPath(pathEl);
animate(particleEl, {
  ease: "linear",
  duration: durationMs,          // §3 speed encoding
  loop: true,                    // free-running ring; we re-key on poll (§4)
  delay: staggerOffsetMs,        // phase particles along the segment
  translateX,                    // x along the SVGPathElement
  translateY,                    // y along the SVGPathElement
  rotate,                        // inclination/tangent — gives heading
});
```

`createTimeline` (verified `timeline/timeline.d.ts:159`) returns `Timeline extends Timer`;
`seek` lives on `Timer` (`timer.d.ts:108`):

```ts
const tl = createTimeline({ autoplay: false, defaults: { ease: "linear" } });
tl.seek(timeMs, /* muteCallbacks */ true);   // scrubber primitive (§7)
tl.pause(); tl.play();                        // also from Timer
```

`pathEl` is a real `SVGPathElement` in the DOM; `createMotionPath` reads its
geometry via `getTotalLength()`/`getPointAtLength()` at call time. **This is the
crux of geo-registration: the path element must already carry the projected `d`
before we build the motion path** (§3).

---

## 3. Geo-registration (the hard problem)

Every segment is a geographic `LineString`. anime.js needs a screen-space
`SVGPathElement`. The pipeline per segment:

```
LineString[lng,lat]  --map.project()-->  [{x,y}…]  -->  d="M.. L.. L.."  -->  <path>
                                                                  |
                                              svg.createMotionPath(<path>)  -->  tween
```

`projectedTrafficPath(map, feature)` (already in the repo) produces the `d`. The
SVG is one `<svg>` sized to the map container, holding one `<path>` per segment
(the *track*, see §6 for its visible role) and N `<circle>`/`<use>` particle nodes.

### Re-projection on camera move

The projection is only valid for one camera pose. Three escalating responses:

| Camera event | Response | Rationale |
|---|---|---|
| `move` (pan/zoom in flight, fires continuously) | **Re-`project` the path `d` strings only; do NOT rebuild motion paths or restart tweens.** Update each `<path d>` attribute in the rAF the overlay already runs. anime.js keeps animating; particles ride the live-updated track because `createMotionPath` samples the path element on every frame. | Cheap (string write per segment, ~50 max). Keeps the flow alive during the gesture instead of freezing. |
| `moveend` / `zoomend` | Recompute `d` once more at the settled pose; **rebuild the motion paths** (`createMotionPath` re-read) so `getTotalLength`-derived velocity matches the new pixel length, then resume tweens at their current progress. | A zoom changes a segment's pixel length 2-4x; without a rebuild, "duration" no longer maps to a consistent on-screen speed. Rebuilding only at rest keeps it off the hot path. |
| `pitchend` (3D tilt) | **Pitch gate** — see below. | Projected 2D paths under tilt skew badly near the horizon. |

> **Important nuance for `move`**: anime.js `createMotionPath` resolves the path's
> length and point lookups *per frame* against the live `SVGPathElement`. So
> rewriting `path.setAttribute('d', …)` during `move` makes in-flight particles
> track the panning road for free — no tween restart. The only thing that drifts
> is *speed calibration* (pixels/sec changes with zoom), which is why the rebuild
> is deferred to `*end`. This is the single most important design decision here and
> it is what makes the overlay feel glued to the map rather than snapping on
> `moveend`.

### Pitch — addressed honestly

MapLibre `map.project()` returns correct screen coords at any pitch, but a flat
2D `<path>` traced through tilted ground points produces foreshortened, visually
wrong motion near the top of the frame (particles appear to speed up into the
horizon, headings read wrong). Two honest options, recommendation first:

- **Recommended — flatten the flow above a pitch threshold.** When `map.getPitch()
  > 25°`, fade the particle layer to 0 over 200ms and show only the static
  congestion-coloured *tracks* (which are themselves just projected polylines and
  read fine under mild tilt as "roads"). Restore particles below the threshold.
  This is honest: we don't pretend the 2D projection is a 3D simulation. The atlas's
  default `oblique`/`atlas` view modes set pitch via `ATLAS_SCENE_VIEW_MODE_LOOKUP`;
  the traffic flow is a *plan-view* read, so degrading it on heavy tilt matches the
  data's nature.
- **Rejected — per-point Z reconstruction / terrain drape.** anime.js has no 3D
  path; faking depth by scaling particle radius along the path would be invented
  precision (No-Fake-UI). Not doing it.

The threshold (25°) is a knob (Open Question Q3).

### Reduced-precision write

The existing helper already does `point.x.toFixed(1)` — pixel-tenths is plenty and
keeps the `d` string short. During `move` we throttle the `d` rewrite to the map's
own render cadence by doing it inside a single `requestAnimationFrame` loop owned by
the overlay (not one rAF per segment).

---

## 4. Particle lifecycle, pooling, performance

### Counts

- Fixture today: **6 segments**. Design ceiling: **~50 segments**.
- Per-segment particle count = `trafficParticleCount(props)` (existing): `clamp(round(volume_per_hour / 350), 1, 8)`.
- Worst case 50 × 8 = **400 animated DOM nodes**. That is comfortably inside the
  Canvas-2D/DOM tier for this skill (< 500 animated elements → DOM is fine; no
  WebGL needed). anime.js v4's engine batches all active tweens on one internal
  clock, so this is one rAF, ~400 transform writes/frame. Acceptable.

### One `animate()` instance per particle

Each particle element gets its own `animate(el, { …createMotionPath(track) })` with
`loop: true`. We do **not** create one giant timeline of 400 children for the
free-running flow (that couples unrelated lifetimes). The shared **Timeline is a
separate, scrubbable construct** (§7); the ambient loop is N independent looping
animations. anime.js tracks them all on its global engine clock, so they stay in
sync without a parent.

### Pooling (the part that matters at 15s polls)

The feed refreshes on `refresh_interval_seconds` (snapshot field; ~15s). Between
polls a segment's `volume` (count) and `speed` (duration) change. Naive teardown +
rebuild on every poll causes a visible "blink" and GC churn. Strategy:

- **Stable element pool keyed by `segment_id`.** Maintain `Map<segmentId, SegmentRig>`
  where a rig owns its `<path>` track + an array of particle `<circle>` nodes + their
  `animate()` handles. The pool persists across polls.
- **Diff on poll**, not rebuild:
  - Segment still present → keep its `<path>`; recompute `d` only if camera moved.
    Recompute target count `n' = trafficParticleCount(props')`.
    - `n' > n`: acquire `(n' - n)` nodes from a **free-list** (detached `<circle>`s),
      attach, start their tweens with a stagger delay so they don't all spawn at the
      path origin simultaneously.
    - `n' < n`: let `(n - n')` particles **finish their current loop, then retire**
      to the free-list (`animation.complete` callback releases them) rather than
      yanking mid-path. Avoids popping.
    - duration change (speed) → call `utils.set` / re-`animate` the surviving
      particles' duration on their *next* loop boundary, or accept the change taking
      effect next loop. (Smoother than restarting mid-tween.)
  - Segment gone → retire all its particles to the free-list, keep the rig hidden
    for one poll cycle (segments rarely vanish; cheap to hold), then drop.
  - New segment → build rig, pull particles from free-list.
- **Free-list** caps total allocated nodes at the high-water mark (~max 400), so
  steady-state allocation is zero after warm-up.

### Performance ceiling & guardrails

- Hard cap particle nodes at **480** (`MAX_TRAFFIC_PARTICLES`); if `Σ count` exceeds
  it (only if the network grows past fixture/ceiling), scale every segment's count
  down proportionally. Documented, deterministic, honest (count is decorative
  density, not a literal vehicle tally).
- `will-change: transform` on particle nodes; animate **only `transform`**
  (translate/rotate from `createMotionPath`) — no layout/paint properties — so each
  frame is compositor-friendly.
- Visibility: when `layerVisibility.traffic === false` or the overlay is offscreen
  (`IntersectionObserver`), `tl.pause()` + pause all rigs; resume on return. Mirrors
  the existing deck gate.

---

## 5. Encoding (exact formulas + real tokens)

All three reuse existing helpers; formulas restated so the contract is explicit.
**Volume → count** and **speed → duration** are *the two SUMO numbers* the handoff
mandates ("segment volume drives the number of particles … segment speed drives
their tween duration").

### Volume → particle count

```
count = clamp( round(volume_per_hour / 350), 1, 8 )
```

(= existing `trafficParticleCount`.) 350 veh/h per particle reads as roughly one
particle per lane-ish band; clamp keeps the busiest arterial at 8 and the quietest
local at 1. Density, not a vehicle count — labelled as such in the legend.

### Speed → tween duration

```
ratio        = clamp01( speed_mph / max(free_flow_speed_mph, 1) )
boundedRatio = max(ratio, 0.1)
durationMs   = round( (2 + (1 - boundedRatio) * 7) * 1000 )   // 2.0s … 8.3s
```

(= existing `trafficParticleDurationMs`.) Free-flowing (ratio→1) ⇒ ~2s traversal
(fast); jammed (ratio→0.1) ⇒ ~8.3s (slow crawl). A congested street therefore
carries **many slow** particles, a free one **few fast** — exactly the handoff's
intuition, computed nowhere but here.

### Congestion → colour (existing tokens only — no invented hex)

The repo already encodes traffic colour in RGBA constants drawn from the atlas
token family. Reuse verbatim; map to CSS tokens for documentation:

| `congestion_ratio` | RGBA constant (in file) | CSS token | Hex |
|---|---|---|---|
| `< 0.28` (free) | `TRAFFIC_FREE [45,166,153]` | `--atlas-infrastructure` | `#4a8a82` (teal) |
| `0.28 – 0.5` (building) | `TRAFFIC_BUILDING [217,162,59]` | `--atlas-warning` ≈ | `#c08a3a` (amber) |
| `>= 0.5` (heavy) | `TRAFFIC_HEAVY [193,74,44]` | `--ctx-accent` / `--atlas-state-live` | `#c14a2c` (terracotta) |
| selected segment | `TRAFFIC_SELECTED [42,36,25]` | `--ctx-ink` | `#2a2419` |

(thresholds = existing `trafficColor`.) Basemap is warm paper `--ctx-paper #f2f1ec`;
these three sit at AA contrast against it (already shipped values). **No new colours
introduced.** Particle fill/stroke per `trafficParticleStyle` (existing) keys off
`source_status` for the live/inferred read (§6).

---

## 6. Provenance honesty (No-Fake-UI, binding)

Three `source_status` values must read differently *without relying on motion*,
because reduced-motion strips motion entirely (§ below) and because colour alone is
banned by visual-grammar principle 7. The **track stroke** (the `<path>` itself,
rendered visible, not just a motion guide) carries provenance via **line style** —
reusing `trafficDashArray` (existing):

| `source_status` | `estimate_basis` | Track stroke | Particle style (existing `trafficParticleStyle`) |
|---|---|---|---|
| `live` | `live_feed` | **solid** (`[12,0]`) | filled, bright, white 0.72 halo, r≈4.3 |
| `pending_live_source` | (awaiting feed) | **dashed** `[6,4]` | hollow ring (transparent fill, coloured stroke), r≈3.9 |
| `fixture` | `hourly_pattern` / `scenario_model` | **fine-dashed** `[2,4]` | dim filled (alpha ~122), r≈3.3 |

So even frozen, a glance distinguishes measured (solid track, bright filled dots)
from inferred (dashed track, hollow/dim dots). Particle *radius* and *fill vs ring*
are the redundant non-colour channel.

### Whole-snapshot "not a live feed" state

`TrafficRealtimeSnapshot.status` is `"live" | "fixture_fallback" | "unavailable"`:

- `live` → flow renders normally; a small chrome chip reads
  `LIVE · <source_label> · updated <relative(generated_at)>` using `--atlas-state-live`.
- `fixture_fallback` → **entire overlay rendered in the inferred register** (all
  tracks dashed, particles dim) regardless of per-segment status, and the chip reads
  `SAMPLE PATTERN · not a live feed` in `--ctx-ink-mute`. This is the honesty gate:
  when the backend resolver is unreachable and we're on the fixture, nothing may
  read as measured.
- `unavailable` → no particles, no tracks; a single inert line per segment in
  `--ctx-ink-faint` + chip `TRAFFIC DATA UNAVAILABLE`. Never animate nothing into
  looking like something.

`observed_at` / `expires_at` per segment drive a **stale** sub-state: if
`now > expires_at`, that segment's particles drop to the inferred register even if
`source_status === "live"` (the feed went stale between polls). Honest decay.

---

## 7. The shared Timeline scrubber

The handoff wants **one** anime.js `Timeline` + `seek()` primitive reused across
traffic temporal playback, historical reconstruction scrubbing, and PorchFest band
scheduling ("build it once").

### Shape

A `src/lib/atlas/use-time-scrubber.ts` hook owning a single
`createTimeline({ autoplay: false })` whose duration is a **normalised day or era
window** (e.g. 0…86_400_000 for a 24h traffic day, or a year-range for
reconstruction). Consumers register **keyframed children** against it and read a
shared `position` (0…1 or absolute ms). The primitive's surface:

```ts
type TimeScrubber = {
  timeline: Timeline;             // the createTimeline instance
  seek(t: number): void;          // -> timeline.seek(t, true)
  play(): void; pause(): void;
  position: number;               // current ms, for chrome readout
  register(channel: ScrubberChannel): () => void;  // returns disposer
};
```

For **traffic specifically**: the realtime flow (§4) is a free-running loop and is
*not* the scrubber's job. The scrubber drives **historic/hourly** playback — drag to
5pm, the evening-peak snapshot's volume/speed encodings apply (re-running the §5
formulas against that hour's segment values), exactly the handoff's "drag to 5pm"
example. So the scrubber's traffic channel swaps the *snapshot* the overlay encodes,
not the per-particle tween clock.

### Build-now vs stub-the-seam — recommendation

**Stub the seam now, build the full cross-surface primitive in the dedicated
historical-scrubber work.** Concretely, for *this* traffic ship:

- Ship the realtime free-running flow (§§3-6) — that needs no Timeline at all.
- Create `use-time-scrubber.ts` with the `TimeScrubber` type above and a working
  `createTimeline` + `seek`/`play`/`pause`, but wire only the **traffic hourly
  channel** (which we have data shape for). Leave `register()` generic so
  reconstruction + PorchFest plug in later without reshaping the primitive.
- Do **not** speculatively build reconstruction `morphTo` / PorchFest channels here
  — that's scope the traffic ship can't validate. The seam (the hook + types) is the
  deliverable; the other two surfaces fill it when they land.

Rationale: the realtime feed (the thing actually shipping with live data) doesn't
depend on the scrubber, so coupling them would delay traffic on a primitive only one
of three consumers can exercise today. Shipping the *typed seam* honours "build it
once" without faking two integrations we can't test.

---

## 8. Render order & mount sketch (no component code)

```
<div ref={mapContainerRef}>                     // existing
  <Map …>                                        // MapLibre canvas  (z auto)
    <DeckGLOverlay … />                           // buildings/places (z auto)
  </Map>
  <TrafficFlowOverlay map={map} snapshot={…}/>    // NEW: SVG, z-[4], pointer-events-none
  <div className="atlas-scene-vignette … z-[5]"/>  // existing
  …chrome (tooltip z-[10], island, …)             // existing
</div>
```

Picking: keep traffic segments pickable via a thin invisible **deck `GeoJsonLayer`**
(reuse the existing `atlas-traffic-flow-segments` data, `getLineWidth` widened,
`getLineColor` alpha 0) so click-to-select a segment still works through the deck
picking buffer — the SVG overlay stays `pointer-events-none` and purely decorative.
This is the one deck layer that survives; everything else (particles, visible
strokes) moves to SVG. (Alternatively put `pointer-events` on the SVG `<path>`
tracks and route selection through DOM — Open Question Q4.)

---

## Open questions for Travis (recommendation first)

1. **Keep the invisible deck pick-layer for segment selection, or move selection to
   the SVG tracks?** *Recommend keep the deck pick-layer* (alpha-0 `GeoJsonLayer`):
   click-to-select already works through deck's picking buffer, the SVG stays a pure
   decorative `pointer-events-none` layer, and we don't duplicate hit-testing. Trade:
   one deck layer remains. Acceptable.
2. **`move`-time `d` rewrite cadence — every map frame, or throttled to ~30fps?**
   *Recommend every frame* (one shared rAF, ≤50 `setAttribute` writes/frame is
   trivial) so the flow stays glued during pans; revisit only if profiling on a
   50-segment network on low-end mobile shows jank, then throttle to 30fps.
3. **Pitch flatten threshold.** *Recommend 25°.* Below it, 2D-projected paths read
   honestly as roads; above it, fade particles and keep static tracks. Easy to tune;
   wire as a constant `TRAFFIC_PITCH_FLATTEN_DEG`.
4. **Build the cross-surface scrubber now or stub the seam?** *Recommend stub the
   typed seam* (`use-time-scrubber.ts` with real `createTimeline`+`seek`, traffic
   hourly channel only). Realtime flow doesn't need it; reconstruction/PorchFest
   channels land with their own work. Honours "build once" without faking two
   untestable integrations.
5. **Particle glyph: `<circle>` vs a `<use>` of a shared instrument-style marker
   (Braun/patent-drawing register).** *Recommend `<circle>` for v1* (cheapest, AA
   contrast already proven via the RGBA constants); upgrade to a `<use>`-instanced
   chevron/tick later if the patent-drawing aesthetic wants directional glyphs
   (`createMotionPath`'s `rotate` already gives heading for free).
6. **Hard particle cap (`MAX_TRAFFIC_PARTICLES`).** *Recommend 480* (50 segs × 8 +
   headroom). Density is decorative; proportional scale-down above the cap is honest
   and deterministic. Confirm the number.
