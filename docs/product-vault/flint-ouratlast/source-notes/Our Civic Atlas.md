---
Approved: true
---
# Outcome

I feel like you got a lot of what I wanted to say in my next turn, which is that I'm starting in Flint because I live there, but I want this to be an open source, decentralized, but interconnected thing for civic good across different places. So I live in Flint. When I look at flint.ourcivicatlas, I see the boundaries of my city, but if someone who lives in Detroit or just one suburb over in Grand Blanc happens to start a Grand Blanc Civic Atlas, then I can see theirs as well from my Flint Civic Atlas. Like they would be a, how do I put this, like a node that appears in the distance, right? And so like the more that people upload information to this, the more free and available and accessible that that data becomes and the more that it is useful and valuable to people using the system. So additionally, in context to that, there would be two other, I don't wanna call them other layers, but there would be two other-- Ways this can go, which is that I could additionally make a layer that is like my neighborhood of Carriage Town. And so when someone is looking at Flint.our civic Atlas, there might be additional detail in Carriage Town that there might not be in the surrounding area because I took the initiative to start an instance of this in Carriage Town. And also, there could also be a Michigan.our civic Atlas that has the information displayed in a broader context. And then someone will eventually make a Indiana.our civic Atlas, and then I'll be able to see their information off in the distance when looking at the Michigan one, essentially. So I'm curious about making it possible for other people to start these with as little friction as possible. Like, I want it to be bordering on as low friction as when Tim Berners-Lee sort of the internet and you wanted to make a website. Also, I think this is a really great app to build on theorem. It's essentially the mapped-out physical world, but in internet form.


—

It is a **fractal, federated civic web**.

The name works:

**Our Civic Atlas**
Root: **ourcivicatlas.org**
Flagship city: **flint.ourcivicatlas.org**
Future nodes: **detroit.ourcivicatlas.org**, **grandblanc.ourcivicatlas.org**, **michigan.ourcivicatlas.org**, and maybe neighborhood nodes like **carriagetown.flint.ourcivicatlas.org** or **flint.ourcivicatlas.org/carriage-town**.

I made a Codex-ready Markdown spec here: [Download the Our Civic Atlas UI/DB spec](sandbox:/mnt/data/our-civic-atlas-ui-db-spec-v0.2.md)

The rest of this response is the distilled version.

# Core concept

**Our Civic Atlas is the physical world mapped as an open, interconnected, source-aware web.**

Each place can have an atlas. A neighborhood can have one. A city can have one. A state can have one. These atlases should be able to discover each other, show each other from a distance, and pass the user between them without needing one central owner.

So when you open **flint.ourcivicatlas.org**, you are inside the Flint civic world. You see Flint boundaries, local data, local dossiers, local history, and local contribution tools. But if Grand Blanc has its own atlas, it can appear as a visible nearby node. If Carriage Town has a more detailed sub-atlas, it appears inside Flint as a higher-resolution local node. If Michigan has a state atlas, Flint appears inside it as one of many city nodes.

That gives you a nested civic geography:

State → county → city → neighborhood → corridor → block → parcel → building → event → source.

This is the right metaphor: **a civic internet of places**.

# The important architecture decision

Do **manifest-first federation**, not protocol-first federation.

That means the first version of an atlas should be able to exist as a static website with a few published files. No login system. No live database. No giant backend. No dependency on Theseus. A person should be able to start one almost as easily as making an old-school website.

Each atlas publishes a public manifest that says: here is what place I cover, here are my boundaries, here are my layers, here are my sources, here is when I last updated, here is how to contact maintainers, here is what data can be reused, and here are nearby/parent/child atlas nodes.

Only later do richer nodes add ingestion, review queues, graph storage, moderation, user accounts, and ML.

# Standards to borrow from

Do not reinvent everything. Use existing standards as the skeleton and keep the Our Civic Atlas semantics small.

Use **DCAT** for source and dataset catalogs because W3C describes DCAT as an RDF vocabulary for interoperability between data catalogs on the web. ([W3C](https://www.w3.org/TR/vocab-dcat-3/?utm_source=chatgpt.com "Data Catalog Vocabulary (DCAT) - Version 3"))

Use **STAC** for spatiotemporal assets, imagery, historical maps, aerials, and time-bound data assets because STAC is a common language for describing geospatial information so it can be indexed and discovered. ([Stacspec](https://stacspec.org/?utm_source=chatgpt.com "SpatioTemporal Asset Catalogs: STAC"))

Use **OGC API Features** when an atlas offers a real feature-level API, because OGC API Features defines RESTful interfaces for discovering, querying, and retrieving geospatial feature data. ([Open Geospatial Consortium](https://www.ogc.org/standards/ogcapi-features/?utm_source=chatgpt.com "OGC API Features Standard"))

Use **GeoParquet** for public analytical geospatial exports because GeoParquet adds interoperable geospatial point, line, and polygon types to Parquet. ([Geoparquet](https://geoparquet.org/?utm_source=chatgpt.com "GeoParquet"))

Use **PMTiles** for cheap static map tiles because PMTiles is a single-file archive for tiled data that can be hosted on storage like S3 without a custom tile backend. ([GitHub](https://github.com/protomaps/pmtiles?utm_source=chatgpt.com "protomaps/PMTiles: Pyramids of map tiles in a single file ..."))

Use **ActivityPub-style federation** only when you need actual inter-atlas events, such as “new layer published,” “source updated,” “neighbor atlas discovered,” or “contribution accepted.” ActivityPub has both a client-to-server API and a server-to-server federation protocol for distributing activities between actors on different servers. ([W3C](https://www.w3.org/TR/activitypub/?utm_source=chatgpt.com "ActivityPub"))

Use **Solid-style personal data ideas** only if contributor-owned private storage becomes important. Solid’s protocol docs frame it as secure, permissioned access to externally stored data, which is relevant to resident contributions but not needed for v1. ([Solid Project](https://solidproject.org/TR/protocol?utm_source=chatgpt.com "Solid Protocol"))

# The atlas node model

The central object should be **AtlasNode**.

An AtlasNode can be Flint, Carriage Town, Michigan, Grand Blanc, Detroit, Indiana, a watershed, a corridor, or a neighborhood.

Each AtlasNode needs:

Name, slug, URL, scope type, boundary geometry, centroid, bounding box, parent nodes, child nodes, neighbor nodes, maintainer, source registry URL, layer catalog URL, last updated, public data files, contribution policy, and capabilities.

Capabilities could be simple:

Static only.
Hosted backend.
Accepts contributions.
Has review queue.
Has provenance graph.
Has 3D scenes.
Has historical layers.
Has forecasting experiments.
Has public API.

This lets the UI display nearby civic atlas nodes as “things in the distance.”

# The visual idea: Node Horizon

This is the UI piece that makes the decentralized network feel alive.

When viewing Flint, Grand Blanc appears at the edge of the map as a nearby atlas node. Detroit appears farther away if it has a published node. Michigan appears as the parent context. Carriage Town appears inside Flint as a high-detail sub-node.

When viewing Michigan, Flint, Detroit, Grand Blanc, Lansing, Ann Arbor, and others appear as nodes inside the state. If Indiana has an atlas, it can appear beyond the Michigan boundary as a neighboring state node.

This should not look like a normal dropdown. It should feel spatial. A little civic constellation.

The user should be able to tap a distant node, preview it, and then transition into that atlas.

# The database split

Keep the split clean.

**PostGIS owns spatial truth.**
Boundaries, parcels, roads, buildings, wards, tracts, buffers, containment, intersections, distance, and spatial joins.

**Memgraph / Theseus owns civic knowledge and provenance.**
Sources, datasets, records, claims, conflicts, historical observations, resident observations, review decisions, interventions, evidence links, and dossier relationships.

**DuckDB, GeoParquet, Parquet, and PMTiles own public read models.**
This is what makes a public atlas cheap, fast, inspectable, and hostable.

**Redis / THG / Rusty Red Graph owns hot state.**
Viewport caches, nearby lookup, search frontier state, active sessions, ingestion queues, and fast graph context. It should not replace PostGIS or Memgraph as the canonical store.

That split matches the current Open Flint plan: spatial records belong in PostGIS/DuckDB/GeoParquet, while source, claim, conflict, and review relationships belong in Memgraph/Theseus graph surfaces.

It also matches your current Theseus direction. The codebase map says Memgraph is the canonical graph runtime, while THG/Redis are hot or SDK-facing layers rather than replacements for canonical graph storage.

# Theorem integration

Do **not** put Flint-specific geography into core Theseus.

Use Theorem/Theseus as the substrate, not as the place-specific app.

The clean mental model is:

Tenant: **Our Civic Atlas**
Project: **Flint**
Child project or node: **Carriage Town**
Sources: City of Flint GIS, Genesee County GIS, MapFlint, Census, Flint Property Portal, Michigan Traffic Crash Facts, UM-Flint, historical archives, resident observations.

Your current product/control-plane direction already supports this shape. The codebase map says `apps/orchestrate/api/product.py` exposes `ProductTenant` records, tenant-scoped `Project` creation, tenant-member roles, and Context-Theorem-scoped API keys.

So yes: this is a great app to build on Theorem. But build it as a **domain pack / civic atlas project layer**, not as a mutation of core Theseus.

# The public site structure

For **ourcivicatlas.org**, I would build:

Home.
Atlas network map.
Start an atlas.
Documentation.
Manifest standard.
Source registry standard.
Governance.
Privacy.
Contribution policy.
City index.
Examples.

For **flint.ourcivicatlas.org**, I would build:

Explore.
Memory.
Safety.
Interventions.
Sources.
Contribute.
Methodology.
Review dashboard.
Place dossier.
Object dossier.
Scene view.

# The Flint UI spec

The main UI should be **Atlas Scene**.

Atlas Scene is not “just a map.” It is the civic world surface.

On desktop, it should have:

A left layer/mode rail.
A central bounded MapLibre/deck.gl/Three scene.
A right place dossier.
A bottom Mosaic/Plot analysis drawer.
An optional Cosmograph evidence drawer.

On mobile, it should be:

Search-first.
Map/scene second.
Bottom-sheet dossier third.
Very few visible controls.
Modes instead of giant layer menus.

The mobile modes should be:

Explore.
Memory.
Safety.
Interventions.
Sources.
Contribute.

The existing Open Flint plan already treats mobile-first place dossiers, source cards, confidence reasons, and source freshness as core UI goals, with the current status described as static prototype done but routed public UI and contribution/review still missing.

# Place dossier spec

The dossier is the main object. It should work for a parcel, building, street, road segment, neighborhood, ward, city, historical event, source, project, intervention, or atlas node.

Every dossier should show:

Title.
Object type.
Confidence bar.
Plain-language confidence reasons.
Source cards.
Last checked.
Last source update, if known.
Timeline.
Nearby context.
Related objects.
Evidence graph.
Suggest correction.
Download/cite.

Tabs:

Overview.
Sources.
History.
Nearby.
Interventions.
Safety.
Metrics.
Evidence.
Contribute.

The confidence bar should not mean “truth.” It should mean “how well-supported this record is right now.”

# Visual grammar

Use a consistent visual language:

Current, high-confidence object: solid and sharp.
Vanished object: translucent ghost geometry.
Inferred object: dotted, soft, lower opacity.
Disputed object: split-state or warning border.
Community observation: small badge, never treated as canonical by default.
Public intervention: halo, ribbon, footprint, or time band.
Crash/safety trend: road pulse or corridor heat.
Historical article/event: anchored marker or timeline stem.
Source confidence: badge plus explanation, not just color.

This is especially important for **Lost Flint**, because the object may no longer exist.

# Lost Flint

Lost Flint should be a temporal building registry, not just a demolition layer.

The key object is **building presence over time**.

A building can be present in a Sanborn map, listed in a city directory, visible in an aerial, mentioned in a newspaper, absent in a later aerial, and later confirmed demolished. The dossier should say something like: “Known present from 1928 to 1966; likely gone by 1997; demolition source unknown.” That is more honest than inventing a precise date. This idea is already consistent with the previous Lost Flint plan, which framed vanished buildings as source-backed presence intervals.

Render it as ghost geometry:

Solid current buildings.
Ghost vanished buildings.
Soft uncertain buildings.
Historical article markers.
Timeline slider.

# Civic Intervention Ledger

This is the accountability layer.

It answers:

What was promised here?
What was funded here?
Who acted here?
What changed afterward?
Which documents support that story?

It should include public projects, demolitions, water infrastructure, capital improvement plans, grant-funded work, zoning changes, corridor projects, park improvements, and land bank activity.

In the UI, this becomes a dossier tab called **Interventions** or **Work and Promises**.

# Contribution and moderation

The rule should be:

**Upload is not publication. Upload is evidence intake.**

A resident can upload a correction, source, image, observation, or historical note. It enters review. It does not become a public fact.

Review states:

Submitted.
Needs review.
Corroborated.
Conflicting.
Accepted.
Rejected.
Superseded.

Do not expose contributor names, emails, phone numbers, faces, license plates, raw complaint text, or private moderation notes by default.

The Open Flint plan already names contribution/review/privacy as the next major planned gap, with review states and no contributor identity in the public read model.

# Scene Foundry

Scene Foundry is the background renderer.

It should take reviewed civic objects and produce renderable scene assets:

GLB models.
Thumbnails.
Rendered stills.
Short videos.
3D Tiles.
Brush Gaussian splats.
Dossier previews.

It should not require a live LLM or live MCP server for normal public rendering. The live website reads reviewed scene manifests and static assets.

Blender can generate visuals. Bonsai/IfcOpenShell/FreeCAD can provide OpenBIM semantics. Brush can reconstruct places when you have real photo sets. MapLibre/deck.gl remains the live public map.

# Public read models

Every atlas should be able to publish static public read models.

Core files:

Atlas manifest.
Source registry.
Layer catalog.
Node catalog.
Places GeoParquet.
Events GeoParquet.
Civic objects GeoParquet.
Sources Parquet.
Claims/provenance summary Parquet.
Confidence cards JSON.
PMTiles layers.
SceneManifest JSON.

This is what makes the system decentralized. A static atlas can exist without a backend, but a richer atlas can still publish the same read-model shape.

# Creation flow for new communities

The goal should be “close to making a website.”

A creator should be able to start an atlas by providing:

Place name.
Boundary source or uploaded boundary.
Parent atlas, if any.
Maintainer name.
Public contact.
Domain/subdomain.
Seed sources.
License.
Contribution policy.
Theme.

The starter kit should generate:

Manifest.
Source registry.
Boundary file.
Starter pages.
Dossier template.
Read-model validator.
Governance pages.
Contribution policy.
Federation discovery file.

Eventually this could become a command like `create-civic-atlas`, but the first version can be a GitHub template plus Codex instructions.

# Codex build phases

I would give Codex this roadmap:

**Phase A: Manifest-first federation**
Build AtlasNode manifest schema, node catalog, source catalog, layer catalog, and validator. Add `/.well-known/our-civic-atlas.json`. Add a demo network with Flint, Carriage Town, Grand Blanc, and Michigan.

**Phase B: Atlas Scene shell**
Build the Flint map/scene with bounded geography, Node Horizon markers, mode switcher, bottom-sheet dossier, and static read-model loading.

**Phase C: Dossier component**
Build reusable dossiers for atlas nodes, places, streets, buildings, events, sources, interventions, and crash corridors.

**Phase D: Contribution/review workflow**
Build private intake, review states, reviewer UI, and public-safe promotion.

**Phase E: Lost Flint v0.1**
Build temporal building-presence schema, ghost-building render grammar, small sample dataset, and dossiers.

**Phase F: Civic Intervention Ledger**
Build intervention object model, public project timeline, source documents, and place-dossier integration.

**Phase G: Federation discovery**
Build node discovery from manifests, parent/child/neighbor links, and Node Horizon display. Keep ActivityPub optional until static federation works.

**Phase H: Street Safety Lab**
Build road-segment aggregates and baseline risk/trend views. Add TimesFM/ST-GNN only after the data and baselines are real.

**Phase I: Scene Foundry**
Build SceneManifest validator and one renderer path. Start with MapLibre/deck.gl. Then add Blender/GLB generation.

# The north-star sentence

I’d put this in the README:

**Our Civic Atlas maps historical and current civic evidence to places, objects, and events, whether those objects still exist or not.**

And for the decentralized vision:

**Every atlas is a node. Every node can publish, discover, and connect. Flint is the first node, not the center of the system.**