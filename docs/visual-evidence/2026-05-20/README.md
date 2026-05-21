# UCA-024 Visual Evidence - 2026-05-20

Captured from local dev server `http://127.0.0.1:3000` with Playwright
Chromium.

## Viewports

- Desktop: `1440 x 900`
- Mobile: `390 x 844`

## Baseline Set

Screenshots live in `baseline/` and cover:

- `/open-flint-atlas`
- `/open-flint-atlas/explore`
- `/open-flint-atlas/memory`
- `/open-flint-atlas/safety`
- `/open-flint-atlas/interventions`
- `/open-flint-atlas/sources`
- `/open-flint-atlas/contribute`
- `/open-flint-atlas/methodology`
- `/open-flint-atlas/node/atlas%3Aflint-mi`
- `/open-flint-atlas/place/ward%3A1`
- `/open-flint-atlas/object/dataset%3Aflint-read-model-v0`
- `/open-flint-atlas/scene/scene%3Aflint-overview`
- `/open-flint-atlas/lost-flint`
- `/open-flint-atlas/lost-flint/carriage-town`

`/open-flint-atlas/lost-flint` redirects to the Carriage Town Lost Flint
state so old route handles produce the same baseline as the current product
slice.

## Time-Travel Before/After

- `before/` captures the carried CU-L1-002 bug: the 1925 state rendered but
  the chrome still showed stale place-search "No matching places" panels.
- `after/` captures the fixed state: persistent Year badge, Lost Flint count,
  no stale no-results panels, and dimmed period context.
