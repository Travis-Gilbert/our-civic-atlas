# Port Report

## Source

- Source worktree: `/private/tmp/index-api-open-flint-continuation`
- Baseline frontend source: committed `HEAD` on `Travis-Gilbert/open-flint-continuation`
- Data source: live Open Flint fixtures from the worktree, including the useful place-anchor fix from the interrupted run

## Carried Forward

- Public atlas app route and components.
- MapLibre/deck.gl desktop map and Leaflet mobile map.
- Mosaic/vgplot timeline brushing.
- Cosmos provenance panel.
- Open Flint fixtures, public package docs, contribution/privacy docs, and ACT Evidence Cockpit reference plan.
- Standalone fixture-backed API route.

## Intentionally Not Carried Forward

- Uncommitted frontend History mode.
- Newspaper marker styling.
- Contribution form inside `PlaceDossier`.
- The newly-visible Ant Design removal pass from that form work.

## Reason

The interrupted chat built product ideas directly into the embedded Context Theorem UI. This repo starts from the stable committed atlas baseline, then keeps public contribution and ACC/TF.js moderation as a deliberate next architecture slice.
