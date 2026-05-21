# Catch-Up Plan: Open Flint Atlas — Frontend Hygiene + Held-UCA Design Pass

Generated 2026-05-20 from a survey of the unified north-star plan, the
2026-05-18 codex-handoff session note, and the orchestrate-non-ui execution
report. Purpose: land the in-flight, the carried, and the design-gated work
in this repo so the next planning pass starts from a clean checklist.

## Source of Truth Stack

- Active execution plan: `docs/plans/our-civic-atlas-north-star-execution-plan.md`
- Drift remediation grounding: `docs/plans/v1-gap-remediation-plan.md`
- Most recent session: `docs/notes/session-2026-05-18-codex-handoff-phases-0-3.open.md`
- Phase 4 UI decisions (locked, deferred): `docs/design/phase-4-correction-loop-ui.md`
- Visual gate rules: project `CLAUDE.md` Visual Design + `~/.claude/skills/visual-work-design-gate/SKILL.md`

## Posture

- Spec is the floor, not the ceiling. Every requirement in the chosen lanes is
  part of the definition of done.
- Deferrals are surfaced individually with a one-sentence justification.
  No silent MVPs, no quiet "non-goals" table.
- No design-skill bypass on visual surfaces. Lane 3 items require
  `superpowers:brainstorming` plus `impeccable shape` plus
  `ui-design-pro:design-theory` plus a curated-component scan BEFORE any
  `.tsx` is written.
- No worktrees. No time or compute estimates. No em or en dashes. No emojis
  in code or docs.

## Repository Boundary

This plan covers work in `Open-Flint-Atlas-main-release` only. The user's
broader intent is cross-repo cleanup; that cross-repo plan follows this
catchup pass. Backend catch-up belongs in separate sessions against:

- `our-civic-atlas-backend` (Rust workspace, Axum/gRPC)
- `civic-atlas-ingest` (Ray on RunPod; ML training, inference, Blender Scene Foundry; migrating off Modal per 2026-05-20 user correction)
- `Index-API` Theseus bridge sidecar

Items requiring those repos are listed in section "Out of Scope for This
Plan" so they remain visible without being silently dropped. Lane 4 below
contains coordination notes addressed to those sibling repos; the notes
themselves are documents in this repo, not code changes in the siblings.

## Revision Log

- 2026-05-20 (first pass): added Lane 4 (Strategic Architecture Seams) and
  expanded CU-L1-001 scope after the theorize Theorem Brief named USD
  field-name parity, OpeningOverride proto addition, and Pairformer adapter
  seams as now-decisions. Committed in `9febedc`.
- 2026-05-20 (second pass): cross-repo launch plan generated at
  `docs/plans/cross-repo-launch-plan-2026-05-20.md`. That plan acts on the
  Lane 4 coordination notes and sequences the work across all four repos
  (this one, `our-civic-atlas-backend`, `civic-atlas-ingest`, `Index-API`)
  to get from the current state to procedural algorithm rendering buildings
  before launch. UCA-022 in the unified north-star plan was promoted to
  include OpenUSD as the canonical publication format in the same commit.
  The catchup plan's remaining items (CU-L1-002 through CU-L1-006 and the
  Lane 3 brainstorms) continue alongside the cross-repo plan; they are not
  superseded.
- 2026-05-20 (third pass): platform correction. User retired the Modal
  account and is moving all ML work onto Ray (https://github.com/ray-project/ray)
  on RunPod. Cross-repo launch plan revised to reflect Ray + RunPod as
  the target platform; new XRL-B-000 added to migrate `civic-atlas-ingest`
  off Modal; Pairformer adapter-seam coordination note updated to point
  at the post-migration paths. Catchup plan's repo description updated
  in the same revision.
- 2026-05-21 (fourth pass, reconciliation only): Codex shipped a Lane 1
  readiness pass (`9600b7c fix(atlas): complete lane 1 readiness pass`)
  while the prior session was wrapped up. CU-L1-003 (AGENTS.md three
  corrections), CU-L1-004 (stale doc sweep), CU-L1-005 (UCA-024 baseline
  visual evidence), and CU-L1-006 (5-branch reconciliation) all landed
  in that single commit. Status callouts added to Lane 1 and Lane 4
  tables; execution order trimmed to remaining items. No content changes
  to task definitions, acceptance criteria, or validators.

## Lane 1: Frontend Hygiene (no design gate)

All Lane 1 items are non-visual: code commits, documentation, branch ops,
visual evidence capture. None of them mount new product surfaces, so the
design-gate skill does not fire.

| ID | Task | Backreference | Acceptance | Validator |
|---|---|---|---|---|
| CU-L1-001 | Land reconstruction-node-tree adapter slice already in working tree, with expanded keystone scope. | UCA-007 contract extension; UCA-013 frontend prep; Phase 4 community correction UX prerequisite | Working-tree files (`src/lib/atlas/reconstruction-node-tree.ts`, `scripts/validate-reconstruction-node-tree.mjs`, `docs/design/reconstruction-node-tree-adapter.md`, `package.json` script entry) commit cleanly. A scope-note comment in `reconstruction-node-tree.ts` explicitly names the deferred branches (Opening generation, multi-side facades, multi-level levels, Ornament subtree, OpeningOverride round-trip). Three Lane 4 documents land alongside (parity audit, OpeningOverride coordination note, Pairformer adapter-seam coordination note). Validator runs green; typecheck, lint, build green. | `npm run validate:reconstruction-node-tree`, `npm run typecheck`, `npm run lint`, `npm run build`, markdown review of the three Lane 4 documents |
| CU-L1-002 | Diagnose and fix the time-travel visual-confirmation bug. | Carried open-todo #1 from `session-2026-05-18-codex-handoff-phases-0-3.open.md` | Typing a year in the search bar produces an unmistakable on-screen state. Concrete acceptance: (a) when `atlasYear` is non-null, an on-screen Year overlay renders so the wiring is verifiable; (b) OSM features dim or filter at a zoom level where the user can see the change; (c) Lost Flint reconstruction set updates with the year. | Manual smoke at `/open-flint-atlas` with year typed; before/after screenshot. |
| CU-L1-003 | Update AGENTS.md with three carried corrections. | Carried open-todo #2 from the 2026-05-18 note | AGENTS.md says (a) Leaflet is fully retired (not "mobile fallback"); (b) R3F is parked as a standalone scene renderer but selectively revived as Lost Flint per-part overlay only, never as the base; (c) multi-tenancy is invariant: every backend call carries `TenantContext`, every PostGIS table has `tenant_id` with RLS, every RustyRed namespace is tenant-scoped. | Doc review against the three claims above. |
| CU-L1-004 | Sweep stale public docs and references. | Flagged in `orchestrate-non-ui-execution-report.md` "New Findings" | `DEPLOYMENT.md` no longer references `mappingourcity.org` or `flintmapped.org`; reflects `flint.ourcivicatlas.org`. `METHODOLOGY.md` source-registry path corrected from `docs/plans/open-flint-atlas/source-registry.json` to `src/data/open-flint-atlas/source-registry.json`. Cross-link consolidation considered for README files. | Markdown grep + doc review. |
| CU-L1-005 | Capture UCA-024 baseline visual evidence. | UCA-024 partial; UCA-027 mobile gate prep | Baseline screenshots saved under `docs/visual-evidence/2026-05-20/baseline/` for desktop (1280+) AND 390 x 844 mobile across these currently-routed pages: `/open-flint-atlas`, `/open-flint-atlas/[lens]`, `/open-flint-atlas/sources`, `/open-flint-atlas/contribute`, `/open-flint-atlas/methodology`, `/open-flint-atlas/node`, `/open-flint-atlas/place`, `/open-flint-atlas/object`, `/open-flint-atlas/scene`, `/open-flint-atlas/lost-flint`, `/open-flint-atlas/lost-flint/carriage-town`. Selected-place dossier states also captured. | Dev server up; `npm run validate:routes:live`; manual screenshot review. |
| CU-L1-006 | Reconcile the 5 local branches with overlapping history. | Carried from `orchestrate-non-ui-execution-report.md` "Incomplete or Blocked Work" | Each of `main`, `r3f-atlas-scene-quality`, `atlas-mobile-runtime-packets`, `mainline-island-port`, `merge-mainline-island-port` has a recorded decision: keep / merge / delete, plus the actual git operation executed. Decisions land in a session note for audit trail. | `git branch -av` plus `git log` comparisons; decisions captured in `docs/notes/session-<date>-branch-consolidation.md`. |

### Lane 1 Status (as of 2026-05-21)

| ID | Status | Evidence |
|---|---|---|
| CU-L1-001 | done | Committed `9febedc feat(atlas): land reconstruction-node-tree adapter + Lane 4 strategic seams`. Validator `npm run validate:reconstruction-node-tree` green for 51 nodes across 5 reconstructions. |
| CU-L1-002 | open (UI) | Validator script `scripts/validate-atlas-time-travel.mjs` was added in `9600b7c` but the underlying bug fix is UI work and is paused for the design brainstorm session per project posture. |
| CU-L1-003 | done | Commit `9600b7c` AGENTS.md hunk: Leaflet "fully retired from the public render path"; R3F "selectively revived only as a Lost Flint per-part reconstruction overlay"; multi-tenancy invariant paragraph added with `TenantContext` + PostGIS `tenant_id` + RLS + RustyRed namespace language. |
| CU-L1-004 | done | Commit `9600b7c` DEPLOYMENT.md hunk: `mappingourcity.org` and `flintmapped.org` removed; `flint.ourcivicatlas.org` named as the canonical launch domain. METHODOLOGY.md hunk: source-registry path corrected from `docs/plans/open-flint-atlas/...` to `src/data/open-flint-atlas/...`. |
| CU-L1-005 | done | Commit `9600b7c` added 22 baseline PNGs under `docs/visual-evidence/2026-05-20/baseline/` covering desktop and 390 x 844 mobile across the 11 routed pages named in the acceptance criteria. |
| CU-L1-006 | done | Commit `9600b7c` added `docs/notes/session-2026-05-20-branch-consolidation.md` documenting per-branch decisions. `mainline-island-port` deleted from origin. `atlas-mobile-runtime-packets` and `merge-mainline-island-port` already absorbed into main. `main` and `r3f-atlas-scene-quality` (parked) remain. |

Lane 1 deferral candidates (surfaced individually):

- Codex Phase 0 GraphQL hand-back (feature-flag flip on `placesList`) is NOT
  in Lane 1. Reason: depends on Codex shipping the Node sidecar URL, which
  has not happened yet.
- Live route smoke for unrouted product surfaces (`/lab`, `/admin/corrections`,
  `/sources/connections`) is NOT in Lane 1. Reason: those routes do not exist
  yet; capturing baseline for them is impossible.

## Lane 4: Strategic Architecture Seams

All Lane 4 items are documents in this repo addressed to sibling repos
(`our-civic-atlas-backend`, `civic-atlas-ingest`). No code changes in the
sibling repos happen in this catchup pass; that work is the subject of the
cross-repo plan that follows.

| ID | Task | Backreference | Acceptance | Validator |
|---|---|---|---|---|
| CU-L4-001 | USD field-name parity audit between `our-civic-atlas-backend/proto/civic_atlas/v1/reconstruction.proto` and the `civicAtlasSchema` in the Anthropic-authored OpenUSD/PairFormer/Nodetree doc. | Theorize Theorem Brief 2026-05-20, Decision "USD field-name parity is a now-decision" | `docs/design/proto-usd-field-parity-audit.md` enumerates every divergence by message, names the rename or extension action per field, and notes which extensions belong on the USD side vs the proto side. Audit is honest: counts and severity per message; no silent collapses. | Markdown review against `reconstruction.proto` and the Anthropic doc's `civicAtlasSchema`. |
| CU-L4-002 | OpeningOverride proto coordination note. | Theorize Theorem Brief 2026-05-20, Decision "OpeningOverride is a coordination note to Codex, not a frontend commit"; Anthropic doc Pascal-tree spec section | `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md` requests `repeated OpeningOverride opening_overrides` on the `OpeningGrid` message at additive field number 7, defines the `OpeningOverride` message shape inline, names acceptance criteria for Codex, and lists the downstream frontend slices that unblock when the proto change lands. | Markdown review against `OpeningGrid` in `reconstruction.proto` and the Anthropic doc's adapter spec. |
| CU-L4-003 | Pairformer adapter-seam coordination note. | Theorize Theorem Brief 2026-05-20, Decision "Pairformer adapter seams are a coordination note"; Anthropic doc Graph-LoRA section | `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` requests three architectural seams (separable `PairUpdate`, separable `ConfidenceHead`, `tenant_context` parameter on the input encoder + output heads) be designed into the Pairformer in `civic-atlas-ingest/modal/building_head_train.py` BEFORE any training code is written. Names acceptance criteria, names the cheapest moment to insert the seams (now, before checkpoints exist), and explicitly defers Graph-LoRA implementation to a post-V1 plan. | Markdown review against the current stub state of `civic-atlas-ingest/modal/building_head_train.py` and the Anthropic doc's Graph-LoRA section. |

### Lane 4 Status (as of 2026-05-21)

| ID | Status | Evidence |
|---|---|---|
| CU-L4-001 | done | `docs/design/proto-usd-field-parity-audit.md` committed in `9febedc`. Backend mirrored copy lives at `our-civic-atlas-backend/docs/orchestrate/proto-usd-field-parity-audit.md` with mirror frontmatter (only delta vs source). |
| CU-L4-002 | done | `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md` committed in `9febedc`. Backend mirrored copy matches byte-for-byte. |
| CU-L4-003 | done | `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` committed in `9febedc`, platform-corrected in `5e0ddb6`. Backend and ingest mirrored copies match byte-for-byte. |

Lane 4 deferral candidates (surfaced individually):

- Mirroring the three Lane 4 documents into `our-civic-atlas-backend/docs/orchestrate/` and `civic-atlas-ingest/docs/orchestrate/` is the cross-repo follow-up plan's job, NOT this catchup pass. Reason: this catchup pass keeps commits inside this repo's boundary.
- Acting on the OpeningOverride coordination note (opening the PR in `our-civic-atlas-backend`) is the cross-repo plan's job. Reason: same boundary discipline.
- Acting on the Pairformer coordination note (writing the actual training code with seams) is the cross-repo plan's job. Reason: same boundary discipline.
- The full proto rename PR (the subject of the parity audit) is the cross-repo plan's job. Reason: same boundary discipline.
- Promoting "USD as canonical publication format" to the unified north-star plan (likely under UCA-022 Scene Foundry) is a user decision pending in the theorize Open Questions. Reason: spec changes require user acceptance, not unilateral promotion.

## Lane 3: Design Brainstorm for Held UCA Items

Mandatory inputs BEFORE any `.tsx` for the items below, per project
CLAUDE.md and `~/.claude/skills/visual-work-design-gate/SKILL.md`:

1. `superpowers:brainstorming` pass: explore requirements and intent before
   visual decisions.
2. `impeccable shape <feature>`: enforce Absolute Bans (no side-stripe borders
   greater than 1px as colored accents, no gradient-clip text, no glassmorphism as
   default, no hero-metric template, no identical card grids, no modal as
   first thought) AND run the AI Slop Test at both orders.
3. `ui-design-pro:design-theory`: design principles, visual judgment, layout
   architecture before code.
4. Scan curated component library at `Theseus/Design Components/`. Note: that
   folder lives in the broader travisgilbert.me workspace, not in this repo;
   the scan happens from the parent directory.
5. Reference `docs/plans/our-civic-atlas-north-star-execution-plan.md` for the
   target UCA's intent and acceptance criteria.
6. Produce a written design proposal saved to `docs/design/<name>.md`.
7. User reviews and approves the proposal IN CHAT before any `.tsx` is written.

Priority order: AGENTS.md and the unified plan name Lost Flint as the
high-priority remaining product slice. Visual grammar is the connective
tissue that makes every UCA UI item legible, so it sequences second. Node
Horizon hardening completes the explore primary loop. Mobile dossier is the
civic-access gate. Primitive vocabulary unlocks Model Studio and Scene
Foundry coordination.

| ID | Held UCA(s) | Brainstorm scope | Output |
|---|---|---|---|
| CU-L3-001 | UCA-013 | Lost Flint UI: per-part rendering once Codex Phase 3 hand-back lands; per-part dossier extension with Reconstruction Node Tree IDs as targets; integration with the Phase 4 confidence indicator decisions (3 bands: contested under 50%, percent bar 50 to 85, silent over 85); year-slider visual interaction beyond CU-L1-002 fix; honest-uncertainty civic language. | Approved design proposal at `docs/design/lost-flint-ui-proposal.md`. |
| CU-L3-002 | UCA-006, UCA-017A | Visual grammar v2: visual encodings beyond color for current, lost, inferred, proposed, comment, live, intervention, source, and review states; token inventory mapped to `--ctx-*` and any new `--oca-*` variables; usage map; extends existing `docs/design/visual-grammar-v1.md` instead of replacing it. | Approved design proposal at `docs/design/visual-grammar-v2.md`. |
| CU-L3-003 | UCA-005, UCA-011, UCA-017B | Node Horizon hardening: Compare, breadcrumbs, spatial portal transitions; promotion from list-shaped to compass/drawer/portal system; preview-card metadata contract (node name, scope, distance, direction, maintainer, freshness, capabilities, source count, contribution status, open/compare actions, parent return). | Approved design proposal at `docs/design/node-horizon-v1.md`. |
| CU-L3-004 | UCA-012, UCA-027 | Mobile dossier interaction spec: 3-snap sheet behavior, search-first flow, no hover dependency, source/confidence-visibility-on-first-screen, accessible tabs, reduced-motion safe, touch-target sizing, mobile civic-access gate. | Approved design proposal at `docs/design/mobile-dossier-v1.md`. |
| CU-L3-005 | UCA-014 | Primitive vocabulary plus reconstruction-level rules: reusable semantic grammar that Lost Flint, Civic Model Studio (deferred), and Scene Foundry all consume; architectural dictionary; ties to the 8 Blender archetypes in `civic-atlas-ingest/primitives/`. | Approved design proposal at `docs/design/primitive-vocabulary.md`. |

Lane 3 deferrals (surfaced individually, no silent batching):

- UCA-015 (Civic Model Studio and scenario authoring) DEFERRED until CU-L3-001
  and CU-L3-005 land. Reason: Model Studio needs the primitive vocabulary AND
  the approved scenario contract; both gate downstream of Lost Flint design.
- UCA-016 (GeoComments, engagement, polls/search) DEFERRED to a separate
  product wave. Reason: full new product surface; 4-repo coordination is
  already heavy with Phase 0 to Phase 6 in flight.
- UCA-017 (live civic signals) DEFERRED to the same separate product wave as
  UCA-016. Reason: ingestion lane and review boundary need their own scoping
  pass before UI design starts.
- UCA-018 (atlas-native Data Lab and analysis cards) DEFERRED to the same
  separate wave. Reason: depends on read-model stack from UCA-009 actually
  being populated end-to-end, not only contracted.
- UCA-020-FE (review queue UI) DEFERRED until Codex's `ApproveCorrection`
  per-part merge lands. Reason: there is no review queue to render until the
  backend writes one. UI-without-data is forbidden by CLAUDE.md "No Fake UI"
  rule.
- UCA-021 (interventions, safety, source-connection UI) DEFERRED to the same
  separate wave. Reason: Civic Intervention Ledger schema needs real data,
  not fixtures, before UI can be honest.
- Phase 4 community correction loop UI: design DECISIONS LOCKED in
  `docs/design/phase-4-correction-loop-ui.md`. Implementation DEFERRED until
  procedural reconstruction is shipping renderable Lost Flint buildings.
- Phase 6 admin extensions ("Generate priors" button, per-field provenance
  display) DEFERRED until `civic-atlas-ingest` Phase 6 inference is wired.

## Out of Scope for This Plan

These items are real, named, and tracked, but belong to sessions against
other repositories. Listed here so they remain visible.

| Item | Owning repo | Notes |
|---|---|---|
| `ApproveCorrection` per-part merge logic | `our-civic-atlas-backend` | TODO in `crates/civic-atlas-server/src/corrections.rs::approve_correction` |
| Real RustyRed projection on outbox drain | `our-civic-atlas-backend` plus RustyRed | Bridge RPC not yet defined |
| 8 Blender archetype .blend files | `civic-atlas-ingest/primitives/archetypes/<slug>/` | MANIFEST contracts locked; hand work outstanding |
| Live PostGIS gate | `our-civic-atlas-backend` | Needs `DATABASE_URL`; outbox worker needs to drain end-to-end |
| Codex Phase 0 GraphQL URL flip (downstream consumer in THIS repo) | this repo, but blocked on Codex shipping Node sidecar URL | First touchpoint when Phase 0 hands back |
| Codex Phase 3 R3F per-part shader + dossier extension + time-slider rebind | this repo, but blocked on Phase 3 hand-back | 60% wired already: `parseAtlasYear`, `atlasYear` exist; rebinding from local helpers to `GetViewportAtTime` is a resolver swap |

## Test Strategy

- Preflight for every commit in Lane 1: `npm run typecheck`, `npm run lint`,
  `npm run build`, `npm run validate:atlas`.
- CU-L1-001 also runs: `npm run validate:reconstruction-node-tree`.
- CU-L1-002 manual smoke: open `/open-flint-atlas`, type a year in the search
  bar, verify the overlay appears AND OSM dims AND Lost Flint reconstructions
  re-filter.
- CU-L1-005 dev-server-up checks: `npm run validate:routes:live` first,
  screenshot capture second.
- Lane 3: no code tests during the brainstorm phase. Each design proposal
  carries its own Production Gate section documenting what tests will land
  when it is implemented.

## Production Gates

- [ ] Tests pass or failures explained.
- [ ] No secrets or destructive commands introduced.
- [ ] Rollback path exists. Lane 1 work is additive except branch ops; CU-L1-006
      requires per-branch decision capture before rebase or delete.
- [ ] Observability considered where applicable (n/a for Lane 1 doc/branch
      work; n/a for Lane 3 brainstorm phase).
- [ ] Docs updated or explicitly deferred. Lane 1 IS the docs work.
- [ ] UI visual work has before/after/target evidence or an explicit
      validation gap. CU-L1-005 captures the baseline; targets land per-Lane-3-
      proposal as each one is approved.
- [ ] Do Not Downgrade gate respected. CU-L1-002 must not regress the existing
      OSM extrusion path or the bookmark camera presets.
- [ ] Execution report can reconcile every checklist item.

## Execution Order

Original eleven-step order is preserved for audit. Items 1, 3, 4, 5, 6
landed in `9600b7c` (with `9febedc` for item 1's adapter slice).
Remaining work:

1. ~~CU-L1-001 + CU-L4-001 + CU-L4-002 + CU-L4-003~~ (done: `9febedc`).
2. **CU-L1-002** (verifiable bug; UI surface; reserved for the Lane 3
   design brainstorm session per project posture).
3. ~~CU-L1-003~~ (done: `9600b7c`).
4. ~~CU-L1-004~~ (done: `9600b7c`).
5. ~~CU-L1-005~~ (done: `9600b7c`).
6. ~~CU-L1-006~~ (done: `9600b7c`).
7. **CU-L3-001** (Lost Flint UI brainstorm; priority slice per AGENTS.md;
   brainstorm inputs include the three Phase 4 confidence bands, per-opening
   node-tree addressability, and the USD-as-archive-target).
8. **CU-L3-002** (visual grammar v2 brainstorm; gates the look of every other
   Lane 3 surface).
9. **CU-L3-003** (Node Horizon brainstorm).
10. **CU-L3-004** (mobile dossier brainstorm).
11. **CU-L3-005** (primitive vocabulary brainstorm; closes Lane 3).

Each Lane 3 step blocks on user approval before moving to implementation.
Lane 3 implementation is a follow-on session per design, not part of this
plan.

## What This Plan Does NOT Do

- Does not write Lane 2 (backend) work in this repo. Belongs in
  `our-civic-atlas-backend` and `civic-atlas-ingest` sessions.
- Does not promote any held UCA item out of held status without an approved
  design proposal in `docs/design/`.
- Does not blanket-defer items into a quiet non-goals table. Every deferral
  is surfaced individually in the Lane 1 and Lane 3 sections above.
- Does not commit to time estimates, effort sizing, or compute budget. Per
  CLAUDE.md: no wall-clock estimates anywhere.
- Does not introduce "MVP" framing the user has not authorized. The
  acceptance criteria above are the floor for each task.

## Epistemic Ledger

| Primitive | Entry | Confidence |
|---|---|---|
| Claim | This repo is consciously passive while Codex builds Phase 0 to Phase 6 in sibling repos; Lane 1 is the only safe forward motion without coordination. | high |
| Claim | The Lane 3 held items are blocked on design, not engineering. The forcing function in the design-gate skill is binding regardless of skill drift. | high |
| Claim | UCA-013 is the highest-priority held item per AGENTS.md and the 2026-05-18 session note. | high |
| Tension | "Spec is the floor" plus "5 separate held UCA items in Lane 3" plus "each requires its own brainstorm pass" means Lane 3 is several focused sessions, not one. Honest framing keeps that visible. | high |
| Tension | The Phase 4 UI is decision-locked but implementation-deferred. That can feel like a contradiction; the resolution is in `docs/design/phase-4-correction-loop-ui.md`: decisions are cheap, implementation depends on procedural reconstruction shipping renderable buildings first. | high |
