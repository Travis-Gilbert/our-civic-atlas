# Evidence Corpus Inventory - 2026-05

This inventory is the repo-local grounding pass for
`docs/plans/atelier-real-reconstruction-plan.md` Task B. It does not claim a
live PostGIS audit: this public app checkout has no `apps/`, `crates/`, `proto/`,
or `civic_atlas_ingest/` directories. The backend and ingest truth currently
lives in sibling repos:

- `/Users/travisgilbert/Tech Dev Local/Creative/Website/our-civic-atlas-backend`
- `/Users/travisgilbert/Tech Dev Local/Creative/Website/civic-atlas-ingest`

The live database Top 20 remains an explicit follow-up because no
`DATABASE_URL` was provided in this pass, and the backend repo is already dirty
in Task A territory (`apps/graphql-server/src/schema.ts`,
`apps/graphql-server/src/grpcClient.ts`, `apps/graphql-server/src/index.ts`,
`migrations/0004_seed_carriage_town_specs.sql`, plus
`crates/rustyred-client/`).

## What Was Inspected

Current app fixtures:

- `src/data/open-flint-atlas/fixtures/osm-buildings.json`
- `src/data/open-flint-atlas/fixtures/read-model/places.json`
- `src/data/open-flint-atlas/source-registry.json`
- `public/atlas/historical/carriage-town.json`

Sibling ingest/backend seams:

- `civic_atlas_ingest/ingest_sanborn.py`
- `civic_atlas_ingest/ingest_overpass.py`
- `civic_atlas_ingest/ingest_assessor.py`
- `civic_atlas_ingest/training_corpus.py`
- `civic_atlas_ingest/building_head_pairformer.py`
- `civic_atlas_ingest/building_head_train.py`
- `our-civic-atlas-backend/migrations/0002_reconstruction_truth_schema.sql`
- `our-civic-atlas-backend/migrations/0004_seed_carriage_town_specs.sql`
- `our-civic-atlas-backend/proto/civic_atlas/v1/reconstruction_service.proto`

## Counts Available Now

| Surface | Count | Notes |
|---|---:|---|
| Public OSM building fixture rows | 21,182 | Every row has `typology_confidence`; average is 0.9681. |
| Public read-model places | 222 | 10 wards, 74 parks, 134 tracts, 2 city records, 2 corridors. |
| Public source-registry entries | 25 | Registry includes Sanborn, city directories, newspapers, aerials, demolition, historical map, National Register, roads, GTFS, and public infrastructure sources. |
| Current Lost Flint / Atelier reconstructions | 5 | All in the Carriage Town fixture. |
| Current fixture reconstruction sources | 4 unique ids | `loc:sanborn:flint:1899:s18` backs all five. |
| Backend Carriage Town seed artifacts | 3 | Two `archival_photo`, one `map`; all manually seeded. |
| Ingest training batches checked in | 1 | Assessor smoke batch only, 2 records, 2026-05-23. |
| Local generated GLB validation assets | 400 GLB + 400 IFC | Phase A.5 validation artifacts in the ingest sibling repo. |
| Trained Pairformer checkpoint | 0 production | Only a smoke pretrain artifact exists. |

## Source-Type Coverage

Public registry coverage is broad, but executable corpus coverage is still
thin.

| Source family | Registry present | Ingest module present | Checked-in corpus rows | Backend artifact rows | Notes |
|---|---:|---:|---:|---:|---|
| OSM building footprints | yes | yes | 0 checked-in Overpass batches | 0 artifact rows found in seed | App fixture has 21,182 buildings; ingest can fetch/write TrainingCorpusRecord batches. |
| Assessor / parcel data | yes | yes | 2 smoke rows | 0 seed rows | Owner/payor fields are stripped in ingest; public-source extraction exists but is still smoke scale. |
| Sanborn maps | yes | yes | 0 real checked-in Sanborn batches | 1 seeded map artifact | Full local sheet path exists: color decode, vectorize, georef, OCR story count, emit per-polygon TrainingCorpusRecord. |
| Photographs | yes | no dedicated ingest path found | 0 | 2 seeded archival photo artifacts | Seeded placeholders exist for Whaley and storefront photos; production photo ingest is missing. |
| City directories | yes | no dedicated ingest path found | 0 | 0 | Registry has HathiTrust directories, but no OCR/ingest module was found. |
| Newspapers | yes | no dedicated ingest path found | 0 | 0 | Registry has newspaper sources, but no reconstruction corpus path was found. |
| Plat maps / HABS | partial | no dedicated ingest path found | 0 | HABS represented by seeded citation only | HABS appears in fixture source ids, not as a structured corpus lane. |

## Reconstruction Depth In The Current Fixture

The current public fixture is useful for UI proof, not for Task C selection.
No fixture building has the required three source types or multi-decade source
coverage.

| Building | Civic object id | Source count | Source ids | Lifespan |
|---|---|---:|---|---|
| Whaley House (1885) | `building:carriage-town:1` | 2 | `habs:mi-318`, `loc:sanborn:flint:1899:s18` | 1885 to current |
| 628 E Kearsley Frame House | `building:carriage-town:2` | 1 | `loc:sanborn:flint:1899:s18` | 1892 to current |
| Carriage Town Storefront | `building:carriage-town:3` | 2 | `sloan:storefront-1925`, `loc:sanborn:flint:1899:s18` | 1905 to 1968 |
| Worker's Cottage (1898) | `building:carriage-town:4` | 1 | `loc:sanborn:flint:1899:s18` | 1898 to 1962 |
| Stockton House (1872) | `building:carriage-town:5` | 2 | `loc:sanborn:flint:1899:s18`, `genesee:stockton-genealogy` | 1872 to 1955 |

## Top 20 Parcel List Status

The requested Top 20 by evidence depth cannot be honestly produced from the
public app fixture. The app fixture has buildings and source ids, but not a
PostGIS `artifact_anchors` join across parcels, buildings, source types, and
decades.

Current known candidates, ranked by fixture source count:

| Rank | Candidate | Count | Status |
|---:|---|---:|---|
| 1 | Whaley House (1885) | 2 source ids | Not a Task C pilot because it still stands. |
| 2 | Carriage Town Storefront | 2 source ids | Lost-building candidate, but only map + photo in current fixture. |
| 3 | Stockton House (1872) | 2 source ids | Lost-building candidate, but no checked-in photo or directory row. |
| 4 | 628 E Kearsley Frame House | 1 source id | UI fixture only. |
| 5 | Worker's Cottage (1898) | 1 source id | UI fixture only. |
| 6-20 | Pending live PostGIS inventory | 0 verified in this pass | Requires the SQL below against the backend database. |

## SQL For The Real Top 20

Run this in `our-civic-atlas-backend` after migrations and the corpus seed are
loaded. It adapts the downloaded plan's generic queries to the current backend
schema.

```sql
SELECT a.source_type, COUNT(*) AS artifact_count
FROM artifacts a
JOIN tenants t ON t.id = a.tenant_id
WHERE t.slug = 'flint'
GROUP BY a.source_type
ORDER BY artifact_count DESC;

SELECT
  COALESCE(p.parcel_key, b.civic_object_id) AS parcel_or_building,
  COUNT(DISTINCT a.source_type) AS source_type_count,
  COUNT(DISTINCT a.artifact_key) AS artifact_count,
  COUNT(*) FILTER (WHERE aa.anchor_kind = 'cartographic') AS map_anchors,
  COUNT(*) FILTER (WHERE aa.anchor_kind = 'photographic') AS photo_anchors
FROM artifact_anchors aa
JOIN artifacts a
  ON a.tenant_id = aa.tenant_id
 AND a.id = aa.artifact_id
LEFT JOIN buildings b
  ON b.tenant_id = aa.tenant_id
 AND b.id = aa.building_id
LEFT JOIN parcels p
  ON p.tenant_id = aa.tenant_id
 AND p.id = COALESCE(aa.parcel_id, b.parcel_id)
JOIN tenants t ON t.id = aa.tenant_id
WHERE t.slug = 'flint'
GROUP BY COALESCE(p.parcel_key, b.civic_object_id)
ORDER BY source_type_count DESC, artifact_count DESC, parcel_or_building
LIMIT 20;

SELECT
  COALESCE(p.parcel_key, b.civic_object_id) AS parcel_or_building,
  MIN((a.payload_jsonb->>'year')::int) AS earliest_year,
  MAX((a.payload_jsonb->>'year')::int) AS latest_year,
  COUNT(DISTINCT ((a.payload_jsonb->>'year')::int / 10) * 10) AS decade_count
FROM artifact_anchors aa
JOIN artifacts a
  ON a.tenant_id = aa.tenant_id
 AND a.id = aa.artifact_id
LEFT JOIN buildings b
  ON b.tenant_id = aa.tenant_id
 AND b.id = aa.building_id
LEFT JOIN parcels p
  ON p.tenant_id = aa.tenant_id
 AND p.id = COALESCE(aa.parcel_id, b.parcel_id)
JOIN tenants t ON t.id = aa.tenant_id
WHERE t.slug = 'flint'
  AND a.payload_jsonb ? 'year'
GROUP BY COALESCE(p.parcel_key, b.civic_object_id)
HAVING COUNT(DISTINCT ((a.payload_jsonb->>'year')::int / 10) * 10) >= 2
ORDER BY decade_count DESC, parcel_or_building
LIMIT 20;
```

## Gap Analysis

- Sanborn polygon ingest is structurally ready, but no real Sanborn
  per-polygon batch is checked in. The only Sanborn runtime artifact found is a
  synthetic smoke sheet.
- OSM coverage is broad in the public app fixture, but OSM alone is not enough
  for historical reconstruction or Pairformer labels.
- Assessor ingest can strip private fields and emit a typed corpus record, but
  the checked-in assessor corpus has only two smoke rows.
- Photo, directory, HABS, newspaper, and plat-map lanes are source-registry
  concepts today, not executable training-corpus lanes.
- The backend truth schema can store artifacts, artifact anchors, immutable
  reconstruction specs, building parts, generated assets, and an outbox, but
  this pass did not verify a live seeded PostGIS instance.

## Recommendations

| Recommendation | Effort class | Why |
|---|---|---|
| Run a live PostGIS inventory against `artifacts`, `artifact_anchors`, `buildings`, and `parcels`. | small | It immediately decides the real Task C pilot list. |
| Decode at least one real Flint Sanborn sheet through `ingest_local_sheet` and commit the manifest, not raw private scans. | medium | This proves the source->polygon->training-record path beyond smoke data. |
| Add a city-directory OCR ingest path that emits `ground_floor.use_type` and address/year fields. | medium | Ground-floor use is one of the Pairformer heads and is absent today. |
| Add a photo/HABS artifact ingest path with source-use notes and artifact anchors. | medium | Task C needs photo-backed facade claims, not only map footprints. |
| Promote the Carriage Town Storefront as the first likely lost-building UI pilot after it gains a directory row and one more time slice. | small | It is already demolished in the fixture and has map + photo support. |
| Keep Whaley House as a calibration/control building, not the demo pilot. | small | It still stands, which makes it valuable for comparison but poor as the public "lost building" proof. |
