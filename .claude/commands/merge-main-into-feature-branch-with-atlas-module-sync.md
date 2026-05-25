---
name: merge-main-into-feature-branch-with-atlas-module-sync
description: Workflow command scaffold for merge-main-into-feature-branch-with-atlas-module-sync in our-civic-atlas.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /merge-main-into-feature-branch-with-atlas-module-sync

Use this workflow when working on **merge-main-into-feature-branch-with-atlas-module-sync** in `our-civic-atlas`.

## Goal

Synchronizes a feature branch with main, bringing in latest atlas modules, shared components, and data fixtures.

## Common Files

- `docs/plans/*.md`
- `docs/design/*.md`
- `src/components/atlas/*.tsx`
- `src/lib/atlas/*.ts`
- `src/data/open-flint-atlas/fixtures/*`
- `package.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Merge main into feature branch
- Update or add documentation in docs/plans/ and docs/design/
- Sync or update shared UI components in src/components/atlas/
- Sync or update atlas logic in src/lib/atlas/
- Sync or update data fixtures in src/data/open-flint-atlas/fixtures/

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.