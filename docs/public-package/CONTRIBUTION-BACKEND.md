# Contribution Backend

This document describes the typed contracts behind contribution intake,
review queue, and the advisory boundary. It does not describe the public
contribution UI; that is reserved for the design brainstorm.

The contracts live in `src/lib/atlas/contracts.ts`. The current API stubs
return `501` until the review queue and privacy separation are real.

## Submission

A `ContributionSubmission` is the full record of a single observation that
arrived from a contributor. It has two parts:

- public-bound fields: `submission_id`, `atlas_node_id`, observation type,
  optional place/object id, submitted-at date (date only, never exact
  timestamp), source ids, current review state.
- `private_fields`: contributor handle, email, phone, IP address, raw text,
  photo originals, EXIF metadata, exact submitted-at timestamp, private
  reviewer notes, moderation reason. These never reach public read models.

Submissions also carry zero or more `advisory_signals` (`ContributionAdvisorySignal`)
with kind `tfjs_score`, `act_score`, or `manual_flag`. Advisory signals are
information, not verdicts.

## Receipt

A `ContributionReceipt` is what the contributor sees. It contains:

- `receipt_id` and `submission_id`.
- `acknowledged_at` timestamp.
- current `status` (a `ReviewState`).
- `next_review_window_label`: human-readable string describing when the
  contributor can expect the next review action.
- `contributor_visible_notes`: explicit notes the contributor can read.
  No private reviewer notes leak here.

Receipts are private to the contributor. They are never indexed, never
posted to public read models, and never used as a source citation.

## Review Queue

A `ReviewQueueEntry` is what a reviewer sees. It contains:

- `queue_entry_id` and `submission_id`.
- `observation_type` and `status`.
- `priority`: `high`, `normal`, or `low`.
- `enqueued_at`.
- `advisory_summary`: a `has_privacy_risk_flag` boolean and the full
  `advisory_scores` array.
- `notes`.

Reviewers see advisory signals as inputs. The transition from `needs_review`
to `accepted`, `rejected`, or any other state is a reviewer action recorded
in the public-bound observation.

## Public Summary

After review, an accepted submission produces a `ContributionPublicSummary`
record. The shape is intentionally minimal:

- `observation_id`, `place_id` (or `object_id`), `observation_type`.
- `summary` (reviewer-written safe summary, not raw text).
- `status` (the public `ReviewState`).
- `confidence_label`.
- `source_ids`.
- `reviewed_at` and `caveat`.

This shape mirrors the public observation fields in
`contribution-workflow.schema.json`. No private fields are reachable from
the public summary.

## Advisory Boundary

The most important constraint in the contribution backend is the advisory
boundary. The typed `ContributionAdvisoryBoundary` shape encodes it:

```ts
{
  advisory_only: true;
  forbidden_promotions: ["auto_accept", "auto_publish", "auto_corroborate"];
  required_human_review_states: ReviewState[];
  rationale: string;
  notes: string[];
}
```

The exported constant `FLINT_CONTRIBUTION_ADVISORY_BOUNDARY` carries the
current values for Flint Atlas. The rules:

- Advisory scores from TF.js or ACT must never promote a submission.
- A human reviewer records every state transition that affects public
  reading.
- High-confidence advisory signals do not flip a submission to `accepted`.
- Advisory signals stay private to the review queue. Only reviewer-written
  summaries reach public read models.

If a new advisory signal kind is needed (for example, a future
classifier), `ContributionAdvisoryKind` must be updated before the
backend can accept that signal.

## What This Backend Does Not Do

- It does not publish raw contributor input.
- It does not auto-publish on the basis of any model score.
- It does not store contributor identity in a public read model.
- It does not change the dossier shape; accepted observations show up via
  `ContributionPublicSummary` records linked from the relevant place or
  object.
- It does not authorize a public review-queue dashboard. The review queue
  UI is part of the held design brainstorm.

## Where The API Returns 501

The standalone Next.js API returns 501 for contribution write paths until:

- the typed contracts above are wired into the API handler;
- the private-field allowlist is enforced at intake; and
- the review queue persists somewhere with documented retention.

The 501 response is the correct posture for now. The contracts in this
document are what the eventual handler must conform to.

## Related Documents

- `CONTRIBUTING.md` for what residents may submit.
- `PRIVACY.md` for private-field rules.
- `OBSERVABILITY.md` for `submission.*` and `review.*` events.
- `DISPUTES.md` for what happens when a submission conflicts with an
  official source.
- `GOVERNANCE.md` for who reviews and who decides.
