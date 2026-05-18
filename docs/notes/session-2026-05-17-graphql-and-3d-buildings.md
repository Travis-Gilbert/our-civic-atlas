# Session Checkpoint — 2026-05-17

GraphQL contract, urql codegen, Strawberry endpoint, OSM building layer,
porcelain Lost Flint placeholder, REST proxy to live Theseus, codebase map
updates. Wraps with **building layers visible-bug unresolved** — buildings
should render but don't appear in the 3D scene.

Read this whole file before resuming. `/catchup` will load it (`.open.md`
suffix).

## Current architecture state

```
[ Civic Atlas (Next.js, this repo) ]
         │
         │ /api/v2/theseus/open-flint-atlas/* (REST proxy w/ local fallback)
         │ /api/graphql/open-flint-atlas    (urql client, NOT YET CONSUMED)
         ▼
[ Theseus / Index-API (Django, Railway) ]
   - REST atlas endpoints     [LIVE — returns 217 places (134 tracts + 74 parks + 9 wards), 8 sources, 4 signals]
   - GraphQL endpoint         [SCAFFOLDED with stub resolvers, returns shape-valid empty data]
   - Strawberry schema mirrors flint-graphql-schema-v1.graphql
```

**Architecture clarification from Travis this session:** Theseus is **not**
the civic atlas backend — it's a data service (web fetch, search kernel,
knowledge graph). A real Civic Atlas backend needs to be designed and
extracted as its own service, and the Strawberry GraphQL app currently in
`Index-API/apps/open_flint_atlas_graphql/` should move there. Theseus becomes
ONE upstream of that new backend (alongside OSM, City of Flint GIS, Library
of Congress, etc.).

## Dev servers (live now, running via preview_start)

| Server | Port | Server ID | URL |
|---|---|---|---|
| atlas-next | 3000 | `814be185-9758-47f9-b50a-31557f3e8744` | http://localhost:3000/open-flint-atlas |
| theseus-django | 8000 | `f3ad9a9e-bb0f-4a5e-b6c5-9a1880d97da3` | http://localhost:8000/api/graphql/open-flint-atlas |

`.claude/launch.json` lives in TWO places — the canonical one used by
`preview_start` is at the cwd it reads from:

- **`/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org/.claude/launch.json`** (Obsidian vault cwd, ACTIVE)
- `Open-Flint-Atlas-main-release/.claude/launch.json` (atlas repo copy, documentation)

Both have 4 server configs: atlas-next, theseus-django, theseus-ui-next, context-theorem-ui-next. Trim if needed.

## Files changed this session (ALL UNCOMMITTED)

### Atlas repo: `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas-main-release/`

**New files:**

| Path | Purpose |
|---|---|
| `docs/design/flint-graphql-schema-v1.graphql` | Shared GraphQL contract — schema source of truth |
| `docs/design/ghost-palette-preview.html` | Porcelain palette visual preview |
| `docs/design/lost-flint-mockup-v1.html` | Earlier mockup (now superseded by real 3D layer) |
| `docs/design/visual-grammar-v1.md` | Color tokens, confidence rules, jargon ban |
| `docs/notes/session-2026-05-17-graphql-and-3d-buildings.open.md` | **This file** |
| `src/lib/api/graphql/client.ts` | urql server-side client singleton |
| `src/lib/api/graphql/queries/*.graphql` | 8 query files: manifest, search, places, dossier, signals, historical, provenance, sources, events, observation |
| `src/lib/api/graphql/generated/*` | codegen output (4 files, eslint-ignored) |
| `src/lib/api/theseusClient.ts` | REST proxy helper w/ `fetchTheseusOrFallback` |
| `src/lib/atlas/historical-reconstruction.ts` | `HistoricalReconstruction` type + 3-item seed data + GHOST_PALETTE constants |
| `src/components/atlas/AtlasBuildingsLayer.tsx` | `AtlasOsmBuildingsLayer` + `AtlasLostFlintLayer` |
| `src/data/open-flint-atlas/fixtures/osm-buildings.json` | 6671 real Flint building footprints, OSM/ODbL |
| `scripts/fetch-osm-buildings.mjs` | Overpass query, re-runnable |
| `codegen.ts` | graphql-codegen config |
| `.claude/launch.json` | preview_start config (atlas-repo copy) |

**Modified files:**

| Path | What |
|---|---|
| `eslint.config.mjs` | Ignore `src/lib/api/graphql/generated/**` |
| `package.json` | +deps urql, @urql/next, graphql, @graphql-codegen/cli + plugins. +scripts codegen, codegen:watch |
| `src/app/api/v2/theseus/open-flint-atlas/[[...path]]/route.ts` | manifest/sources/places/signals/search/provenance now try Railway via `fetchTheseusOrFallback`, fall back to local fixtures |
| `src/components/atlas/AtlasThreeScene.tsx` | Import + render `AtlasOsmBuildingsLayer` and `AtlasLostFlintLayer` inside Canvas, between AtlasAreaSurfaces and HorizonPortals |

### Theseus repo: `/Users/travisgilbert/Tech Dev Local/Creative/Website/Index-API/`

**New files:**

| Path | Purpose |
|---|---|
| `apps/open_flint_atlas_graphql/__init__.py` | Empty |
| `apps/open_flint_atlas_graphql/apps.py` | Django AppConfig |
| `apps/open_flint_atlas_graphql/schema.py` | Strawberry types matching flint-graphql-schema-v1.graphql, 12 query resolvers + submitObservation mutation, ALL STUBBED (return empty/placeholder) |
| `apps/open_flint_atlas_graphql/urls.py` | `AtlasGraphQLView` with `graphql_ide` class attr gated by DEBUG |

**Modified files:**

| Path | What |
|---|---|
| `config/settings.py` | +1 line: `'apps.open_flint_atlas_graphql'` in INSTALLED_APPS |
| `config/urls.py` | +4 lines: mount `/api/graphql/open-flint-atlas` to new app |
| `requirements.txt` | +1 line: `strawberry-graphql[django]==0.315.5` |
| `docs/codebase-map.md` | +44 lines: GraphQL API (Civic Atlas) section in API Surface Map, +TOC autoregen entry |

## What works

- **REST proxy to live Theseus**: `GET /api/v2/theseus/open-flint-atlas/manifest` returns real Theseus data (217 places etc.) when atlas dev server is running. Falls back to local fixtures on Railway errors.
- **GraphQL client codegen**: 12 typed operations, typecheck + lint + build clean.
- **Theseus Strawberry endpoint**: `manage.py check` clean, `schema.execute_sync('{ manifest { atlasId placeCount } }')` returns shape-valid data.
- **OSM fetch**: `node scripts/fetch-osm-buildings.mjs` pulls 6671 Flint buildings from Overpass in ~1.4s.
- **Discovery_run**: Travis ran on Railway. 4 admitted of 10 attempted from dev-mesh frontier (arxiv, github, mdn, pubmed, etc.). Wrong frontier for civic history — known gap, smart router deferred.

## What's BROKEN — pick this up first

**Building layers (`AtlasOsmBuildingsLayer` + `AtlasLostFlintLayer`) compile clean but don't render visibly in the 3D scene.** Travis confirmed nothing visible despite hard refresh. Visual evidence: ward extrusions render fine, my new layers don't.

Code state at end of session:

- `Vector2(x, -z)` in `buildExtrudedShape` (fixed Z double-negation after rotation)
- `HEIGHT_SCALE = 0.35` (6m → 2.1 scene units, comparable to ward extrusion height)
- `LOST_FLINT_FOOTPRINT_BOOST = 8` (Lost Flint placeholders ~0.3 scene units wide, supposedly visible from oblique)
- typecheck + lint + build clean
- Components imported correctly in `AtlasThreeScene.tsx` (line near 1419)

**Diagnostic candidates for next session, in priority order:**

1. **Browser console errors?** Open devtools. Look for runtime errors from `AtlasBuildingsLayer.tsx`, `mergeGeometries`, or JSON import. Highest-yield check.
2. **Is `scene` mode actually rendering AtlasThreeScene?** Travis's screenshot showed extruded wards which IS R3F output, so this is likely yes — but confirm by checking `[data-atlas-renderer="r3f"]` attribute on the container div.
3. **Did Turbopack pick up the new component?** Stop dev server. `rm -rf .next/`. `npm run dev` fresh. Hard refresh.
4. **Is `mergeGeometries` returning null?** Add `console.log('merged geom:', merged)` near the `useMemo` return in `AtlasOsmBuildingsLayer`. If null, the merge is failing.
5. **Is `isFeatureInBounds` filtering everything out?** Add `console.log('feature count after bounds filter:', features.length)`. Compare to 6671.
6. **Is the projection's `bounds` what we expect?** Log `projection.bounds`. Should span Flint city (~-83.83 to -83.58 lng, 42.94 to 43.13 lat). If it's collapsed, every feature fails the bounds check.
7. **Is the rotation actually working?** Build a single test cube without any rotation, position at Carriage Town coords, color it red. If THAT shows up, rotation is the bug. If it doesn't, the projection or positioning is.
8. **Geometry merge attribute mismatch.** ExtrudeGeometry produces position+normal+uv; the merge might fail if any feature has different attributes. Try `mergeGeometries(geometries, true)` (useGroups), or skip merge and render first 100 buildings as individual meshes for the diagnostic.
9. **Material/lighting issue.** Replace `meshStandardMaterial` with `meshBasicMaterial color="#ff00ff"` (full unlit hot pink). If that's invisible too, geometry is wrong; if visible, lighting/material is the issue.
10. **Building rendering BUT behind ward surfaces.** Wards are at low y (0.04-0.1). Building bottoms at y=0.001, tops at y=height. Should stick up through wards. But check material `depthTest` and `transparent` — if wards are transparent and rendered after buildings, occlusion is weird.

**Quickest diagnostic single-step:** add a single bright-magenta unrotated `<mesh position={[0, 5, 0]}><boxGeometry args={[10, 10, 10]} /><meshBasicMaterial color="#ff00ff" /></mesh>` inside the Canvas, AFTER `<AtlasAreaSurfaces>`. If THAT is visible from oblique zoom, the scene works and the bug is layer-specific. If not, something else is broken.

## Architecture clarifications captured this session

| Item | Clarification |
|---|---|
| Theseus role | Data service (web fetch, search kernel, knowledge graph). Not the civic atlas backend. |
| Civic Atlas backend | Doesn't exist yet. Needs to be designed + extracted. Owns review queue, contribution intake, scene foundry asset index, dossier composition, scoring. |
| GraphQL location | Currently in Theseus (`apps/open_flint_atlas_graphql/`). Should move to new Civic Atlas backend once that exists. |
| Schema curation | Schema is the curation boundary. Off-schema Theseus content cannot leak through. |
| gRPC vs GraphQL | GraphQL for atlas (browser-facing). gRPC for service-to-service. Defer gRPC for now. |
| Brush/Burn → WASM | Real plan for splat rendering in browser. Later track. Placeholder porcelain boxes for now. |
| Smart query router | Deferred until building design is solid. Civic-history mesh entries (Wikipedia, LOC Sanborn, OldFlint, Newspapers.com) tabled with it. |
| Renderer choice | deck.gl for everything (mobile + web data layers). R3F for 3D scene + Brush splats + IFC. MapLibre for basemap tiles. Three.js / R3F is parked as standalone but used via R3F. |

## Open todos (transferred)

1. **User verifies fixed building render in browser** (in progress, blocking)
2. **Design + extract Civic Atlas backend** (separate service from Theseus)
3. **Relocate Strawberry GraphQL endpoint** from Theseus to new backend
4. **Smart query router** (deferred — after building design)
5. **Tune height scale + porcelain shader** after visual feedback
6. **Brush+Burn → WASM splat renderer** (replaces porcelain placeholder boxes)
7. **Manual seed civic sources** (Wikipedia, LOC Sanborn, OldFlint) once new backend exists
8. **Migrate manifest consumer** to GraphQL with REST fallback (after real Theseus resolvers)
9. **Wire real Theseus resolvers** to existing services (search_kernel, geoparsing, etc.)
10. **OSM camera bookmark** — "Carriage Town close-up" preset in scene-view.ts

## How to resume

1. Read this file (`/catchup` will surface it).
2. Confirm dev servers up: `mcp__Claude_Preview__preview_list`. If down, `preview_start atlas-next` + `preview_start theseus-django`.
3. Open `http://localhost:3000/open-flint-atlas`, switch to scene/3D mode.
4. Open browser devtools. Walk the diagnostic list above for the building visibility bug.
5. Once buildings visible, tune height/footprint/porcelain shader.
6. After visuals locked, design Civic Atlas backend extraction.

## Repo states

| Repo | Branch | Status |
|---|---|---|
| `Open-Flint-Atlas-main-release/` | `main` | ~14 untracked files + 3 modified, all this session, uncommitted |
| `Index-API/` | (unchecked) | 4 new files in `apps/open_flint_atlas_graphql/` + 4 modified (settings, urls, requirements, codebase-map), uncommitted |

No commits made this session per instructions ("commit only when asked").
Travis is the one who decides when to land any of this.
