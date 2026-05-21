# Session Checkpoint (2026-05-21)

Cross-repo reconciliation session. The 2026-05-20 wrapup left the catchup
plan and the cross-repo launch plan describing items as open that Codex
then shipped end-to-end. This session ran no new product work; it walked
the four-repo system, verified what Codex landed, and updated the two
plan files so they reflect reality. The prior 2026-05-20 note has been
closed (`.md` suffix).

## What Codex shipped while the prior session was wrapped up

| Commit | Repo | Title | Effect on plan |
|---|---|---|---|
| `9600b7c fix(atlas): complete lane 1 readiness pass` | `Open-Flint-Atlas-main-release` | AGENTS.md three corrections + DEPLOYMENT.md and METHODOLOGY.md staleness sweep + 22 baseline visual PNGs + branch consolidation note. | Closes CU-L1-003, CU-L1-004, CU-L1-005, CU-L1-006 in the catchup plan. |
| `79b8920 feat(proto): align reconstruction spec with usd parity` | `our-civic-atlas-backend` | Proto rename PR landing the 19 renames + 30 missing-in-proto additions + `OpeningOverride` from the Lane 4 parity audit. | Closes XRL-A-003 in the cross-repo plan. |
| `40cdfb4 feat(reconstruction): wire procedural pipeline` | `our-civic-atlas-backend` | Procedural pipeline wired across the Axum services using the renamed proto. | Closes XRL-A-004. |
| `aba2d1e docs(backend): align ingest boundary with ray runpod` | `our-civic-atlas-backend` | Backend documents the Ray on RunPod ingest boundary. | Supports XRL-B-005 design. |
| `c2edf52 chore(ingest): migrate execution stubs to ray runpod` | `civic-atlas-ingest` | Modal directory removed; `ray_cluster/runpod.yaml` and `scripts/check_ray_migration.py` added; existing intent preserved across all ingest entrypoints. | Closes XRL-B-000. |
| `9f14ab6 feat(pairformer): add tenant-aware civic building head` | `civic-atlas-ingest` | Pairformer architecture lands at `civic_atlas_ingest/building_head_pairformer.py` (421 lines) with all three Lane 4 seams: separable `CivicPairUpdate` (line ~104), separable `CivicConfidenceHead` (line 133), `default_tenant_context` on the config + `tenant_context` on the outputs. Test at `tests/test_building_head_pairformer.py`. | Closes XRL-B-001. |
| `eeab9bb feat(ingest): fold civic-atlas-primitives into primitives/ subdir` | `civic-atlas-ingest` | Primitives consolidated under `primitives/`. | Supports XRL-C-001. |

In addition the Lane 4 documents were mirrored into both sibling repos
(`our-civic-atlas-backend/docs/orchestrate/` and
`civic-atlas-ingest/docs/orchestrate/`). Diff vs source: the two
coordination notes match byte-for-byte; the parity audit gained an
additive YAML frontmatter block tracking the mirror provenance
(`mirror_note`, `mirrored_from_commit: 9febedc`,
`source_head_at_mirror: eace782`, `mirrored_on: 2026-05-20`). XRL-A-001
and XRL-A-002 are therefore done.

XRL-A-005 (frontend GraphQL codegen) is wired: `codegen.ts` is
configured against `docs/design/flint-graphql-schema-v1.graphql`,
`src/lib/api/graphql/generated/` is checked in, and `src/lib/api/graphql/client.ts`
exists. Codegen will rerun on the next schema change. This session
deliberately did not run `npm run codegen` to avoid an unrelated diff
colliding with the parallel `r3f-atlas-scene-quality` worktree work.

## What this session did

- Read the two prior session notes, the catchup plan, the cross-repo
  plan, and the orchestrate-non-ui execution report.
- Located the sibling repos at
  `/Users/travisgilbert/Tech Dev Local/Creative/Website/our-civic-atlas-backend`,
  `/Users/travisgilbert/Tech Dev Local/Creative/Website/civic-atlas-ingest`,
  `/Users/travisgilbert/Tech Dev Local/Creative/Website/Index-API`.
- Verified the Lane 4 documents in sibling repos against this repo's
  originals.
- Verified the Pairformer architecture file for all three Lane 4 seams.
- Verified the frontend GraphQL codegen wiring.
- Updated `docs/plans/catchup-plan-2026-05-20.md` with a fourth
  revision-log entry and Status callouts under the Lane 1 and Lane 4
  tables. Original task definitions, acceptance criteria, and validators
  are unchanged. Execution Order list trimmed to remaining items.
- Updated `docs/plans/cross-repo-launch-plan-2026-05-20.md` with a
  Revision Log section and Status callouts under the Phase A and Phase B
  tables. Original task definitions, acceptance criteria, and validators
  are unchanged.
- Closed the prior session note (renamed
  `session-2026-05-20-cross-repo-launch-plan.open.md` to
  `session-2026-05-20-cross-repo-launch-plan.md`).
- Created this note.

## What this session did NOT do

- Did NOT touch any `.tsx` or visual surface. Codex is concurrently
  working on the `r3f-atlas-scene-quality` worktree at
  `/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas`
  and the design-gate forcing function applies to any visual code anyway.
- Did NOT run `npm run codegen`. The codegen wiring is verified;
  regeneration is a follow-on action tied to the next schema change
  or routine refresh, and the diff would risk collision with the
  parallel worktree.
- Did NOT mirror the Lane 4 documents myself. Codex already did it
  before I checked.
- Did NOT touch any Phase C, D, E, F items. Those remain open and the
  cross-repo plan still names them.

## Current state of every XRL and CU item

Authoritative status lives in the two plan files as of this commit.
Summary for resume:

- **Catchup Lane 1**: CU-L1-001, CU-L1-003, CU-L1-004, CU-L1-005,
  CU-L1-006 done. CU-L1-002 (time-travel visual bug fix) reserved for
  the Lane 3 design brainstorm session because it is UI work.
- **Catchup Lane 3**: CU-L3-001 through CU-L3-005 still open. Each
  blocks on a design brainstorm before any visual code.
- **Catchup Lane 4**: CU-L4-001, CU-L4-002, CU-L4-003 done.
- **Cross-repo Phase A**: XRL-A-001, XRL-A-002, XRL-A-003, XRL-A-004
  done. XRL-A-005 wired (regen on next schema change).
- **Cross-repo Phase B**: XRL-B-000, XRL-B-001 done. XRL-B-002 through
  XRL-B-005 open.
- **Cross-repo Phase C**: XRL-C-001 through XRL-C-004 open.
- **Cross-repo Phase D**: XRL-D-001 through XRL-D-006 open. Each is
  gated on a Lane 3 brainstorm or a Phase B / C dependency.
- **Cross-repo Phase E**: XRL-E-001 through XRL-E-004 open. Integration
  milestone.
- **Cross-repo Phase F**: explicit V1 deferrals (USD converter,
  Graph-LoRA, Phase 4 UI, Civic Model Studio, etc.); all still open by
  design.

## Recommended next session actions

Two parallel tracks unblock the launch goal at this point. They have
no dependencies on each other; either order works.

**Track 1: Phase B continuation (`civic-atlas-ingest` session)**.
Pick up XRL-B-002 (training corpus ingestion) against
`civic_atlas_ingest/ingest_overpass.py`, `ingest_sanborn.py`,
`ingest_assessor.py`. Output to S3 as Parquet per the existing schema.
Then XRL-B-003 (Ray Train pipeline) and XRL-B-004 (Ray Serve inference)
follow in that repo's session.

**Track 2: Phase C parallel start (`civic-atlas-ingest` session)**.
XRL-C-001 (8 Blender geometry-nodes archetypes) is hand work that does
not depend on Phase B. Each `.blend` file matches an existing MANIFEST
contract under `civic-atlas-ingest/primitives/archetypes/<slug>/`.

**Track 3: Lane 3 design brainstorm (this repo, no implementation)**.
Start CU-L3-001 (Lost Flint UI proposal) per the design-gate skill.
Requires `superpowers:brainstorming` + `impeccable shape lost-flint-ui`
+ `ui-design-pro:design-theory` + a scan of `Theseus/Design Components/`.
Output: an approved proposal at `docs/design/lost-flint-ui-proposal.md`.
This unblocks XRL-D-002 and XRL-D-003 once design is approved.

## Three considerations carried forward

The 2026-05-20 wrapup flagged three considerations the user had not
acted on; they remain unresolved and should be answered before the
Phase B training pipeline truly executes (XRL-B-003):

1. **GPU SKU pinning on RunPod**. Cross-repo plan still says "H100 or
   A100 typical" without pinning one. If a preference exists (likely
   A100 80GB for the training corpus size), it's a one-line update to
   the Platform Decisions table.
2. **Ray cluster topology**. The plan calls for `ray_cluster/runpod.yaml`
   but does not specify per-environment vs shared-with-namespaces.
   `civic-atlas-ingest/ray_cluster/runpod.yaml` now exists; that file
   determines the answer in practice.
3. **DGL vs PyG**. The Pairformer architecture file (`building_head_pairformer.py`)
   imports `torch_geometric` (PyG). The decision is therefore made by
   commit `9f14ab6`. The cross-repo plan still says "either acceptable";
   factual reality is PyG.

These are not blocking; they're loose ends that the cross-repo plan
should eventually tighten.

## Files the next session should read first

1. This file.
2. `docs/plans/catchup-plan-2026-05-20.md` (with the Lane 1 and Lane 4
   Status callouts at 2026-05-21).
3. `docs/plans/cross-repo-launch-plan-2026-05-20.md` (with the
   Revision Log and the Phase A and Phase B Status callouts).
4. `docs/plans/our-civic-atlas-north-star-execution-plan.md` (unified
   product spec).
5. `docs/notes/session-2026-05-20-cross-repo-launch-plan.md` (closed
   prior session note, still useful as the source of the 2026-05-20
   commits' rationale).
6. The most recent sibling-repo commits if a backend or ingest session
   is starting: `aba2d1e`, `79b8920`, `40cdfb4` (backend) and
   `c2edf52`, `9f14ab6` (ingest).

## Repo state

| Repo | Branch | Status at session end |
|---|---|---|
| `Open-Flint-Atlas-main-release/` | `main` | Reconciliation commit pending (this note + two plan-file edits). Working tree otherwise clean. |
| `Open-Flint-Atlas/` (sibling worktree) | `r3f-atlas-scene-quality` | Codex active. Not touched this session. |
| `our-civic-atlas-backend/` | `main` at `aba2d1e` | Untouched this session. Phase A done; Phase B-005 (backend bridge) and Phase C-003 (Scene Foundry orchestration) are the next backend touchpoints. |
| `civic-atlas-ingest/` | `main` at `c2edf52` | Untouched this session. XRL-B-002 through XRL-B-004 and all of Phase C-001/002/004 are the next ingest touchpoints. |
| `Index-API/` | `main` | Untouched this session. No XRL items target it directly except as IngestArtifact consumer. |
