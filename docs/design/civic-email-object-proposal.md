# civic:email object + shared Inbox (design proposal)

Status: PENDING USER APPROVAL. This is EM-001, the design gate the plan at
`docs/plans/porchfest-planner/first-class-email-object-plan.md` blocks all
visual code on (per `AGENTS.md` design gate +
`~/.claude/skills/visual-work-design-gate`). No `.tsx` / `.css` / Lit code is
written until this is approved.

This proposal designs the presentation and interaction of a first-class email
object: the collapsed Inbox card, the expanded thread, the reply composer, the
four responded states, the shared Inbox surface, and the placed-mail map
figure. It is the sibling of the just-shipped `civic:task` TickTick redesign
(`docs/design/civic-task-ticktick-redesign-proposal.md`) and must read as the
same family of object.

Specialists consulted: `ui-design-pro:visual-architect` (visual composition,
map figure), `ux-pro:Interaction Designer` (triage loop, multi-organizer, IA,
a11y). Design-theory principles (Fitts, Hick, Gestalt, progressive disclosure,
the triage screen archetype) applied throughout. Intent was set by the user's
three locked answers (block-based + unified with the map; full read and reply;
general shared inbox) plus the unification reframe (an object loads as a block
and appears on the map when addressed).

## Why

The user wants email to be a first-class object they can answer inside the
planner, with "responded" tracked automatically when they reply (and a manual
mark for replies sent elsewhere), and placeable on the map when a piece of mail
is about a place. The `civic:task` block proved the pattern; email is the next
object onboarded into the same family, and the forcing function that finishes
the block-to-map unification.

## Routing intent + rendering surface (gate Steps 1 to 2)

- Routing intent: `uiFoundation`. This is list-row, chip, disclosure, and form
  work, not canvas/WebGL, with one small map-billboard element.
- Rendering surface: DOM + CSS inside a Lit web component (the existing civic
  editor substrate). Text-editable content stays in DOM, never canvas. The map
  figure is a deck.gl `IconLayer` SVG-card billboard (flat, screen-space), not
  a luma.gl procedural mesh. Rationale in the map section.
- Component-library scan: this repo has no `Theseus/Design Components` folder;
  the brand-aligned component vocabulary here is the shipped `civic:task` block
  (`src/civic-editor/civic-task-block.ts`) and the planner map billboard
  (`src/components/atlas/PlannerTaskLayer.tsx`). Both are matched and reused.

## AI Slop Test (run before approving)

First-order (could you guess this from "email inbox" alone?): the Gmail reflex.
Blue unread bars, a two-pane list/reading split, circular sender avatars with
colored fills, bold-the-entire-row unread, left/right chat bubbles, a
star/archive/paperclip icon rail, a floating "Compose" button. All rejected.
They import mail-client chrome that fights the editorial register and make the
object read as a foreign app embedded in the doc.

Second-order (the tasteful-restraint trap one tier deeper): "make it minimal"
by reaching for a thin colored left border to mark inbound vs outbound. It
looks like restraint but it is (a) a project Absolute Ban and (b) the literal
Superhuman/Gmail label-stripe cliche. The second-order move is to differentiate
by typographic role and a single fill plane, the way a printed letter
distinguishes letterhead from a quoted reply, not by decorating an edge.

Resolution: the email object reads as a civic document row (sibling of the task
row), differentiating direction by language and one faint fill, never by edge
accents or bubbles.

## Absolute Bans check

- No side-stripe colored borders: inbound/outbound differ by fill plane +
  language, not edges. Pass.
- No gradient text: single solid ink; emphasis via weight. Pass.
- No glassmorphism: opaque surfaces, the existing `--affine-shadow-1` for the
  lifted panel only. Pass.
- No modal-as-first-thought: thread expands inline; link picker is an inline
  typeahead; compose inserts an inline draft block. Pass. (One exception
  considered: compose-from-an-applicant-card may open a small sheet; see open
  decisions.)
- No em dashes in copy: all UI copy below uses commas/periods/colons. Pass.

## Visual vocabulary + brand alignment

Observable-cool register: white surface, near-black ink (`#1c1c1c`), light-gray
hairlines (`#e2e2e2`), navy (`#005186`) as the single action color, muted
data-semantic reds retained. Type: IBM Plex Sans for content; a mono micro-label
idiom (uppercase, tracking) for chips and attribution. The email block renders
to LIGHT DOM (like `civic:task`), so `:root` `--civic-*` and `--affine-*` tokens
reach it.

The collapsed card is the exact `civic:task` grid (`24px | minmax(0,1fr) |
auto`, `gap: 9px`, `padding: 7px 8px`, `border-radius: 7px`). The only
differences from the task row are the leading cell (an unread dot, not a
checkbox) and the trailing stack (responded chip over a timestamp). That
sameness is what makes the two objects read as one family.

## The object, briefly (full model in the plan)

A `civic:email` block is one email thread with a counterparty (general inbox:
applicants, sponsors, venues, press; optionally linked to a civic application).
Backend-authoritative for messages/delivery/detected replies; Yjs-authoritative
for the organizer's planning facets (manual responded-state, map placement,
link, private notes). Responded-state is derived from the last message's
direction, with a manual override on top.

The four responded states and the precedence rule:

| State | Meaning | Reached by |
|---|---|---|
| `needs_reply` | last message inbound, unanswered | derived (inbound) or manual |
| `replied` | organizer's reply is the last message | derived (outbound) or manual |
| `deferred` | consciously parked | manual only |
| `no_reply_needed` | closed without replying (notice, thanks, spam) | manual only |

Displayed state = manual override if set, else the direction-derived state. A
manual override auto-clears when contradicted by new backend truth: a new
inbound message on a `deferred` / `no_reply_needed` thread clears the override
and returns it to `needs_reply` (this is the resurfacing mechanism, so defer
needs no snooze timer); a manual `replied` clears once a real outbound message
makes the derived state agree.

## Collapsed card anatomy

```
[●]  Maya's Trio · "Re: Can my band still apply?"        [Needs reply ▾]
 │   2 messages · they wrote 2h ago · linked: Sunset Trio        2:14p
 └ col1 24px        col2 1fr                              col3 auto
```

- Col 1 (24px): the unread mark, vertically centered to the checkbox optical
  line. Unread = an 8px navy disc (`#005186`). Read = an 8px hollow ring
  (`1.5px solid #d7dde2`, transparent center), the visual rhyme of an unchecked
  box, so the column is never empty and reads as a column. The dot is the
  unread fact only, not the responded control; clicking it toggles read/unread.
- Col 2 (1fr): line 1 is counterparty name (weight 600 when unread, 500 when
  read) + subject; line 2 is a quiet `--civic-meta-fg` progressive-disclosure
  run: message count, last-direction-and-when in friendly form ("they wrote 2h
  ago", "we replied Tue", reusing the task block's `formatTaskDate`), and a link
  chip when linked. Unread is reinforced by the name weight, never by the dot
  alone (color is never the sole signal).
- Col 3 (auto): the responded-state chip on top, the timestamp below.

## Responded-state chip (the trailing control)

The chip is the responded analog of the task status chip, built with the exact
same technique: a visible label span with a transparent native `<select>`
overlaid (keyboard + screen-reader semantics for free). Same `22px` height,
`9999px` radius, `:focus-within` navy ring. Reuse, do not reinvent.

Tint mapping reuses the shipped `--civic-status-*` palette so "waiting on you"
reads with the same urgency grammar as an overdue/blocked task:

| State | bg / fg | reuses |
|---|---|---|
| `needs_reply` | `#f6e3df` / `#a8463a` | task `blocked` red + `--civic-due-overdue` |
| `replied` | `#e4f0e6` / `#2f6a3f` | task `done` green |
| `deferred` | `#f1f1f1` / `#656565` | task `todo` neutral |
| `no_reply_needed` | `#f1f1f1` / `#656565`, dimmed | neutral, reduced opacity |

Decision: one chip-menu, not four buttons. Four "mark replied / needs reply /
defer / no reply needed" buttons is a Hick's-Law tax on every row and overpowers
the calm register the Do Not Downgrade gate protects. The chip shows current
state at a glance and hides the choice cost until invoked; its default action
sets `replied`, which is the user's headline "mark as responded".

## Expanded thread (inbound vs outbound without stripes or bubbles)

Differentiation is typographic role + one fill plane + a mono attribution line.
A correspondence transcript, not a chat.

- Inbound (from the counterparty): body on the white doc surface, no fill, no
  border. White is the unmarked default ("what they sent us").
- Outbound (from an organizer): body on a faint neutral fill
  (`--civic-email-outbound-fill #f7f8f9`), `border-radius: 8px`, full content
  width (no inset, no bubble), `padding: 8px 10px`. The fill is the only chrome;
  a border plus a fill is two signals doing one job.
- Attribution line (mono micro-label, `10.5px`, uppercase, `0.06em`,
  `--civic-meta-fg`): inbound reads `MAYA T  ·  THEY WROTE  ·  2:14 PM`,
  outbound reads `MAYA T (ORGANIZER)  ·  YOU REPLIED  ·  2:30 PM`. Direction is
  carried in language, which survives grayscale and screen readers. The
  organizer's name carries "(ORGANIZER)" so a multi-organizer thread stays
  legible about who replied. No avatars.
- Body type: `14px / 21px` IBM Plex Sans, `#1c1c1c`, `white-space: pre-wrap`.
  Long quoted history ("On Tue, X wrote:") collapses behind an inline "Show
  quoted text" disclosure, never a modal.
- Rhythm: `4px` attribution-to-body; `16px` between messages; a single
  `1px solid #ececec` hairline only where the conversation turns direction
  (inbound to outbound), not between every message. The newest message gets a
  navy `LATEST` mono tag in its attribution line (no fill, no bar). Container
  inner padding `12px 14px`, one step more generous than the collapsed row.

```
MAYA T · THEY WROTE · Mon 9:02 AM
Hi, we'd love a porch slot for our trio. Is the Saturday block still open?
── (hairline #ececec, the conversation turns here) ──
┌ outbound fill #f7f8f9, radius 8 ──────────────────────────┐
│ MAYA T (ORGANIZER) · YOU REPLIED · Mon 11:15 AM           │
│ Yes, the 2 to 4 block is open. Send a one-line bio?       │
└──────────────────────────────────────────────────────────┘
── (hairline #ececec) ──
MAYA T · THEY WROTE · 2:14 PM · LATEST
Sent. Thanks so much.
══ (full hairline #e2e2e2, 20px above) ══
[ composer ]
```

## The composer (a quiet reply slip)

Pinned below the transcript, under a heavier full hairline (`#e2e2e2`, `20px`
above) that says "below this line is you, now".

- From name (required, free text, remembered in `localStorage`): above the
  textarea, bottom-hairline input (`border-bottom: 1px solid #e2e2e2`, navy on
  focus), mono "From" label. This is the multi-organizer identity primitive
  (reuses the task `owner` display-name idiom). Send is disabled until it is
  non-empty, with an inline hint "Add your name so the team knows who replied"
  (not a modal).
- Textarea: plain `<textarea>` (not a rich editor), `min-height 64px`,
  auto-grow to `200px`, `border 1px solid #e2e2e2`, `radius 8px`, body type
  matching message bodies, navy focus border + focus-visible ring. It lives in
  the block's light DOM, not the doc model, until Send commits a message.
- Send: bottom-right, the only filled-navy element in the whole block
  (`background #005186`, white, `radius 8px`, sentence case "Send"). Everything
  else (link control, chip, dot) is outline or tint, so the single-action-color
  rule holds inside one object.
- Secondary controls bottom-left, subordinate to Send: "Link to applicant" (a
  quiet mono text button opening an inline typeahead, with an exact-email-match
  one-tap suggestion, never silent linking) and a mirror of the responded chip
  (so you can set replied in the same gesture as sending).
- Undo: on Send the message appends optimistically and a single-line toast
  docks to the bottom of the thread container (not a global toast): "Reply
  sent." + "Undo", auto-dismiss at 5s. Undo uses delayed dispatch (the real
  send is held 5s; Undo cancels before it fires), the only honest undo for an
  irreversible external send.

## Collapsed to expanded transition

The collapsed row becomes a container in place. Border transparent to
`1px solid #e2e2e2`, `border-radius 7px` to `8px`, `--affine-shadow-1` fades in
(the lifted-panel language the kanban cards and popovers already use). The
collapsed three-column grid stays pinned as the panel header (the subject the
user clicked never moves); the thread and composer render below it inside the
same bordered card. Multiple threads can be open at once (independent blocks),
each a bordered card amid flat rows; no accordion-forces-others-closed (that is
modal thinking). Height animates `180ms ease` (transform/opacity/height only);
reduced-motion shows it already expanded.

## The Inbox surface

A doc-list of email blocks (like a to-do doc) plus exactly two section headers,
one compose entry, and one filter row. Light chrome, not a mail toolbar.

```
[ + New message ]                                   (outline-navy)
[ All · Applicants · Sponsors · Venues · Press ]    (filter chips)
NEEDS REPLY (3) ───────────────────────────────
   ...collapsed email rows, oldest-waiting first...
EVERYTHING ELSE (12) ──────────────────────────
   ...replied / deferred / no_reply_needed, newest first...
```

- Two top-level groups only (Needs reply, Everything else). The triage question
  is binary ("does this need me or not?"); four per-state sections would
  fragment the calm list (Miller's Law). Deferred and no_reply_needed are
  quieted within the second group, never deleted (the "empty, never hidden"
  invariant).
- Section headers: mono micro-label, `11px`, `0.08em`, weight 700, `#454545`,
  count in `#656565`, a hairline rule running to the right edge.
- Default sort: `needs_reply` first, oldest-waiting at top (do not let anyone
  wait too long); everything else newest-activity first.
- Compose: a single outline-navy "New message" button (not a FAB). Click
  inserts a new draft email block inline at the top, expanded to the composer
  with a "To" field added above From. No modal compose window.
- Filter: one segment row by counterparty type (the brief's own framing). No
  search box, no sort control, no bulk-select, no archive rail in v1 (search is
  a deliberate deferral; see open decisions).
- Unread is orthogonal to section: a read-but-needs-reply thread sits in NEEDS
  REPLY with a hollow dot; an unread-but-handled thread sits in EVERYTHING ELSE
  with a navy dot.

## The placed-mail map figure

Decision: render placed mail as a deck.gl `IconLayer` SVG-card billboard, the
sibling of `PlannerTaskLayer`'s task card, NOT a luma.gl procedural mesh. The
task object already places itself on this map as a flat billboard; email is the
task's sibling in the doc, so it is the task card's sibling on the map. A flat
card sits above the 3D musician/vendor figures in screen space and reads
cleanly without competing for ground footprint. A 3D envelope would make mail a
different class of thing and crowd the scene.

Unification note (reconciling with `project-unified-task-system` /
`unified-task-system-plan.md`): the mail figure reuses `PlannerTaskLayer`'s
billboard rendering technique (`buildTaskIcon`, the IconLayer SVG card), but is
wired through the new `bindPlaceableBlocksToMap()` binding reading the
`civic:email` block's coordinate (EM-040), NOT through the legacy GraphQL
`eventTasks` data path that is being retired. Reuse the rendering, retire the
data path. The placement facet and the binding are co-owned with Codex's task
lane; mail and task billboards share the layer.

- Form: a small "letter card" (rounded rect, white at ~235 alpha, `radius 10`,
  `stroke #1c1c1c 1.25px`; selected swaps to navy `#005186 2px`), with a tiny
  envelope-flap chevron mark top-left in the responded-state color, the
  counterparty name (truncated ~12 chars, `13px`), and a `9px` mono status
  micro-label. Not a literal envelope glyph (that reads as a mail-app button).
- Color by responded-state (the map layer may use `--atlas-*`), driving the flap
  + label, not the whole card:

| State | flap + label | token |
|---|---|---|
| `needs_reply` | `#bf5f52` red | `--atlas-state-safety` / `--civic-priority-high` |
| `replied` | `#54707a` slate | `--atlas-envelope-swatch` |
| `deferred` | `#9aa7b3` gray | `--civic-priority-low` |
| `no_reply_needed` | `#c5c5c5` faint | `--affine-text-disable-color` |

  Cross-surface divergence stated explicitly: the inbox uses green for
  `replied`; the map uses muted slate. On a triage list green means "done,
  good"; on a spatial scene an extra green marker would read as a live/active
  place. Both keep `needs_reply` = red constant, the one mapping that must be
  recognizable on either surface.
- Size: pixel-sized billboard, `34px` default, `38px` when `needs_reply`,
  `40px` selected (size cue layered on color). It sits between compact-task
  (`30px`) and detail-task (`42px`): present, clearly a card, never dwarfing a
  figure. Lifted above any co-located 3D figure with `getPixelOffset [0, -34]`
  (figure name labels sit at `-18`, so the stack reads figure, figure-label,
  mail-card, no horizontal crowding). Multiple mails at one address fan with
  the same stagger `PlannerTaskLayer` uses.
- Zoom: below `16.8`, a compact `16px` flap-colored dot (no text); at/above
  `16.8`, the full letter card. The card carries its own name, so no separate
  `TextLayer` label.

## Multi-organizer without accounts

Soft conventions over hard locking, leaning on the rails that already exist
(CRDT facets, optimistic `version` + `staleWrite`).

- From name (required on the composer) attributes every action and is stamped
  into the outbound message and the optimistic bubble. This single field
  resolves most "who replied?" ambiguity, reusing the established display-name
  identity convention.
- Presence, not locks: Yjs Awareness (already wired in `geo-task-store.ts`)
  broadcasts "Maya is replying" as a transient navy pill on the row when an
  organizer focuses a composer. Advisory, ephemeral (evaporates on
  disconnect/blur), never blocking. No claim/assignment subsystem.
- True races fall through to the existing `staleWrite` reconcile, but gentler
  than a map drag: two replies both actually sent, so neither is discarded; the
  second writer sees "Sent. Devon also replied to this one." and the thread
  shows both bubbles in order. Only the responded-state and version reconcile.

## Tokens to add (civic-editor-theme.css, tokens before pixels)

```css
:root {
  /* Responded-state chips (reuse the task status hues). */
  --civic-responded-needs-fg:    #a8463a; --civic-responded-needs-bg:    #f6e3df;
  --civic-responded-replied-fg:  #2f6a3f; --civic-responded-replied-bg:  #e4f0e6;
  --civic-responded-neutral-fg:  #656565; --civic-responded-neutral-bg:  #f1f1f1;
  /* Thread surface. */
  --civic-email-outbound-fill: #f7f8f9;
  --civic-email-turn-rule:     #ececec;
  --civic-unread-disc:         #005186; /* = --civic-task-ring */
  --civic-unread-read-ring:    #d7dde2;
}
```

Every chip foreground/background pair meets WCAG 4.5:1 (they are the audited
task palette). The unread navy disc on white is UI (3:1). No raw hex in the
component; reference the tokens.

## Motion + performance budget

- Hover/focus transitions `120ms`; chip changes `120ms`; expand `180ms`; all
  transform/opacity/background/height only, no layout-animating properties, no
  infinite animation.
- The 5s Undo underline is the only timed element; reduced-motion drops it (the
  toast still auto-dismisses at 5s).
- `@media (prefers-reduced-motion: reduce)`: all of the above become instant
  state swaps (matches the task block's existing media query).
- The Inbox is a vertical list of light-DOM blocks; no virtualization in v1
  (thread counts are small). Map billboards use the existing IconLayer iconCache
  keyed by state + selected + counterparty.

## Accessibility plan

- Keyboard triage path: `J`/`down` next, `K`/`up` previous, `Enter`/`O` open,
  `R` reply (focus composer), `Cmd/Ctrl+Enter` send, `E` mark replied, `Esc`
  collapse/close, `/` focus filter. After a successful Send the thread collapses
  and focus auto-advances to the next `needs_reply` row (fast triage); if none
  remain, focus lands on the "You're caught up" region.
- Focus management: expand moves focus to the thread heading (`tabindex=-1`),
  then to the composer if `needs_reply`; collapse returns focus to the
  originating row; compose-draft traps focus, initial focus on To (or Body when
  prefilled). Never drop focus to `<body>`.
- Screen reader: the card is an article whose accessible name front-loads the
  triage facts ("Needs reply. Unread. Maya's Trio, Re: Can my band still apply?
  They wrote 2 hours ago."). The responded chip is a real `<select>` ("Responded
  state, Needs reply, combo box"). Unread is in the label, not the dot alone
  (`aria-hidden` dot).
- Live region: one polite `aria-live` region announces poll deltas, debounced
  and summarized ("1 new message. Maya replied."), never assertive. The only
  assertive (`role="alert"`) usage is the send-failure rollback toast.

## Empty / loading / error / backend-pending states

| State | Treatment | Copy |
|---|---|---|
| Backend pending | Tab mounts and reads work; quiet honest panel, compose disabled with tooltip. | "Inbox is connecting. Email sync is still being set up on the server. You can read and answer applications in the meantime." |
| First run / empty | Friendly empty state + the one action. | "No correspondence yet. When applicants, sponsors, or venues email porchfest@cthna.org, threads show up here. Compose a message to get started." |
| Needs-reply empty | Section renders "NEEDS REPLY (0)" with a quiet positive line. | "You're caught up. Nothing is waiting on a reply." |
| Loading (first hydrate) | Skeleton rows, never a spinner on blank. | (no copy) |
| Poll error after success | Keep last-good threads; thin dismissible bar. | "Couldn't refresh just now. Showing the latest we have." |
| Send failure (after optimistic) | Remove the optimistic bubble, restore the typed text exactly (never lose words), revert badge to `needs_reply`, re-enable Send, focus composer. | "Reply didn't send. Your message is back in the box. Try again." |
| Out-of-band reply, marked manually | Honest note on the thread. | "Marked replied by Maya. This reply was sent outside the planner." |
| Offline | Reuse the existing Online/Offline pill; disable Send; reads stay (local-first). | Send tooltip: "You are offline. Replies send when you reconnect." |

The Inbox tab and reads are always available; only the send path degrades when
the backend is absent, so the read-only first slice (EM-010 to EM-014) ships
before reply exists.

## GraphQL binding: existing contract + the delta

The email schema already exists (Codex, outbound-oriented). Bind to it; add only
what the inbox triage + in-UI reply need.

Existing (reuse as-is):
- `EventEmailChannel` (sender config; `replyRoutingMode` GMAIL_METADATA |
  RESEND_INBOUND | MANUAL), query `eventEmailChannel`.
- `EventEmailOutreach` (id, applicationId?, recipientEmail, subject,
  previewText, resendEmailId, messageId, replyToEmail, `deliveryState`,
  `replyState`, sentAt, lastEventAt, `version`), query `eventEmailOutreach`.
- `EventEmailDeliveryState` (QUEUED ... RECEIVED), `EventEmailReplyState`
  (NOT_REPLIED | REPLIED | DEFERRED | MANUAL).
- `sendEventApplicationEmail` (applicationId required, `bodyMarkdown`),
  `updateEventEmailOutreach` (set `replyState`/`deliveryState`,
  `expectedVersion`). Mutation results carry `staleWrite`.

The delta this feature needs (coordinate with Codex on the email-sync lane):
1. A thread + message read model with BODIES. `EventEmailOutreach` is a single
   outbound record with no body and no inbound messages. Add `EventEmailThread`
   (counterparty, subject, lastMessageAt, lastMessageDirection, messageCount,
   linkedCivicObjectId, derived state inputs) + `EventEmailMessage` (direction,
   from, sentAt, `bodyText`/`bodyHtml`) and a query `eventEmailThreads` /
   `eventEmailThread`. Bodies require the RESEND_INBOUND or Gmail readonly path
   (the user chose full read+reply, Q2).
2. A reply-from-thread mutation `replyToEmailThread(threadId, bodyText,
   bodyHtml?)` and a general `composeEmail(toEmail, subject, bodyText,
   linkedCivicObjectId?)`. `sendEventApplicationEmail` requires an applicationId
   and cannot address sponsors/venues/press (the general inbox, Q3).
3. Reply-state semantics. The shipped `replyState` answers "did the applicant
   reply to our outreach"; this feature needs "have we responded to them" with
   four states (`needs_reply | replied | deferred | no_reply_needed`). The
   enums do not line up (no `no_reply_needed`; `MANUAL` is a source marker, not
   a workflow state). See open decisions.

## Fallback strategy

- Resolver absent: "backend pending" panel, reads/compose gated honestly, the
  block still mounts (the read-only slice ships).
- Body capture absent (if the backend lands detection before inbound bodies):
  the card shows counterparty/subject + auto-`needs_reply`/`replied` flagging +
  an "open in Gmail" affordance, degrading gracefully to the detection-only
  experience until bodies arrive.
- Map figure: if `bindPlaceableBlocksToMap` is not yet wired, an addressed email
  simply does not render on the map (no error); the inbox is unaffected.
- No JS / SR-only: the block is DOM; the chip is a native `<select>`; the
  composer is a native `<textarea>`; all operable without custom JS affordances.

## Library primitives

- Native `<select>` (the responded chip, via the task block's overlay
  technique) and native `<textarea>` (the composer): accessibility for free, on
  register.
- Yjs Awareness (already a dependency, used by `geo-task-store.ts`) for
  presence.
- deck.gl `IconLayer` (already used by `PlannerTaskLayer`) for the mail figure;
  reuse `buildTaskIcon`'s SVG-card + iconCache pattern.
- The existing workspace toast slot, Online/Offline pill, `aria-live` region,
  and friendly-date formatter (`formatTaskDate`). No new UI libraries.

## Validators (must pass before claiming done)

- `npm run build:civic-editor`, `npm run typecheck`, `npm run build`.
- `npm run validate:civic-store` (block schema/registration unaffected).
- New: `validate:civic-email-store` (block round-trip), `validate:civic-email-
  reply` (state transitions + override precedence + optimistic), `validate:civic-
  block-map-binding` (block coordinate <-> map placement). esbuild runners, not
  tsx.
- `npm run validate:civic-map-binding` stays green (Do Not Downgrade).
- Design-engineering axes: computed contrast (>=4.5:1 text, >=3:1 UI), target
  size (>=24px), focus-visible, reduced-motion, tokenized values (no raw hex in
  the component).
- Browser smoke on `/porchfest/workspace`: read a thread, reply (watch the
  optimistic flip + 5s undo), manual mark, expand quoted text, keyboard triage
  (J/K/R/E/Cmd-Enter), desktop + `<=780px`.

## Files touched (when approved)

- `src/civic-editor/civic-editor-theme.css`: the `--civic-responded-*` + email
  token block above.
- `src/civic-editor/civic-email-block.ts` (new): the Lit view, sibling of
  `civic-task-block.ts` (reuse the select-as-chip + friendly-date + reduced-
  motion patterns).
- `src/lib/civic/civic-email-schema.ts` (new): the `civic:email` block schema
  (content + reply-state + spine + placement facet).
- `src/lib/civic/civic-email-docs.ts` (new) or extend `civic-task-docs.ts`: the
  `inbox` doc kind + create/seed helpers.
- `src/civic-editor/entry.ts`, `src/lib/civic/civic-editor-loader.ts`: register
  + bridge method.
- `src/app/porchfest/workspace/CivicWorkspaceClient.tsx`: the Inbox tab, the two
  sections, compose entry, filter row.
- `src/components/atlas/PlannerMailLayer.tsx` (new): the mail billboard, sibling
  of `PlannerTaskLayer.tsx`, wired through `bindPlaceableBlocksToMap`.
- GraphQL: `src/lib/api/graphql/queries/email-inbox.graphql` + schema additions
  (delta above) + `npm run codegen`.

## Open decisions (need your call before or during build)

1. Reply-state enum mismatch (the one real backend fork): keep the four UI
   states and have the resolver map `no_reply_needed` onto schema `MANUAL` plus
   a discriminator (UI unbent, my recommendation), or extend the schema enum
   with a fifth value. Touches the `setEmailReplyState` / `updateEventEmail
   Outreach` contract.
2. Compose from an applicant card: add an "Email this applicant" action on the
   civic-object card that opens the same compose, prefilled (recommended, near
   zero extra surface), or keep compose only in the Inbox.
3. Inbox search: deferred for v1 (browser find + two sections cover triage), or
   include a search field now.
4. Map figure form: confirm the "letter card" billboard (recommended) vs a
   literal envelope/pin.

## Gate state

```text
DESIGN_GATE_PREFLIGHT: brainstorm=folded(prior-fork-Q&A) impeccable_shape=folded(ai_slop_test+absolute_bans_applied) design_theory=via:visual-architect+ux-interaction component_library_scan=pass:[civic-task-block(sibling), PlannerTaskLayer(map-billboard)] registry_intent=uiFoundation specialists=ui-design-pro:visual-architect,ux-pro:Interaction-Designer ai_slop_test=first_order_pass+second_order_pass absolute_bans=pass user_approval=pending mutation=blocked
```

Mutation stays blocked until you approve this proposal (gate Step 4). On
approval, implementation follows the EM-### checklist in the plan, starting with
the read-only slice (EM-010 to EM-014).
