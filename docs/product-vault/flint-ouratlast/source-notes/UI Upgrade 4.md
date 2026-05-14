---
Approved: true
---
I’d name the umbrella **Our Civic Atlas** and make Flint the flagship city.

**ourcivicatlas.org** feels right because it says “commons,” not “dashboard vendor.” Then the project-specific surface can be:

**flint.ourcivicatlas.org**

That gives you a clean future structure:

**ourcivicatlas.org** is the public-good umbrella, methods, governance, reusable code, source standards, contribution rules, and city index.
**flint.ourcivicatlas.org** is the first civic atlas: Flint-specific data, history, maps, dossiers, evidence graphs, ghost buildings, street safety, and community reports.
Later you could have **detroit.ourcivicatlas.org**, **saginaw.ourcivicatlas.org**, **cleveland.ourcivicatlas.org**, or any other city/community deployment.

The important naming move: **Our Civic Atlas** is the platform/commons. **Flint Atlas** is one city instance.

Your existing Open Flint plan already has a public-interest framing, source registry, source probes, v0.1 data dictionary, public read-model fixture, provenance graph contract, and static mobile-first dossier prototype. The next planned gaps are contribution/review/privacy, routed public UI, PostGIS tables, and canonical graph write paths. That means the roadmap should now move from “can this work?” to “how does this become durable civic infrastructure?”

# Roadmap 1: Public-good roadmap

## Phase 0: Name, stance, and governance

The project should launch with very plain public language:

**Our Civic Atlas is independent public-interest infrastructure for exploring civic data, source provenance, uncertainty, and community memory. It is not an official government website.**

For Flint, the README/About page should say:

**Flint Atlas is the first city atlas from Our Civic Atlas. It aggregates public sources, historical records, civic datasets, and reviewed community observations to help people understand places over time.**

The public constitution should stay simple:

Public benefit over monetization.
Open by default, private where harm is possible.
Sources are visible.
Uncertainty is visible.
Community reports are observations, not automatic facts.
Mobile access is core access.
The atlas does not impersonate government.
Predictions are labeled as predictions.
Data changes are logged.
Other communities can reuse the method.

This is the civic “spellbook page.” Everything else should obey it.

## Phase 1: Flint as the flagship atlas

Flint should become the first complete instance of the system, not just a demo.

The first public release should have a strong but bounded promise:

**Search or tap a place in Flint and see what we know, where it came from, how current it is, how confident we are, and what changed over time.**

The core Flint views should be:

**Explore**: map, search, layers, place dossiers.
**Memory**: vanished buildings, historical events, newspapers, old maps, photos, time slider.
**Safety**: crash history, road/corridor risk, trends, street context.
**Health and access**: health resources, parks, transit, services, census context.
**Interventions**: public projects, demolitions, water infrastructure, capital plans, grants, improvements, promises and outcomes.
**Sources**: source registry, freshness, limitations, confidence rules.
**Contribute**: suggest corrections, upload observations, submit source links, but nothing goes public without review.

## Phase 2: Make it a reusable civic atlas kit

Once Flint works, abstract the reusable pieces.

The reusable kit is not “Flint data.” It is:

Source registry.
Place dossier schema.
Confidence card.
Contribution/review workflow.
Temporal place registry.
Scene manifest.
Evidence graph.
Static public read models.
Mobile-first atlas shell.
Data-to-objects renderer.

This lets the future city instances inherit the same backbone without copying Flint-specific geography into the core system.

# Roadmap 2: Technical architecture

## The core stack

Keep the architecture split we settled on:

**PostGIS** is the spatial truth layer. It owns geometry, containment, buffers, intersections, distance, road segments, parcels, zoning, tracts, wards, and spatial joins.

**DuckDB, GeoParquet, and PMTiles** are the cheap public read-model layer. They make the atlas fast, inspectable, and hostable without requiring every visitor to hit the full backend.

**Memgraph / Theseus** is the provenance and civic-knowledge graph. It owns sources, datasets, records, claims, conflicts, observations, review states, historical evidence, interventions, and dossier relationships. This fits the current Index-API direction because Memgraph is already treated as the canonical graph store, with Postgres retained for SQL-native rows.

**Redis / THG / Rusty Red Graph** should be the hot layer, not the canonical truth. Use it for fast viewport lookups, nearby objects, active sessions, queues, recent observations, source crawl state, and hot graph context. Keep PostGIS and Memgraph as the sources of truth.

**Next.js** should probably become the main app shell for flint.ourcivicatlas.org because you need mobile UX, contribution flows, moderation, accounts/roles, route control, and immersive scene handling.

**Observable Framework, Mosaic, and Plot** should still power analytical views, comparison pages, and data stories. They are excellent for linked charts, brushing, filtering, and civic explanations.

**MapLibre, deck.gl, Three/R3F, and PMTiles** should become the main live map/scene stack.

**Cosmograph** should become the evidence/provenance constellation view: when someone wants to see why a dossier says what it says, show the graph of sources, claims, articles, places, events, and datasets.

## The tenant/project model

Do not make “City of Flint” an account unless there is an official partnership.

Use this mental model:

**Tenant:** Our Civic Atlas
**Project:** Flint
**Sources:** City of Flint GIS, Genesee County GIS, Flint Property Portal, MapFlint, Census, CDC PLACES, Michigan Traffic Crash Facts, UM-Flint, newspapers, public archives, resident observations
**Users:** maintainers, reviewers, contributors, public visitors

This keeps Flint-specific data out of core Theseus. Theseus provides reusable capabilities. Flint is a bounded civic project using those capabilities.

The current codebase already has tenant/project/product-control-plane direction in the orchestrate/product surface, so this fits your system rather than fighting it.

# Roadmap 3: Visual and immersive roadmap

## Phase 1: Fix the base map problem

The map should feel like a bounded civic world, not a generic map tile with Flint pasted on.

Do this first:

Frame Genesee County and Flint intentionally.
Restrict or visually mask the map outside the project boundary.
Use a custom basemap style instead of default tiles.
Emphasize river, wards, neighborhoods, major roads, parks, civic landmarks, and selected local labels.
Reduce generic POI noise.
Add camera presets: county, city, neighborhood, corridor, block, parcel/street.

This alone will make the atlas feel closer.

## Phase 2: Build “Atlas Scene”

The main visual surface should become **Atlas Scene**.

MapLibre handles geography and camera.
deck.gl handles high-performance data overlays.
Three/R3F handles selected immersive effects, ghost buildings, event markers, halos, and atmospheric objects.
Mosaic/Plot handles charts and filters.
Cosmograph handles evidence graphs.

The rule: don’t make everything 3D. Make the important civic objects feel present.

## Phase 3: Scene Foundry

Create a background rendering pipeline called **Scene Foundry**.

Scene Foundry reads reviewed civic objects and produces renderable artifacts: map layers, GLB models, thumbnails, short animations, 3D Tiles, Gaussian splats, and dossier previews.

This should be deterministic. It should not require a live LLM or live MCP session to render the public website.

The public site reads reviewed scene manifests. Background jobs generate richer assets.

# Roadmap 4: Lost Flint and ghost buildings

This is one of the strongest layers.

Call it **Lost Flint**.

The core object is not simply “building.” It is **building presence over time**.

A lost building can have evidence from Sanborn maps, city directories, newspaper articles, aerial photos, demolition records, public archives, community submissions, or OpenHistoricalMap. The atlas should show when the building was known to exist, when it was last seen, when it likely disappeared, and how confident we are.

The visual grammar should be:

Current building: solid.
Vanished building: translucent ghost massing.
Uncertain building: dotted or softer outline.
Source-backed historical event: vertical marker or timeline stem.
Low confidence: dimmer or fuzzier.
High confidence: sharper and more stable.

This is where the project becomes emotionally powerful. It lets people navigate absence.

## OpenBIM instead of Revit dependency

Do not depend on Revit.

Use an OpenBIM stack:

IfcOpenShell for IFC parsing and geometry.
Bonsai/BlenderBIM for open BIM authoring inside Blender.
FreeCAD BIM for parametric/open modeling.
web-ifc or That Open Engine for browser-side BIM workflows.
Blender for rendering, stylization, scene generation, and cinematic outputs.

Revit can remain optional for collaborators, but it should not be required.

## Brush integration

Brush should be the reconstruction layer.

Use Brush for Gaussian splat reconstruction when you have real photo sets of a place, object, building, ruin, street, mural, or interior.

Do not use Brush to invent historical buildings from weak evidence. If there are no real images, use procedural ghost massing instead.

So:

Procedural ghost objects for historical evidence.
Brush for reconstructed real imagery.
Blender for scene rendering and cinematic asset generation.
OpenBIM tools for semantic building understanding.

# Roadmap 5: Contribution and moderation

The public contribution system should be careful.

The principle is:

**Upload is not publication. Upload is evidence intake.**

A resident, organizer, student, or researcher can submit a correction, image, source link, observation, or historical note. But it enters a private review queue.

Every submission should have a review state:

Submitted.
Needs review.
Corroborated.
Conflicting.
Accepted.
Rejected.
Superseded.

Nothing personally identifying should be public by default. No contributor names, emails, phone numbers, license plates, faces, raw complaint text, or private moderation notes.

TF.js can help with first-pass moderation, especially for obvious toxicity, unsafe image content, duplicate detection, or basic client-side checks. But TF.js should not be the final moderator. It is a bouncer at the door, not the judge.

The public read model should only expose reviewed, public-safe observations.

# Roadmap 6: Automated retrieval and source discovery

Your native_search and Scrapy direction fits perfectly.

Set up retrieval jobs as source workstreams, not random scraping.

The source workstreams should be:

Official civic and GIS sources.
Health, services, and community resources.
Historical archives and newspapers.
Transportation and crash/safety data.
Planning interventions, grants, capital improvements, demolitions, infrastructure work.
Resident submissions and suggested sources.

Each retrieval job should produce archived raw artifacts first: URL, fetched date, content hash, source metadata, raw text/HTML/PDF where allowed, and terms/use notes.

Then extract candidate records. Candidate records are not facts yet.

The extraction pipeline should produce:

Candidate place.
Candidate event.
Candidate building presence.
Candidate source.
Candidate claim.
Candidate geometry.
Candidate time interval.
Confidence and review status.

Then reviewed records get projected into PostGIS and Memgraph.

# Roadmap 7: Civic Intervention Ledger

This is the layer that makes the atlas more complete.

It answers:

What was promised here?
What was funded here?
Who acted here?
What changed afterward?
Which documents support that story?

The Civic Intervention Ledger should include capital improvement projects, demolitions, water-service-line work, CDBG/HOME/ESG-funded work, zoning changes, park improvements, corridor projects, land bank activity, major infrastructure work, and neighborhood organization projects.

In a dossier, this becomes a tab called something like:

**Work and Promises**
or
**Interventions**

For a place, corridor, ward, or parcel, users should see a timeline of actions alongside present conditions and historical context.

This is where the atlas becomes accountability infrastructure, not just a map.

# Roadmap 8: Street Safety Lab and ML

Since the MVP is already done, it is reasonable to plan the real GNN/time-series integration. But make it solid and staged.

## Step 1: Build the road-segment dataset

Before any model, create the training table.

Road segments become graph nodes or edges.
Crashes become time-stamped events attached to segments.
Features include road class, intersections, AADT if available, nearby schools, parks, transit, zoning, land use, seasonality, ward, tract, and historical crash counts.

The target should start simple:

Monthly crash count by road segment.
Monthly injury crash count by road segment.
Pedestrian/bike crash burden by corridor.
Severity-weighted crash burden.

## Step 2: Build boring baselines

Do this before GNNs:

Historical average.
Seasonal naive.
Poisson regression.
Negative binomial regression.
Zero-inflated model.
LightGBM/XGBoost if useful.

These baselines protect you from model theater.

## Step 3: Use TimesFM for aggregate trends

TimesFM should be used for aggregate time-series forecasts, not road-topology reasoning.

Good TimesFM uses:

Crash burden by corridor.
Pedestrian crash trend by ward.
Demolition pace by neighborhood.
Historical event intensity by decade.
Source freshness decay.
Health-resource availability over time.

The UI should label these as forecasts with uncertainty, not facts.

## Step 4: Use ST-GNN for road-network risk

The ST-GNN should model the road network because roads are naturally graph-shaped.

Use it to estimate road-segment or corridor risk over time. The public language should be careful:

Not “a crash will happen here.”
Instead: “This segment has elevated modeled risk based on historical crashes and nearby context.”

## Step 5: Use DyGFormer for the civic knowledge graph

DyGFormer should not be the main crash predictor.

Use it for the dynamic civic graph: source-event-place-object relationships over time.

Good DyGFormer tasks:

Duplicate historical event detection.
Article-to-place linking.
Source refresh prioritization.
Candidate relationship suggestions.
Dossier confidence update proposals.
Under-documented place detection.
Historical building/event clustering.

It should create reviewable proposals, not mutate public facts directly.

# Roadmap 9: SceneManifest and Civic Object Renderer

This is the abstraction that ties everything together.

Create a **SceneManifest** schema.

A SceneManifest says:

What place is this?
What time range is shown?
Which objects are included?
Which sources support them?
What confidence do they have?
How should they render?
Which dossier does each object link to?
Which assets already exist?
Which assets need generation?

Then create a **Civic Object Renderer**.

It maps civic data to renderable objects.

A vanished building becomes a ghost extrusion.
A current building becomes a solid extrusion.
A historical article becomes a timeline marker.
A crash trend becomes a road pulse.
A source becomes an evidence badge.
A public project becomes a time-banded footprint.
A Brush reconstruction becomes an immersive preview.
A disputed claim becomes a warning/conflict state.

This is the deepest idea from today:

**Our Civic Atlas maps historical and current civic evidence to objects, whether those objects still exist or not.**

That should become a central line in the project.

# Roadmap 10: Data loading and performance

The full version needs progressive loading, especially because mobile is core.

Use PMTiles for basemaps and vector layers.
Use GeoParquet for analytical read models.
Use DuckDB-WASM for in-browser filtering and Mosaic-style analysis.
Use FlatGeobuf for viewport-based vector loading when needed.
Use GLB for small 3D assets.
Use 3D Tiles for larger 3D geospatial scenes.
Use web-ifc/fragments for BIM-like browser workflows.
Use Brush splats only for selected immersive scenes, not default map load.
Use Redis/Rusty Red Graph for hot nearby lookup and viewport/session acceleration.

The live mobile site should not load the whole city’s 3D history. It should load the right level of detail for the current zoom, device, and mode.

# Two concrete plans

## Plan A: Flint Atlas v1 launch plan

This is the practical public release path.

First, finish the public site shell at flint.ourcivicatlas.org. Use Next.js as the main shell, with a mobile-first search/tap/dossier flow. Keep the existing static prototype as the reference.

Second, upgrade the map into Atlas Scene. Use MapLibre, PMTiles, deck.gl, county/city bounds, custom basemap styling, camera presets, and a place-focused visual design.

Third, implement the contribution/review/privacy workflow. This is the highest-risk public feature, so it should land before open submissions go live.

Fourth, add Lost Flint v0.1. Pick one bounded area, such as St. John Street/Southside, Carriage Town, downtown, or Buick City. Render a small set of source-backed ghost buildings and historical dossiers.

Fifth, add Civic Intervention Ledger v0.1. Start with a small set of public projects/demolitions/water infrastructure/capital plan entries and show them in place dossiers.

Sixth, add Street Safety Lab v0.1. Start with crash history, road/corridor aggregations, and baseline trend/risk, not neural predictions.

Seventh, add Evidence Constellation. Use Cosmograph as the “show why” view for selected places, showing source, dataset, record, claim, event, and place relationships.

This gets you to a compelling first full release.

## Plan B: Our Civic Atlas platform plan

This is the reusable multi-city path.

First, define the city project schema. Every city gets a source registry, public principles, data dictionary, spatial boundary, place types, contribution policy, public read models, and governance pages.

Second, define shared object types: source, dataset, record, claim, place, event, building presence, intervention, observation, metric, scene object, and review decision.

Third, define shared render grammar: current, historical, vanished, inferred, disputed, predicted, community-observed, official, stale, and high/low confidence.

Fourth, define the deployment pattern: city subdomain, static read-model CDN/storage, optional backend services, public source registry, public changelog, and moderation admin.

Fifth, define the reusable ingestion kit: source probes, web retrieval, artifact archive, extraction candidates, review queue, PostGIS projection, graph projection, public export.

Sixth, define the reusable ML policy: predictions are optional, clearly labeled, benchmarked against baselines, and never promoted as facts.

Seventh, write the method documentation so other cities can fork/adapt the atlas.

This turns Flint from a one-off into the flagship city of a repeatable civic-data commons.

# Suggested naming system

Umbrella: **Our Civic Atlas**
Domain: **ourcivicatlas.org**
Flint site: **Flint Atlas** or **Open Flint Atlas**
Subdomain: **flint.ourcivicatlas.org**

Core modules:

**Atlas Scene**: immersive map/canvas.
**Place Dossier**: selected place facts, sources, confidence, history.
**Lost Flint**: vanished buildings and historical place memory.
**Civic Intervention Ledger**: public actions, funding, promises, outcomes.
**Street Safety Lab**: crash history, trends, modeled risk.
**Evidence Constellation**: Cosmograph source/provenance graph.
**Scene Foundry**: background renderer for 3D assets and ghost scenes.
**Civic Object Renderer**: data-to-object rendering grammar.
**Source Registry**: source metadata, trust, freshness, limitations.
**Contribution Desk**: public submissions, review, moderation, correction workflow.

# Near-term next sprint

I’d make the next sprint very specific:

**Sprint name: Flint Atlas v1 Foundation**

Build the public shell for flint.ourcivicatlas.org.
Add the Our Civic Atlas identity and governance pages.
Implement the tenant/project boundary as Our Civic Atlas → Flint.
Upgrade the map into Atlas Scene with a custom Genesee/Flint-bounded basemap.
Add SceneManifest v0.
Add Lost Flint v0.1 with a small bounded historical area.
Design the contribution/review workflow, but do not fully open public uploads yet.
Add the first Civic Intervention Ledger records.
Prepare Street Safety Lab data tables and baselines.

The big strategic move is this:

**Do not build more disconnected layers. Build one civic object system.**

Everything becomes a source-backed civic object with place, time, confidence, render mode, evidence, and review state.

That is the spine. The map, graph, 3D ghosts, historical archives, crash trends, public projects, and community reports can all hang from it without becoming a data chandelier.