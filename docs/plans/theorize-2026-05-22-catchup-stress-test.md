# Theorem Brief: Catchup-Plan Stress-Test Against OpenUSD/PairFormer/Nodetree, Reconciled With the In-Flight Civic-Atlas RustyRed Pivot

Generated 2026-05-22 in response to a theorize prompt that asked whether the
2026-05-20 catchup plan breaks or stays sound under three strategic decisions
introduced by the Anthropic-authored doc at
`/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org/Open USD, PairFormer +Nodetree.md`.

## Revision Log

- 2026-05-22 (first pass): brief drafted in response to the theorize
  prompt. Recommended Phase H for the in-flight Civic Atlas RustyRed
  deployment and named the corrected boundary (data path vs
  research-query path).
- 2026-05-22 (correction pass, after user feedback): brief had two
  bugs that the user surfaced. (1) The H-005 task description echoed
  the existing task 49 title "Delete bridge_server FractalExpansion +
  drop theseus-client" without challenging it. The correct scope is:
  delete the `FractalExpansion` RPC (wrong layer), KEEP `theseus-client`
  in `civic-atlas-server`'s deps because the gRPC connection to Theseus
  for search stays, REPLACE the bridge_server handler with a
  non-harness, non-THG implementation that calls Theseus's compose
  engine (or equivalent). (2) The Decisions Resolved entry for the
  bridge_server path said "FractalExpansion path remains" when it
  should have said "gRPC connection remains, but `FractalExpansion`
  as the RPC name is the wrong layer; replace with a compose-engine
  RPC." Edits applied below.

## Gap Statement (first-line honesty per project posture)

The prompt assumes "None of the three strategic decisions above are
represented" in the catchup plan. That was true on 2026-05-20 morning.
It has not been true since 2026-05-20 evening. A prior theorize pass on the
same day produced the same finding and shipped its conclusions:

- Lane 4 (Strategic Architecture Seams) exists in
  `docs/plans/catchup-plan-2026-05-20.md` lines 111 to 138, with
  CU-L4-001, CU-L4-002, CU-L4-003 all status `done`.
- The three Lane 4 documents are present:
  `docs/design/proto-usd-field-parity-audit.md`,
  `docs/plans/lane-4-strategic-seams/opening-override-proto-coordination.md`,
  `docs/plans/lane-4-strategic-seams/pairformer-adapter-seams.md`.
- The Pascal adapter slice shipped in `9febedc`:
  `src/lib/atlas/reconstruction-node-tree.ts` line 1 explicitly names the
  deferred branches as a scope-note comment.
- Cross-repo launch plan landed in `e86f10a` (later
  `5e0ddb6` for the Modal-to-Ray correction): see
  `docs/plans/cross-repo-launch-plan-2026-05-20.md`.
- Backend commit `79b8920 feat(proto): align reconstruction spec with usd parity` shipped the proto rename and the additive `OpeningOverride` at
  `OpeningGrid.opening_overrides = 7` (verified in
  `our-civic-atlas-backend/proto/civic_atlas/v1/reconstruction.proto:95` and
  `:109`).
- Ingest commit `9f14ab6 feat(pairformer): add tenant-aware civic building head` shipped the three Pairformer seams (separable `CivicPairUpdate`,
  separable `CivicConfidenceHead`, `tenant_context` parameter on
  `CivicPairformerConfig` and `CivicPairformerOutput`).

The honest reframe of the prompt: do not re-derive what landed. Find what
the prior theorize pass missed, and in particular surface the new tensions
introduced by the in-flight Civic-Atlas RustyRed pivot from this session
that the prior brief did not consider.

## Executive Summary

- Current condition: the three strategic decisions from the Anthropic doc
  are landed at the contract layer (proto field names match USD attribute
  names, OpeningOverride exists at field 7, Pairformer seams are separable
  with tenant_context). Implementation against those contracts is still
  open across XRL-B-002 through XRL-B-005, all of Phase C, all of Phase D,
  XRL-G-002 through XRL-G-004, and the Phase 4 community correction UI
  (XRL-F-005, decisions locked but build deferred).
- Intent: validate the catchup plan's coverage in light of (a) the
  Anthropic doc and (b) the user's 2026-05-22 architectural correction that
  Civic Atlas has its own RustyRed deployment, separate from Theseus's
  `RustyRedCore-THG`.
- Goal: procedural algorithm running, ingesting information, rendering
  buildings. Cross-repo plan codifies this as XRL-E-001, which requires
  Phase A done (it is), Phase B-002 through B-005 done (not), Phase C done
  (not), Phase D done (not), and Phase G architecture honest about the
  RustyRed boundary (not yet documented).
- Why this matters now: the user is mid-pivot on tasks 45 through 49. The
  in-flight code change (rustyred-client crate scaffold) needs the
  surrounding plan docs to reflect the corrected architecture before more
  code lands, or future sessions will rebuild the bridge_server path
  thinking it is the data path.

## Problem Shape

### Known facts (grounded in code and committed docs)

- Claim. The proto already carries USD-attribute-compatible names. Evidence:
  `our-civic-atlas-backend/proto/civic_atlas/v1/reconstruction.proto` has
  `part_confidence` (matches `civicAtlas:partConfidence`), `from_gnn_prior`
  (matches `civicAtlas:fromGnnPrior`), `roof_type` (matches
  `civicAtlas:roofType`), `per_source_confidences`, `moderator_overridden`,
  `moderator_overridden_at_ms`, `has_source_conflict`, `gnn_version`,
  `TextureProvenance` on Facade/Roof/Ornament/GroundFloor, and
  `ProvenanceCorrection` as a sub-message of `PartProvenance`. The
  Anthropic doc's IsA schemas (CivicAtlasReconstruction,
  CivicAtlasFacade, CivicAtlasOpeningGrid, CivicAtlasOpening,
  CivicAtlasRoof, CivicAtlasOrnament, CivicAtlasGroundFloor, CivicAtlasMass)
  and applied schemas (CivicAtlasPartAPI, CivicAtlasTextureAPI,
  CivicAtlasCorrectionAPI, CivicAtlasTenantAPI) all have proto-side
  counterparts now.
- Claim. The Pascal node-tree adapter shipped with explicit deferred
  branches. Evidence: `src/lib/atlas/reconstruction-node-tree.ts:1` carries
  the scope note "see docs/plans/lane-4-strategic-seams/ for deferred
  branches (Opening generation, multi-side facades, multi-level levels,
  Ornament subtree, OpeningOverride round-trip)." The
  `npm run validate:reconstruction-node-tree` validator is green for 51
  nodes across 5 reconstructions.
- Claim. The fixture data model the adapter operates against
  (`HistoricalReconstruction`) is single-level, single-facade, single-roof
  at V1. Evidence: the data shape consumed in `createBuildingSubtree`
  reads `reconstruction.position`, `reconstruction.bearing_deg`,
  `reconstruction.footprint` (width_m and depth_m only),
  `reconstruction.height_m`, plus per-part confidences for facade,
  ground_floor, roof. There is no per-side facade array, no per-level
  array, no ornament list in the V1 fixture model.
- Claim. The cross-repo plan correctly sequences Phase A (proto done)
  before Phase B (Pairformer V1), Phase C (Scene Foundry V1), Phase D
  (frontend hand-back), Phase E (Carriage Town launch). Phase F is post-V1.
  Phase G (GraphQL home migration) is the in-flight track that the
  RustyRed pivot interacts with.
- Claim. XRL-G-001 (civicResearch end-to-end) shipped foundation across
  three repos: bridge proto + bridge_server FractalExpansion resolver +
  Axum civic_research RPC + sidecar schema + frontend env flip. The
  Strawberry stub in Index-API was deleted. Evidence: cross-repo plan
  Phase G section lines 356 to 374 plus the live state of
  `our-civic-atlas-backend/apps/graphql-server/src/schema.ts`,
  `our-civic-atlas-backend/crates/civic-atlas-server/src/lib.rs`,
  `Index-API/apps/notebook/grpc/bridge_server.py`,
  `src/components/atlas/CivicResearchPanel.tsx`,
  `src/lib/api/graphql/queries/civic-research.graphql`.
- Claim. The user has decided Civic Atlas has its own RustyRed deployment,
  separate from Theseus's `RustyRedCore-THG`. Evidence: user quote
  "the intended architecture was for this project to have its own
  deployment of rusty red" and "Even in the way that it's written as rusty
  red for the Civic Atlas back end implies it's separate, otherwise it
  would say Theseus' Rusty Red." Tasks 45 through 49 are the migration.
- Claim. Task 46 (rustyred-client crate) is in_progress. Evidence:
  `our-civic-atlas-backend/crates/rustyred-client/Cargo.toml` exists; the
  workspace root `Cargo.toml` has not yet been updated to include the new
  member.

### Unknowns

- Gap. Whether the cross-repo plan's Phase G needs an immediate doc
  revision to reflect the corrected architecture, or whether the in-flight
  code commits will land first and the doc catches up afterward. Either
  is defensible; the question is order.
- Gap. Whether XRL-G-002 (full schema port) is correctly scoped given the
  RustyRed pivot. The current Phase G section assumes the typed places /
  events / signals / sources resolvers all go through the bridge_server
  pipeline. The corrected architecture would route them through Civic
  Atlas's own RustyRed instead.
- Gap. Whether the Pascal adapter's deferred branches block any V1 work or
  whether they correctly stay post-V1. Resolved below under Tensions.

### Constraints (project posture, binding)

- Constraint. Spec is the floor. No silent MVP, no quiet non-goals table.
- Constraint. No time estimates, no compute estimates, no effort sizing.
- Constraint. No worktrees. No em or en dashes. No emojis in code or docs.
- Constraint. Frontend talks GraphQL only. Service-tier auth (Theseus
  harness, Rusty Red, Modal/Ray, OpenAI, Firecrawl) stays server-side per
  the project CLAUDE.md "Service-Tier Auth Stays Server-Side" section.
- Constraint. Multi-tenancy invariant. Every backend call carries
  `TenantContext`; every PostGIS table has `tenant_id` with RLS; every
  RustyRed namespace is tenant-scoped.
- Constraint. Design-gate is mandatory before any new visual surface code.

### Assumptions

- Assumption. The V1 launch buildings in Carriage Town are predominantly
  one to three story with primary-facade-only data, matching the current
  `HistoricalReconstruction` model. Evidence: cross-repo plan Phase E goal
  language. If a V1 launch building turns out to require multi-side data
  (e.g., a corner building visible from two streets), this assumption
  breaks and the Pascal adapter's deferred multi-side branch graduates to
  V1.
- Assumption. The Civic Atlas RustyRed deployment is intended to live on
  Railway alongside the existing Axum service. Evidence: task 45 ("Deploy
  Civic Atlas RustyRed on Railway"). If the user changes deployment
  target (RunPod, separate cloud, on-prem), the rustyred-client
  configuration shape will not change but `RUSTYRED_URL` resolution will.
- Assumption. The bridge_server FractalExpansion path remains the
  research-query channel even after the pivot, because the use case
  (asking the broader Theseus knowledge graph about civic research
  questions) is intentionally Theseus-scoped. Evidence: the Research
  panel's UI text in `CivicResearchPanel.tsx:289` reads "Research a place,
  person, era, or claim in Flint history" which is a knowledge-graph
  query, not a data-path query.

### Tensions

- Tension. The catchup plan says CU-L1-001 (the Pascal adapter slice) is
  Lane 1 hygiene. The Anthropic doc names it as the keystone of the
  moderation UX and as the "thing to build next" because it unlocks Phase
  4. The prior theorize pass resolved this by expanding CU-L1-001's
  acceptance criteria to include the three Lane 4 coordination notes and
  the explicit scope note in the adapter file. The expansion is honest;
  the underlying tension (Lane 1 hygiene is the wrong label for a Phase 4
  prerequisite) is dissolved by the expansion. Status: resolved.
- Tension. The Pascal adapter's deferred branches (Opening generation,
  multi-side facades, multi-level levels, Ornament subtree, OpeningOverride
  round-trip) are exactly the surface area Phase 4 community correction
  needs to edit. So the adapter is shipped but the Phase 4 UX it was
  supposed to unlock is still gated. Resolution: the deferred branches
  block Phase F (XRL-F-005, locked but deferred), not Phase D or Phase E.
  V1 launch (XRL-E-001) renders 20 single-level single-facade buildings,
  which the current adapter supports. The Phase 4 UI gates on the adapter
  expansion, not on V1 launch. Status: resolved.
- Tension. The cross-repo plan's Phase G section was written assuming the
  Theseus bridge_server is the canonical backend path for ALL Civic Atlas
  queries beyond civicResearch (placesList, manifest, places(id), events,
  signals, sources, historicalReconstructions, atlasNode, etc.). The
  in-flight architectural correction says the data path is the Civic Atlas
  RustyRed deployment, and the bridge_server is only for the research-query
  path. The cross-repo plan does not yet reflect this. Status: open.
- Tension. Phase B-005 (Pairformer priors injection) says Axum reads
  `PAIRFORMER_INFER_URL` and calls Ray Serve. The corrected architecture
  has three backend paths (Civic Atlas RustyRed, Pairformer Ray Serve,
  Theseus bridge_server) where there could have been one. Multiple paths
  can be correct architecture (each owns a different boundary), but the
  cross-repo plan should name them explicitly so future sessions do not
  conflate them. Status: open.
- Tension. The Modal-to-Ray migration was a third revision-pass platform
  correction. The Phase B-000 task is done (ingest commit `c2edf52`). The
  cross-repo plan correctly reflects Ray on RunPod. No new tension.
  Status: resolved.
- Tension. The Anthropic doc's USD schema lockdown decisions all bake in
  during proto rename (which landed). The doc also sketches a USD
  converter (`civic_atlas/usd/converter.py`) and a scene composer that the
  cross-repo plan defers to XRL-F-001 and XRL-F-002. The deferral is
  honest: V1 ships on GLB; USD is the archive. Status: resolved.

### Failure modes

- Failure mode. Future session reads the cross-repo plan's Phase G section,
  sees XRL-G-002 says "implement the remaining ~25 types and ~10 fields
  ... Each backed by an Axum RPC ... and, where applicable, a Theseus
  bridge RPC," and routes the typed places resolver through the bridge.
  That rebuilds the harness-bound data path the user explicitly retired
  this session.
- Failure mode. Future session deploys the rustyred-client crate but leaves
  the outbox-worker writing to Theseus's RustyRed. That is exactly the
  current bug the user flagged ("Does that axum worker read theseus
  RustyRed graph instead of one being is deployed in the atlas backend??").
  Task 48 closes this; the plan doc revision makes the boundary explicit.
- Failure mode. The Phase 4 community correction UI lands before the
  Pascal adapter's deferred branches do, which would either silently
  silently downscope Phase 4 corrections to building-level only (violating
  per-opening correction as a documented Phase 4 capability) or block
  Phase 4 implementation entirely. The cross-repo plan correctly defers
  XRL-F-005 until after XRL-E-001, but the Pascal adapter expansion has
  no explicit XRL slot. It should be promoted to an XRL-F-005a prerequisite
  before XRL-F-005.
- Failure mode. The user's launch goal ("procedural algorithm running,
  taking in information, and rendering buildings") gets read as a Phase A
  + Phase D milestone only, skipping Phase B (the algorithm itself) and
  Phase C (Scene Foundry that turns specs into renderable assets). The
  cross-repo plan's Phase E goal language correctly requires all four
  phases. The risk is a future session interpreting "rendering buildings"
  as just the R3F shader work and shipping a launch that renders fixture
  buildings, not algorithmically-produced ones. Spec is the floor: 20
  Carriage Town buildings rendered through the full pipeline is the
  acceptance criteria.

## Options

| Option | Description | Upside | Risk | Validation | Recommendation |
|---|---|---|---|---|---|
| A | Treat the plan as sound; finish task 46 (rustyred-client crate) and tasks 47 through 49 (RPC rewire, outbox-worker rewire, bridge_server FractalExpansion deletion); do not touch plan docs until the code lands. | Fastest forward motion; in-flight code keeps moving. | Plan docs lag the code by a multi-step migration; the next session that reads only the docs will rebuild the bridge_server data path believing it is canonical. The "no fake UI / no mock data" posture has a parallel here: the plan can lie by omission about the architecture the same way UI can. | If the doc is patched in the same commit window as the code, the lag closes immediately; risk is one session, not weeks. | Not recommended in isolation. The architectural pivot is too big to leave only in code commits. |
| B | Land a focused plan-doc patch FIRST, then resume code. Patch scope: (1) add Phase H or revise Phase G in `cross-repo-launch-plan-2026-05-20.md` to name the corrected boundary (civic-atlas RustyRed = data path; bridge_server = research-query path only); (2) update `graphql-home-migration.md` to reflect XRL-G-002's revised scope (typed resolvers go to RustyRed, not the bridge); (3) add an XRL-F-005a item promoting Pascal adapter scope expansion to a Phase 4 prerequisite; then proceed with rustyred-client crate, outbox-worker rewire, FractalExpansion deletion. | Future sessions inherit the corrected architecture from the docs, not from code archaeology. The "spec is the floor" rule applies to plans: a plan that doesn't surface a boundary decision is lying by omission. | Adds a doc commit before the code pivot completes. Marginal. | Patch lands in one commit, reviewed against the code state at that moment, validated by markdown review. | Recommended. |
| C | Skip the plan revision entirely and rely on this Theorem Brief plus the in-flight code commits to convey the corrected architecture. | Zero overhead. | Future sessions read the cross-repo plan, not Theorem Briefs from a specific date. The brief gets lost in `docs/plans/`. The cross-repo plan's Phase G text actively misdirects unless revised. | None at the plan level. | Not recommended. |

## Recommended Direction

Option B with a tight, single-commit doc patch. Order of operations:

1. Patch `docs/plans/cross-repo-launch-plan-2026-05-20.md`: in the Phase G
   table, add language clarifying that XRL-G-001 (civicResearch) is the
   research-query path through the bridge, and that XRL-G-002 (full schema
   port) routes typed resolvers through the Civic Atlas RustyRed deployment
   that lands as Phase H (new section, see step 3 below). The Phase G
   section keeps its place in the plan; its scope narrows.
2. Patch `docs/plans/lane-4-strategic-seams/graphql-home-migration.md`: add
   a "Data Path vs Research-Query Path" section naming the boundary, and
   revise XRL-G-002's acceptance to route typed resolvers through
   rustyred-client, not through the bridge.
3. Add a new Phase H to `docs/plans/cross-repo-launch-plan-2026-05-20.md`:
   "Civic Atlas RustyRed Deployment." Items: H-001 deploy RustyRed on
   Railway (user-owned today, task 45); H-002 add rustyred-client crate
   (task 46, in_progress); H-003 rewire civicResearch RPC's data-path
   reads to RustyRed (task 47); H-004 rewire outbox-worker to
   civic-atlas RustyRed (task 48); H-005 reimplement bridge_server's
   research-query handler. Remove the `FractalExpansion` RPC; add a
   new RPC (suggested name `SearchKnowledge` or `ResearchSearch`,
   owner choice) whose handler calls Theseus's compose engine (or
   equivalent non-harness knowledge-graph search) instead of harness
   `fractal_expansion`, and reads from Theseus's own knowledge-graph
   store (PostgreSQL + FAISS), not from `RustyRedCore-THG`. The gRPC
   connection and `theseus-client` dependency in
   `our-civic-atlas-backend/crates/civic-atlas-server` stay; only the
   Theseus-side handler and the RPC name change. Task 49 in the
   in-flight task list rewrites to "Replace FractalExpansion with
   non-harness search RPC", not "delete FractalExpansion + drop
   theseus-client".
4. Inside the new Phase H, name the corrected research-query
   implementation explicitly: civic-atlas-server keeps its gRPC
   connection to Theseus (`theseus-client` stays in deps) AND the
   Index-API bridge_server.py file stays, BUT the handler is rewritten
   to bypass the harness `fractal_expansion` path and bypass
   `RustyRedCore-THG`. The corrected handler calls into Theseus's
   compose engine (or equivalent non-harness knowledge-graph search)
   and reads from Theseus's own knowledge-graph store (PostgreSQL +
   FAISS), not from THG. The RPC is renamed from `FractalExpansion` to
   a name that reflects the new behavior (`SearchKnowledge` or
   `ResearchSearch`, owner choice). The research-query path stays; its
   Theseus-side wrong layer (harness) and wrong store (THG) get
   replaced with the right ones (compose engine, Theseus's own
   knowledge-graph store).
5. Add an XRL-F-005a item promoting the Pascal adapter scope expansion
   (Opening generation, multi-side, multi-level, Ornament subtree,
   OpeningOverride round-trip) to a Phase 4 prerequisite, gating XRL-F-005
   (community correction UI). Reason: Phase 4 cannot ship community
   corrections at per-opening granularity until the adapter handles it.
6. Then resume task 46 and proceed through 47, 48, 49 against the patched
   plan.

This dominates Option A because the plan doc is the durable contract;
in-flight commits are temporary state. It dominates Option C because the
cross-repo plan is the file future sessions will read, not the Theorem
Brief.

★ Insight (architectural) ─────────────────────────
The interesting move here is not "what plan should we add"; it is that the
three-backend-path architecture (RustyRed for data, Ray Serve for ML
inference, Theseus bridge for research queries) is correct by separation of
concerns. RustyRed owns the hot-graph + spatial joins. Ray Serve owns the
GPU-backed Pairformer priors. Theseus owns gap-driven external knowledge
discovery. Each has a different SLA, a different consistency model, a
different deployment target. Conflating them was the mistake the user
caught. Naming them explicitly in the plan is the structural fix.
─────────────────────────────────────────────────

## Decisions Resolved

- Decision: Civic Atlas RustyRed is a separate deployment from Theseus's
  RustyRedCore-THG.
  - Rationale: Theseus's harness-bound graph is not for external consumers;
    multi-tenancy isolation requires per-project namespacing at the
    deployment level, not just at the key level.
  - Evidence: user statement 2026-05-22 plus the existing rustyred-client
    crate scaffold under `our-civic-atlas-backend/crates/rustyred-client/`.
  - Reversible? No, not after data lands. Reversible before then.
  - Should become ADR? Yes. Suggested location:
    `our-civic-atlas-backend/docs/adr/<n>-civic-atlas-rustyred-separate-deployment.md`.
- Decision: Civic Atlas backend keeps its gRPC connection to Theseus for
  the research-query path. `theseus-client` stays in
  `our-civic-atlas-backend/crates/civic-atlas-server`'s dependencies. The
  Index-API bridge_server.py file stays. BUT the bridge_server's
  `FractalExpansion` RPC and handler are removed: fractal expansion runs
  through the Theseus harness, which is the wrong layer for an external
  consumer; it also reads from `RustyRedCore-THG`, which is harness-bound
  and not exposed to external consumers. The replacement is a new
  bridge_server RPC (suggested name `SearchKnowledge` or `ResearchSearch`,
  owner choice) whose handler calls Theseus's compose engine (or
  equivalent non-harness knowledge-graph search) and reads from Theseus's
  own knowledge-graph store (PostgreSQL + FAISS), not from
  `RustyRedCore-THG`.
  - Rationale: the panel asks the broader Theseus knowledge graph
    questions about Flint history; that is intentionally Theseus-scoped.
    The harness path is the wrong abstraction (heavy stateful
    orchestration intended for Theseus's internal use); the THG store is
    the wrong target (harness-bound, not exposed to external consumers).
    The compose engine is the right layer because it is Theseus's
    documented external retrieval contract.
  - Evidence: `CivicResearchPanel.tsx:289` placeholder text "Research a
    place, person, era, or claim in Flint history." Current
    `Index-API/apps/notebook/grpc/bridge_server.py` handler calls into
    the harness `fractal_expansion` path. User correction 2026-05-22:
    "there should still be the grpc for Civic Atlas's backend to query
    Theseus for the search, it just shouldn't be fractal expansion
    through the harness, and it should not be using rustyredcore THG."
  - Reversible? Yes. Could repoint the new RPC at a different Theseus
    search backend if compose engine proves the wrong layer too.
  - Should become ADR? Yes, jointly with the civic-atlas RustyRed
    separate-deployment ADR.
- Decision: The Pascal adapter's deferred branches stay deferred for V1
  but graduate to Phase 4 prerequisites (XRL-F-005a).
  - Rationale: V1 launch buildings are single-level single-facade matching
    the current `HistoricalReconstruction` model; the deferred branches
    block community correction UX, not initial render.
  - Evidence: cross-repo plan Phase E goal language; adapter file
    line 1 scope note; HistoricalReconstruction data shape inspected above.
  - Reversible? Yes. If a V1 launch building turns out to need multi-side
    or multi-level rendering, the deferred branch graduates immediately.
  - Should become ADR? No. Captured in the cross-repo plan suffices.
- Decision: USD becomes the canonical publication format, but USD
  converter and scene composer stay Phase F.
  - Rationale: V1 ships on GLB for speed; USD is the durable archive.
  - Evidence: XRL-F-001, XRL-F-002.
  - Reversible? Yes; could promote if a Phase 8 use case appears earlier.
  - Should become ADR? Yes, jointly with the proto-rename ADR.
- Decision: Graph-LoRA stays Phase F until corrections accumulate.
  - Rationale: 10-shot evaluation requires 10 corrections per archetype;
    V1 has zero corrections.
  - Evidence: cross-repo plan XRL-F-003 reasoning.
  - Reversible? Yes; promote when corrections accumulate.
  - Should become ADR? No. Captured in the cross-repo plan suffices.

## Open Questions

Two open questions genuinely require user input:

1. Should Phase H land as a new top-level phase in
   `docs/plans/cross-repo-launch-plan-2026-05-20.md`, or should the four
   in-flight tasks (45 through 49) collapse into a revised Phase G
   subsection?
   - Recommended answer: separate Phase H. Reason: Phase G's scope is
     GraphQL contract migration; Phase H's scope is the data path
     deployment. Different problem, different acceptance, different
     observability surface. Keeping them separate makes future revision
     cleaner.

2. What is the right Theseus-side search backend for the new
   non-harness, non-THG bridge_server RPC?
   - Recommended answer: Theseus's compose engine (the retrieval layer
     used by `/ask/` endpoints), because it is Theseus's documented
     external retrieval contract and reads from Theseus's own
     knowledge-graph store (PostgreSQL + FAISS), not from
     `RustyRedCore-THG`.
   - Alternative: a new lightweight knowledge-graph search endpoint
     scoped to the Civic Atlas research use case, if compose engine's
     full pipeline (NER, SBERT, BM25, cross-encoder rerank) is heavier
     than the research panel needs.
   - User decision needed because this is the layer the user just
     surfaced in the 2026-05-22 correction. Owner: user, with input
     from the Theseus / Index-API side.

All other questions in the original prompt are answered by the work the
prior theorize pass already shipped, the proto inspection, the adapter
inspection, the cross-repo plan inspection, and the assumption analysis
above.

## Planning Inputs

These are concrete inputs to feed into `/planning-theorem` if the user
elects to convert this brief into a plan-doc patch:

1. Add Phase H section to
   `docs/plans/cross-repo-launch-plan-2026-05-20.md` after the Phase G
   section. Owner: `our-civic-atlas-backend` plus `Open-Flint-Atlas-main-release`.
   Items XRL-H-001 through XRL-H-005 mapping to tasks 45 through 49.
2. Revise XRL-G-002 acceptance language to route typed resolvers through
   civic-atlas RustyRed via rustyred-client rather than through the
   bridge. Keep XRL-G-001 unchanged; the research-query path stays as-is.
3. Patch
   `docs/plans/lane-4-strategic-seams/graphql-home-migration.md` to add a
   "Data Path vs Research-Query Path" section. Document the boundary.
4. Add XRL-F-005a (Pascal adapter scope expansion) to Phase F of the
   cross-repo plan as a prerequisite for XRL-F-005.
5. Write the two suggested ADRs:
   `our-civic-atlas-backend/docs/adr/<n>-civic-atlas-rustyred-separate-deployment.md`
   and the joint proto-rename + USD-archive ADR.
6. Resume task 46 (rustyred-client crate workspace member registration in
   the root `Cargo.toml`) after the doc patch lands.

## What This Brief Does NOT Do

- Does not write a plan. The plan patch follows from this brief once the
  user approves the recommended direction.
- Does not re-derive what the 2026-05-20 theorize pass produced. Those
  decisions are landed and the artifacts are in the repo.
- Does not estimate when any of the open work ships. Per project posture.
- Does not silently widen V1 scope. Every promotion above (XRL-F-005a) is
  surfaced individually with a one-sentence justification.

## Epistemic Ledger

| Primitive | Entry | Confidence |
|---|---|---|
| Claim | The 2026-05-20 theorize pass already represented the three Anthropic-doc strategic decisions in the catchup plan. | high |
| Claim | The cross-repo plan's Phase G section as written conflates the data path and the research-query path. The corrected architecture splits them. | high |
| Claim | The Pascal adapter slice is sufficient for V1 launch (XRL-E-001) but blocks Phase 4 community correction at per-opening granularity. | high |
| Claim | The user's launch goal requires Phase A done (it is), plus Phase B, C, D fully shipped (none of which are done at V1 quality). | high |
| Tension | The in-flight code commits for tasks 45 through 49 will land before any plan-doc patch unless one is written now. | medium |
| Gap | The deployment target for civic-atlas RustyRed is currently assumed to be Railway. If the user moves it to RunPod or another target, configuration changes but the boundary decision stands. | low (low-impact gap) |
| Decision | civic-atlas RustyRed is a separate deployment from Theseus's RustyRedCore-THG; bridge_server narrows to research-query only. | high |
