# Unified first-class task system (CRDT-primary, GraphQL boundary)

Status: ACTIVE. Owner split: Claude Code (UI / map / kanban / CRDT plumbing)
+ Codex (civic:task schema half). Supersedes the standalone GraphQL
`eventTasks` *editing* path and Codex's list-only `civic:task` render.

## The decision (user-confirmed 2026-06-13)

The two task systems that exist today were meant to be ONE first-class system:

1. GraphQL `eventTasks` (Postgres) -> `PlannerTaskRail` + `PlannerTaskLayer`
   on the `/porchfest` map. Has placement/building/point anchors, progress,
   subtasks (`childIds`), owners, priority, status, Tiptap notes. Backend-bound;
   geo-anchor resolver flagged blocked-by-backend.
2. `civic:task` CRDT blocks (Yjs civic store) in `/porchfest/workspace`
   todo-list docs (Codex, `3ddcd12`). List rows only; no map, no kanban.

**Unify CRDT-primary, GraphQL as the one-way boundary. Never bidirectional.**
This mirrors the project's existing applications discipline ("two stores BY
DESIGN, never bidirectionally synced", CLAUDE.md).

- **CRDT (Yjs civic store) = system of record** for live task editing,
  kanban, and map placement. Rationale: tasks are collaboratively edited
  (toggle, reorder, drag-on-map, restatus) -> CRDT is conflict-free,
  real-time, offline, no-login. The store already (a) persists cross-device
  via the deployed RustyRed `yjs_sync` server, and (b) places civic OBJECTS
  on the map (applications: a drag writes `location` to the CRDT). Tasks
  inherit the proven model.
- **GraphQL = the single backend boundary** for what only the server can do:
  geocoding (address -> lat/lng against the Flint parcel GIS), reminders /
  notifications / email, a durable Postgres projection for reporting, and
  cross-system reads. The existing `eventTasks` schema is repurposed as this
  projection/capability surface, not a second editing path.
- **Sync direction is one-way:** CRDT -> GraphQL projection; GraphQL ->
  client for capabilities (geocode results) the CRDT consumes.

RECONCILED with `first-class-email-object-plan.md` (EM-### IDs), the authoritative
design for the block-to-map seam (read 2026-06-13). Corrections to the earlier
framing in this doc:

- Tasks-on-map IS **EM-041** ("retrofit civic:task onto the shared placement
  facet"). That plan lists EM-041 as a PROPOSED DEFERRAL; the user's directive
  PROMOTES it to priority.
- Placeable blocks render on the map as **figures** (`porchfest-figure-library` /
  `civic-figure-resolver`) through a new `bindPlaceableBlocksToMap()` that
  generalizes `bindCivicRowsToMap()` (EM-040), NOT through `PlannerTaskLayer`.
  `PlannerTaskLayer` + the GraphQL `EventTask` path is the LEGACY task-on-map
  system being retired by this unification.
- The shared placement facet (`coordinate:[lng,lat]` + anchor vocab) on the
  civic:task block spine is **co-owned with Codex's email lane** (EM-040 adds it
  to both `civic:email` and `civic:task`).

Reused, not rebuilt: `bindCivicRowsToMap` (generalized), the figure library, the
version-discriminated drag write-back, `planner-drop-anchor`, and `task-progress`
(math). The kanban + row redesign + task progress/subtasks are this plan's
net-new, task-specific additions not covered by the email plan; the two plans
meet only at the placement seam (EM-040/041).

The one schema sub-decision (Codex's domain): tasks stay `civic:task`
**blocks** (subtasks = block children, which civic-object rows cannot nest)
and GAIN geo + progress fields, rather than collapsing into civic-object rows.

## Coordination state

- Codex is LIVE in the working tree on `forgefest-google-workspace-email-sync`
  (modifies `docs/design/flint-graphql-schema-v1.graphql`, adds
  `src/lib/api/graphql/queries/event-email.graphql`). Claude Code keeps hands
  OFF `flint-graphql-schema-v1.graphql` until that lands; the GraphQL-boundary
  phase (UT-05x) is sequenced last for exactly this reason.
- The harness coordination substrate is read-only (compat). This plan doc is
  the durable shared contract; the git working tree is the live substrate.

## Owner split

| Lane | Owner | Files |
|---|---|---|
| Task UI: row + kanban + progress + subtasks | Claude Code | `src/civic-editor/civic-task-block.ts`, `civic-editor-theme.css`, new kanban view, workspace client |
| Map placement of tasks | Claude Code | reuse `PlannerTaskLayer` / `planner-drop-anchor`; new CRDT->task-node adapter; planner client wiring |
| civic:task schema (geo + progress fields) | Codex | `src/lib/civic/civic-task-schema.ts`, `civic-task-docs.ts` |
| GraphQL projection boundary (UT-05x) | Claude Code, sequenced after Codex email-sync lands | `flint-graphql-schema-v1.graphql`, new projection resolver (backend repo) |

## Phases + checklist (stable IDs)

### Phase 0 - TickTick row redesign (APPROVED, independent, schema-free)
- [x] UT-001 Add `--civic-task-*` / `--civic-priority-*` token block to `civic-editor-theme.css` (muted atlas-semantic palette; user-approved). DONE.
- [x] UT-002 Rewrite `civic-task-block.ts` row to the approved anatomy: priority-coded checkbox, status chip (re-skinned native select), friendly + overdue dates, tiered meta. Tokens only, no raw hex. Focus-visible + reduced-motion. DONE (incl. date-only local-parse fix).
- [x] UT-003 Validate: `build:civic-editor` (pass), `typecheck` (pass), `validate:civic-store` (pass); browser smoke on `/porchfest/workspace` (pass: priority colors, status chips, overdue date, friendly labels confirmed via computed styles + screenshot). `build` pending full run.

### Phase 1 - Schema unification (Codex domain; Claude consumes)
- [ ] UT-011 `civic:task` gains `location` (JSON {lng,lat}) + `address` (string), mirroring the civic-object contract (`CivicLocation` helpers reused).
- [ ] UT-012 `civic:task` progress: derive from child completion, or add explicit `completionPct`; confirm priority/owner/dueAt/status present (they are).
- [ ] UT-013 Doc helpers + validator coverage for the new fields (`validate:civic-store`).

### Phase 2 - Workspace task kanban (Claude)
- [ ] UT-021 Status-grouped board over `civic:task` blocks (To do / Doing / Blocked / Done), reusing the applications-kanban visual language + the approved card anatomy.
- [ ] UT-022 Drag-to-restatus writes `status` to the CRDT block.
- [ ] UT-023 Board reads/writes through the existing mounted civic bridge; no second Yjs client.

### Phase 3 - Map placement of tasks = EM-040 + EM-041 (Claude; co-owned with email lane)
- [ ] UT-031 Shared placement facet on the civic:task spine: real `coordinate:[lng,lat]` + anchor vocab (`geoAnchorKind`/`osmId`/`placementId`); `locationLabel` stays the human label. (EM-040; civic-task-schema.ts is Codex's file -> coordinate the additive field.)
- [ ] UT-032 `bindPlaceableBlocksToMap()` generalizing `bindCivicRowsToMap()`; addressed task blocks render as figures via `porchfest-figure-library` / `civic-figure-resolver`, NOT PlannerTaskLayer. (EM-040)
- [ ] UT-033 Drag-task-to-map via `planner-drop-anchor`; write `coordinate` back to the block (version-discriminated branch parallel to the civic-row version===-1 path). (EM-040)
- [ ] UT-034 Assign address -> coordinate auto-places the task; geocode through the GraphQL boundary (UT-05x). (EM-041)
- Build EM-040 with TASK as the first consumer (user prioritized tasks); email becomes the second consumer. Coordinate with Codex so `bindPlaceableBlocksToMap` is written once. Do Not Downgrade: the civic-row -> map figure path (`validate:civic-map-binding`) stays green.

### Phase 4 - Progress + subtasks (Claude)
- [ ] UT-041 Subtasks via `civic:task` block children (already supported); render nested rows + board rollup.
- [ ] UT-042 Progress bars via reused `PlannerProgressBar` + `task-progress` math, in row, card, and map icon.

### Phase 5 - GraphQL boundary (Claude; AFTER Codex email-sync lands)
- [ ] UT-051 One-way CRDT -> GraphQL projection contract for durability/reporting.
- [ ] UT-052 Geocode capability (address -> lat/lng) behind the GraphQL boundary (backend repo resolver).
- [ ] UT-053 Retire the standalone `eventTasks` editing path; map rail reads the unified model.

### Phase 6 - Close
- [ ] UT-061 Full validation suite + browser smoke (workspace kanban + planner map).
- [ ] UT-062 Peer-review the diff with Codex (cross-frontier) before any commit touching shared surfaces.
- [ ] UT-063 Encode the unification decision; report.

## Design gate

Row + card anatomy: `docs/design/civic-task-ticktick-redesign-proposal.md`
(APPROVED, muted palette). New surfaces (kanban board, map task markers,
progress) reuse the existing planner visual language (`PlannerProgressBar`,
`planner-tile`, `PlannerTaskLayer`, the applications kanban) + the approved
token block, so they stay continuous with the register. Extend the proposal
doc if a new visual decision arises.

## Validators

`build:civic-editor`, `typecheck`, `validate:civic-store`,
`validate:civic-map-binding`, `validate:civic-apply-bridge`, `build`, plus
browser smoke on `/porchfest/workspace` and `/porchfest`.
