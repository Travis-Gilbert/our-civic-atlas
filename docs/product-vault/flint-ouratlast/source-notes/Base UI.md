---
"Plan #": 2
Done?: true
Approved: true
---
# Desire
So beyond what we've talked about so far, what do you think would be another interesting layer to add on to this? way to make it more complete. Architect, tech, ui, etc
Additionally, where is your thoughts on my current DYGFormer the fused to have spatial data?

Because this isn't for profit it can use the full cosmography rather than just comso.gl
Interesting things to look into [NYC Taxi Rides \| Mosaic](https://idl.uw.edu/mosaic/examples/nyc-taxi-rides.html)
https://cosmograph.app/dev/examples/Data%20handling/Handle%20spatial%20data
[run.cosmograph.app/public/32e1288d-ccbc-46cc-8e00-203c84364b06](https://run.cosmograph.app/public/32e1288d-ccbc-46cc-8e00-203c84364b06)
[Mosaic vgplot \| Mosaic](https://idl.uw.edu/mosaic/vgplot/)
[Mosaic Declarative Specifications \| Mosaic](https://idl.uw.edu/mosaic/spec/)

---
# Plan

According to a document from May 12, 2026, the current Open Flint Atlas plan already has a source registry, source probes, a v0.1 data dictionary, a public read-model fixture, a fixture-only provenance graph contract, and a static mobile-first dossier prototype. The missing pieces are the routed public UI, governance pages, contribution/review workflow, real PostGIS tables, and canonical Memgraph write path. That changes my recommendation: the next layer should not be “more data” in the generic sense. It should be a layer that makes the atlas explain **what changed, who acted, what was promised, what was funded, and what happened afterward.**

My strongest next-layer vote is:

# Civic Intervention Ledger

This would be the layer that connects conditions to actions.

Right now the atlas is becoming a beautiful way to see Flint’s conditions, history, vanished buildings, health access, crashes, zoning, and source confidence. What would make it feel _complete_ is a layer showing public and civic interventions over time: capital improvement projects, CDBG/HOME/ESG-funded work, demolitions, water-service-line work, zoning changes, park improvements, street projects, land bank activity, corridor plans, grant-funded programs, and neighborhood organization projects.

The dossier for a place would not only say “here is the current condition.” It would also say: “here is what was promised here,” “here is what was funded,” “here is what happened,” “here are the documents,” and “here is what changed afterward.”

That is the missing accountability layer. It turns the atlas from a microscope into a civic flight recorder.

The City of Flint’s Capital Improvement Plan page says the Planning Division compiles department project lists and organizes planned capital improvements for Planning Commission review against the Comprehensive Plan, which is exactly the kind of public action record this layer should ingest. ([City of Flint](https://www.cityofflint.com/documents/capital-improvement-plan/ "Capital Improvement Plan - City of Flint")) Flint’s Community Services page also describes HUD entitlement funds such as CDBG, HOME, and ESG, including uses like infrastructure, economic development, public facilities, housing rehabilitation, public services, clearance/acquisition, code enforcement, affordable housing, and homelessness assistance. ([City of Flint](https://www.cityofflint.com/community-services/ "Community Services - City of Flint"))

In the UI, this becomes a “Promises / Work / Outcomes” tab in every dossier. A ward, corridor, parcel, or street could show a timeline of interventions alongside crashes, health-resource access, building loss, census indicators, and environmental risk. The compelling public question becomes: **where did attention go, and did conditions improve afterward?**

Technically, this fits the PostGIS plus graph split very well. PostGIS stores project footprints, corridors, parcels, buffers, service areas, and spatial joins. The graph stores relationships among project, fund, agency, source document, meeting, claim, metric, place, and outcome. Your existing Open Flint plan already names that split: PostGIS/DuckDB for spatial truth, Memgraph/Theseus for source, claim, conflict, observation, review, and provenance relationships.

# How I’d make DyGFormer spatial

I’ll use the paper’s spelling, **DyGFormer**, though your “DYGFormer” shorthand is totally clear.

My take: DyGFormer is a good fit, but not for raw GIS geometry by itself. It is strongest when you have a **dynamic graph of interactions over time**. The original DyGFormer paper describes it as a Transformer-based dynamic graph learning architecture that learns from nodes’ historical first-hop interactions, uses neighbor co-occurrence encoding, patches historical sequences, and captures long-term temporal dependencies. ([OpenReview](https://openreview.net/forum?id=xHNzWHbklj "Towards Better Dynamic Graph Learning: New Architecture and Unified Library | OpenReview"))

So the right move is not “feed it polygons.” The right move is to convert Flint into a temporal civic graph.

For Open Flint Atlas, nodes could be parcels, buildings, roads, intersections, tracts, wards, organizations, datasets, articles, interventions, funding sources, and civic events. Edges could mean “inside,” “adjacent to,” “reported by,” “funded by,” “mentioned in,” “same corridor as,” “crash occurred on,” “building existed at,” “demolished after,” “source supports,” “source conflicts with,” or “intervention affected.”

Then each edge or event gets a timestamp. That gives DyGFormer something meaningful to learn: not static geography, but **how civic relationships evolve through time**.

Spatial data should enter in three ways.

First, as features: projected coordinates, road-segment ID, census tract, ward, zoning type, distance to park, distance to river, distance to school, distance to transit, road class, AADT, impervious surface, tree canopy, flood zone, and so on.

Second, as spatial edges: adjacent parcels, road segments sharing intersections, buildings inside parcels, parcels inside tracts, places within a walking-distance buffer, streets in the same corridor, and neighborhoods connected by commuting patterns.

Third, as temporal event edges: a crash happened on this road segment in March 2019; a building was visible in a 1928 Sanborn map; a demolition occurred in 2024; a project was funded in 2022; a newspaper article mentioned this site in 1946.

That is where the model becomes real instead of model theater.

I would use DyGFormer for **dynamic civic graph tasks**, not as the primary crash predictor. Good DyGFormer tasks would be: linking historical articles to places, detecting likely duplicate events, finding under-documented places, predicting which dossiers need source refresh, identifying civic event clusters, and suggesting candidate relationships between vanished buildings, articles, directories, aerial photos, and current parcels.

For crash forecasting, I’d still use a road-network spatiotemporal model or probabilistic baseline first. Crash data is sparse and zero-heavy. There is already research specifically using a Spatiotemporal Zero-Inflated Tweedie Graph Neural Network for road-level crash prediction, because road crashes are rare, unevenly distributed, and uncertainty-heavy. ([arXiv](https://arxiv.org/abs/2309.05072?utm_source=chatgpt.com "Uncertainty-Aware Probabilistic Graph Neural Networks for Road-Level Traffic Accident Prediction"))

So the clean model division is this:

DyGFormer handles the **evolving civic knowledge graph**.

A road-network ST-GNN handles **road-segment risk**.

TimesFM or another time-series foundation model handles **aggregate temporal trends**, like crash burden by corridor, demolition pace by ward, or source freshness over time.

# Cosmograph plus Mosaic is the right visual architecture

I would not choose between Mosaic and Cosmograph. They do different magic tricks.

Mosaic is the analytical workbench. The NYC Taxi Rides example is directly relevant because it uses DuckDB spatial to project longitude/latitude into planar coordinates, then lets the user select a region in one plot to filter the others. It also crossfilters spatial plots with a time histogram. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic/examples/nyc-taxi-rides.html "NYC Taxi Rides | Mosaic")) The Framework version says the data loader ingests remote data into DuckDB, projects coordinates in the database, and then visualizes pickup/dropoff maps and trip volume by hour with linked filtering. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic-framework-example/nyc-taxi-rides "NYC Taxi Rides | Mosaic + Framework"))

That is almost exactly what you want for Flint: events on a map, filtered by time, source, event type, ward, corridor, confidence, or intervention.

Cosmograph is the relationship canvas. Its docs describe it as a high-performance graph visualization system for knowledge graphs, semantic maps from AI embeddings, financial transactions, cybersecurity logs, and other large relationship datasets. ([Cosmograph](https://cosmograph.app/docs-general/ "Introduction | Cosmograph")) The broader Cosmograph App docs also emphasize large graph analytics, DuckDB, local/privacy-first data handling, timeline support, and moving between Python notebooks, browser exploration, and web-app development. ([Cosmograph](https://cosmograph.app/ "Cosmograph: Beautiful visualization and analytics right in the browser | Cosmograph"))

So my architecture would be three coordinated surfaces.

The first surface is **MapLibre/PMTiles**: the geographic ground truth. This is where residents tap places, roads, buildings, tracts, and resources.

The second surface is **Mosaic/vgplot/Framework**: the analytical dashboard. This is where you brush time ranges, filter by source confidence, compare wards, and slice crash/resource/intervention data. Mosaic is especially suitable because its coordinator uses DuckDB queries, selections behave like SQL filters, and views can be crossfiltered across charts and tables. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic/what-is-mosaic/ "What is Mosaic? | Mosaic"))

The third surface is **Cosmograph**: the civic relationship graph. This answers “why does this dossier say that?” It shows the web of article, source, agency, dataset, project, building, claim, event, and place. It should not replace the map. It should reveal the evidence network behind the map.

The exciting bit: both Mosaic and Cosmograph now have strong DuckDB alignment. Mosaic is built around DuckDB-backed coordinated queries, and Cosmograph 2.0 is also described as built from the ground up with DuckDB. ([GitHub](https://github.com/uwdata/mosaic "GitHub - uwdata/mosaic: An extensible framework for linking databases and interactive views. · GitHub")) ([Cosmograph](https://cosmograph.app/docs-general/ "Introduction | Cosmograph")) That means your public read models can converge around Parquet/DuckDB-friendly data rather than building two unrelated visualization stacks.

For Mosaic specs, I would lean into declarative configuration. The Mosaic spec docs say `mosaic-spec` lets you define visualizations as JSON or YAML and generate applications or JavaScript from them. ([UW Interactive Data Lab](https://idl.uw.edu/mosaic/spec/ "Mosaic Declarative Specifications | Mosaic")) That is useful because Open Flint Atlas can eventually generate views from the source registry: every layer knows its data file, geometry type, time field, confidence field, and chart options. The atlas becomes configurable civic infrastructure, not a pile of hand-built dashboard pages.

I could not meaningfully inspect the specific `run.cosmograph.app` link through the browsing tool because it returned no crawlable page content, so I am basing the recommendation on the official Cosmograph docs rather than that particular graph. ([run.cosmograph.app](https://run.cosmograph.app/public/32e1288d-ccbc-46cc-8e00-203c84364b06 "run.cosmograph.app"))

# Other layers that would make the atlas more complete

Beyond the Civic Intervention Ledger, I’d add three families of layers.

The first is **infrastructure vulnerability**. Flint’s water service line map is a very relevant source because it describes the best available information about residential service-line materials, including modeled likelihood for uninspected lines, while also warning users about accuracy limits. ([Flint Service Line Map](https://flintpipemap.org/ "Flint Service Line Map")) This would pair naturally with flood, tree canopy, impervious surface, and heat layers.

The second is **health and environmental exposure**. CDC PLACES provides local estimates for health outcomes, preventive service use, risk behaviors, disabilities, health status, health-related social needs, and social determinants of health at geographies including census tracts and places. ([CDC](https://www.cdc.gov/places/tools/data-portal.html "PLACES Data Portal | PLACES | CDC")) EnviroAtlas has geospatial data around ecosystem services, stressors, human health, and environmental layers such as land cover, canopy, vegetation, and impervious surfaces. ([US EPA](https://www.epa.gov/enviroatlas "EnviroAtlas | US EPA")) USGS National Map adds nationally consistent elevation, hydrography, boundaries, structures, transportation, and related geospatial datasets. ([USGS](https://www.usgs.gov/tools/download-data-maps-national-map "Download Data & Maps from The National Map | U.S. Geological Survey")) FEMA’s National Flood Hazard Layer adds effective flood-risk mapping, flood zones, base flood elevations, and floodway status where available. ([NOAA Coastal Management](https://coast.noaa.gov/digitalcoast/data/flood.html "National Flood Hazard Layer"))

The third is **economic life and mobility**. LEHD/LODES is useful because it provides spatial distributions of workers and jobs, home-to-work relationships, industries, worker demographics, and job characteristics at census-block scale. ([lehd.ces.census.gov](https://lehd.ces.census.gov/data/?utm_source=chatgpt.com "Data - Longitudinal Employer-Household Dynamics")) ([lehd.ces.census.gov](https://lehd.ces.census.gov/data/lehd-code-samples/sections/lodes.html?utm_source=chatgpt.com "LEHD Origin-Destination Employment Statistics (LODES)")) This would let you ask: where do Flint residents work, which corridors connect housing to jobs, how does transit align with employment access, and where are services missing relative to daily life?

Crash data remains one of the strongest public-good layers. Michigan Traffic Crash Facts says its Data Query Tool currently covers 2004 through 2024 and that 2024 crash data is live. ([Michigan Traffic Crash Facts](https://www.michigantrafficcrashfacts.org/ "Michigan Traffic Crash Facts")) That is enough history to build a serious street-safety module, especially if you aggregate to road segment, corridor, ward, and tract.

# The real integration plan after MVP

Since the MVP is already done, I would not call the next phase “MVP+.” I’d call it **Atlas Core v1**.

The first job is to promote the prototype data model into a real **Spatial Event Index**. Every record should become an event, observation, metric, source, or intervention attached to a place and time. This is the backbone for vanished buildings, crash trends, historical newspapers, water infrastructure, public projects, and health data.

The second job is to create the **Intervention Ledger**. Start with Capital Improvement Plan records, CDBG/HOME/ESG public documents, demolitions, water-service-line work, and major public projects. Add them as source-backed events with geometry and time ranges.

The third job is to create a **Cosmograph evidence view** for a selected place. When someone taps a road, parcel, building, or tract, the map dossier should have a button like “show evidence graph.” That opens a graph of sources, claims, events, articles, public projects, datasets, and related places.

The fourth job is to build the **Street Safety Lab**. Start with baselines before neural models: historical crash count, recent trend, seasonal naive forecast, Poisson or negative-binomial regression, zero-inflated model, and maybe LightGBM with spatial features. Only then bring in TimesFM and an ST-GNN. This keeps the model honest.

The fifth job is to build the **DyGFormer civic graph experiment**. The goal should not be “predict Flint.” The goal should be narrower and testable: can DyGFormer improve event-place linking, source refresh prioritization, duplicate event detection, or dossier confidence updates over simpler graph baselines?

Your current codebase is actually unusually ready for this. The current Index-API map says Memgraph is the canonical store for graph entities, while Postgres is retained for SQL-native data only. It also already has `/api/v2/theseus/spacetime/` for spacetime topic jobs and `/api/v2/theseus/lens/` for focus, properties, dossier, and timeline. The graph-training side also already has a Memgraph-to-Arrow streaming export lane for GNN/KGE/Kuzu artifacts, which is exactly the kind of export path you want for DyGFormer experiments.

# The model contract I’d use

The model pipeline should be boringly explicit.

PostGIS creates spatial features and joins. Memgraph stores the dynamic civic graph. The export layer creates temporal training snapshots. DyGFormer learns on event sequences and dynamic edges. The atlas receives only reviewed outputs: candidate links, confidence changes, refresh suggestions, duplicate candidates, and model-labeled predictions.

Do not let the model directly mutate public facts. Let it create **reviewable proposals**.

That fits the project’s current public principles: uncertainty visible, predictions labeled, community reports treated as observations, and privacy gates before public contribution flows. The existing plan also already treats contribution/review/privacy as the next high-risk workflow, with observation states such as submitted, needs review, corroborated, conflicting, accepted, rejected, and superseded.

# My actual recommendation

The next major layer should be **Civic Intervention Ledger**.

The next visual upgrade should be **Mosaic for time-filtered spatial analytics plus Cosmograph for evidence/provenance graphs**.

The next ML step should be **DyGFormer for dynamic civic-knowledge tasks**, not crash prediction first.

The next crash step should be **baseline models and road-segment monthly aggregation**, then TimesFM for corridor-level trends, then ST-GNN for road-network risk.

And the next architecture milestone should be **Spatial Event Index**: one shared temporal grammar for crashes, vanished buildings, newspaper events, public projects, health resources, resident observations, and source updates.

That gives the atlas a spine. Everything else can hang from it without turning into a data chandelier.