# Orchestrate Plan: Phase E KPI Service

## Executive Summary

- Goal: compute scenario-aware planning metrics from envelopes, demographics, and cited multipliers.
- Intent: turn scenarios into decision support while keeping formulas and multipliers as city-pack data.
- Summary of work: add KPI schemas, multiplier registry, safe formula evaluator, baseline demographic ingest, KPI result tables, GraphQL queries, and Place/compare panels.

## Current Condition

- Phase C computes envelope rows with floor area, headroom, unit estimates, zoning code, scenario ID, and skip reasons.
- Phase D will add scenario inheritance and dirty recompute; Phase E reads that scenario-aware envelope surface.
- The public app already has Place tab/dossier surfaces that can host compact metrics.
- Project copy should explain sources plainly; resident-facing UI should avoid academic trust jargon.

## Goal

- User-visible outcome: selected parcel, block, ward, or city views show population, jobs, tax base, infrastructure load, and other city-pack KPIs with uncertainty and plain source explanations.
- System behavior: KPI definitions and multipliers load from city-pack YAML; formulas evaluate through a locked-down DSL; results cache by scenario and scope.
- Data/model changes: add multipliers, KPI definitions, demographic baselines, and KPI result rows.
- Operational impact: parcel/block KPIs can compute lazily; ward/city KPIs precompute when scenarios publish or multipliers refresh.
- What must not regress: scenario envelope reads, tenant scope, public data privacy, GraphQL boundary, and renderer performance.

## UI Visual Milestone

| Gate | Requirement | Evidence/validator | Status |
|---|---|---|---|
| Runtime complete | KPI query returns scenario/scope metric bundles. | backend/query tests. | done: vertical slice complete |
| Product complete | Place and compare panels are readable without overwhelming the map. | screenshots desktop/mobile. | done |
| Vision complete | Users can compare scenario tradeoffs with source-backed uncertainty. | KPI panel review. | done for first registry metrics |
| Baseline capture | Current Place tab captured before KPI panel. | visual evidence PNGs. | planned |
| Do Not Downgrade | KPI panel does not displace core parcel/building context. | browser smoke. | done |
| Reversible boundary | KPI panel can be hidden and cache invalidation can be disabled. | feature flag/config review. | done via compare/layer state and `expires_at` cache rows |

## Context Stack

| Context | Source | Trust | Why it matters |
|---|---|---|---|
| Phase E spec | `/Users/travisgilbert/Downloads/SPEC-PHASE-E-KPI.md` | high as user intent | Defines KPI data model, multiplier-first design, formula DSL, and UI surfaces. |
| Phase D plan | `docs/plans/scenario-branching-phase-d-plan.md` | high | KPI reads require scenario inheritance and scenario deltas. |
| Phase C plan | `docs/plans/zoning-envelope-phase-c-plan.md` | high | KPI formulas consume envelope GFA, unit estimate, zoning/use hints, and scenario ID. |
| Ingest city pack | `civic-atlas-ingest/city_packs/flint/zoning/*` | high | Establishes source-backed Flint current data and public fixture posture. |
| Frontend boundary | `AGENTS.md`, GraphQL schema docs | high | KPI service must live behind backend GraphQL, not frontend credentials. |

## Checklist

| ID | Task | Grounding | Route | Acceptance criteria | Validation | Risk | Status |
|---|---|---|---|---|---|---|---|
| E-000 | Reconcile Phase E with scenario dependency. | Phase D/E specs. | planning | This plan makes D inheritance a prerequisite and avoids KPI work before scenario reads. | Markdown review. | KPIs compute against the wrong scenario. | done |
| E-001 | Add KPI and multiplier schemas. | `kpi_schema.py`. | ingest | KPI definitions, multiplier rows, result bundles, uncertainty fields validate city-pack YAML. | `PYTHONPATH=. pytest tests/test_kpi_schema.py`. | Bad formulas/multipliers enter runtime. | done |
| E-002 | Add city-pack KPI registry. | `kpi_registry.py`, Flint JSON. | ingest/data | Registry loads definitions/multipliers and rejects missing citations or invalid scopes. | `PYTHONPATH=. pytest tests/test_kpi_registry_compute.py`. | KPIs become hardcoded code paths. | done |
| E-003 | Add safe formula evaluator. | `kpi_evaluator.py`. | ingest | Only whitelisted functions and math operations execute. | `PYTHONPATH=. pytest tests/test_kpi_evaluator.py`. | Arbitrary code execution or wrong math. | done |
| E-004 | Add uncertainty propagation. | evaluator/result bundle. | ingest | Multiplier uncertainty ranges produce expected KPI ranges. | hand-calculated tests. | Metrics look precise when they are not. | done |
| E-005 | Add demographic and multiplier ingest. | ACS/BLS/IRS/county sources. | ingest/data | Baseline rows carry source, vintage, uncertainty, and observation date. | registry fixture tests. | Metrics lack grounded source context. | done |
| E-006 | Add tenant-scoped KPI tables. | backend migration. | backend | `multiplier`, `kpi_definition`, `kpi_result`, and `demographics_baseline` are tenant/city scoped with indexes. | `cargo test -p civic-atlas-server --test kpi_service_schema`. | Cross-tenant metric leakage. | done |
| E-007 | Add KPI compute service. | `kpi_compute.py`, scenario envelope query. | ingest/backend | Single scenario/scope/KPI returns value, uncertainty range, and source summary. | `PYTHONPATH=. pytest tests/test_kpi_registry_compute.py`. | Values disagree with envelope rows. | done |
| E-008 | Add KPI batch invalidation. | Ray/RunPod, scenario publish hook. | ingest/backend | Ward/city KPIs read fresh rows and ignore expired rows. | `cargo test -p civic-atlas-server --test scenario_kpi_runtime_queries`. | UI shows stale metrics. | done for result-row cache contract |
| E-009 | Add GraphQL KPI queries. | backend sidecar/schema. | backend/frontend | `kpiBundle` and `kpiDelta` queries are behind backend boundary. | GraphQL sidecar typecheck and data smoke. | Frontend bypasses backend for data pulls. | done |
| E-010 | Add Place KPI panel. | public app Place tab. | frontend | Compact metrics show value, uncertainty-ready fields, and plain source note. | typecheck, lint, screenshot. | Metrics crowd out parcel context. | done |
| E-011 | Add compare KPI delta panel. | Phase D compare mode. | frontend | Scenario A/B/Delta rows show signed metric differences. | browser screenshots. | Deltas imply judgment without category direction. | done |

## Test Strategy

- Preflight: verify Phase D scenario envelope inheritance is implemented.
- Focused: schema fixtures, formula evaluator safety, uncertainty math, multiplier lookup.
- Integration: demographic/multiplier ingest, KPI result caching, invalidation, backend RLS, GraphQL query smoke.
- Regression: ingest `pytest`, backend `cargo test`, frontend type/lint.
- Manual smoke: Place KPI panel, compare KPI delta, source drawer, loading/error states.

## Explicit Non-Goals and Deferrals

| Item | Why deferred | Risk | Follow-up |
|---|---|---|---|
| Public comment/e-submission | Phase F owns civic workflow. | KPIs inform but do not collect comment. | Build after KPI and scenario compare stabilize. |
| Every possible KPI in v1 | Engine and registry matter first. | First panel may feel narrow. | Add city-pack KPIs incrementally. |
| Frontend ACS/BLS direct pulls | Service credentials and data normalization belong backend/ingest side. | None. | Keep all upstream pulls outside frontend. |

## Execution Instructions

- Start with: E-001 through E-004 in `civic-atlas-ingest`, then E-006/E-009 backend seams.
- Preserve: formulas as data, cited multiplier records, tenant isolation, GraphQL frontend boundary, plain public copy.
- Run: evaluator safety tests, KPI fixture tests, migration/RLS tests, query smoke, frontend visual gates.

## Execution Update - 2026-05-22

- Completed E-001 through E-011 as an end-to-end Phase E vertical slice.
- Added KPI schemas, safe formula evaluation, city-pack registry loading, demographic baseline loading, multiplier uncertainty propagation, and KPI bundle computation in `civic-atlas-ingest`.
- Added backend migration `0009_kpi_service_schema.sql` and `0010_scenario_kpi_runtime_queries.sql`, including `expires_at` handling for cached result rows.
- Added backend GraphQL sidecar fields and public schema contract for `kpiBundle` and `kpiDelta`.
- Added compact KPI rows and signed compare deltas to the public scenario panel.
- Remaining production hardening: swap placeholder Flint multipliers for fully reviewed source pulls, expand KPI definitions, and connect the sidecar resolvers to live cached KPI rows.
