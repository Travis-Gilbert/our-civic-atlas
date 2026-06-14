# Email read-model GraphQL contract (for the Inbox hydrate + reply)

Status: contract handoff. The frontend Inbox foundation is built and verified
(EM-010..EM-014, commits 1a0ee1a / cb38d71); it is EMPTY until this read model
lands. This doc is the unambiguous backend contract the inbox hydrate (EM-021)
and reply loop (EM-030/033/032) bind to. Owner of the schema + resolver: the
GraphQL/backend lane (Codex + our-civic-atlas-backend Rust async-graphql).
Frontend (Claude) consumes it via codegen + an ingest into civic:email blocks.

Cross-refs: design at `docs/design/civic-email-object-proposal.md`; plan at
`first-class-email-object-plan.md` (EM-### rows); backend rails at
`forgefest-google-workspace-email-sync.md`.

## What already exists (do not duplicate)

Codex shipped the OUTBOUND layer in `flint-graphql-schema-v1.graphql` +
`src/lib/api/graphql/queries/event-email.graphql`:
`EventEmailChannel`, `EventEmailOutreach` (one outbound email/confirmation),
`EventEmailDeliveryState`, `EventEmailReplyState`
(`NOT_REPLIED|REPLIED|DEFERRED|MANUAL`), `EventEmailReplyRoutingMode`; mutations
`configureEventEmailChannel`, `sendEventApplicationEmail` (requires
applicationId), `updateEventEmailOutreach`. Mutation results carry `staleWrite`;
writes use `expectedVersion`.

The gap: there is no THREAD grouping, no INBOUND messages, and no message
BODIES. The inbox cannot read or reply without them.

## What to add

### 1. Types

```graphql
"""A conversation with one counterparty: outbound EventEmailOutreach plus
inbound replies, grouped by threading headers (In-Reply-To / References) or a
deterministic Reply-To plus-address. The unit the Inbox renders."""
type EventEmailThread {
  id: ID!
  eventLayerId: ID!
  counterpartyName: String
  counterpartyEmail: String!
  subject: String!
  snippet: String                 # last message preview, for the collapsed card
  lastMessageAt: DateTime
  lastMessageDirection: EventEmailDirection
  messageCount: Int!
  """Backend workflow state (existing enum). The UI-facing four-state value is
  uiReplyState below; this stays for parity with EventEmailOutreach."""
  replyState: EventEmailReplyState!
  """The four-state value the Inbox shows. Resolver-computed (see section 3)."""
  uiReplyState: EmailUiReplyState!
  deliveryState: EventEmailDeliveryState   # last outbound, for a delivery hint
  linkedCivicObjectId: ID                  # backend may suggest via email match
  messages: [EventEmailMessage!]!          # full thread; resolve on eventEmailThread(id)
  version: Int!
}

enum EventEmailDirection { INBOUND OUTBOUND }

type EventEmailMessage {
  id: ID!
  threadId: ID!
  direction: EventEmailDirection!
  fromName: String
  fromEmail: String!
  toEmails: [String!]!
  sentAt: DateTime!
  """Bodies REQUIRE inbound capture (RESEND_INBOUND subdomain or Gmail readonly,
  per the email-sync plan Q2). The Inbox 'full read + reply' decision depends on
  these being populated, not just detection."""
  bodyText: String
  bodyHtml: String
  resendEmailId: String
  messageId: String
  deliveryState: EventEmailDeliveryState
}
```

### 2. Queries

```graphql
extend type Query {
  """Inbox list (collapsed cards): summary fields, no message bodies."""
  eventEmailThreads(
    tenantSlug: String! = "flint"
    eventSlug: String!
    uiReplyState: EmailUiReplyState
    linkedCivicObjectId: ID
  ): [EventEmailThread!]!

  """One thread with its full message list + bodies (on expand)."""
  eventEmailThread(
    tenantSlug: String! = "flint"
    eventSlug: String!
    id: ID!
  ): EventEmailThread
}
```

### 3. Reply-state reconciliation (the one real enum decision)

Approved decision: keep the FOUR UI states; the resolver maps them onto the
existing `EventEmailReplyState`. Do NOT bend the UI to the delivery-centric
enum, and do NOT collapse the four into the existing four (they do not line up:
`MANUAL` is a source marker, and there is no `no_reply_needed`).

```graphql
enum EmailUiReplyState { NEEDS_REPLY REPLIED DEFERRED NO_REPLY_NEEDED }
```

Resolver computes `uiReplyState` per thread:
- a stored manual override wins (organizer set it);
- else derive: last message OUTBOUND -> REPLIED; last message INBOUND and
  unanswered -> NEEDS_REPLY.

Mapping to storage (`EventEmailReplyState` + a manual marker):
`NEEDS_REPLY <-> NOT_REPLIED`, `REPLIED <-> REPLIED`, `DEFERRED <-> DEFERRED`,
`NO_REPLY_NEEDED -> MANUAL` plus a discriminator (a `manual_ui_state` column, or
a convention that MANUAL with no organizer reply = NO_REPLY_NEEDED). A new
inbound message clears a `DEFERRED`/`NO_REPLY_NEEDED` override and the thread
re-derives to `NEEDS_REPLY` (the resurfacing rule; no snooze timer).

Note: the frontend block already stores its OWN manual override
(`replyStateOverride`, Yjs-authoritative) so the inbox works offline/pre-backend;
`setEmailThreadReplyState` informs the backend so other organizers converge.

### 4. Mutations

```graphql
extend type Mutation {
  """Reply within a thread: send via Resend, append an OUTBOUND message, return
  the updated thread + the new message."""
  replyToEmailThread(input: ReplyToEmailThreadInput!): EventEmailThreadMutationResult!

  """Start a NEW outbound thread to an arbitrary recipient (general inbox:
  sponsors, venues, press, not just applicants). Generalizes
  sendEventApplicationEmail (which requires applicationId)."""
  composeEmail(input: ComposeEmailInput!): EventEmailThreadMutationResult!

  """Manual responded-state override (the four UI states)."""
  setEmailThreadReplyState(input: SetEmailThreadReplyStateInput!): EventEmailThreadMutationResult!
}

input ReplyToEmailThreadInput {
  tenantSlug: String! = "flint"
  eventSlug: String!
  threadId: ID!
  bodyText: String!
  bodyHtml: String
  fromName: String          # organizer display name (no-login attribution)
  idempotencyKey: String
}

input ComposeEmailInput {
  tenantSlug: String! = "flint"
  eventSlug: String!
  toEmail: String!
  subject: String!
  bodyText: String!
  bodyHtml: String
  linkedCivicObjectId: ID
  fromName: String
  idempotencyKey: String
}

input SetEmailThreadReplyStateInput {
  tenantSlug: String! = "flint"
  eventSlug: String!
  threadId: ID!
  uiReplyState: EmailUiReplyState!
  expectedVersion: Int!
}

type EventEmailThreadMutationResult {
  thread: EventEmailThread
  message: EventEmailMessage   # the appended message for reply/compose; null for set-state
  staleWrite: Boolean!
}
```

## Field authority (the hydrate contract for EM-021)

The frontend ingests threads into `civic:email` blocks keyed by `threadId`
(idempotent, mirroring `ingestCivicObjectsBySourceId`). On each hydrate:
- Backend-authoritative (overwrite the block): `messages`/bodies,
  `lastMessageAt`, `lastMessageDirection`, `messageCount`, `snippet`,
  `deliveryState`, `counterpartyName`/`Email`, `uiReplyState` (when no local
  override).
- Yjs-authoritative (survive the hydrate): the block's `replyStateOverride`
  (manual), `location`/`address` (placement), organizer-set
  `linkedCivicObjectId`, `notes`, `unread`.

## Acceptance for this contract

- `npm run codegen` produces typed `eventEmailThreads` / `eventEmailThread` +
  the three mutations.
- `eventEmailThreads` returns summary rows without bodies; `eventEmailThread(id)`
  returns the full message list WITH `bodyText`.
- Replying appends an OUTBOUND message and flips `uiReplyState` to `REPLIED`.
- An inbound reply to a tracked thread sets `uiReplyState` to `NEEDS_REPLY` and
  clears a prior `DEFERRED`/`NO_REPLY_NEEDED`.
- No Resend key / Gmail token in frontend env, route handlers, or rendered HTML.
- Mutations honor `expectedVersion` and report `staleWrite`.

## Open question for the backend lane

Body capture transport (Q2): RESEND_INBOUND subdomain vs Gmail readonly. The
inbox 'full read + reply' experience needs bodies; if only detection lands
first, the frontend degrades to sender + subject + auto-state flagging (the
proposal's resilient fallback), so the read model can ship `messages: []` with
populated summary fields as an interim step.
