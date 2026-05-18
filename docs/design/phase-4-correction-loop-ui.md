# Phase 4 — Community Correction Loop UI (deferred)

**Status:** DEFERRED. Decisions captured from the 2026-05-18 brainstorm.
Do not implement until procedural reconstruction (Phase 3 visual
pipeline) is shipping renderable buildings residents would have
reason to correct.

**Why deferred:** Without working procedural reconstruction, there is
nothing visually compelling for a resident to correct. The atlas
must render Lost Flint buildings convincingly before a "Suggest a
correction" CTA has anywhere to land. Procedural reconstruction is
the much higher-priority blocker; the correction loop is downstream
polish that makes the data better over time.

## Locked design decisions

### Trust model

There is **no resident verification**. ACC/ACT (Theseus algorithm)
is the trust function. It scores both author behavior and the
contribution content from full-system context (text vs internet,
related claims, evolutionary/structural rating). The Phase 4 form
does not gate by claimed identity; it captures everything ACC/ACT
might want and lets the algorithm score later.

The form is **anonymous by default**, with optional voluntary name +
contact. ACC/ACT consumes the rest from behavioral signal +
internal-consistency checks.

**ACC/ACT is not wired in Phase 4.** The form ships, captures
submissions, and stores them in `corrections.payload_jsonb`. ACT
plugs in when the algorithm is released and tested. Until then,
moderators evaluate corrections directly without algorithmic
scoring.

### Confidence indicator (the entry-point affordance)

Per part on the dossier. Three rendering bands by ACC/ACT confidence:

| Confidence       | Display                                |
|------------------|----------------------------------------|
| < 50%            | Word: **`contested`**                  |
| 50–85%           | Percent bar: `[ ▓▓▓▓▓░░░░ 72% ]`       |
| > 85%            | Silent (hover tooltip on the part)     |

Clicking the indicator at **any** stage opens the ACC/ACT explanation
panel. The explanation panel renders the algorithm's output:
provenance trace, contributing inputs, what would lift the score.
The `[ Suggest a correction → ]` button lives at the **bottom of the
explanation panel** — not inline next to the indicator. The resident
sees *why* before they propose *how*.

The word "contested" is doing real work: it's neutral on direction
(low could mean wrong, or just unverified) and invites engagement
without prejudicing the correction.

### Dossier navigation

Three layers of focus:

1. **Layer 1 — Building** ("Worker's Cottage, 1898"). Overview +
   parts list (Mass / Facade / Roof / GroundFloor) with confidence
   indicators on each part header.
2. **Layer 2 — Part** (e.g. Roof). Full part detail: fields,
   sources, ACC/ACT indicator, `[ Suggest a correction ]` entry.
3. **Layer 3 — Field** (e.g. `Roof.material`). Reached through the
   correction form, not as a top-level navigation target.

**Entry pattern (MVP):** tap building anywhere → Layer 1. User
chooses which part to focus on by tapping its header → Layer 2.
Spatial picking (tap roof on the 3D model → Layer 2 directly) is
**deferred** — see "Geometry constraint" below.

### Geometry constraint on spatial focus

Per-part spatial picking depends on per-part **geometry**, not just
per-part **data**. Carriage Town's procedural confidence-mix boxes
have no separate Roof mesh to hit-test against — "Roof" is just
the top 20% of an extruded box. Even after Blender archetypes ship,
they're parameterized templates with material slots, not
anatomically split mesh groups.

Spatial picking only makes sense for hand-modeled landmark buildings
(e.g. Whaley House) with named sub-meshes. Probably never for
procedural reconstructions. Defer as a Phase 5+ landmark-only
polish.

### Pending corrections visibility

**Pending badge, count only**, in MVP. Renders as a small pill on
the part header next to the ACC/ACT indicator:

`ROOF  [contested]  ·  2 pending`

Tapping the pill takes the resident to the correction form
pre-targeted at that part with an inline note: *"2 other residents
are suggesting corrections to this part. Feel free to add your own —
the moderator reviews them together."*

This:
- De-duplicates submissions (third resident sees "2 pending" and
  decides whether to add or skip)
- Gives ACC/ACT multiple independent signals on the same correction
- Doesn't propagate vandalism content (count only, not text)
- Honors the project's "show your work" frame

The full "living document" posture (pending corrections rendered at
low opacity over the approved geometry) is the dream Phase 6+ thing.
Defer until rendering multiple contradictory pending corrections has
a careful design that doesn't mislead.

## Form shape (when we build it)

Resident form fields:

1. **Target** (required, server-resolved from the part the resident
   was looking at): `target_type = building_part`, `target_id = <uuid>`,
   `kind = COMMUNITY_PART_CORRECTION`
2. **Proposed change** (required): inline editors for the part's
   fields, pre-filled with current values, the resident edits what
   they want to change
3. **Reasoning** (optional, generous textarea, no character cap):
   plain text where personal connection emerges naturally — "my
   great-aunt lived there..."
4. **Evidence URL** (optional): citation, archive link, blog post
5. **Photo upload** (optional): an attached image gets ingested as
   an ArtifactAnchor via TheseusBridge.IngestArtifact before
   submission
6. **Name + contact** (optional, hint: "lets the moderator follow
   up if your submission is interesting")
7. **Submit**

Server-stamped: `submitter_ip_hash`, `submitted_at_ms`,
rate-limit check (10/hour anonymous per IP).

## Moderator queue surfaces

`/admin/corrections` shape — not designed in detail yet. Sketch:

- Tenant-admin role gate
- Queue of `status='open'` corrections, oldest first
- Per-correction view: current spec on left, proposed change on
  right, evidence in middle, per-part checkboxes for partial accept,
  reasoning text rendered, ACC/ACT score (when wired)
- Approve action creates new spec version + changelog entry +
  projects to RustyRed via outbox
- Reject action retains submission as training example

`/admin/corrections` to be designed when the procedural pipeline is
shipping and the queue actually has data.

## Public changelog

`/open-flint-atlas/changelog` — simplest of the four. Read-only feed
of `changelog_entries` ordered by `published_at DESC`. Title +
summary + link to the spec version. No submitter identity shown.

## Phase 6 admin extensions

"Generate priors" button in the moderator queue + per-field
provenance display showing `from_source` vs `from_gnn_prior` vs
`manually_entered` vs `from_correction`. Designed when Phase 6
inference is wired.

## What this depends on shipping first

1. **Procedural reconstruction** — boxes (or richer meshes) render
   at correct positions with confidence-driven visuals
2. **Per-part navigation in dossier** — Layer 1 → Layer 2 focus
   shift exists in the React components
3. **GraphQL bridge from Civic Atlas backend** — frontend can read
   ReconstructionSpec rows via the Node sidecar
4. **ACC/ACT released + tested** — for the confidence indicator and
   the explanation panel
5. **`/admin/corrections` route + queue** — moderator infrastructure

When 1–3 are real, the correction loop becomes a useful feature
rather than an empty form. Revisit this doc then.

## Open questions when we resume

- How does the resident edit "Roof.form" specifically? Dropdown of
  enum values, or free-text proposed override? (My read: dropdown
  where the enum is closed, free-text otherwise.)
- How does the form behave on mobile? The dossier already has
  peek/half/full snap states; does the form open as a full sheet
  or push into the dossier?
- What does ACC/ACT's "explanation" output look like structurally?
  Plain prose? Bullet list of evidence inputs? Visual scoring
  breakdown? The frontend needs a contract from Theseus before this
  surface can be built.
- Should "named submitter, no correction history" rank differently
  in the moderator queue than "anonymous, similar payload"? Or do
  we trust ACC/ACT entirely?

## Cross-references

- `our-civic-atlas-backend/proto/civic_atlas/v1/corrections.proto` —
  the data contract
- `our-civic-atlas-backend/migrations/0003_corrections_phase_4.sql` —
  rate limits + changelog tables
- `our-civic-atlas-backend/crates/civic-atlas-server/src/corrections.rs` —
  service skeleton with per-part merge TODO
- `src/components/atlas/PlaceDossier.tsx` — existing dossier the
  per-part navigation extends
- `src/components/atlas/AtlasLostFlintDeckLayer.ts` — current
  procedural confidence shader (existing math)
- `travisgilbert.me/act` — ACC/ACT surface in Theseus
