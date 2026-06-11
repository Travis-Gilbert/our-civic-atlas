<!-- project-template: 48 -->
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Companion docs

This file is the practical "how to operate" guide. The companion doc is `AGENTS.md` (the project's posture/conventions doc, also used by Codex). Read both at session start. `AGENTS.md` owns: the public-good framing, the multi-tenancy invariant, the service-tier-auth rule, jargon bans, renderer-stack decisions, and the context/compaction policy. This file owns: commands, code architecture, fixture/backend split, and the few seams Claude needs to know before touching anything.

`README.md` is a 10-line pointer file. `SPEC-THE-ATELIER.md` (root) is the 304-line spec for the currently-shipping Atelier feature. The Atelier plan tree at `docs/plans/the-atelier/` is the post-BUILD truth.

## Commands

### Daily dev loop

```
npm run dev          # Next.js 16 dev server (Turbopack-ready, port 3000)
npm run build        # Production build
npm run start        # Serve production build locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit; run after any non-trivial change
```

### GraphQL codegen

```
npm run codegen        # Generates src/lib/api/graphql/generated/ from
                       # docs/design/flint-graphql-schema-v1.graphql
                       # and all src/**/*.graphql operation files
npm run codegen:watch  # Same in watch mode
```

Run `codegen` after editing the schema or any `.graphql` query file. The generated types are consumed by the urql client (`src/lib/api/graphql/client.ts`) and by hooks that import from `@/lib/api/graphql/generated/graphql`.

### Validation suite

The repo carries an unusual cluster of `validate:*` scripts that gate visual/data correctness. None of them are wired into pre-commit hooks — run them manually after the changes they cover.

```
npm run validate:atlas                    # Composite: static-atlas + visual-grammar + dossier
npm run validate:visual-grammar           # Checks scoped tokens + semantic states
npm run validate:dossier                  # Checks dossier payload schema
npm run validate:dossier:live             # Same, hits http://localhost:3000
npm run validate:routes:live              # Playwright smoke on /open-flint-atlas/* routes
npm run validate:reconstruction-node-tree # Pascal-tree adapter (Lost Flint / Atelier)
npm run validate:scene-manifest
npm run validate:scenario-manifest
npm run validate:primitive-library
npm run validate:geo-comments
npm run validate:layer-recipes
npm run validate:urban-model              # Form decomposition + classifier outputs
npm run validate:time-travel              # Year-filter behavior on reconstructions
npm run validate:civic-store              # Civic-object BlockSuite/Yjs store round-trip + convergence
npm run validate:civic-apply-bridge       # Apply form state -> GraphQL input + civic row
npm run validate:civic-ledger-ingest      # eventApplications ledger rows -> civic rows
npm run validate:civic-map-binding        # Civic rows -> map placement contract (both directions)
npm run validate:formspree-import         # Private CSV -> intake mutation tooling
npm run validate:yjs-sync                 # Two Yjs clients converge through a live rustyred-server
```

After editing `LostFlintGeometries.ts`, the urban design model, or anything touching the dossier payload, run `validate:atlas` at minimum. After touching `src/lib/civic/` or `src/civic-editor/`, run the four `validate:civic-*` scripts. The `validate:civic-*` scripts run through esbuild (NOT tsx): BlockSuite 0.22 ships raw TypeScript that needs `useDefineForClassFields=false` (`scripts/tsconfig.civic-validate.json`).

### Civic editor bundle

```
npm run build:civic-editor   # esbuild + vanilla-extract -> public/civic-editor/ (gitignored)
```

The embedded BlockSuite workspace editor compiles OUTSIDE the Next build (chained into `npm run build`) because BlockSuite publishes raw TS whose view barrels execute vanilla-extract `.css.ts` at import. Routes load the bundle via a module script tag and the `window.__civicWorkspace` bridge. Never import BlockSuite directly from Next code; `src/lib/civic/civic-workspace.ts` is the headless-safe exception (store-layer writes via `model.props`), and `tsconfig.json` excludes the BlockSuite-importing files from the repo typecheck.

### Starter data

```
npm run atlas:starter   # Regenerates fixture data under src/data/open-flint-atlas/
```

## Architecture: the seams that matter

### Next 16 App Router conventions

- `params` in dynamic routes is `Promise<{ key: string }>` — must `await` before reading. See `src/app/open-flint-atlas/atelier/[parcelId]/[year]/page.tsx` for the canonical pattern.
- All atlas routes live under `src/app/open-flint-atlas/`. Two scoped layouts inside:
  - `src/app/open-flint-atlas/layout.tsx` wraps everything in `.civic-atlas` and imports `atlas.css`
  - `src/app/open-flint-atlas/atelier/layout.tsx` wraps the atelier subroute in `.atelier-theme` and imports `atelier.css`
- Children of atelier routes get both classes; CSS scoping in `atelier.css` uses `.atelier-theme ...` selectors so it cascades cleanly.

### Visual register split (binding)

Two scoped CSS registers, one per surface. Since 2026-06-11 the atlas runs
the Observable cool register (Path B edition redesign, sources at
`docs/Design update/`):

| Scope class | Tokens file | Where | Palette |
|---|---|---|---|
| `.civic-atlas` | `src/app/open-flint-atlas/atlas.css` | All atlas routes (default) | Observable cool: pure white surface, near-black ink (`#1c1c1c`), light-gray hairlines (`#e2e2e2`), navy action (`--ctx-accent #005186`), syntax-purple civic writes (`--ctx-commit #6636b4`) |
| `.atelier-theme` | `src/app/open-flint-atlas/atelier/atelier.css` | Only `/open-flint-atlas/atelier/*` routes | Warm graphite paper (`--atelier-paper #26221c`), deliberately untouched by Path B |

Type: Fraunces (display, `.font-display` only) + IBM Plex Sans variable
pinned to the SemiCondensed width (`--font-plex-width: 87.5%`); the "mono
surface" is the same family via uppercase + tracking. Navy is the single
most important action per screen; data-semantic reds (traffic-heavy,
priority heat, value ramps) and the `--atlas-*` categorical map palette
were deliberately retained. The embedded BlockSuite editor themes through
`src/civic-editor/civic-editor-theme.css` (affine vars -> Observable).

The atelier inverts the surface, NOT the building material. Historical reconstructions render in the ghost porcelain palette (`GHOST_PALETTE` in `src/lib/atlas/historical-reconstruction.ts`) regardless of which surface mounts them. See `docs/design/atelier-visual-register-proposal.md` for the locked design decisions and `docs/design/visual-grammar-v1.md` for the underlying ghost-palette contract.

### GraphQL is the only boundary

The frontend talks one boundary: the schema at `docs/design/flint-graphql-schema-v1.graphql`. NEVER add a Next.js Route Handler under `src/app/api/` that holds a service-tier credential (Theseus harness token, Rusty Red key, Modal/Ray, OpenAI, Firecrawl, etc.). When you need an upstream capability:

1. Add the field to the GraphQL schema
2. Run `npm run codegen`
3. Write a `.graphql` query file under `src/lib/api/graphql/queries/`
4. The resolver lives on the Axum (or Node sidecar) service in `our-civic-atlas-backend`

`AGENTS.md` lines 22-35 are binding on this. The canonical worked example is the `civicResearch` mutation (`docs/plans/lane-4-strategic-seams/civic-research-graphql-coordination.md`). Route Handlers under `src/app/api/` are reserved for local fixture shims and trivially public endpoints.

### Building geometry: single source of truth

`src/components/atlas/LostFlintGeometries.ts` is the canonical building geometry for ALL Lost Flint reconstructions. It returns `@luma.gl` `Geometry` instances spanning `[-0.5, +0.5]` for flat, gable, and hipped roof variants. Two consumers:

- `src/components/atlas/AtlasLostFlintDeckLayer.ts` uses these geometries directly in deck.gl `ScenegraphLayer` and the custom `ConfidenceMixMeshLayer`
- `src/components/atlas/atelier/AtelierR3FScene.tsx` bridges the same geometries to three.js `BufferGeometry` via `src/lib/atlas/luma-geometry-to-three.ts` (handles luma-z-up → three-y-up axis swap with winding-correct triangle reversal)

If you change `LostFlintGeometries.ts`, both the deck.gl Lost Flint overlay and the Atelier R3F scene re-render with the new shape. This is intentional — spec line 246 (atelier exit-transition continuity) depends on identical geometry across both renderers.

The historical bug fixed 2026-05-24: the prior `createFlatBoxGeometry` returned `@luma.gl` `CubeGeometry` (spans `[-1, +1]`) while gable/hipped used `[-0.5, +0.5]`. Flat-roof buildings rendered 2× too large. Now unified.

### Reconstruction data flow

```
src/lib/atlas/historical-reconstruction.ts    Type + Carriage Town fixture
  └─ used by:
      ├─ AtlasLostFlintDeckLayer.ts            deck.gl per-part confidence shader
      ├─ AtlasBuildingsLayer.tsx               R3F variant for the atlas
      ├─ atelier/AtelierR3FScene.tsx           Atelier R3F scene
      └─ atelier-fallback-synthesizer.ts       Synthesizes ReconstructionDossier
                                                from fixture when GraphQL resolver
                                                unreachable (dev only)
```

`useReconstructionDossier({ fallback: true })` returns synthesized data in dev, real GraphQL data in production. The synthesizer is HONEST: zero invented sources, real per-part confidences from fixture, empty conflict array. Surface area: `src/lib/atlas/use-reconstruction-dossier.ts`. The Pascal-node-tree at `src/lib/atlas/reconstruction-node-tree.ts` provides stable per-part `nodeId` strings (e.g., `reconstruction-node:historical:carriage-town:whaley-house:facade`) used as targets for conflict markers and dossier section dispatch.

### The Atelier (shipped 2026-05-24)

The Atelier is a new full-screen surface at `/open-flint-atlas/atelier/[parcelId]/[year]` plus its saved-id sibling `/open-flint-atlas/atelier/saved/[savedId]`. Spec at `SPEC-THE-ATELIER.md`. Plan tree at `docs/plans/the-atelier/` (5 files). Design proposals at `docs/design/atelier-visual-register-proposal.md` and `docs/design/atelier-animation-proposal.md`.

Surface code lives in `src/components/atlas/atelier/` (one component per concern: Surface, ChromeLabel, Controls, DossierPanel, EvidenceCard, ProvenanceLines, R3FScene, DustMotes, ConflictMarkers, ScenePlaceholder). Choreographer in `src/lib/atlas/atelier-choreographer.ts` + `use-atelier-choreographer.ts` React bridge. Per-stage timings locked in `atelier-stage-timings.ts`.

v1 SHIP gate (PT-602) is blocked-by-backend (`our-civic-atlas-backend` Axum needs to implement the resolvers per `docs/plans/the-atelier/graphql-contract.md`). BUILD gate ships against the fixture; the surface works end-to-end with honest "backend pending" notes when the resolver is unreachable.

### Mosaic + DuckDB-WASM cross-filter

The atlas uses `@uwdata/mosaic-*` + `@duckdb/duckdb-wasm` for cross-filter on the time histogram. See `getAtlasMosaic()` in `src/lib/atlas/mosaic.ts` and the histogram component at `src/components/atlas/AtlasTimelineHistogram.tsx`. The Mosaic timeFilter selection drives event-id filtering on the map without round-tripping the spatial layer through DuckDB.

### Civic Atlas event-planning platform (Porchfest 2026, built 2026-06-11)

The reusable event-planning layer that replaced the Formspree intake. Plan
tree: `docs/plans/porchfest-planner/implementation-plan.md` (Codex-maintained
gates) + the planner folder in the backend repo
(`our-civic-atlas-backend/docs/"Planning the planner "/`, note the trailing
space) holding the build plan, SCHEMA-CONTRACT.md (the shared field +
sync-protocol contract), REFERENCE.md (grounding hashes), and the BlockSuite
0.22.4 / AFFiNE reference checkouts under `Refs/`.

Two stores BY DESIGN, never bidirectionally synced:

- Capture ledger: Postgres `event_applications` + backup receipts (backend
  migration 0022; `submitEventApplication`). 75 recovered Formspree records
  are LIVE in production. Import tooling: `porchfest:import-formspree`
  (the private CSV is never committed).
- Planning store: civic objects as BlockSuite database rows over Yjs, doc
  `civic:porchfest-2026`, schema in `src/lib/civic/civic-object-schema.ts`
  (42 columns, the one contract intake/workspace/map all bind to). One-way
  ledger -> workspace ingestion keyed `sourceKey == sourceId`.

Surfaces: `/porchfest/apply` (4-stage Observable form), `/porchfest/workspace`
(embedded BlockSuite: applications table + kanban grouped by status, doc tabs
with Organizer notes + native todo lists, Square billing band), `/porchfest`
(planner map; civic objects render through the placement layers, drags write
`location` back to the CRDT store, Applications panel lists unplaced).

Realtime: yrs (y-crdt) sync server in RustyRed-Graph-Database
(`crates/rustyred-server/src/yjs_sync.rs`, WS
`/v1/tenants/:tenant_id/sync/yjs/:doc_id`) + `RustyRedDocSource` shadow peer
in the bundle, enabled by `NEXT_PUBLIC_RUSTYRED_SYNC_URL` (base up to
`/sync/yjs`). IndexedDB stays the local-first main source. The porchfest PWA
service worker caches dev chunks across dev-server restarts; unregister it
when an edit refuses to appear.

Remaining gates (post-2026-06-11 session):

1. RG-2 ops: deploy the RustyRed build with yjs_sync to Railway, set
   `NEXT_PUBLIC_RUSTYRED_SYNC_URL` on Vercel, two-browser hand check
   (protocol + local E2E already proven via `validate:yjs-sync`).
2. RG-3 verify: Square credentials in the deployed backend + one live
   payment through the workspace billing band (frontend + backend shipped).
3. RG-4: porchfestflint.com domain cutover to the PorchFest Vercel project
   (project configured in 6ddc58c) + the workspace AUTH decision (everything
   is currently no-login by design; ship gate).
4. Hardening follow-ups: batch/debounce yjs persistence (currently
   write-per-push), swap test-only TestWorkspace for a first-party Workspace
   impl, click-to-place from the planner unplaced panel (needs a map-click
   seam), doc deletion in the workspace tab strip, drag-gesture hand check
   (synthetic drags do not register in the verification harness).

## Design-gate (binding)

Per `AGENTS.md` + `~/.claude/skills/visual-work-design-gate/SKILL.md`, before writing any new visual surface or rebuilding an existing one (`.tsx`, `.css`, `.glsl`, shader, canvas, R3F, motion-design), the first tool calls must run the design specialists and produce a user-approved design proposal. For the Atelier the locked decisions live at `docs/design/atelier-visual-register-proposal.md` and `docs/design/atelier-animation-proposal.md`. For future surfaces, follow the same pattern: design proposal first, approved, then implementation.

## Backend boundary

This repo is the public Civic Atlas frontend. The backend is in a sibling repo at `our-civic-atlas-backend` (Axum + Postgres/PostGIS + gRPC client to Theseus harness). Backend resolvers do NOT live here. Atelier `graphql-contract.md` Extension 7 (`saveReconstruction` mutation + `savedReconstruction` query) is the most recent contract addition; resolvers tracked as PT-104, PT-104b in the atelier plan.

## Commits, branches, deploys

Per `~/.claude/CLAUDE.md` (user-global):
- Commits use `<type>(<scope>): <description>` with scope REQUIRED (e.g., `feat(atelier): ...`)
- NO em-dashes / en-dashes anywhere; use colons, periods, commas, semicolons, parentheses
- NO `Co-Authored-By` lines
- NO time/effort estimates in plans or commit messages
- NEVER skip hooks (`--no-verify`) unless user explicitly asks
- Always create NEW commits rather than amending

User has standing authorization to push to `main` on this project (no per-push permission needed).

## Where to look when you're stuck

| Question | Look at |
|---|---|
| Why does this CSS token exist? | `src/app/open-flint-atlas/atlas.css` (atlas) or `src/app/open-flint-atlas/atelier/atelier.css` (atelier); both files are heavily commented |
| Event-planning field schema or sync protocol? | `src/lib/civic/civic-object-schema.ts` + `our-civic-atlas-backend/docs/"Planning the planner "/SCHEMA-CONTRACT.md` |
| Why does BlockSuite live in a separate bundle? | `src/civic-editor/entry.ts` header comment + the Civic editor bundle section above |
| Event-planning remaining gates? | The platform section above + `docs/plans/porchfest-planner/implementation-plan.md` |
| What does this GraphQL field mean? | `docs/design/flint-graphql-schema-v1.graphql` (the schema is the contract) |
| Why does this building render this way? | `src/components/atlas/LostFlintGeometries.ts` (geometry) + `src/components/atlas/AtlasLostFlintDeckLayer.ts` (shader) |
| What's the visual contract for Lost Flint confidence? | `docs/design/visual-grammar-v1.md` |
| Why was THIS UI decision made? | `docs/design/lost-flint-ui-brainstorm-2026-05-21.md` (most prior decisions) + `docs/design/atelier-visual-register-proposal.md` (atelier-specific) |
| What's the post-BUILD status of the atelier? | `docs/plans/the-atelier/README.md` §"Execution status" |
| Backend resolver status? | `docs/plans/track-2-procedural-reconstruction-audit-2026-05-23.md` |
| Which plan supersedes which? | `AGENTS.md` line 36-39: `docs/plans/our-civic-atlas-north-star-execution-plan.md` is the active source of truth |
