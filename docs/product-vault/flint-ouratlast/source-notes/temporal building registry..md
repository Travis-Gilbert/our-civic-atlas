---
"Plan #": 1
Approved: true
---
# Desired outcome
There's a lot of data on the internet of buildings that were once standing in Flint, and where they were, and how they are currently no longer there. So it would be really cool to build a layer of this that indexes buildings that used to exist. And I also just think my urban planning friends would find that really fun in a sad way, kind of. What do you think are the natural next steps?

Also, the MVP is already done. We should plan the real integration of the GNN and the time series. Is there a way to make that idea more solid, like technologically speaking? Those are just the two technologies that I have immediate access to, but there are more. Can you do a search and see what you find? And also, other sources of data that are useful to add generally speaking

---
# plan

[![How Flint, Michigan Got Its Name and Its Growth Years, 1855-1920s](https://images.openai.com/static-rsc-4/uNMkRR0k6YZ-0NuyeltxVpqVNeaEcThYoisnD1eiEq48xAmZLhhhyBVEWfZDYItvEHpeiYRkw4aWp70oeVJjW8ybW7WPngR-1WGvn0igW3LzlOYdUqUWFmmZAktG6jICHVnWW_NbPpQF7JSwkeLUWrW16ngWegxKX6LddE4UmIk?purpose=inline)](https://99wfmk.com/vintage-flint-michigan-photos/?utm_source=chatgpt.com)

Yes. The “buildings that used to exist” layer is a _very_ natural next step. It gives the atlas emotional gravity. The public-data layers show Flint as a present-tense city; the vanished-buildings layer makes the city navigable as memory, loss, industry, disinvestment, urban renewal, demolition, and survival.

I would make this a named module:

# Lost Flint Layer

Not just “demolished buildings.” More like a **temporal building registry**.

Each building or site gets a dossier with what it was, where it was, when it appears in the record, when it disappears or changes, how confident the atlas is, and which sources support that story. For example: “Buick Plant 36,” “a house visible on 1928 Sanborn but gone by 1966 aerial,” “a Land Bank demolition parcel,” “a building mentioned in a city directory,” or “a structure shown in a historic newspaper photo.”

This fits your existing direction perfectly because your current Open Flint Atlas plan already has source registry, source probes, read-model fixtures, a provenance graph contract, and a static mobile-first dossier prototype done; the planned gaps are contribution/review/privacy workflow and standalone public-infrastructure packaging. The plan also already says PostGIS/DuckDB should own spatial truth, while Memgraph/Theseus should own sources, claims, conflicts, observations, and provenance trails.

## The vanished-buildings idea is technically solid

The core data object should not be “building.” It should be **building presence over time**.

A building can have multiple observations: seen on a Sanborn map in 1914, listed in a city directory in 1924, visible in a 1966 aerial, absent in a 1997 aerial, marked demolished in a Land Bank list, mentioned in a newspaper article, or recorded in OpenHistoricalMap. The dossier can then say, “Known present from 1914 to 1966; likely gone by 1997; demolition source unknown,” instead of pretending to know an exact demolition date.

There are surprisingly good source paths for this. UM-Flint’s local history research guide says building research relies on city directories and Sanborn Digital Maps, with Sanborn maps dating from 1886 to 1928 for Flint-related research. ([UM-Flint Library Guides](https://libguides.umflint.edu/LocalHistory/buildings?utm_source=chatgpt.com "Flint & Local History: A Guide to Library Research: Historic ...")) HathiTrust has Flint city directories with full-view years from 1918 through 1929 and additional later search-limited years into the 1980s, which is perfect for address/name/time joins. ([HathiTrust Digital Library](https://catalog.hathitrust.org/Record/102831789 "Catalog Record: Flint, Michigan, city directory | HathiTrust Digital Library")) Genesee County GIS says historical aerial photography was obtained digitally for 1966, 1977, 1982, 1987, 1992, and 1997, which gives you an aerial time ladder for detecting disappearance. ([Genesee County Michigan](https://www.geneseecountymi.gov/departments/gis/history.php "Genesee County, MI"))

For modern demolition, the Genesee County Land Bank says it has demolished more than 8,400 blighted structures in Flint and Genesee County since 2004. ([The Land Bank](https://www.thelandbank.org/demolition.asp "Demolition - Genesee County Land Bank")) The Land Bank’s 2024 Flint demolition PDF already has parcel IDs, addresses, wards, residential type, and statuses like “DEMOLISHED,” “CANCELLED,” and planned demolition windows. For industrial Flint, RACER Trust’s Buick City site page says demolition of most buildings in the Northend was completed in 2012, which gives you a high-confidence anchor for a major vanished industrial landscape. ([racertrust.org](https://www.racertrust.org/properties/buick-city-site "Buick City Site :: RACER Trust"))

OpenHistoricalMap is also worth integrating or at least aligning with. It describes itself as an interactive historical map of the world, created by contributors and dedicated to the public domain except where otherwise noted. ([OpenHistoricalMap](https://www.openhistoricalmap.org/ "OpenHistoricalMap")) The National Park Service also provides spatial data from the National Register of Historic Places database, which is useful for surviving or formally recognized historic places. ([National Park Service](https://www.nps.gov/subjects/nationalregister/data-downloads.htm "Data Downloads - National Register of Historic Places (U.S. National Park Service)"))

So yes: this is not a weird side quest. This is one of the atlas’s strongest civic-history features.

## Natural next steps

First, make **Lost Flint** its own dataset family, not a random layer. The module should have a clear source registry section, a data dictionary, a review status, and a confidence model. It should not merge all historical evidence into one flat record too early.

Second, build a first “presence interval” pipeline. Pick a small area, maybe Carriage Town, St. John Street/Southside, downtown, or Buick City. Load one Sanborn year, one city directory year, one aerial year, and one modern parcel/demolition source. The goal is not full automation yet. The goal is to prove the dossier format: “this building existed here during these years, according to these sources.”

Third, create a manual review queue. Historical geocoding is messy. Addresses change, street names shift, industrial campuses reuse building numbers, and OCR will invent little gremlins wearing street signs. Let the model produce candidates, but make promotion reviewable.

Fourth, add a time slider and “then/now” interaction. On mobile, this could be simple: tap a site, then swipe through years. On desktop, it can become a layered historical canvas.

Fifth, decide whether some reviewed records should be contributed back to OpenHistoricalMap. That would make the project a public-good contributor, not just a consumer.

## I would now plan the ML as two separate systems

The GNN and the time-series foundation model should not be one blob. They solve related but different problems.

**TimesFM or another time-series foundation model** should forecast aggregate sequences: crash counts by corridor, monthly demolitions by ward, article/event intensity by neighborhood, resource availability over time, or source freshness. Google describes TimesFM as a 200M-parameter forecasting model trained on 100 billion real-world time points, designed for zero-shot forecasting across domains and granularities. ([Google Research](https://research.google/blog/a-decoder-only-foundation-model-for-time-series-forecasting/ "A decoder-only foundation model for time-series forecasting")) That is useful when you have many time series but not enough local data to train a giant custom model from scratch.

**The spatiotemporal GNN** should model things where adjacency matters. Crash risk is the cleanest candidate. Roads are already a graph. One road segment’s risk can be related to adjacent intersections, nearby corridors, road class, traffic volume, school/park proximity, transit stops, land use, and time of day.

So the first real ML feature should be:

**Street Safety Forecast: road-segment crash risk with uncertainty.**

Not “this crash will happen here.” That is too strong and ethically ugly.

Better: “This road segment has elevated modeled risk for the next period based on historical crashes, traffic volume, road-network context, and nearby conditions.”

## The crash forecasting idea is much more solid than it sounded at first

The data foundation is there. Michigan Traffic Crash Facts says the 2024 Michigan crash data is live as of August 2025, and its Data Query Tool currently covers 2004 through 2024. ([michigantrafficcrashfacts.org](https://www.michigantrafficcrashfacts.org/ "Michigan Traffic Crash Facts")) That gives you a twenty-year historical target series.

For the road graph, Michigan Geographic Framework data is explicitly described as the state’s digital base map, including roads, rivers, jurisdiction boundaries, census boundaries, and a linear referencing system connected to MDOT’s Michigan Accident Location Index. ([mcgi.state.mi.us](https://www.mcgi.state.mi.us/AGOOpenData/Metadata/Reference/Reference.CSS_SDE_ADMIN.ROADS_HIGHWAYS_MGF.html "Michigan Highway System - Framework V17")) MDOT also has traffic-volume data where AADT and commercial AADT are estimated mean daily traffic volumes, and GVMC says its traffic count database contains local and MDOT traffic counts with current and historic count records available for query. ([gis-mdot.opendata.arcgis.com](https://gis-mdot.opendata.arcgis.com/datasets/2023-traffic-volumes/about?utm_source=chatgpt.com "2023 Traffic Volumes - MDOT GIS Open Data - ArcGIS Online")) ([Grand Valley Metro Council](https://www.gvmc.org/traffic-monitoring "Traffic Monitoring — Grand Valley Metro Council"))

The literature also lines up. A 2024 road-level crash prediction paper argues that fine-scale traffic accident prediction is hard because crashes are sparse and mostly zero-valued, then proposes a Spatiotemporal Zero-Inflated Tweedie Graph Neural Network that models accident frequency with a Poisson component, injury severity with a Gamma component, and extra non-incident cases with a zero-inflated component. ([arXiv](https://arxiv.org/abs/2309.05072 "[2309.05072] Uncertainty-Aware Probabilistic Graph Neural Networks for Road-Level Traffic Accident Prediction")) That is almost exactly the modeling issue you will face in Flint.

For implementation, I would look at Torch Spatiotemporal or PyTorch Geometric Temporal. PyTorch Geometric Temporal describes itself as a temporal graph neural network extension for PyTorch Geometric that processes spatiotemporal signals using graph snapshots. ([pytorch-geometric-temporal.readthedocs.io](https://pytorch-geometric-temporal.readthedocs.io/ "PyTorch Geometric Temporal Documentation — PyTorch Geometric Temporal  documentation")) Torch Spatiotemporal focuses on neural spatiotemporal forecasting with PyTorch and GNNs, and includes tools for preprocessing, missing data, models, layers, and reproducible experiments. ([tsl](https://torch-spatiotemporal.readthedocs.io/ "Torch Spatiotemporal"))

## The technical shape of the crash model

Make road segments the nodes. Connect nodes when road segments touch, share an intersection, belong to the same corridor, or are within a small network distance. Every month, each road segment gets features.

The target can be monthly crash count, injury crash count, pedestrian/bicycle crash count, or a severity-weighted crash burden. Start with monthly because yearly is too coarse and daily may be too sparse.

The feature set should include past crashes, lagged crash counts, seasonality, road class, AADT, commercial AADT, intersection density, nearby schools, parks, transit stops, zoning mix, land use, speed/functional class if available, and distance to major corridors. Transitland has current and historical GTFS feed records for Flint MTA, including current static GTFS and archived feed versions. ([Transitland](https://www.transit.land/feeds/f-dpsk-masstransportationauthorityflint "Transitland • Mass Transportation Authority Flint • GTFS feed")) MapFlint is useful for parks, economic, environment, health, demographic, and other civic layers; its parks map includes amenities and bus-route context, and its broader platform is explicitly public and source-diverse. ([MapFlint -](https://www.mapflint.org/ "MapFlint Home - MapFlint")) ([MapFlint -](https://www.mapflint.org/?page_id=230 "Maps - MapFlint"))

The model ladder should go in this order.

First, build boring baselines: seasonal naive, Poisson or negative binomial regression, zero-inflated Poisson, and LightGBM/XGBoost with spatial features. This gives you a “don’t fool yourself” floor.

Second, run TimesFM on aggregated corridor or ward crash series. Use it for trend forecasts and uncertainty bands, not fine road-segment predictions.

Third, run a basic ST-GNN such as STGCN, DCRNN, T-GCN, or an attention-based variant using PyTorch Geometric Temporal or Torch Spatiotemporal.

Fourth, if the basic ST-GNN works, add a zero-inflated or Tweedie-style probabilistic head inspired by the road-level crash paper. This matters because crash data will be mostly zeros with rare high-severity events.

Fifth, expose it in the UI as a cautious risk layer: “historical burden,” “recent trend,” “modeled future risk,” and “uncertainty.” Keep those visually distinct.

## What TimesFM is best for here

TimesFM should not be the core road-segment crash model. It does not know Flint’s road topology. Use it where the data is naturally a time series.

Good TimesFM tasks: monthly crash burden by corridor, pedestrian crash trend by ward, demolition pace by neighborhood, health-resource counts over time, historical newspaper/event intensity by decade, source freshness decay, and maybe “data attention needed” forecasts. Google says TimesFM can provide out-of-the-box forecasts on unseen time series without training, which is exactly why it is useful as a fast experimental layer. ([Google Research](https://research.google/blog/a-decoder-only-foundation-model-for-time-series-forecasting/ "A decoder-only foundation model for time-series forecasting"))

But I would compare it against Chronos, TimeGPT, and Moirai rather than assuming TimesFM wins. Amazon’s Chronos-2 is described as a 120M-parameter time-series foundation model for zero-shot forecasting that supports univariate, multivariate, and covariate-informed tasks. ([Hugging Face](https://huggingface.co/amazon/chronos-2?utm_source=chatgpt.com "amazon/chronos-2")) Nixtla’s TimeGPT docs describe it as a production-ready time-series foundation model for forecasting and anomaly detection. ([Nixtla](https://nixtla.io/docs/forecasting/timegpt_quickstart?utm_source=chatgpt.com "Quickstart (TimeGPT-1)")) Salesforce’s Moirai work describes robust zero-shot forecasting across diverse time series. ([Salesforce](https://www.salesforce.com/blog/moirai/?utm_source=chatgpt.com "Moirai: A Time Series Foundation Model for Universal ..."))

The most honest system would run a forecast benchmark page that says: naive baseline versus TimesFM versus Chronos versus Moirai versus local model. That turns the ML into accountable civic science, not model theater.

## The real post-MVP architecture

Since the MVP is already done, I would add three new rails.

The first is the **Temporal Place Registry**. This handles buildings, parcels, streets, places, and events over time. It stores “observed at,” “first seen,” “last seen,” “source,” “geometry confidence,” and “review status.”

The second is the **Street Safety Lab**. This handles crash ingestion, road-segment matching, monthly aggregation, baseline models, TimesFM forecasts, ST-GNN training, and map exports.

The third is the **Historical Memory Ingestion rail**. This handles Sanborn maps, city directories, newspapers, photos, aerial imagery, and local-history pages. It creates candidate historical places and candidate events, then sends them to review before promotion.

RQ jobs make sense here, but I would be careful about the order. Do not scrape into the graph and then “feed PostGIS after.” Instead, every source should become a raw archived artifact first. Then extraction creates candidate records. Then the spatial candidate goes to PostGIS and the provenance/claim/source relationships go to the graph. Theseus already has the right nearby machinery: native web research, WebDoc ingestion, Memgraph/MAGE, THG hot graph surfaces, spatial/spacetime/causal modules, and Context Theorem harness surfaces. Your codebase also has Redis/RQ, graph backend flags, spatial enablement, and feature-gated spacetime/code graph settings already visible in the runtime map.

The RQ rail should look conceptually like this: crawl or fetch source, archive raw artifact, extract candidate places/events/buildings, resolve addresses/geometries, score confidence, send ambiguous records to review, then promote reviewed records into PostGIS and the graph.

That keeps the atlas from becoming a haunted spreadsheet.

## Other data sources worth adding

For core civic layers, keep City of Flint GIS, MapFlint, UM-Flint GIS, Genesee County GIS, Census ACS/TIGER, and Michigan GIS Open Data high in the source registry. City of Flint GIS advertises downloads in CSV, KML, ZIP, GeoJSON, GeoTIFF, PNG, plus API links, which makes it a strong ingestion target. ([Flint GIS](https://gis.cityofflint.com/?utm_source=chatgpt.com "City of Flint GIS")) UM-Flint says the Flint Property Portal was launched in 2017 to increase access to property information and strengthen transparency/trust between residents and local government, and it also describes City of Flint GIS as a Planning Division unit for location-based decision-making and public services. ([University of Michigan-Flint](https://www.umflint.edu/gis/gis-data/ "GIS Data | University of Michigan-Flint")) Genesee County GIS has maps, precinct maps, shapefiles for precincts/commissioner districts/Flint wards, and an important disclaimer that these maps are not legal surveys, which your methodology page should echo. ([Genesee County Michigan](https://www.geneseecountymi.gov/departments/gis/maps_and_data.php "Genesee County, MI"))

For health, CDC PLACES is a strong add. CDC says current PLACES data can be accessed by county, place, census tract, and ZIP Code tabulation area. ([CDC](https://www.cdc.gov/places/index.html "PLACES: Local Data for Better Health | PLACES | CDC")) For environment, use caution with EJScreen because current access changed: Harvard’s Environmental & Energy Law Program says EPA removed EJScreen from its website and notes a reconstructed copy, while also documenting the removal and related legal challenge. ([Harvard EELP](https://eelp.law.harvard.edu/tracker/epa-added-environmental-health-indicators-to-ejscreen/ "EPA Removed EJ Screen from Its Website – Environmental and Energy Law Program")) That means environmental layers should have very explicit freshness and source-status badges.

For transportation, add MDOT road network and AADT, GVMC traffic counts, Michigan Traffic Crash Facts, Flint MTA GTFS, and perhaps sidewalk/bike/pedestrian infrastructure if you can find local data. For historic/cultural layers, add Sanborn maps, HathiTrust city directories, Flint Public Library local history resources, UM-Flint archives, OpenHistoricalMap, National Register spatial data, Land Bank demolition lists, RACER Buick City, and historical aerials.

## My recommended next sprint

I would not make the next sprint “build all ML.” I would make it **data sufficiency plus one visible model result**.

Build the Lost Flint source registry and ingest a small historical area. Build the crash road-segment dataset for 2004–2024. Create monthly segment-level crash aggregates. Join road segments to AADT, road class, wards, tracts, zoning, parks, schools, transit stops, and health-resource proximity. Then run three baselines and one TimesFM forecast on corridor-level crash burden. Only after that should the ST-GNN begin.

The first public demo after MVP could be:

Tap a road corridor. The dossier shows historical crashes, trend forecast with uncertainty, nearby civic context, source freshness, and historical vanished buildings nearby.

Tap a vanished building. The dossier shows what used to stand there, when it appears in the record, when it disappears, source evidence, confidence, and nearby present-day conditions.

That is the atlas becoming a city time machine, but with receipts.