# Atelier overnight pass — 2026-05-24

Visual evidence capture from the autonomous overnight pass that landed
PT-504 (right-click + long-press entry) and Stage 4 Pairformer pulse
rings. This README is the human-readable record of what was verified
live + how to re-capture.

## What was verified live (preview MCP, dev server, real fixture)

Two routes were exercised against the live dev server at
`http://localhost:3000` with the Carriage Town fixture:

| Route | Renders | Confirmed |
|---|---|---|
| `/open-flint-atlas/atelier/building%3Acarriage-town%3A1/1885` | Whaley House (hipped roof, 14×18m, 12.5m height) | Chrome label "RECONSTRUCTED · BUILDING:CARRIAGE-TOWN:1 · CIRCA 1885", Skip + Back-to-atlas controls, porcelain mint chipboard mass, HABS source card (top, sepia paper), Library of Congress Sanborn card (left, amber paper), terracotta provenance lines from both cards to building corners, vellum drafting grid ground plane, full dossier panel with Roof / Street Level / Conflicts / Sources sections, Replay + Save buttons |
| `/open-flint-atlas/atelier/building%3Acarriage-town%3A3/1925` | Carriage Town Storefront (flat roof, 11×16m, 7m) | Route resolves to the correct fixture record; smoke check passed |

Both routes are now included in `scripts/smoke-open-flint-routes.mjs`
(PT-701), so future commits exercise them automatically. As of this
pass: 29/29 smoke checks pass.

## What was not captured

Stage 4 mid-pulse (the new pulse rings landed in this pass) was not
captured as a still frame. The rings are pure CSS one-shot
animations triggered by `.atelier-surface[data-stage="pairformer_inference"]`,
and the Claude Preview MCP throttles requestAnimationFrame in its
background tab so the choreographer either skips through quickly or
flashes the rings between eval calls. Capturing a mid-pulse frame
requires a real foreground browser (Playwright in headed mode, or
DevTools screenshot tool with the animation paused at ~300ms into
Stage 4). This is the gap PT-801 will close once an opt-in
screenshot tool is added to devDependencies.

## How to re-capture manually today

Until automated capture lands, here is the manual procedure for any
session that needs evidence:

1. `npm run dev` (port 3000)
2. Open `http://localhost:3000/open-flint-atlas/atelier/building%3Acarriage-town%3A1/1885`
   in a real browser window (Chrome or Safari, foreground).
3. The 7.5s animation auto-plays once on mount. For Stage 4 capture:
   - Open DevTools Performance tab, hit Record on page load
   - Stop after ~5s
   - Scrub to the 3.8s-4.8s window in the flame chart
   - Screenshot the frame with two faint terracotta rings expanding
     from the building center, scene slightly darkened
4. For Stage 0 (entry) capture:
   - Open DevTools Animations tab, slow to 25%
   - Reload the page
   - Capture in the first 500ms (dark paper, label visible, building
     not yet drawn)
5. For settled state capture:
   - Wait for the full animation to complete (~7.5s)
   - Capture (matches the screenshot embedded in the 2026-05-24
     overnight pass conversation log)

## How to upgrade to automated capture (PT-801 v2)

The cleanest path forward is to add Playwright as a devDep with a
small `scripts/capture-atelier-screenshots.mjs` that:

1. `npm run dev` (or accepts an already-running dev server)
2. Launches `chromium` headed with `prefers-reduced-motion: no-preference`
3. Navigates to each fixture route
4. Uses `page.evaluate` to read `.atelier-surface` data attributes
5. Captures three frames per route: entry (just after navigation),
   Stage 4 mid-pulse (3800ms-4100ms after mount), settled (10s after
   mount)
6. Writes PNGs to this directory with `<route>-<stage>-<timestamp>.png`

Adding Playwright was deferred from this pass because it pulls
~200MB of Chromium and the user has not explicitly authorized a new
devDep yet. Next session: confirm + ship the capture script.

## What this pass shipped (commit log)

- `feat(atelier): PT-504 right-click and long-press atelier entry` — d0bd134
- `feat(atelier): Stage 4 Pairformer inference pulse rings` — 46b251f
- `test(atelier): PT-701 add atelier routes to smoke` — 61974eb
- (this README) `docs(atelier): PT-801 visual evidence scaffold`

After this README commits, four spec-floor items remain in the
"Deferred to v1.x" column of `docs/plans/the-atelier/README.md`:
sound design (Stage 1 paper rustle, Stage 2 thrum, Stage 6 tone),
Stage 6 ornament emergence (needs backend per-part geometry segments),
PT-802 Do Not Downgrade gate (needs design-critic review pass),
PT-902 docs/public-package marketing copy.
