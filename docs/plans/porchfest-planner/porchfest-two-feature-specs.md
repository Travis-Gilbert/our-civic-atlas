# PorchFest planner: two feature specs

Both confirmed on deck.gl. The figures are already a deck.gl SimpleMeshLayer, so neither feature introduces a renderer; they extend what exists. No frontend commits from this surface; hand to Claude Code or Codex.

## Renderer framing

The atlas and planner consolidate on deck.gl. The Atelier scene stays as the single R3F island on its own route and does not touch the atlas. Live photoreal Gaussian-splat reconstruction is treated as not a near-term requirement, recoverable later as 3D Tiles inside deck.gl (`Tile3DLayer`) or a dedicated splat island without blocking this work. `renderer-stack-integration.md` is rewritten to match once Travis gives the word; it currently sets R3F as the V1 target with deck.gl as fallback, which is now the wrong direction.

---

## Feature 1: Submission to figure

Today the planner renders one procedural mesh per category. This gives each submission a fitting figure, lets the organizer override it, and lets new figures be added without touching layer code.

### Deliverables

1. A figure library, a registry keyed by `figureKey`, each entry resolving to renderable geometry by one of two paths: a procedural definition (the current SimpleMeshLayer path) or a GLB asset URL (a ScenegraphLayer path). Seed it with the current per-category meshes as the category-default keys (vendor tent, musician figure, food truck), then extend with variants. Examples: `musician-solo`, `musician-band`, `musician-dj`; `vendor-tent`, `vendor-table`, `vendor-cart`; `food-truck`, `food-cart`, `food-grill`; entertainer figures keyed by `actType`. Adding a new figure is adding one registry entry plus its geometry or GLB, with no change to the layer.

2. A resolver, a pure function from a civic object to a `figureKey`, using `category` plus the discriminating schema fields (musician: `bandSize`, `genre`; vendor: `foodType`, `footprint`; entertainer: `actType`). It is deterministic and falls back to the category default when nothing more specific matches. No side effects, unit-testable on its own.

3. An organizer override, an optional `figureKey` field on the civic object, added to `civic-object-schema.ts` as a planning field. When set it wins over the resolver. It is editable from the selection card in the planner and surfaced as a column in the workspace.

4. Render integration, where the figure layer reads each placed civic object, resolves its key (override first, then resolver), and renders the matching geometry in one composite layer set, SimpleMeshLayer for procedural keys and ScenegraphLayer for GLB keys. Figures keep the per-category color, picking, and selection behavior already in place.

5. Per-submission decoration, included not optional: when a submission carries an image link, the figure shows a small billboard or label keyed to the same object (deck.gl IconLayer or TextLayer), so a specific vendor reads as itself and not only as its category archetype. Submissions with no image fall back to the category color and name.

### Acceptance criteria

1. A solo musician and a five-piece band, both placed, render visibly different figures with no manual step.
2. Setting the `figureKey` override on a selected submission changes its rendered figure immediately, with no reload.
3. Adding one GLB entry to the library and mapping a category or attribute to it makes that figure appear for every matching submission, with no layer-code change.
4. Every figure stays clickable, selects its civic object, and shows its planning state.
5. A submission with no location renders no figure and still appears in the workspace, consistent with the Address pending state today.

### Grounding

Extends `PorchfestAffordanceMeshLayer.ts` and `procedural-porchfest-meshes.ts`. Adds `figureKey` to `civic-object-schema.ts` as an optional planning field. The resolver lives beside the schema so the contract and the mapping travel together.

---

## Feature 2: Drag-and-drop ingestion and export

A team-facing front door: drop a file onto the planner and it ingests, with a preview before anything is written, plus an export that reflects live state. This is the same surface as the CSV import runner already on the close-out list, so they are one thing.

### Deliverables

1. A drop target on the planner. Dragging a file onto the planner surface, or a dedicated import panel, opens an import flow. Accepted types are CSV (submissions) and KML or GeoJSON (geometry and event layers). The type is detected from the file, not chosen by the user first.

2. CSV ingestion that parses the file, maps columns to civic-object fields through the existing `IMPORT_FIELD_ALIASES` so legacy Formspree exports map without manual relabeling, and produces draft civic objects across the four categories.

3. A preview-and-confirm step. Before anything is written, the flow shows what was detected: the record count, the per-category breakdown, and the dedup result against existing objects keyed by `email` (the schema dedup key), flagging which rows are new and which collide. Nothing enters the store until the team confirms.

4. Commit to the store. On confirm, new civic objects are written into the Yjs civic-object store, the same store the workspace and map read, so imported submissions appear in both at once. Colliding emails update or are skipped per the team's choice in the preview, never silently duplicated.

5. Geometry ingestion. KML or GeoJSON dropped on the same target adds an event layer through the existing KML-to-event-layer path, so boundaries, zones, and routes import the same way.

6. Export. An export action produces a file from current state. CSV exports the civic objects with their planning fields, a clean round-trip of the data. GeoJSON exports the placed objects with their coordinates and category, for GIS and sharing. Export reflects live state at the moment it runs.

### Acceptance criteria

1. Dropping the surviving Formspree CSV shows 76 records, the 54 musician, 14 entertainer, 8 other split, and the duplicate entertainers flagged as collisions before any write.
2. Confirming the import makes those submissions appear in the workspace table and, once located, as figures, with no duplicate emails created.
3. Dropping a KML file adds its features as an event layer on the map.
4. Running CSV export downloads a file that re-imports with zero new records, so the round-trip is lossless on the shared fields.
5. Running GeoJSON export downloads placed objects with coordinates that open correctly in a GIS tool.

### Grounding

Reuses `IMPORT_FIELD_ALIASES` and the existing KML import. Writes to the Yjs civic-object store. Dedup uses `email`. The drop target is the team-facing surface for the CSV import runner, so build them as one.

---

## What these depend on

Both read and write the civic-object store. Feature 2 writing imported objects, and Feature 1's override field, both assume that store is the live one. They function today against the local IndexedDB store, but multi-organizer use and a shared map-and-workspace store still wait on Phase 1, RustyRed serving Yjs over the wire. These two features do not need Phase 1 to be built and demoed locally; they need it to be true for more than one machine.
