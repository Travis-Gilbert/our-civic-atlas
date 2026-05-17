# Disputes

Our Civic Atlas does not flatten disagreement into a single answer. When two
records about the same place or event do not agree, the atlas should show the
disagreement and let residents see why.

This document describes how the atlas treats disputes, who acts on them, and
what a resident or reviewer should expect.

## Where Disputes Show Up

A dispute can arise in any of these places:

- Two official sources publish different facts about the same place.
- A community observation conflicts with an official source.
- A previously accepted record is contradicted by a newer source.
- A reviewer challenges the caveat, freshness, or trust tier of a source entry.
- A resident reports that a public field misrepresents their address, block,
  or neighborhood.

The atlas surfaces disputes on the relevant place card, dossier, or source
panel. It should never hide a disputed record without an audit note.

## States A Disputed Record Can Be In

```text
clean -> contested -> reviewed -> resolved / unresolvable / superseded
```

- `clean`: no known conflict.
- `contested`: at least one other record disagrees; both remain visible.
- `reviewed`: a reviewer has read both sides and added a public note.
- `resolved`: the public atlas now reflects the agreed reading; the original
  conflict stays in the audit trail.
- `unresolvable`: the disagreement remains; the atlas keeps both records and
  the public-facing copy explains the open question.
- `superseded`: a newer source has settled the matter; the older record stays
  for history.

These states attach to the place card, not to the source itself. The source
registry remains the source of truth for source metadata.

## Who Acts

| Step | Role |
|---|---|
| Spot a conflict | Anyone (resident, reviewer, maintainer, automated probe). |
| Open a dispute | Reviewer, maintainer, or contributor with sources. |
| Read and label | Reviewer. Privacy reviewer joins if any private fields are involved. |
| Publish the public note | Maintainer or designated reviewer. |
| Update the public read model | Maintainer. |
| Close the audit entry | Maintainer. |

The current maintainer is the project owner. The civic stewardship group will
take over routine dispute review once it exists.

## What A Public Dispute Note Must Include

- Place id and dossier link.
- The two (or more) sources involved, by name and freshness.
- A plain-language description of what is in dispute.
- Whether the dispute affects the public reading of the place.
- Caveat text shown to residents.
- A pointer to the audit entry.

The note should be readable by a Flint resident with no civic-data background.
It must not contain raw submitter information, private reviewer notes, or
household-level details.

## What Disputes Do Not Do

- A dispute does not delete the older record.
- A dispute does not override an official source automatically.
- A dispute does not change a confidence label without a reviewer note.
- A community observation does not become an official fact by being repeated.

## Where The Audit Lives

The current package keeps a dispute audit as part of the contribution review
trail in `docs/plans/open-flint-atlas/contribution-review-privacy.md`. The
standalone repo continues that pattern. A future standalone repo should add a
dedicated `disputes/` log of resolved cases with public notes only.

## Related Documents

- `GOVERNANCE.md` for decision rules and triage.
- `METHODOLOGY.md` for source trust tiers and confidence cards.
- `PRIVACY.md` for what is private in any community observation.
- `OBSERVABILITY.md` for events the system emits when disputes change state.
