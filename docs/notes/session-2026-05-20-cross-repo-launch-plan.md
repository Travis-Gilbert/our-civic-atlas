# Session Checkpoint — 2026-05-20

Cross-repo cleanup and launch planning session. Three commits landed on
`origin/main`: the Pascal-style node-tree adapter + Lane 4 strategic
seams, the cross-repo launch plan (XRL-A through XRL-F), and the Ray
on RunPod platform retarget (Modal account retired).

Read this whole file before resuming. `/catchup` will surface it
(`.open.md` suffix). The prior 2026-05-18 note has been closed
(`.md` suffix).

## Update - CU-L1 execution pass later on 2026-05-20

CU-L1-002 through CU-L1-006 have now been executed in this repo:

- CU-L1-002: time-travel visual confirmation fixed. The 1925 Lost Flint state
  now shows a persistent Year badge with the visible Lost Flint count, suppresses
  the stale no-results dropdown, and dims the OSM period context.
- CU-L1-003: `AGENTS.md` now says Leaflet is fully retired, R3F is only a
  selective Lost Flint per-part overlay, and multi-tenancy is invariant.
- CU-L1-004: stale public-package deployment/source-path/domain/renderer docs
  were swept to `flint.ourcivicatlas.org`, `src/data/open-flint-atlas/...`, and
  the current MapLibre + deck.gl posture.
- CU-L1-005: UCA-024 screenshots were captured under
  `docs/visual-evidence/2026-05-20/`.
- CU-L1-006: branch decisions were recorded in
  `docs/notes/session-2026-05-20-branch-consolidation.md`; the merged remote
  branch `origin/mainline-island-port` was deleted.

Remaining in-repo catchup work after this pass is Lane 3 design brainstorms
CU-L3-001 through CU-L3-005.

## What shipped this session

| Commit | Title | Role |
|---|---|---|
| `9febedc` | feat(atlas): land reconstruction-node-tree adapter + Lane 4 strategic seams | Option C from the 2026-05-20 theorize Theorem Brief. Lands the Pascal-style node-tree adapter (51 nodes / 5 reconstructions, validated) PLUS three Lane 4 documents (parity audit, OpeningOverride coord note, Pairformer adapter-seam coord note) PLUS catchup plan with Lane 4 added. |
| `e86f10a` | docs(atlas): cross-repo launch plan + promote OpenUSD to UCA-022 | Cross-repo launch plan generated at `docs/plans/cross-repo-launch-plan-2026-05-20.md`. UCA-022 in the unified north-star plan promoted to bind OpenUSD as the canonical publication format. |
| `5e0ddb6` | docs(atlas): retarget ML compute from Modal to Ray on RunPod | Platform correction. User retired the Modal account on 2026-05-20. All forward-looking ML work targets Ray (https://github.com/ray-project/ray) on RunPod. Cross-repo plan revised; new XRL-B-000 added to migrate `civic-atlas-ingest` off Modal. |

## Source of truth (current planning artifacts)

The plan documents are now the live truth. Re-read them on resume; do not
treat this session note as authoritative beyond what it points at.

| Document | Role |
|---|---|
| `docs/plans/our-civic-atlas-north-star-execution-plan.md` | Unified product spec. UCA-001 through UCA-024. UCA-022 updated 2026-05-20 to bind OpenUSD. |
| `docs/plans/catchup-plan-2026-05-20.md` | In-repo catchup plan. Lane 1 (frontend hygiene), Lane 3 (held-UCA design brainstorms), Lane 4 (strategic architecture seams). Three-pass revision log captures session evolution. |
| `docs/plans/cross-repo-launch-plan-2026-05-20.md` | Cross-repo launch plan. Phases A through F, 25 XRL items across `Open-Flint-Atlas-main-release`, `our-civic-atlas-backend`, `civic-atlas-ingest`, `Index-API`. Platform Decisions section names Ray on RunPod. |
| `docs/design/proto-usd-field-parity-audit.md` | CU-L4-001. Field-by-field divergence between `our-civic-atlas-backend/proto/civic_atlas/v1/reconstruction.proto` and the Anthropic-authored `civicAtlasSchema`. 19 renames + 30 missing-in-proto + 15 missing-in-USD. |
| `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md` | CU-L4-002. Codex-addressed note requesting `repeated OpeningOverride opening_overrides` on `OpeningGrid` at field 7. |
| `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` | CU-L4-003. Codex/ingest-addressed note requesting separable `PairUpdate` block, separable `ConfidenceHead` block, and `tenant_context` parameter on the input encoder + output heads BEFORE any training code lands. Platform-corrected 2026-05-20. |

## Strategic input from this session (external doc)

`/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org/Open USD, PairFormer +Nodetree.md`
(Anthropic-authored). This document supplied the three strategic decisions
landed this session: OpenUSD as canonical publication format, Pairformer
adapter seams for post-V1 Graph-LoRA, and the Pascal-style node-tree
adapter as the Phase 4 community correction keystone. The doc itself is
not in this repo; it stays in the planning vault. The on-disk artifacts
inside this repo are the concretized decisions.

## Platform decision (2026-05-20 user correction)

User retired the Modal account. All ML work, especially GNN training,
moves to Ray on RunPod:

- Compute: RunPod GPU pods (H100, A100, A6000, L40S; SKU per workload)
- Training framework: Ray (Ray Train wrapping PyTorch + PyG or DGL)
- Inference: Ray Serve on RunPod (replaces prior Modal web endpoint pattern)
- Asset rendering: Ray task with headless Blender on a RunPod GPU pod
- S3-compatible object store: unchanged

Existing CLAUDE.md status entries referencing Modal in the broader
Theseus / Index-API context belong to a different project scope; they
are historical facts and were not retroactively edited.

## What this session did NOT do

- Did NOT mirror the Lane 4 documents into the sibling repos
  (`our-civic-atlas-backend/docs/orchestrate/`, `civic-atlas-ingest/docs/orchestrate/`).
  That is XRL-A-001 / XRL-A-002. Next session.
- Did NOT open the proto rename PR (XRL-A-003). The audit is ready; the
  PR has not landed.
- Did NOT update `AGENTS.md` in this repo with the three corrections
  carried since 2026-05-18 (Leaflet retired, R3F selective revival,
  multi-tenancy invariant). That is CU-L1-003. Still open.
- Did NOT diagnose the time-travel visual bug (CU-L1-002). Still open.
- Did NOT sweep stale docs (`DEPLOYMENT.md`, `METHODOLOGY.md`). That is
  CU-L1-004. Still open.
- Did NOT capture UCA-024 baseline visual evidence (CU-L1-005). Still open.
- Did NOT reconcile the 5 local branches (CU-L1-006). Still open.
- Did NOT touch any code in `our-civic-atlas-backend`, `civic-atlas-ingest`,
  or `Index-API`. This session was planning + frontend file additions
  only.
- Did NOT run a design brainstorm pass for any Lane 3 item. Those still
  need `superpowers:brainstorming` + `impeccable shape` + `ui-design-pro:design-theory`
  before any visual code on the held UCA items.

## Recommended next session action

**Primary recommendation**: start cross-repo plan execution at **XRL-A-001**:
mirror the three Lane 4 documents into the sibling repos' `docs/orchestrate/`
directories. This is mechanical, low-risk, and unblocks Codex's next session
to act on the coordination notes.

After XRL-A-001 + XRL-A-002 land, the natural next step is XRL-A-003
(open the proto rename PR in `our-civic-atlas-backend`). That is a
sibling-repo PR, not a this-repo commit.

**Alternative**: continue catchup Lane 1. CU-L1-002 (time-travel bug)
and CU-L1-003 (AGENTS.md three corrections) are both small and finishable
in a focused session. These don't block the cross-repo plan; they're
independent hygiene.

**Alternative**: start the Lane 3 design brainstorm sequence. CU-L3-001
(Lost Flint UI) is the highest-priority brainstorm; it gates XRL-D-002
and XRL-D-003 later. Brainstorm needs no sibling-repo coordination.

## Open todos (carried)

1. CU-L1-002: time-travel visual confirmation bug (still open).
2. CU-L1-003: update AGENTS.md three corrections (Leaflet retired, R3F
   qualified revival, multi-tenancy invariant) (still open).
3. CU-L1-004: sweep stale `DEPLOYMENT.md` domains + `METHODOLOGY.md`
   path drift (still open).
4. CU-L1-005: capture UCA-024 baseline visual evidence at desktop +
   390 x 844 (still open).
5. CU-L1-006: reconcile the 5 local branches (still open).
6. CU-L3-001 through CU-L3-005: design brainstorms for held UCA items
   (Lost Flint UI, visual grammar v2, Node Horizon, mobile dossier,
   primitive vocabulary). All still open.
7. CU-L4-001 / CU-L4-002 / CU-L4-003: documents committed in this
   session; the COORDINATION acts (mirror into sibling repos, open
   the proto rename PR, write the Pairformer with seams) live in the
   cross-repo plan as XRL-A-001 through XRL-A-005 + XRL-B-001.
8. XRL-A-001 through XRL-F-010: full cross-repo launch sequence
   (Phases A proto stabilization, B Pairformer V1, C Scene Foundry V1,
   D frontend hand-back consumption, E Carriage Town launch, F post-V1
   deferrals).

## Three considerations the user flagged but did not act on this session

(Captured for the next planning iteration; not blocking.)

1. **GPU SKU pinning on RunPod**: plan says "H100 or A100 typical" but
   does not pin one. If a preference exists (e.g., A100 80GB for the
   training corpus size), it's a one-line addition to the Platform
   Decisions table in `cross-repo-launch-plan-2026-05-20.md`.
2. **Ray cluster topology**: plan calls for a `ray_cluster/` config
   directory but does not specify one-cluster-per-environment vs
   shared-cluster-with-namespaces. XRL-B-000 implementation detail.
3. **DGL vs PyG**: plan says "either acceptable" per the Anthropic doc;
   if a preference exists, it's an XRL-B-001 detail.

## Repo state

| Repo | Branch | Status |
|---|---|---|
| `Open-Flint-Atlas-main-release/` | `main` | `5e0ddb6` pushed; three session commits clean; working tree clean (this note is the only pending change at wrapup time) |
| `our-civic-atlas-backend/` | `main` | Last touched 2026-05-18 (per prior session note's `92444f3`). Untouched this session. Ready to receive XRL-A-001 mirror + XRL-A-003 PR. |
| `civic-atlas-ingest/` | `main` | Last touched 2026-05-18 (per prior session note's `eeab9bb`). Untouched this session. Ready to receive XRL-A-002 mirror + XRL-B-000 migration. |
| `Index-API/` | `main` | Untouched this session. No XRL items target it directly except as IngestArtifact consumer. |

## Files the next session should read first (in order)

1. This file.
2. `docs/plans/catchup-plan-2026-05-20.md` (Lane 1 / 3 / 4 status).
3. `docs/plans/cross-repo-launch-plan-2026-05-20.md` (XRL-A through XRL-F sequence).
4. `docs/plans/our-civic-atlas-north-star-execution-plan.md` (unified product spec; UCA-022 updated to bind USD).
5. `docs/design/proto-usd-field-parity-audit.md` (the audit that drives XRL-A-003).
6. `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md`.
7. `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` (platform note at top contextualizes Modal-to-Ray migration).
8. `AGENTS.md` (still has the three carried corrections to apply; CU-L1-003).
9. Prior session note: `docs/notes/session-2026-05-18-codex-handoff-phases-0-3.md` (closed this session).

## Sequencing note

The cross-repo launch plan's XRL-A through XRL-F items run across four
repos. The plan is durable. Future sessions resume on any specific XRL
item by reading the plan and matching the acceptance criteria for the
named item. The XRL IDs are the handles; new sessions do not need to
re-litigate scope.
