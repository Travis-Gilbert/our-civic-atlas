# civic:task kanban board (Phase 2)

Design-gated proposal for the task **Board** view. Status: PENDING USER
APPROVAL. Extends the approved row/card language in
`civic-task-ticktick-redesign-proposal.md` (do not relitigate the card
visuals; this proposal adds the board arrangement, drag, and the view toggle).
Part of `docs/plans/porchfest-planner/unified-task-system-plan.md` (UT-02x).

## Why

`civic:task` blocks live in a todo-list doc as a linear list (the List view,
shipped in Phase 0). TickTick's second screenshot is a **kanban grouped by
status**. This adds a Board view over the same CRDT task blocks: columns by
status, cards you drag between columns to restatus. CRDT-primary; no schema
change (status already exists on the block).

## Routing intent + surface

- **Intent:** `uiFoundation` (board layout + cards + DnD). Screen archetype:
  **triage board** (sets density + interaction expectations).
- **Surface:** a React board in the workspace, toggled by a **List / Board**
  segment for todo-list docs, mirroring the existing applications **Table /
  Kanban** segment (`.civic-workspace-viewseg`). List stays the default (the
  BlockSuite editor); Board replaces the editor pane when selected.
- **Why React, not BlockSuite data-view:** the native data-view kanban groups
  **database rows**, but tasks are **page blocks** (so subtasks are block
  children). A React board reads the blocks through the bundle bridge and keeps
  the block model intact. (Recorded in the plan + memory.)

## Data flow (CRDT-primary, through the bridge)

New bridge methods (the React side never imports BlockSuite):

- `listTasks(docId?)` -> `{ id, text, status, priority, owner, dueAt, done,
  childCount, completion }[]` for the active/given todo-list doc.
- `updateTask(blockId, patch)` -> `store.updateBlock` (status on drop, etc.).
- `createTask(docId, { status })` -> `addCivicTaskBlock` seeded with the
  column's status (per-column add).
- `onTasksChanged(listener)` so the board re-renders on any CRDT change
  (local edits, other organizers, sync arrivals).

Drag-to-restatus and per-column add both write to the CRDT; other organizers
see it live (the store already syncs). This is the same write discipline as the
applications kanban, applied to blocks.

## Board anatomy

```
 To do  3        Doing  1       Blocked 1       Done  2
 +-----------+   +-----------+  +-----------+   +-----------+
 | [] Task   |   | [] Task   |  | [] Task   |   | [x] Task  |
 |  Jun 8 @m |   |  Today    |  |  @devon   |   |  (struck) |
 |  [====  ] |   |           |  |           |   |           |
 +-----------+   +-----------+  +-----------+   +-----------+
 | [] Task   |   + Add          + Add           | [x] Task  |
 + Add                                          + Add
```

- **Column header:** status label + count, in the status color (quiet tint
  underline or a small colored dot, not a heavy filled bar). Done column reads
  slightly dimmed.
- **Card:** the approved card from the row proposal, minus the status chip
  (status is the column). Shows priority-coded checkbox, title (plain text from
  the block), due (overdue red), assignee, progress bar (Phase 4) + subtask
  count. White, radius 8px, `--affine-shadow-1`, hover lift.
- **Per-column "+ Add":** creates a task seeded with that column's status
  (TickTick's per-column add).
- **Empty column:** quiet "No tasks" placeholder, not a blank void.

## Interaction + accessibility (design-engineering)

- **Pointer drag:** drag a card to another column -> `updateTask(id,{status})`.
  Drag affordance: cursor grab, the card lifts (shadow + 2deg? no -- keep flat,
  just shadow + slight scale 1.02), the target column shows an insertion tint.
- **Keyboard path is mandatory (DnD is not pointer-only):** each card keeps an
  accessible **move control** -- a small "Move" menu button (or the status
  select retained as a quiet control) so keyboard users restatus without a
  drag. Focus-visible rings on cards, the add buttons, and the move control.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` removes the
  lift/scale; the drop still works, just without the transition.
- **Checkbox** on the card toggles done (and, per the row rule, sets status
  done -> the card would move to the Done column on next render).
- Contrast: column headers + counts >=4.5:1; reuse the `--civic-*` tokens.

## Motion + performance budget

- Card lift 120ms, drop settle 140ms, both transform/opacity only; none under
  reduced-motion. Column lists virtualize only if a column exceeds ~100 cards
  (not expected for porchfest).

## What this proposal does NOT include (surfaced, not silently cut)

- **Progress bars on cards (Phase 4 / UT-04x):** the card reserves the slot;
  the bar fills in when the progress field/derivation lands. Shown in the
  mockup as the target.
- **Map placement (Phase 3 / EM-040/041):** unaffected by the board.
- **Reordering within a column:** v1 groups by status only; manual intra-column
  order is a follow-on (would need an order field on the block).

## Files

- `src/civic-editor/entry.ts` + `src/lib/civic/civic-editor-loader.ts`: the new
  bridge methods (`listTasks`/`updateTask`/`createTask`/`onTasksChanged`).
- `src/app/porchfest/workspace/CivicWorkspaceClient.tsx`: List/Board segment for
  todo-list docs + the React board component (or a new
  `CivicTaskBoard.tsx`), using `--civic-*` tokens.
- No `civic-task-schema.ts` change (status exists). Subtask/progress later.

## Validators

- `build:civic-editor`, `typecheck`, `validate:civic-store`.
- Browser smoke on `/porchfest/workspace`: toggle to Board, see status columns,
  drag a card across columns and confirm the CRDT status write + live
  re-render, per-column add, keyboard move, reduced-motion, focus rings.
- Do Not Downgrade: the List view (Phase 0) and the applications Table/Kanban
  stay intact.
