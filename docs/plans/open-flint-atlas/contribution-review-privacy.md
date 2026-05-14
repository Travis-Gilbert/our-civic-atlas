# Open Flint Atlas Contribution Review and Privacy Workflow

Open Flint Atlas can invite community correction only if submissions remain
observations until reviewed. The project must not turn resident reports into
public facts automatically.

## Public Rule

Map places, systems, services, and public conditions. Do not map people as targets.

## Observation State Machine

| State | Meaning | Public visibility | Who can move it forward |
|---|---|---|---|
| `submitted` | A resident or maintainer sent a report. | not public | system intake |
| `needs_review` | The report passed basic format and safety checks. | aggregate queue count only | reviewer |
| `corroborated` | A reviewer found public source support or multiple safe observations agree. | public only as source-labeled observation | reviewer |
| `conflicts_with_official_source` | Report disagrees with an official/public source. | public only as a conflict marker, without reporter identity | reviewer |
| `accepted` | Report is safe and useful enough to affect a public read model. | public as accepted observation or correction note | reviewer |
| `rejected` | Report is unsafe, unverifiable, off-scope, duplicate, or harmful. | not public | reviewer |
| `superseded` | A newer source or reviewed observation replaces it. | public only as changelog note when useful | reviewer/system |

## Public Observation Fields

Only these fields may enter a public observation read model:

| Field | Type | Notes |
|---|---|---|
| `observation_id` | string | Stable opaque id. |
| `place_id` | string | Public place id, not contributor address. |
| `observation_type` | enum | `condition_update`, `resource_update`, `access_issue`, `source_correction`, `near_miss`, `other`. |
| `summary` | string | Reviewer-written safe summary. |
| `status` | enum | One of the public-safe workflow states. |
| `confidence_label` | enum | `unreviewed`, `reviewed`, `corroborated`, `conflicting`, `accepted`, `stale`. |
| `source_ids` | string[] | Sources used in review. |
| `reviewed_at` | date/null | Public date only. |
| `caveat` | string | Plain-language limitation. |

## Private Moderation Fields

These fields are private by default and must never be emitted into public read
models, static fixtures, map tooltips, or graph claims:

- contributor name
- contributor email
- contributor phone
- IP address
- raw text
- photo originals
- EXIF metadata
- exact submit timestamp when it can identify a person
- private reviewer notes
- moderation reason internals
- faces
- license plates
- address-level service line records

## Review Controls

1. Strip direct identifiers before public export.
2. Convert raw text into reviewer-written summaries.
3. Downsample exact timestamps to dates for public display.
4. Strip EXIF metadata before any photo review storage.
5. Blur faces and license plates before public image use.
6. Never publish a contributor identity.
7. Never publish a household-level implication from a resident report.
8. Require a public source or reviewer note before `accepted`.
9. Represent disagreement as `conflicts_with_official_source`, not as automatic
   truth.
10. Keep rejected reports private and auditable.

## Threat Model

| Threat | Harm | Control |
|---|---|---|
| Doxxing through reports | Identifies residents, owners, tenants, or reporters. | Public field allowlist and identifier redaction. |
| Rumor propagation | Unverified claims appear as facts. | Observations remain non-facts until accepted. |
| Retaliation | A contributor or household is targeted. | Contributor identity is private and exact household-level details are blocked. |
| Stale correction | Old report overrides current official data. | `superseded` state and source-date display. |
| Model overreach | Automated score implies truth. | Model flags cannot promote observations. |
| Photo leakage | Faces, license plates, EXIF, or interiors reveal private facts. | Photo redaction and review gate before public use. |

## Promotion Rule

A contribution can affect the public atlas only when:

1. It has a safe public summary.
2. It has no public identifiers.
3. It references a public place id.
4. It has a reviewer decision.
5. It carries a caveat.
6. It is either accepted as a correction or shown as a source-labeled conflict.

## Current Scope

This workflow is a contract and fixture set. It does not enable a public form
yet. Enabling submissions requires storage, moderation UI, abuse handling,
retention policy, and reviewer permissions.
