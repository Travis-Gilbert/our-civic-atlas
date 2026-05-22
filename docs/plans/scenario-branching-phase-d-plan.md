# Orchestrate Plan: Phase D Scenario Branching

## Executive Summary

- Goal: let OpenAtlas compare current Flint conditions against named proposed scenarios.
- Intent: turn Phase C envelopes into a scenario-aware planning surface without changing the Phase C table shape.
- Summary of work: add tenant-scoped scenario tables, scenario override schemas, dirty-parcel recompute, envelope inheritance, GraphQL scenario APIs, and a reversible compare UI.

## Current Condition

- Phase C stores `scenario_id` on zoning boundaries and buildable envelopes, with `current` as the default scenario.
- `civic-atlas-ingest` can compute current Flint envelopes from public parcel, zoning, and OSM road inputs.
- `our-civic-atlas-backend` has tenant-scoped PostGIS migrations and RLS tests for zoning/envelope tables.
- The public app uses MapLibre + deck.gl as the base renderer; Phase D compare UI must preserve that base.
- Scenario work must not introduce staff-only capture UI into public routes without separation.

## Goal

- User-visible outcome: residents and planners can select two scenarios and see where parcel envelopes or proposed reconstructions differ.
- System behavior: scenario overrides only recompute dirty parcels; clean parcels inherit from the nearest base scenario row.
- Data/model changes: add `scenario`, `scenario_zoning_override`, and `scenario_reconstruction_override`; keep Phase C tables unchanged.
- Operational impact: Ray/RunPod recomputes dirty envelopes; backend exposes scenario CRUD and inheritance reads.
- What must not regress: current envelope reads, tenant isolation, source-backed current zoning, public renderer performance, and simple single-scenario map behavior.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | Scenario CRUD and envelope inheritance work. | backend tests, ingest dirty-set tests, GraphQL smoke. | planned |
| Product complete | Compare mode is legible and preserves the current map when off. | desktop/mobile screenshots. | planned |
| Vision complete | Users can see current vs proposed differences and the override causing the delta. | compare-mode review. | planned |
| Baseline capture | Current single-scenario atlas view captured before compare UI. | visual evidence PNGs. | planned |
| Do Not Downgrade | Scenario picker is off/default-neutral and does not replace existing map controls. | browser smoke. | planned |
| Reversible boundary | Compare UI and scenario reads can be disabled independently. | feature flag or route/layer state. | planned |

## Context Stack

| Context | Source | Trust | Why it matters |
|---|---|---|---|
| Phase D spec | `/Users/travisgilbert/Downloads/SPEC-PHASE-D-SCENARIOS.md` | high as user intent | Defines scenario table, overrides, dirty recompute, inheritance, and compare UI. |
| Phase C plan | `docs/plans/zoning-envelope-phase-c-plan.md` | high | Confirms `scenario_id`, current envelope batch, road classifier, and PostGIS boundary. |
| Backend schema | `our-civic-atlas-backend/migrations/0007_zoning_envelope_schema.sql` | high | Scenario tables must be tenant-scoped and join against Phase C rows. |
| Ingest batch | `civic-atlas-ingest/envelope_batch.py` | high | Dirty recompute reuses envelope math and asset hashing. |
| Renderer policy | `AGENTS.md` | high | Compare mode must stay MapLibre/deck.gl-first. |

## Checklist

| ID | Task | Grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| D-000 | Reconcile Phase D with Phase C seams. | Phase C plan, Phase D spec. | planning | This plan names inherited envelopes, tenant scope, and no Phase C table reshaping. | Markdown review. | Scenario work reopens completed Phase C schema. | done |
| D-001 | Add scenario ingest schemas. | `scenario_schema.py`. | ingest | Scenario, zoning override, reconstruction override, and state enum validate JSON/YAML. | schema round-trip tests. | Invalid overrides enter recompute. | planned |
| D-002 | Add tenant-scoped scenario tables. | backend migration. | backend | Scenario and override tables include `tenant_id`, RLS, indexes, and seeded `current`. | migration/RLS tests. | Cross-tenant scenarios leak. | planned |
| D-003 | Implement dirty-parcel detection. | Shapely/GeoPandas override intersections. | ingest | Zoning and reconstruction overrides return deterministic affected parcel IDs. | fixture override test. | Recompute misses affected parcels. | planned |
| D-004 | Implement scenario recompute job. | Ray/RunPod, `envelope_batch.py`. | ingest | Dirty parcels recompute under target `scenario_id`; clean parcels are not rewritten. | dirty-count and idempotency smoke. | Scenario edits trigger full expensive recompute. | planned |
| D-005 | Add inheritance envelope query. | recursive scenario chain CTE. | backend | Query returns closest scenario row, falling back to base/current. | SQL/GraphQL test. | Empty scenarios look empty instead of inheriting. | planned |
| D-006 | Add GraphQL scenario API. | backend sidecar/schema. | backend/frontend | CRUD, fork, publish, archive, and delta queries exist with tenant auth. | introspection and mutation smoke. | Browser gains privileged service seams. | planned |
| D-007 | Add scenario diff metrics. | `scenario_diff.py`. | ingest/backend | Differences include height, GFA, units, binding constraint, and changed parcels. | fixture delta test. | Compare mode shows misleading deltas. | planned |
| D-008 | Add ScenarioPicker. | public app controls. | frontend | Active scenario appears in URL/state and defaults to `current`. | typecheck and interaction smoke. | Existing map state becomes noisy. | planned |
| D-009 | Add ScenarioEditor. | public/private boundary. | frontend/backend | Override creation is separated from public browsing and requires appropriate auth. | auth/UX review. | Public route exposes staff-like tools. | planned |
| D-010 | Add compare mode. | deck.gl layer state. | frontend | Split or overlay compare shows changed parcels and Place tab deltas. | browser screenshots. | Compare layer occludes current buildings. | planned |

## Test Strategy

- Preflight: confirm Phase C current envelopes and backend migration are current.
- Focused: scenario schema validation, one-pattern-only override tests, dirty-set geometry fixtures.
- Integration: scenario migration/RLS, inheritance query, recompute idempotency, GraphQL mutation/query smoke.
- Regression: backend `cargo test`, ingest `pytest`, frontend `npm run typecheck` and `npm run lint`.
- Manual smoke: current-only map, scenario switch, compare mode, selected parcel delta panel.

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk | Follow-up |
|---|---|---|---|
| KPI computation | Phase E owns metrics beyond envelope deltas. | Compare mode starts with physical capacity only. | Start Phase E after scenario inheritance works. |
| Public comment workflow | Phase F owns moderation and submission state. | Scenario proposals lack civic workflow. | Add after scenario CRUD and compare stabilize. |
| Realtime sub-second edit recompute | Batch recompute is sufficient for first scenario proof. | Editing may feel slower later. | Promote to Rust hot path only if measured. |

## Execution Instructions

- Start with: D-001 through D-005 before frontend compare UI.
- Preserve: Phase C tables, tenant isolation, GraphQL frontend boundary, and current map behavior.
- Run: ingest scenario tests, backend migration/RLS tests, GraphQL smoke, frontend type/lint, visual compare screenshots.
