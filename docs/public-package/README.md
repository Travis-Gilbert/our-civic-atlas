# Our Civic Atlas Public Package

Our Civic Atlas is public-interest, source-grounded civic atlas infrastructure.
Flint Atlas is the first city node. It is designed to make public place data,
source provenance, confidence, and community correction easier to inspect.

Our Civic Atlas and Flint Atlas are not official City of Flint websites. They
should always show source names, freshness, caveats, and confidence reasons
instead of presenting themselves as government authority.

## Current Status

This package began as a v0.1 fixture boundary inside the Index-API repository.
It now lives in the standalone `our-civic-atlas` app repo as public launch
context and historical package documentation.

The routed Next.js Flint Atlas currently lives at `/open-flint-atlas` in this
standalone repo. The target public node is `flint.ourcivicatlas.org`.

Atlas Core One is an additional planning track inside this same boundary. It
adds the Spatial Event Index contract plus expanded historical, intervention,
and street-safety source manifests. Atlas Core One does not create a live route,
live ingestion pipeline, or official-city status by itself.

The boundary includes:

- A source registry with trust, privacy, and use metadata.
- Source probe manifests for the first public data surfaces.
- A public read-model schema and fixtures.
- A provenance graph contract and fixture export.
- A contribution review and privacy workflow.
- A static mobile-first prototype.
- A routed atlas app shell with MapLibre/deck.gl desktop map, Leaflet mobile
  map, Mosaic/vgplot timeline, and cosmos.gl provenance panel.
- Validators for every artifact above.

## Inspect The Current App

Run:

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/open-flint-atlas`.

## Inspect The Legacy Prototype

Open:

```bash
docs/plans/open-flint-atlas/prototype/index.html
```

Or serve it locally from the prototype directory:

```bash
cd docs/plans/open-flint-atlas/prototype
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/index.html`.

## Validate

Run the full v0.1 fixture boundary:

```bash
python3 scripts/validate_open_flint_source_registry.py
python3 scripts/validate_open_flint_source_probes.py
python3 scripts/validate_open_flint_read_model.py
python3 scripts/validate_open_flint_provenance_graph.py
python3 scripts/validate_open_flint_contribution_workflow.py
python3 scripts/validate_open_flint_prototype.py
python3 scripts/validate_open_flint_public_package.py
```

Rebuild generated fixtures before validating if source registry, read-model, or
prototype inputs changed:

```bash
python3 scripts/build_open_flint_read_model.py
python3 scripts/build_open_flint_provenance_graph.py
python3 scripts/build_open_flint_prototype.py
```

## Public Boundary

This package is now kept as public launch context in the standalone repository.
Preserve old artifact paths or publish a migration map when paths are retired so
the original extraction history remains understandable.
