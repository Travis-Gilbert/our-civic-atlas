# Orchestrate Plan: V1 Gap Remediation

## Purpose

This plan starts after the drift-remediation lane has corrected the target:
R3F/Three is the primary Atlas Scene renderer, MapLibre/deck.gl are the
baseline and fallback, Mosaic/DuckDB-WASM is the analytical data plane, and
Brush/IFC/OpenBIM plus Rusty Red geocache/hash work are architecture lanes.

The V1 visual spec remains the floor. These GAP items turn the corrected intent
into product-complete surfaces.

## Current Status

| Gap ID | Status | Current evidence |
|---|---|---|
| GAP-001 | partial | First R3F/baseline desktop and mobile screenshots are captured in `docs/visual-evidence/v1-drift/`; R3F failed visual parity and remains opt-in. |
| GAP-002 | partial | App has `--ctx-*` civic atlas CSS variables; no explicit `--oca-*` token map. |
| GAP-003 | partial | R3F SceneHost exists as an opt-in prototype with real ward/park geometry, camera-distance LOD, instanced markers, view-specific labels, runtime telemetry, light edge veil, and source-backed water-infrastructure anchor; public default remains the higher-fidelity MapLibre/deck.gl and Leaflet renderer. See `docs/plans/r3f-atlas-scene-quality-plan.md`. |
| GAP-004 | partial | Mobile scene now uses a search-first header plus Dynamic Island control for focus, navigation, dossier, and horizon context; selected-place and parity states still need more polishing. |
| GAP-005 | done | Node Horizon now renders as a compass/drawer field with direction-aware distant atlas surfaces in scene mode, plus desktop/mobile evidence in `docs/visual-evidence/v1-drift/`. |
| GAP-006 | partial | Dossier, object, scene, methodology, and visual-grammar copy now use support/progress/review language. Internal schema fields still use confidence names and need a later contract migration if desired. |
| GAP-007 | done | Sources route now renders as a scan-first registry with native filters, selected-source detail, fixture-backed usage counts, and desktop/mobile evidence in `docs/visual-evidence/v1-drift/`. |
| GAP-008 | planned | Contribution page explains gated writes; receipt UI is not implemented. |
| GAP-009 | planned | Lost Flint is represented in specs/contracts, not visible scene interaction. |
| GAP-010 | planned | Public Evidence mode was removed; document/source support should return only as selected-object detail UI. |
| GAP-011 | planned | Compare state is not a deliberate V1 interaction yet. |
| GAP-012 | planned | Accessibility and low-bandwidth gate is not captured in evidence. |

## Checklist

| ID | Task | Acceptance criteria | Validator | Route |
|---|---|---|---|---|
| GAP-001 | Capture visual gate evidence. | Baseline, target, and after screenshots exist for desktop and 390 x 844 states before Product complete is claimed. | Browser/Playwright screenshots, nonblank canvas check. | validation |
| GAP-002 | Formalize V1 design tokens. | V1 palette, surface, support/progress, source, and scene colors map to stable CSS variables without one-note palette drift. | CSS grep, screenshot review. | design/frontend |
| GAP-003 | Replace generic basemap feeling with bounded civic world. | R3F ground, Flint boundary, outside-world veil, source-backed anchors, and fallback map bounds make Flint feel like the world entry. | Route smoke, visual review, fallback query smoke. | renderer |
| GAP-004 | Rework mobile Atlas Scene around search-first use. | Mobile has a stable search-first header, Dynamic Island control rail, no overlapping dossier/search chrome, and no tiny generic map framing. | 390 x 844 screenshot, keyboard/touch smoke. | mobile/frontend |
| GAP-005 | Complete spatial Node Horizon control. | Horizon becomes compass/drawer/portal system; list becomes detail, not the primary experience. | Desktop/mobile screenshot and route click smoke. | federation/frontend |
| GAP-006 | Replace confidence UI with support/progress language. | User-visible UI names support, progress, reasons, next checks, and evidence links instead of truth-meter confidence. | Copy grep, dossier screenshot. | content/frontend |
| GAP-007 | Build Source Registry Table. | `/open-flint-atlas/sources` opens as a scan-first registry with filters, selected-source detail, used-in objects, freshness, and public-use status. | Route screenshot, keyboard smoke. | sources/frontend |
| GAP-008 | Build contribution intake and receipt boundary. | Object-origin action opens intake state, records disabled/queued receipt states honestly, and separates private pending from public reviewed. | Route smoke, privacy copy review. | contribution |
| GAP-009 | Build Lost Flint v0 scene prototype. | One bounded area shows current, vanished, inferred, and article-linked civic objects with source/support links. | Fixture validation, R3F screenshot. | renderer/data |
| GAP-010 | Build historic document drawer. | Document mode can anchor article/map/photo/source previews to the selected place without leaving the civic scene. | Typecheck, selected-place smoke, screenshot. | document/frontend |
| GAP-011 | Make compare state deliberate. | Compare is an explicit analytical state for places/nodes/time slices, not accidental activation through mode drift. | Interaction smoke, copy review. | analysis/frontend |
| GAP-012 | Add accessibility and low-bandwidth evidence. | Keyboard, reduced-motion, text summary, mobile, and throttled-load checks are recorded in the V1 gate. | Manual checklist plus route smoke. | validation/accessibility |

## Execution Phases

| Phase | Gap IDs | Outcome |
|---|---|---|
| Phase 1: Evidence and tokens | GAP-001, GAP-002, GAP-012 | Product-complete criteria become measurable. |
| Phase 2: Scene world and mobile | GAP-003, GAP-004, GAP-005 | R3F Atlas Scene becomes the primary usable surface on desktop and mobile. |
| Phase 3: Trust and source work | GAP-006, GAP-007, GAP-010 | Evidence, documents, sources, and support language become first-class workflows. |
| Phase 4: Civic action and memory | GAP-008, GAP-009, GAP-011 | Contributions, Lost Flint, and compare state move from concept to usable V1 slices. |

## First Execution Slice

1. Keep baseline as public default and use `?renderer=scene` for R3F development.
2. Complete GAP-003 by executing R3FQ-001 through R3FQ-006 from `docs/plans/r3f-atlas-scene-quality-plan.md`.
3. Complete GAP-006 copy pass in `PlaceDossier.tsx`, object route, scene route, and any cards that still say confidence as a truth-meter.
4. Then move to GAP-007 Source Registry Table, because source scanning is the fastest trust upgrade after the scene shell.

## Gates

- Do not mark Product complete until GAP-001 screenshots exist.
- Do not make R3F the public default until it is equal-or-better on desktop and mobile.
- Do not publish contribution writes until GAP-008 receipt/privacy states are implemented.
- Do not promote Brush/IFC/OpenBIM assets until GAP-009 records source/support provenance.
- Do not treat Rusty Red geocache/hash acceleration as canonical civic truth.
