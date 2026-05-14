---
Approved: true
---

# Context

Wow! I literally was about to pitch the ghost-building layer and you beat me too it.
Is there a software that can replace revit without licensing complications?

Is there a data loading technique that could make a more full version of this maybe if it could compile to WASM?
We have to integrate this https://github.com/ArthurBrussee/brush

“Mapping historic data to objects” - brilliant phrasing, really.  the idea of mapping data to objects generally, but also that data not having to be constrained to the object currently existing. God this is gonna be so cool.

Two logistical questions first thinking about the overall function of this website anyone can upload to it plus TF.js Help automate some parts of moderation.
I’m also in the midst of setting up an automatic web retrieval system for information and data sets involving Flint. That is to say that an MCP server, which would require an active LLM In order to build buildings may not be the best choice if I’m understanding how that works correctly? Instead, it seems like it would need an intelligent renderer that can take information and translate that information into three dimensional. Space blender still feels like a possible component for this, but I don’t think it’s everything.

Additionally, this is not a core function of Theseus. It’s just something that happened to be able to do so I don’t want to mess up anything in the source code.  My thought thoughts were maybe I could make a “ account “ for Flint Rather than adding a tremendous amount of Flint specific geography to core Theuses (an important note here is I have never built anything other than a single user system. It is entirely possible that this is not a real problem and I just don’t have a mental model of how multi user accounts work.)
Also, I’ve been in the midst of building a custom database I call it the ‘rusty red graph database’  it’s forked and customized from the defunct Redis graph, rebuilt in rust and I’m considering adding these and using it as a hot graph database if that would enable real better speed. https://redis.io/docs/latest/commands/geohash/
https://redis.io/docs/latest/develop/data-types/geospatial/

—

# Plan

According to your Open Flint Atlas plan from May 12, 2026, the project is already framed as a public-interest civic atlas with source provenance, uncertainty, community correction, PostGIS/DuckDB/GeoParquet spatial truth, and Memgraph/Theseus provenance graph surfaces. That means your instinct is right: this should not become “Blender with a website around it” or “Theseus with a bunch of Flint-specific code stuffed into core.” It should become a **bounded civic scene system** that can render historic evidence into objects, scenes, maps, dossiers, and review queues.

## Revit replacement: use OpenBIM, not a Revit clone

The best replacement is not one app. It is an **OpenBIM stack**.

Use **IFC** as the semantic building format. Use **IfcOpenShell** as the open IFC toolkit and geometry engine. Use **Bonsai** inside Blender when you want a free/open graphical BIM authoring environment. Use **FreeCAD BIM / NativeIFC** when you want parametric CAD/BIM modeling without Revit licensing. Use **That Open Engine / web-ifc** when you want browser-side BIM parsing, viewing, and interaction.

Bonsai is explicitly a free, open-source native IFC authoring platform built as a Blender add-on, and it supports authoring, drawing generation, structural analysis, MEP systems, costing/scheduling, facility management, and live building sensors. ([Bonsai BIM](https://bonsaibim.org/ "Bonsai - beautiful, detailed, and data-rich OpenBIM")) IfcOpenShell is the deeper library layer: it reads, writes, and modifies Building Information Models using IFC, supports multiple IFC schemas and formats, and works across Windows, Mac, and Linux in C++ or Python. ([IfcOpenShell](https://ifcopenshell.org/ "IfcOpenShell - The open source IFC toolkit and geometry engine")) FreeCAD’s BIM Workbench provides a modern BIM workflow with parametric objects like walls, beams, roofs, and windows. ([FreeCAD Wiki](https://wiki.freecad.org/BIM_Workbench?utm_source=chatgpt.com "BIM Workbench"))

For this atlas, I would make the canonical stack:

**IfcOpenShell + Bonsai + FreeCAD + Blender + web-ifc / That Open Engine.**

That gets you away from Revit licensing and into an open-data architecture. Revit can remain optional for collaborators who already have it, but it should not be required for the project.

## The bigger idea: an intelligent renderer, not an MCP renderer

Your understanding of MCP is basically correct. A Blender MCP server or Revit MCP server is useful for **agent-assisted authoring**, but it is not the right thing to depend on for public site rendering.

MCP requires an agent/tool session. That is good for workflows like “generate a scene from this reviewed manifest” or “inspect this IFC model and report missing fields.” It is not good as the live infrastructure behind every page load.

What you want is an **intelligent renderer** with a deterministic scene grammar.

The pipeline should be:

Data and sources come in. The atlas creates reviewed civic objects. Those objects become a **Scene Manifest**. The renderer reads the manifest and emits map layers, GLB models, 3D Tiles, splats, thumbnails, or dossier previews. An LLM can help propose interpretations, but the actual public scene should render from reviewed structured data.

In plain terms: **the renderer should not ask an LLM what Flint looked like every time someone loads the page.** It should read a verified manifest and draw.

That also protects Theseus. The Open Flint plan already says the atlas should have a reversible boundary, should not replace mature Theseus/Context surfaces, and should keep contribution/review/privacy workflows separate until reviewed.

## “Mapping historic data to objects” is the core abstraction

This phrase is the spell.

A “building object” does not need to currently exist. It can be a temporal object with observations.

A lost building might have a footprint from a Sanborn map, a business name from a city directory, an article mention from a newspaper, an aerial-photo presence signal from 1966, and a demolition record from 2024. The object is not “true because it exists today.” It is true as a **source-backed historical presence interval**.

So the core object should be something like:

A place-bound object with a type, geometry, time interval, confidence, source links, observation history, and render recipe.

For example, a vanished storefront might become: “commercial building, likely present from 1928 to 1966, absent by 1997, footprint confidence medium, name confidence low, render as translucent brick-storefront archetype.” A demolished factory bay might become: “industrial structure, present until 2012 according to RACER Trust / demolition source, render as large ghost massing with high confidence.” That is much more powerful than only mapping current parcels.

Your earlier Lost Flint idea already points exactly there: the right object is “building presence over time,” not simply “building.”

## Data loading: use a streaming scene stack

For a fuller version that still works on phones, I would use a multi-format loading strategy.

Use **PMTiles** for base maps and vector-tile layers. PMTiles is a single-file archive format for tiled data, and it can be hosted on S3-like static storage without a custom tile backend. ([GitHub](https://github.com/protomaps/pmtiles "GitHub - protomaps/PMTiles: Pyramids of map tiles in a single file on static storage · GitHub"))

Use **DuckDB-WASM** for in-browser analytics and crossfiltering. DuckDB-WASM runs inside the browser, and the docs note it can be embedded as a JavaScript + WebAssembly library. It does have browser memory/thread limitations, so it should be lazy-loaded rather than bundled into the first paint. ([DuckDB](https://duckdb.org/docs/current/clients/wasm/overview.html "DuckDB Wasm – DuckDB")) DuckDB-WASM can also use the spatial extension, which supports geospatial types and workloads in the browser. ([DuckDB](https://duckdb.org/2023/12/18/duckdb-extensions-in-wasm.html "Extensions for DuckDB-Wasm – DuckDB"))

Use **GeoParquet** for analytical read models. Use **FlatGeobuf** when you want viewport-based feature loading with spatial filtering over HTTP range requests. FlatGeobuf’s docs specifically discuss remote access and spatial filters, with CDN caching recommended because spatial filtering may require multiple requests. ([flatgeobuf](https://flatgeobuf.org/?utm_source=chatgpt.com "FlatGeobuf | flatgeobuf"))

Use **glTF/GLB** for individual object models and small scenes. Use **3D Tiles** when the 3D layer becomes large. OGC describes 3D Tiles as a standard for streaming massive 3D geospatial content, including 3D buildings, BIM/CAD, point clouds, and photogrammetry. ([Open Geospatial Consortium](https://www.ogc.org/standards/3dtiles/ "3D Tiles Standard – Streaming Massive 3D Geospatial Data"))

Use **web-ifc / That Open Engine Fragments** for browser BIM. That Open’s docs are very relevant here: they say loading IFC at runtime is too slow for production, and the recommended workflow is to parse/convert IFC once, save the resulting Fragment file, and load that file in later sessions. ([That Open](https://docs.thatopen.com/Tutorials/Components/Core/IfcLoader "IfcLoader | That Open docs"))

So the atlas should not load one giant magical dataset. It should load different layers at different levels of detail, like a little civic theater assembling the right set pieces for the current scene.

## Brush is absolutely worth integrating

Brush is a great fit, but for a specific role.

Brush is a 3D reconstruction engine using Gaussian splatting. Its README says it works on macOS, Windows, Linux, AMD/Nvidia/Intel GPUs, Android, and in a browser using WebGPU-compatible tech and the Burn machine learning framework. It also says training can work natively, on mobile, and in a browser, taking COLMAP data or Nerfstudio-format datasets. ([GitHub](https://github.com/ArthurBrussee/brush "GitHub - ArthurBrussee/brush: 3D Reconstruction for all · GitHub"))

That means Brush is not the deterministic renderer for all historical objects. Brush is the **photogrammetry / reconstruction layer**.

Use Brush when you have real images: current buildings, ruins, streetscapes, interiors, murals, monuments, landmarks, surviving industrial fragments, or maybe historical photo sets with enough overlap. It can create splat-based scenes that feel much more alive than extruded boxes.

But if you only have a Sanborn footprint and one city-directory mention, Brush should not invent a building. That should be a procedural ghost object, not a Gaussian splat.

The integration I’d use:

**Procedural renderer:** source-backed ghost buildings, footprints, archetypes, timelines.
**Brush:** reconstructed scenes from real image sets.
**Blender:** authoring, stylization, scene export, cinematic renders.
**Bonsai/IfcOpenShell/FreeCAD:** semantic BIM and IFC archetypes.

That gives each tool a job. No tool becomes the whole cathedral.

## TF.js moderation: useful, but only as a first-pass bouncer

For public uploads, TF.js can help, but it should not be the final moderator.

TensorFlow.js can run ML directly in the browser or Node.js, and it supports existing models, converted Python TensorFlow models, retraining, and browser demos. ([TensorFlow](https://www.tensorflow.org/js "TensorFlow.js | Machine Learning for JavaScript Developers")) The TensorFlow blog’s moderation example uses a toxicity model with a configurable threshold, and it emphasizes that the threshold is something you must choose for your use case. ([TensorFlow Blog](https://blog.tensorflow.org/2022/08/content-moderation-using-machine-learning-a-dual-approach.html "Content moderation using machine learning: a dual approach — The TensorFlow Blog")) For images, NSFWJS is a client-side TensorFlow.js library for detecting inappropriate images, but its own README warns it is not perfect. ([GitHub](https://github.com/infinitered/nsfwjs "GitHub - infinitered/nsfwjs: NSFW detection on the client-side via TensorFlow.js · GitHub"))

So the upload flow should be:

Resident uploads text/photo/source. Client-side TF.js checks for obvious toxicity or NSFW content before submission. The server then stores the upload privately as a pending observation. It is never immediately public. A second moderation pass checks image metadata, faces/license plates if you add that, geolocation, duplicate submissions, suspicious links, and personal information. Then a human or trusted moderator promotes it to public observation, accepted evidence, or rejection.

That matches your Open Flint principle that community reports are observations, not automatic facts. It also matches the plan’s OFA-009 requirement: public submissions need review states like submitted, needs review, corroborated, conflicting, accepted, rejected, and superseded, with no contributor identity in the public read model.

## The upload system should be boringly strict

Public-good projects get harmed by sloppy contribution systems. I would make every upload land in a private review queue with:

Contributor ID or anonymous token, never public by default. Location confidence. Source URL if any. Photo/file hash. Moderation scores. Human-readable note. Suggested object link. Review state. Public-safe transformed version. Audit log.

The public map should show “community observation pending review” only if you intentionally enable that mode. For most views, public data should show reviewed observations only.

The weird phrase I’d use internally: **upload is not publication.** Upload is evidence intake.

## “Flint account” means tenant/project, not city impersonation

You are right to think about this as an account boundary, but I would not create an account called “City of Flint” unless there is an official partnership.

Use a tenant/project mental model:

The tenant could be **Open Flint Atlas** or **Civic Atlas Lab**. The project is **Flint, Michigan**. The City of Flint GIS, Genesee County GIS, Flint Property Portal, MapFlint, Census, etc. are source entities inside that project. They are not account owners.

This matches how multi-user systems usually work:

A **User** is a person who logs in.
A **Tenant** is an organization/workspace boundary.
A **Project** is a bounded body of work inside a tenant.
A **Role** decides what a user can do in that tenant/project.
A **Source** is an external data authority or document origin.
A **Contributor** can submit observations without being a full admin.

Your current Theseus direction already seems to have this machinery emerging. The codebase map says the product router exposes durable `ProductTenant` records, tenant-scoped `Project` creation, tenant member roles, and API-key control-plane routes; it also distinguishes viewer/member/admin/owner-style authority, which is exactly the mental model you need here.

So: do not stuff Flint into core Theseus. Create a bounded project/tenant or, even better, a standalone Open Flint package that uses Theseus services.

## Keep Open Flint as a plugin/domain pack first

Since this is not a core Theseus function, I would avoid deep source changes.

The safe route is:

Open Flint Atlas becomes a bounded project, domain pack, or standalone app that talks to Theseus through existing APIs. It can use Theseus for search, graph, provenance, review, and artifact capture. It can use PostGIS/DuckDB for spatial truth. It can export static public read models. It can have its own UI shell.

Your own plan already says Open Flint should keep a reversible boundary until a standalone repo or app shell is approved, and that source registry/read model/provenance validators are the first stable slice.

That means the path should be:

Open Flint-specific data lives in Open Flint storage.
Open Flint-specific UI lives in an Open Flint route/app.
Theseus core receives generic reusable concepts only: source registry, place dossier, contribution review, scene manifest, provenance graph, spatial object mapping.

The reusable abstraction is not “Flint.” The reusable abstraction is **source-backed civic scene objects**.

## Your Rusty Red Graph database: use it as hot graph, not canon

I like the idea, but I would keep it in the same role as THG/Redis hot state: fast, close to the UI, and disposable/rebuildable.

Redis itself has geospatial indexes for storing coordinates and searching nearby points within a radius or bounding box. The docs explicitly warn that this geospatial data type is for simpler use cases and is not the same as Redis Search’s richer geospatial features. ([Redis](https://redis.io/docs/latest/develop/data-types/geospatial/ "Redis geospatial | Docs")) GEOADD stores longitude/latitude/member data into a sorted set and makes it queryable with GEOSEARCH; Redis also notes the geo index structure is just a sorted set. ([Redis](https://redis.io/docs/latest/commands/geoadd/ "GEOADD | Docs")) GEOHASH returns geohash strings for members in that geospatial index and is O(1) per requested member. ([Redis](https://redis.io/docs/latest/commands/geohash/ "GEOHASH | Docs"))

That is perfect for:

Nearby contribution lookup. Fast “what’s near this tap?” queries. Candidate deduplication. Active viewport object cache. Hot source-priority queues. Live map markers. Recent uploads. “Objects within 250 meters of this point.” Quick geohash bucketing for points.

It is not enough for:

Parcel polygons. Building footprints. Zoning intersections. Historical footprint overlays. Area containment. Legal-ish spatial queries. Buffers over lines and polygons. Spatial joins at scale. Anything where correctness matters.

PostGIS remains the spatial authority. Redis/Rusty Red Graph can be the hot object index.

Also, RedisGraph itself is officially end-of-life; Redis announced in 2023 that it was phasing out RedisGraph. ([Redis](https://redis.io/blog/redisgraph-eol/ "RedisGraph End-of-Life Announcement | Redis")) That does not mean your Rust fork is bad. It means you are now the maintainer of that engine’s correctness, planner behavior, query semantics, and operational safety. For Open Flint, I would only use it where failure degrades gracefully.

Your codebase map already says Memgraph is the canonical store for graph entities, THG is the hot/SDK surface, Redis is run-state hot cache, and Postgres is SQL-native only. That suggests the clean role for Rusty Red Graph is:

**hot graph and spatial-nearby accelerator, not canonical civic truth.**

## H3 may be better than raw geohash for civic layers

For many atlas layers, I would consider H3 alongside Redis GEO. H3 is an open-source geospatial indexing system that partitions the world into hexagonal cells, with functions for converting latitude/longitude to cells, finding neighbors, and getting boundaries. ([h3geo.org](https://h3geo.org/docs/?utm_source=chatgpt.com "Introduction | H3"))

Use H3 for aggregation and visualization: crash density, contribution density, health-resource access, source freshness, or “places with weak evidence.” Use Redis GEO for fast nearby point lookup. Use PostGIS for exact geometry.

So the spatial indexing stack becomes:

PostGIS for truth.
H3 for grid aggregation.
Redis/Rusty Red Graph for hot nearby lookup.
PMTiles/3D Tiles for serving.

## The data-to-objects renderer I’d build

I would add a new concept called **Civic Object Renderer** or **Scene Foundry**.

It takes a reviewed civic object and translates it into a renderable thing.

A building-presence object can become a ghost extrusion. A current building footprint can become a solid extrusion. A historical article can become a timeline marker. A crash cluster can become a road-segment pulse. A source can become an evidence badge. A resident observation can become a pending/reviewed marker. A Gaussian splat can become an immersive preview.

The key is that every rendered object carries:

What it is. Where it is. When it existed or was observed. Which sources support it. What confidence it has. Whether it is current, vanished, inferred, reconstructed, or user-submitted. How it should render at mobile, desktop, and immersive levels.

This is how you escape the “map layer” trap. You stop thinking in layers only and start thinking in **source-backed civic objects with render modes**.

## A practical architecture

I would structure it like this.

Open Flint Atlas has a source registry and retrieval jobs. They fetch public data, historical documents, user uploads, and source updates. Those become raw artifacts. Extractors create candidate claims, places, objects, and building-presence observations. Review promotes them or rejects them.

PostGIS stores exact spatial geometry. Memgraph/Theseus stores source/claim/object/evidence relationships. Rusty Red Graph or Redis stores hot nearby lookups and viewport state. DuckDB/GeoParquet/PMTiles produce public read models. Scene Foundry turns reviewed objects into renderable manifests. MapLibre/deck.gl renders the live map. Blender/Bonsai/Brush generate richer assets when needed.

The public website does not need to know how every source was extracted. It just needs the reviewed public read model plus dossier endpoints.

That matches your current plan’s storage split almost exactly: PostGIS/DuckDB for spatial, Memgraph/Theseus for provenance, GeoParquet/PMTiles for cheap public read models, and later ML experiments labeled as predictions.

## My recommendation for the next build slice

Build **SceneManifest v0**.

Do not start with Blender MCP. Do not start with Revit. Do not start with the Rust database. Start with the manifest.

SceneManifest v0 should support current footprint, ghost footprint, historic event marker, source badge, confidence score, time interval, render style, and dossier link.

Then build one renderer:

MapLibre/deck.gl reads SceneManifest and displays current buildings as solid low extrusions, vanished buildings as translucent ghost extrusions, and selected objects with dossier cards.

Then add one asset generator:

Blender reads the same SceneManifest and exports a GLB/still image for a selected block.

Then add Brush:

Brush-generated splats become optional immersive assets linked to reviewed objects. They are not required for every building.

Then add web-ifc:

If a building archetype or real IFC model exists, convert it once to fragments or GLB and attach it to the object.

## The answer to the MCP question

MCP is still useful, but it should sit behind a queue.

A reviewed SceneManifest can produce a job: “generate Blender scene for this block.” That job can call Blender MCP or a normal Blender Python script. But the website should not require live MCP, a live LLM, or a live Blender process to render ordinary pages.

So the split is:

Live site: deterministic renderer.
Background jobs: asset generation.
MCP: optional authoring/control interface.
LLM: candidate extraction and helper, not source of truth.
Human/review policy: promotion gate.

## Final stack recommendation

Use **Bonsai/IfcOpenShell/FreeCAD** instead of Revit for OpenBIM. Use **That Open/web-ifc** for browser BIM. Use **SceneManifest** as the bridge between evidence and 3D. Use **Brush** for Gaussian-splat reconstruction from real imagery. Use **Blender** for generated/cinematic assets. Use **MapLibre/deck.gl** for the main public map. Use **PMTiles, GeoParquet, DuckDB-WASM, FlatGeobuf, 3D Tiles, and GLB** as the loading/serving stack. Use **TF.js** only for first-pass moderation. Use **Theseus tenant/project boundaries** for Open Flint, not a fake City of Flint account. Use **Rusty Red Graph/Redis GEO** as a hot accelerator, not the canonical graph or spatial store.

The north star is now very clear:

**Open Flint Atlas maps historic and current civic evidence to objects, whether those objects still exist or not.**

That is the line I’d put in the README.
