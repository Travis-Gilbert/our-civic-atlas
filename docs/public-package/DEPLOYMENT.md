# Deployment

The v0.1 package is a static fixture prototype. It does not require a database,
queue, object storage, or secrets.

## Local App Serve

```bash
npm install
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/open-flint-atlas`.

## Checked-In Public Data

The app reads checked-in public fixtures and static-package manifests from:

- `src/data/open-flint-atlas/source-registry.json`
- `src/data/open-flint-atlas/fixtures/read-model/`
- `src/data/open-flint-atlas/fixtures/provenance/`
- `src/data/open-flint-atlas/fixtures/static-package/`
- `public/atlas/historical/`

The hosted page must visibly state that Open Flint Atlas is not an official City of Flint website.

## Routed App Deployment

The production atlas route is hosted from this standalone Next.js app:

- App route: `/open-flint-atlas`
- Canonical launch domain: `flint.ourcivicatlas.org`
- Root network domain: `ourcivicatlas.org`

When Vercel has `flint.ourcivicatlas.org` attached, the registrar DNS should
point to the records Vercel requests. Keep the public read-only atlas available
while capture/admin operations stay staff-gated.

## Standalone Repo Path

Current home:

```text
Open-Flint-Atlas-main-release/
  README.md
  docs/
  public/
  scripts/
  src/
```

PostGIS, Ray/RunPod inference, and submission storage can be added only after
governance, moderation, and source-refresh operations are ready.

## Future App Shell

A future route can extend MapLibre, deck.gl, Mosaic, Plot, DuckDB-WASM,
PMTiles, Ray/RunPod-generated assets, and selective R3F overlays. That step
should preserve the same source registry, public read-model schema, and
contribution privacy contract.
