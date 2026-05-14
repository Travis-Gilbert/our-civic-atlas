# Our Civic Atlas

Our Civic Atlas is open, source-backed civic atlas infrastructure. Flint Atlas is the first city node: a public civic knowledge map for Flint, Michigan that should be useful, inspectable, and contributable on its own, while still tracking Theseus/ACC review primitives where they help with moderation and accuracy.

This repository is intended to be public. Do not commit secrets, private contributor data, raw uploads, or unreviewed personal information.

## Current Slice

- Standalone Next.js app at `/open-flint-atlas` for the Flint Atlas launch node.
- Routed civic lenses at `/open-flint-atlas/memory`, `/open-flint-atlas/safety`, `/open-flint-atlas/interventions`, and `/open-flint-atlas/evidence`.
- Public route envelope for sources, contribution boundary, methodology, atlas nodes, places, civic objects, and scene manifests.
- Atlas Scene shell with Oblique, Street, Section, and Atlas camera modes, source-backed deck.gl overlays, package-backed Node Horizon chrome, and reference-driven visual grammar tokens.
- Local fixture-backed API routes under `/api/v2/theseus/open-flint-atlas/*`.
- Public read-model fixtures copied from the Index-API atlas plan.
- Baseline map/timeline/provenance plumbing ported from the earlier Open Flint atlas work, now contextual under the scene lenses instead of always-on dashboard chrome.
- Product-vault notes mirrored under `docs/product-vault/flint-ouratlast/` so launch planning stays with the app repo while the original Obsidian vault remains an idea notebook.

## Development

```bash
npm install
npm run dev
npm run validate:atlas
npm run validate:dossier:live
npm run validate:routes:live
```

Then open `http://localhost:3000/open-flint-atlas`.

## Public-Good Boundary

The atlas is not an official City of Flint website. The product goal is a public-interest civic atlas where people can explore source-backed places and events, contribute evidence, and understand why review confidence changes over time.

See [docs/SYSTEM-BLUEPRINT.md](docs/SYSTEM-BLUEPRINT.md) for the target operating model.
See [docs/plans/our-civic-atlas-v1-launch-plan.md](docs/plans/our-civic-atlas-v1-launch-plan.md) for the current launch plan.
See [docs/plans/renderer-stack-integration.md](docs/plans/renderer-stack-integration.md) for the renderer and asset-pipeline boundary.
