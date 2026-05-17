# Scene Foundry

Scene Foundry is the offline asset pipeline that turns reviewed scene manifests
into 3D outputs. It produces files maintainers and reviewers can inspect with
external tools without affecting how a resident loads a public page.

The Foundry runs offline. The public atlas page must never depend on a Scene
Foundry runtime, a local authoring tool, or a live exporter being available.

## Why Offline-Only

Public civic atlas pages need to load anywhere, with no live render service,
no MCP tooling, no local installation. Foundry outputs serve later workflows:

- review of 3D scenes by maintainers and stewards;
- handoff to film, architecture, or research pipelines that consume USD;
- archival of source-grounded reconstructions; and
- generation of placeholder splats while public renderers stay on the
  reviewed MapLibre/deck.gl or R3F baseline.

Mixing Foundry runtime into the public page would make the atlas brittle. It
would also tie public load behavior to closed authoring tools that residents
do not run.

## Output Formats

The Foundry produces:

- `usd` and `usdz`: Universal Scene Description, for film/architecture handoff.
- `glb`: standard 3D asset interchange, for general scene review.
- `ply`: point clouds, often as Brush input or output.
- `splat`: Gaussian splat archives produced by Brush.

The full set lives in the `SceneFoundryExportFormat` type in
`src/lib/atlas/contracts.ts`. Adding a format requires a contract update and a
new generator entry in the Foundry export manifest.

## Manifest Shape

Each atlas node has a `scene-foundry-export-manifest.json` that declares:

- `offline_only: true` (enforced by validator).
- `generator_inventory`: each Foundry generator, its runtime, the renderers
  it accepts, and the formats it produces.
- `targets`: per-scene export targets with output path patterns, rebuild
  triggers, and review status.
- `assets`: per-output asset metadata records (asset id, scene id, object id,
  format, generator, source ids, review state, status, generated_at).

The manifest is a contract file; it does not embed binary outputs. The actual
artifacts live wherever the operator chooses to publish them, but the manifest
is the source of truth for provenance and review state.

## Rebuild Triggers

A target's `rebuild_trigger` field describes the human or system event that
should cause regeneration. Examples in the Flint fixture:

- `"scene manifest review_state transitions to accepted"`: the scene was
  approved for public reading; regenerate the GLB/USD.
- `"Brush capture review by data steward"`: a new historical capture was
  approved; regenerate the splat.

Triggers stay descriptive rather than executable. The Foundry should be
runnable from a documented command per generator, not from a hidden service.

## Asset Metadata

Every produced asset must have a metadata record with:

- `asset_id`: matches the `SceneManifestAsset.asset_id` it backs.
- `scene_id` and `object_id`: ties the output to a reviewed scene and object.
- `export_format`: the produced format.
- `generator_id` and `generator_version`: provenance for the toolchain.
- `source_ids`: the same source ids that grounded the scene.
- `review_state`: where the asset stands in review.
- `status`: planned, reviewed, exported, or retired.
- `generated_at`: ISO timestamp or null.
- `byte_size`: file size or null.

Asset metadata is the only Foundry artifact that may be referenced from a
public read model (as a fallback reference for renderers that can consume it).

## What Foundry Does Not Do

- It does not render the public atlas. That is the renderer bridge's job.
- It does not produce read models. Those are listed in
  `READ-MODELS.md`.
- It does not move private data. Source-grounded reconstructions still must
  pass the privacy field allowlist before any output goes public.
- It does not run from `npm run dev` or `npm run build`. Foundry runs are
  separate commands documented per generator.

## Validators

`npm run validate:atlas` checks the Foundry manifest:

- `offline_only` is literally `true` on the manifest and on every target.
- Every generator declares at least one accepted renderer and produced format.
- Every target declares a `SceneFoundryExportFormat`, a valid status, and a
  rebuild trigger.
- Every asset record carries provenance fields and a valid format and status.
- The read-model catalog lists `scene-foundry-export-manifest` so the
  contract is discoverable.

## Related Documents

- `READ-MODELS.md` for public read-model role assignments.
- `METHODOLOGY.md` for source-first review posture.
- `GOVERNANCE.md` for who approves Foundry outputs.
- `OBSERVABILITY.md` for `release.*` events around asset publication.
- `RELEASE-CHECKLIST.md` for the gates Foundry outputs must clear before
  appearing in public scene manifests.
