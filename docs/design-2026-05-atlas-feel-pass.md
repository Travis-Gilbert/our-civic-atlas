# Design: Open Flint Atlas Feel Pass

Three sequential PRs to make the Open Flint Atlas feel like a responsive, intentional civic tool instead of a decorative map.

**Do not bundle.** Each PR is its own branch and its own commits. Run `npm run lint && npm run build` after each PR — build must pass before moving to the next.

**Diagnosis:** the live atlas at flint.ourcivicatlas.org/open-flint-atlas has three feel problems. Buildings have no click interactions (the map looks responsive but is decorative). Geometry is over-decomposed (up to 8 parts per building, looks like a paper-craft kit). Outside-Flint area renders as flat empty paper instead of giving Flint the "bound world" feeling the data warrants.

**First step:** commit this document verbatim as `docs/design-2026-05-atlas-feel-pass.md` on the first PR branch. The doc lives in the repo as the source of truth.

---

## PR 1 — Building click interactions

**Branch:** `interaction/building-click`

**Files affected:** `src/components/atlas/AtlasMap.tsx`, the deck.gl building layer (`AtlasBuildingsLayer.tsx` or equivalent), `src/components/atlas/AtlasDynamicIsland.tsx`, `src/components/atlas/OpenFlintAtlasScene.tsx`.

### Goal

Clicking a building selects it, opens the Place tab, highlights the building, and updates the dynamic island title. Hovering on desktop shows a tooltip and a light outline. On mobile, touch is the click — no hover behavior at all.

### Click handler

Add an `onClick` handler on the building layer in deck.gl. On click:

1. Set `selectedPlace` in `OpenFlintAtlasScene` state to the clicked building's properties: `osm_id`, `name` (if available), `address` (if available), `typology_class`, `fabric_archetype`, footprint center as `[lon, lat]`.
2. Auto-expand the dynamic island if collapsed.
3. Switch the active tab to `'Place'`.
4. Update the collapsed-island title from `'Ward N'` or `'Flint, Michigan'` to the building name → address → `Building #{osm_id}` (fallback chain).
5. Render a 2px terracotta outline on the selected building. Color: `--ctx-accent` (`#c14a2c`). Two implementation options:
   - Render an extra `LineLayer` filtered to the selected `osm_id`.
   - Use a state-driven `getLineColor` callback on the existing layer.

Either works; pick whichever is less invasive to the current layer composition.

### Hover state (desktop only)

Detect hover capability via `matchMedia('(hover: hover)')`. On capable devices:

- 1px terracotta outline at alpha 140
- Tooltip showing: typology class, confidence, address or osm_id

On touch devices: no hover handling. The touch event is the click. Avoid hover-dependent UI everywhere.

### Place tab content

When `selectedPlace` is set, render four sub-tabs: **Overview**, **Evidence**, **History**, **Comments**.

For now, Evidence/History/Comments are placeholders:
- Evidence: `"No evidence loaded"`
- History: `"No timeline"`
- Comments: `"No comments yet. Be the first."`

Overview shows:
- Typology class
- Confidence (as a percentage)
- Fabric archetype
- Address if available
- An `"Open dossier"` button (placeholder action, no wiring needed yet)

### Clear selection

Two ways to clear:
- A `Clear` button in the Place tab header
- Clicking on empty map area (deck.gl `onClick` fires with null `pickInfo`)

Both clear `selectedPlace`, return the collapsed-island title to its default, and (optionally) switch the active tab back to `'Ask'`.

### Smoothness

Keep all existing framer-motion transitions on the dynamic island. The auto-expand should use the same expand transition the user gets when tapping the collapsed pill.

---

## PR 2 — Cut building part count to 3 max

**Branch:** `render/fewer-parts`

**File affected:** `src/lib/atlas/urban-design-model.ts`

### Goal

Current `createFormParts` emits up to 8 sub-shapes per building, which makes buildings look like paper-craft kits with seven separate cardboard pieces stacked unevenly. Cut every form to 3 parts maximum: mass + roof + one signature detail. The buildings should read as confident basswood chipboard models — not over-decomposed paper craft.

### Per-form part budget

Replace the existing 7–8 part decompositions with these (3 parts max each):

| Form | Mass | Roof | Detail |
|---|---|---|---|
| `single_lot` | House body | Gable plane + ridge as ONE part (not two) | Front porch |
| `row_infill` | Row body | One continuous row roof plane | Party wall hint as a single vertical line (not per-unit) |
| `courtyard_open` | The L or U mass | Roof plane | Courtyard yard (inner ground) |
| `courtyard_compact` | Closed perimeter mass | Roof plane | Courtyard yard |
| `tower_podium` | Podium (mass) | Roof plane | Tower as a second mass — counts as the detail, exception |
| `mixed_use_street_wall` | Street wall body | Cornice band | One continuous storefront strip at ground (not per-bay) |
| `industrial_shed` | Shed body | One sawtooth piece oriented to the front edge | (No separate parapet or monitor — 2 parts total acceptable here) |
| `civic_anchor` | Body | One pitched or hipped roof | Civic entry at the front edge |
| `slab` | Slab | Roof plane | One continuous parapet edge |
| `unknown` | Mass only | (none) | (none) — 1 part total |

For `unknown`: no decomposition at all. Just an extruded chipboard mass. This is the honest representation when the classifier can't place a building.

### Roof elevation lift

Drop every roof lift from the current `+0.7m` to `+1.2m` range to `+0.3m max`. Find every `height + 0.7`, `height + 0.9`, `height + 1.2` literal in `createFormParts` and helpers — replace with `height + 0.3`. Roofs should read as topping surfaces, not separate volumes that compete with the building mass.

### Deterministic variation

Unchanged. Same `variation_seed` produces the same shape. PR 2 just makes that shape simpler. No new randomness, no removed determinism.

### Verify

Load a downtown block in dev. Buildings should look like a clean chipboard model:
- 3 parts max each (1 for `unknown`)
- Roofs barely raised above the mass
- One signature detail per typology
- Same building selected twice produces the same form (determinism intact)

The over-decomposed paper-craft look should be gone.

---

## PR 3 — Bound-world vignette mask

**Branch:** `render/bound-world-vignette`

**Files affected:** `src/components/atlas/AtlasMap.tsx` (BASEMAP_STYLE + new GeoJsonLayer), `package.json` (add `@turf/turf` or `@turf/difference`).

### Goal

Flint reads as a bound world floating on a paper sheet, not a darker patch on a lighter map. The blue boundary outline becomes soft terracotta. Outside-Flint area fades into pure `--ctx-paper`. Roads and labels outside Flint become faint ghosts. The "world unto itself" feeling the project warrants.

### Approach

Render a `GeoJsonLayer` above the basemap raster but below the buildings/wards/labels layers. The layer's polygon is the **inverse** of Flint city limits — a large enclosing rectangle minus the Flint boundary polygon. Compute the inverse client-side using turf.js `difference`.

```ts
import { difference } from '@turf/turf';

const enclosingRect = bboxPolygon([
  flintBbox.minLon - 0.5,
  flintBbox.minLat - 0.5,
  flintBbox.maxLon + 0.5,
  flintBbox.maxLat + 0.5
]);
const outsideFlintMask = difference(enclosingRect, flintBoundary);
```

The mask layer renders:
- Fill: `[242, 241, 236, 220]` (matches `--ctx-paper` at high opacity)
- Line: `[242, 241, 236, 180]`, width 14px, to create a soft band along the boundary as a poor man's feather

The boundary band at 14px wide and lower alpha simulates a feathered edge cheaply. True gaussian feathering would require a custom shader on the layer — note that as a future enhancement if the cheap version looks rough.

### Blue boundary → terracotta

Find the current Flint boundary GeoJsonLayer (renders the city limits as a blue outline). Change:
- Color: `--ctx-accent` (`#c14a2c`) at alpha 180/255
- Width: 1.5px (not 2–3px)

The boundary should suggest, not insist.

### Raster behind the mask

Keep the basemap raster as-is. The mask covers outside-Flint at alpha 220, leaving about 14% of the raster visible — exactly the "faint ghost" intensity we want for surrounding context. No basemap raster modification needed.

This also handles:
- **Labels** (Frankenmuth, Mt. Morris, Burton, Clio): baked into CARTO raster tiles, ~14% visible through the mask, reads as faint paper-tone ghosts.
- **Roads outside Flint**: same logic, baked into the raster, ~14% visible, soft enough to recede.

### Wards and buildings

The existing ward boundary GeoJsonLayer renders above the mask. Wards stay sharp inside Flint. No change.

Buildings render above the mask. No change.

### Optional: Flint boundary inner glow

Add a second GeoJsonLayer rendering the Flint boundary polygon at:
- Stroke: `--ctx-accent` at alpha 90
- Width: 3px

This gives the boundary a faint inner-glow appearance — Flint emerges from the paper like a lit island. Recommended; high visual impact for one extra layer.

### Verify

Zoom out to see Flint and its surroundings. Flint should sit on the paper like a lit island. Surrounding cities readable as faint ghosts. The hard blue rectangle outline of the current state should be gone — replaced by a soft terracotta edge that fades into paper.

---

## Global constraints

- 3 to 10 commits per PR. Not one giant commit per PR.
- `npm run lint && npm run build` must pass after each PR.
- Do NOT touch the typology classifier or the reconstruction engine. This is a feel pass — interaction, parts, vignette only.
- Do NOT add new dependencies if avoidable. `@turf/turf` (or just `@turf/difference`) is acceptable for PR 3; turf is MIT-licensed and small.
- PR titles:
  - `interaction: building click + place tab + selection state`
  - `render: cut building part count to 3 max`
  - `render: bound-world vignette mask`
- Commit messages: terse, lowercase, declarative, no emoji.
- PR descriptions: summarize what changed, link to `docs/design-2026-05-atlas-feel-pass.md`.

## Outcome

When all three PRs land:
- The atlas becomes responsive — clicking does things, hovering hints at affordance, selection updates the chrome.
- Buildings stop looking like paper-craft kits — clean chipboard masses with one signature detail each.
- Flint reads as a bound world floating on a paper sheet — surrounding context recedes into ghost, Flint emerges as a lit island.

Three small focused PRs. No load-bearing architectural changes. Pure feel work.
