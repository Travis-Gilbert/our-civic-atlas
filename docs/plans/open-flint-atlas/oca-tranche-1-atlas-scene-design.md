# OCA Tranche 1 Atlas Scene Design

Status: draft for implementation
Date: 2026-05-15
Scope: OCA-003A, OCA-004, OCA-005, OCA-017B, with Lost Flint compatibility for OCA-012/OCA-012A/OCA-012B

## Why this tranche exists

The current standalone atlas already has a working scene shell, map, mobile island, route-backed node detail pages, dossier payloads, and Fresh Signals. What it does not yet have is a single implementation contract for:

- who owns Atlas Scene layout,
- how the bounded Flint world is rendered,
- how Node Horizon scales beyond hand-wired cards,
- and how the first shell supports Lost Flint instead of treating it like a future bolt-on.

This note turns the current partials into one buildable first tranche.

## Current seam

Today the Atlas Scene is split across:

- `src/components/atlas/OpenFlintAtlasScene.tsx`: orchestration root
- `src/components/atlas/AtlasShell.tsx`: floating panel layout
- `src/components/atlas/AtlasSceneChrome.tsx`: desktop header shell
- `src/components/atlas/AtlasDynamicIsland.tsx`: mobile and command surface
- `src/components/atlas/AtlasMap.tsx`: map, overlays, camera by view mode
- `src/lib/atlas/node-horizon.ts`: Node Horizon card shaping from the static package
- `src/lib/atlas/scene-view.ts`: lens and camera presets

The scene already proves the product can work. The main issue is ownership: shell behavior, navigation, and scene identity are distributed across several components, so the bounded-world and federation behavior still feel additive instead of primary.

## Decisions

### 1. Keep `OpenFlintAtlasScene` as the composition root

Do not move scene orchestration into the map component. `OpenFlintAtlasScene` should remain the place that owns:

- active lens
- active view mode
- selected place/source/signal
- search state
- timeline filter state
- Node Horizon compare and breadcrumb state
- mobile versus desktop shell decisions

This keeps atlas interaction state independent from any one renderer.

### 2. Promote the shell into a named Atlas Scene contract

The implementation target for OCA-003A is an explicit shell contract centered on `AtlasAppShell`.

Component ownership:

- `AtlasAppShell`
  - overall viewport framing
  - desktop rail placement
  - mobile sheet anchors
  - safe-area spacing
  - shared shell z-index rules
- `AtlasSceneHeader`
  - brand block
  - desktop search
  - scene metrics
- `AtlasModeRail`
  - lens switching
  - view mode switching
  - focus and utility entry points
- `AtlasLeftRail`
  - Fresh Signals
  - control dossier
  - future receipt/review cards
- `AtlasRightRail`
  - selected place dossier, or source/connection stack when that lens is active
- `AtlasBottomRail`
  - timeline and future mosaic controls
- `AtlasDynamicIsland`
  - mobile-first command surface, not the only definition of scene identity

Practical note: we do not need a destructive rewrite first. `AtlasShell.tsx` can evolve into `AtlasAppShell` while `AtlasSceneChrome.tsx` is thinned into `AtlasSceneHeader` plus `AtlasModeRail`.

### 3. Make the bounded world a data-backed contract, not only a style choice

OCA-004 should ship as a real boundary treatment with three layers:

1. Boundary framing
   - read the Flint boundary and bbox from the static package
   - fit initial camera to the package boundary, not a generic center/zoom
   - expose reusable presets: county, city, neighborhood, corridor, parcel

2. Boundary masking
   - dim or desaturate outside the active atlas boundary
   - keep Flint and near-context readable while making the atlas feel intentionally bounded
   - preserve a mobile fallback that keeps the same mask logic even when 3D/extrusion is reduced

3. Local cartographic voice
   - reduce generic POI noise
   - preserve river, major corridors, wards, parks, and civic anchors
   - keep lens tinting and render grammar consistent with current map overlays

The first release does not need a net-new 3D renderer. It does need a visibly Flint-specific world with consistent desktop/mobile framing.

### 4. Node Horizon is route-backed federation navigation, not just a card list

OCA-005 and OCA-017B should define Node Horizon as a navigation system with four behaviors:

1. Preview
   - node card shows name, relation, scope, freshness, maintainer, capability summary, source count, and contribution status

2. Open
   - current behavior stays route-backed through `/open-flint-atlas/node/[atlasId]`

3. Compare
   - compare should be URL-addressable, using a search param on the main atlas scene rather than local-only state
   - target pattern: `/open-flint-atlas?compare=atlas:detroit-mi`
   - compare panel should show current node versus selected node on scope, freshness, capabilities, and package readiness before any deeper visual diff work

4. Return and breadcrumb
   - parent return and "back to Flint Atlas" behavior should exist both on node detail routes and in the scene shell
   - breadcrumbs should reflect atlas hierarchy, not browser history alone

Spatial portal transitions should be progressive enhancement:

- default: accessible route navigation with no motion dependency
- enhanced: animate focus toward a boundary anchor or portal marker before route transition
- reduced-motion: no animated portal travel, only focus/highlight and route change

### 5. Reserve shell space for Lost Flint now

Lost Flint should shape this tranche even before its full data/model layers land.

The shell must already support:

- a memory-first lens that can carry temporal building presence
- a right-rail dossier that can show present, vanished, inferred, or disputed place states
- timeline controls that are meaningful beyond events-only filtering
- map/render style tokens that can later differentiate current, vanished, and uncertain objects without redesigning the shell

This means OCA-003A and OCA-004 should be treated as prerequisites for OCA-012, not unrelated polish.

## File targets

Primary files for this tranche:

- `src/components/atlas/OpenFlintAtlasScene.tsx`
- `src/components/atlas/AtlasShell.tsx`
- `src/components/atlas/AtlasSceneChrome.tsx`
- `src/components/atlas/AtlasDynamicIsland.tsx`
- `src/components/atlas/AtlasMap.tsx`
- `src/components/atlas/MobileAtlasMap.tsx`
- `src/components/atlas/ResponsiveAtlasMap.tsx`
- `src/app/open-flint-atlas/atlas.css`
- `src/lib/atlas/scene-view.ts`
- `src/lib/atlas/node-horizon.ts`
- `src/lib/atlas/contracts.ts`
- `src/lib/atlas/static-package.ts`

Fixture and manifest follow-up files:

- `src/data/open-flint-atlas/fixtures/static-package/data/node-catalog.json`
- `src/data/open-flint-atlas/fixtures/static-package/data/atlas-node.json`
- `src/data/open-flint-atlas/fixtures/static-package/data/scene-manifests/flint-overview.json`

## Implementation sequence

### Phase A: OCA-003A shell map

- refactor `AtlasShell` into `AtlasAppShell` ownership
- split desktop header duties from mobile island duties
- define left/right/bottom rail responsibilities
- add compare and breadcrumb state to `OpenFlintAtlasScene`
- leave public copy in resident-facing language; do not add new surface labels using "evidence", "provenance", or "epistemic"

Exit condition:
- scene layout is described by named shell regions, not only by floating panel placement classes

### Phase B: OCA-004 bounded-world treatment

- fit camera from boundary package data
- add boundary mask and Flint-first framing
- align desktop and mobile fallback behavior
- capture desktop/mobile screenshots for the visual gate

Exit condition:
- the map reads as Flint Atlas immediately, not as a generic basemap with overlays

### Phase C: OCA-005 and OCA-017B Node Horizon contract

- extend `node-horizon.ts` shape for compare and breadcrumb metadata
- wire compare state into the main scene route
- add parent return/breadcrumb rendering in shell and node detail views
- keep spatial portal motion optional and reduced-motion safe

Exit condition:
- Node Horizon can open, compare, and return in a way that scales beyond the current small fixture set

### Phase D: Lost Flint readiness check

- confirm shell rails, timeline, and render-state labels can host `building_presence`
- verify memory lens copy and controls do not assume only current-place data
- add any missing style-token hooks needed for vanished or inferred objects

Exit condition:
- OCA-012 can start without reopening shell architecture

## Acceptance criteria by OCA item

### OCA-003A

- Atlas Scene has an explicit shell contract with named regions and owners
- desktop and mobile controls no longer compete for the same visual identity role
- compare/breadcrumb state has a home in scene orchestration

### OCA-004

- initial camera and presets derive from atlas boundary/package data
- outside-boundary treatment is visible on desktop and mobile
- Flint-first cartographic styling survives reduced-data or reduced-motion fallbacks

### OCA-005

- Node Horizon supports preview, open, compare, and return
- compare is route-addressable
- portal behavior degrades gracefully to standard navigation

### OCA-017B

- node card fields are explicit and fixture-backed
- parent/child/neighbor interactions share one contract
- breadcrumbs do not depend on browser history

## Non-goals for this tranche

- full Lost Flint data ingestion
- full source/connection view implementation
- intervention ledger buildout
- predictive modeling or safety-lab forecasting
- replacing the atlas runtime with an R3F-first shell

## Recommended next build session

Start with Phase A and Phase B together. The shell split and bounded-world treatment are the fastest way to make the atlas feel like the intended product while clearing the runway for Lost Flint and Node Horizon hardening.
