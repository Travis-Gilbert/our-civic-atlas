# Design: Buildings as Sketch

Three interlocking changes that move the atlas from "polygons on a washed paper field" to "architectural sketch with legible streets and present urban fabric."

**Branch:** `render/buildings-as-sketch`

**Files affected:**
- `src/lib/atlas/urban-design-model.ts` — building geometry simplification
- `src/components/atlas/AtlasMap.tsx` — texture overlay, edge lines, drop shadows, street layer, overlay strengthening
- `src/components/atlas/AtlasBuildingsLayer.tsx` (or equivalent) — material updates
- `public/textures/` — new paper texture asset (256×256 SVG noise pattern)

**First step:** commit this document verbatim as `docs/design-2026-05-buildings-as-sketch.md` on the branch.

## The diagnosis

The current atlas suffers from a specific failure mode: geometric noise without graphic substance. Buildings have part decomposition (decorative roofs, porches, cornices) but no surface character (texture, edge weight, material). The result reads as polygon soup floating on a paper field, not as a drawn architectural model.

Two additional problems compound this:
- Streets are buried inside the CARTO basemap raster, rendering at whatever weight the basemap chose. The street grid — the connective tissue of the city — is invisible.
- Map overlays (parks, water) at the previously specced alphas (140, 180) are too subtle to overcome the washed basemap. They show up but don't hold.

This PR fixes all three.

## Change 1 — Building geometry simplification

**File:** `src/lib/atlas/urban-design-model.ts`

Reduce buildings to confident massing. Most buildings become a single extruded volume. Surface character (texture + edges + shadow) does the work of making them feel drawn — not geometric sub-decomposition.

### Per-form geometry revision

| Form | Geometry |
|---|---|
| `single_lot` | Single extruded mass + low gable roof (ridge at `mass_top + 0.6m`, eaves at `mass_top + 0.3m`). No porch, no detail parts. |
| `row_infill` | Single extruded mass across all row units. Flat roof. No party-wall geometry. |
| `courtyard_open` | Single extruded mass with courtyard cutout. Flat roof. No parapet detail. |
| `courtyard_compact` | Single extruded mass with courtyard cutout. Flat roof. No parapet detail. |
| `tower_podium` | Two stacked extruded masses (podium + tower). Flat roofs on both. |
| `mixed_use_street_wall` | Single extruded mass. Flat roof. No cornice band, no storefront strip. |
| `industrial_shed` | Single extruded mass. Flat roof. No sawtooth, no monitor. |
| `civic_anchor` | Single extruded mass + low hipped roof (4 planes converging to a small plateau at `mass_top + 0.5m`). |
| `slab` | Single extruded mass. Flat roof. No parapet detail. |
| `unknown` | Single extruded mass. Flat top. No additional geometry. |

### What this removes

The previous per-form part lists (porches, cornices, sawtooths, monitors, party walls, parapets, dormers). All of these come back later when the typology classifier produces fine enough signal to drive them, but not in this PR. For now: confident massing only.

### What stays

Heights, footprints, orientations from the existing fabric pipeline. The `variation_seed` still produces deterministic per-building geometry. The roof geometry on `single_lot` and `civic_anchor` is the only allowed decoration.

## Change 2 — Surface character (texture + edges + shadow)

**Files:** `src/components/atlas/AtlasMap.tsx`, `src/components/atlas/AtlasBuildingsLayer.tsx`, `public/textures/paper-grain.svg` (new)

This is the change that makes buildings read as drawn instead of polygonal. Three layered effects, each cheap.

### Paper grain texture

Create `public/textures/paper-grain.svg` — a 256×256 SVG noise pattern at low opacity. Render with `<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" />` filtered to grayscale at ~12% opacity over transparent. Tile-able. This becomes a repeating texture overlay on every building face.

In deck.gl, apply via `material` parameter on the GeoJsonLayer (or a wrapper SolidPolygonLayer). For three.js / R3F (if used for buildings), apply as a tiling texture map on the building material.

The grain is subtle. Not a photo of chipboard. Just enough variation to break up flat polygon fills.

### Edge lines

Every building gets a 1.5px outline. Color: `#7a8696` (warm gray with a slight indigo lean — your "hint of blue to imply drawing"). Apply via `getLineColor` callback on the building layer at alpha 220.

This is the single largest perceptual change in the PR. Polygons with edges read as drawings; polygons without edges read as fills. Architectural sketch models work because edges are explicit.

### Per-building drop shadow

Each building gets a soft drop shadow offset by approximately 6px southeast (or computed from the light source position if R3F is involved). Opacity 0.22, color `#3a3328` (deep warm gray-brown — matches the building shadow tone in the Eugene reference).

In deck.gl, drop shadow on extruded polygons is non-trivial — the GPU isn't doing shadowmapping by default. Two implementation paths:

- **Cheap:** render a separate `SolidPolygonLayer` underneath the building layer with the footprints offset by ~3m southeast and filled with the shadow color at low alpha. Effectively a "fake shadow" that doesn't follow building geometry exactly but reads as shadow at the right zoom levels.
- **Right:** use deck.gl's `LightingEffect` with a directional light and enable shadows on the building layer. More expensive at render time but produces real shadows. Worth doing if frame rate stays acceptable.

Start cheap. Measure frame rate. Upgrade if there's headroom.

### Color stays achromatic

Buildings remain in the chipboard cream/gray palette. The texture, edges, and shadows are the new visual richness — not color. Color overlay (the existing typology toggle) still works the same way: tints the building's base color at low mix percentage. With texture + edges + shadow on top, the typology overlay reads even more clearly.

## Change 3 — Streets as a first-class render layer

**File:** `src/components/atlas/AtlasMap.tsx`

The street grid is currently invisible because it lives inside CARTO's baked raster tiles. Promote it to an explicit deck.gl `PathLayer` so streets render at deliberate, consistent weights.

### Three-tier street layer

Add a single `PathLayer` (or three separate ones) fed by OSM road data already in your stack. Tier by `highway=*` tag:

| Tier | OSM tag values | Color | Width |
|---|---|---|---|
| Arterial | `motorway`, `trunk`, `primary` | `#9a8a72` warm tan | 3px |
| Collector | `secondary`, `tertiary` | `#a8a09a` medium gray | 1.5px |
| Local | `residential`, `unclassified`, `service` | `#bdb8b0` light gray | 0.5px |

Render order: above basemap, above water/parks/rail layers, **below** buildings. Streets are infrastructure context; buildings sit on top of them.

### Building footprint inset

Inset every building footprint by 1.5 meters before extrusion. This creates ground-level breathing room between buildings and streets, so the street network reads as visible space between buildings rather than implied gaps.

Implementation in `urban-design-model.ts` or wherever footprints feed the layer: `footprint.buffer(-1.5, single_sided: true)` using turf.js or Shapely-equivalent client-side. Cache the inset geometry to avoid recomputing each frame.

### Parcel lines (optional)

If parcel data is in the pipeline, render parcel boundaries as a third `PathLayer` at `#c4baa0` (existing `--ctx-rule` color) at 0.5px width, alpha 100. Very faint — they should provide ground-level structure without competing with streets or buildings. Skip this if parcel data isn't available; it's the smallest-impact piece.

## Change 4 — Strengthen overlay colors

**File:** `src/components/atlas/AtlasMap.tsx`

The map color overlays from the previous PR are too subtle on the washed basemap. Bump them.

| Layer | Current alpha | New alpha |
|---|---|---|
| Parks fill | 140 | 200 |
| Water bodies fill | 140 | 220 |
| Water bodies stroke | 180 | 240 |
| Waterways line | 200 | 240 |
| Rail lines | 180 | 200 |
| Highway corridors | 100 | 130 |

These should now read as committed elements of the map, not as faint hints. The basemap recedes by being outshouted.

This is not a basemap swap — that's downstream work. But the overlays should be strong enough that the basemap stops feeling washed.

## Constraints

- Single PR, 4-6 commits. Group logically: geometry simplification, paper grain texture, edge lines + shadows, street layer + inset, overlay strengthening.
- `npm run lint && npm run build` must pass.
- Do NOT touch the typology classifier, the reconstruction engine, the dossier UI from previous PRs, or the dynamic island chrome. This is a map-body and building-render pass only.
- Do NOT add new external dependencies if avoidable. turf.js is already in for the vignette mask; reuse it for the building inset.
- PR title: `render: buildings as architectural sketch + streets as first-class layer`.
- Commit messages: terse, lowercase, declarative, no emoji.

## Outcome when this lands

- Buildings read as drawn architectural massing — paper grain on faces, indigo-tinted edge lines, soft shadows. They look like a chipboard study, not polygon soup.
- The street grid becomes visible at all zoom levels. Arterials, collectors, locals each render at deliberate weights.
- Buildings have breathing room from streets. The space *between* buildings becomes legible.
- Map overlays hold their weight — parks read green, water reads blue, rail reads brown, highways read tan.
- The atlas stops being "less pleasant than the previous iteration." It becomes the architectural sketch you keep describing.

## Not in scope

- Basemap swap to a hand-tuned PMTiles or Stadia style. Downstream work, separate PR.
- Street view / immersive ground-level mode. Post-Pairformer work.
- Atelier surface for procedural reconstruction. Separate spec already exists.
- Pairformer training corpus expansion or training run. Separate audit and plan.

Those four are the next major moves after this lands.
