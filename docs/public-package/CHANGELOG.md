# Changelog

## planned-contribution-backend-contracts

- Added typed contribution backend contracts to `src/lib/atlas/contracts.ts`:
  `ContributionObservationType`, `ContributionConfidenceLabel`,
  `ContributionRejectionReason`, `ContributionAdvisoryKind`,
  `ContributionAdvisorySignal`, `ContributionPrivateFields`,
  `ContributionPublicSummary`, `ContributionSubmission`,
  `ContributionReceipt`, `ReviewQueueEntry`, and
  `ContributionAdvisoryBoundary`.
- Added the exported `FLINT_CONTRIBUTION_ADVISORY_BOUNDARY` constant so the
  advisory-only rule and forbidden auto-promotions are encoded in source.
- Added `CONTRIBUTION-BACKEND.md` to `docs/public-package/` describing the
  submission, receipt, review-queue, and advisory-boundary contracts and
  explicitly noting that the public contribution UI is reserved for the
  design brainstorm.
- The API continues to return `501` for write paths; the new contracts
  describe the eventual handler shape without lighting up the write path.

## planned-spatial-runtime-contract

- Added `SpatialIndexFamily`, `SpatialContractStatus`, `RustyRedHotStateKind`,
  `RustyRedHotStateBoundary`, `RustPreprocessingLane`, and
  `SpatialRuntimeContract` types to `src/lib/atlas/contracts.ts` so the
  indexing family, viewport cache key, Rusty Red boundaries, and Rust
  preprocessing lanes are typed and validated.
- Added `src/data/open-flint-atlas/fixtures/static-package/data/spatial-runtime-contract.json`
  proposing H3 with resolutions `[6, 8, 10, 12]`, a viewport cache key
  schema, three Rusty Red boundaries, and two Rust preprocessing lanes. All
  are marked `proposed` pending review.
- Extended `validate-static-atlas.mjs` and `validateStaticAtlasPackage` to
  enforce the new contract.
- Updated `read-model-catalog.json` to list `spatial-runtime-contract`.
- Updated `generate-atlas-starter.mjs` so new starter nodes also include a
  spatial runtime contract with safe defaults.
- Added `SPATIAL-RUNTIME.md` to `docs/public-package/` explaining the
  proposed indexing family, viewport cache key, Rusty Red hot-state
  boundaries, and Rust preprocessing lanes.

## planned-atlas-starter-tooling

- Added `scripts/generate-atlas-starter.mjs` and the `npm run atlas:starter`
  script alias for generating a backend-free atlas node starter from a config
  JSON.
- Added `--sample-config`, `--dry-run`, `--validate-only`, and `--help` flags
  for safe maintainer use.
- The starter writes a minimal valid set of well-known, atlas-node, node
  catalog, layer catalog, read-model catalog, mobile runtime profile,
  viewport vector contracts, scene packet compiler/index, scene/scenario
  manifests, source registry, read-model formats, and Scene Foundry export
  manifest, all with placeholder review states.
- Updated `CREATOR-FLOW.md` with usage examples.

## planned-binary-read-models-and-scene-foundry-contracts

- Added `BinaryReadModelRole` type and `ReadModelFormatsManifest` to
  `src/lib/atlas/contracts.ts` so every read model's format has an explicit,
  validated role.
- Added `src/data/open-flint-atlas/fixtures/static-package/data/read-model-formats.json`
  with role assignments for `basemap_archive`, `bulk_query`, `viewport_packet`,
  `runtime_transfer`, `fixture_fallback`, and `dossier_record`.
- Added `SceneFoundryExportFormat`, `SceneFoundryAssetMetadata`,
  `SceneFoundryExportTarget`, and `SceneFoundryExportManifest` types so
  reviewed scenes can drive offline USD/GLB/PLY/splat outputs without
  affecting public page load.
- Added `src/data/open-flint-atlas/fixtures/static-package/data/scene-foundry-export-manifest.json`
  with generator inventory, planned targets, and a sample asset metadata
  record.
- Extended `validate-static-atlas.mjs` and `validateStaticAtlasPackage` to
  enforce both new manifests, including `offline_only: true` on Scene Foundry.
- Updated `read-model-catalog.json` to list `read-model-formats` and
  `scene-foundry-export-manifest`.
- Added `READ-MODELS.md` and `SCENE-FOUNDRY.md` to `docs/public-package/`
  with the role rules, fallback chain, and Foundry posture.

## planned-public-package-doc-completion

- Added `DISPUTES.md` covering dispute states, who acts on them, and what a
  public dispute note must include.
- Added `CREATOR-FLOW.md` describing how to start a new atlas node from this
  package without copying Flint specifics by hand.
- Added `OBSERVABILITY.md` listing the events the system should emit for
  submission, review, source, read-model, runtime, and release lifecycles,
  with explicit private-field exclusions.
- Added `RELEASE-CHECKLIST.md` defining the Runtime, Product, and Vision
  completion gates that every release must reconcile.
- Updated `README.md` with a Documents index listing every public-package
  document and its purpose.

## planned-atlas-core-one-manifests

- Added Atlas Core One source-manifest coverage for Lost Flint historical sources, Civic Intervention Ledger document sources, and street-safety or mobility sources.
- Added matching probe manifests for the Atlas Core One source family expansion.
- Cross-linked Atlas Core One and the Spatial Event Index from the existing Open Flint Atlas planning docs.
- Clarified that Atlas Core One remains a planning and fixture-doc track, not a live route, ingestion job, or official-city service.

## v0.1.0-fixture-boundary

- Added seed source registry and validator.
- Added source probe manifests and validator.
- Added public read-model schema and fixtures.
- Added provenance graph contract, JSON fixture, and sample Cypher export.
- Added static mobile-first prototype.
- Added contribution review and privacy workflow.
- Added standalone public package boundary with governance, privacy,
  contributing, deployment, and license notes.
