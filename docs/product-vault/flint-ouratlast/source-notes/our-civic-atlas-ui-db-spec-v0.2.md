---
Approved: true
---
# Our Civic Atlas / Flint Atlas UI and Database Spec v0.2

Working names:

- Umbrella: Our Civic Atlas
- Root domain: ourcivicatlas.org
- First flagship atlas: Flint Atlas
- First city subdomain: flint.ourcivicatlas.org
- Future examples: detroit.ourcivicatlas.org, grandblanc.ourcivicatlas.org, michigan.ourcivicatlas.org, carriage-town.flint.ourcivicatlas.org or flint.ourcivicatlas.org/carriage-town

## 1. Product stance

Our Civic Atlas is open, decentralized, public-good civic infrastructure. It is not a SaaS product, not an official government website, and not a closed data vendor. Flint is the first atlas because the maintainer lives there and can ground the work in real local knowledge.

The long-term goal is a network of local civic atlases. Each atlas can be run by a person, neighborhood group, school, journalist, city staffer, nonprofit, or community collective. Each atlas publishes public data, provenance, uncertainty, and reviewed community contributions in a way that other atlases can discover and display.

The core principle is: a civic atlas maps historical and current civic evidence to objects, whether those objects still exist or not.

## 2. The core mental model

An atlas is a node in a civic graph of places.

A node can represent a neighborhood, city, county, state, region, or special district. Flint is a city node. Carriage Town can be a neighborhood node nested inside Flint. Michigan can be a state node containing Flint. Grand Blanc can be a nearby city node visible from Flint. Indiana can eventually be visible from a Michigan-level atlas as a neighboring state-level node.

The user experience should make that visible. When a resident opens Flint Atlas, they see Flint as a bounded civic world. Nearby atlases appear as distant nodes, portals, or horizon markers. More detailed sub-atlases, such as Carriage Town, appear inside Flint as higher-resolution local nodes.

The atlas network should be fractal: state to county to city to neighborhood to block to parcel to building to event to source.

## 3. Minimum viable federation

Start with manifest-first federation, not a complicated protocol-first federation.

Every atlas node should publish a small, static, publicly readable manifest. The manifest describes the node, its spatial boundary, available layers, source catalog, update time, maintainer, governance policy, federation endpoints, and public read-model files.

Recommended endpoints:

- `/.well-known/our-civic-atlas.json`
- `/atlas/manifest.json`
- `/atlas/catalog.jsonld`
- `/atlas/stac/catalog.json`
- `/atlas/sources.json`
- `/atlas/layers.json`
- `/atlas/nodes.json`
- `/atlas/read-model/places.geoparquet`
- `/atlas/read-model/events.geoparquet`
- `/atlas/read-model/sources.parquet`
- `/atlas/tiles/base.pmtiles`
- `/atlas/tiles/layers/{layer_id}.pmtiles`

The first version of federation should work even if an atlas has no backend. A static atlas can publish a manifest, source registry, GeoParquet files, PMTiles, and static pages. A richer atlas can add APIs, moderation, uploads, and live graph services.

## 4. Federation levels

Level 0: Static atlas

A person can create a civic atlas by filling out a manifest and publishing static files. It has no database and no login. It can be hosted on GitHub Pages, Vercel, Netlify, S3, Cloudflare Pages, or any static host.

Level 1: Static plus data build

The atlas has a source registry, ingestion scripts, and a reproducible build process that emits public read models: GeoParquet, Parquet, PMTiles, and JSON metadata.

Level 2: Hosted atlas

The atlas adds a lightweight backend for contribution intake, review queues, source checking, and scheduled ingestion. It still publishes static read models for public use.

Level 3: Graph-backed atlas

The atlas adds provenance graph storage. Sources, claims, observations, conflicts, review decisions, events, and civic objects are represented as graph entities.

Level 4: Model-assisted atlas

The atlas adds model-assisted extraction, duplicate detection, moderation support, forecast experiments, and spatiotemporal modeling. All model outputs are labeled as predictions or proposals and require review before becoming public facts.

## 5. Low-friction creation goal

The creator experience should be close to “make a website.”

The ideal setup flow asks for:

- Place name
- Place boundary or boundary source
- Parent atlas, if any
- Maintainer name or organization
- Public contact
- Domain or subdomain
- Source registry seed
- License and contribution policy
- Theme and map style
- Whether it is static-only or hosted

The generated project should include:

- Atlas manifest
- Source registry
- Boundary file
- Starter pages
- Place dossier template
- Static build script
- Read-model validator
- Governance pages
- Contribution policy template
- Federation discovery file

The command could eventually be something like `create-civic-atlas`, but the first version can be a GitHub template repo plus Codex/Claude instructions.

## 6. Tenant and project model

Do not make “City of Flint” an account unless there is an official partnership.

Use this hierarchy:

- Tenant: Our Civic Atlas
- Project: Flint
- Optional child project: Carriage Town
- Source entities: City of Flint GIS, Genesee County GIS, Flint Property Portal, MapFlint, Census, CDC PLACES, Michigan Traffic Crash Facts, UM-Flint, OpenStreetMap, resident observations, historical archives
- Users: owner, admin, maintainer, reviewer, contributor, public visitor

In Theseus/Theorem, Flint should be a bounded project/domain pack, not core source-code behavior. Reusable primitives should be generalized as Atlas Node, Civic Object, Scene Manifest, Place Dossier, Source Registry, Contribution Review, and Federation Manifest.

## 7. Canonical data objects

AtlasNode

Represents a neighborhood, city, county, state, or special atlas area.

Required fields:

- Stable ID
- Slug
- Name
- Scope type: neighborhood, city, county, state, region, campus, corridor, watershed, etc.
- Boundary geometry
- Centroid
- Bounding box
- Parent node IDs
- Child node IDs
- Neighbor node IDs
- Maintainer
- Manifest URL
- Last checked
- Trust/governance status
- Public read-model URLs

Source

Represents a public or community source.

Fields:

- Stable ID
- Name
- Source type
- Owner or publisher
- Source URL
- Data access URL
- License or terms notes
- Last checked
- Source updated at, if known
- Trust tier
- Known limitations
- Contact or maintainer

Dataset

A collection of records from a source.

Fields:

- Dataset ID
- Source ID
- Name
- Description
- Format
- Spatial coverage
- Temporal coverage
- Last fetched
- Last source update
- Public/private status
- Schema version

CivicObject

A source-backed object that can appear in the atlas.

Object types include current building, vanished building, parcel, street, road segment, park, school, clinic, resource, crash event, historical article, public project, planning intervention, water infrastructure segment, census metric, resident observation, source update, and atlas node.

Required fields:

- Object ID
- Object type
- Place reference
- Geometry or geometry reference
- Time interval or observed date
- Current/historical/vanished/inferred/predicted status
- Confidence score
- Review state
- Source evidence
- Render mode
- Dossier URL

Claim

A source-backed assertion about an object.

Examples:

- This building was present in 1928.
- This building was demolished by 2024.
- This street segment had elevated crash burden between 2019 and 2024.
- This clinic appears in the health-resource directory.
- This public project was funded in this ward.

Fields:

- Claim ID
- Subject object ID
- Predicate
- Value
- Time interval
- Source record ID
- Confidence score
- Review state
- Supports/conflicts links

Observation

A community or automated observation that is not automatically a public fact.

Review states:

- Submitted
- Needs review
- Corroborated
- Conflicting
- Accepted
- Rejected
- Superseded

Public read models must not expose contributor identity by default.

SceneManifest

A renderable specification for a map/3D/immersive scene.

Fields:

- Scene ID
- Atlas node ID
- Place or bounding box
- Time range
- Included object IDs
- Layer IDs
- Render style
- Confidence display rules
- Asset URLs
- Dossier links
- Generated-at timestamp
- Source hash / manifest hash

## 8. Storage architecture

PostGIS owns spatial truth.

Use it for exact geometry, containment, buffers, intersections, road segments, parcels, buildings, wards, tracts, neighborhoods, boundary nesting, spatial joins, and distance calculations.

Memgraph/Theseus owns provenance and civic knowledge graph.

Use it for sources, datasets, records, claims, supports/conflicts relationships, review decisions, observations, historical evidence, interventions, and dossier relationships.

DuckDB/GeoParquet/Parquet owns public analytical read models.

Use them for public-facing tables and Mosaic/Plot-style analysis.

PMTiles owns cheap public map tiles.

Use it for basemaps and tiled layers that should be hostable without a tile server.

Object storage owns raw and derived artifacts.

Use it for raw downloads, source captures, PDFs, images, OCR text, rendered images, GLB files, Brush splats, 3D Tiles, and audit bundles.

Redis/THG/Rusty Red Graph owns hot state.

Use it for viewport caches, nearby-object lookup, session state, ingestion queues, search frontier state, hot graph context, and quick geospatial point lookup. It should not be the canonical spatial or provenance store.

## 9. Public read models

Each atlas node should be able to publish a static read model.

Core public files:

- atlas manifest
- source registry
- layer catalog
- node catalog
- places GeoParquet
- civic objects GeoParquet
- events GeoParquet
- sources Parquet
- claims/provenance summary Parquet
- confidence cards JSON
- PMTiles for map layers
- SceneManifest JSON files

The static read model should exclude private contributor identity, private moderation notes, raw complaint text, faces, license plates, and sensitive household-level information.

## 10. UI surfaces

Root site: ourcivicatlas.org

Purpose: explain the public-good mission, list known atlas nodes, provide the creator kit, document standards, show governance, and let people discover or start an atlas.

Key pages:

- Home
- Atlas network map
- Start an atlas
- Standards and manifests
- Governance
- Source registry guide
- Privacy and contribution policy
- Documentation
- City index

City site: flint.ourcivicatlas.org

Purpose: the actual Flint Atlas.

Main routes:

- `/` Atlas home
- `/explore` main map/scene
- `/memory` Lost Flint and historical events
- `/safety` crashes and street safety
- `/interventions` public projects, funding, demolitions, water work, promises/outcomes
- `/sources` source registry and freshness
- `/contribute` contribution intake
- `/review` maintainer/reviewer queue
- `/methodology` trust model, data methods, limitations
- `/node/{node_slug}` atlas node pages
- `/place/{place_id}` place dossier
- `/object/{object_id}` civic object dossier
- `/scene/{scene_id}` scene/immersive view

## 11. Atlas Scene UI

Atlas Scene is the primary immersive map surface.

It should use:

- MapLibre for map camera and vector-tile base
- deck.gl for heavy overlays
- Three/R3F for selected 3D and atmospheric objects
- Mosaic/Plot for analytical panels
- Cosmograph for evidence/provenance constellation views

Mobile layout:

- Search-first header
- Mode switcher: Explore, Memory, Safety, Interventions, Sources, Contribute
- Fullscreen map/scene
- Bottom-sheet place dossier
- Minimal layer toggles
- Clear source/confidence button
- Suggest correction button

Desktop layout:

- Left navigation and layer stack
- Center Atlas Scene
- Right place/object dossier
- Bottom analysis drawer for Mosaic/Plot charts
- Optional evidence constellation drawer
- Time slider when relevant

The map should feel bounded to the selected atlas node. For Flint, show Flint and Genesee County as a civic world, not a generic global map. Nearby atlas nodes should appear at the horizon or boundary as discoverable portals.

## 12. Node Horizon UI

Node Horizon is the visual system for interconnected atlases.

When viewing Flint:

- Carriage Town appears as a high-detail child node inside Flint.
- Grand Blanc appears as a nearby atlas node outside Flint, visible as a distant portal or boundary marker.
- Michigan appears as a parent context.
- Detroit appears as another city node in the broader regional graph if published.

When viewing Michigan:

- Flint, Detroit, Grand Blanc, and other city atlases appear as nodes in the state scene.
- Indiana or Ohio atlas nodes can appear at the edge if their manifests are known.

Each node marker should show:

- Name
- Scope type
- Maintainer
- Last updated
- Public layers available
- Whether contributions are accepted
- Whether the node is static, hosted, graph-backed, or model-assisted

Clicking a node should open a preview first, then allow transition to that atlas.

## 13. Place dossier UI

The dossier is the core resident-facing object.

Every place/object dossier should include:

- Title and object/place type
- Confidence bar
- Plain-language confidence reasons
- Source cards
- Last checked
- Last source update, if known
- Key facts
- Timeline
- Related objects
- Nearby context
- Evidence graph link
- Suggest correction button
- Download/cite link

Dossier tabs:

- Overview
- Sources
- History
- Nearby
- Interventions
- Safety
- Metrics
- Evidence
- Contribute

Confidence should be explained in plain language. Do not present it as truth. It should mean “how well-supported this record is right now.”

## 14. Visual grammar

Current high-confidence objects: solid, sharp, stable.

Vanished objects: translucent ghost geometry.

Inferred objects: dotted, soft, or lower opacity.

Disputed objects: warning border or split-state visual.

Community observations: small badges, not canonical facts.

Public interventions: halos, footprints, ribbons, or timeline bands.

Crash/safety risk: road pulses, corridor heat, and uncertainty bands.

Historical articles/events: time stems or anchored markers.

Source confidence: opacity, badge, and dossier explanation, not only color.

## 15. Lost Flint module

Lost Flint is a temporal building and place-memory registry.

It should index buildings and places that used to exist, plus the evidence for when they existed and when they disappeared.

Object model:

- Building presence object
- Source observation
- Time interval
- Geometry confidence
- Name confidence
- Current status
- Render recipe

Source examples:

- Sanborn maps
- city directories
- historical aerials
- newspapers
- demolition records
- land bank records
- OpenHistoricalMap
- local archives
- resident submissions

Render:

- Source-backed footprint as ghost extrusion
- Uncertain building as soft/dotted ghost
- High-confidence vanished building as sharper translucent form
- Associated articles/events as markers
- Dossier explains what is known and what is inferred

## 16. Civic Intervention Ledger

This layer connects conditions to actions.

It should show:

- Capital improvement projects
- CDBG/HOME/ESG-funded work
- demolitions
- water-service-line work
- park improvements
- corridor plans
- zoning changes
- public works
- grant-funded programs
- land bank activity

Dossier questions:

- What was promised here?
- What was funded here?
- Who acted here?
- What changed afterward?
- Which documents support that story?

This turns the atlas into accountability infrastructure.

## 17. Street Safety Lab

Street Safety Lab should start with historical crash data and baseline risk models before neural models.

Data shape:

- Road segments
- Monthly crash counts
- Severity-weighted burden
- Pedestrian/bike crashes
- Road class
- AADT and traffic counts where available
- Nearby schools, parks, transit, zoning, land use
- Ward/tract context

Model stages:

- Historical average
- Seasonal naive
- Poisson/negative-binomial/zero-inflated baselines
- TimesFM or similar for aggregate corridor/ward trends
- ST-GNN for road-network risk
- DyGFormer for civic knowledge graph dynamics, not primary crash prediction

Public language:

- Do not say “a crash will happen here.”
- Say “this segment has elevated modeled risk based on historical patterns and nearby context.”

## 18. Scene Foundry and object rendering

Scene Foundry is a background rendering pipeline.

It reads reviewed SceneManifests and produces:

- GLB models
- thumbnails
- rendered stills
- short videos
- 3D Tiles
- Brush Gaussian splats
- dossier previews

It should not require a live LLM or live MCP session for normal public rendering.

Use Blender for generated/cinematic scenes. Use Bonsai/IfcOpenShell/FreeCAD for OpenBIM semantics. Use Brush when real photo sets exist. Use procedural ghost geometry when evidence is sparse. Use MapLibre/deck.gl for the live public map.

## 19. Contribution and moderation

Upload is not publication. Upload is evidence intake.

Contributor flow:

- User submits correction/source/photo/observation
- Client-side checks help catch obvious unsafe content
- Server stores as private pending observation
- Automated checks flag personal data, duplicates, geolocation issues, unsafe content, and source conflicts
- Reviewer accepts, rejects, requests more information, marks conflicting, or supersedes
- Public read model receives only public-safe reviewed content

Never expose by default:

- contributor names
- emails
- phone numbers
- faces
- license plates
- raw complaint text
- private moderation notes
- unreviewed household-level implications

## 20. Standards alignment

Use existing standards where possible.

Recommended alignment:

- DCAT for public dataset catalogs
- STAC for spatiotemporal assets and imagery/document assets
- OGC API Features for feature-level geospatial APIs
- GeoParquet for static geospatial analytical read models
- PMTiles for static map tiles
- ActivityPub-style federation only when event federation becomes necessary
- Solid-style pods only if user-controlled private contribution storage becomes important

Do not block the first version on implementing every standard. Publish simple manifests first, then align them over time.

## 21. Codex build phases

Phase A: manifest-first federation

Build AtlasNode manifest schema, node catalog, source catalog, layer catalog, and validator. Add `/.well-known/our-civic-atlas.json`. Add a small static demo with Flint, Carriage Town, Grand Blanc, and Michigan nodes.

Phase B: Atlas Scene shell

Build the main Flint scene with bounded map, Node Horizon markers, mode switcher, bottom-sheet dossier, and static read model loading.

Phase C: place/object dossier

Build the reusable dossier component. It should work for AtlasNode, place, street, building, historical event, source, intervention, and crash corridor.

Phase D: contribution/review workflow

Build private intake, review states, reviewer UI, and public-safe promotion into read models.

Phase E: Lost Flint v0.1

Build temporal building-presence schema, small sample dataset, ghost-building render grammar, and dossier views.

Phase F: Civic Intervention Ledger

Build intervention object model, public project timeline, source documents, and place-dossier integration.

Phase G: federation discovery

Build node discovery from manifests, parent/child/neighbor links, and Node Horizon display. Keep ActivityPub optional until static federation works.

Phase H: Street Safety Lab

Build road-segment aggregates and baseline risk/trend views. Add TimesFM/ST-GNN only after data sufficiency and baselines.

Phase I: Scene Foundry

Build SceneManifest validator and one renderer path: map/deck.gl first, then Blender/GLB generation.

## 22. Acceptance criteria

The system is successful when:

- A visitor can open Flint Atlas on a phone and understand what they are seeing.
- A visitor can tap a place and see sources, confidence, history, and corrections.
- A maintainer can add a new source without editing core app code.
- A contributor can submit evidence without it becoming public automatically.
- A neighboring atlas can be discovered from a manifest.
- A child atlas can add more local detail without replacing the parent atlas.
- A static-only atlas can exist without a backend.
- A graph-backed atlas can add provenance without changing the public read-model contract.
- Public exports are cheap to host and easy to inspect.
- Model outputs are labeled as predictions or proposals.
