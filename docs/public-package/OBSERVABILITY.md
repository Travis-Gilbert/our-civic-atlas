# Observability

Our Civic Atlas should make its own behavior inspectable. This document lists
the events the system should emit, who reads them, and what each event must
carry. Observability here is for maintainers and reviewers, not for tracking
residents.

This is the events inventory. Implementation details (logger choice, sink,
sampling) belong in the standalone repo's runtime configuration, not in this
public-facing document.

## Principles

- Events describe atlas behavior, not residents.
- No event payload may carry contributor identity, raw report text, EXIF
  metadata, IP addresses, or household-level implications.
- Source ids, place ids, dataset ids, and review states are safe to include.
- Every event should have a name, a category, and a stable payload shape so
  reviewers can spot regressions over time.
- Events should fail closed: if a payload would include a private field, drop
  the event rather than redact it.

## Categories

| Category | Purpose | Reader |
|---|---|---|
| `submission` | Track contribution intake without exposing contributors. | Maintainer, privacy reviewer. |
| `review` | Track the lifecycle of community observations and disputes. | Reviewer, maintainer. |
| `source` | Track source registry, probe, and freshness changes. | Data steward. |
| `read_model` | Track public read-model rebuilds and validation outcomes. | Maintainer. |
| `runtime` | Track route loads, render mode choices, and visible failures. | Maintainer. |
| `release` | Track release checklist runs and visual gate decisions. | Maintainer. |

## Submission Events

| Event | When | Payload fields |
|---|---|---|
| `submission.received` | A community observation enters intake. | submission id (opaque), node id, place id (if any), submitted-at date (no exact time). |
| `submission.rejected` | A reviewer rejects the submission. | submission id, reason category (no free text). |
| `submission.accepted` | A safe public summary is published. | submission id, public summary id, public place id, review date. |
| `submission.private_redaction` | A private field was found and dropped. | submission id, field category. |

Reason categories should be a closed list (for example: `privacy_risk`,
`out_of_scope`, `duplicate`, `unverifiable`, `superseded`).

## Review Events

| Event | When | Payload fields |
|---|---|---|
| `review.queued` | A submission enters the review queue. | submission id, queue size. |
| `review.state_change` | A review state transition. | submission id, from state, to state. |
| `review.dispute_opened` | A dispute is opened on a place or record. | dispute id, place id, source ids. |
| `review.dispute_state_change` | A dispute state transition. | dispute id, from state, to state. |
| `review.public_note_published` | A public dispute note is published. | dispute id, public place id. |

## Source Events

| Event | When | Payload fields |
|---|---|---|
| `source.registered` | A source is added to the registry. | source id, source type, trust tier. |
| `source.probe_run` | A source probe is run. | source id, probe id, freshness signal. |
| `source.freshness_changed` | A source's freshness status changes. | source id, previous status, new status. |
| `source.retired` | A source is retired or marked unavailable. | source id, reason category. |

## Read Model Events

| Event | When | Payload fields |
|---|---|---|
| `read_model.rebuild_started` | A read-model build starts. | run id, target read model name. |
| `read_model.rebuild_completed` | A read-model build completes. | run id, target read model name, record count. |
| `read_model.validation_failed` | A validator rejects the build. | run id, target read model name, validator name, failure category. |
| `read_model.published` | A new read model is promoted. | run id, target read model name, version. |

## Runtime Events

| Event | When | Payload fields |
|---|---|---|
| `runtime.route_loaded` | A public route renders for the first time in a session. | route name, render mode (`deck`, `r3f`, `leaflet_fallback`, `static`). |
| `runtime.renderer_fallback` | A renderer fails and a fallback engages. | route name, from renderer, to renderer, fail category. |
| `runtime.packet_load_failed` | A scene packet fails to load. | packet id, failure category. |
| `runtime.worker_failure` | A worker boundary fails. | worker name, failure category. |
| `runtime.cache_miss` | A hot cache (Rusty Red or equivalent) misses. | cache name, key category. |
| `runtime.cache_eviction` | A hot cache evicts an entry. | cache name, key category, reason. |

Render mode values must match the renderer bridge contract. New render modes
require an entry here and a contract update.

## Release Events

| Event | When | Payload fields |
|---|---|---|
| `release.checklist_started` | A release checklist run begins. | run id, plan id. |
| `release.gate_decision` | A release gate is decided. | run id, gate name (`runtime_complete`, `product_complete`, `vision_complete`, `do_not_downgrade`, `reversible_boundary`, `baseline_capture`), decision (`pass`, `fail`, `not_run`). |
| `release.checklist_completed` | A release checklist run finishes. | run id, overall decision. |

## What Is Out Of Scope

- Resident analytics, page-view tracking, or A/B testing telemetry.
- Per-resident identifiers, IP addresses, or device fingerprints.
- Free-text reasons in event payloads.
- Cross-node aggregation by personal identifier.

If a future product feature requires resident-level tracking, it must go
through `PRIVACY.md` first.

## Related Documents

- `GOVERNANCE.md` for roles.
- `PRIVACY.md` for private fields.
- `DISPUTES.md` for dispute state transitions referenced by review events.
- `RELEASE-CHECKLIST.md` for gate names referenced by release events.
