# Reconstruction Node Tree Adapter

Status: first adapter slice.

## Decision

Keep `ReconstructionSpec` / PostGIS as the persistence and approval truth, but
project reconstruction records into a Pascal-style flat node tree for editing,
selection, correction targeting, and future per-face texture provenance.

## Why

The existing Lost Flint frontend record is building-level plus broad part-level
fields: mass, facade, roof, and ground floor. That is enough for the current
deck.gl confidence renderer, but it is too coarse for resident and moderator
corrections. A correction often targets a specific wall, opening rhythm, roof
form, ground-floor entry, or texture face.

A flat node dictionary gives every part a stable address while preserving a
parent path:

```text
Site
└── Building
    └── Level
        ├── Mass
        ├── Facade
        │   ├── OpeningGrid
        │   └── TextureFace
        ├── GroundFloor
        │   └── TextureFace
        └── Roof
            └── TextureFace
```

## Implementation

`src/lib/atlas/reconstruction-node-tree.ts` defines:

- `ReconstructionNodeTree`
- typed scene nodes for site, building, level, mass, facade, opening grid,
  ground floor, roof, and texture face
- `createReconstructionNodeTree(...)`
- `applyNodeTreeToHistoricalReconstruction(...)`
- `getReconstructionNodePath(...)`
- `diffReconstructionNodeTrees(...)`

The first projection source is `HistoricalReconstruction` so this can work with
the existing Lost Flint fixtures before live backend specs are wired into the
frontend.

The backend counterpart is
`our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine::reconstruction_spec_to_node_tree`.
That function projects canonical `ReconstructionSpec` rows into the same
addressable-part idea. The frontend adapter remains fixture/read-model-facing;
the backend adapter remains spec-truth-facing.

`civic-atlas-ingest` stays separate on purpose: it owns bursty Modal work for
corpus ingestion, building-head training/inference, and Blender Scene Foundry.
It should call through the backend instead of becoming a second source of
truth.

## Validation

Run:

```bash
npm run validate:reconstruction-node-tree
npm run typecheck
```

## Follow-up

- Add an adapter from backend `ReconstructionSpec` once the frontend consumes
  the live spec payload rather than the `HistoricalReconstruction` shim.
- Use node IDs as correction targets in the per-part dossier.
- Let texture provenance attach to `texture_face` nodes without changing the
  structural truth model.
