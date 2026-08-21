# Our Civic Atlas

**A public civic knowledge graph and geospatial atlas. Flint, Michigan is the first city node.**

Anyone can explore source-backed places and events on a map, contribute observations and corrections, and see exactly *why* the review confidence of any claim changed over time. Every public claim points back to source evidence or a contribution receipt — the atlas shows its work.

## What it does

- **Atlas reader** — a MapLibre/deck.gl map with timeline, source trail, place dossiers, and a provenance graph, all cross-filtering the same selected places, events, sources, and claims. Readable without login. Selective Three.js/R3F scene augmentation for reviewed scene objects (e.g. Lost Flint).
- **Public contribution** — residents submit observations, corrections, source links, documents, and comments. Every submission gets a public receipt; raw text and contact details stay private until reviewed. Pseudonymous by default.
- **Layered moderation** — TensorFlow.js runs in the browser for immediate preflight (spam, duplicates, evidence quality); Theseus ACC/ACT scores claim/evidence alignment server-side; human review is the promotion layer. Automation ranks and explains — it never silently publishes.
- **Explainable confidence** — compact cards show progress, rationale, and next checks. Corrections append history instead of overwriting it.

## Architecture

Three repositories share the work:

| Repo | Role |
| --- | --- |
| [our-civic-atlas](https://github.com/Travis-Gilbert/our-civic-atlas) | Next.js/TypeScript atlas reader and contribution surface (this repo) |
| [our-civic-atlas-backend](https://github.com/Travis-Gilbert/our-civic-atlas-backend) | Rust backend |
| [civic-atlas-ingest](https://github.com/Travis-Gilbert/civic-atlas-ingest) | Python source ingestion |

Core graph primitives: `Place`, `Source`, `Event`, `Claim`, `Artifact`, `Contribution`, `Review`, `Edge`.

**Stack:** Next.js · TypeScript · MapLibre GL / deck.gl · Three.js/R3F · TensorFlow.js · GraphQL codegen

## Status

Phase 1 (the Flint public read atlas with fixture-backed API routes) is the current focus; contribution receipts, review queues, and ACC-assisted moderation follow. See the [launch plan](docs/plans/our-civic-atlas-v1-launch-plan.md) and [system blueprint](docs/SYSTEM-BLUEPRINT.md).

## Public-good boundary

The atlas is **not** an official City of Flint website. Public data releases are reproducible from fixtures and manifests; sensitive records, private notes, and contact details never enter public JSON.

Further reading: [SYSTEM-BLUEPRINT.md](docs/SYSTEM-BLUEPRINT.md) · [renderer stack integration](docs/plans/renderer-stack-integration.md)
