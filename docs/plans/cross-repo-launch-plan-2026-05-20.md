# Cross-Repo Launch Plan: Procedural Algorithm Rendering Buildings

Generated 2026-05-20 after the catchup pass landed commit `9febedc` with the
Pascal-style node-tree adapter and the three Lane 4 strategic-seam documents.
This plan picks up where the catchup plan ends: it acts on those coordination
notes, sequences the work that gets from the current state to procedural
algorithm rendering buildings before launch, and identifies which repo owns
each slice.

## Source of Truth Stack

- Unified north-star plan (now with USD promoted to UCA-022):
  `docs/plans/our-civic-atlas-north-star-execution-plan.md`
- Catchup plan (Lanes 1, 3, 4): `docs/plans/catchup-plan-2026-05-20.md`
- Theorize Theorem Brief artifact (committed as the Lane 4 documents):
  - `docs/design/proto-usd-field-parity-audit.md`
  - `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md`
  - `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md`
- Anthropic-authored strategic doc (external reference, not in this repo):
  `/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org/Open USD, PairFormer +Nodetree.md`
- Codex handoff session note: `docs/notes/session-2026-05-18-codex-handoff-phases-0-3.open.md`
- Phase 4 UI decisions (locked, implementation deferred):
  `docs/design/phase-4-correction-loop-ui.md`

## Posture

- Spec is the floor. Every UCA item and Lane 4 coordination note maps to at
  least one XRL item below.
- Deferrals are surfaced individually with a one-sentence justification.
- No time estimates, no compute estimates, no effort sizing. Phases are
  sequenced by dependencies, not durations.
- No worktrees. No silent MVP cuts. No fake UI. No mock data in shipped
  surfaces.
- Design-gate skill is mandatory for new visual surfaces; Lane 3 brainstorms
  from the catchup plan continue alongside this plan.
- Multi-tenancy invariant: every backend call carries `TenantContext`; every
  PostGIS table has `tenant_id` with RLS; every RustyRed namespace is
  tenant-scoped.

## Goal

A live atlas at `flint.ourcivicatlas.org` where a visitor:

1. Navigates to `/open-flint-atlas/lost-flint/carriage-town`.
2. Sees 20 hand-encoded Carriage Town buildings rendered with per-part
   confidence (Mass + Facade + GroundFloor + Roof) using procedural geometry
   plus optional Blender-archetype GLBs.
3. Taps a building, opens the dossier, sees per-part source provenance and
   per-part confidence indicators (three Phase 4 bands: contested under 50%,
   percent bar 50 to 85, silent over 85).
4. Types `1925` in the search bar, sees only the buildings that overlapped
   that year; OSM extant buildings dim or filter for the time slice.
5. Everything served end-to-end through the new Axum gRPC stack via the Node
   sidecar GraphQL, with NO fallback to the old Strawberry path.

That is V1. Phase 4 community correction loop, Graph-LoRA per-tenant
adapters, and USD live archive publication land post-V1.

## Repo Ownership Map

| Repo | Role in this plan |
|---|---|
| `Open-Flint-Atlas-main-release/` (this repo) | Frontend consumer. Lost Flint route, per-part R3F shader, dossier extension, GraphQL client cutover, search-bar year filter, baseline visual evidence. |
| `our-civic-atlas-backend/` | Rust workspace. Proto rename + OpeningOverride addition, Scene Foundry orchestration (render_jobs outbox), Spacetime + Reconstruction service implementations, projection from PostGIS to RustyRed. |
| `civic-atlas-ingest/` | Modal apps. Pairformer architecture with adapter seams, training corpus ingestion, training pipeline, inference endpoint, Blender Scene Foundry archetypes (8 .blend files), GLB render Modal app. |
| `Index-API/` | Theseus bridge sidecar. Mostly passive in this plan; ingestion path queries for IngestArtifact. |

Coordination model: this repo owns the cross-repo plan as a document. The
plan's XRL items are owned by the named repo. When a session opens a sibling
repo, it picks up the relevant XRL items from this plan as its checklist.
The Lane 4 coordination notes get mirrored into each sibling repo's
`docs/orchestrate/` directory as part of XRL-A-002.

## Phase Sequencing

```
Phase A: Proto stabilization (backend rename + OpeningOverride)
  |
  v
Phase B: Pairformer V1 (architecture + training + inference)  <--+
  |                                                              |
  +-- parallel ----+                                              |
  |                |                                              |
  v                v                                              |
Phase C: Scene    Phase D: Frontend hand-back consumption        |
Foundry V1        (GraphQL cutover, R3F per-part shader,         |
(archetypes +     dossier extension, year filter)                |
GLB render +                                                     |
upload)           ---------+                                     |
  |                        |                                     |
  +------------+-----------+                                     |
               |                                                 |
               v                                                 |
        Phase E: Carriage Town launch (cross-repo integration) <-+
               |
               v
        Phase F (post-V1): USD integration, Graph-LoRA,
                            Phase 4 community correction UI
```

Phases B, C, D can run in parallel once Phase A lands. Phase E is the
integration milestone. Phase F is post-launch.

## Phase A: Proto Stabilization

Owner: `our-civic-atlas-backend`. This phase converts the Lane 4 audit and
coordination notes into a single bounded backend PR.

| ID | Task | Owner | Acceptance | Validator | Dependencies |
|---|---|---|---|---|---|
| XRL-A-001 | Mirror the three Lane 4 documents into the backend repo. | this repo + `our-civic-atlas-backend` | Copies of `docs/design/proto-usd-field-parity-audit.md`, `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md`, and `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` exist under `our-civic-atlas-backend/docs/orchestrate/`. Same content; metadata header marks them as mirrored from this repo's commit `9febedc`. | Markdown review against the source files in this repo. | Commit `9febedc` (already landed). |
| XRL-A-002 | Mirror the Pairformer coordination note into `civic-atlas-ingest`. | `civic-atlas-ingest` | Copy of `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md` exists under `civic-atlas-ingest/docs/orchestrate/`. Same content; metadata header marks the source commit. | Markdown review. | XRL-A-001. |
| XRL-A-003 | Open the proto rename PR. Single bounded PR landing 19 renames + 30 missing-in-proto field additions per the parity audit. Includes the additive `OpeningOverride` field at `OpeningGrid.opening_overrides` (field number 7). Adds correction sub-message to `PartProvenance` and texture-provenance sub-message to parts that can carry textures (Facade, Roof, Ornament, GroundFloor). | `our-civic-atlas-backend` | Proto changes match the audit. `cargo check --workspace` and `cargo test` pass. ts-proto + grpc-py + tonic bindings regenerate without manual intervention. Carriage Town seed migration `0004_seed_carriage_town_specs.sql` updated to use new field names. PR description references `docs/design/proto-usd-field-parity-audit.md` by path and lists every renamed/added field. | `cargo check`, `cargo test`, generated-binding diff review. | XRL-A-001. |
| XRL-A-004 | Update existing backend service implementations to use the renamed proto fields. | `our-civic-atlas-backend` | `crates/civic-atlas-server/src/corrections.rs`, `src/lib.rs`, and any other consumer compiles against the new field names. `GetBlockSubgraph`, `SubmitReconstructionSpec`, and the corrections service continue to return the same data shape (just with the new names). | `cargo test` + a smoke test that round-trips a Carriage Town spec through the renamed proto. | XRL-A-003. |
| XRL-A-005 | Update the frontend's GraphQL codegen and any TypeScript consumers that touch proto-derived types. | this repo | `npm run codegen` regenerates against the updated backend schema. `npm run typecheck` passes. `npm run validate:reconstruction-node-tree` passes (the adapter consumes the `HistoricalReconstruction` fixture model today, not the proto directly; the validator may not need changes). | `npm run codegen`, `npm run typecheck`, `npm run validate:reconstruction-node-tree`. | XRL-A-003, XRL-A-004. |

Phase A deferrals (surfaced individually):

- Per-source confidences (`per_source_confidences` parallel to `sources`) is
  included in the rename PR per the audit. Reason for inclusion: future
  source-quality scoring depends on it; cheap to add now.
- Texture provenance sub-message (`TextureProvenance` on Facade, Roof,
  Ornament, GroundFloor) is included in the rename PR even though no
  consumer reads it yet. Reason for inclusion: post-V1 USD adoption needs
  it, and adding it later is a second invasive proto change. Better to land
  both at once.
- Backward-compatible field renumbering is NOT in scope. Every new field
  takes a new number; renamed fields keep their existing numbers with only
  the name changing. This preserves wire compatibility.

## Phase B: Pairformer V1

Owner: `civic-atlas-ingest`. The procedural algorithm itself.

| ID | Task | Owner | Acceptance | Validator | Dependencies |
|---|---|---|---|---|---|
| XRL-B-001 | Pairformer architecture with adapter seams. Land the three seams from `pairformer-adapter-seams.md`: separable `PairUpdate` block, separable `ConfidenceHead` block, `tenant_context` parameter on the input encoder and output heads. | `civic-atlas-ingest` | Module layout matches the coordination note's acceptance criteria. Unit test confirms `tenant_context="flint"` and `tenant_context="_base"` produce the same output today (adapter dispatch is a no-op at V1). Checkpoint format records the tenant context. | `pytest`, smoke test on a synthetic 5-node graph. | XRL-A-002. |
| XRL-B-002 | Training corpus ingestion for the Flint tenant. Existing stubs at `modal/ingest_overpass.py`, `modal/ingest_sanborn.py`, `modal/ingest_assessor.py` become real. Output: typed training graphs with per-part labels, archetype labels, and coverage_quality lanes. | `civic-atlas-ingest` | Each ingest Modal app runs end-to-end against the named source (Overpass, Mapwarper Sanborn, Genesee County assessor). Output to `s3://civic-atlas/training/flint/<source>/<date>/` with content hash. `coverage_quality` per record set per the Phase 5 protocol. | Modal app smoke run on a small bbox; manual review of output Parquet schemas. | XRL-A-003. |
| XRL-B-003 | Pairformer training pipeline. Trains the base Flint Pairformer with the architecture from XRL-B-001 on the corpus from XRL-B-002. | `civic-atlas-ingest` | `modal/building_head_train.py` runs end-to-end on Modal H100 or B200 and produces a checkpoint at `s3://civic-atlas/models/pairformer-flint-v1/<run_id>/`. Held-out validation set produces sensible per-part priors (eyeball at least; rigorous benchmark is a separate plan). | Modal training run; checkpoint validation smoke. | XRL-B-001, XRL-B-002. |
| XRL-B-004 | Pairformer inference endpoint. The Modal-hosted inference service that takes a partial ReconstructionSpec (footprint + known fields) and returns per-part priors with confidence + `from_gnn_prior=true` + `gnn_version`. | `civic-atlas-ingest` | `modal/building_head_infer.py` ships as a Modal web endpoint. Request: ReconstructionSpec partial; response: filled-in PartProvenance per part with confidences. Tenant-scoped: a Flint request never touches a future Detroit checkpoint. | curl smoke against the Modal endpoint with a Carriage Town partial spec; response shape matches the proto. | XRL-B-003. |
| XRL-B-005 | Backend bridge to the inference endpoint. The Axum service `crates/civic-atlas-server` gets an internal client that calls the Modal inference endpoint when a spec is submitted for review. | `our-civic-atlas-backend` | `civic-atlas-server` reads `PAIRFORMER_INFER_URL` env var; when a `SubmitSpecForReview` arrives with empty fields, the server calls the Modal endpoint, fills the empty fields with priors, marks `from_gnn_prior=true`, and records `gnn_version`. Existing approval flow unchanged. | Integration test that round-trips a partial spec through submit + infer + approve. | XRL-B-004, XRL-A-004. |

Phase B deferrals:

- Multi-tenant Pairformer adapters (Graph-LoRA) DEFERRED to Phase F. Reason:
  the architectural seams are present after XRL-B-001; the actual adapter
  training depends on a second tenant existing AND accumulated corrections,
  neither of which exist at V1.
- Rust Belt corpus pre-training (Detroit, Buffalo, Cleveland, Pittsburgh,
  Toledo, Akron, Milwaukee, Saginaw, Bay City, Youngstown) DEFERRED to
  Phase F. Reason: the V1 Flint Pairformer trains on Flint data directly;
  cross-domain pre-training is a Graph-LoRA prerequisite, not a V1 one.
- DGL or PyG migration from any current ML stack DEFERRED. Reason: V1 ships
  on whichever stack works first; the Graph-LoRA section of the Anthropic
  doc names DGL or PyG as the long-game stack, not a V1 constraint.

## Phase C: Scene Foundry V1

Owner: `civic-atlas-ingest` for archetypes and render; `our-civic-atlas-backend` for orchestration.

| ID | Task | Owner | Acceptance | Validator | Dependencies |
|---|---|---|---|---|---|
| XRL-C-001 | Author the 8 Blender geometry-nodes archetypes. Hand work: commercial-brick, frame-house, factory-bay, warehouse, church, school, gas-station, mixed-use-storefront. Each `archetype.blend` file matches its existing MANIFEST contract in `civic-atlas-ingest/primitives/archetypes/<slug>/`. | `civic-atlas-ingest` | All 8 `.blend` files exist. Each renders a sample building from a synthetic ReconstructionSpec without manual intervention. Material slots match the manifest. | Blender batch-render smoke against synthetic specs. | None (independent hand work). |
| XRL-C-002 | Scene Foundry Modal app. Headless Blender container that takes a ReconstructionSpec + Pairformer priors, selects the archetype, renders a GLB, and uploads to S3. | `civic-atlas-ingest` | `modal/scene_foundry.py` (already stubbed) becomes real. Web endpoint accepts a spec, dispatches Blender headless render, writes GLB to `s3://civic-atlas/<tenant>/assets/<spec_id>/<version>/<hash>.glb`. Writes a `generated_assets` row to PostGIS via the backend on success. | Modal smoke run with one Carriage Town spec; validate the GLB renders correctly in `usdview` or Blender. | XRL-C-001, XRL-A-004. |
| XRL-C-003 | Backend orchestration of Scene Foundry. The `render_jobs` table + outbox over PostgreSQL row locks (already designed by Codex) actually fires Scene Foundry when a spec is approved. | `our-civic-atlas-backend` | `ApproveSpec` triggers an outbox row; the existing `civic-atlas-outbox-worker` (already shipped) is extended to dispatch Scene Foundry render jobs in addition to RustyRed projections. Retry on failure with exponential backoff. | Integration test: submit + approve a spec, verify a GLB lands in S3 and a `generated_assets` row appears. | XRL-C-002, XRL-A-004. |
| XRL-C-004 | Time-slice variant rendering. For each approved spec, Scene Foundry produces one GLB per era variant the spec declares (e.g., 1925, 1932, 1965, 1980). | `civic-atlas-ingest` | Multi-era specs produce N GLBs at `<tenant>/<spec_id>/<version>/<era>/<hash>.glb`. The `generated_assets` table carries one row per era. | Smoke run with a multi-era spec; validate all eras render. | XRL-C-002. |

Phase C deferrals:

- USD output from Scene Foundry DEFERRED to Phase F. Reason: V1 ships on
  GLB; USD is the canonical archive that lands once the proto rename is
  stable and the converter is written.
- Splat or Gaussian-splat rendering DEFERRED. Reason: GLB is sufficient for
  the per-part confidence shader; splats are a quality upgrade for later.
- IFC asset path DEFERRED to Phase F or later. Reason: IFC is for fully
  documented landmark buildings; not in the V1 path.

## Phase D: Frontend Hand-Back Consumption

Owner: this repo. Acts on the Codex Phase 0 and Phase 3 hand-backs.

| ID | Task | Owner | Acceptance | Validator | Dependencies |
|---|---|---|---|---|---|
| XRL-D-001 | Cut over the GraphQL client URL for `placesList` behind the feature flag. First Codex Phase 0 consumer touchpoint. | this repo | `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_PATH=node-sidecar` (existing env var) routes `placesList` through the new Node sidecar. Old Theseus Strawberry path stays alive for unflagged requests. 222 live Carriage Town places resolve through the new path. | `npm run validate:dossier:live`; live route smoke at `/open-flint-atlas`. | XRL-A-005. |
| XRL-D-002 | R3F per-part confidence shader port. Port the existing `ConfidenceMixMeshLayer` shader math from `src/components/atlas/AtlasLostFlintDeckLayer.ts` into an R3F equivalent that consumes per-part `PartProvenance` from the new proto. Each typed part (Facade, OpeningGrid, Roof, etc.) becomes a separate mesh group with material that reads `partConfidence` and tints accordingly. | this repo | New file `src/components/atlas/r3f/PerPartConfidenceMesh.tsx` (or similar). Receives a `ReconstructionSpec` + GLB URL + per-part provenance. Renders the GLB with per-part fragment-shader tinting that matches the three confidence bands. Reduced-motion safe. | Visual smoke at `/open-flint-atlas/lost-flint/carriage-town`; before/after screenshots. | XRL-A-005, XRL-C-002, design-gate completed (CU-L3-001 brainstorm). |
| XRL-D-003 | Per-part dossier extension. Tapping a per-part mesh region opens the existing dossier sheet with new tabs showing per-part sources, per-source confidence (when XRL-A-003 lands the `per_source_confidences` field), and a per-part "documented vs inferred" badge. | this repo | `src/components/atlas/PlaceDossier.tsx` extends with Layer 2 (Part) navigation per the locked Phase 4 UI decisions in `docs/design/phase-4-correction-loop-ui.md`. Mobile sheet behavior preserved. | Dossier smoke against an approved Carriage Town spec; mobile + desktop screenshots. | XRL-D-002, design-gate completed (CU-L3-001 brainstorm). |
| XRL-D-004 | Year-filter rebinding from local helpers to `GetViewportAtTime`. The existing `parseAtlasYear` + `atlasYear` state in `OpenFlintAtlasScene.tsx` continues to drive the search-bar input; the consumer swaps from `osmBuildingExistsInYear` + `reconstructionExistsInYear` to a `GetViewportAtTime` gRPC call through the Node sidecar. | this repo | Year input drives a real temporal query. Changing the year re-queries and updates the rendered set. Existing OSM extrusion still filters per the rebinding. The Carriage Town set updates per the spec's `t_start_ms` / `t_end_ms`. | Manual smoke: type 1925, 1932, 1965 in the search bar; verify each renders a different set. | XRL-A-005, XRL-D-001. |
| XRL-D-005 | Time-travel visual confirmation bug fix (CU-L1-002 from the catchup plan). | this repo | On-screen Year overlay renders when `atlasYear` is non-null; OSM features dim or filter at a zoom level the user can perceive; reconstruction set updates with the year. | Before/after screenshots; manual smoke. | XRL-D-004. |
| XRL-D-006 | UCA-024 visual baseline capture (CU-L1-005 from the catchup plan), now extended to capture the new Lost Flint per-part rendering. | this repo | Baseline screenshots under `docs/visual-evidence/<date>/baseline/` for desktop and mobile covering every currently-routed page + the new per-part Lost Flint state. | `npm run validate:routes:live`; screenshot review. | XRL-D-002, XRL-D-003. |

Phase D deferrals:

- Per-part spatial picking on procedural confidence-mix boxes DEFERRED to a
  later landmark-only polish phase. Reason: procedural boxes have no
  separate roof mesh to hit-test; per-part picking only makes sense for
  hand-modeled landmark buildings (e.g., Whaley House) with named
  sub-meshes. The Phase 4 UI decisions doc already locks this deferral.
- WebAssembly USD loading in the browser DEFERRED to Phase F. Reason: the
  WASM USD ecosystem is maturing; V1 uses GLB for speed and reserves USD
  for archive.

## Phase E: Carriage Town Launch

Owner: cross-repo integration. This is the milestone.

| ID | Task | Owner | Acceptance | Validator | Dependencies |
|---|---|---|---|---|---|
| XRL-E-001 | End-to-end Carriage Town render. A visitor types 1925, navigates to Carriage Town, sees 20 buildings rendered with per-part confidence, taps a building, sees per-part dossier with full source provenance. Whole pipeline runs through the new Axum stack with NO fallback to old GraphQL-to-Theseus path. | cross-repo | The end-to-end gate from the 2026-05-18 handoff note: "visitor types 1925 in live atlas search, navigates to Carriage Town, sees 20 buildings rendered with per-part confidence, taps a building, sees per-part dossier with full source provenance." | Live route smoke + dossier smoke + screenshots. | XRL-D-001 through XRL-D-006; XRL-C-002 through XRL-C-004; XRL-B-005. |
| XRL-E-002 | Multi-tenant smoke. A sample second tenant (e.g., Saginaw bootstrap) shows no Flint data and an empty Carriage Town. | `our-civic-atlas-backend` + this repo | `civic-atlas tenant new saginaw` provisions a complete second tenant. The Saginaw tenant's atlas view at `/open-flint-atlas?tenant=saginaw` (or equivalent) is empty. RustyRed cross-tenant queries are impossible by construction. | Tenant provisioning smoke; cross-tenant query smoke. | XRL-A-003, XRL-E-001. |
| XRL-E-003 | Visual gate. UCA-024 Do Not Downgrade gate passes for the new Lost Flint per-part rendering compared to the existing deck.gl ConfidenceMixMeshLayer path. | this repo | Side-by-side screenshots of the deck.gl path vs the R3F per-part path. The R3F path is equal-or-better on every axis (legibility, source visibility, mobile civic access). If R3F path is worse on any axis, do not promote it. | UCA-024 gate review. | XRL-D-002. |
| XRL-E-004 | Governance + observability + changelog. UCA-023 acceptance criteria carried through to launch. | this repo + `our-civic-atlas-backend` | Public docs cover governance, disputes, contribution policy, methodology, creator flow, observability events, update logs, release checklist. Already mostly done per the orchestrate-non-ui-execution-report; this item closes the loop with launch-specific updates. | Markdown review; observability event inventory. | XRL-E-001. |

## Phase F: Post-V1

Owner: distributed. These items are explicit deferrals from V1, captured
here so they remain visible.

| ID | Task | Owner | Reason for V1 deferral |
|---|---|---|---|
| XRL-F-001 | USD converter (`civic_atlas/usd/converter.py`) implementing the Anthropic doc's converter spec. | `civic-atlas-ingest` | V1 ships on GLB; USD is the archive, not the runtime. Proto rename in Phase A makes this cheap when it lands. |
| XRL-F-002 | USD scene composer (`civic_atlas/usd/scene_composer.py`) per the doc. | `civic-atlas-ingest` | Same as XRL-F-001. |
| XRL-F-003 | Graph-LoRA per-tenant adapter training. | `civic-atlas-ingest` | Needs a second tenant and accumulated corrections to be meaningful. V1 has only Flint and no corrections. |
| XRL-F-004 | Rust Belt cross-domain Pairformer pre-training. | `civic-atlas-ingest` | Graph-LoRA prerequisite. V1 trains directly on Flint. |
| XRL-F-005 | Phase 4 community correction loop UI: dossier CTA, `/admin/corrections` queue, `/changelog`. | this repo | Decisions LOCKED in `docs/design/phase-4-correction-loop-ui.md`; implementation deferred until procedural reconstruction is shipping renderable buildings (XRL-E-001). After XRL-E-001 lands, Phase 4 UI is the next-priority frontend work. |
| XRL-F-006 | Phase 6 admin extensions: "Generate priors" button, per-field provenance display. | this repo | Depends on XRL-B-004 inference being wired into the moderation flow. |
| XRL-F-007 | Civic Model Studio (UCA-015) and Scenario authoring. | this repo | Depends on Phase B's primitive vocabulary (CU-L3-005) and Phase F's USD adoption. |
| XRL-F-008 | GeoComments (UCA-016), live signals (UCA-017), Data Lab (UCA-018), interventions UI (UCA-021). | this repo | Each is a full new product surface; deferred per the catchup plan's Lane 3 deferrals. |
| XRL-F-009 | Per-part spatial picking on hand-modeled landmark buildings. | this repo | Landmark-only polish; per the Phase 4 UI decisions doc. |
| XRL-F-010 | WASM USD loading in the browser. | this repo | Ecosystem still maturing; revisit when stable. |

## Cross-Cutting Concerns

### Testing strategy

- Preflight every commit per the existing project rules:
  - This repo: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run validate:atlas`.
  - Backend: `cargo check --workspace`, `cargo test`.
  - Ingest: `pytest`, `py_compile`.
- Phase A landing: cross-repo build verification. The backend rename must
  trigger frontend `npm run codegen` regeneration; the binding diff must
  match the audit.
- Phase B: Pairformer inference endpoint must have at least one unit test
  per part type confirming the priors round-trip correctly through the proto.
- Phase D: visual gates are mandatory. Every R3F change captures before/after
  screenshots. Do Not Downgrade reviews apply.

### Observability

- Phase E-001 end-to-end gate is observable on the live atlas.
- `observability events` per UCA-028 cover source refresh, submissions,
  preflight flags, review decisions, read-model rebuilds, manifest failures,
  Pairformer inference failures, Scene Foundry render failures, GLB upload
  failures, and outbox worker retry exhaustion.

### Governance

- The Phase F deferrals are explicit, named, and individually justified.
- The "spec is the floor" rule applies to UCA-001 through UCA-024 plus the
  Lane 4 decisions promoted in this commit (USD as canonical publication
  format).
- New UCA items are not introduced in this plan. If new product surfaces
  emerge during execution, they go through `superpowers:brainstorming` and
  the design-gate before any code.

## Out of Scope for This Plan

These items are NOT covered by this plan. They are real concerns but belong
to separate sessions:

- `Index-API` Theseus bridge sidecar extensions beyond what already exists
  in commit `9fc772b` of that repo. The bridge serves IngestArtifact and
  embedding queries; further extensions are a separate plan.
- The travisgilbert.me main site, Studio (publishing_api), Research API
  (research_api), CommonPlace notebook, ML extensions, or any work in the
  broader Theseus / Theorem ecosystem. This plan is civic atlas only.
- Marketing, partner outreach, archive contribution agreements, or any
  non-engineering launch work. Engineering only.

## Open Questions

None at this time. The USD promotion (the one open question from the
theorize Brief) is resolved by the user's acceptance of the recommended
option in the same session; the north-star plan update lands in the same
commit as this plan.

## Production Gates

- [ ] Tests pass or failures explained, per repo.
- [ ] No unchecked migration or data risk. Proto rename PR is the largest
      migration in scope; backward-compatible field numbering preserves
      wire compatibility.
- [ ] No secrets or destructive commands introduced.
- [ ] Error paths considered: Pairformer inference failure, Scene Foundry
      render failure, GLB upload failure, outbox worker retry exhaustion,
      multi-tenant cross-query attempts.
- [ ] Observability/logging covered per the UCA-028 event inventory.
- [ ] Rollback/revert path exists per XRL item.
- [ ] Docs/ADR updated. The parity audit, coordination notes, Phase 4 UI
      decisions, and this cross-repo plan are the audit trail.
- [ ] UI visual work has before/after/target evidence. Phase D items each
      carry their own visual gate.
- [ ] Do Not Downgrade gate respected. XRL-E-003 is the explicit gate.
- [ ] Execution report can reconcile every XRL item against this plan.

## Epistemic Ledger

| Primitive | Entry | Confidence |
|---|---|---|
| Claim | Procedural algorithm rendering buildings before launch requires Phase A, B, C, D, and E together. None of the four phases can be skipped without invalidating the launch goal. | high |
| Claim | The proto rename PR is the single highest-leverage change in this plan. Every subsequent phase consumes the renamed proto; landing it late blocks every downstream phase. | high |
| Claim | Phases B, C, D run in parallel after Phase A. They have no dependencies on each other; they all integrate at Phase E. | high |
| Claim | Phase F items are real product value but not V1-critical. Calling them V1 would dilute the launch and risk shipping a worse first impression. | high |
| Tension | Multi-tenancy is invariant from day one, but the V1 launch is single-tenant (Flint only). The XRL-E-002 multi-tenant smoke ensures the invariant is real, not aspirational. If that smoke fails, multi-tenancy is decorative and the architecture is wrong. | high |
| Tension | The catchup plan's Lane 3 brainstorms (CU-L3-001 through CU-L3-005) are still in flight. They run alongside this cross-repo plan, not under it. CU-L3-001 (Lost Flint UI) is a hard prerequisite for XRL-D-002 and XRL-D-003; the design-gate forcing function applies to those XRL items. | high |
| Tension | The "spec is the floor" rule binds this plan to its IDs. If an XRL item proves harder than expected, the response is to surface the difficulty individually, not to silently MVP. The plan does not pre-license any cuts. | high |

## What This Plan Does NOT Do

- Does not estimate when V1 ships. The phases are sequenced by dependency,
  not duration.
- Does not write any code. Every XRL item is an acceptance and a validator;
  the actual code lives in the owning repo, written in that repo's session.
- Does not promote any Phase F item out of deferred status. The user can
  override; this plan does not.
- Does not replace the unified north-star plan. The north-star is the
  product spec; this plan is the cross-repo execution sequence for the
  remaining work plus the new strategic decisions.
- Does not bind the catchup plan's Lane 3 design brainstorms to this plan's
  ordering. They run alongside and gate XRL-D items individually.
