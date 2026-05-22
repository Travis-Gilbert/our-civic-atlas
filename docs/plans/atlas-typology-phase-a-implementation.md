# Phase A Typology — Implementation Plan (Ray/RunPod track)

Generated 2026-05-22 at the end of the orchestrated cleanup session
that landed:

- `af31b2c` — hash-modulo classifier replaced with honest unknown bucket
- `c3c3acb` — sketch-model render default + flat dynamic-island panels
- `1270b57` — envelope-chip legend re-homed to Layers
- `fbb1872` — Phase A `typology_class` / `typology_confidence` hooks
- `efa3e12` — Phase A `parcel_front_bearing_degrees` hook

This plan supersedes [docs/plans/building-typology-phase-a-plan.md](building-typology-phase-a-plan.md)
in two specific places: (1) Ray on RunPod replaces Modal as the training
target, per user direction during the 2026-05-22 cleanup session;
(2) the frontend integration surface is fully described and already
shipping — the backend track is now the only blocker.

The authoritative source spec remains `SPEC-PHASE-A-TYPOLOGY.md`
(`~/Downloads/`, user-supplied).

## What's already done (frontend, shipped to main)

The `(2026-05-22) frontend cleanup` session built every render-side
contract Phase A needs. The Phase A backend can land without any
frontend changes:

| Hook | Where | Status |
|---|---|---|
| `OsmBuildingProperties.typology_class` | `src/lib/atlas/urban-design-model.ts` | optional field, null until backend writes it |
| `OsmBuildingProperties.typology_confidence` | same | optional field, null until backend writes it |
| `OsmBuildingProperties.parcel_front_bearing_degrees` | same | optional field, null until backend writes it |
| `UrbanDesignModelProperties.typology_class` / `typology_confidence` | same | populated per-feature by the factory |
| `BuildingFabricInput.parcelFrontBearingDegrees` | `src/lib/atlas/building-fabric.ts` | preferred over `longestEdgeBearingDegrees` when present |
| `applyFabricCompletenessAlpha` consults both completeness + typology confidence | `src/components/atlas/AtlasMap.tsx` | renders low-confidence buildings with the uncertainty signal |
| `URBAN_FORM_FILL["unknown"]` paper-faint entry | `src/components/atlas/AtlasMap.tsx` | exhaustive Record forces unknown coverage |
| Sketch-model default + chipboard palette | `src/components/atlas/OpenFlintAtlasScene.tsx`, `AtlasMap.tsx` | renders honestly when typology data is absent |

The frontend is *ready to consume* the backend's output. The remaining
work is entirely on the ingest + storage + delivery side.

## What changed from the original Phase A plan

| Original plan | This plan | Why |
|---|---|---|
| Modal for batch training + inference | Ray on RunPod | User direction during cleanup session; existing `civic-atlas-ingest` repo is already Ray-native (`ray[serve,train]>=2.35` in pyproject.toml) and has a `ray_cluster/` directory plus `scripts/check_ray_migration.py` already in the codebase |
| LightGBM only | LightGBM + scikit-learn isotonic calibration + pandera schema validation, all on Ray | Spec §1 unchanged; the Ray container hosts the same library stack |
| Render channel as R3F | Render channel as deck.gl + MapLibre (this repo's actual public route) | The original spec assumed an R3F path that was deprecated; the frontend hooks are wired into the deck.gl path that ships at `flint.ourcivicatlas.org` |
| Modal S3 endpoint | RunPod object storage OR keep the existing `s3://civic-atlas/` bucket | Backend implementation decision, not a spec change |

Nothing else in the spec changes.

## Module layout (`civic-atlas-ingest`)

Mirroring the spec §5 module layout:

```
civic_atlas_ingest/
  typology_schema.py        # Pydantic + pandera schemas, TypologyClass Enum
  typology_features.py      # OSM ingest + parcel join + Shapely + OSMnx feature extraction
  typology_labels.py        # validation set loading + active-learning hooks
  typology_train.py         # Ray Train + LightGBM training, Ray Tune for HPs
  typology_infer.py         # Ray batch inference, writes building_typology rows
  typology_eval.py          # confusion matrix, calibration plot, per-ward stratification
```

Each module is scaffolded with concrete Pydantic models, docstrings,
function signatures, and `NotImplementedError` bodies. Scaffolds raise
loudly when called — they don't fake success, which would be the same
class of lie the frontend cleanup eliminated.

## Build order (A1–A10)

The spec's A1–A10 order remains binding. Status per step:

| Step | Module | Status |
|---|---|---|
| A1 | `typology_schema.py` Pydantic + pandera + Enum | **scaffold** (this session) |
| A2 | `typology_features.py` OSM ingest + parcel join + Shapely features | **scaffold** (this session) |
| A3 | Hand-label 200 buildings (QGIS or web tool against `validation_set.geojson`) | **HUMAN — not scaffoldable**. See §Human-required tasks below |
| A4 | `typology_train.py` LightGBM + Ray Tune | **scaffold** (this session). Implementation needs A3 first |
| A5 | Calibration (isotonic regression on validation set) | **deferred** — depends on A4 + A3 |
| A6 | `typology_infer.py` Ray batch inference + PostGIS write | **scaffold** (this session). Implementation needs A4 + A5 first |
| A7 | Backend GraphQL field on Building type | **deferred** — depends on A6. Implementation lives in `our-civic-atlas-backend` |
| A8 | R3F (here: deck.gl) material wired to typology | **DONE** in frontend cleanup session |
| A9 | LOD aggregation (block-level at zoom < 14) | **DONE** in frontend (via `BUILDING_FABRIC_LOD` constants in `src/lib/atlas/building-fabric.ts`) |
| A10 | Layer panel toggle | **DONE** in frontend (mode select in Layers > Urban Design Model preset) |

Net: A1, A2 scaffolded for follow-on implementation; A3 needs human
labeling work; A4–A6 follow A3; A7 follows A6; A8–A10 are done.

## Human-required tasks

These are not scaffoldable. They block A4 (training) until completed.

### A3-task-1: Hand-label 200 Flint buildings stratified across all 9 wards

- 200 buildings minimum; spec §10 MUST: "Validation set is held back from training, never leaked"
- Stratification: at least 15 buildings per ward (135 across 9 wards), remaining 65 distributed by typology guess to ensure all 6 classes are represented
- Tool: QGIS recommended (loads `osm-buildings.json` + a basemap; right-click a polygon, assign `typology_class` and `typology_confidence_human` from a fixed enum)
- Output: `packs/us/mi/flint/typology/validation_set.geojson` (committed to `civic-atlas-ingest`)
- Spot-check: the 6-class taxonomy from spec §2 (residential, commercial, industrial, civic, mixed_use, unknown). A label of `unknown` is valid when the human can't tell either

### A3-task-2: Capture Flint zoning GeoJSON URL

- City of Flint zoning layer download URL (stable)
- Field documenting which property carries the zoning code per parcel
- Genesee County parcel layer as fallback
- Captured in: `civic-atlas-ingest/docs/data-sources.md` (new file; create if missing)

### A3-task-3: Confirm OSM extract location

- Verify `s3://civic-atlas/...` contains the Flint OSM building extract referenced by `ingest_overpass.py`
- If absent, regenerate via Overpass: documented in `civic-atlas-ingest/civic_atlas_ingest/ingest_overpass.py`

These three tasks together unblock A4. None can be done by an
automated agent.

## Ray on RunPod — infra notes

The `civic-atlas-ingest` repo is already Ray-native. The migration from
Modal to RunPod is mostly env-var + entrypoint changes:

- Existing: `ray_cluster/` directory and `scripts/check_ray_migration.py` (already check this in)
- RunPod cutover: confirm RunPod pod template includes `ray[serve,train]>=2.35`, `lightgbm>=4`, `scikit-learn>=1.4`, `pandera>=0.20`, plus the existing `civic-atlas-ingest` dependency stack
- Training entrypoint: `python -m civic_atlas_ingest.typology_train --city-pack us/mi/flint --validation-frac 0.2`
- Batch inference entrypoint: `python -m civic_atlas_ingest.typology_infer --city-pack us/mi/flint --model-version <sha>`
- Output paths: keep `s3://civic-atlas/` for now (compatible with existing tooling); RunPod's S3-compatible storage is a follow-on optimization

## Dependencies to add (`civic-atlas-ingest/pyproject.toml`)

The Phase A typology stack needs:

```toml
[project.optional-dependencies]
typology = [
    "lightgbm>=4.0",
    "scikit-learn>=1.4",
    "pandera>=0.20",
    "pydantic>=2.0",
    "duckdb>=0.10",
]
```

The base `civic-atlas-ingest` already includes GeoPandas, Shapely,
OSMnx, Ray, and boto3 — the spec's full Open Source Stack is one
optional-extras block away.

## Storage (PostGIS)

The spec §7 PostGIS table:

```sql
CREATE TABLE building_typology (
  osm_id BIGINT NOT NULL,
  geom GEOMETRY(Polygon, 4326) NOT NULL,
  typology_class TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  per_class_proba JSONB NOT NULL,
  feature_completeness FLOAT NOT NULL,
  model_version TEXT NOT NULL,
  features_hash TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  city_pack TEXT NOT NULL,
  PRIMARY KEY (osm_id, model_version, city_pack)
);
CREATE INDEX ON building_typology USING GIST (geom);
CREATE INDEX ON building_typology (typology_class, city_pack);
CREATE INDEX ON building_typology (city_pack, computed_at DESC);
```

This table lives in `our-civic-atlas-backend`. A migration adding it
needs `tenant_id` as well per the backend's tenant-scoped-RLS
convention (see the `Service-Tier Auth Stays Server-Side` rule in
this repo's `CLAUDE.md`).

## GraphQL exposure

`Building` type in the backend gains a `typology` field:

```graphql
type Building {
  osmId: ID!
  geom: GeoJSON!
  # … existing fields …
  typology: BuildingTypology
}

type BuildingTypology {
  class: TypologyClass!
  confidence: Float!
  perClassProba: TypologyProbaMap!
  featureCompleteness: Float!
  modelVersion: String!
  computedAt: DateTime!
}

enum TypologyClass {
  RESIDENTIAL
  COMMERCIAL
  INDUSTRIAL
  CIVIC
  MIXED_USE
  UNKNOWN
}
```

The resolver reads the most recent `building_typology` row for the
matching `(osm_id, city_pack)` pair and the active `model_version`
pointer for that pack.

## Frontend integration (post-backend)

Once the GraphQL field is live, the OSM source data fetched by
`scripts/fetch-osm-buildings.mjs` (or its replacement) enriches each
feature's properties with:

```ts
{
  osm_id: 12345,
  // … existing OSM tags …
  typology_class: "commercial",
  typology_confidence: 0.83,
  parcel_front_bearing_degrees: 178.4,  // when the parcel-edge classifier ran
}
```

No frontend code change required — the hooks are wired (see "What's
already done").

## City pack

Versioned artifact directory:

```
civic-atlas-ingest/city_packs/us/mi/flint/typology/
  classifier.lgb            # serialized LightGBM model
  calibrator.pkl            # isotonic regression
  feature_spec.yaml         # versioned feature definitions
  class_map.yaml            # class ID → render color, description
  validation_set.geojson    # 200+ hand-labeled buildings
  parcel_zoning.parquet     # snapshot at training time
  metadata.json             # training run, sha, metrics, dataset hash
```

Every retrain bumps `model_version`, writes a new artifact set, and
updates the active-pointer.

## Acceptance / Done definition

From spec §11:

- Every Flint OSM building has a row in `building_typology` with class + confidence
- `flint.ourcivicatlas.org` renders buildings in 6-color typology when the user opts in via the Layers > Urban Design Model > Mode dropdown (currently defaults to "sketch model")
- Block-level LOD at zoom < 14 (already implemented frontend-side)
- Low-confidence buildings render with the uncertainty signal (already wired)
- Validation set macro f1 >= 0.75
- City pack committed to `civic-atlas-ingest`
- Documentation in `civic-atlas-ingest/docs/typology.md`

## Risk + non-goals

- Generalization beyond Flint is a follow-up. The classifier is trained on Flint zoning, Flint parcels, Flint OSM. Other cities need their own city packs.
- Active learning is a stretch goal in spec §4. Initial release uses passive labeled-set training only.
- The classifier is interpretable (LightGBM, not a neural net) per spec §1.
- The promotion pipeline / per-class probability surface in the UI (hover tooltip showing "62% commercial, 31% mixed_use, 7% other") is a follow-up. Initial release exposes class + confidence only.

## Cross-repo coordination

This plan touches three repos:

- `Open-Flint-Atlas-main-release` (this repo) — frontend, plan doc. **Status: DONE for Phase A**.
- `civic-atlas-ingest` — ingest + training + inference. **Status: scaffolded this session; implementation pending human-required tasks A3-task-1..3**.
- `our-civic-atlas-backend` — PostGIS migration + GraphQL resolver. **Status: not started; depends on a model_version pointer + city pack existing**.

When implementation begins, the order is: complete A3-task-1..3 →
A4 in `civic-atlas-ingest` → A5–A6 there → A7 in
`our-civic-atlas-backend` → confirm flint.ourcivicatlas.org renders
the typology overlay end-to-end.

## What this session shipped

- Plan document (this file)
- `civic_atlas_ingest/typology_schema.py` — Pydantic models + Enum + pandera schema with NotImplementedError bodies for the constructors that need real values
- `civic_atlas_ingest/typology_features.py` — feature extraction function signatures + docstrings
- `civic_atlas_ingest/typology_labels.py` — validation set loader signature
- `civic_atlas_ingest/typology_train.py` — Ray Train + LightGBM training entrypoint signature
- `civic_atlas_ingest/typology_infer.py` — Ray batch inference entrypoint signature
- `civic_atlas_ingest/typology_eval.py` — evaluation signature
- `pyproject.toml` — `typology` optional dependencies block (LightGBM, scikit-learn, pandera, pydantic, duckdb)
- `tests/test_typology_schema.py` — sanity test that the schema round-trips through Pydantic JSON

The scaffolds raise `NotImplementedError` when functionality is invoked
without a real implementation. No silent stubs. No mock data.

## Estimated effort to ship Phase A end-to-end

Not given. Per project CLAUDE.md: "No time estimates, ever." What CAN
be said: A4 (training) cannot start until A3-task-1 (hand-labeled
validation set) is in. A4 + A5 + A6 are one focused session apiece
on the Ray pod, assuming the validation set is the bottleneck-limiting
input. A7 is a separate session in the backend repo.
