# Building Fabric Phase A5 Implementation

Phase A5 is implemented in this public app as a deterministic read-model and
deck.gl procedural fabric renderer. It upgrades the visible Flint buildings
from uniform footprint extrusions into a seeded present-day fabric layer with
roof, porch, facade, storefront, civic-entry, cornice, and industrial roof
parts.

## Completed in this repo

- City-pack height and roof priors live at
  `packs/us/mi/flint/archetypes/present/height_priors.yaml`.
- Browser read-model copy lives at
  `src/data/open-flint-atlas/fixtures/building-fabric/height-priors.json`.
- `src/lib/atlas/building-fabric.ts` derives the six present-day archetypes,
  common params, feature completeness, deterministic `variation_seed`, and a
  content-keyed GLB URI placeholder from each OSM footprint.
- `src/lib/atlas/urban-design-model.ts` attaches the A5 fabric metadata to every
  generated part and adds visible fabric details.
- `src/components/atlas/AtlasMap.tsx` renders mass and fabric as separate deck.gl
  layers with zoom-based fade-in behavior.
- The Dynamic Island / dossier layer controls include an independent Building
  Fabric toggle and keep the typology/sketch material mode.
- `/data/building-fabric/height-priors.json` and
  `/data/building-fabric/params.geojson` expose the read-model artifacts.

## Honest Remaining Work

- This repo does not run the Modal/Blender/Ray batch job. `glb_uri` is
  deterministic and content-keyed, but `glb_sha256` remains `null` with
  `glb_status: pending_offline_generation` until the upstream generator writes
  real assets.
- Parcel-front edge inference is not available in the public fixture, so
  `front_edge_bearing_degrees` falls back to the longest footprint edge and
  feature completeness drops accordingly.
- Phase B historical archetypes are untouched. Present-day A5 archetypes live in
  the separate `present/` city-pack path.

## Verification

- `npm run validate:urban-model` checks the six archetypes, seed derivation,
  feature-completeness signal, city-pack YAML version, GLB URI keying, and
  geometry validity.
- Visual acceptance still requires a browser smoke of `/open-flint-atlas` at a
  street-scale bookmark so the fabric fade and sketch/typology modes are visible
  in the live atlas.
