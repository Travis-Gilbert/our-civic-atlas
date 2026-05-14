---
Approved: true
"Plan #": 4
---
 # Context
 This is what I needed I’m excited again I’m curious if these too would be additive. I imagine revit as being an intelligence layer for understanding 3d build form and blender as access to render that understanding freely

https://www.blender.org/lab/mcp-server/

https://github.com/mcp-servers-for-revit/mcp-servers-for-revit

---

Yes. I think these are additive, but I’d make one adjustment to your mental model:

**Revit is not just “3D understanding.” Revit is BIM semantics.**
It understands walls, doors, floors, rooms, levels, families, materials, schedules, quantities, phases, constraints, and building systems.

**Blender is not just “rendering.” Blender is visual world-building.**
It can render, stylize, animate, procedurally generate, texture, light, and turn a pile of civic geometry into an emotional place.

So the pairing is strong:

**Revit / BIM layer:** “What is this building made of? What type of object is it? How would a building professional understand it?”
**Blender layer:** “How does this place feel? How do we show memory, loss, density, absence, infrastructure, and time?”

For **Open Flint Atlas**, I would not make either of them the primary web-map runtime. I would use them as a **3D scene foundry** behind the atlas.

Your current Open Flint plan already says the core atlas should be mobile-first, source-grounded, and built around place dossiers, provenance, uncertainty, and public read models, with spatial truth in PostGIS/DuckDB/GeoParquet/PMTiles and provenance in Memgraph/Theseus. That means the live public interface should stay fast and web-native. But Revit and Blender can generate richer assets, model interpretations, and cinematic layers that feed that interface.

## My read: additive, but not as the base map

The safest stack is:

**MapLibre/deck.gl remains the live atlas map.**
**Mosaic/Plot remains the analytical layer.**
**Cosmograph remains the evidence/provenance layer.**
**Blender becomes the 3D/cinematic/ghost-city scene generator.**
**Revit becomes an optional BIM intelligence and validation workbench.**

This fits your existing Theseus-UI direction too. Your Scene OS already has lazy-loaded geospatial scenes using MapLibre/deck.gl with evidence fallback, and separate rich renderers for graph, mechanism, process, matrix, and image scenes. So the real move is not “replace the map with Blender.” It is: **add a Blender/Revit scene-generation rail that emits web-consumable artifacts.**

## Why Blender is immediately useful

Blender can help you make the atlas feel less like a remote GIS viewer and more like a civic time machine.

I would use Blender for:

historical building ghosts, vanished factories, demolition timelines, stylized block models, neighborhood fly-throughs, render stills for dossiers, animated “then/now” sequences, atmospheric terrain/rivers/streets, and generated preview thumbnails for selected places.

The official Blender MCP server is exciting, but it has a giant warning label: Blender’s own page says the MCP server executes LLM-generated code in Blender without guards protecting your data from removal or exfiltration. ([Blender](https://www.blender.org/lab/mcp-server/?utm_source=chatgpt.com "MCP Server")) So I would only run it locally, sandboxed, against copied assets, never against your main repo or sensitive source data.

Blender also has good geospatial paths. BlenderGIS can import common GIS formats such as Shapefile vectors, raster images, GeoTIFF DEM, and OpenStreetMap XML. ([GitHub](https://github.com/domlysz/blendergis?utm_source=chatgpt.com "domlysz/BlenderGIS: Blender addons to make the bridge ...")) Bonsai, formerly BlenderBIM, is a free/open native IFC authoring platform inside Blender, which matters if you want open BIM rather than proprietary Revit-only models. ([bonsaibim.org](https://bonsaibim.org/?utm_source=chatgpt.com "Bonsai - beautiful, detailed, and data-rich OpenBIM"))

My practical take: **Blender should be the first one you integrate.** It gives you immediate visual payoff without needing Revit licenses, Revit files, or Windows-centric workflows.

## Why Revit is useful, but more specialized

Revit MCP is interesting because it gives AI clients access to actual BIM operations. The `mcp-servers-for-revit` project says it lets MCP-compatible clients read, create, modify, and delete Revit project elements, using a TypeScript MCP server, a C# Revit add-in, and a command set that executes Revit API operations. ([GitHub](https://github.com/mcp-servers-for-revit/mcp-servers-for-revit "GitHub - mcp-servers-for-revit/mcp-servers-for-revit:  Sparx fork of the mcp-servers-for-revit/revit-mcp project · GitHub")) Its supported tools include things like current view info, current view elements, available family types, selected elements, material quantities, intelligent element querying, and model statistics. ([GitHub](https://github.com/mcp-servers-for-revit/mcp-servers-for-revit "GitHub - mcp-servers-for-revit/mcp-servers-for-revit:  Sparx fork of the mcp-servers-for-revit/revit-mcp project · GitHub"))

That is powerful, but it is not automatically useful for every Flint building. Most historical or demolished buildings will not have Revit models. For those, Revit is overkill unless you are generating plausible BIM reconstructions or analyzing an actual model.

Where Revit _is_ useful:

building-type templates, material/quantity estimates, conceptual massing, code-like building semantics, adaptive reuse scenarios, “what would this lost building roughly be as a BIM object,” and future integrations with architects or planning students who already work in Revit.

Autodesk also has an APS sample showing Revit Automation API workflows invoked by an MCP Revit Automation server, where an AI assistant request is translated into a WorkItem, executed in RevitCoreConsole, and returned as a result. ([GitHub](https://github.com/autodesk-platform-services/aps-sample-revit-mcp-tools-bundle "GitHub - autodesk-platform-services/aps-sample-revit-mcp-tools-bundle: Sample AppBundle for Automation API for Revit 2026 that enables AI assistants to execute custom tools on Revit Cloud Models through the MCP. · GitHub")) That suggests a future cloud/server route, but for your public-good atlas I’d keep Revit as optional because it adds licensing, infrastructure, and complexity.

## The best architecture: 3D Scene Foundry

I would add a new module called **Scene Foundry**.

It would not be the atlas itself. It would be a pipeline that turns civic data into visual and semantic 3D artifacts.

The flow would be:

Open Flint data goes into PostGIS and Theseus. PostGIS handles geometry, footprints, parcels, roads, DEM terrain, boundaries, and spatial joins. Theseus/Memgraph handles sources, claims, events, building-presence evidence, confidence, and provenance. Then Scene Foundry selects a bounded area, such as a block, corridor, neighborhood, or historical district. It generates a scene manifest. Blender renders or exports that scene. Revit/Bonsai/IFC can optionally provide BIM semantics for buildings. The web atlas receives lightweight outputs: glTF/GLB models, thumbnails, short animations, screenshots, metadata, and dossier links.

In plain terms:

**PostGIS says where.**
**Theseus says why we believe it.**
**Revit/Bonsai says what kind of built object it is.**
**Blender makes it visible, beautiful, and emotionally legible.**
**MapLibre/deck.gl serves it to phones.**

## Do not stream raw Blender/Revit into the phone UI

For mobile, the live atlas should load small assets, not run giant 3D workflows.

The user taps a vanished building. The dossier opens. It shows a small 3D preview or rendered still. If they want more, they open an “immersive view.” That immersive view can load a GLB, not a full Blender file or Revit model.

So the public output should be things like:

GLB models for selected blocks, PMTiles/MapLibre layers for building footprints, deck.gl extrusions for simple live geometry, rendered stills for article/building dossiers, short MP4/WebM timeline animations, and source/confidence metadata attached to every generated asset.

This also keeps the project accessible. The main civic interface remains fast. The deep 3D view becomes optional, not a gatekeeper.

## The magical layer: “ghost buildings”

This is where Blender becomes genuinely special.

Imagine a street-level or oblique scene where current buildings are solid, lost buildings are translucent, uncertain buildings shimmer or appear as dotted wireframes, and historically important events appear as small anchored markers.

A vanished building dossier could show:

what stood there, when it was present, when it disappeared, source evidence, confidence, related newspaper articles, related demolition records, historical photos if available, and a small rendered scene of the block.

That is not just more immersive. It makes historical absence visible. Urban planning people will absolutely feel that.

## Revit’s role in the ghost-building layer

For most lost buildings, you will not have enough information for a real BIM model. But Revit can still help create **semantic archetypes**.

For example:

a two-story wood-frame house, a brick commercial storefront, an auto plant bay, a school, a church, a warehouse, a row house, a gas station, a civic building.

You can map historical evidence to an archetype. Then you can generate a simple massing or IFC object. Revit/Bonsai can encode the semantic idea. Blender can render it as a ghost.

But the dossier should be honest: “This is a representative massing based on source type and estimated footprint, not a documented reconstruction.”

That honesty matters.

## Where Speckle fits

Speckle is worth considering as the bridge between Blender, Revit, and other AEC tools. Speckle’s Blender connector can exchange data with other CAD/BIM tools and specifically mentions sending Blender models into Revit as DirectShapes with materials. ([Speckle](https://speckle.systems/integrations/blender/?utm_source=chatgpt.com "Blender")) Speckle’s own repo describes it as object-based AEC data infrastructure with version control, collaboration, a 3D viewer, interoperability, real-time updates, GraphQL API, webhooks, and connectors for tools including Revit, Rhino, Grasshopper, AutoCAD, Civil 3D, and Blender. ([GitHub](https://github.com/specklesystems/speckle-blender?utm_source=chatgpt.com "specklesystems/speckle-blender"))

For your project, Speckle could become the “AEC interchange rail.” It is probably more useful than direct Revit MCP at first if the goal is moving geometry and metadata between tools.

My order would be:

Blender first.
Bonsai/IFC second.
Speckle third.
Revit MCP fourth, when you actually need Revit-native semantics or automation.

## Security posture for MCP

MCP is the right conceptual interface because it standardizes how AI apps connect to tools and data systems. Anthropic describes MCP as an open standard for connecting AI assistants to data sources and tools, replacing fragmented one-off integrations. ([Anthropic](https://www.anthropic.com/news/model-context-protocol "Introducing the Model Context Protocol \ Anthropic")) But the safety concern is real: the moment an LLM can execute Blender Python or Revit API operations, it can damage files, delete objects, leak data, or mutate a model incorrectly.

So for Open Flint Atlas:

Use MCP for local experiments and controlled generation jobs.
Never point Blender MCP or Revit MCP at your main source directories.
Run them against copied working folders.
Treat generated outputs as proposals.
Require review before promotion into the atlas.
Log every generated asset with source inputs, prompt, tool calls, and checksum.

That fits your current project principle that models should not directly mutate public facts and that predictions or generated outputs need labeling and review. The Open Flint plan already has this posture: public principles include visible sources, visible uncertainty, public benefit, privacy, and no model predictions presented as facts.

## What I would build next

I would create a **Scene Foundry v0** with one bounded test area.

Pick one area where the emotional payoff is high: St. John Street/Southside, Carriage Town, downtown, or Buick City.

The first milestone should be simple:

Take current building footprints or parcel footprints. Take a small set of vanished-building records. Generate a Blender scene with current footprints as low extrusions and vanished buildings as translucent ghost extrusions. Add a time slider or render a few year-states: 1920, 1950, 1980, now. Export stills and one GLB. Attach those outputs to place dossiers.

This would answer the question: does 3D make the atlas feel closer?

Then the second milestone can add semantic building archetypes: house, storefront, factory, school, church, warehouse. That is where Bonsai/IFC or Revit becomes useful.

The third milestone can add an MCP-assisted workflow: “Generate a ghost-building scene for this corridor using the scene manifest.” The agent calls Blender MCP, creates the scene, renders outputs, and writes a manifest back into Theseus as a reviewable proposal.

## A clean internal data object

I would add something like **SceneManifest** to the atlas pipeline. It can live as JSON first.

It would contain the place ID, bounding box, time range, source layers, current buildings, vanished buildings, terrain, roads, water, style preset, confidence settings, and output targets.

The important part is that the manifest is source-grounded. Blender should not invent the civic truth. It should only render what the manifest tells it to render.

That also makes it testable. You can validate that every ghost building in a scene has a source, confidence score, and time interval.

## What this does to the UI

The atlas becomes less “map with panels” and more “place with modes.”

Default mode is still fast map/dossier.

Then you add:

**Memory mode:** vanished buildings, historical events, newspaper articles.
**Build-form mode:** massing, building archetypes, density, land use, zoning.
**Evidence mode:** Cosmograph source/claim/event graph.
**Analysis mode:** Mosaic/Plot linked charts.
**Immersive mode:** Blender-generated scene or web 3D scene.

This also solves the issue you named: the base map currently feels far away. The answer is not just prettier cartography. The answer is letting the user enter Flint at multiple resolutions: county, city, neighborhood, corridor, block, building, article, source.

## My recommended priority

Start with **Blender + SceneManifest + GLB/still export**.

Do not start with Revit MCP. Revit is valuable, but it is heavier and more specialized. Blender gives you a fast emotional and visual upgrade. Bonsai/IFC gives you open BIM semantics without immediately depending on Revit. Revit MCP becomes powerful later when you want to work with actual BIM models or generate professional-grade building studies.

So the order I’d use is:

1. SceneManifest schema.

2. Blender scene generator from PostGIS/GeoJSON/GeoParquet.

3. Ghost buildings as translucent extrusions.

4. Export GLB plus dossier thumbnails.

5. Add source/confidence metadata to every generated object.

6. Try Bonsai/IFC for semantic building archetypes.

7. Add Speckle if you need AEC interoperability.

8. Add Revit MCP for real Revit automation or BIM analysis.


## The short version

Your instinct is right: **Revit can be the BIM intelligence layer, Blender can be the free visual/rendering layer.**

But for Open Flint Atlas, I’d phrase it more precisely:

**Revit/Bonsai/IFC help the atlas understand built form as building systems.**
**Blender helps the atlas render civic memory as an immersive scene.**
**MapLibre/deck.gl still carries the public mobile map.**
**Theseus/PostGIS/Memgraph still carry truth, provenance, and spatial logic.**

That combo could make the atlas feel less like “data about Flint” and more like **Flint as a layered, explorable civic memory palace**.
