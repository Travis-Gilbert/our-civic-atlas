// Open Flint Atlas provenance graph sample.
// Fixture only: do not treat as a canonical Memgraph writeback.
CREATE CONSTRAINT ON (n:Source) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT ON (n:Dataset) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT ON (n:Place) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT ON (n:MetricRecord) ASSERT n.id IS UNIQUE;
CREATE CONSTRAINT ON (n:Claim) ASSERT n.id IS UNIQUE;

MERGE (n:Source {id: "city_of_flint_gis"})
SET n += {id: "city_of_flint_gis", name: "City of Flint GIS", homepage_url: "https://gis.cityofflint.com/", trust_tier: "official_spatial", public_use: "public_source_with_terms_review_required", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "mixed"};
MERGE (n:Source {id: "um_flint_gis_center"})
SET n += {id: "um_flint_gis_center", name: "University of Michigan-Flint GIS Center Data", homepage_url: "https://www.umflint.edu/gis/gis-data/", trust_tier: "curated_public_reference", public_use: "public_catalog_with_request_workflow", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "unknown_per_layer_until_downloaded"};
MERGE (n:Source {id: "flint_property_portal"})
SET n += {id: "flint_property_portal", name: "Flint Property Portal", homepage_url: "https://flintpropertyportal.com/", trust_tier: "legacy_public_reference", public_use: "do_not_scrape_until_terms_reviewed", contains_personal_data: true, last_checked: "2026-05-11", source_update_label: "stale_or_unverified"};
MERGE (n:Source {id: "mapflint"})
SET n += {id: "mapflint", name: "MapFlint", homepage_url: "https://www.mapflint.org/?page_id=230", trust_tier: "curated_public_reference", public_use: "public_source_with_terms_review_required", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "historical_context"};
MERGE (n:Source {id: "michigan_traffic_crash_facts"})
SET n += {id: "michigan_traffic_crash_facts", name: "Michigan Traffic Crash Facts", homepage_url: "https://www.michigantrafficcrashfacts.org/", trust_tier: "official_statistical", public_use: "public_query_tool_with_terms_review_required", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "annual_official_closed_dataset"};
MERGE (n:Source {id: "cdc_places_tract_2025"})
SET n += {id: "cdc_places_tract_2025", name: "CDC PLACES Census Tract Data 2025 Release", homepage_url: "https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Census-Tract-D/cwsq-ngmh", trust_tier: "official_statistical", public_use: "public_open_data", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "official_statistical_release_with_model_years"};
MERGE (n:Source {id: "census_acs_tiger"})
SET n += {id: "census_acs_tiger", name: "U.S. Census ACS and TIGER/Line", homepage_url: "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html", trust_tier: "official_statistical", public_use: "public_open_data", contains_personal_data: false, last_checked: "2026-05-11", source_update_label: "official_geometry_2025_and_acs_2024"};
MERGE (n:Source {id: "genesee_county_gis"})
SET n += {id: "genesee_county_gis", name: "Genesee County GIS", homepage_url: "https://www.gc4me.com/", trust_tier: "official_spatial", public_use: "public_source_with_terms_review_required", contains_personal_data: true, last_checked: "2026-05-11", source_update_label: "unknown_until_manual_review"};
MERGE (n:Dataset {id: "dataset:city_of_flint_gis:places"})
SET n += {id: "dataset:city_of_flint_gis:places", source_id: "city_of_flint_gis", category: "places", title: "Public place geometry/reference read model", status: "public_read_model_fixture"};
MERGE (n:Place {id: "ward:1"})
SET n += {id: "ward:1", name: "Ward 1", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 1};
MERGE (n:Place {id: "ward:2"})
SET n += {id: "ward:2", name: "Ward 2", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 2};
MERGE (n:Place {id: "ward:3"})
SET n += {id: "ward:3", name: "Ward 3", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 3};
MERGE (n:Place {id: "ward:4"})
SET n += {id: "ward:4", name: "Ward 4", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 4};
MERGE (n:Place {id: "ward:5"})
SET n += {id: "ward:5", name: "Ward 5", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 5};
MERGE (n:Place {id: "ward:6"})
SET n += {id: "ward:6", name: "Ward 6", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 6};
MERGE (n:Place {id: "ward:7"})
SET n += {id: "ward:7", name: "Ward 7", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 7};
MERGE (n:Place {id: "ward:8"})
SET n += {id: "ward:8", name: "Ward 8", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 8};
MERGE (n:Place {id: "ward:9"})
SET n += {id: "ward:9", name: "Ward 9", place_type: "ward", privacy_class: "public_boundary", geometry_ref: "places.geojson", ward_number: 9};
MERGE (n:Place {id: "park:8"})
SET n += {id: "park:8", name: "Aldrich Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:65"})
SET n += {id: "park:65", name: "Amos Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:61"})
SET n += {id: "park:61", name: "Atherton Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:1"})
SET n += {id: "park:1", name: "Atwood Stadium", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:9"})
SET n += {id: "park:9", name: "Ballenger Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:10"})
SET n += {id: "park:10", name: "Bassett Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:11"})
SET n += {id: "park:11", name: "Berston Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:14"})
SET n += {id: "park:14", name: "Brennan Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:15"})
SET n += {id: "park:15", name: "Broome Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:74"})
SET n += {id: "park:74", name: "Bundy Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:13"})
SET n += {id: "park:13", name: "Burroughs Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};
MERGE (n:Place {id: "park:16"})
SET n += {id: "park:16", name: "Clara Hilborn Park", place_type: "park", privacy_class: "public_resource", geometry_ref: "places.geojson"};

MATCH (a {id: "city_of_flint_gis"}), (b {id: "dataset:city_of_flint_gis:places"}) MERGE (a)-[:PUBLISHES]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:1"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:2"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:3"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:4"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:5"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:6"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:7"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:8"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "ward:9"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:8"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:65"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:61"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:1"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:9"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:10"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:11"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:14"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:15"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:74"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:13"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
MATCH (a {id: "dataset:city_of_flint_gis:places"}), (b {id: "park:16"}) MERGE (a)-[:DESCRIBES_PLACE]->(b);
