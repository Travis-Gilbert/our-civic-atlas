# PorchFest information consolidation: sources, gaps, and the engine hook

Read date: 2026-06-11. The My Map and the operations workbook were publicly readable and were parsed directly. The first spreadsheet link is login-walled; share it as "Anyone with the link: Viewer" or export and drop it, and it gets folded in.

## 1. What the sources contain

### Google My Map: "Carriage Town Porch Fest 2026" (read via KML export)

| Layer | Features | Geometry |
|---|---|---|
| Music | 17 | points (Stage 1 through 7 and more) |
| Vendors | 44 | points, named (Happy Camper Ice Cream, Organic Infant's Clothing LLC, For the love of all crafts, Glass 4est, MCBO house, ...) |
| Public Restrooms | 20 | points |
| Trees and Landmarks | 8 | points |
| Parking | 3 | points |
| Requested Street Closures | 1 | line |
| Traffic Cones / Barriers | 8 | lines |

Two things this proves. First, the planner and the My Map disagree (planner shows Restrooms 1 vs the map's 20, Music 14 vs 17), so import is also reconciliation. Second, real planning data includes line geometry, closures and barricades, which the figure system cannot represent today.

### Operations workbook (read via xlsx export)

| Tab | Rows | Columns |
|---|---|---|
| porchfest Schedule | 15 | Artist, Activity type, Time, Location, Duration |
| Expenses | 39 | Expense details, Category, Budget, Paid by Grant, ... |
| Artist Venmo | 24 | name, Amount, Venmo, Cashapp, Paper check mailing address, Notes |
| Income | 35 | grants and packages with invoice dates and totals |
| Banners | 22 | sponsor, Banner Size, Location, Needs to be ordered, Sponsorship Amount |
| Volunteers | 7 | freeform |

Schedule locations are street-address strings ("316 W 1st Ave"), not coordinates, which is exactly what the planner's "Edit addresses" and Address-pending states exist for.

## 2. Migration mapping, source by source

1. **My Map.** The KML drops straight into Feature 2's geometry path, already specced. Point layers (Vendors, Music, Parking, Restrooms, Landmarks) become placed civic objects or infrastructure features. Caveat the spec's dedup does not cover: map pins carry no email, so matching a pin named "For the love of all crafts" to the existing civic object of the same name is a name-plus-proximity match, surfaced in the preview step for human confirmation, never automatic.
2. **Schedule tab** becomes planning fields plus a view. `setTime` exists on the schema; add `duration` (or reuse `setLength` for musicians) and `scheduleLocation` as the address string until geocoded. The view itself is Gap C.
3. **Artist Venmo tab** becomes payment-handle fields on musician objects: `venmo`, `cashapp`, `checkMailingAddress`. These feed Phase 6 payouts and stop living in a spreadsheet with money amounts next to them.
4. **Expenses and Income tabs** become a general ledger in the Postgres billing store (Phase 6's home), not just per-artist payments: grants in, expenses out, category, paid-by-grant flag. Surfaced as a workspace table view.
5. **Banners tab** becomes sponsor objects, Gap E, placeable on the map since banners have locations.
6. **Volunteers tab** becomes lightweight people records, Gap F.
7. **Google Docs notes** become documents in the docs surface, Gap A.

## 3. Gaps: what "all planning information lives here" still needs

A. **A docs surface.** There is none; the workspace mounts only the database block. BlockSuite is a document editor first, so this is mounting its page editor with a doc list and storing docs in the same Yjs store. Include inline references both ways: mention a civic object inside a doc, and open a doc from an object's card. This is the cheapest high-value gap and the destination for the Google Docs notes.

B. **Line and polygon planning objects.** Street closures, barrier runs, and eventually zones. Named choice, stated as the requirement: civic objects gain an optional `geometry` field carrying GeoJSON (Point, LineString, Polygon), with `location` kept as the point convenience. deck.gl renders these with PathLayer and PolygonLayer, and editable-layers already supports drawing and editing them, so the stack does not change.

C. **A schedule view.** Start as a time-sorted table view over the schedule fields plus a printable day-of export, which covers the operational need. A true calendar or timeline view in BlockSuite data-view is unconfirmed (flagged previously); confirm before promising it, and do not block on it.

D. **A money home.** The general ledger in the Postgres billing store, with income, expenses, and per-artist payouts, viewed from the workspace. Payment handles live on the objects; amounts live in the ledger; `billingRef` ties them.

E. **Sponsors as an object type.** Name, banner size, sponsorship amount, location, ordered flag. Placeable on the map.

F. **People and roles.** Volunteers, and porch hosts, who are implied by every "Porch" row in the schedule but exist nowhere as records. Lightweight: name, contact, role, optional linked address or object.

G. **Event as the container.** "Carriage Town Porchfest 2026" is one event; the generalized product is many events across many organizations, each an isolated workspace, map, docs, and ledger. The tenant-isolated ledger already points this way; the Yjs store and workspace need the same event scoping before this is a product rather than a deployment.

A through F are PorchFest-real, evidenced by the sources above. G is the productization step.

## 4. The Theseus hook: the auto-organizer

The original ambition, automatically sorting information, has a concrete first home here, and the seam already exists in the specs.

**Where it slots.** Feature 2's preview-and-confirm step is the interface: the engine proposes, the human confirms, nothing writes silently. That is the epistemic pattern, proposed versus accepted, applied to planning data.

**Three jobs, in order of nearness:**

1. **Entity resolution across sources.** "For the love of all crafts" exists right now as a CSV survivor in the "other" category and as a Vendors pin on the My Map, with no shared key, since pins have no email. Resolving that these are one entity, across CSV rows, map pins, schedule rows, and doc mentions, is exactly Theseus's competence, and email-key dedup cannot do it. Output: merge proposals with provenance in the import preview.
2. **Auto-structuring of dropped unstructured material.** Notes, emails, and docs dropped on the planner go through extraction and come back as proposed objects, field values, and links to existing objects, each carrying its source. The drop target from Feature 2 is the front door; this is what makes it a second brain rather than a filing cabinet.
3. **Gap demons and the organizer briefing.** Standing queries over the civic graph: accepted but unscheduled, scheduled at an address with no geocode, on the map but absent from the ledger, paid but unplaced. Theseus's structural and reactive layers do precisely this on its own graph, and the briefing pattern already exists as an endpoint shape. Output: a daily organizer briefing in the workspace.

**Architecture, stated honestly.** Projection, not rewiring. The civic-object Yjs store mirrors read-only into a Theseus graph; insights flow back as proposals with provenance; Theseus never becomes the store and never writes silently. This stacks on the same blocker as everything else: a server-side view of the store to project from, which is Phase 1, RustyRed serving Yjs over the wire. The nearest working version before that is a batch projection job reading exported state. Build jobs 1 and 3 first; they are graph work, which is the home turf.

**Why it matters beyond PorchFest.** The spatial-planning market has collaborative maps and has databases, but nothing that reads everything a team throws at it and proposes the organization. The engine is the differentiator for the geographic second brain, and it is the thesis of the whole ecosystem finally pointed at a paying-shaped problem.

## 5. Sequence reality

Nothing here jumps the queue. Phase 1 sync is still the backbone. The docs surface (A) and the schema additions (payment handles, geometry, schedule fields, sponsor and person types) are workspace-and-schema work that can land alongside the two specced features. The Theseus projection follows Phase 1. Sheet 1 gets folded in once it is shared or exported.
