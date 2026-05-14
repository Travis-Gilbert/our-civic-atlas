# Governance

Open Flint Atlas should be governed as public infrastructure. Its credibility
comes from visible sources, clear review roles, and refusal to hide uncertainty.

## Roles

| Role | Responsibility |
|---|---|
| Maintainer | Keeps the package buildable, reviews code and release checklist changes. |
| Data steward | Reviews source registry changes, probes, freshness notes, and public read-model eligibility. |
| Reviewer | Reviews community observations and writes safe public summaries. |
| Privacy reviewer | Checks contribution, photo, household-level, and identity risks before publication. |

The initial maintainer is the project owner until a small civic stewardship
group exists.

## Decision Rules

- Source additions require a registry entry, a probe, and a validation pass.
- New public fields require privacy review and read-model schema updates.
- Community observations require review before public display.
- Forecasts and model outputs require prediction labels and cannot replace
source-grounded records.
- Rejected reports remain private and auditable.

## Update Cadence

The v0.1 fixture package is reviewed manually. A future standalone repo should
publish a simple monthly source freshness check and a changelog entry when a
public read model changes.

## Issue Triage

Use issues or review notes for:

- Source corrections.
- Missing caveats.
- Accessibility defects.
- Privacy risks.
- Data freshness regressions.
- Public UI problems.

Privacy risks should be handled before feature work.
