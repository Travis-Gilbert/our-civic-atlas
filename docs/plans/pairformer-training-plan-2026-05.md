# Pairformer Training Plan - 2026-05

This plan is the repo-local answer for
`docs/plans/atelier-real-reconstruction-plan.md` Task D. It turns the current
Pairformer prototype into a gated training operation, while being explicit that
the production corpus is not ready yet.

## Current Ground Truth

The current standalone app has enough public fixture coverage to render the
atlas, but not enough labeled historical reconstruction material to justify a
paid training run.

| Surface | Current state | Training meaning |
|---|---:|---|
| Public OSM building fixtures | 21,182 buildings | Useful footprint/type prior, not historical reconstruction truth. |
| Public typology labels | 18,186 residential, 2,601 commercial, 263 industrial, 128 civic, 4 unknown | Strong class imbalance; training batches must rebalance rare civic/industrial cases. |
| Local generated validation assets | 400 GLB + 400 IFC | Good geometry QA fixture, not model-supervision data. |
| Checked-in assessor corpus | 2 records | Smoke only. |
| Current Carriage Town reconstructions | 5 buildings | UI fixture/control set, not enough for training. |
| Backend seeded artifacts | 3 artifacts | Useful GraphQL/runtime smoke path, not enough for model training. |
| Existing Pairformer checkpoint | smoke pretrain only | Confirms code path, not production quality. |

The existing smoke artifact under the ingest sibling repo reports a 1,217,753
parameter Pairformer model with a best validation loss of about 0.2169 after
eight epochs. Treat that as a machinery check only.

## Existing Model Shape

The sibling ingest repo already has the right first draft in
`civic_atlas_ingest/building_head_pairformer.py` and
`civic_atlas_ingest/building_head_train.py`:

- Encoder: graph convolution plus attention pair updates.
- Default dimensions: `node_dim=320`, `edge_dim=48`, `hidden_dim=128`,
  `num_layers=3`, `num_heads=4`.
- Relation channels: 10 civic relation types.
- Categorical heads: `mass_form`, `story_count`, `facade_material`,
  `roof_form`, `ground_floor_use`.
- Regression heads: `height_meters`, `bay_count`, `roof_pitch_degrees`.
- Trainer modes: `shape-test`, `pretrain`, and `finetune`.
- Training pattern: masked-field prediction over `TrainingCorpusRecord`
  examples, with Ray-compatible remote execution.

This is enough to keep the Pairformer lane. The next step is corpus quality, not
model novelty.

## Corpus Gates

Do not launch paid GPU training until the gate is met.

| Gate | Minimum corpus | Allowed run | Exit condition |
|---|---:|---|---|
| Gate 0 - smoke | 1-10 records | Local or free CPU sanity check | Shapes, masks, serialization, and checkpoint write all pass. |
| Gate 1 - first real pretrain | 500 labeled building records | One bounded GPU job | Validation split is stable and rare classes are present. |
| Gate 2 - Flint useful model | 2,000+ labeled building records | Paid GPU training with checkpoint registry | Model beats fixture heuristics on held-out buildings. |
| Gate 3 - public confidence support | 50-100 manually reviewed gold buildings | Evaluation only | Per-head error report is good enough to explain public reconstruction confidence. |

The 400 generated GLB/IFC assets can support geometry validation at every gate,
but they should not be counted as labeled training records unless each generated
asset is tied back to source material and a reviewed target.

## Data Assembly Procedure

Each training record should come from a block or parcel-centered package that
keeps source history attached to the labels.

1. Ingest OSM/Overpass footprints for the parcel or block.
2. Decode a Sanborn sheet into georeferenced polygons, colors, story marks, and
   address candidates.
3. Join assessor/public parcel facts after removing owner/payor fields.
4. Attach photo/HABS and city-directory records as artifact anchors when they
   exist.
5. Emit a `TrainingCorpusRecord` with explicit label coverage per head.
6. Split records by block, not random individual buildings, so validation does
   not leak neighboring structures.
7. Keep the raw scans/uploads out of this public app repo; commit manifests,
   schema samples, and fixture-safe summaries only.

## Class Balance

The current app fixture is heavily residential:

| Typology | Fixture count | Training treatment |
|---|---:|---|
| Residential | 18,186 | Downsample or cap per block. |
| Commercial | 2,601 | Preserve storefront and mixed-use examples. |
| Industrial | 263 | Oversample and add explicit factory/warehouse examples. |
| Civic | 128 | Oversample; include schools, churches, public buildings. |
| Unknown | 4 | Exclude from supervised heads unless manually reviewed. |

The first real run should report per-class coverage before training starts. If
industrial or civic examples are absent from a batch, the batch is not ready.

## Loss And Evaluation

Use masked losses so missing labels do not become false negatives.

- Normalize each categorical head by its active label count.
- Normalize regression heads by observed scale and source-quality tier.
- Report metrics per head, not only aggregate validation loss.
- Track rare-class recall for `civic` and `industrial` types.
- Compare against a simple fixture heuristic before promoting any checkpoint.
- Keep the public methodology copy focused on support and uncertainty; do not
  show raw model confidence in atlas hover states.

Suggested model scorecard:

| Head | Metric | Required before public use |
|---|---|---|
| `mass_form` | accuracy + rare-class recall | Beats fixture heuristic on gold set. |
| `story_count` | accuracy within one story | Stable across Sanborn and assessor joins. |
| `facade_material` | accuracy | Verified against photo/HABS subset. |
| `roof_form` | accuracy | Verified against photo/HABS subset. |
| `ground_floor_use` | accuracy | Requires city-directory or storefront labels. |
| `height_meters` | MAE | Calibrated against known standing controls. |
| `bay_count` | MAE | Calibrated against storefront/photo subset. |
| `roof_pitch_degrees` | MAE | Calibrated against photo/HABS subset. |

## Compute Posture

This repo should not pin live dollar pricing because provider prices change.
Check the official provider pages at launch time before approving a paid job:

- RunPod pricing: <https://www.runpod.io/pricing>
- Modal pricing: <https://modal.com/pricing>

Operational default:

- Keep Gate 0 on local CPU/GPU.
- Prefer a single bounded RunPod GPU job for Gate 1 after the 500-record corpus
  exists.
- Keep Modal/Ray as an execution option only when the job runner and cost guard
  are explicit.
- Cap the first paid Gate 1 run to one training job, `max_epochs=50`, with early
  stop on validation plateau.
- Do not start paid training from the Next.js app or any frontend route. The
  resolver/runtime boundary remains GraphQL plus backend-owned service tokens.

## Checkpoint Naming

Use names that make the corpus gate obvious:

| Checkpoint | Gate | Meaning |
|---|---|---|
| `pairformer-v0.1-flint-smoke` | Gate 0 | Code path and serialization only. |
| `pairformer-v0.2-flint-500` | Gate 1 | First real corpus run. |
| `pairformer-v0.3-flint-2k` | Gate 2 | Candidate Flint useful model. |
| `pairformer-v1.0-flint-reviewed` | Gate 3 | Public-support candidate after gold evaluation. |

## Next Actions

1. Run the live PostGIS inventory from
   `docs/plans/evidence-corpus-inventory-2026-05.md`.
2. Produce the first real Sanborn per-polygon corpus manifest.
3. Add photo/HABS and city-directory artifact lanes before selecting the public
   pilot.
4. Build the 50-100 building gold review set from source-rich blocks.
5. Launch Gate 1 only after corpus coverage, class balance, and budget guard are
   visible in the run manifest.

