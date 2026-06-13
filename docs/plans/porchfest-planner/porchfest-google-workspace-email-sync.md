# ForgeFest Google Workspace and Email Sync Plan

Status: setup started. The repo-side GraphQL contract now includes the
organizer-visible email channel and outreach operations. Backend resolver,
database, webhook, and Railway variable wiring still need to land in the Axum
service.

This plan covers the ForgeFest/PorchFest event-planning browser: connecting a
Google account for Drive, Docs, Sheets, and Gmail, then pairing Gmail reply
detection with Resend outbound email. If ForgeFest becomes a separate event
slug, keep the architecture and replace `porchfest-2026` at the resolver
boundary.

## Local boundary

The existing completion plan sets the hard boundary: the frontend talks through
GraphQL, while Google OAuth tokens, Gmail access, and Resend keys live on the
backend. Keep that boundary.

Frontend responsibilities:
- Start a connection flow.
- Show connected status, linked files, sync state, and email task state.
- Submit compose, link-file, and sync requests through GraphQL.
- Never store Google refresh tokens, Gmail access tokens, or Resend API keys.

Backend responsibilities:
- Own OAuth callback, token refresh, encrypted token storage, and disconnect.
- Own Drive, Docs, Sheets, Gmail, Resend, and webhook calls.
- Persist file links, sync cursors, email tasks, delivery events, and reply
  state under `TenantContext`.

## Current setup decision

Use Resend for outbound Porchfest email with this sender:

- Sender address: `porchfest@cthna.org`
- Sender name: `Carriage Town PorchFest`
- Reply-to for v1: `porchfest@cthna.org`
- Deployment label in the frontend contract: `Railway: Resend Starter`

This address is public configuration, not a secret. The Resend API key and
webhook secret remain only on the backend or Resend worker service.

Backend/Railway variables to set on the service that owns the email resolver or
worker:

```bash
RESEND_API_KEY=<secret>
RESEND_WEBHOOK_SECRET=<secret>
PORCHFEST_EMAIL_PROVIDER=resend
PORCHFEST_EMAIL_FROM="Carriage Town PorchFest <porchfest@cthna.org>"
PORCHFEST_EMAIL_REPLY_TO=porchfest@cthna.org
PORCHFEST_EMAIL_CHANNEL_LABEL="Railway: Resend Starter"
```

The currently linked Railway workspace shows a `Resend Starter` service, but
that project is not this repo's checked-in source of truth. Do not set variables
blindly until the exact backend/worker service is confirmed.

## Recommended shape

Build one backend integration module with two account-facing concepts:

1. `GoogleWorkspaceConnection`
   - `tenant_id`
   - `event_slug`
   - `organizer_user_id`
   - `google_account_email`
   - `scopes`
   - encrypted refresh token material
   - connection status, created time, last refresh, revoked time

2. `EmailChannel`
   - `tenant_id`
   - `event_slug`
   - sender domain/address
   - reply routing mode: `gmail_metadata`, `resend_inbound`, or `manual`
   - connected Google account when Gmail reply detection is enabled
   - Resend webhook signing secret reference

Everything downstream keys off those records. Applications, placements, and
tasks keep their current identities; sync records point to them rather than
duplicating them.

## Google OAuth flow

Use the Google OAuth web-server flow on the backend.

1. Frontend calls `startGoogleWorkspaceConnect(input)`.
2. Backend creates a signed `state` value containing tenant, event slug,
   organizer user, requested surface, nonce, and return path.
3. Backend returns a Google authorization URL.
4. User consents in Google.
5. Google redirects to the backend callback.
6. Backend exchanges the code, stores refresh token material encrypted, records
   granted scopes, then redirects back to the ForgeFest browser.
7. Future GraphQL resolvers instantiate the Google client from the stored
   refresh token. Access tokens refresh server-side.

Use `access_type=offline` and incremental authorization. Google documents that
offline access is required when the app must refresh access while the user is
not present, and that client libraries refresh access tokens when configured
with the stored refresh token:
https://developers.google.com/identity/protocols/oauth2/web-server

## Drive, Docs, and Sheets sync

Prefer the narrowest file access model.

### Preferred v1: selected-file sync

Use `https://www.googleapis.com/auth/drive.file` for Drive/Docs/Sheets where
possible. Google marks `drive.file` as the recommended, non-sensitive scope for
creating or modifying files the app creates or files the user selects for the
app. Sheets and Docs docs also recommend `drive.file` for per-file access:

- Drive scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Sheets scopes: https://developers.google.com/workspace/sheets/api/scopes
- Docs scopes: https://developers.google.com/workspace/docs/api/auth

Persist a `GoogleFileLink` for every linked workbook, sheet, doc, or folder:

- `tenant_id`
- `event_slug`
- `connection_id`
- `google_file_id`
- `mime_type`
- `display_name`
- `sync_direction`: `import`, `export`, or `bidirectional`
- `target_kind`: `applications`, `placements`, `tasks`, `ledger`, `notes`
- `target_id` when linked to a single object
- `last_seen_revision`
- `last_synced_at`
- `conflict_policy`

GraphQL surface:

- `googleWorkspaceConnection(eventSlug)`
- `googleDriveFiles(eventSlug, mimeTypes, query)`
- `linkedGoogleFiles(eventSlug)`
- `startGoogleWorkspaceConnect(input)`
- `disconnectGoogleWorkspace(input)`
- `linkGoogleFile(input)`
- `syncGoogleFile(input)`
- `exportEventApplicationsToSheet(input)`
- `importSheetRows(input)`

### Picker tension

Google Picker is the best UX for selecting Drive files under `drive.file`, but
the web Picker flow normally uses a short-lived OAuth access token in the
browser. That conflicts with the repo rule that Google tokens should not reach
the Next app.

Use one of these paths:

1. Server-only first slice: let organizers paste a Google file URL or choose
   from app-created files, then the backend links and syncs by file ID. This
   keeps the strict token boundary.
2. Shared service-account folder: if the organization owns a fixed Drive folder
   or workbook, share that folder/file with a backend service account. This is
   clean for a known CTHNA/ForgeFest operations folder, but it is not the same
   as connecting each organizer's personal Google account.
3. Narrow Picker exception: document that the frontend may hold a short-lived
   Picker token only for file selection, never store it, and send only selected
   file IDs to the backend. This gives the best Drive UX but needs an explicit
   project decision because it bends the current boundary.

Do not jump to broad `drive` or `drive.readonly` unless the product truly needs
whole-Drive search. Google marks those as restricted scopes, which raises
verification and security-assessment cost.

## Resend outbound and delivery tracking

Use Resend for sending. The `submitEventApplication` resolver sends confirmation
email after the application ledger write and backup receipt, never before.
Organizer outreach also goes through a backend resolver.

Repo-side contract added:

- `eventEmailChannel`
- `eventEmailOutreach`
- `configureEventEmailChannel`
- `sendEventApplicationEmail`
- `updateEventEmailOutreach`

The channel defaults point at `porchfest@cthna.org`. The frontend can query
status and send outreach requests once the backend implements these fields.

Persist `EmailOutreach`:

- `tenant_id`
- `event_slug`
- `application_id`
- `recipient_email`
- `subject`
- `resend_email_id`
- `message_id`
- `reply_to`
- `delivery_state`: `queued`, `sent`, `delivered`, `opened`, `clicked`,
  `delivery_delayed`, `bounced`, `complained`, `failed`, `suppressed`
- `reply_state`: `not_replied`, `replied`, `deferred`, `manual`
- `notes_doc_id`
- `created_by_user_id`
- `sent_at`
- `last_event_at`

Persist every webhook as `EmailEvent` before mutating rollup state. Use Resend
webhook signature verification and idempotency by event id plus email id.

Resend webhook docs list delivery, open, click, bounce, complaint, failure,
suppression, and received events:
https://resend.com/docs/webhooks/event-types

Resend webhook management docs recommend storing events in your own database and
returning `HTTP 200 OK` after successful receipt:
https://resend.com/docs/webhooks/introduction

## Reply detection

Resend is strong for send state. Gmail is the better source if the organizer's
real inbox is the source of truth for replies.

### Preferred Gmail mode

Use Resend for outbound email and set a deterministic `Reply-To`, for example:

`forgefest+emailtask_<emailTaskId>@gmail-or-workspace-domain`

Then Gmail reply sync only needs to detect that a reply landed and tie it back
to the email task. It does not need to read or store message bodies for the
first slice.

Use the smallest Gmail scope that supports the workflow:

- `gmail.metadata` can view message metadata such as labels and headers.
- `gmail.readonly` can read message bodies and supports Gmail search queries.

Google currently classifies both as restricted Gmail scopes. If restricted
Gmail data is stored on servers or transmitted, Google says the app must go
through restricted-scope verification and a security assessment:
https://developers.google.com/workspace/gmail/api/auth/scopes

For v1, attempt `gmail.metadata` plus:

1. Store the connected Gmail `historyId`.
2. Register `users.watch` to a Cloud Pub/Sub topic.
3. Renew the watch daily. Google says Gmail watches expire within seven days.
4. On Pub/Sub notification, call `users.history.list` from the stored cursor.
5. Fetch added messages in `METADATA` format with headers such as `From`, `To`,
   `Subject`, `Message-ID`, `In-Reply-To`, and `References`.
6. Match by plus-address, `In-Reply-To`, or known `Message-ID`.
7. Flip `EmailOutreach.reply_state` to `replied`, create or complete the linked
   task, and store only minimal metadata unless the user opens a message.

Gmail push notifications and history sync docs:

- Push/watch: https://developers.google.com/workspace/gmail/api/guides/push
- History list: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
- Message metadata: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get

Important limitation: Gmail `messages.list` search query `q` cannot be used
with the `gmail.metadata` scope. If the workflow needs arbitrary Gmail search,
use `gmail.readonly` and accept the heavier review burden.

### Resend inbound alternative

If Google verification is too heavy for launch, route replies to a Resend
receiving subdomain:

`reply+emailtask_<emailTaskId>@reply.forgefest.org`

Resend receives inbound messages by MX/webhook and can forward or surface them.
This avoids Gmail restricted scopes, but it makes Resend the reply source
instead of the organizer's Gmail account. Resend says received webhooks include
metadata and that the app must call the Received Emails API or Attachments API
to retrieve body or attachments:
https://resend.com/docs/dashboard/receiving/introduction

## Rollout order

1. Resend confirmations.
   - Add backend send after `submitEventApplication`.
   - Store `resend_email_id`.
   - Add delivery webhook ingestion.

2. Organizer outreach.
   - Add compose/send resolver.
   - Add `EmailOutreach` records and delivery-state UI.
   - Link each outreach to an application and optional task.

3. Google Drive/Sheets first slice.
   - Choose server-only file URL, service-account shared folder, or Picker
     exception.
   - Implement linked file records and one import/export target, likely
     applications to Sheet.

4. Gmail reply detection.
   - Connect Gmail with restricted-scope review acknowledged.
   - Add history cursor, Pub/Sub notification handling, watch renewal, and
     fallback polling.
   - Match replies to email tasks by plus-address and message headers.

5. Docs sync.
   - Generate or update organizer-facing Docs from selected records.
   - Keep Docs export one-way until conflict handling is designed.

## Acceptance checks

- Disconnecting Google revokes local connection state and stops scheduled sync.
- No Google refresh token or Resend API key appears in frontend env, Next route
  handlers, browser storage, or rendered HTML.
- A linked Sheet can import applications without losing category-specific
  payload fields.
- An exported Sheet round trip preserves application IDs and does not create
  duplicates.
- Sending confirmation email cannot block application capture.
- Resend webhook replay is idempotent.
- A bounced email changes the visible outreach state for the applicant.
- A Gmail reply to a tracked outreach changes `reply_state` to `replied`
  without reading message body in the first slice.
- If Gmail history cursor expires with `HTTP 404`, the backend performs a full
  metadata resync rather than dropping future replies.

## Decisions still needed

- Is ForgeFest using one shared organizer Google account, one CTHNA Workspace
  account, or per-organizer connections?
- Is a short-lived browser token acceptable only for Google Picker selection,
  or should v1 stay server-only?
- Should replies land in Gmail, Resend inbound, or both?
- Which object syncs first: applications to Sheets, sponsor ledger to Sheets,
  or task notes to Docs?
