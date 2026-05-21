# Branch Consolidation - 2026-05-20

Repo: `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas-main-release`

## Summary

CU-L1-006 expected five overlapping branch handles. Live refs after
`git fetch --prune` are smaller:

- `main`
- `r3f-atlas-scene-quality`
- `origin/main`

`origin/mainline-island-port` existed at the start of this pass, was already
an ancestor of `main`, and was deleted from origin.

## Decisions

| Branch handle | Live ref state | Decision | Operation |
|---|---|---|---|
| `main` | local branch tracking `origin/main` | Keep as delivery branch. | Inspected status and branch graph. |
| `r3f-atlas-scene-quality` | local branch checked out in sibling worktree `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas` | Keep parked. Do not merge into `main`; it remains the quarantined R3F experiment. | Inspected status and branch graph; no mutation. |
| `atlas-mobile-runtime-packets` | no local or remote ref present | Treat as already absorbed. `main` contains `56fd41a feat(atlas): land mobile runtime packet surfaces`. | Ref lookup and commit lookup only. |
| `mainline-island-port` | remote branch `origin/mainline-island-port` at `21933fe`, no local branch | Delete; its history is already in `main` through `4b59617` and later commits. | `git push origin --delete mainline-island-port`, then `git fetch --prune`. |
| `merge-mainline-island-port` | no local or remote ref present | Treat as already absorbed; merge commit `4b59617` is in `main`. | Ref lookup and commit lookup only. |

## Current Ref Snapshot

```text
main                    eace782 tracks origin/main
origin/main             eace782
r3f-atlas-scene-quality 4fd7a19 parked in sibling worktree
```
