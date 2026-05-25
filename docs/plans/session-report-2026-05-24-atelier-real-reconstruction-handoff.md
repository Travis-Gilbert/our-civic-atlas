# Session Report: Atelier Real-Reconstruction Handoff (2026-05-24)

This session ran the handoff plan at
`/Users/travisgilbert/Downloads/PLAN-ATELIER-REAL-RECONSTRUCTION.md`
(now committed at
`docs/plans/atelier-real-reconstruction-plan.md`). Travis entered me
and Codex into the repo in parallel, AFK, with autonomy to coordinate
or stay out of each other's way.

This report reconciles the handoff plan's nine tasks (A through I)
against what actually shipped, who did what, and what's still open
for the next session.

## Headline

- 3 commits landed by me (claude-code), all on `main`, all pushed.
- 5 untracked or in-flight files written or modified by Codex,
  uncommitted at session end. Visible in `git status --short`.
- Coordination strategy: by inference from working tree + commits.
  Harness MCP was unreachable for direct presence/mentions; no
  collisions despite this.

## What landed

### My commits (claude-code, pushed)

| SHA | What | Plan task |
|---|---|---|
| `0aca940` | `feat(methodology): expose confidence numbers and engine-named stages` | Task I |
| `61be397` | `fix(atlas): ship top-strip chrome on mobile with sized-down variant` | Task H §1 |
| `5a665d0` | `docs(atlas): mobile audit findings and follow-ups (Task H)` | Task H §2-4 |

### Codex's in-flight work (uncommitted at end of my session)

Observed in the working tree:

| File | What | Plan task |
|---|---|---|
| `docs/plans/atelier-real-reconstruction-plan.md` | NEW: committed handoff plan to disk verbatim | Task 0 / plan §intro |
| `docs/plans/evidence-corpus-inventory-2026-05.md` | NEW: 185-line corpus inventory with live PostGIS SQL templates, gap analysis, and pilot-candidate ranking | Task B |
| `docs/plans/pairformer-training-plan-2026-05.md` | NEW: 161-line training plan with Gate 0-3 ladder, per-head scorecard, no time/dollar estimates | Task D |
| `docs/plans/the-atelier/README.md` (modified) | PT-104 status reframed from "blocked-by-backend" to "partial bridge landed" with note on remaining backend smoke / source provenance | Task A status |
| `docs/plans/the-atelier/implementation-plan.md` (modified) | Same PT-104 reframe; PT-602 SHIP gate marked "partially unblocked, not passed" | Task A status |
| `docs/design/atelier-visual-register-proposal.md` (modified) | Unverified by this session |  |
| `src/components/atlas/AtlasMap.tsx` (modified) | Adds `FillStyleExtension` for paper grain texture on buildings; references `/textures/paper-grain.svg` | Task F (paper grain) |
| `src/app/open-flint-atlas/atelier/atelier.css` (modified) | Removes per-source-type card identities; unifies to one archival card style | Task A polish (post-decision) |
| `src/components/atlas/atelier/AtelierEvidenceCard.tsx` (modified) | Removes type-dispatched rendering; aligns with the unified-card decision in atelier.css | Task A polish |
| `public/textures/paper-grain.svg` (untracked) | NEW: paper-grain SVG asset referenced by AtlasMap's FillStyleExtension | Task F asset |
| Backend repo `apps/graphql-server/src/{schema.ts,grpcClient.ts,index.ts}` and `migrations/0004_seed_carriage_town_specs.sql` | Modified: full ReconstructionGrpcClient wiring, schema additions for typed reconstruction fields, seed migration field rename to match ReconstructionSpec proto shape | Task A backend |
| Backend repo `crates/rustyred-client/` | NEW untracked crate (scaffold) | Adjacent to Task A |
| Backend repo `civic-atlas-reconstruction-engine` | Already-committed 3549-line engine: all 8 stages, PostGIS repository, Theseus embedding bridge, heuristic Pairformer fallback. Verified by reading | Existed before this session |

## Plan task ↔ outcome map

| Task | Acceptance criteria from plan | Status |
|---|---|---|
| A: Atelier ↔ Engine wiring | Frontend swaps from fixture to engine output | Codex: backend `reconstructionDossier`/`evidenceForReconstruction`/`conflictsForReconstruction`/`blockSubgraphForReconstruction` resolvers landed as PT-104 partial bridge in `our-civic-atlas-backend/apps/graphql-server`. Frontend hooks `useReconstructionDossier`/`useReconstructionSave`/`useSavedReconstruction` already complete from prior sessions (PT-103, 103b, 103c). What remains: backend service running + attached source/evidence rows + save persistence (PT-104b still blocked-by-backend). |
| B: Evidence corpus inventory | `docs/plans/evidence-corpus-inventory-2026-05.md` exists with top 20 + gaps | Codex: complete. Honest about live-PostGIS gap; ships runnable SQL; concrete recommendations. |
| C: First real reconstruction pilot | Pilot picks lost Flint building from inventory; end-to-end reconstruction renders in atelier | NOT STARTED. Blocked-by: live PostGIS Top-20 inventory not yet run; source/evidence rows not yet attached in backend. Per Codex's inventory, the strongest current candidate is "Carriage Town Storefront" because it's already demolished in the fixture and has map + photo support, but it still needs a directory row + one more time slice before it meets the three-source pilot bar. |
| D: Pairformer training plan | `docs/plans/pairformer-training-plan-2026-05.md` exists with corpus + loss + curriculum + class targets + validation + versioning | Codex: complete. No time/dollar estimates (per project rule). Gate 0-3 ladder. |
| E: Atlas chrome residuals | Downtown crowding, vignette, basemap, hover tooltips | NOT STARTED. Codex has `AtlasMap.tsx` open (paper-grain extension). Would have collided. Deferred to a session after Codex's pass commits. |
| F: Building rendering refinements | Edge lines, paper grain, shadows, roof | PARTIAL by Codex: paper grain `FillStyleExtension` in flight via AtlasMap.tsx + paper-grain.svg asset. Edge line tuning, drop shadow direction, hipped roof peak rise, corner darkening, ground contact line all remain. |
| G: Street rendering refinements | Width taper, color, intersection visibility | NOT STARTED. Commit `e322baf` already landed "streets layer footprint inset and overlay bumps per spec" earlier today; tuning beyond that deferred to a session after Codex's AtlasMap pass commits. |
| H: Mobile experience audit | Top chrome, dynamic island, bound-world mask, touch | PARTIAL by me: top-strip chrome regression fixed (`61be397`). Read-only audit doc at `docs/plans/atlas-mobile-h-audit-2026-05-24.md` covers dynamic island sizing, mask, touch interactions, anti-pattern audits, and concrete follow-ups. Visual verification at 320/360/375/414 widths still requires a human or `npx playwright install chrome`. |
| I: Methodology page | Confidence numbers appear here transparently; engine stages in plain English; correction flow placeholder | DONE by me (`0aca940`). Page now exposes typology classifier average 0.97 across 21,182 buildings, per-part 0.60-0.95 range with 60/90 threshold bands; reconstruction stages aligned to engine's actual named stages; known-limits gains explicit "numbers don't appear in atlas hover" rule. |

Cross-cutting items from the plan:

- Sonnet synthesis for civic research: NOT STARTED. Out of this
  session's scope; tracked in plan as background.
- Code ingest into Theseus: NOT STARTED. Same.
- Berthold font question: NOT STARTED. Defer until map color settles.

## Coordination retrospective

Codex was clearly leading on Tasks A (both halves), B, D, and the
visual polish (F, parts of A). I picked the explicit gaps in their
lane: methodology page extension (Task I, file was clean, dated May
16) and the mobile chrome top-strip regression (Task H §1, distinct
file from Codex's working tree).

The harness MCP was unreachable this session, so direct presence /
mentions / coordinate calls failed. Coordination by `git status` +
`git log` was sufficient. The signal that worked best: file
modification timestamps. When Codex wrote
`docs/plans/atelier-real-reconstruction-plan.md` at 17:22 (between my
17:14 status check and my next check at 17:24), it was the clearest
signal Codex was actively in the repo. Same pattern for
`evidence-corpus-inventory-2026-05.md` at 17:24 and
`pairformer-training-plan-2026-05.md` at 17:26.

Anti-pattern I deliberately avoided: re-writing Task B or Task D
when Codex had already shipped honest, grounded docs. Two competing
docs for the same task would have created a sync surface for future
sessions. Letting Codex own those tasks was correct.

The other anti-pattern I avoided: touching `AtlasMap.tsx`,
`atelier.css`, `AtelierEvidenceCard.tsx`. Those are Codex's
in-flight files. Even though my Task E / F / G work would have been
in those files, the right move was to defer them and write the
mobile audit findings doc as a deliverable that lands cleanly
afterward.

## Open questions to surface to Travis

Per your "surface questions at the very end" ask, these are the items
the next session may want explicit direction on:

1. **Codex's uncommitted work**: at session end, Codex has 8 modified
   files + 2 new untracked files in the working tree of this repo
   (plus the backend repo's 4 modified files and 1 new crate). My
   working assumption is Codex will commit these. If Codex's session
   ended without commit, the next session should review them and
   decide what to commit vs. what to discard. I deliberately did
   not stage or commit any of Codex's work.

2. **Mobile chrome wordmark size**: I dropped the wordmark to 16px
   on mobile and tightened the nav font to 11px. The wordmark was
   22px on desktop. If you want a different mobile size or a
   different mobile-only treatment (e.g., logo glyph instead of
   wordmark), the change is localized to `atlas.css` lines around
   1178.

3. **Methodology page confidence numbers**: I inserted real
   numbers (0.97 average classifier confidence, 0.60-0.95 per-part
   reconstruction range) sourced from Codex's corpus inventory and
   the existing fixture file. If those numbers need to be sourced
   from a different ground truth (e.g., the live PostGIS instance
   when its inventory runs), the page can be data-driven from
   `getStaticAtlasPackage` next pass.

4. **The 7-stage vs 8-stage description**: superseded 2026-05-25.
   The methodology page now uses the spec's eight-stage public model by
   counting `run_full_pipeline` as the orchestrator with the seven
   named engine stages.

5. **Carriage Town Storefront as pilot candidate**: superseded
   2026-05-25. It is now the selected pilot. The missing directory/use
   evidence should flow through the Research tab and then be promoted
   into durable artifact/anchor rows; Task C should not wait on a
   resident-visible manual ingest workflow. A trained GNN improves
   the prior over time, but it is not the prerequisite for the first
   reconstruction.

## What I would do next, if I were continuing

In priority order:

1. Wait for Codex's commit and verify the live `useReconstructionDossier`
   hook returns `source: "graphql"` against the running backend (one
   curl + one browser open to `/open-flint-atlas/atelier/...`).
2. Run the live PostGIS Top-20 SQL from Codex's inventory against
   the Railway backend (Travis has the credentials).
3. Decode one real Sanborn sheet to commit the `ingest_local_sheet`
   path end-to-end (would unblock Task C pilot).
4. Land the AtlasMap.tsx Task E vignette mask tuning + edge-line
   adjustment in one motion after Codex's paper-grain commit.
5. Take a screenshot at 375x800 + 360x780 to confirm the mobile
   chrome change reads as intended.
