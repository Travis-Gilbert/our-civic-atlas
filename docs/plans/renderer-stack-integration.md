# Renderer Stack Integration

This repo should build the full Atlas Scene intent. The V1 target is a
Three/R3F-first civic scene, with MapLibre/deck.gl preserved as the working
baseline, fallback, and geospatial helper stack until the Three/R3F path is
equal-or-better.

## Installed Browser Runtime

- Three.js and React Three Fiber: primary V1 Atlas Scene renderer. This owns
  the full-canvas civic world, camera choreography, ghost objects, source halos,
  document/source-support detail states, and Node Horizon portals.
- MapLibre: baseline/fallback map runtime and geospatial helper for bounds,
  tile/style experiments, PMTiles, coordinate reference, and map parity.
- deck.gl: baseline/fallback GPU overlay engine for places, events, corridors,
  safety aggregates, Tile3D experiments, and high-volume data weather.
- PMTiles and Protomaps basemaps: static/vector-tile path for low-cost atlas
  publication and fallback map rendering.
- Mosaic, vgplot, Observable Plot, and DuckDB-WASM: analytical data plane,
  linked brushing, crossfiltering, and fast public read-model slicing.

## Installed Asset/Pipeline Boundaries

- `brush` from `github:ArthurBrussee/brush`: use as a Scene Foundry
  asset-generation dependency for reviewed reconstruction/splat assets, not as
  an always-loaded default page dependency.
- `@thatopen/components`, `@thatopen/fragments`, `web-ifc`, and
  `camera-controls`: use for OpenBIM/IFC inspection and conversion experiments
  that feed reviewed web-safe SceneManifest assets.
- Rusty Red / Redis-style hot graph services: planned geocache/hash layer for
  viewport packages, nearby lookups, active scene state, source crawl state, and
  session acceleration. This is not canonical spatial or provenance truth.

## Runtime Rules

- Atlas Scene is the live web interface. The V1 target renderer is a
  Three/R3F SceneHost that consumes CivicObjects, SceneManifests, Mosaic/DuckDB
  selections, and geocached viewport packages.
- MapLibre/deck.gl remain the baseline and fallback path until the R3F scene
  passes runtime, product, and vision gates.
- SceneManifest is the data/rendering contract between civic objects and
  renderers.
- Scene Foundry is the background generation pipeline: Brush, Blender,
  IFC/OpenBIM, GLB, 3D Tiles, thumbnails, and previews.
- Public route rendering must not depend on live LLM/tool sessions, local
  authoring software, or unreviewed generated assets.
- Every rendered object needs a CivicObject id, source/support state, review
  state, render mode, time interval, and dossier link.
- Hot geocache/hash results may speed the scene, but public facts still come
  from reviewed spatial/read-model and provenance stores.

## North-Star Floor

- Keep MapLibre and deck.gl as the public atlas base for the main route.
- Use R3F only for selected object or scene-specific layers until it beats the baseline on visual gates.
- Add fixture-backed `ScenarioManifest`, civic design primitive, geo-comment, and layer-recipe contracts before broad UI replacement.
- Keep renderer ownership explicit through `renderer-boundaries` so basemap, dense overlays, scene assets, analytics, Data Lab, and Foundry do not collapse into one runtime.
- Route public state colors and badges through the shared OCA visual grammar instead of per-component ad hoc palettes.

## Accessibility Rules

- Reuse atlas-native components before adding new ones.
- Follow WCAG 2.2 as the web conformance target.
- Use WAI-ARIA APG patterns for tabs, dialogs, disclosure, combobox/search, and toolbar-like controls.
- Prefer native HTML controls before ARIA.
- Keep map/chart information available through textual panels, lists, tables, or summaries.
- Respect reduced motion and make pointer-driven map/chart states reachable without hover-only interaction.
