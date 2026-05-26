# Evidence Corpus Inventory - 2026-05

This inventory is the grounding pass for
`docs/plans/atelier-real-reconstruction-plan.md` Task B. It combines a
repo-local audit of the public app fixtures and the sibling backend / ingest
checkouts with a live PostGIS audit run on 2026-05-26 against the production
Civic-Atlas Postgres (Railway, tenant slug `flint`). The backend and ingest
truth lives in sibling repos:

- `/Users/travisgilbert/Tech Dev Local/Creative/Website/our-civic-atlas-backend`
- `/Users/travisgilbert/Tech Dev Local/Creative/Website/civic-atlas-ingest`

The live PostGIS audit is now resolved (see "Verified against live PostGIS on
2026-05-26" below). It confirms the smoke-corpus reading the rest of this
document predicted from indirect evidence.

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

### Verified against live PostGIS on 2026-05-26

The queries below were run against the production Civic-Atlas Postgres
(Railway, tenant slug `flint`, tenant id `a192a67b-b32d-4100-bfe6-000a0b3b94f7`).
RLS requires `SET app.tenant_id = '...'` before each session. Live results:

| Surface | Count |
|---|---:|
| Parcels (tenant flint) | 5 |
| Buildings (tenant flint) | 5 |
| Artifact anchors (tenant flint) | 7 (5 cartographic, 2 photographic) |
| Reconstruction specs (tenant flint) | 5 |
| Artifacts (tenant flint) | 3 |

Artifact source-type counts (Q1):

| Source type | Count |
|---|---:|
| `archival_photo` | 2 |
| `map` | 1 |

The "Top 20" is the entire corpus: there are only five eligible parcels.

| Rank | Parcel key | Source types | Distinct artifacts | Map anchors | Photo anchors |
|---:|---|---:|---:|---:|---:|
| 1 | carriage-town:1 (Whaley House) | 2 | 2 | 1 | 1 |
| 2 | carriage-town:3 (Carriage Town Storefront) | 2 | 2 | 1 | 1 |
| 3 | carriage-town:2 (628 E Kearsley Frame House) | 1 | 1 | 1 | 0 |
| 4 | carriage-town:4 (Worker's Cottage) | 1 | 1 | 1 | 0 |
| 5 | carriage-town:5 (Stockton House) | 1 | 1 | 1 | 0 |

The decade-coverage query (Q3) returned 0 rows. `artifacts.payload_jsonb` is
empty `{}` on every seeded row, and `artifact_anchors.t_start_ms` /
`t_end_ms` are NULL on every anchor. Temporal grounding is not yet
expressed in the live schema, so cross-decade joins return nothing.

### Implications for downstream tasks

- **Task C (Carriage Town Storefront pilot):** the pilot building has
  exactly two artifacts attached (`artifact:carriage-sanborn-1899` and
  `artifact:storefront-photo-1925`). Promotion through the Research tab
  is the canonical way to grow this row beyond 2 artifacts in dev. The
  resident-first research path is now the unblock for additional
  evidence rather than a manual ingest queue.
- **Task D (Pairformer training plan):** the corpus is two orders of
  magnitude smaller than the doc's 500 minimum, and decade/typology
  signals are not populated. Task D in its first form ("scope the
  training run") cannot land; convert it to the doc's contingency form
  ("scope the corpus expansion needed before training is viable") and
  use this inventory as the starting baseline.
- **Engine pipeline:** five reconstruction_specs exist but no live
  artifact has temporal payload. The `merge_evidence_prior` stage will
  not be able to weight by recency until ingest backfills `t_start_ms`,
  `t_end_ms`, and per-artifact `payload_jsonb.year`.

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
- The backend truth schema is verified live (5 parcels, 5 buildings,
  7 artifact_anchors, 5 reconstruction_specs, 3 artifacts as of
  2026-05-26). The store works; the corpus inside it is smoke scale.
- `artifacts.payload_jsonb` is empty `{}` and `artifact_anchors.t_start_ms` /
  `t_end_ms` are NULL on every seeded row. Temporal grounding is not yet
  expressed, so decade-coverage queries return 0 and any engine stage that
  weights by recency degrades gracefully to "all evidence equally recent."
- The atelier's promote-research-to-artifact UI (shipped 2026-05-25 in
  commits `e2026ae` and `c4b5814`) is now the resident-facing path that
  grows artifact rows beyond the 3 seeded ones, gated on a selected
  building so every promotion ships a real `artifact_anchors` row with
  a `parcel_id` / `building_id` and a POINT WKT geometry.

## Recommendations

| Recommendation | Effort class | Why |
|---|---|---|
| ~~Run a live PostGIS inventory against `artifacts`, `artifact_anchors`, `buildings`, and `parcels`.~~ Done 2026-05-26. | done | Live results captured in the "Verified against live PostGIS on 2026-05-26" section above. |
| Decode at least one real Flint Sanborn sheet through `ingest_local_sheet` and commit the manifest, not raw private scans. | medium | This proves the source->polygon->training-record path beyond smoke data. |
| Add a city-directory OCR ingest path that emits `ground_floor.use_type` and address/year fields. | medium | Ground-floor use is one of the Pairformer heads and is absent today. |
| Add a photo/HABS artifact ingest path with source-use notes and artifact anchors. | medium | Task C needs photo-backed facade claims, not only map footprints. |
| Promote the Carriage Town Storefront as the first lost-building UI pilot. | small | It is already demolished in the fixture and has map + photo support; use the Research tab to find and promote the missing directory/use evidence instead of waiting on a manual ingest lane. |
| Keep Whaley House as a calibration/control building, not the demo pilot. | small | It still stands, which makes it valuable for comparison but poor as the public "lost building" proof. |
| Backfill `artifacts.payload_jsonb.year` and `artifact_anchors.t_start_ms` / `t_end_ms` on the 3 seed rows. | small | Without these, the engine's recency-weighted merge has no temporal signal to weight by, and the decade-coverage query stays empty. The Sanborn sheet's 1899 date and the photo dates (1908, 1925) are already in the artifact titles and migration seed `0004_seed_carriage_town_specs.sql`; copying them into payload+anchor fields is mechanical. |
| Convert Task D from "scope the training run" to "scope the corpus expansion needed before training is viable." | small | The live PostGIS corpus is 3 artifacts. The Pairformer plan's 500 minimum is two orders of magnitude away. The first useful Task D deliverable is the ingest-and-promotion roadmap that gets the corpus to viable scale, not the training run itself. |
