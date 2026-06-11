# PorchFest figures + ingestion: implementation plan

Source specs (committed beside this plan):

- `porchfest-two-feature-specs.md` (Feature 1: submission to figure; Feature 2:
  drag-and-drop ingestion and export)
- `porchfest-consolidation-and-engine-hook.md` (grounding: real source data,
  gaps A-G, Theseus hook; informs but does not expand this plan's scope)
- `porchfest-kmz-audit-2026-06-11.md` (attached KMZ evidence: Google My Maps
  NetworkLink wrapper, 92 point features, 9 line features)

Maintainer of this plan: Claude Code. Codex lane defined in section 3.
Coordination room: `repo:open-flint-atlas-main-release:branch:main` (harness
intents); the working tree is the fallback substrate.

## 1. Grounding: what exists (verified in-tree, 2026-06-11)

| Spec dependency | Reality |
|---|---|
| Per-category procedural meshes | `src/lib/atlas/procedural-porchfest-meshes.ts`: unit-form builders keyed by `AtlasEventPlannerCategory`, module-scope geometry cache, `[-0.5,+0.5]` convention, base at z=-0.5 |
| Category mesh layer | `src/components/atlas/PorchfestAffordanceMeshLayer.ts`: one `SimpleMeshLayer` per category, `AFFORDANCE_SIZE_M` per category, `CATEGORY_COLOR`, picking, selected lift |
| Civic object schema | `src/lib/civic/civic-object-schema.ts`: 42 columns, `IMPORT_FIELD_ALIASES`, email noted as dedup key, `location` as planning field |
| Civic rows on the map | `src/lib/civic/civic-map-binding.ts`: `CivicMapRow -> CivicMapPlacement`, category map musician->music, vendor->vendor, entertainer/other->amenity |
| Store API (browser) | `src/lib/civic/civic-editor-loader.ts` `CivicStoreApi`: `insert`, `list`, `update`, `ingestLedgerRows` (dedup by `sourceId`), `onChange` |
| CSV parsing + mapping | `src/lib/civic/formspree-import.ts`: full CSV parser, header normalization, alias map, category inference, per-row `missingFields` + `droppedKeys`. Already the heart of Feature 2's CSV path |
| KML category strategy | `scripts/kml-to-event-layer.mjs`: folder-name + label-rule category mapping for Google My Maps exports. Node-only today, Point-only today |
| Attached KMZ map | `porchfest-kmz-audit-2026-06-11.md`: local KMZ is a NetworkLink wrapper; live My Maps payload has 101 placemarks, including 9 LineStrings for closures/barriers |
| Planner surface | `src/app/porchfest/PorchfestPlannerClient.tsx`: `extraDeckLayers` stack, civic store binding, selection card, Applications (unplaced) panel, drag write-back via `pointGeometryToCivicLocation` |
| GraphQL placements | `Placement.geometry` is `GeoJSON!`; the schema comment says any PostGIS geometry is accepted (lines and polygons do not need a schema change) |

### Load-bearing hazard found during grounding

`ensureCivicDatabase` (`src/lib/civic/civic-workspace.ts`) creates schema
columns ONLY when `modelColumns(model).length === 0`. The live
`civic:porchfest-2026` doc already has 77 rows, so adding `figureKey` (or any
future column: `duration`, `venmo`, `geometry`, ...) to `CIVIC_OBJECT_COLUMNS`
would never materialize in production docs; `updateCivicObjectField` would
throw `Unknown civic field key`. Unit A fixes this once, for every future
schema addition: after the by-name self-heal, append any spec column that is
still unresolved (transacted `addCivicColumn` + key-map write). Risk noted:
two clients first-loading the new build concurrently could double-create the
column; the by-name self-heal then resolves both to one winner by list order,
and the organizer team is small; accepted.

## 2. Lane split

- **Claude Code: Feature 1** (submission to figure) plus the shared seams
  (schema field + column backfill), landed first so both lanes build on them.
- **Codex: Feature 2** (drag-and-drop ingestion + export). Section 5 is the
  Codex brief: the design decisions are made; execution is yours. If Codex
  shows no Feature 2 footprint by the time Feature 1 is done, Claude takes
  Feature 2 too.
- The ONE file both lanes touch is `PorchfestPlannerClient.tsx`. Protocol:
  small units, commit + push immediately, second-lander rebases. Claude's
  edits there: selection-card override + figure/decoration layer wiring.
  Codex's edits there: drop target + import panel mount (keep the panel
  itself in a new component so the client diff stays thin).

## 3. Feature 1 units (Claude)

### Unit A: shared seams (one commit, pushed before anything else)

1. `src/lib/civic/civic-figure-resolver.ts` (NEW, beside the schema per spec):
   - `CIVIC_FIGURE_KEYS` as const: `musician-solo`, `musician-band`,
     `musician-dj`, `vendor-tent`, `vendor-table`, `vendor-cart`,
     `food-truck`, `food-cart`, `food-grill`, `entertainer-stage`,
     `entertainer-dance`, `entertainer-art`, `marker`.
   - `resolveCivicFigureKey(fields): CivicFigureKey`, pure + deterministic:
     - musician by `bandSize`: `Solo` -> `musician-solo`; `DJ / electronic`
       -> `musician-dj`; `Duo`, `3-5 members`, `6+ members` -> `musician-band`;
       unset -> `musician-band` (category default).
     - vendor by `footprint` + `vendorNeeds` + `foodType`: footprint matching
       /truck/i or needs including `Parking for truck` -> `food-truck`;
       footprint /cart/i -> `food-cart` when `foodType` is non-empty else
       `vendor-cart`; footprint /table/i or needs including `Extra table` ->
       `vendor-table`; `foodType` non-empty without a stronger signal ->
       `food-grill`; default `vendor-tent`.
     - entertainer by `actType`: includes `Dance` -> `entertainer-dance`;
       includes `Visual Art / Chalk` -> `entertainer-art`; anything else ->
       `entertainer-stage`.
     - other -> `marker`.
   - `effectiveCivicFigureKey(fields)` = `fields.figureKey` when it is a known
     key (override wins), else resolver result. Unknown stored overrides fall
     back to the resolver rather than rendering nothing.
   - NO luma.gl import here: this module is consumed by the civic-editor
     esbuild bundle and by validators; geometry stays atlas-side (Unit B).
2. `civic-object-schema.ts`: add planning column
   `{ key: 'figureKey', name: 'Figure', type: 'select', options:
   CIVIC_FIGURE_KEYS, scope: 'planning' }` + the `figureKey?` field on
   `CivicObjectFields`. Workspace column and kanban pick it up from the one
   contract, per the schema's design.
3. `civic-workspace.ts`: the column backfill described in section 1.
4. Validators: extend `scripts/validate-civic-store.ts` (or sibling) to cover
   the backfill (open existing doc missing the column, ensure, assert column
   present + writable) and add resolver unit assertions.

### Unit B: figure library + render integration

1. `src/lib/atlas/porchfest-figure-library.ts` (NEW):
   - `FigureLibraryEntry` =
     `{ kind: 'procedural', build: () => Geometry, sizeM: [x,y,z] }` |
     `{ kind: 'glb', url: string, sizeM: [x,y,z] }`.
   - `FIGURE_LIBRARY: Record<CivicFigureKey, FigureLibraryEntry>` (typed
     exhaustive: adding a key without an entry fails typecheck; adding an
     entry is the spec's "one registry entry plus its geometry").
   - Seed: existing builders as category defaults (`musician-band` -> music
     band cluster, `vendor-tent` -> market stall, `food-truck` -> food truck,
     `marker` -> amenity post). New procedural builders in
     `procedural-porchfest-meshes.ts` for the variants: solo figure with
     guitar, DJ behind a deck table, vendor table, hand cart, grill stand,
     small stage performer, dance pair, easel. Same massing discipline as the
     module header: simple silhouettes, identifying detail only where it
     disambiguates.
   - Geometry cache keyed by figure key (same module-scope pattern).
2. `PorchfestAffordanceMeshLayer.ts`: placements gain optional `figureKey`.
   Grouping becomes by `figureKey ?? categoryDefaultFigure(category)`; one
   layer per distinct figure key; `SimpleMeshLayer` for procedural entries,
   `ScenegraphLayer` for glb entries (this is acceptance 3's mechanism).
   Color stays per-category (spec: figures keep category color), size comes
   from the library entry, falling back to `AFFORDANCE_SIZE_M`.
3. `civic-map-binding.ts`: `CivicMapPlacement` gains `figureKey`, set from
   `effectiveCivicFigureKey(row.fields)`. GraphQL placements carry none and
   keep category defaults: zero behavior change for non-civic pins.

### Unit C: override editing + decoration

1. `PorchfestPlannerClient.tsx` selection card: when the selected placement is
   civic-backed (`civicRowIdByPlacementId`), render a Figure select (Auto +
   the key list). Writing calls `civicApi.update(rowId, 'figureKey', value)`;
   the store change event re-binds and the mesh layers regroup: live, no
   reload (acceptance 2).
2. Decoration (spec deliverable 5, included not optional): a new
   `buildPorchfestFigureDecorations` in the mesh-layer module emitting, for
   civic placements only: a `TextLayer` name label above each figure (title,
   planner ink, Plex Sans, pixel-sized, lifted by figure height) and, when a
   link field on the object is a direct image URL (.png/.jpg/.jpeg/.webp/.gif),
   an `IconLayer` billboard keyed to the same object id. No image -> name +
   category color only (spec fallback). Labels respect category visibility
   toggles.
3. Workspace verification: `figureKey` appears as an editable select column
   (free via the schema + backfill; verify in the live workspace).

### Feature 1 acceptance mapping

| Spec acceptance | Where proven |
|---|---|
| 1. Solo vs five-piece band render differently with no manual step | resolver on `bandSize` + library variants; validate script asserts key resolution; preview hand check |
| 2. Override changes figure immediately, no reload | selection-card select -> store update -> onChange re-bind; preview hand check |
| 3. One GLB entry + mapping makes figures appear, no layer change | `ScenegraphLayer` branch; validate script builds a mixed registry and asserts layer classes per entry kind |
| 4. Figures stay clickable, select civic object, show planning state | unchanged picking props on both layer kinds; preview hand check |
| 5. No location -> no figure, still in workspace | existing unplaced behavior, untouched; re-verified |

## 4. Validation (Feature 1)

- `npm run typecheck`, `npm run lint`, `npm run build` (Vercel parity),
  `npm run build:civic-editor` (schema flows into the bundle).
- Existing: `validate:civic-store`, `validate:civic-map-binding`,
  `validate:civic-apply-bridge`, `validate:civic-ledger-ingest` (schema
  change ripple).
- New assertions (esbuild runner family, NOT tsx): resolver matrix
  (bandSize/footprint/actType cases + override + unknown-override fallback),
  column backfill on a pre-existing doc, layer-builder emitting
  SimpleMeshLayer vs ScenegraphLayer per entry kind.
- Browser hand check via the preview tools on `/porchfest`: place a solo
  musician and a band, toggle an override from the selection card, confirm
  labels and picking.

## 5. Feature 2 brief (Codex lane)

Design decisions are locked here so execution is mechanical; deviate only
with a note in this file.

1. **Import core** `src/lib/civic/planner-import.ts` (NEW, headless, validator
   friendly): file-kind detection (`.csv` or text sniff; `<kml` marker;
   GeoJSON via JSON parse + `type` check), CSV path reusing
   `parseFormspreeCsv` + `mapFormspreeRowsToApplications` verbatim, dedup of
   candidates against `CivicStoreApi.list()` rows keyed by normalized
   `email` (the schema dedup key), producing
   `{ records, perCategory, newRows, collisions }` for the preview step.
   Collisions carry the existing rowId so commit can update or skip per the
   organizer's choice. Nothing writes until confirm (spec deliverable 3).
2. **Commit step**: new rows via `api.insert` (status stays the imported or
   `submitted` value; `sourceId` from the import mapping so ledger ingest
   stays idempotent against it); collision resolution `update` writes only
   non-empty incoming fields onto the existing row via `api.update`; `skip`
   writes nothing. Never silently duplicate (spec deliverable 4).
3. **Geometry path**: port `FOLDER_TO_CATEGORY` + `LABEL_RULES` +
   `categoryFor` out of `scripts/kml-to-event-layer.mjs` into a shared module
   (`src/lib/civic/kml-event-layer-rules.ts`); browser parses KML with
   `DOMParser` (no new dependency), GeoJSON with `JSON.parse`. Commit creates
   GraphQL placements via the existing `createPlacement` mutation (geometry
   is `GeoJSON!`, lines and polygons included). Render gap to close: the
   planner currently renders Point meshes only; add a thin per-category
   `GeoJsonLayer` for non-Point placements (CATEGORY_COLOR stroke, no fill or
   low-alpha fill) so closures and barrier runs are visible (spec
   deliverable 5; the My Map has 9 line features).
4. **Export** `src/lib/civic/civic-export.ts` (NEW): CSV with headers =
   schema column KEYS (they normalize 1:1 through `FIELD_KEY_BY_NORMALIZED`,
   making re-import lossless, acceptance 4); GeoJSON FeatureCollection of
   placed objects with `category`, title, status, figure key in properties
   (acceptance 5). Browser download via Blob anchor.
5. **Surface**: `src/components/atlas/PlannerImportPanel.tsx` (NEW) owns the
   whole flow UI (dropzone state, preview table, per-collision choice,
   confirm, export buttons) in the existing `planner-panel` Observable
   register; `PorchfestPlannerClient.tsx` gets only: drag-over/drop handlers
   on the map container, an Import/Export entry point in the left column,
   and the panel mount. Keep the client diff small (collision protocol).
6. **Validator**: `validate:planner-import` (esbuild family): synthetic
   legacy-headers CSV -> preview counts -> commit -> re-export -> re-import
   shows zero new rows (round trip, acceptance 1 + 4 shape without the
   private CSV; the real 76-record check is a Travis hand step since the CSV
   is never committed).

## 6. Sequencing + collision protocol

1. Claude lands this plan + Unit A, pushes (everything else keys off it).
2. Claude proceeds B then C; Codex starts Feature 2 on the pushed Unit A.
3. `PorchfestPlannerClient.tsx`: second lander rebases; both lanes keep their
   client edits minimal and component-extracted.
4. Both lanes re-check room intents (or `git log origin/main`) before each
   unit; whoever finds the other mid-file on the same region waits or mentions.

## 7. Relation to the outstanding gate board (unchanged by this plan)

RG-2's ops/protocol side is now deployed and production-validated; the remaining
RG-2 item is the browser/user-surface hand check. RG-3 (Square credentials + one
live payment) and RG-4's workspace auth decision stay as recorded in
`CLAUDE.md`; nothing here blocks on them. Both features work against the
local-first store today and become multi-organizer through the deployed
RustyRed/YCRDT path (spec section "What these depend on"). The consolidation
doc's gaps A-G and the Theseus hook are explicitly OUT of this plan's scope
except where Feature 2's preview step is built as the seam the engine will
later propose into (no engine code now).

## 8. Design-gate conformance

No new visual register is introduced. New figures follow the locked
procedural-mesh discipline (module header: simple massing, recognizable
silhouettes, detail only where identifying) and keep `CATEGORY_COLOR`. The
import panel and selection-card select use the existing `planner-panel`
Observable components and tokens (`atlas.css`). Decoration labels use planner
ink + IBM Plex Sans per the Path B register. These are extensions inside
approved systems; the specs themselves carry the visual decisions (figures
keep category color; decoration is IconLayer/TextLayer billboard).
