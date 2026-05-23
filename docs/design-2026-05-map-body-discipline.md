# Design: Atlas Map Body + Confidence Discipline

Four changes, one branch, three to six commits. This fixes the flatness in the current atlas and cleans up the epistemics-creep that's been showing up in user-facing surfaces.

**Branch:** `render/map-body-and-discipline`

**Files affected:**
- `src/components/atlas/AtlasMap.tsx` — basemap layers, vignette mask, infrastructure layers
- `src/lib/atlas/urban-design-model.ts` — roof geometry
- `src/components/atlas/AtlasDynamicIsland.tsx` — Place tab dossier content
- `src/components/atlas/CivicResearchPanel.tsx` — sweep any remaining confidence chips

**First step:** commit this document verbatim as `docs/design-2026-05-map-body-discipline.md` on the branch. The doc lives in the repo as the source of truth.

---

## The confidence-discipline rule

**Confidence shapes what we render, never how.**

This is the rule. Internally, the typology classifier emits a probability for every building. That probability determines *which archetype* we apply: high confidence → use the predicted typology's archetype, low confidence → fall back to `unknown` (a plain extruded chipboard mass).

Once the decision is made, the building renders with full chrome confidence. No alpha-dimming, no ghost outlines, no percentage chips, no "52% confidence" tooltips. The user sees a committed visual.

Confidence belongs in three places only:
- The methodology page (a single passage explaining the classifier and its known failure modes)
- The dossier's evidence section when a building has citations and provenance
- The atelier's source cards and conflict markers (when we eventually build it)

It does NOT belong in:
- Hover tooltips
- Building material variations
- The dossier card's primary content
- The dynamic island's title
- Any user-facing chrome that isn't explicitly a methodology surface

Apply this rule throughout the codebase as part of this PR. Find every `confidence` reference in a render path and route it to gate archetype selection upstream, not visualization downstream.

---

## Change 1 — Fix the roof pyramid problem

**File:** `src/lib/atlas/urban-design-model.ts`

The previous PR ("cut to 3 parts max") landed but the roof part is too aggressive. Looking at the live atlas, large parts of downtown Flint render with pyramidal roofs that dominate the silhouette and read as a model railroad village, not an urban planner's chipboard study.

### Per-form roof revision

Replace roof geometry by form. Use the table below as the spec:

| Form | Roof geometry | Lift |
|---|---|---|
| `single_lot` | Flat gable with horizontal ridge — NOT pyramidal. Ridge runs along the longer footprint axis (or front-edge-parallel if PR 2's bearing wiring lands). | `+0.3m` |
| `row_infill` | Single continuous flat-pitched plane across all row units, NOT per-unit gables. | `+0.3m` |
| `courtyard_open` | Flat plane with parapet edge. NO pitched geometry. | `+0.2m` |
| `courtyard_compact` | Flat plane with parapet edge. NO pitched geometry. | `+0.2m` |
| `tower_podium` | Tower roof is flat. Podium roof is flat. Two flat planes at different heights. | `+0.2m` |
| `mixed_use_street_wall` | Flat roof with parapet line as the detail part. | `+0.2m` |
| `industrial_shed` | **Flat roof.** No sawtooth, no monitor, no pitched geometry in this PR. Industrial buildings in Flint are predominantly flat. | `+0.2m` |
| `civic_anchor` | Low-pitched hipped roof — gentle four-sided slope. NOT a steep pyramid. Slope rises `~0.5m` from edge to center. | `+0.2m` rise + `+0.5m` peak |
| `slab` | Flat roof with parapet line. | `+0.2m` |
| `unknown` | Chipboard mass only. NO roof part. Single extruded volume. | n/a |

### Geometry rules

For `single_lot`, the gable's two planes meet at a single ridge line. The ridge line is at `mass_top + 0.6m`. Eaves are at `mass_top + 0.3m`. This produces a low, residential-feeling roof — not a steep mountain.

For `civic_anchor`, the hipped roof's four planes converge to a small flat plateau at `mass_top + 0.5m`. NOT a single point. The plateau dimensions are roughly `0.4 × footprint_width` by `0.4 × footprint_depth`, centered.

For all other forms: flat plane parallel to the ground, no slope.

### What this fixes

The pyramid problem in the current screenshots. The buildings stop competing with each other for visual height. The skyline reads as massing variation, not roof-shape carnival.

### What this doesn't address

The eventual return of sawtooth roofs, monitor roofs, and other industrial details. Those come back in a later phase when there's a real classifier signal for them (e.g. the building is tagged as a Buick warehouse vs a generic industrial). For now, all industrial reads flat.

---

## Change 2 — Walk back the vignette mask

**File:** `src/components/atlas/AtlasMap.tsx`

The previous PR set the outside-Flint paper mask at alpha 220. Looking at the live atlas, this is too opaque — surrounding context disappears entirely. The "lit island" effect needs surrounding context to be barely there, not gone.

### Change

In the `outsideFlintMask` GeoJsonLayer:
- Fill alpha: `220` → `160` (surrounding context goes from ~14% visible to ~37% visible)
- Boundary band line: keep current width, but reduce alpha from `180` to `140` (softer feather)

### Verify

Zoom out to see Flint and its surroundings. Frankenmuth, Mt. Morris, Burton, Clio labels should be readable as faint ghosts. The Flint River system upstream and downstream should be visible as a faint trace. Major highways outside Flint should be barely visible. None should be invisible.

Flint should still read as a lit island — the paper mask is still doing its job — but Flint should be lit *against* something, not floating in nothing.

---

## Change 3 — Infrastructure color on the map body

**File:** `src/components/atlas/AtlasMap.tsx`

Add four new GeoJsonLayers above the basemap raster but below the buildings layer. These provide infrastructure color that gives the map a *body* instead of being a desaturated wash.

All four use OSM data — already in the city pack or queryable via Overpass.

### Parks and green space

GeoJsonLayer over OSM features tagged `leisure=park`, `leisure=garden`, `landuse=recreation_ground`, `landuse=cemetery`:
- Fill: `#9eb89e` (muted sage green) at alpha 140
- Stroke: `#7d9a7d` at alpha 100, width 0.5px

Targets: Burroughs Park, Riverbank Park, Atherton Cemetery, Kearsley Park, Mott Park golf course, neighborhood pocket parks. They should read as visibly green patches on the map, not faint outlines.

### Water (Flint River system)

GeoJsonLayer over OSM features tagged `waterway=*`, `natural=water`:
- Line for waterways: `#6b8a9e` (cool slate) at alpha 200, width 2-3px
- Fill for water bodies: `#6b8a9e` at alpha 140
- Stroke for water bodies: `#5a7585` at alpha 180, width 1px

The Flint River should be the second-most visible thing on the map after the city boundary itself. Currently it's nearly invisible.

### Rail lines

GeoJsonLayer over OSM features tagged `railway=rail`, `railway=disused`, `railway=abandoned`:
- Line: `#7a6a52` (warm gray-brown) at alpha 180, width 1.5px
- Dash pattern for `disused`/`abandoned`: 4px on, 3px off

Active rail lines render solid. Abandoned beds (significant in Flint's industrial history) render dashed. This is load-bearing for Flint's identity.

### Highway corridors

GeoJsonLayer over OSM features tagged `highway=motorway`, `highway=trunk`:
- Line: `#b8a888` (faint warm tan) at alpha 100, width 4px
- No labels rendered by this layer (basemap raster handles labels)

This is for I-475, UAW Freeway, Chevrolet-Buick Freeway. They should read as visible corridors, not as basemap ghosts.

### Layer order (top to bottom in render stack)

Above buildings:
- City boundary stroke
- City boundary inner glow

Below buildings, above basemap:
- Ward boundaries
- Highway corridors
- Rail lines
- Water
- Parks
- Outside-Flint vignette mask

Below all of the above:
- Basemap raster (CARTO Light)

### What this fixes

The "missing color" feeling. The map body has presence. The buildings remain achromatic chipboard, but they sit on a substrate that has *meaning* — green where there are parks, blue where there's water, dashed brown where the rail used to run. The buildings become foreground, not the only thing.

---

## Change 4 — De-instrument the dossier card

**Files:** `src/components/atlas/AtlasDynamicIsland.tsx` (Place tab), `src/components/atlas/CivicResearchPanel.tsx`, search for any tooltip components

The current Place tab card on building click shows:
```
INDUSTRIAL
95% CONFIDENCE
Building #755542347
```

This is an admin debug overlay, not a dossier. Replace with a real Place tab structure.

### New Place tab structure

When a building is selected, the Place tab renders three sections:

**Section 1 — What it is** (no header)

A two-line plain-English description:
```
Industrial structure
South Saginaw corridor
```

Logic:
- Line 1: a noun phrase derived from typology class (residential single → "Single-family house", residential multi → "Multi-family residence", commercial → "Commercial building", industrial → "Industrial structure", civic → "Civic building", mixed_use → "Mixed-use building", unknown → "Building").
- Line 2: a location descriptor — name of the nearest street corridor, neighborhood, or ward. Computed from spatial join against ward boundaries and major street centerlines. Fall back to "Ward N" if no better descriptor available.

NO typology confidence. NO osm_id (unless name and address are both missing, in which case render `#osm_id` as a small subtitle in `--ctx-ink-faint`).

**Section 2 — What we know** (header: `EVIDENCE`)

When the building has reconstruction evidence linked (a future state — this is where the atelier hooks in):
- A list of source citations
- Each citation is a clickable row that opens the source

For now, when no evidence is linked:
```
No evidence loaded yet.
```

Or, if the building has an associated address in city directory or Sanborn references that aren't yet linked into the engine:
```
Records available in city archives.
Not yet integrated.
```

NO confidence chips. NO percentages. The user trusts the citations or doesn't — the chrome doesn't editorialize.

**Section 3 — Open** (header: `EXPLORE`)

Three placeholder buttons:
- `Open dossier` — leads to a future full-page dossier route (not implemented this PR, button is disabled with a tooltip "Coming soon")
- `Reconstruct historical view` — leads to the atelier (not implemented this PR, button is disabled with same tooltip)
- `Comments` — leads to the eventual community comments surface (disabled, same tooltip)

These three buttons signal what the system will eventually do without faking the implementation.

### Sweep confidence everywhere

Search the codebase for these patterns and remove or rehome:
- `confidence` references in JSX outside of methodology page
- Tooltip components showing percentages
- Any `getLineColor` or `getFillColor` callback that branches on classifier confidence
- Hover tooltips showing typology data

The data model keeps confidence — the classifier still emits it, the database still stores it. But it stays in the data layer. It gates archetype selection upstream. It does not surface in chrome.

The methodology page (when it gets built) is the one place where the rule is "we explain how the classifier works, what its accuracy looks like, and where it fails." That page is the appropriate home for confidence discussion.

---

## Global constraints

- Single PR (not three). All four changes ship together because they're interlocking — the dossier de-instrumentation without the map color body would feel hollow.
- 3 to 6 commits in the PR. Group logically: roof geometry as one commit, vignette walk-back as another, each infrastructure layer as its own commit (parks, water, rail, highways), confidence sweep + dossier as one commit.
- `npm run lint && npm run build` must pass before merge.
- Do NOT touch the typology classifier or the reconstruction engine. This is a render + chrome pass.
- Do NOT add the methodology page in this PR. That's separate work.
- PR title: `render: map body color + roof discipline + dossier de-instrumentation`.
- Commit messages: terse, lowercase, declarative, no emoji.

## Outcome

When this lands:
- The pyramid roofs go away. Buildings read as chipboard massing, not model railroad village.
- The map has a body. Parks read green, water reads blue, rail reads brown, highways read tan.
- Flint reads as a lit island floating *against* a surrounding context, not in nothing.
- The dossier card stops showing classifier diagnostics. It shows what the building is and what we know about it.
- Confidence stops appearing in user-facing chrome.

This is the largest visual change in a single PR since the initial design overhaul. After this lands, the atlas should feel substantially more like an urban planner's working surface and less like a renderer test page.
