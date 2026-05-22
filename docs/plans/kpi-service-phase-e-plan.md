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
| Runtime complete | KPI query returns scenario/scope metric bundles. | backend/query tests. | planned |
| Product complete | Place and compare panels are readable without overwhelming the map. | screenshots desktop/mobile. | planned |
| Vision complete | Users can compare scenario tradeoffs with source-backed uncertainty. | KPI panel review. | planned |
| Baseline capture | Current Place tab captured before KPI panel. | visual evidence PNGs. | planned |
| Do Not Downgrade | KPI panel does not displace core parcel/building context. | browser smoke. | planned |
| Reversible boundary | KPI panel can be hidden and cache invalidation can be disabled. | feature flag/config review. | planned |

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
| E-001 | Add KPI and multiplier schemas. | `kpi_schema.py`. | ingest | KPI definitions, multiplier rows, result bundles, uncertainty fields validate city-pack YAML. | schema round-trip tests. | Bad formulas/multipliers enter runtime. | planned |
| E-002 | Add city-pack KPI registry. | `kpi_registry.py`, Flint YAML. | ingest/data | Registry loads definitions/multipliers and rejects missing citations or invalid scopes. | fixture tests. | KPIs become hardcoded code paths. | planned |
| E-003 | Add safe formula evaluator. | `kpi_evaluator.py`. | ingest | Only whitelisted functions and math operations execute. | hostile formula tests. | Arbitrary code execution or wrong math. | planned |
| E-004 | Add uncertainty propagation. | evaluator/result bundle. | ingest | Multiplication/division and addition/subtraction uncertainty rules produce expected ranges. | hand-calculated tests. | Metrics look precise when they are not. | planned |
| E-005 | Add demographic and multiplier ingest. | ACS/BLS/IRS/county sources. | ingest/data | Baseline tables/Parquet carry source, vintage, uncertainty, and refresh date. | source fetch and schema tests. | Metrics lack grounded source context. | planned |
| E-006 | Add tenant-scoped KPI tables. | backend migration. | backend | `multiplier`, `kpi_definition`, `kpi_result`, and `demographics_baseline` are tenant/city scoped with indexes. | migration/RLS tests. | Cross-tenant metric leakage. | planned |
| E-007 | Add KPI compute service. | `kpi_compute.py`, scenario envelope query. | ingest/backend | Single scenario/scope/KPI returns value, uncertainty range, and source summary. | parcel and ward fixture tests. | Values disagree with envelope rows. | planned |
| E-008 | Add KPI batch invalidation. | Ray/RunPod, scenario publish hook. | ingest/backend | Ward/city KPIs precompute; multiplier or scenario changes invalidate stale rows. | idempotency and cache tests. | UI shows stale metrics. | planned |
| E-009 | Add GraphQL KPI queries. | backend sidecar/schema. | backend/frontend | `kpiBundle`, `kpiDelta`, and `multipliers` queries are tenant-authenticated. | query smoke and codegen. | Frontend bypasses backend for data pulls. | planned |
| E-010 | Add Place KPI panel. | public app Place tab. | frontend | Compact metrics show value, uncertainty, and plain source note. | typecheck, lint, screenshot. | Metrics crowd out parcel context. | planned |
| E-011 | Add compare KPI delta panel. | Phase D compare mode. | frontend | Scenario A/B/Delta table shows signed metric differences and source drawer. | browser screenshots. | Deltas imply judgment without category direction. | planned |

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
