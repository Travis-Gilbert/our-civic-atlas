---
Approved: true
"Plan #": 3
---
# Problem

I’ve got a lot of the spec built most of the visual. Im a little underwhelmed just the map it’s self. I’m wondering if maybe I can make it more immersive somehow? The issue I think is the base map layer it’s leaflet or deck.gl depending on what you’re viewing from it’s fine but not optimal. My first thought was make it so that the map can only see Genesee County that way you’re more scoped to a place but my second thought which could layer on top and I think is better is what if we used like a video game rendering engine for the map? And or a R3F library that’s for maps if that exist it’s just at the moment it’s just not engaging and feels far away.

The additions to it like Cosmo GL mosaic data visualizations are also cool, but I feel like the base layer is setting them back

—

# Plan

According to your Open Flint Atlas plan from May 12, 2026, the static prototype is already working, but the “product complete” visual gate is still only partial: useful on mobile and desktop with source cards and confidence reasons visible, but not yet emotionally or spatially compelling. That matches your gut exactly. The map is no longer just a container. It has become the stage.

My take: **do not jump straight to a full video game engine as the primary public interface.** Build a **game-engine-feeling geospatial scene** first.

The winning architecture is probably:

**MapLibre as the geographic camera and tile engine.**
**deck.gl as the heavy data-overlay engine.**
**Three.js / R3F as the immersive object and atmosphere layer.**
**Mosaic/Plot as the analytical crossfilter layer.**
**Cosmograph as the evidence/provenance graph layer.**
**CesiumJS as an optional deeper 3D experiment, not the default.**

That gives you the feeling of a place you can enter, without losing the boring-but-vital GIS machinery underneath.

## The core problem

The base map feels far away because it is acting like a generic web map. It probably feels like “data pasted onto geography,” not “Flint as a living civic scene.”

So the fix is not only “better basemap.” It is:

**make Genesee County feel like a bounded world.**

I would absolutely restrict the experience to Genesee County or at least strongly frame it that way. MapLibre supports restricting map panning with `maxBounds`, so you can prevent the user from drifting into “random Midwest web map mode.” ([MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/examples/restrict-map-panning-to-an-area/?utm_source=chatgpt.com "Restrict map panning to an area"))

But I would go further than hard bounds. Use a **county mask**: Genesee County is crisp, detailed, and illuminated; everything outside is dimmed, blurred, or treated as dark context. This makes the atlas feel like a civic instrument focused on one place, not a commodity basemap wearing a Flint nametag.

## My recommended visual direction

I would build a new primary surface called something like **Atlas Scene** or **Flint Scene**.

It starts with Genesee County framed tightly. Not a flat map floating in the infinite internet void. A contained place. The Flint River, major roads, ward boundaries, neighborhoods, and civic layers become the first landmarks. Labels are local and intentional. Generic POIs get stripped out unless they support the civic story.

Then add depth.

MapLibre already supports 3D terrain and building/polygon extrusions, and it has official examples for 3D terrain, 3D buildings, and adding Three.js models through custom layers. ([MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/?utm_source=chatgpt.com "3D Terrain - MapLibre GL JS"))

For Open Flint, the most powerful use of 3D is not skyscraper realism. Flint does not need to become SimCity. The better move is **temporal depth**:

Existing buildings are subtle solid forms. Lost buildings are translucent wireframes. Historic events appear as small vertical markers rising from the ground. Crash patterns flow along road segments. Planning interventions appear as time-banded halos. Source confidence changes the opacity, glow, or sharpness of a feature.

That gets you immersion without turning the atlas into a haunted GPU carnival.

## Use MapLibre, but redesign the basemap

I would move away from Leaflet as the main experience. Leaflet is fine for simple 2D maps, but the kind of atmosphere you want needs a WebGL vector-tile renderer. MapLibre GL JS is an open-source TypeScript library for rendering interactive maps from vector tiles in the browser, with styling controlled by a style document. ([MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/?utm_source=chatgpt.com "Introduction - MapLibre GL JS"))

For the basemap source, I would look seriously at **Protomaps PMTiles** or **OpenFreeMap**.

PMTiles is designed to be read directly in the browser by MapLibre and can be used for basemap tilesets or thematic overlays. ([docs.protomaps.com](https://docs.protomaps.com/pmtiles/maplibre?utm_source=chatgpt.com "PMTiles for MapLibre GL")) Protomaps also maintains an open basemap tileset built from OpenStreetMap and other open data, and you can extract specific areas instead of carrying the whole planet. ([protomaps.com](https://protomaps.com/?utm_source=chatgpt.com "Protomaps - The open source map in a file")) OpenFreeMap is another strong public-good-aligned option because it is open-source, uses OpenStreetMap data, and can be self-hosted or used through its public instance. ([openfreemap.org](https://openfreemap.org/?utm_source=chatgpt.com "OpenFreeMap"))

For a public-good project, that matters. You do not want the emotional center of the atlas dependent on a commercial basemap that might become expensive, restricted, or visually generic.

## Yes, R3F-for-maps exists

React Three Fiber itself is a React renderer for Three.js. It lets you build Three.js scenes declaratively as React components. ([r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/?utm_source=chatgpt.com "React Three Fiber: Introduction"))

There are map-specific bridges. `react-three-map` lets you use a R3F-style canvas inside Mapbox/MapLibre and position the scene by latitude and longitude. ([GitHub](https://github.com/RodrigoHamuy/react-three-map?utm_source=chatgpt.com "RodrigoHamuy/react-three-map")) There is also `react-three-maplibre`, which is explicitly built around React, Three.js, MapLibre GL, and geospatial 3D visualization, though I would treat it as more experimental until you test stability. ([GitHub](https://github.com/Trapar-waves/react-three-maplibre?utm_source=chatgpt.com "Trapar-waves/react-three-maplibre"))

My practical recommendation: **start with MapLibre’s official Three.js custom layer pattern**, then wrap it in React/R3F once you know the coordinate math, camera sync, hit testing, and mobile performance are behaving. The official MapLibre examples show Three.js models using the MapLibre canvas and WebGL context, which is the stable foundation. ([MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/?utm_source=chatgpt.com "Add a 3D model using three.js"))

## The “video game engine” idea

For the main web app, I would not use Unity or Unreal first.

Not because it is impossible. Cesium for Unreal and Cesium for Unity exist specifically to bring real-world 3D geospatial content, terrain, imagery, 3D buildings, and 3D Tiles into game engines. ([Cesium](https://cesium.com/learn/cesium-unreal/ref-doc/?utm_source=chatgpt.com "Cesium for Unreal"))

But for a public civic atlas, a full game engine creates problems: heavier load, harder mobile accessibility, harder text/chart/UI integration, more friction for deep links, harder data-layer toggling, harder source cards, and more risk of spectacle overpowering civic legibility.

I would use Unreal/Unity only for a **separate cinematic demo mode** or a grant/contest trailer. The public app should remain browser-native.

The better “game engine” for the actual atlas is a custom WebGL scene stack: MapLibre, deck.gl, Three/R3F, maybe CesiumJS for a dedicated 3D view.

## Where CesiumJS fits

CesiumJS is the serious option if you want a true 3D geospatial world: terrain, globe, 3D Tiles, high-precision WGS84 coordinates, and massive 3D datasets in the browser. Cesium describes CesiumJS as an open-source JavaScript library for 3D globes and maps, designed for performance, precision, visual quality, interoperability, and massive datasets. ([Cesium](https://cesium.com/platform/cesiumjs/?utm_source=chatgpt.com "CesiumJS"))

If you eventually want “walk the vanished Buick City landscape” or “fly through historical Flint layers,” CesiumJS is a strong candidate.

But I would not make CesiumJS the default atlas shell yet. It is better as an **Immersive Mode** route. The main Atlas Scene should stay MapLibre-centered because it plays more naturally with vector tiles, mobile maps, deck.gl overlays, Mosaic crossfiltering, and your existing UI direction.

## Where deck.gl fits

deck.gl should stay, but not as the emotional base layer. It is best as the GPU data-visualization overlay engine. Its own docs frame it as a GPU-powered framework for large-scale visual exploratory data analysis. ([deck.gl](https://deck.gl/?utm_source=chatgpt.com "Home | deck.gl"))

For Open Flint, deck.gl is perfect for crash flows, point clouds, arcs, heatmaps, H3/hex overlays, path layers, Tile3DLayer experiments, and terrain-aware 3D overlays. deck.gl also supports 3D Tiles through `Tile3DLayer`, including terrain-aware navigation and overlays on 3D surfaces. ([deck.gl](https://deck.gl/docs/developer-guide/base-maps/using-with-3d-tiles?utm_source=chatgpt.com "Using with 3D Tiles"))

So: **MapLibre is place. deck.gl is data weather. Three/R3F is atmosphere.**

## Where Mosaic fits

Mosaic should not try to be the basemap. It should be the linked analysis layer.

The NYC Taxi Rides example is directly relevant because it projects longitude/latitude in DuckDB, then lets spatial selections filter other views. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic/examples/nyc-taxi-rides.html?utm_source=chatgpt.com "NYC Taxi Rides | Mosaic")) Mosaic’s Framework example also uses a data loader to ingest remote data into DuckDB, project coordinates in the database, and generate a Parquet file for visualization. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic-framework-example/nyc-taxi-rides?utm_source=chatgpt.com "NYC Taxi Rides | Mosaic + Framework"))

That pattern is exactly right for crash events, historic newspaper events, vanished buildings, health resources, and civic interventions. The map can feel immersive while Mosaic handles the serious slicing: time, ward, event type, source confidence, source freshness, corridor, tract, and layer category.

## Where full Cosmograph fits

Yes, because this is non-commercial/public-good work, full Cosmograph is interesting. Cosmograph’s own licensing page says it is free for non-commercial use under CC BY-NC 4.0, while commercial use requires a proprietary license. ([cosmograph.app](https://cosmograph.app/licensing/?utm_source=chatgpt.com "Licensing"))

That means it fits this atlas right now, but you should keep one caution in mind: if this later supports paid contract work, you will need to revisit licensing or separate public/non-commercial use from commercial deployments.

Visually, I would not put Cosmograph on the base map all the time. Use it as the **Evidence Constellation** view. When a user selects a parcel, street, ward, article, vanished building, or crash corridor, they can tap “show evidence graph.” Cosmograph then shows the network of sources, claims, articles, datasets, interventions, people/organizations, and related places.

Cosmograph is built for local, high-performance visualization of large network graphs and embeddings, and its app docs emphasize browser-side graph/embedding analysis, local GPU work, and timeline support. ([cosmograph.app](https://cosmograph.app/?utm_source=chatgpt.com "Cosmograph: Beautiful visualization and analytics right in the ..."))

So the role is:

**MapLibre shows where.**
**Mosaic shows patterns.**
**Cosmograph shows why the atlas believes what it believes.**

## The best visual upgrade: “Lost Flint” as 3D ghosts

The strongest immersive layer is still the vanished-buildings layer.

Make historic buildings appear as ghost geometry. Not photorealistic models at first. Start with simple translucent extruded footprints. If you know height, use height. If not, use a default height by building type or confidence. If the building is only weakly located, make it softer, blurrier, or lower opacity.

This gives you a visual grammar:

A crisp solid shape means current/high-confidence.
A translucent wireframe means historical/vanished.
A flickering or dotted outline means uncertain location.
A vertical timeline stem means the place has multiple dated observations.
A source badge tells whether the evidence came from Sanborn maps, city directories, aerials, newspapers, demolition records, or community contributions.

OpenHistoricalMap has a MapLibre dates plugin designed to filter time-enabled map data by date, and that is worth studying for your historical layer even if you build your own time controls. ([GitHub](https://github.com/OpenHistoricalMap/maplibre-gl-dates/?utm_source=chatgpt.com "OpenHistoricalMap/maplibre-gl-dates"))

## What I would build next

First, make a **Genesee County scene shell**. Use MapLibre, set county bounds, add a county mask, and build one custom basemap style. Do not use a default OSM/MapLibre style except as raw material. Strip out visual noise. Keep roads, water, labels, parks, civic boundaries, and selected landmarks. Make the map feel authored.

Second, add **camera presets**: County, Flint, neighborhood, corridor, street, parcel. This alone will make the atlas feel less far away. Users should not be manually zooming from outer space into a place they care about. The app should choreograph the approach.

Third, add **3D building/parcel extrusions**. Use current building footprints where available, parcel/building approximations where not, and ghost extrusions for vanished buildings. MapLibre’s fill-extrusion examples are enough for the first pass. ([MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/examples/extrude-polygons-for-3d-indoor-mapping/?utm_source=chatgpt.com "Extrude polygons for 3D indoor mapping"))

Fourth, add a **Three/R3F custom layer only for selected or animated objects**: source halos, event beams, lost-building ghost shimmer, selected corridor ribbons, maybe animated crash-risk pulses. Do not render every single thing in Three. Use Three for moments, not everything.

Fifth, connect the map to **Mosaic crossfilters** and **Cosmograph evidence graphs**. The map selection should filter the charts. The dossier should open the evidence graph. The evidence graph should be optional, not forced.

Your existing Open Flint plan already points at MapLibre, Mosaic, Plot, place dossiers, PostGIS/DuckDB/GeoParquet/PMTiles, and Memgraph/Theseus provenance. So this is not a pivot away from the plan. It is a visual deepening of the same architecture.

## How this fits your existing Theseus UI direction

This also fits your current Theseus surface better than a from-scratch game engine. Your codebase already has Scene OS and Explorer surfaces, and the newer scene renderer direction includes lazy-loaded geospatial scenes using MapLibre/deck.gl, graph scenes using the existing Cosmos graph engine, and other rich renderers through a scene registry.

So I would treat Open Flint Atlas as a **ScenePackage / SceneHost-quality surface**, not merely an Observable page. Observable/Mosaic can still power the analytical panels, but the immersive map shell probably belongs in the Next/React scene system.

## My stack choice

For the main public atlas:

**Next.js + MapLibre + Protomaps/OpenFreeMap PMTiles + deck.gl + Three/R3F custom layers + Mosaic/Plot panels + Cosmograph evidence view.**

For the optional immersive experiment:

**CesiumJS + 3D Tiles + terrain + historic/vanished-building layers.**

For the contest/trailer path only:

**Cesium for Unreal or Unity**, if you want a cinematic walkthrough. Not the default public interface.

## The one design rule I’d keep repeating

Do not make it more immersive by making it more complicated.

Make it more immersive by making Flint feel **nearer**.

The atlas should open like a small civic world: bounded county, legible neighborhoods, ghost buildings, living data, source confidence, timelines, and evidence constellations. The base layer should not be background wallpaper. It should be the first act of the story.