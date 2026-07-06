---
name: dependency-lockfile-update
description: Workflow command scaffold for dependency-lockfile-update in our-civic-atlas.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /dependency-lockfile-update

Use this workflow when working on **dependency-lockfile-update** in `our-civic-atlas`.

## Goal

Updates dependency lockfiles and configuration for deployment or after dependency changes.

## Common Files

- `package.json`
- `package-lock.json`
- `.npmrc`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit package.json if dependencies change
- Regenerate package-lock.json
- Edit .npmrc or other config files if needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.