# Planning-Theorem Artifact: First-Class Email Object (unified block + map)

Status: IN PROGRESS. Design proposal (EM-001) approved. First slice shipped.

Prefix for stable IDs in this plan: `EM-###` (distinct from the atelier's
`PT-###`).

## Execution status (updated 2026-06-13)

Approved decisions (the four open questions from EM-001): keep the four UI
responded-states and map `no_reply_needed` onto `MANUAL` plus a discriminator
in the resolver (UI unbent); add "Email this applicant" on the civic card;
defer inbox search; letter-card billboard for the map figure.

Done:
- EM-001 design proposal approved (`docs/design/civic-email-object-proposal.md`).
- EM-010 / EM-011 / EM-013 (store + view registration) / EM-032 (manual mark
  core): the `civic:email` block ships as commit `1a0ee1a`. Round-trip + sync +
  field-authority validator green (`npm run validate:civic-email-store`); bundle
  builds; typecheck clean. The block renders collapsed + expands to a read-only
  thread; the responded chip writes the manual override.

Discoveries that reshape later rows (verified against HEAD, not assumed):
- The email GraphQL schema is ALREADY shipped by Codex
  (`EventEmailChannel`, `EventEmailOutreach`, `EventEmailReplyState`
  NOT_REPLIED|REPLIED|DEFERRED|MANUAL, `sendEventApplicationEmail`,
  `updateEventEmailOutreach`, plus `event-email.graphql`). It is the OUTBOUND
  layer. EM-020 narrows to: add the thread/message read model WITH bodies +
  `replyToEmailThread` + a general `composeEmail` + the reply-state enum
  reconciliation. Bind to the existing types; do not duplicate them.
- Tasks shipped TWICE: the `civic:task` block (note/todo docs) AND, in REVISION
  2 (`8aadb87`), first-class task ROWS in their own database doc that "ride the
  same data-view table + kanban and the same map figure path as applications."
  So the shipped on-the-map pattern is civic ROWS via the civic-row figure path
  (`porchfest-figure-library` / `civic-figure-resolver`), not blocks. This makes
  EM-040 cheaper: project the email block's `location` into that existing
  civic-row figure path (a `PlannerMailLayer` billboard, sibling of
  `PlannerTaskLayer`), rather than a wholly new binding. Email stays a BLOCK
  (its thread + composer need a rich surface a row card cannot host, and the
  inbox is a two-section list, not a kanban, so rows buy nothing here).
- EM-041 (tasks on the map) is effectively already true for task ROWS; the
  block-specific variant is likely moot. Reassess when EM-040 lands.

Coordination: the harness coordination MCP is read-only/compat, so the git
working tree is the substrate. Lane split (per `project-unified-task-system`):
Claude = email/inbox block UI + map placement; Codex = GraphQL schema + the
email read/reply resolvers + a parallel run-of-show feature. Stay off
`flint-graphql-schema-v1.graphql`, `codegen.ts`, `generated/*`,
`event-email.graphql`, `PorchfestPlannerClient.tsx`; sequence the GraphQL
slices (EM-020..EM-033) after Codex's read model lands.

Next: EM-012 (inbox doc kind) + EM-013 (bridge `createInbox`) + EM-014
(workspace Inbox tab + "+ New" entry + seed) to make the inbox visible
end-to-end, then browser verification.

## Executive Summary

- Goal: make email a first-class object in the Porchfest/ForgeFest planner,
  mirroring the `civic:task` BlockSuite block shipped in `3ddcd12`: it loads as
  a block in a shared Inbox, organizers read and reply inside the workspace,
  the thread auto-marks "responded" when they reply (in-UI or detected
  out-of-band), and when an organizer assigns it an address it appears on the
  map like any placed civic object.
- Intent: collapse the workspace-object world and the map-object world into one
  object model. The first-class task block was step one and left the seam
  stubbed (`linkedCivicObjectId`, `locationLabel` exist but nothing reads
  them). Email is the forcing function that builds the block to map seam for
  real.
- Summary of work: a `civic:email` block + an `inbox` doc kind, hydrated from a
  new GraphQL read model over the email-sync backend; an in-UI reply +
  auto-mark-responded loop through a reply mutation; a manual responded-state
  control; and a new placeable-block to map binding so an addressed email (and,
  retroactively, a placed task) renders as a figure. The whole visual surface
  is design-gated.

## Current Condition

Grounded in the live repo as of `3ddcd12` (2026-06-13).

The "first-class task object" the user wants to mirror is a BlockSuite custom
block, not a row and not the map-anchored `EventTask`:

- `src/lib/civic/civic-task-schema.ts`: `CIVIC_TASK_FLAVOUR = 'civic:task'`,
  `CivicTaskProps` (text, done, status, priority, owner, dueAt, startsAt,
  contact, locationLabel, linkedCivicObjectId, sourceId, amountCents, notes,
  `meta:*`), `CivicTaskBlockModel`, `defineBlockSchema(...)`,
  `CivicTaskStoreExtension`.
- `src/civic-editor/civic-task-block.ts`: Lit `CaptionedBlockComponent` with a
  checkbox, inline rich-text title, meta pills, and a status `<select>` that
  writes `store.updateBlock`. Registered via `CivicTaskViewExtension`
  (`FlavourExtension` + `BlockViewExtension(civic-task)`).
- `src/lib/civic/civic-task-docs.ts`: doc kinds
  `'applications' | 'note' | 'todo-list'`; `createCivicTaskListDoc`,
  `createOrganizerNoteDoc`, `addCivicTaskBlock`, `listCivicWorkspaceDocs`;
  doc-kind persisted in `civic:doc-kinds` Y.Map.
- `src/civic-editor/entry.ts`: registers `CivicTaskStoreExtension` /
  `CivicTaskViewExtension`; the mounted bridge exposes `createTodoList`.
- `src/lib/civic/civic-editor-loader.ts`: `CivicWorkspaceMounted` gained
  `createTodoList`; `CivicDocSummary.kind` gained `'todo-list'`.
- `src/app/porchfest/workspace/CivicWorkspaceClient.tsx`: "+ New" dropdown
  gained "To-do list"; doc tabs show a kind dot.

Object/representation fragmentation today (the thing being unified):

| Representation | Storage | On map? | In workspace? | Placement field |
|---|---|---|---|---|
| Civic database rows (applications) | `civic:porchfest-2026` database doc | yes (figures) | yes (table/kanban) | `location` JSON `{lng,lat}` + `figureKey` |
| `civic:task` block | note/todo-list docs (same collection) | **no** | yes (block) | `locationLabel` (text only), `linkedCivicObjectId` (unused) |
| `EventTask` (GraphQL) | Postgres, via GraphQL | yes (badges) | **no** | `coordinate` / `placementId` / `geoAnchorKind` / `osmId` |
| `GeoTaskAnchor` sidecar | `geo-tasks:porchfest-2026` Y.Doc | yes (anchors EventTask) | no | discriminated union |

The map (`PorchfestPlannerClient` + `AtlasMap`) reads three sources: GraphQL
placements (write via `updatePlacement`, version >= 0), civic database rows
(write via `civic-api.update(rowId, "location", ...)`, version === -1 sentinel),
and GraphQL EventTasks (anchored by the geo-task sidecar). No BlockSuite block
reaches the map today; `bindCivicRowsToMap()` only traverses the database doc.

Email infrastructure: **does not exist yet.** The backend rails (Resend send,
delivery webhooks `EmailOutreach`/`EmailEvent`, reply detection) are specified
in `forgefest-google-workspace-email-sync.md` and assumed in progress by Codex.
Applications already carry `email` / `contactEmail`.

GraphQL boundary mechanics are fixed and binding: schema at
`docs/design/flint-graphql-schema-v1.graphql` -> `npm run codegen` -> `.graphql`
operation under `src/lib/api/graphql/queries/` -> urql `useMutation`/`useQuery`
-> resolver on the Axum backend. No service-tier credential may live in a Next
route handler. Canonical worked example: the `civicResearch` mutation.

## Intent

The user is trying to make true: "an object loads as a block, and if I assign
it an address it appears on the map." The systems are meant to be unified, not
siloed. Email should be a first-class object in that unified model: read and
answer correspondence inside the planner, with answered-state tracked
automatically, and with spatial placement available when an email is about a
place.

## Goal

- User-visible outcome: a shared **Inbox** in the workspace whose rows are email
  threads that look and behave like task cards (counterparty + subject +
  snippet + a responded-state badge). Open a thread to read it; reply from a
  composer inside the workspace; the thread flips to "Replied" the moment you
  send. A manual "Mark responded / needs reply" control covers replies you sent
  from your phone. Assign an address to a thread and it shows on the map as a
  mail figure (red when it still needs a reply).
- System behavior: email threads/messages are hydrated from a new GraphQL read
  model over the email-sync backend into `civic:email` blocks, idempotently
  keyed by `threadId`. Reply and compose go through GraphQL mutations to the
  Axum resolver -> Resend. A new placeable-block to map binding renders blocks
  carrying a coordinate.
- Data/model changes: a `civic:email` block schema; an `inbox` workspace doc
  kind; a shared placement facet on the civic-block spine (a real `coordinate`,
  reusing the EventTask anchor vocabulary) added to both `civic:email` and
  `civic:task`; new GraphQL types (`EmailThread`, `EmailMessage`) and mutations
  (`replyToEmailThread`, `composeEmail`, `setEmailReplyState`); a mail entry in
  the figure library.
- Operational impact: the civic-editor bundle is rebuilt (`build:civic-editor`,
  chained into `npm run build`). Email bodies are stored backend-side (Q2: full
  read+reply), which carries the restricted-scope / inbound-subdomain cost the
  email-sync plan documents. Inbound updates arrive by polling the read model
  (no subscription exchange exists in the urql client today).
- What must not regress: the existing civic-row -> map figure path
  (`validate:civic-map-binding`), application capture durability (capture never
  blocked by email), the GraphQL token boundary, the BlockSuite raw-TS bundle
  isolation, and the four `validate:civic-*` gates.

## The unified object model (design core)

### One block family, a shared spine, a placement facet

`civic:task` (exists) and `civic:email` (new) are members of one "civic object
block" family that shares a spine and gains a placement facet:

- Spine (both blocks): `status`/state, `owner`, `linkedCivicObjectId`,
  `sourceId`, `meta:*`.
- Placement facet (added to the spine): a real `coordinate: [lng, lat]` (plus
  the EventTask anchor vocabulary `geoAnchorKind` / `osmId` / `placementId` so
  the map binding speaks one anchor language). `civic:task.locationLabel` stays
  as the human label; the new `coordinate` is what the map reads.
- `civic:email` adds email content + reply state (below).

A block with a non-empty placement facet renders on the map through a **new**
`bindPlaceableBlocksToMap()` layer that generalizes the existing
`bindCivicRowsToMap()`. Dragging a placed block on the map writes `coordinate`
back to the block (parallel to the civic-row version === -1 write path).

This is the seam the task object stubbed. Building it for email also lets
`civic:task` blocks finally appear on the map (EM-040, proposed deferral).

### Field-level authority (the reconciliation contract)

Email is backend-authoritative for what only the backend can know, and
Yjs-authoritative for the organizer's planning decisions. The hydrate is a
field-scoped merge, not a blind overwrite:

- Backend-authoritative (GraphQL -> block on each hydrate; overwrites local):
  messages/bodies, `deliveryState`, detected inbound replies, detected
  out-of-band organizer replies, `threadId`/`messageId`.
- Yjs-authoritative (block-local; survives hydrate; optionally informs the
  backend): `coordinate`/anchor, manual responded-state override,
  `linkedCivicObjectId`, organizer private notes, `figureKey`.
- Derived (never stored as truth): the displayed responded-state =
  manual override if set, else derived from the last message's direction.

### Responded-state + auto-mark (the user's "amazing" loop)

State enum on the email block: `needs_reply | replied | deferred |
no_reply_needed`.

Derivation rule: if a manual override is set, use it; else `replied` when the
last message is outbound from an organizer, `needs_reply` when the last message
is inbound and unanswered.

Auto-mark triggers:

1. In-UI reply: `replyToEmailThread` mutation succeeds -> optimistically append
   the outbound message + set derived state to `replied` immediately; reconcile
   from the mutation payload. Fully in our control.
2. Out-of-band reply (organizer replied from their own Gmail): the backend must
   detect the organizer's *sent* message (not just applicant inbound) and
   append it to the thread; next hydrate flips the derived state. This is a
   backend capability beyond the email-sync plan's applicant-reply detection
   (EM-031, proposed deferral / backend dependency).
3. Manual: a `<select>` on the block (mirroring the task status select) writes
   the override and calls `setEmailReplyState` so other organizers and the
   backend agree.

## Seam with the email-sync backend plan

`forgefest-google-workspace-email-sync.md` (Codex) owns; this plan consumes:

| Owned by email-sync plan (backend) | Added by this plan |
|---|---|
| Resend send; `EmailOutreach`, `EmailEvent`; delivery webhooks | GraphQL read model (`EmailThread`/`EmailMessage`) the UI binds to |
| Reply detection (Gmail watch / Resend inbound) flipping `reply_state` | Thread-direction derived state + manual override (`setEmailReplyState`) |
| Organizer outreach compose/send resolver | Frontend compose surface; general-recipient `composeEmail` over that resolver |
| `submitEventApplication` confirmation send | The first-class object, Inbox surface, in-thread reply, map placement |

Extensions this plan needs from the backend (coordinate with Codex):
full message-body capture (Q2: full read+reply), a thread-grouped read query,
and out-of-band organizer-sent-mail detection for auto-mark (EM-031).

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Block mounts, hydrates, reply mutation round-trips, map binding emits a figure. | `build:civic-editor` + `validate:civic-email-*` + preview smoke. | planned |
| Product complete | Inbox is equal-or-better than reading in raw Gmail for the porchfest triage loop; reply + responded feel first-class. | Before(no inbox)/after/target review at desktop + constrained viewport. | planned |
| Vision complete | Email is a unified object: block + map + responded loop. Mark partial if EM-040 (task on map) is deferred. | Vision Delta. | planned |
| Baseline capture | Current workspace (no inbox) + target references for the email card and placed-mail figure captured, or unavailable with reason. | Screenshots/design proposal frames. | planned |
| Do Not Downgrade | The civic-row -> map path and the task block UX are preserved; new binding does not crowd or occlude existing figures. | Visual gate review + `validate:civic-map-binding`. | planned |
| Reversible boundary | Inbox ships as a new doc kind/tab behind its own surface; the map placement facet lands behind the new binding layer without touching the row path. | Route/commit boundary. | planned |

## Vision Delta

- Target vision: a unified object planner where correspondence, tasks, and
  applications are one object family, readable as blocks and placeable on the
  map, with email answered inside the tool.
- Current visual condition: no inbox exists; the task block is workspace-only;
  the map reads rows/placements/EventTasks but never blocks.
- This plan makes true: a `civic:email` block + Inbox; in-UI read/reply;
  auto-mark + manual responded-state; placed emails on the map via a new
  placeable-block binding.
- This plan does not make true (unless EM-040/EM-031 are kept): `civic:task`
  blocks on the map; auto-mark from out-of-band organizer replies; a real-time
  (non-poll) inbound feed.
- Visual downgrade risks: two object systems on one map (row figures + block
  figures) could duplicate or crowd; the email card could overload the clean
  task-card register; map could clutter with mail pins.
- Remaining renderer/data/interaction/design gaps: subscription/real-time
  transport; threading UI for long conversations; attachments.

## Codebase Grounding

| Area | Evidence | Notes |
|---|---|---|
| Block to mirror | `civic-task-schema.ts`, `civic-task-block.ts`, `civic-task-docs.ts` | The exact template for `civic:email`. |
| Bundle registration | `src/civic-editor/entry.ts` | Add store + view extensions; add `createInbox`/`ensureInboxDoc` to the mounted bridge. |
| Bridge contract | `src/lib/civic/civic-editor-loader.ts` | Extend `CivicWorkspaceMounted` + `CivicDocSummary.kind`. |
| Workspace shell | `src/app/porchfest/workspace/CivicWorkspaceClient.tsx` | New Inbox tab/menu item; reply composer host; billing-band pattern to mirror. |
| Hydrate/ingest pattern | `src/lib/civic/civic-ledger-ingest.ts` (`ingestCivicObjectsBySourceId`) | Idempotent-by-key ingest to mirror for threads-by-`threadId`. |
| Map read sources | `PorchfestPlannerClient` / `AtlasMap`; `bindCivicRowsToMap()` | Generalize to `bindPlaceableBlocksToMap()`; preserve row path. |
| Figure registry | `porchfest-figure-library.ts`, `civic-figure-resolver.ts` | Add a mail figure; resolve email blocks in the new binding, not the row resolver. |
| Drag write-back | placement drop handler (version-discriminated) | Add a block-coordinate write branch. |
| GraphQL recipe | `civic-research.graphql` + `civic-research-graphql-coordination.md` | Pattern for the new email operations. |
| Validation runners | `scripts/validate-civic-*.ts`, `scripts/tsconfig.civic-validate.json` | New validators run via esbuild, not tsx (BlockSuite raw TS). |

## Orchestration Map

| Work type | Route to | Why |
|---|---|---|
| Email card + Inbox + placed-mail figure visual proposal | design specialists (design-gate) | Binding per CLAUDE.md before any `.tsx`/`.css`/Lit visual code. |
| BlockSuite block schema + view + bundle wiring | execute (this repo) | Mirrors the task block. |
| GraphQL read model + reply/compose/state mutations | execute here + Codex backend | Schema + `.graphql` here; resolvers on Axum. |
| Block to map binding | execute (this repo) | New frontend layer over deck.gl. |
| Backend body capture + out-of-band detection | Codex (`our-civic-atlas-backend`) | Service-tier; the email-sync plan's lane. |

## GraphQL contract additions

Read model:

- `emailThreads(tenantSlug: String! = "flint", eventSlug: String!, state: String, linkedCivicObjectId: ID): [EmailThread!]!`
- `emailThread(id: ID!): EmailThread`
- `EmailThread { id, eventSlug, subject, counterpartyName, counterpartyEmail, lastMessageAt, lastMessageDirection, replyStateBackend, deliveryState, linkedCivicObjectId, messageCount }`
- `EmailMessage { id, threadId, direction, fromEmail, toEmails, sentAt, bodyText, bodyHtml }` (bodies present per Q2)

Mutations (extend, do not duplicate, the email-sync resolvers):

- `replyToEmailThread(input: { threadId: ID!, bodyText: String!, bodyHtml: String }): EmailReplyPayload!`
- `composeEmail(input: { toEmail: String!, subject: String!, bodyText: String!, linkedCivicObjectId: ID }): EmailReplyPayload!` (general inbox; arbitrary recipients per Q3)
- `setEmailReplyState(input: { threadId: ID!, replyState: String! }): EmailThread!`
- `EmailReplyPayload { thread: EmailThread!, message: EmailMessage! }`

Then `npm run codegen`; operations under
`src/lib/api/graphql/queries/email-inbox.graphql`.

## Checklist

| ID | Task | Codebase grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| EM-001 | Design proposal for the email card, Inbox surface, reply composer, responded badge, and placed-mail figure | new `docs/design/civic-email-object-proposal.md` | design-gate | User-approved proposal exists; on the Observable register; defines states (needs_reply/replied/deferred/no_reply_needed) + map figure color semantics | proposal reviewed | building visual code without it violates the gate | open |
| EM-010 | `civic:email` block schema | new `src/lib/civic/civic-email-schema.ts` | execute | Flavour `civic:email`; props for content + reply state + spine + placement facet; store extension | `validate:civic-email-store` | schema churn | open |
| EM-011 | `civic:email` Lit view (collapsed card + expand + responded badge) | new `src/civic-editor/civic-email-block.ts` | execute | Renders counterparty/subject/snippet + state badge; expand shows messages; matches EM-001 | bundle builds; preview | register overload | open |
| EM-012 | `inbox` doc kind + create/seed helpers | extend `src/lib/civic/civic-task-docs.ts` (or new `civic-inbox-docs.ts`) | execute | New `CivicWorkspaceDocKind 'inbox'`; create + list + kind-dot; seed guard | `validate:civic-email-store` | doc-kind sort/order | open |
| EM-013 | Bundle registration + bridge method | `src/civic-editor/entry.ts`, `src/lib/civic/civic-editor-loader.ts` | execute | Store + view extensions registered; `createInbox`/`ensureInboxDoc` on mounted bridge; `CivicDocSummary.kind` extended | bundle builds | bundle isolation | open |
| EM-014 | Workspace Inbox tab + "+ New" entry | `src/app/porchfest/workspace/CivicWorkspaceClient.tsx` | execute | Inbox reachable; tab dot; mobile surface parity | preview at desktop + <=780px | mobile path | open |
| EM-020 | GraphQL read model (`EmailThread`/`EmailMessage` + `emailThreads`/`emailThread`) | `docs/design/flint-graphql-schema-v1.graphql`, `email-inbox.graphql`, codegen | execute + Codex | Types/queries compile; codegen clean; resolver returns threads with bodies | `npm run codegen`, `typecheck` | backend timing | open |
| EM-021 | Hydrate/ingest threads -> `civic:email` blocks, idempotent by `threadId`, field-authority merge | new `src/lib/civic/civic-email-ingest.ts` (mirror `civic-ledger-ingest.ts`) | execute | Re-hydrate does not duplicate; backend fields win, Yjs facets survive | `validate:civic-email-ingest` | reconciliation bugs | open |
| EM-022 | Inbox poll + focus refetch | workspace client | execute | Inbox refreshes on interval + window focus; honest "backend pending" when resolver absent | preview | poll cadence | open |
| EM-030 | `replyToEmailThread` + composer + optimistic auto-mark | `email-inbox.graphql`, block composer, `CivicWorkspaceClient` | execute + Codex | Send appends outbound message; state -> replied immediately; reconciles from payload | `validate:civic-email-reply` | optimistic rollback | open |
| EM-031 | Out-of-band organizer-reply auto-mark (backend detects organizer sent mail) | backend (email-sync lane) | Codex | An organizer reply sent outside the UI flips state on next hydrate | manual | restricted-scope cost; PROPOSED DEFERRAL | open |
| EM-032 | Manual responded-state control + `setEmailReplyState` | block view + mutation | execute + Codex | Override persists, syncs to other organizers + backend; precedence over derived | `validate:civic-email-reply` | enum drift | open |
| EM-033 | `composeEmail` (general recipients, optional link) | `email-inbox.graphql`, compose UI | execute + Codex | New outbound thread to an arbitrary address; optional `linkedCivicObjectId` | manual + typecheck | spam/abuse posture | open |
| EM-040 | Placement facet on the block spine + `bindPlaceableBlocksToMap()` + mail figure + drag write-back + "assign address" | block schema, `porchfest-figure-library.ts`, planner map, drop handler | execute | Addressed email renders on map; drag writes `coordinate`; row path untouched | `validate:civic-block-map-binding`, `validate:civic-map-binding` | two object systems on one map; PROPOSED for staged delivery | open |
| EM-041 | Retrofit `civic:task` onto the same placement facet (tasks on the map) | task schema + same binding | execute | Placed task blocks render on the map via the shared binding | `validate:civic-block-map-binding` | scope; PROPOSED DEFERRAL | open |
| EM-050 | Docs: CLAUDE.md platform section + this plan reconciliation | `CLAUDE.md` | execute | Email object documented; remaining gates listed | review | drift | open |

## Test Strategy

- Preflight: `npm run typecheck`, `npm run build:civic-editor`.
- Focused: new esbuild validators `validate:civic-email-store` (block
  round-trip), `validate:civic-email-ingest` (idempotent-by-`threadId` +
  field-authority merge), `validate:civic-email-reply` (state transitions +
  optimistic + manual override precedence), `validate:civic-block-map-binding`
  (block `coordinate` <-> map placement, both directions). Runners use esbuild,
  not tsx (BlockSuite raw TS).
- Integration: hydrate against the live resolver where available; honest
  "backend pending" otherwise.
- Regression: `validate:atlas`, the four existing `validate:civic-*`, and
  `validate:civic-map-binding` must stay green (Do Not Downgrade).
- Type/lint/static: `npm run lint`, `npm run typecheck`, `npm run build`
  (Vercel runs `next build`; verify imports resolve against committed HEAD).
- Manual smoke: read a thread, reply, watch auto-mark; manual mark; assign an
  address and confirm the map figure + drag write-back; desktop + <=780px.
- Security: no Resend key or Google token in frontend env, route handlers,
  browser storage, or rendered HTML; reply/compose only through GraphQL ->
  Axum; `composeEmail` recipient validation; CSV/HTML body sanitation on
  render.

## Production Gates

- [ ] Tests/validators pass or failures explained.
- [ ] No migration/data risk (no bidirectional store sync introduced; field
      authority is explicit).
- [ ] No secrets or service-tier credentials in the frontend.
- [ ] Error paths: send failure, stale optimistic state, resolver absent,
      hydrate conflict.
- [ ] Observability: log reply/compose mutation outcomes; surface delivery
      state on outbound.
- [ ] Rollback: Inbox is an additive doc kind/tab; map facet behind the new
      binding layer; revert boundary obvious per slice.
- [ ] Docs updated (EM-050).
- [ ] UI visual work has before/after/target evidence (EM-001 + screenshots).
- [ ] Do Not Downgrade passes before Product complete (row -> map path intact).
- [ ] Execution report reconciles every EM-### row.

## Explicit Non-Goals and Deferrals (need your consent, surfaced individually)

These are flagged for an explicit yes/no, not batched away:

1. EM-041 (retrofit `civic:task` onto the map via the shared placement facet).
   Why deferrable: email is the forcing function; tasks-on-map is a natural
   follow-on but not required for the email feature. Risk of deferral: the
   unification stays "email-only" and the task block's stub fields stay unused
   a while longer. Follow-up: a thin slice once EM-040 lands.
2. EM-031 (auto-mark from out-of-band organizer replies). Why deferrable: it
   needs the backend to watch the organizer's *sent* mail, which carries extra
   Gmail restricted-scope cost. Risk of deferral: replying from your phone
   won't auto-mark; the manual control (EM-032) covers it meanwhile.
3. Real-time (non-poll) inbound and attachments. Why deferrable: no
   subscription exchange exists in the urql client today; polling is honest and
   sufficient for v1. Risk of deferral: inbound lag up to the poll interval.

## Open decisions still needed

- Map figure for email: a distinct mail/envelope figure, or reuse `marker`
  tinted by responded-state (red = needs reply)? (Resolve in EM-001.)
- Where compose lives: only inside a thread + a top-of-Inbox "compose" button,
  or also from an applicant/civic-object card ("email this applicant")?
- Whether the Inbox tab is a BlockSuite doc (consistent with task/note docs) or
  a workspace surface that hosts email blocks plus a composer chrome around the
  editor mount.

## Execution Instructions

- Start with EM-001 (design proposal). Do not write `.tsx`/`.css`/Lit visual
  code before it is approved (design-gate, binding).
- Then EM-010 -> EM-014 (block + Inbox, read-only) as the first vertical slice;
  it is shippable as "see your inbox as blocks" before reply exists.
- Then EM-020 -> EM-022 (hydrate), EM-030/EM-032/EM-033 (reply + state +
  compose). Coordinate the resolver work with Codex on the email-sync lane;
  bind to the read model behind an honest "backend pending" state.
- Then EM-040 (placement/unification) as a separate reversible boundary; keep
  the civic-row -> map path untouched and green.
- Preserve invariants: GraphQL token boundary; BlockSuite raw-TS bundle
  isolation; capture-never-blocked-by-email; the four `validate:civic-*` gates
  plus `validate:civic-map-binding`.
- Commits: `<type>(<scope>): <desc>`, scope required (e.g.
  `feat(inbox): ...`); no em/en-dashes; no `Co-Authored-By`; new commits, never
  amend.
