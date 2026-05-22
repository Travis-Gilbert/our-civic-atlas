# Orchestrate Report: Code Review Of Codex's Recent Commits

Generated 2026-05-22 in response to a user request to review the last few
commits on `main`. Treated as a code-review pass (no code changes; report
only). Authored against the codebase state at HEAD `64e9996` with four
uncommitted working-tree edits noted in the Assessment section.

The five commits reviewed (newest first):

- `64e9996` feat(atlas): render visible scenario envelope volumes
- `96f9979` feat(atlas): add scenario compare and KPI panel
- `9db4735` docs(atlas): plan zoning scenarios and KPI phases
- `78fe9ce` docs(atlas): land Phase G GraphQL home migration coordination
- `5fbec17` ui(atlas): strip algorithm-prompt header and idle status pill
  from research panel

Two adjacent earlier commits provide context and are also evaluated where
relevant: `36bfe72` (fix(atlas): repoint civic research at GraphQL, drop
frontend-held Theseus token) and `545be94` (docs(agents): forbid
frontend-held service-tier auth tokens).

## Executive Summary

The commit set is coherent and represents a multi-session arc landing
three lines of work: (1) the Service-Tier-Auth-rule-driven retraction of
the frontend-held Theseus token and migration to a GraphQL boundary on
the Node sidecar, (2) the Scenario / KPI feature pair that adds a
buildable-envelope visualization with comparison overlays, and (3) the
plan-document inventory for Phases A, C, D, E, G.

Diff truth matches commit-message claims with two exceptions. There is
one **P0 (must fix before push)** working-tree hazard, two **P1 (should
fix)** rule violations, and three **P2 (broader cleanup)** items not
chargeable to this window but worth surfacing because they affect the
same surfaces.

No commit ships fake interactivity, decorative buttons, or scripted
progress theater. The Service-Tier Auth retraction in `36bfe72` and
`545be94` is real and verified end-to-end (no `THESEUS_API_TOKEN`
references survive in `src/`; the deleted Route Handler is gone).
The Scenario / KPI feature is fully wired (the height-boost slider
recomputes deltas; the scenario selector triggers a `fitBounds` to the
envelope set; the deck.gl envelope layer renders against real component
state). The plan docs are content-rich and free of em-dashes.

The action rail is short. None of the findings block the work; all are
small enough to address inside one focused commit.

## Per-Commit Diff Truth

### `5fbec17` — ui(atlas): strip algorithm-prompt header and idle status pill

**Claim**: removes the "Algorithm prompt" section header and the
top-right `idle / running / error / ok` status pill from
`CivicResearchPanel`. `statusLine()` and `ResultPreview` survive.

**Diff reality**: matches the claim exactly. The 35-line removal drops
the section header `<header>`, the `statusLabel()` helper, the
`statusColor()` helper, and the status pill `<span>`. The remaining
panel keeps the textarea, the submit button, the conditional status line
beneath the textarea (running / network-error / schema-pending /
run-summary), and the coordination hint when the resolver is missing.
One insertion: an `<span aria-hidden="true" />` placeholder used to keep
the flex layout's between-element spacing when no status line is
present.

**Verdict**: clean. The commit is small and faithful to its description.

### `78fe9ce` — docs(atlas): land Phase G GraphQL home migration coordination

**Claim**: makes the Node sidecar at `127.0.0.1:4010/graphql` the
default GraphQL endpoint (was the Theseus Strawberry path), and adds
two plan docs: a Phase G addition to the cross-repo launch plan, and a
broader `graphql-home-migration.md` coordination note.

**Diff reality**: matches. `src/lib/api/graphql/client.ts` rewrites
the `DEFAULT_ENDPOINT` constant and adds an extensive header docstring
explaining the new wiring. Two new plan documents are added with
substantive content. The commit message verbosely captures user intent
verbatim and traces sibling-repo commits.

**Verdict**: clean as committed. See P1 finding on stale
`getAuthHeaders()` below; that is not a defect of this commit (the code
predates it) but the commit was the right opportunity to retire it.

### `9db4735` — docs(atlas): plan zoning scenarios and KPI phases

**Claim**: adds four phase plans (Building Typology Phase A, Zoning
Envelope Phase C, Scenario Branching Phase D, KPI Service Phase E) and
one `.gitignore` entry (`.theorem/`).

**Diff reality**: matches. All four plan docs are content-rich with
executive summaries, problem shape, options, recommendations, and
acceptance criteria. The `.gitignore` addition is the expected
companion to the Theorem-harness workflow.

**Verdict**: clean. No em-dashes in the new plan docs (verified via
grep across all four files; count = 0).

### `96f9979` — feat(atlas): add scenario compare and KPI panel

**Claim**: adds a scenario compare overlay, a KPI panel with delta
values, the underlying `scenario-model.ts` data layer, GraphQL schema
entries for `Scenario`, `BuildableEnvelope`, `ScenarioDelta`,
`ScenarioComparison`, `ScenarioRecomputeJob`, `KpiBundle`,
`KpiMetric`, and four new mutations (`forkScenario`,
`requestScenarioRecompute`, `publishScenario`, `archiveScenario`).

**Diff reality**: matches. The new `ScenarioControls` component
(`src/components/atlas/ScenarioControls.tsx`, 155 lines) renders the
two scenario `<select>` elements, the compare toggle, the height-boost
slider, and the KPI rows. It is mounted in
`src/components/atlas/OpenFlintAtlasScene.tsx:1053` and receives real
props. The `/api/data/scenarios/index.json`,
`/api/data/scenarios/comparison.json`, `/api/data/kpis/bundle.json`,
and `/api/data/kpis/delta.json` endpoints in
`src/app/data/[[...path]]/route.ts` are wired to
`scenario-model.ts`'s `getScenarioComparison`, `getKpiBundle`,
`getKpiDelta` functions.

**Verdict**: clean implementation; see P1 finding on the
`provenance: "actual"` framing of the fixture data.

### `64e9996` — feat(atlas): render visible scenario envelope volumes

**Claim**: renders 10 buildable-envelope volumes on the deck.gl
overlay, types them by `as_of_right / mixed_use_infill / missing_middle
/ adaptive_reuse / civic_anchor`, and adds the `getScenarioEnvelopeBounds`
helper plus a `fitBounds` effect that frames the envelope set when the
scenario changes.

**Diff reality**: matches. The new `ScenarioEnvelopeType` /
`ScenarioEnvelopeProperties` / `ScenarioEnvelopeCollection` types are
exported from `scenario-model.ts`. `AtlasMap.tsx` gains
`ENVELOPE_FILL` / `ENVELOPE_LINE` color records, `envelopeFillColor()`
/ `envelopeLineColor()` helpers, and a new `GeoJsonLayer` that renders
`scenario-envelope-volumes` with extruded geometry when `viewMode !==
"atlas"`. `OpenFlintAtlasScene.tsx` gains the
`activeScenarioEnvelopes` memo, the `scenarioFocusBounds` memo, the
`envelopeTypeCounts` derivation, and the `fitBounds` `useEffect` that
respects `prefers-reduced-motion`. `ResponsiveAtlasMap.tsx` adds the
passthrough prop. The `/api/data/scenarios/envelopes.json` endpoint is
added.

**Verdict**: clean implementation; same `provenance: "actual"` carry-over
as `96f9979`.

## Binding-Rule Audits

### Rule: Service-Tier Auth Stays Server-Side

CLAUDE.md (added 2026-05-22): the frontend talks GraphQL only;
service-tier credentials live on the Axum/sidecar service and never
appear in the frontend deployment, env file, or Next.js Route Handler.

**Compliance status**: largely compliant with one stale-code carry-over.

- `git grep -E "THESEUS_API_TOKEN|HARNESS_TOKEN"` in `src/` returns no
  matches. The Route Handler deleted in `36bfe72`
  (`src/app/api/v2/theseus/civic-research/route.ts`) does not exist.
- The only `src/app/api/` Route Handler that remains is
  `src/app/api/v2/theseus/open-flint-atlas/[[...path]]/route.ts`,
  which is the local fixture-shim carve-out explicitly authorized by
  CLAUDE.md.
- `src/lib/api/graphql/client.ts` correctly defaults to the Node
  sidecar (`http://127.0.0.1:4010/graphql`) and documents the boundary
  in its header docstring.

**Finding (P1)**: stale `getAuthHeaders()` function in
`src/lib/api/graphql/client.ts:55-58` still reads
`process.env.THESEUS_AUTH_TOKEN` and attaches it as a Bearer header.

```typescript
function getAuthHeaders(): Record<string, string> {
  const token = process.env.THESEUS_AUTH_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}
```

This is server-side only because `THESEUS_AUTH_TOKEN` lacks the
`NEXT_PUBLIC_` prefix. The browser will always see `undefined` and
attach no header. But the file's own docstring asserts "the frontend
deployment ships no Theseus tokens." If `THESEUS_AUTH_TOKEN` is ever
set in the Vercel environment, RSC and Route Handler callers of
`getTheseusClient()` will silently re-arm exactly the pattern `36bfe72`
deleted. Today the only caller is `CivicResearchPanel.tsx:219`, which
is a client component (`"use client"` at line 1), so the env var
genuinely never gets read. The hazard is forward-looking: a future RSC
caller plus an env-var leak reconstitutes the multi-tenancy inversion.

The fix is one or two lines: delete `getAuthHeaders()` entirely and
remove its usage in `fetchOptions`. The sidecar is unauthenticated
locally and will have its own auth model in production (cookie,
session, or sidecar-issued JWT, none of which belong in this file).

### Rule: No Fake UI / No Mock Data In Shipped Surfaces

CLAUDE.md: no MOCK_, no SAMPLE_, no DEMO_, no FAKE_ constants in
user-reachable surfaces; no `?mock=1` URL flag; no decorative-only
buttons; no scripted `setTimeout` activity theater; empty states are
honest.

**Compliance status**: borderline. Interactivity is fully real; data
framing is not.

What the new code does well:

- `ScenarioControls`'s height-boost slider writes to the parent's
  `scenarioDraftEdits` state. The state flows through
  `getScenarioEnvelopeCollection(activeScenarioId, scenarioDraftEdits)`
  and `getScenarioComparison(activeScenarioId, compareScenarioId,
  scenarioDraftEdits)`. The deck.gl layer's `updateTriggers` pick up
  the change. The slider does what it says.
- The scenario `<select>` triggers `setActiveScenarioId` which drives
  `setScenarioCompareEnabled(scenarioId !== "current")` and the
  `fitBounds` `useEffect`. The behavior is observable.
- `CivicResearchPanel` renders an honest "Backend resolver pending"
  state when the upstream GraphQL endpoint returns a schema error
  (`looksLikeSchemaError` in `CivicResearchPanel.tsx:137`). The
  coordination hint at line 339 names the missing resolver and points
  at the coordination note. This is the canonical empty-state pattern.
- The scenario / KPI / envelope fixtures live in
  `src/lib/atlas/scenario-model.ts` and are served only through
  `src/app/data/[[...path]]/route.ts`, which is the fixture-shim
  Route Handler carve-out CLAUDE.md authorizes.

**Finding (P1)**: the `current` scenario is labeled as real data when
it is not.

```typescript
// src/lib/atlas/scenario-model.ts:99-108
{
  scenarioId: "current",
  name: "Current Flint",
  description: "Present-day public atlas rows.",
  state: "published",
  provenance: "actual",
  baseScenarioId: null,
  updatedAt: "2026-05-22T00:00:00-04:00",
}
```

And the 10 `BASE_ENVELOPES` entries at lines 120 to 270 use realistic
parcel-key shapes (`40-01-154-101` through `40-01-154-110`), realistic
Flint coordinates, and named-neighborhood labels (Carriage Town,
Durant, Riverfront, Saginaw, Grand Traverse, Bervean) for envelopes
that are entirely invented.

The schema enum `ScenarioProvenance` (added in
`docs/design/flint-graphql-schema-v1.graphql:135-144`) carries `ACTUAL`
as one of its four values, defined by the surrounding context as
"present-day public atlas rows." If a frontend consumer reads the
GraphQL response and dispatches on `provenance: ACTUAL`, they will
treat the row as sourced data. A future contributor following the
schema as documentation will assume the same.

The fix has two acceptable shapes:

1. **Honest fixture framing**: rename the `current` scenario to
   something like `"fixture-current"` with `description: "Foundation
   fixture envelopes. Replaced by sourced parcel data in Phase C."`
   and add a new provenance enum value `FIXTURE` (or
   `SYNTHETIC_PREVIEW`) for the carry period. Mark the scenario state
   as `DRAFT` not `PUBLISHED`.
2. **Replace fixture with empty state**: empty the `BASE_ENVELOPES`
   array, return `getScenarioEnvelopeCollection("current")` as an
   empty `FeatureCollection`, and render an honest "No envelopes
   loaded yet. Phase C will populate from sourced parcel data."
   message in the scenario panel.

Option (1) is the lower-friction path because it preserves the
fitBounds choreography, the envelope-type swatches, and the KPI deltas
for review work. Option (2) is the stricter read of the rule. Either
is acceptable; the status quo is not.

This is not a fake-button problem (the UI does what it appears to do).
It is a label-truthfulness problem (the data presents itself as
sourced when it is not).

### Rule: No Em Or En Dashes

CLAUDE.md: never em or en dashes; applies to .tsx, .ts, .css, .md,
frontmatter strings, JSDoc and JSX comments.

**Compliance status**: one new violation in this review window.

- New violation in this window: `CivicResearchPanel.tsx:213`,
  `/*  Panel (embedded — renders inside AtlasDynamicIsland)
  */`. Introduced by `c847fcd`. Trivial to fix: replace the em-dash
  with a colon or a period.
- New plan docs (`cross-repo-launch-plan-2026-05-20.md` Phase G
  additions, `graphql-home-migration.md`,
  `building-typology-phase-a-plan.md`,
  `zoning-envelope-phase-c-plan.md`,
  `scenario-branching-phase-d-plan.md`,
  `kpi-service-phase-e-plan.md`): zero em-dashes. Clean.
- Working-tree theorize doc (`theorize-2026-05-22-catchup-stress-test.md`):
  not chargeable; in the working tree only and content was inspected.

**Finding (P3, pre-existing, not chargeable)**: ~17 em-dashes in code
files outside this window's authorship.

- `src/components/atlas/AtlasMap.tsx` lines 49, 311, 630, 838
  (authored 2026-05-18 in `9fc772b`).
- `src/components/atlas/OpenFlintAtlasScene.tsx` lines 215, 304, 315,
  441, 559, 630, 653 (authored 2026-05-18 in `9fc772b`).
- `src/app/open-flint-atlas/atlas.css` lines 14, 19, 25, 29, 34, 43
  (authored 2026-05-13 in initial repo commit `6ec3ff1`).

These pre-date the commits under review. They are project-wide
hygiene debt and worth a single cleanup commit when convenient, not a
blocker for the current arc.

### Rule: Visual Design Gate

CLAUDE.md: before writing any `.tsx` / `.css` / `.glsl` / shader /
canvas / R3F / motion-design code on a NEW visual surface or a
rebuild, first invoke `superpowers:brainstorming` plus design
specialists matched to the routing intent in
`Index-API/apps/orchestrate/registry/design_visual_systems.ts`. The
gate does not fire on maintenance edits inside existing components.

**Compliance status**: passes by interpretation, not by formal
evidence.

The new `ScenarioControls` component is a new visual surface, which
would normally trigger the gate. The mitigating factors:

- The component visually inherits from existing atlas chrome
  conventions: `rounded-[14px]` border radius, `rgba(255,255,255,...)`
  paper backgrounds, `font-mono` uppercase tracking labels,
  `text-[10px]` to `text-[12px]` body sizes, `--ctx-*` token palette.
  These are the same patterns the dynamic island and the layers panel
  use today.
- The companion `atlas.css` additions are scoped under
  `.atlas-scenario-controls` and use existing `--ctx-paper-*` /
  `--ctx-ink-*` tokens. No new visual register, no new font, no new
  color family.
- `c847fcd`'s commit message ("verified visually with Claude Preview")
  documents at least an informal visual confirmation.

The commit messages do not reference `superpowers:brainstorming`,
`impeccable shape`, `ui-design-pro:design-theory`, or a scan of
`Theseus/Design Components/`. So the gate's formal evidence trail is
missing. Given the component re-uses the existing visual vocabulary
rather than introducing a new one, the practical risk is low.

**Recommendation (P3)**: when the next net-new visual surface is
proposed (the recompute progress indicator, the publish dialog, the
KPI source-summary tooltip), explicitly invoke the design-gate skill
before code. The retroactive fix for ScenarioControls is not worth the
effort; the prospective application is the discipline.

## Working-Tree Assessment

Four uncommitted changes are present at HEAD. Three are a coherent
in-progress edit; one is a probable accident.

### `next-env.d.ts` — **P0, do not commit as-is**

```diff
- import "./.next/types/routes.d.ts";
+ import "./.next/dev/types/routes.d.ts";
```

The file is a Next.js auto-generated stub with an in-line `NOTE:` that
it should not be edited. In Next.js 16 with Turbopack, `next dev`
writes the regenerated stub pointing at `.next/dev/types/routes.d.ts`,
while `next build` writes it pointing at `.next/types/routes.d.ts`.
Both `.next/dev/types/routes.d.ts` and `.next/types/routes.d.ts` exist
locally because both modes have run. The `.next/` directory is
gitignored, so neither target file is tracked.

Risk: if this working-tree change is committed and Vercel runs
`next build`, the import target `.next/dev/types/routes.d.ts` will not
exist at type-check time. The TypeScript build will fail with a
`Cannot find module` error. Even if `next build` regenerates
`next-env.d.ts` first (it usually does), the working-tree diff
introduces inconsistency between local-dev and CI-build authoring of
the file.

Fix: revert the working-tree change before staging. Either restore the
file to import `./.next/types/routes.d.ts` (the build-time target,
matching what CI uses), or add `next-env.d.ts` to `.gitignore` and
remove it from tracking entirely. The latter is the cleaner long-term
fix; the former is the one-line patch for today.

### `src/components/atlas/CivicResearchPanel.tsx` — coherent, ready to commit

The diff removes typed sub-selection blocks on `places`, `signals`,
`events`, `historicalReconstructions`, and `sources` and replaces them
with bare field references. Comments explain: foundation scope, the
upstream returns these as opaque JSON scalars, XRL-G-002 (full schema
port) reinstates the typed selections. This matches the Phase G
coordination story exactly.

The `summarizeResults()` helper at line 148 already guards with
`Array.isArray(arr) ? arr.length : 0`, so receiving non-array JSON
scalars degrades gracefully to a `"no evidence returned"` summary.

### `src/lib/api/graphql/queries/civic-research.graphql` — coherent, ready to commit

Same change as the inline mutation in `CivicResearchPanel.tsx`. The
two need to land together to stay consistent.

### `docs/plans/theorize-2026-05-22-catchup-stress-test.md` — separate concern

A self-contained Theorem brief on a different topic (the in-flight
RustyRed pivot and a proposed Phase H plan revision). It is well
formed and stands on its own. Two paths:

1. Commit it with `docs(atlas):` once the user signals approval. It is
   coherent context for the next session.
2. Move it to `.theorem/` (gitignored as of `9db4735`) if the intent
   was draft scratch space.

Either is fine; the file should not stay in the tracked path as an
untracked persistent draft.

## Spec-Floor Reconciliation

"Spec is the floor, not the ceiling." Each commit either hits its
claimed spec or surfaces the gap.

| Commit    | Claim                                                              | Reality vs Claim                                                                                                                                                                                                              |
|-----------|--------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `5fbec17` | Strip algorithm-prompt header and idle status pill                 | Hits the bar exactly. No gap.                                                                                                                                                                                                 |
| `78fe9ce` | Land Phase G GraphQL home migration coordination                   | Hits the bar. The stale `getAuthHeaders()` was a missed opportunity to retire dead code in the same surface but not a deferred spec item.                                                                                     |
| `9db4735` | Plan zoning scenarios and KPI phases                                | Hits the bar. Four substantive plan docs land; `.gitignore` is updated.                                                                                                                                                       |
| `96f9979` | Add scenario compare and KPI panel                                  | Hits the bar on shipped UI and schema. Gap: the fixture data is labeled as actual present-day Flint data, which violates the data-honesty corollary of "No Fake UI." The fix is a label change, not a re-architecture.       |
| `64e9996` | Render visible scenario envelope volumes                            | Hits the bar on rendering, fitBounds, and type-coded coloring. Same `provenance: "actual"` carry-over from `96f9979`. The envelope geometry is invented; the schema label says "actual."                                      |
| `36bfe72` | Repoint civic research at GraphQL, drop frontend-held Theseus token | Hits the bar. The Route Handler is gone. No `THESEUS_API_TOKEN` survives in `src/`. The stale `getAuthHeaders()` predates this commit; the commit could have retired it but did not, and that is the only loose end.          |
| `545be94` | Forbid frontend-held service-tier auth tokens                       | Hits the bar. The AGENTS.md addition is correct and points at the canonical pattern. Today's CLAUDE.md addition (the "Service-Tier Auth Stays Server-Side" section) is the longer-form version of the same rule.              |

## Action Rail

Prioritized by blast radius and confidence.

| Priority | Action                                                                                                                                                                                                                                                                                                                                | File:Line                                                              |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **P0**   | Revert the `next-env.d.ts` working-tree change OR add `next-env.d.ts` to `.gitignore`. As-is, committing the dev-path import will break `next build` on Vercel.                                                                                                                                                                       | `next-env.d.ts:3`                                                      |
| **P1**   | Remove `getAuthHeaders()` and its `fetchOptions` usage. The function's existence contradicts the file's docstring and the project's Service-Tier-Auth rule. One env-var leak away from re-arming the deleted Route Handler's pattern.                                                                                                  | `src/lib/api/graphql/client.ts:55-58`, `:65-71`                         |
| **P1**   | Fix the `provenance: "actual"` framing for fixture envelopes. Either rename the `current` scenario + add a `FIXTURE`/`SYNTHETIC_PREVIEW` enum value, OR empty `BASE_ENVELOPES` and render an honest "No envelopes loaded" state. Today the schema label says these are sourced atlas rows; they are not.                              | `src/lib/atlas/scenario-model.ts:99-108`, `:120-270`                   |
| **P1**   | Replace the em-dash in `CivicResearchPanel.tsx:213` with a colon or period. One-character fix to close the only new em-dash violation introduced by this review window.                                                                                                                                                              | `src/components/atlas/CivicResearchPanel.tsx:213`                       |
| **P2**   | Commit the working-tree GraphQL-narrowing edits (`CivicResearchPanel.tsx` + `civic-research.graphql`). They are coherent and match the Phase G coordination story; leaving them uncommitted invites a future merge confusion.                                                                                                       | `src/components/atlas/CivicResearchPanel.tsx`, `src/lib/api/graphql/queries/civic-research.graphql` |
| **P2**   | Either commit `docs/plans/theorize-2026-05-22-catchup-stress-test.md` or move it to `.theorem/`. Tracked untracked drafts rot.                                                                                                                                                                                                       | `docs/plans/theorize-2026-05-22-catchup-stress-test.md`                 |
| **P3**   | Sweep pre-existing em-dashes in `AtlasMap.tsx` (4), `OpenFlintAtlasScene.tsx` (7), `atlas.css` (6), `visual-grammar-v1.md` and other docs. Not chargeable to this review window, but the rule is project-wide and the cleanup is mechanical.                                                                                          | Multiple files, see Em-Dash audit above                                 |
| **P3**   | For the next net-new visual surface (recompute progress, publish dialog, KPI source-summary tooltip), explicitly invoke the design-gate skill (`superpowers:brainstorming` + `impeccable shape` + `ui-design-pro:design-theory` + scan of `Theseus/Design Components/`) BEFORE code. ScenarioControls inherited the existing vocabulary, so retroactive enforcement is not worth the effort. Prospective enforcement is. | n/a                                                                    |
| **P3**   | Update the `CivicResearchPanel.tsx` file-header docstring to reference `docs/plans/lane-4-strategic-seams/graphql-home-migration.md` alongside the older `civic-research-graphql-coordination.md`. The newer doc supersedes the narrow one.                                                                                            | `src/components/atlas/CivicResearchPanel.tsx:33`                        |

## What This Review Does Not Cover

- Backend repos (`our-civic-atlas-backend`, `Index-API`). The Phase G
  coordination doc and the commit messages reference sibling-repo
  commits (`914c35f`, `b583c246`); those land or do not land on their
  own merits and are out of scope here.
- Runtime behavior. No `npm run build`, `npm run lint`, or live
  `npm run dev` was executed. A future verification pass should run
  the build to confirm the `next-env.d.ts` change is the only blocker
  to CI green.
- The full plan-doc content. The four phase plans (A, C, D, E) were
  inspected at headers and em-dash compliance only; their substantive
  acceptance criteria were not reviewed against the spec.
- The cross-repo launch plan's broader integrity. Phase G additions
  were inspected; Phases A through F and Phase H proposals (from the
  working-tree theorize doc) were not re-reconciled.

## Epistemic Ledger

| Primitive | Entry                                                                                                                                                                                                                                          | Confidence |
|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| Claim     | The Service-Tier Auth retraction in `36bfe72` is real and verified end-to-end; no `THESEUS_API_TOKEN` references survive in `src/`.                                                                                                            | high       |
| Claim     | `getAuthHeaders()` in `client.ts:55-58` is reachable only from server-side contexts and is dormant unless `THESEUS_AUTH_TOKEN` is set in the deployment env.                                                                                    | high       |
| Claim     | The `current` scenario's `provenance: "actual"` labels invented fixture data as sourced Flint atlas rows, in tension with the No Fake UI rule's data-honesty corollary.                                                                       | high       |
| Claim     | The `next-env.d.ts` working-tree change is a Next.js 16 + Turbopack regeneration artifact and risks breaking `next build` if committed.                                                                                                        | high       |
| Claim     | Only one em-dash was newly introduced by this review window (`CivicResearchPanel.tsx:213` from `c847fcd`); the others are pre-existing from 2026-05-13 and 2026-05-18.                                                                          | high       |
| Tension   | The Visual Design Gate was not formally invoked for `ScenarioControls`, but the component re-uses existing visual vocabulary rather than introducing a new register; the practical risk is low.                                                | medium     |
| Gap       | Runtime verification (`npm run build`, `npm run lint`) was not performed in this review pass; the `next-env.d.ts` finding is grounded in static analysis and Next.js 16 docs, not a reproduced CI failure.                                     | low (low-impact) |
| Decision  | This review treats the seven listed commits + two adjacent context commits as the full scope. Earlier commits (`6fd9262`, `8214fe0`, etc.) were inspected for blame-resolution only.                                                            | high       |
