# Track 2 — Procedural Reconstruction Maturation Audit

Generated 2026-05-23 during the Phase A.5 glTF pipeline session, after
the Phase B Blender→glTF pipeline was confirmed operational. This is
the audit pass requested at the end of the session before moving to
Carriage Town hand-walk validation (#4).

Three audits below (#1–#3); #4 follows in a separate session and
this report ends with the open prerequisites for it.

## #1 — Stub audit on the four reconstruction-engine interfaces

**Result: all four interfaces have real concrete implementations,
zero NotImplementedError stubs.**

The interfaces live in
`our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs`
(3,325 lines, single Rust crate).

| Interface | Production impl | Dev/test impl | Status |
|---|---|---|---|
| `EvidenceRepository` | `PostgisRepository` (line 1188-1311) | `InMemoryRepository` (line 2387-2410) | Real, ~123 lines of SQL-backed code |
| `BlockSubgraphRepository` | `PostgisRepository` (line 1312-1830) | `InMemoryRepository` (line 2411+) | Real, ~500 lines |
| `EmbeddingProvider` | `TheseusBatchEmbeddingProvider` (line 1081-1118) | `ZeroEmbeddingProvider` (line 1044-1067, intentional fallback) | Real gRPC client to Theseus |
| `AssetGenerator` | `SceneFoundryManifestGenerator` (line 1140-1187) | — | Real, integrates with `civic_atlas_ingest.scene_foundry` |

Notes on the dev/fallback variants:

- `ZeroEmbeddingProvider` is not a stub. It explicitly tags every
  returned `NodeEmbedding` with `missing: true` and uses
  `model: "zero-spacetime-embedding"`, `model_version:
  "missing-upstream-v1"` — the same spec §10 MUST honesty pattern
  applied everywhere else in this session. Callers branch on
  `missing` rather than getting silently-wrong zero embeddings.
- `InMemoryRepository` is a test-targeted variant for unit tests; the
  Postgres impls are what production binds to.

**No work needed here.** The reconstruction engine's external
interfaces are production-shaped.

## #2 — Corpus inventory + `ingest_sanborn.py` read

**Result: `ingest_sanborn.py` is ~30% complete (skeleton, declared
as such in its docstring). The gap is engineering, not data.**

### What `ingest_sanborn.py` ships today (247 lines)

- ✓ Mapwarper API search wired (`list_sheets_for_bbox` queries
  `mapwarper.net/maps.json?bbox=...`)
- ✓ Ray task structure (`@ray.remote(num_cpus=4, memory=8 GiB)`)
- ✓ Per-sheet metadata fetch via httpx
- ✓ Training-record emission via `training_corpus.make_training_record`
- ✓ Provenance lane tagging (`ProvenanceLane.PRIMARY_ARCHIVAL` for
  Sanborn-derived fields, per spec)
- ✓ Bbox-based geometry fallback when no GeoJSON in sheet metadata

### What's still TODO (named explicitly in the docstring as "Status: skeleton")

1. **Color-key decoder** — Sanborn's standardized building-material
   colors (yellow=wood frame, pink/red=brick, blue=stone, gray=iron,
   brown=adobe). Implementation gap: ~100-200 lines (HSV color
   thresholding + connected-component labeling). Reference:
   `docs/sanborn-key.md` (TODO).
2. **OCR for story-count digits** — Sanborn polygons carry printed
   numbers indicating stories. Either Tesseract for the digit
   character or a VLM call (Claude / GPT-4V) for full
   attribute extraction. ~80 lines.
3. **Per-polygon vectorization** — current code emits ONE
   `make_training_record` per *sheet*. Needs to walk decoded raster
   → connected components → polygon extraction → per-polygon
   training records. ~150 lines using rasterio + shapely.
4. **Direct-upload loader** — current path is `Mapwarper sheet ID →
   fetch from mapwarper.net`. For locally-held Sanborn images
   (Library of Congress public-domain TIFFs, UM-Flint Center
   higher-res scans, hand-held files), needs a fallback that
   accepts a local raster + georeferencing JSON. ~50 lines.
5. **PostGIS commit path** — current return shape includes
   `"postgis_status": "not-wired"`. Needs the `BuildingPresence` +
   `ArtifactAnchor` insert against the corpus-tenant schema.
   Probably ~100 lines plus a Rust-side gRPC bridge call.
6. **`ArtifactAnchor` proto finalization** — docstring states this
   is "pending finalization" before the rest can land.

### Corpus inventory

- **Current `DecodedArtifact` row count in production DB**: zero (the
  per-polygon vectorization isn't shipping, and even sheet-level
  records aren't being committed because `commit_to_postgis` is gated
  off and returns `"postgis_status": "not-wired"`).
- **Needed for Carriage Town first-domain training pool**: ~8,000
  rows (~1000 historical buildings × 8 Sanborn editions 1885-1929).
- **Distance from zero to 8,000 rows**: ONE session of focused
  engineering work on items 1-6 above, then a Ray job submission
  to vectorize the Carriage Town sheets.

### Sanborn data acquisition is NOT the bottleneck

Earlier session framing was wrong about data being a multi-month
collection effort. Confirmed reality:

- Library of Congress has free public-domain digitized Sanborn maps
  of Flint at 1885, 1888, 1894, 1899, 1908, 1916, 1925, 1929 — 8
  editions, all downloadable.
- UM-Flint GIS Center has higher-resolution scans available on
  request (the academic data archive lane from earlier in this
  session's research).
- Property owner / project lead **lives in Carriage Town** and
  already holds Sanborn maps + parcel-to-footprint alignment data
  + parcel-separation history from prior government work.

The acquisition is upload, not transcription. The bottleneck is
engineering the ingest path to consume these inputs.

## #3 — Pairformer training-readiness check

**Result: training is gated on two parallelizable engineering pieces.
Architecture is fully built; data and training loop are skeletons.**

### What's complete

- `civic_atlas_ingest/building_head_pairformer.py` (421 lines).
  Full `CivicPairformerConfig` with shape knobs (node_dim 320,
  hidden 128, 3 layers, 4 heads); 10-relation vocabulary
  (`adjacent_to`, `fronts_street`, `same_block_as`, `anchored_by`,
  `temporal_predecessor_of`, `temporal_successor_of`, `similar_to`,
  `shares_party_wall`, `shares_setback_line`, `shares_cornice_line`);
  5 categorical decoder heads (mass_form, story_count,
  facade_material, roof_form, ground_floor_use); 3 regression heads
  (height_meters, bay_count, roof_pitch_degrees). PyTorch +
  `torch_geometric.RGCNConv`. Defensive imports for offline runs.
- `civic_atlas_ingest/training_corpus.py` (444 lines).
  `TrainingCorpusRecord` dataclass with tenant context, source
  metadata, geometry, per-field provenance lanes, coverage quality,
  archetype label, part labels, training graph subgraph. Stable
  schema version `civic-atlas-training-corpus/v1`.
- All four reconstruction-engine interfaces (audit #1 above).
- `scene_foundry.render` Ray task (Phase B, operational).

### What's a skeleton

- `civic_atlas_ingest/building_head_train.py` (144 lines).
  Docstring states "Status: skeleton. Real training loop pending
  finalization of the ReconstructionSpec part schema." Architecture
  is laid out:
  - Frozen Theseus DyGFormer encoder via gRPC bridge (matches
    `TheseusBatchEmbeddingProvider` in the Rust engine)
  - `CivicPairformerBuildingHead` over block subgraphs
  - Masked-field prediction loss weighted by `coverage_quality`
  - Two-pass training (pre-train on corpus tenant → fine-tune on
    Flint corrections)
  - S3 model output at `s3://civic-atlas/models/building_head/<version>/`
  
  Missing: the actual loss function instantiation, the optimizer
  setup, the data loader + collate, the checkpoint write loop.
  Estimated ~300-500 lines.
- `civic_atlas_ingest/building_head_infer.py` (124 lines). Similar
  shape — likely a parallel skeleton awaiting the trained model.

### Training-readiness verdict

Two engineering pieces are needed before a real first-domain training
run:

1. **Sanborn vectorizer + direct-upload + PostGIS commit** (items 1-6
   from audit #2 above). Unlocks data.
2. **Building head training loop fill-in** (items 1-4 of the skeleton
   above). Unlocks training itself.

Both are parallelizable. The training loop can be filled in BEFORE
any DecodedArtifact rows exist by using synthetic data fixtures for
shape verification, then pointed at real data when the ingest catches
up. Each piece is roughly one focused engineering session.

Once both gates land, the Carriage Town first-domain training pool
(~8,000 rows) is large enough for the Pairformer at its current size
(roughly a few million params). The two-pass schedule reduces to
single-pass Flint-only pre-training until other cities ingest, which
is fine for the first-domain story.

## Open prerequisites for audit #4 (Carriage Town hand-walk validation)

Audit #4 was scoped to "pick one parcel in Carriage Town, walk
through the merge step with real evidence inputs, confirm the 0.7
confidence threshold produces a sensible spec." With audit #2's
finding that DecodedArtifact rows = 0 today, the merge step has no
inputs to walk through. Audit #4 therefore needs prerequisites met
before it can run meaningfully:

1. The Sanborn ingest engineering work (audit #2 items 1-6)
2. At least one Carriage Town Sanborn sheet vectorized end-to-end
3. The merge step's existing implementation walked through with
   that one sheet's output

When those land, audit #4 becomes "run the merge on one parcel
across the 8 Sanborn editions and inspect the spec." Not before.

## Summary

| Audit | Result |
|---|---|
| #1 Stub audit | All four reconstruction interfaces real, no work needed |
| #2 Corpus inventory | Zero DecodedArtifact rows; gap is ~500-700 lines of engineering on Sanborn ingest |
| #3 Pairformer training-readiness | Architecture complete; training loop is a skeleton ~300-500 lines from production |
| #4 Carriage Town hand-walk | Blocked on prerequisites from #2 |

The procedural reconstruction algorithm is closer to production than
the data pipeline. The fastest path to a demonstrable Carriage Town
reconstruction:

1. **Sanborn vectorizer + direct-upload loader** (one session)
2. **Vectorize one Carriage Town sheet end-to-end** (Ray job, hours)
3. **Building head training loop fill-in** (parallel to #1 + #2,
   one session)
4. **First-domain training run** (Ray job, hours)
5. **Carriage Town hand-walk audit #4** with real outputs.

Total: 2-3 focused engineering sessions plus 2 Ray job runs to
produce one trained model with demonstrable reconstruction output.
Not weeks. Not months.
