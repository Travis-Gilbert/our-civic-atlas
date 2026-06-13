# civic:task row redesign (TickTick visual language)

Design-gated proposal for rebuilding the `civic:task` block UI. Status:
PENDING USER APPROVAL. No visual code is edited until this proposal is
approved (per `AGENTS.md` design-gate + `~/.claude/skills/visual-work-design-gate`).

Backend object shipped by Codex in `3ddcd12` (`feat(workspace): add
first-class task lists`). This proposal only touches the **presentation**
of that object: the lit component `src/civic-editor/civic-task-block.ts`
and a new token block in `src/civic-editor/civic-editor-theme.css`. The
schema, store, doc helpers, and view registration are untouched.

## Why

Codex made `civic:task` a real persisted block flavour. Its current render
is a placeholder: a native navy checkbox, a wrapping row of uppercase-mono
gray meta pills (priority, owner, startsAt, dueAt, contact, location,
amount, all the same weight), and a pill-shaped `<select>` for status. It
reads as a debug dump of the schema, not as a task. The user wants it to
read like a TickTick task (reference screenshots: list view + kanban card).

The constraint: TickTick is a rainbow (saturated red/yellow/blue priority,
multicolor tags). The atlas runs the **Observable-cool register**
(restrained: white surface, near-black ink, gray hairlines, navy as the
single action color). `CLAUDE.md` explicitly retains "data-semantic reds
(priority heat) and the `--atlas-*` categorical palette." So we adopt
TickTick's *affordances and information design* (priority-coded checkbox,
colored status/tag chips, friendly due dates with overdue heat, airy rows,
card treatment) while mapping every color to the project's existing muted
semantic palette, not TickTick's saturated hues.

## Current-row audit (redesign-existing-projects lens)

| Generic pattern found | TickTick / register upgrade |
|---|---|
| Native checkbox, one navy color for all tasks | Priority-coded rounded-square checkbox: border encodes priority, fills with that color + white check when done |
| Priority shown as a lowercase text pill, only when not normal | Priority becomes the checkbox color (TickTick's signature); no separate priority pill |
| All metadata as identical uppercase-mono gray pills, one wrapping row | Tiered: status chip (colored) + due date (friendly, overdue=red) + assignee chip + quiet inline meta with glyphs |
| Raw ISO date strings (`dueAt`, `startsAt`) | Parsed friendly labels: Today / Tomorrow / Mon / Jun 8; overdue in semantic red, computed against today |
| `<select>` dropdown styled as uppercase-mono pill | Keep the native `<select>` (accessible primitive, keeps functionality) but theme it as a colored status chip |
| Hover = border only | Hover row tint + the checkbox shows a ghost check (affordance) |
| No focus-visible treatment | Visible focus ring on checkbox, status chip, and row |

## Routing intent + rendering surface (gate Step 3)

- **Routing intent:** `uiFoundation` (registry `design.intent.ui_foundation`):
  primaryDomains `ui.foundations`, `accessibility.core`, `tokens.design_system`.
  This is list-row + chip + token work, not canvas/WebGL.
- **Rendering surface:** CSS in a lit web component (existing substrate).
  No new canvas/SVG; the affordances are DOM + CSS, which is correct for an
  editable rich-text row inside BlockSuite. (Registry `render.selection_policy`:
  text-editable content stays in DOM, never canvas.)
- **Brand alignment:** continuous with the workspace chrome already in
  `CivicWorkspaceClient.tsx` (navy `#005186` action, `#e2e2e2` hairlines,
  `var(--font-mono)` micro-labels, 9999px segment pills) and the editor
  theme in `civic-editor-theme.css`. The status chip reuses the same pill
  radius and mono-label idiom as the doc-tab and view-segment controls.

## Tokens (added to civic-editor-theme.css; tokens before pixels)

The editor bundle only exposes `--affine-*`. The `--ctx-*` / `--atlas-*`
tokens do not reach the workspace route, so the lit component currently
hardcodes Observable hex. We add ONE semantic block, aligned to the atlas
palette, and reference it from the component (no raw hex in the component):

```css
:root {
  /* Priority heat: muted atlas-semantic palette, NOT TickTick saturation. */
  --civic-priority-high:   #bf5f52; /* = --atlas-state-safety (terracotta) */
  --civic-priority-normal: #005186; /* = --ctx-accent (navy, the default)  */
  --civic-priority-low:    #9aa7b3; /* quiet cool gray                     */

  /* Status chips (todo/doing/blocked/done), tinted bg + readable text.    */
  --civic-status-todo-fg:    #454545; --civic-status-todo-bg:    #f1f1f1;
  --civic-status-doing-fg:   #8a5a16; --civic-status-doing-bg:   #f7eddc; /* amber, 4.5:1 */
  --civic-status-blocked-fg: #a8463a; --civic-status-blocked-bg: #f6e3df; /* red,   4.5:1 */
  --civic-status-done-fg:    #2f6a3f; --civic-status-done-bg:    #e4f0e6; /* green, 4.5:1 */

  /* Due dates: friendly text + overdue heat. Overdue text is darkened to
     hold 4.5:1 on white; the checkbox/icon red uses the brighter token. */
  --civic-due-overdue: #a8463a;
  --civic-due-soon:    #8a5a16;

  /* Assignee + quiet meta. */
  --civic-meta-fg:   #656565;
  --civic-chip-ring: #e2e2e2;
}
```

Contrast is computed, not eyeballed: every chip foreground/background pair
above meets WCAG 4.5:1 for the chip label size; the priority red `#bf5f52`
is used only for checkbox border/fill (UI, 3:1 threshold), while the
overdue *text* uses the darker `#a8463a` (5:1) per design-engineering's
"check the math" rule.

## List-row anatomy (TickTick list view)

```
[ priority checkbox ]  Task title text ......................  [Status chip]
                       Jun 8 (overdue, red) · @owner · 📍loc · note glyph
   └ nested civic:task children (indented, smaller checkbox)
```

- **Checkbox:** 18px rounded square (radius 5px), 2px border in
  `--civic-priority-*`. Hover shows a faint ghost check. Done = filled with
  the priority color + white check, title strikethrough + `--ctx-ink-faint`.
  18px hit target padded to >=24px effective (Fitts: the whole 22px grid
  cell is clickable, not just the glyph).
- **Title:** 14px / 20px IBM Plex Sans (rides the editor font chain),
  `--affine-text-primary-color`. Stays a live BlockSuite `rich-text` (inline
  edit, markdown matches, undo) -- untouched.
- **Status chip:** the native `<select>`, re-skinned to a status-tinted
  rounded chip (no uppercase, sentence case label). Keeps keyboard + SR
  semantics. Right-aligned.
- **Due/meta line:** appears only when fields exist (progressive
  disclosure). Friendly date first, overdue in red; then a quiet
  `--civic-meta-fg` run of assignee / location / amount with small inline
  glyphs. Replaces the uppercase-mono pill wall.

## Kanban-card anatomy (TickTick card view) -- SCOPE DECISION

TickTick's second screenshot is a kanban of task *cards*. Today
`civic:task` blocks live in a linear BlockSuite doc, not a grouped board;
the only kanban in the workspace is the **Applications database** (a
different object). A task kanban is a genuinely separate surface (a new
grouped view over task blocks). Two honest paths:

- **Phase 1 (recommended): row redesign only.** Both screenshots inform the
  visual tokens; the card treatment (white card, 8px radius,
  `--affine-shadow-1`, same chips) is specified and reused if/when a board
  is built. Ships the core ask now.
- **Phase 1 + task board:** also build a new status-grouped card view for
  todo-list docs. Materially larger (new React/data-view surface, drag
  semantics, persistence). Not a silent cut -- surfaced for your call.

## Accessibility plan

- Checkbox + status chip + row all get `:focus-visible` rings (navy,
  2px, 2px offset). No focus outline removed without replacement.
- Native `<input type=checkbox>` and `<select>` retained: keyboard and
  screen-reader behavior is the platform's, not re-implemented.
- Color is never the sole signal: priority also reads via the done-check
  semantics; overdue reads via the word plus the red; status chip carries
  a text label, not just a tint.
- Contrast computed for every text pair (>=4.5:1) and UI border (>=3:1).

## Motion + performance budget

- Hover/focus transitions 120ms ease (within design-engineering's
  100-500ms band), `transform`/`opacity`/`background` only.
- Checkbox check-in: 140ms. All transitions wrapped in
  `@media (prefers-reduced-motion: reduce)` -> none.
- No layout-animating properties; no infinite animation.

## Validators (must pass before claiming done)

- `npm run build:civic-editor` (esbuild bundle compiles)
- `npm run typecheck`
- `npm run validate:civic-store` (schema/doc registration unaffected)
- `npm run build` (Vercel parity)
- Browser smoke on `/porchfest/workspace`: create a to-do list, confirm
  priority colors, status chip change, overdue date, done strikethrough,
  keyboard focus, reduced-motion.
- Design-engineering axes: contrast math (computed above), target size
  (>=24px), reduced-motion path, focus-visible, tokenized values (no new
  raw hex in the component).

## Files touched

- `src/civic-editor/civic-editor-theme.css` -- add the `--civic-*` token block.
- `src/civic-editor/civic-task-block.ts` -- rewrite `static styles` + the
  meta/status render to the anatomy above; add a date formatter + overdue
  computation. No schema/store/registration change.
