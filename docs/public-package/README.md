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
- A routed atlas app shell with one MapLibre + deck.gl render path across
  desktop and mobile, Mosaic/vgplot timeline, and cosmos.gl provenance panel.
- Validators for every artifact above.

## Inspect The Current App

Run:

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/open-flint-atlas`.

## Inspect The Legacy Prototype

The old static prototype path has been retired. Use the routed Next.js app at
`/open-flint-atlas` for current validation.

## Validate

Run the current fixture and route boundary:

```bash
npm run typecheck
npm run lint
npm run validate:atlas
npm run validate:reconstruction-node-tree
npm run validate:time-travel
```

When a local dev server is running, also run:

```bash
npm run validate:routes:live
```

## Public Boundary

This package is now kept as public launch context in the standalone repository.
Preserve old artifact paths or publish a migration map when paths are retired so
the original extraction history remains understandable.

## Documents

| Document | Purpose |
|---|---|
| `GOVERNANCE.md` | Roles, decision rules, update cadence, issue triage. |
| `METHODOLOGY.md` | Source registry, probes, public read model, confidence, community observations. |
| `CONTRIBUTING.md` | How to contribute and what not to submit. |
| `PRIVACY.md` | Private fields, redaction rules, conflict handling. |
| `DISPUTES.md` | Dispute states, who acts, what public dispute notes must include. |
| `CREATOR-FLOW.md` | How to start a new atlas node from this package. |
| `OBSERVABILITY.md` | Events the system should emit and the private fields it must not. |
| `RELEASE-CHECKLIST.md` | Runtime, Product, and Vision completion gates for every release. |
| `READ-MODELS.md` | Role assignments for GeoParquet, Arrow, PMTiles, FlatGeobuf, and JSON. |
| `SCENE-FOUNDRY.md` | Offline pipeline producing USD/GLB/PLY/splat outputs from reviewed scenes. |
| `SPATIAL-RUNTIME.md` | Indexing family, viewport cache key, Rusty Red hot-state boundaries, Rust lanes. |
| `CONTRIBUTION-BACKEND.md` | Typed contracts for submission, receipt, review queue, and the advisory boundary. |
| `DEPLOYMENT.md` | Static serve and routed app deployment notes. |
| `CHANGELOG.md` | Plain-language release log. |
| `LICENSE.md` | License. |
