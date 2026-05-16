# Renderer Stack Integration

This repo should build from existing public primitives first, then add custom civic semantics through Our Civic Atlas contracts.

## Installed Browser Runtime

- MapLibre: primary map runtime for the live Atlas Scene.
- deck.gl: geospatial overlay layers for places, events, corridors, safety aggregates, and future Tile3D/terrain experiments.
- PMTiles and Protomaps basemaps: static/vector-tile path for low-cost atlas publication.
- Three.js and React Three Fiber: focused 3D overlays and scene previews, not the default UI shell.
- Mosaic, vgplot, Observable Plot, and DuckDB-WASM: analytical panels and crossfiltering.

## Installed Asset/Pipeline Boundaries

- `brush` from `github:ArthurBrussee/brush`: use as a Scene Foundry asset-generation dependency, not as a required public page renderer.
- `@thatopen/components`, `@thatopen/fragments`, `web-ifc`, and `camera-controls`: use for OpenBIM/IFC inspection and conversion experiments that feed reviewed web-safe assets.

## Runtime Rules

- Atlas Scene is the live web interface: MapLibre, deck.gl, PMTiles, Mosaic panels, dossiers, and selective Three/R3F overlays.
- SceneManifest is the data/rendering contract between civic objects and renderers.
- Scene Foundry is the background generation pipeline: Brush, Blender, IFC/OpenBIM, GLB, 3D Tiles, thumbnails, and previews.
- Public route rendering must not depend on live LLM/tool sessions, local authoring software, or unreviewed generated assets.
- Every rendered object needs a CivicObject id, source/confidence state, review state, and dossier link.

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
