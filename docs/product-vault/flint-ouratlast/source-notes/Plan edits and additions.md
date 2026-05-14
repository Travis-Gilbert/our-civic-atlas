# Biggest difference: launch plan versus full system vision

The plan is written as **Flint Atlas v1 launch**. The vision we described is bigger:

**Our Civic Atlas is a decentralized, low-friction civic web where every atlas is a node, every node can publish/discover/connect, and every civic object can be source-backed, temporal, reviewable, and renderable.**

The launch plan gestures at that, but it does not fully define the underlying grammar.

The missing center is this:

**Everything in the system should become a source-backed civic object with place, time, confidence, review state, render mode, evidence, and federation identity.**

That is the spine. The plan says “CivicObject” and “SceneManifest,” but it does not yet define them deeply enough.

## What I would add first: a Civic Object Contract

Add a new checklist item after OCA-002 or before OCA-006:

**OCA-002A: Define Civic Object Contract v0**

Acceptance criteria:

A shared schema exists for all public civic objects, including current places, vanished buildings, streets, crash corridors, historical events, public projects, sources, observations, atlas nodes, and renderable scene objects.

Every CivicObject has:

- `id`
- `atlas_node_id`
- `object_type`
- `name`
- `description`
- `geometry_ref`
- `time_start`
- `time_end`
- `temporal_status`
- `current_status`
- `confidence_score`
- `confidence_reasons`
- `review_state`
- `source_ids`
- `claim_ids`
- `render_modes`
- `dossier_url`
- `public_visibility`
- `privacy_class`
- `last_checked_at`
- `updated_at`

Core object types should include:

- `atlas_node`
- `place`
- `parcel`
- `building_presence`
- `street`
- `road_segment`
- `corridor`
- `historical_event`
- `news_article`
- `source`
- `dataset`
- `claim`
- `observation`
- `intervention`
- `metric`
- `scene_object`
- `brush_asset`
- `ifc_asset`

This contract would prevent the project from turning into separate one-off layer schemas.

# The plan needs more specificity around federation

OCA-002 says to define manifest-first federation contracts, including `/.well-known/our-civic-atlas.json`, manifests, catalogs, layers, nodes, sources, and read-model URLs. That is exactly the right start.

But it should go further.

The plan should define the **AtlasNode manifest** in more detail. An AtlasNode should not just say “this is Flint.” It should say what kind of node it is, what boundary it covers, what parent/child/neighbor nodes it knows about, what capabilities it supports, what data formats it publishes, and what rules govern contributions.

I would add:

**OCA-002B: Define AtlasNode manifest schema v0**

Fields:

- `atlas_id`
- `name`
- `slug`
- `canonical_url`
- `scope_type`: neighborhood, city, county, region, state, corridor, watershed, custom
- `parent_node_ids`
- `child_node_ids`
- `neighbor_node_ids`
- `boundary_geojson_url`
- `bbox`
- `centroid`
- `maintainers`
- `public_contact`
- `license`
- `data_license`
- `contribution_policy_url`
- `source_registry_url`
- `layer_catalog_url`
- `node_catalog_url`
- `read_model_catalog_url`
- `capabilities`
- `federation_status`
- `last_updated_at`

Capabilities:

- `static_only`
- `accepts_contributions`
- `has_review_queue`
- `has_provenance_graph`
- `has_scene_manifests`
- `has_lost_buildings`
- `has_safety_lab`
- `has_interventions`
- `has_public_api`
- `has_ml_predictions`

Then Node Horizon can be built from actual manifest semantics instead of hand-wired fixtures.

# The plan needs a clearer “low-friction atlas creation” path

OCA-019 says to add a static atlas creator kit with a manifest, boundary, starter pages, source registry, validator, governance, and contribution policy. That is good, but it is too late in the order if federation is core.

The low-friction creation idea is not a side feature. It is the moral architecture of the project.

I would move creator-kit work earlier, or at least split it:

**OCA-002C: Minimal static atlas starter**

Goal: someone can create a simple atlas without a backend.

The starter should require only:

- place name
- boundary file or boundary source
- maintainer name
- public contact
- source registry
- basic theme
- contribution policy
- parent/neighbor atlas links

Output:

- `/.well-known/our-civic-atlas.json`
- `/atlas-node.json`
- `/source-registry.json`
- `/layer-catalog.json`
- `/node-catalog.json`
- `/public-read-model/`
- `/about`
- `/sources`
- `/methodology`
- `/contribute`

This makes “as easy as making a website” real.

# The plan needs a real database/storage contract

It says PostGIS owns spatial truth, Memgraph/Theseus owns provenance, Redis/Rusty Red Graph owns hot nearby/session/queue state, and public exports use PMTiles, GeoParquet, Parquet, DuckDB-WASM, FlatGeobuf, GLB, and 3D Tiles. That matches our design.

But Codex needs table/graph/entity names.

I would add a section called **Canonical Storage Contracts**.

## PostGIS tables to define

- `atlas_nodes`
- `atlas_boundaries`
- `places`
- `place_geometries`
- `civic_objects_spatial`
- `building_presence_geometries`
- `road_segments`
- `corridors`
- `crash_events`
- `intervention_geometries`
- `metric_geographies`
- `source_spatial_coverage`
- `scene_object_geometries`

Each spatial row should include:

- `atlas_node_id`
- `object_id`
- `geometry`
- `geometry_type`
- `srid`
- `source_id`
- `confidence`
- `match_method`
- `review_state`
- `valid_from`
- `valid_to`

## Memgraph labels to define

- `:AtlasNode`
- `:CivicObject`
- `:Place`
- `:BuildingPresence`
- `:Street`
- `:RoadSegment`
- `:HistoricalEvent`
- `:Intervention`
- `:Observation`
- `:Source`
- `:Dataset`
- `:Record`
- `:Claim`
- `:SceneManifest`
- `:SceneAsset`
- `:Contributor`
- `:ReviewDecision`

Relationships:

- `(:AtlasNode)-[:CONTAINS]->(:CivicObject)`
- `(:AtlasNode)-[:PARENT_OF]->(:AtlasNode)`
- `(:AtlasNode)-[:NEIGHBOR_OF]->(:AtlasNode)`
- `(:Source)-[:PUBLISHED]->(:Dataset)`
- `(:Dataset)-[:CONTAINS]->(:Record)`
- `(:Record)-[:ASSERTS]->(:Claim)`
- `(:Claim)-[:ABOUT]->(:CivicObject)`
- `(:Claim)-[:SUPPORTS]->(:Claim)`
- `(:Claim)-[:CONFLICTS_WITH]->(:Claim)`
- `(:Observation)-[:SUBMITTED_ABOUT]->(:CivicObject)`
- `(:ReviewDecision)-[:DECIDED_ON]->(:Observation)`
- `(:SceneManifest)-[:RENDERS]->(:CivicObject)`
- `(:SceneAsset)-[:GENERATED_FROM]->(:SceneManifest)`

This matters because the current Index-API codebase already treats Memgraph as the canonical graph runtime and has a graph-training export path from Memgraph to Arrow/KGE/GNN artifacts, while Redis/THG is the hot/sidecar layer rather than canonical storage.

# The plan under-specifies the contribution system

OCA-008 through OCA-011 are good: contribution receipt, maintainer review queue, TF.js preflight, ACC/ACT snapshots.

What I would add is a stricter **Contribution Intake Contract**.

Every upload should become a private **ContributionReceipt**, not a public record.

Fields:

- `receipt_id`
- `atlas_node_id`
- `submission_type`
- `submitted_at`
- `submitter_public_name_allowed`
- `submitter_contact_private`
- `location_text`
- `geometry_candidate`
- `object_candidate_id`
- `source_url`
- `uploaded_file_refs`
- `text_body_private`
- `text_body_public_candidate`
- `tfjs_preflight_scores`
- `server_moderation_scores`
- `pii_detection_flags`
- `review_state`
- `reviewer_id`
- `reviewed_at`
- `public_observation_id`
- `public_receipt_url`

Review states:

- `submitted`
- `needs_review`
- `needs_more_evidence`
- `corroborated`
- `conflicting`
- `accepted`
- `rejected`
- `superseded`
- `withdrawn`

Public states should never expose contributor identity by default.

Also add explicit moderation checks:

- toxicity text preflight
- unsafe image preflight
- face/license plate flagging
- geolocation precision check
- private address/phone/email detection
- duplicate upload detection
- source URL safety check
- “could this target a person?” risk check

The plan says upload is evidence intake, not publication, which is right. But it should define the receipt object so Codex does not improvise a leaky form.

# The plan needs more detail on the UI

The current plan has strong UI gates, but the UI itself is still described at the feature level: Atlas Scene, Node Horizon, dossier, evidence graph, etc. I would add component-level structure.

## Add a UI component contract

**OCA-003A: UI component map**

Core app shell:

- `AtlasAppShell`
- `AtlasScene`
- `AtlasModeRail`
- `MobileSearchHeader`
- `MobileDossierSheet`
- `DesktopDossierPanel`
- `LayerStackControl`
- `NodeHorizon`
- `AtlasBreadcrumb`
- `SourceFreshnessBadge`
- `ConfidenceProgress`
- `ContributionReceiptPanel`
- `ReviewQueuePanel`
- `EvidenceConstellationPanel`
- `MosaicAnalysisDrawer`
- `SceneAssetPreview`
- `TimelineScrubber`

Atlas modes:

- Explore
- Memory
- Safety
- Interventions
- Sources
- Contribute
- Evidence
- Scene

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

The plan says OCA-006 should support those tabs, but I would add exact component names and props.

## Dossier data contract

Each dossier payload should include:

- `subject`
- `summary`
- `confidence`
- `confidence_reasons`
- `source_cards`
- `timeline`
- `metrics`
- `nearby_objects`
- `related_interventions`
- `related_safety_records`
- `related_historical_events`
- `evidence_graph_ref`
- `scene_manifest_refs`
- `contribution_actions`
- `privacy_flags`
- `download_citation`

That way Place, Object, Source, Event, Intervention, Street, and AtlasNode dossiers all share one contract.

# The plan needs a stronger visual grammar spec

OCA-017 says the Civic Object Renderer should represent current, vanished, inferred, disputed, intervention, crash, source, and Brush asset render modes. That is correct, but it should spell out the grammar.

I would add:

**OCA-017A: Visual Grammar Tokens**

Render states:

- `current_confirmed`
- `current_low_confidence`
- `vanished_confirmed`
- `vanished_inferred`
- `historical_event`
- `public_intervention`
- `community_observation_pending`
- `community_observation_reviewed`
- `disputed_claim`
- `model_prediction`
- `source_stale`
- `source_high_confidence`
- `brush_reconstruction`
- `ifc_semantic_model`

Visual encoding:

- current object: solid extrusion or solid marker
- vanished object: translucent ghost extrusion
- inferred object: dotted outline or soft opacity
- disputed object: split outline / warning glyph
- prediction: separate forecast styling, never same as fact
- community pending: private/admin only or subdued marker
- intervention: time-banded halo or footprint
- crash/safety: road pulse or corridor line
- historical article: timeline stem or anchored pin
- evidence graph link: constellation glyph

This is the thing that prevents visual soup.

# The plan should make Lost Flint more specific

OCA-012 says bounded area, building-presence intervals, ghost render grammar, and historical dossier evidence. Good.

But Lost Flint needs its own data model.

Add:

**OCA-012A: Temporal Building Registry schema**

Fields:

- `building_presence_id`
- `atlas_node_id`
- `current_place_id`
- `historical_name`
- `building_type`
- `footprint_geometry_id`
- `source_footprint_method`
- `known_present_start`
- `known_present_end`
- `first_observed_at`
- `last_observed_at`
- `known_absent_at`
- `demolition_date`
- `demolition_date_confidence`
- `height_estimate`
- `height_source`
- `archetype`
- `render_style`
- `confidence_score`
- `confidence_reasons`
- `source_ids`
- `article_ids`
- `review_state`

Observation types:

- Sanborn footprint
- aerial visible
- city directory listing
- newspaper mention
- demolition record
- photo evidence
- resident memory
- OpenHistoricalMap record
- current absence
- parcel redevelopment

Important rule:

**A building object can exist historically even if no current object exists at that place.**

That is the philosophical heart of “mapping historic data to objects.”

# The plan should add the historical archive/news layer explicitly

We talked about historical newspapers and local events as a major layer. The current plan folds this into Memory/Lost Flint, but it is not explicit enough.

Add:

**OCA-012B: Historical Event / News Article layer**

Objects:

- `HistoricalArticle`
- `HistoricalEvent`
- `PlaceMention`
- `ArticlePlaceLink`
- `ArticleDossier`

Fields:

- article title
- publication
- issue date
- archive URL
- OCR text hash
- excerpt
- copyright/use note
- extracted people/orgs
- extracted place mentions
- candidate coordinates
- location confidence
- event type
- time range
- source confidence
- review state

UI:

- time slider
- event markers
- article dossier
- “why this was mapped here” explanation
- related lost buildings
- related interventions
- related present-day place

This should not wait until some vague future. It is one of the most emotionally compelling parts of the project.

# The plan needs clearer public data/source retrieval architecture

The plan references source refresh and says native retrieval exists, but it does not define the ingestion rail in enough detail.

Add:

**OCA-025: Source Retrieval and Artifact Archive**

Pipeline:

1. Source registry identifies a source.
2. Retrieval job fetches or crawls source.
3. Raw artifact is archived with checksum.
4. Extractor creates candidates.
5. Candidates go to review or auto-accept only if safe and deterministic.
6. Reviewed records project into PostGIS and Memgraph.
7. Public read models are rebuilt.
8. Changelog records the update.

Artifacts:

- `SourceProbe`
- `RawArtifact`
- `ExtractionCandidate`
- `PlaceCandidate`
- `ClaimCandidate`
- `CivicObjectCandidate`
- `ReviewDecision`
- `PublicRecord`

This should also include robots/terms/frequency rules.

Your codebase already has capture/admission, WebDoc ingestion, browser research, Search Kernel, and native search surfaces, so this can route through existing machinery rather than becoming a bespoke scraper island.

# The plan should separate “public read model” from “canonical backend”

It mentions public read models, but I would make the static-node design stronger.

For decentralized use, every atlas node should be able to publish a **static public package**.

Add:

**OCA-026: Public Atlas Package contract**

Required files:

- `/.well-known/our-civic-atlas.json`
- `/data/atlas-node.json`
- `/data/source-registry.json`
- `/data/layer-catalog.json`
- `/data/node-catalog.json`
- `/data/civic-objects.parquet`
- `/data/places.geoparquet`
- `/data/events.geoparquet`
- `/data/sources.parquet`
- `/data/claims-summary.parquet`
- `/data/confidence-cards.json`
- `/data/scene-manifests/*.json`
- `/tiles/basemap.pmtiles`
- `/tiles/layers/*.pmtiles`

Optional files:

- `/assets/glb/*.glb`
- `/assets/splats/*.splat`
- `/assets/thumbs/*.webp`
- `/api/features`
- `/api/dossiers`
- `/api/contribute`

This is what makes “bordering on as easy as making a website” real.

# The plan should strengthen accessibility and phone-first behavior

It says mobile-first and visual QA, but it needs explicit mobile UX gates.

Add:

**OCA-027: Mobile Civic Access Gate**

Acceptance criteria:

- Works at 390 × 844.
- Search is usable before map controls.
- Dossier bottom sheet has three snap points.
- All essential facts available without hovering.
- No chart-only communication.
- Source/confidence visible in first screen of dossier.
- Contribution flow can be completed from phone.
- Large 3D assets are optional and lazy-loaded.
- Tap targets meet accessibility sizing.
- Reduced-motion mode exists.
- Works without desktop-only interactions.
- Map is useful with low bandwidth.

This is not polish. This is civic access.

# The plan should define Node Horizon more concretely

OCA-005 says parent, child, and neighbor atlas nodes should render as spatial portals/horizon markers. Good, but Codex needs behavior.

Add:

**Node Horizon behavior spec**

When viewing Flint:

- Carriage Town appears as child/high-detail node inside Flint.
- Grand Blanc appears as nearby node beyond Flint boundary.
- Michigan appears as parent context.
- Detroit appears as neighbor/distant node if manifest exists.
- Unknown/unverified nodes do not appear unless manually added or discovered through approved catalog.

Interactions:

- tap marker → preview card
- preview card → open node
- open node → transition route
- breadcrumb → return to parent
- compare → side-by-side summary
- stale node → show stale/freshness badge

Preview card fields:

- node name
- scope type
- distance/direction
- maintainer
- last updated
- capabilities
- source count
- contribution status
- open button

# The plan should add governance for forks and disputes

OCA-023 covers governance docs, privacy, methodology, source registry guide, contribution policy, city index, and start-an-atlas docs.

I would add a specific dispute/governance model.

Because decentralized civic data will eventually have conflict:

- two people make competing Flint atlases
- someone publishes bad data
- a node becomes stale
- a maintainer disappears
- a contributor disputes a rejection
- a government source and resident observation conflict

Add:

**OCA-023A: Governance and Dispute Model**

Docs:

- non-official status
- maintainer responsibilities
- correction process
- takedown/privacy process
- stale atlas policy
- competing node policy
- source dispute policy
- contributor appeal path
- public changelog policy
- license and reuse policy
- “do no harm” policy

This keeps the project from becoming an open data Thunderdome wearing a cardigan.

# The plan should make ML more concrete even while deferring it

OCA-022 defers TimesFM/ST-GNN/DyGFormer until data sufficiency gates pass. That is correct.

But I would add an ML readiness spec now, so the future work does not become misty.

Add:

**OCA-022A: ML Readiness Contract**

For Street Safety Lab:

- road segment graph exists
- crash events matched to road segments
- monthly target table exists
- baseline models exist
- caveat copy approved
- fairness/risk review completed
- predictions labeled as predictions
- no individual blame or enforcement targeting
- output is advisory and aggregate

Model ladder:

1. historical average
2. seasonal naive
3. Poisson / negative binomial
4. zero-inflated model
5. gradient boosting
6. TimesFM for corridor/ward aggregate trends
7. ST-GNN for road-network risk
8. DyGFormer for dynamic civic knowledge graph tasks, not first-pass crash prediction

For DyGFormer:

- use for duplicate event detection
- article-place linking
- source refresh prioritization
- candidate relation proposals
- under-documented place detection
- confidence update proposals

Public rule:

**Models create proposals, warnings, and forecasts. They do not create public facts.**

# The plan should specify the Brush/OpenBIM pipeline better

The deferrals correctly reject Revit as required and live Blender/Revit MCP for rendering. But they do not yet define how Brush, Blender, IFC, and web assets actually fit.

Add:

**OCA-018A: Scene Foundry asset pipeline**

Inputs:

- reviewed SceneManifest
- CivicObject geometry
- building presence intervals
- source cards
- confidence
- optional photos
- optional IFC/GLB/Brush assets

Processors:

- procedural renderer
- Blender job
- Brush reconstruction job
- IfcOpenShell/Bonsai/FreeCAD job
- GLB optimizer
- thumbnail renderer
- asset validator

Outputs:

- `scene_manifest.json`
- `scene.glb`
- `scene_thumb.webp`
- `scene_preview.mp4`
- `asset_metadata.json`
- optional `3dtiles/`
- optional Brush splat asset

Rules:

- no live LLM required for public page rendering
- every render object must link back to source/evidence
- generated objects are marked generated/inferred
- Brush only used when real imagery exists
- procedural ghost buildings must not imply exact reconstruction unless sources justify it

# The plan should better distinguish Atlas Scene from Scene Foundry

Right now both are present, but Codex might blur them.

Define:

**Atlas Scene** is the live web UI: MapLibre, deck.gl, Three/R3F, PMTiles, Mosaic panels, dossiers.

**Scene Foundry** is the background asset generation pipeline: Blender, Brush, IFC, GLB, 3D Tiles, thumbnails.

**SceneManifest** is the contract between them.

That three-part split should be in bold in the plan.

# The plan should add API endpoint shapes

The plan says routes exist for home/explore/memory/safety/interventions/sources/contribute/methodology/node/place/object/scene. Good, but it should include API routes.

Add:

Frontend routes:

- `/`
- `/explore`
- `/memory`
- `/safety`
- `/interventions`
- `/sources`
- `/contribute`
- `/methodology`
- `/nodes/[nodeId]`
- `/places/[placeId]`
- `/objects/[objectId]`
- `/events/[eventId]`
- `/sources/[sourceId]`
- `/scenes/[sceneId]`
- `/review`
- `/start`

API routes:

- `/api/atlas/manifest`
- `/api/atlas/nodes`
- `/api/atlas/layers`
- `/api/atlas/sources`
- `/api/atlas/dossier/[id]`
- `/api/atlas/search`
- `/api/atlas/contributions`
- `/api/atlas/contributions/[receiptId]`
- `/api/atlas/review`
- `/api/atlas/review/[id]`
- `/api/atlas/scene-manifests/[id]`
- `/api/atlas/evidence-graph/[id]`
- `/api/atlas/source-refresh/[sourceId]`

# The plan should add observability earlier

The production gates mention observability/logging for submissions, review, and source refresh. That should be a checklist item, not just a gate.

Add:

**OCA-028: Civic Atlas observability**

Track:

- source refresh runs
- source failures
- contribution submissions
- moderation preflight flags
- review decisions
- public read-model rebuilds
- manifest validation failures
- map load performance
- dossier open events
- search zero-result queries
- stale source warnings
- failed asset loads
- privacy blocked fields

Public transparency:

- source changelog
- data update log
- reviewed contribution count
- stale source list
- known limitations

Private/admin:

- moderation queue latency
- abuse patterns
- failed ingestion jobs
- reviewer workload
- suspected PII flags

# My recommended added checklist items

Here is the exact set I would add to the plan.

## Add before OCA-003

**OCA-002A: Define Civic Object Contract v0**
Create the shared schema for all civic objects with place, time, confidence, review state, source links, render modes, and public visibility.

**OCA-002B: Define AtlasNode Manifest v0**
Create full schema for node identity, boundary, parent/child/neighbor links, capabilities, maintainers, licenses, and public read-model URLs.

**OCA-002C: Build Minimal Static Atlas Starter v0**
Create a fixture atlas that can run with only static manifests and public read-model files.

## Add after OCA-006

**OCA-006A: Define Dossier Payload Contract v0**
One typed payload shape for Place, Object, Event, Source, Intervention, RoadSegment, and AtlasNode dossiers.

**OCA-006B: Define Mobile Dossier Interaction Spec**
Bottom sheet behavior, search-first flow, snap points, tabs, source/confidence visibility, reduced controls.

## Add after OCA-012

**OCA-012A: Define Temporal Building Registry schema**
Detailed building presence object, evidence types, confidence reasons, and absence/disappearance modeling.

**OCA-012B: Add Historical Article/Event Layer v0**
Article, event, place mention, and article-place confidence schema with dossier support.

## Add after OCA-017

**OCA-017A: Define Visual Grammar Tokens**
Exact render states for current, vanished, inferred, disputed, intervention, crash, prediction, source, Brush asset, and IFC asset.

**OCA-017B: Define Node Horizon interaction contract**
Preview card, open-node transition, parent/child/neighbor behavior, stale node badges.

## Add after OCA-018

**OCA-018A: Define Scene Foundry asset pipeline**
Blender/Brush/IFC/GLB/3D Tiles job inputs, outputs, validators, and provenance requirements.

## Add after OCA-020

**OCA-020A: Define Public Atlas Package contract**
The exact files every static atlas node must publish.

**OCA-020B: Define Offline/Low-Bandwidth Mode**
What loads first, what is lazy, what is optional, and what degrades gracefully.

## Add after OCA-022

**OCA-022A: Define ML Readiness Contract**
Crash/road graph data sufficiency, baselines, fairness/caveat copy, prediction labeling, proposal-only outputs.

## Add after OCA-023

**OCA-023A: Define Governance and Dispute Model**
Forks, stale nodes, correction requests, takedowns, source conflicts, contributor appeals.

## Add after OCA-024

**OCA-025: Source Retrieval and Artifact Archive**
Scrapy/native_search/RQ/web retrieval pipeline with raw artifact archive, extraction candidates, review, projection, and changelog.

**OCA-026: Public API and Endpoint Contract**
Frontend routes and API routes for manifests, dossiers, search, contributions, review, evidence graph, and scene manifests.

**OCA-027: Mobile Civic Access Gate**
Phone-first usability, accessibility, reduced motion, low-bandwidth, and no-hover requirements.

**OCA-028: Observability and Public Changelog**
Submission, source refresh, review, read-model rebuild, privacy, and performance telemetry.

# Priority changes I would make

I would slightly reorder the plan.

The current execution instructions say to start with OCA-001, then OCA-002, then OCA-003/OCA-004. That is reasonable, but I would insert the missing schema work before the major UI build.

My order:

1. OCA-001: identity
2. OCA-002: manifest-first federation
3. OCA-002A: CivicObject contract
4. OCA-002B: AtlasNode manifest
5. OCA-002C: static starter
6. OCA-003: routes
7. OCA-004: Atlas Scene
8. OCA-005: Node Horizon
9. OCA-006 + OCA-006A: dossier contract
10. OCA-008/OCA-009: contribution/review
11. OCA-012: Lost Flint
12. OCA-013: Intervention Ledger
13. OCA-015/OCA-016/OCA-017: Evidence + SceneManifest + Renderer
14. OCA-019/OCA-020: creator kit and performance stack
15. OCA-022: ML readiness

The reason: **UI before schema will look exciting but become brittle. Schema before UI can still be beautiful if the visual grammar is clear.**

# My overall verdict

This plan is a strong launch plan. It captures the right modules and preserves the right safety boundaries. It correctly refuses to make uploads public immediately, refuses to depend on Revit, refuses to make live MCP rendering part of page load, refuses to treat Rusty Red Graph as canonical, and refuses to rush TimesFM/ST-GNN/DyGFormer into launch.

Where it differs from the full scope is that it is still too **checklist-level** in the places where the project needs **contract-level specificity**.

The additions I would make are:

- CivicObject schema
- AtlasNode manifest schema
- static atlas package contract
- exact dossier payload contract
- exact visual grammar
- Lost Flint temporal registry schema
- historical article/event schema
- source retrieval/artifact archive pipeline
- Scene Foundry asset pipeline
- Node Horizon behavior spec
- governance/dispute model
- mobile civic access gate
- ML readiness contract
- observability/changelog contract

The little blueprint goblin’s verdict: **do not replace the plan. Add a companion system spec and insert schema/contract tasks into the checklist.** That will make it much easier for Codex to build the thing we actually imagined, not just a handsome map with civic jewelry.