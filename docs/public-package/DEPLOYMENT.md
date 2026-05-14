# Deployment

The v0.1 package is a static fixture prototype. It does not require a database,
queue, object storage, or secrets.

## Local Static Serve

```bash
cd docs/plans/open-flint-atlas/prototype
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/index.html`.

## Static Hosting

The current prototype can be deployed as static files once the release
checklist is green:

- `docs/plans/open-flint-atlas/prototype/index.html`
- `docs/plans/open-flint-atlas/fixtures/read-model/`
- `docs/plans/open-flint-atlas/fixtures/provenance/`
- Public package docs

The hosted page must visibly state that Open Flint Atlas is not an official City of Flint website.

## Routed App Deployment

The production atlas route is hosted by the `context-theorem-ui` Vercel project:

- App route: `/open-flint-atlas`
- Canonical launch domain: `mappingourcity.org`
- Transition alias: `flintmapped.org`
- Domain checklist: `docs/plans/open-flint-atlas/domain-cutover.md`

The custom-domain root rewrites live in `Context-Theorem-UI/next.config.ts`.
When Vercel has `mappingourcity.org` and `www.mappingourcity.org` attached,
the registrar DNS should point to the records Vercel requests. Keep the public
read-only atlas available while capture/admin operations stay staff-gated.

## Standalone Repo Path

Recommended next home:

```text
open-flint-atlas/
  README.md
  docs/
  data/source-probes/
  fixtures/
  prototype/
  scripts/
```

The first standalone deployment should remain static. PostGIS, Memgraph, and
submission storage can be added only after governance, moderation, and source
refresh operations are ready.

## Future App Shell

A future routed app can use Observable Framework, MapLibre, Mosaic, Plot,
DuckDB-WASM, PMTiles, or a small Next route. That step should preserve the same
source registry, public read-model schema, and contribution privacy contract.
