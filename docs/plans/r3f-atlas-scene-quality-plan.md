# Orchestrate Plan: R3F Atlas Scene Quality

## Purpose

The first R3F slice proved that the app can mount a Three scene from live atlas
data, but it did not meet the design-quality bar. It lacked real geospatial
mesh, styled boundary geometry, labels, terrain/base layer, lighting/material
art direction, and level-of-detail strategy.

This plan describes what must exist before R3F becomes the public default.
Until then, MapLibre/deck.gl remains the higher-fidelity public renderer and
R3F stays opt-in through `?renderer=scene`.

## Renderer Roles

| Technology | Best role | Not the role |
|---|---|---|
| MapLibre | Tile/vector map baseline, bounds, fallback, route-safe geography, public default until parity. | Final emotional renderer. |
| deck.gl | High-volume geospatial layers, GPU aggregation, GeoJSON/Tile/Scatterplot/Path/Polygon layers, fallback data weather. | Complete authored world by itself. |
| R3F/Three | Authored civic scene, camera choreography, material grammar, source halos, Lost Flint ghost objects, spatial Node Horizon, selected-object focus. | Public default before geometry and visual parity exist. |
| Brush | Gaussian-splat reconstruction lane for specific sourced places, interiors, ruins, facades, and Lost Flint memories. | General map renderer, labels, boundaries, or citywide GIS substrate. |
| Mosaic/DuckDB-WASM | Fast filtering, brushed selections, Parquet/GeoParquet slices, chart-to-scene state. | Visual renderer. |
| Rusty Red/hot graph | Viewport hashes, nearby lookup, scene cache, source-crawl state, session acceleration. | Canonical spatial/provenance truth. |

## Recommended Architecture

Use a layered hybrid:

1. **Baseline Renderer**
   - MapLibre/deck.gl continues as the public default.
   - It keeps the live boundary, ward shapes, map labels, and fallback route.

2. **R3F Scene Renderer**
   - R3F receives compiled geometry, not raw centroid placeholders.
   - It uses the same atlas selection state, route state, and Mosaic filters.
   - It only becomes default after visual parity with baseline screenshots.

3. **Scene Foundry Assets**
   - Brush and IFC/OpenBIM outputs attach to specific SceneManifest objects.
   - They appear as selected-place or Lost Flint assets with source support.
   - They do not replace the citywide map substrate.

## Checklist

| ID | Task | Acceptance criteria | Validator | Status |
|---|---|---|---|---|
| R3FQ-001 | Shared world projection. | One `AtlasWorldProjection` maps lng/lat to stable R3F coordinates and is shared by places, events, labels, Node Horizon, and future assets. | Typecheck plus R3F desktop/mobile smoke for projected ward labels. | done |
| R3FQ-002 | Real geospatial mesh compiler. | R3F renders Flint boundary and ward polygons from GeoJSON, including multipolygons and holes where present. | Screenshot against baseline plus geometry count smoke. | partial |
| R3FQ-003 | Styled boundary geometry. | Boundary, wards, corridors, water, and selected areas have tokenized fills, outlines, edge highlights, and hover/selection states. | Visual review at Atlas/Oblique/Street/Section. | partial |
| R3FQ-004 | Terrain/base layer. | R3F scene has a bounded civic ground: outside-world veil, water/corridor anchors, subtle grid, and optional raster/vector texture from baseline map. | Desktop/mobile screenshots. | partial |
| R3FQ-005 | Labels and collision strategy. | City, ward, corridor, selected place, event, and Node Horizon labels render with depth-aware placement and do not overlap primary chrome. | Screenshot and resize smoke. | partial |
| R3FQ-006 | Lighting and material art direction. | Materials are tokenized: civic paper ground, translucent boundary glass, source halos, historical ghost surfaces, public-work marks, selected-object glow. | Design-token review and screenshot compare. | partial |
| R3FQ-007 | Level of detail. | Scene switches between city, ward, parcel/building, event, and asset detail by camera distance and lens without frame collapse. | Performance smoke on desktop and 390 x 844. | partial |
| R3FQ-008 | Instancing and batching. | Points, small places, events, and markers render through instanced geometry or merged buffers, not hundreds of independent expensive meshes. | React profiler or frame timing smoke. | done |
| R3FQ-009 | Deck.gl bridge. | Deck.gl remains available for dense analytical overlays and fallback, with compatible style tokens and shared selection IDs. | `?renderer=baseline` and `?renderer=scene` parity smoke. | partial |
| R3FQ-010 | Brush asset lane. | One Brush `.ply` or placeholder asset can attach to a sourced SceneManifest object behind feature detection and fallback. | Chrome/WebGPU smoke, fallback screenshot. | partial |
| R3FQ-011 | SceneManifest contract. | Scene objects describe geometry source, render mode, support state, asset refs, labels, and fallback behavior. | Fixture validation. | done |
| R3FQ-012 | Public-default gate. | R3F can only become default after it beats or matches the live renderer on desktop/mobile visual evidence. | Do Not Downgrade review. | partial |

## Data And Asset Pipeline

| Input | Compiler | R3F output |
|---|---|---|
| GeoJSON city boundary | `AtlasGeometryCompiler` | Extruded/flat city mask mesh. |
| GeoJSON wards/neighborhoods | `AtlasGeometryCompiler` | Styled polygon meshes and label anchors. |
| Places/events read model | `AtlasSceneObjectAdapter` | Instanced markers, selected-object focus, event beacons. |
| Mosaic/DuckDB selections | `AtlasSelectionBridge` | Filtered visible IDs and brushed time ranges. |
| SceneManifest assets | `SceneAssetResolver` | GLB/Brush/IFC asset refs with support states. |
| Brush splats | `BrushSceneAsset` | Selected-place reconstruction or Lost Flint ghost asset. |
| IFC/OpenBIM | `OpenBimSceneAsset` | Semantic building/object layer after review. |

## Brush Decision

Brush is not better than R3F for the whole atlas map. It is better for a very
specific part of the product: grounded reconstructions.

Use Brush when:

- We have photographs, COLMAP, Nerfstudio data, or a reviewed splat asset.
- The user is inspecting a specific building, corridor, ruin, interior, or Lost
  Flint memory.
- Photoreal texture and place-feel matter more than cartographic precision.

Do not use Brush when:

- We need citywide boundaries, labels, zoomable GIS layers, source tables, or
  public fallback behavior.
- We need Safari support without an alternate path.
- We do not have reviewed source assets.

## Optimal Combination

The optimal view is not one renderer. It is a staged composition:

1. **MapLibre/deck.gl public baseline**
   - Current high-fidelity live geography.
   - Best fallback and fastest safe default.

2. **R3F civic-world layer**
   - Real boundary/ward/corridor meshes compiled from the same sources.
   - Better lighting, materials, selected-object focus, Node Horizon, and Lost
     Flint grammar.

3. **Brush/IFC asset inserts**
   - High-emotion, source-backed local reconstructions.
   - Loaded only when selected or when a Lost Flint scene asks for them.

## First Implementation Slice

Build only enough to prove the quality path without boiling the lake:

1. Add `src/lib/atlas/world-projection.ts`. Done.
2. Add `src/lib/atlas/geometry-compiler.ts`. Done.
3. Render the Flint boundary and wards in R3F from actual GeoJSON instead of centroid columns. Partial: wards render; city-boundary union is still needed.
4. Add R3F labels for city, selected ward/place, and two Node Horizon portals. Partial: persistent ward labels are suppressed outside the flat Atlas view; city/corridor anchors and mobile suppression render; portal labels remain.
5. Add a material token map for boundary glass, civic ground, current object, historical event, source support, and selected object. Partial: `src/lib/atlas/three-materials.ts` now owns first scene tokens; full source/ghost/intervention grammar remains.
6. Capture desktop and 390 x 844 screenshots for `?renderer=scene` and compare against the live default. Partial: screenshots captured in `docs/visual-evidence/v1-drift/`.

## Progress Checkpoint - 2026-05-14

Branch: `r3f-atlas-scene-quality`.

Current renderer state:

- Public default is still the baseline MapLibre/deck.gl/Leaflet route; R3F is opt-in through `?renderer=scene` or `?renderer=r3f`.
- Public Evidence mode has been removed from routed launch surfaces and the public lens rail.
- R3F now uses `AtlasWorldProjection` plus `compileAtlasAreaMeshes` to render real ward polygons from the atlas GeoJSON instead of placeholder-only centroid columns.
- R3F now renders ward and park polygons, city/corridor anchor markers, a bounded civic base/grid, and tokenized materials from `src/lib/atlas/three-materials.ts`.
- R3F detail policy now lives in `src/lib/atlas/scene-detail-policy.ts` and controls DPR, geometry simplification, labels, event limits, place limits, and horizon visibility by view mode and mobile viewport.
- R3F detail policy now also responds to camera distance bands (`far`, `mid`, `near`) so Atlas/Oblique/Street/Section can progressively lower or raise marker density without replacing the renderer.
- Repeated place and event markers now render through color-batched `InstancedMesh` groups in `AtlasThreeScene.tsx`; selected-object focus remains a small individual overlay.
- The R3F scene root exposes non-visible runtime telemetry for detail level, camera band, instance counts, batch counts, draw calls, triangles, and label counts. The accessibility label also reports the active detail and marker counts.
- Ward labels now render only in the flat Atlas view or selected state, with simple collision. The default Oblique scene keeps ward geometry visible without persistent labels.
- Deck.gl dense-layer IDs and renderer bridge metadata live in `src/lib/atlas/renderer-bridge.ts`; the shell exposes dense-layer fallback and shared `place_id` selection metadata.
- `SceneManifest` objects/assets are typed and fixture-validated; the Flint overview scene now includes a placeholder Brush asset lane for Carriage Town with explicit fallback behavior.
- R3F desktop and mobile smoke checks confirm a mounted canvas, no MapLibre canvas in scene mode, and suppressed non-selected labels on mobile/default Oblique.
- A darker outside-world veil attempt failed visual review and was removed; the current veil is a lighter edge treatment around the bounded civic ground.
- Water anchors are present only where existing public event data supports them, currently the water service line intervention record on the citywide anchor. Real river/creek geometry remains absent from the fixture and is not faked.
- Visual evidence lives under `docs/visual-evidence/v1-drift/`.

Validation completed:

- `npm run typecheck`
- `npm run lint`
- `npm run validate:atlas`
- `npm run validate:routes:live`
- `npm run build`
- Playwright smoke for `/open-flint-atlas?renderer=scene` at desktop and `390 x 844`.
- Screenshot evidence for the terrain/water-anchor slice: `docs/visual-evidence/v1-drift/open-flint-atlas-r3f-terrain-water-desktop.png` and `docs/visual-evidence/v1-drift/open-flint-atlas-r3f-terrain-water-mobile.png`.
- `curl` confirms `/open-flint-atlas/evidence` returns `404`.

Remaining quality work before public-default consideration:

- R3FQ-004: stronger outside-world mask, real river/creek geometry, and optional baseline raster/vector texture. The current slice has a subtle edge veil plus source-backed water-infrastructure anchors only.
- R3FQ-005: real collision rules across city, ward, corridor, selected object, and Node Horizon labels.
- R3FQ-006: complete material grammar for selected objects, source halos, interventions, historical ghost surfaces, and support states.
- R3FQ-007: asset-level and user-zoom LOD remain partial; camera-distance bands and runtime telemetry are implemented.
- R3FQ-008: current places, events, stems, heads, and source halos are instanced/batched; future high-volume analytical overlays should stay in deck.gl.
- R3FQ-009: actual hybrid overlay composition for scene mode; the current bridge preserves IDs/fallback metadata but does not draw deck layers inside R3F.
- R3FQ-010: a reviewed Brush `.ply`/splat asset and WebGPU/browser fallback smoke; the current lane is a placeholder contract.
- R3FQ-012: public-default replacement remains blocked until R3F beats or matches the live baseline screenshots.

## Quality Gate

R3F can become public default only when these are true:

- It shows the recognizable Flint boundary and ward/corridor structure.
- It has at least baseline-level label legibility.
- It has meaningful visual hierarchy: boundary, selected object, events,
  source support, and Node Horizon are distinguishable.
- It does not feel like placeholder cylinders on a plane.
- It preserves dossier, search, layer controls, timeline, and mobile usability.
- It has a fallback path for unsupported WebGL/WebGPU or slow devices.
- It passes `npm run typecheck`, `npm run lint`, `npm run validate:atlas`,
  `npm run build`, and visual screenshot review.

## Open Questions

| Question | Recommendation |
|---|---|
| Should R3F or deck.gl own polygons first? | Let deck.gl remain public polygon owner while R3F compiler catches up. |
| Should Brush ship in V1? | Ship a single sourced Lost Flint/SceneManifest prototype if WebGPU and fallback are clean. |
| Should R3F use map tiles as texture? | Yes as an optional bridge, but the target should be source-backed vector/mesh styling. |
| Should public users see Evidence mode? | No. Keep support/progress inside selected-object and source-detail workflows. |
