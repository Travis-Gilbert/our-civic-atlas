# Civic Atlas native search + epistemics via RustyRed gRPC (version bump)

Harness plan (plan mode). Grounded in the live RustyRed-Graph-Database,
Theorem, and our-civic-atlas-backend working trees on 2026-05-30. No Codex
coordination required (per user: this is a skill/plan task).

## The move

Stop routing Civic Atlas search/epistemics through the Theseus Django bridge.
Instead, version-bump the Civic-Atlas RustyRed to the new standalone
RustyRed-Graph-Database (which is now a graph + vector + fulltext + spatial +
epistemic + graph-algorithm engine with a native gRPC surface, plus Dolt /
Prolly-tree / Git versioning), and point `civic-atlas-server` at it directly.
The Django bridge (and `THESEUS_BRIDGE_URL`) become unnecessary for search.

## Current state (grounded)

- RustyRed-Graph-Database (github.com/Travis-Gilbert/RustyRed-Graph-Database,
  main) exposes two gRPC services:
  - `rustyred.v1.GraphDatabase`: Query/Cypher, node/edge CRUD, bulk insert,
    `VectorSearch`/`VectorHybridSearch`, `FulltextSearch` (Tantivy, see
    `rustyred-core/src/fulltext_tantivy.rs`), `SpatialRadius` /
    `SpatialBoundingBox`, `EpistemicNeighbors`, `PersonalizedPageRank` /
    `PageRank` / `ConnectedComponents` / `Communities`, GraphStats/Verify,
    cache RPCs.
  - `theseus_search.v1.SearchService`: `Search`, `GapWalk`, `SourcePair`,
    `Provenance`. `SearchRequest` carries `query`, `mode`
    (`SEARCH_MODE_CIVIC_ATLAS = 4`), `bbox`, `time_range`, `min_confidence`,
    `source_pair`, `top_k`. `SearchResponse` carries `prior_knowledge`,
    `new_evidence`, `gap_closures`, `provenance_root_id`.
  - Transport: `rustyred-server/src/main.rs` merges gRPC routes into the axum
    HTTP router on ONE `TcpListener` (tonic 0.12 content-type routing). One
    public port serves HTTP + gRPC, so Railway's HTTP proxy is sufficient (no
    special gRPC edge config).
- Theorem (github.com/Travis-Gilbert/theorem, main) vendors `rustyredcore_THG`
  and adds open-web substrate search (`rustyredcore_THG/crates/rustyred-web/src/search.rs`,
  `src/search_kernel.rs`; latest commit `feat(rustyweb): add open-web substrate
  search`). Theorem is where open-web acquisition + the symbolic engines live on
  top of the RustyRed core.
- `civic-atlas-server` (`crates/civic-atlas-server/src/lib.rs:261`) `civicResearch`
  resolver currently `TheseusClient::connect(THESEUS_BRIDGE_URL)` then calls
  `theseus_search.v1.SearchService` through the Django bridge. Response metadata
  already declares `"substrate":"rustyred"`, `"searchService":"theseus_search.v1.SearchService"`.
- `theseus-client` crate already holds a `SearchServiceClient<Channel>` (not just
  the bridge client). `rustyred-client` currently wraps only `health` +
  `graph_vector_hybrid` (`crates/rustyred-client/src/lib.rs:163,183`).
- The Civic-Atlas Railway project runs a `RustyRed` service
  (`rustyred-production.up.railway.app`); the backend already has `RUSTYRED_URL`,
  `RUSTYRED_API_TOKEN`, `RUSTYRED_CIVIC_ATLAS_TENANT=flint`.

## Why this is the right seam

- Same contract, native implementation: civic-atlas-server already speaks
  `theseus_search.v1.SearchService`; RustyRed now implements it in Rust. The
  bridge was a Django process that proxied to RustyRed-over-HTTP anyway.
- `bbox` + `time_range` in `SearchRequest` map 1:1 to the Atlas map viewport +
  the timeline year filter. `kind: "place"` results + `SpatialRadius`/`BoundingBox`
  on GraphDatabase give native geographic search.
- `SearchService.SourcePair` + `SEARCH_MODE_CIVIC_ATLAS` are the acquisition
  engine that fetches evidence (sources/photos/Sanborn) for a parcel+year. That
  is the same pipeline that feeds reconstruction attributes (the data + OCR
  lever): search fetches sources, OCR/ingestion turns them into attributes.
- The version bump also brings graph versioning (Dolt / Prolly-tree / Git;
  RustyRed exposes `graph_version_compile/diff/checkout/log/merge/ref`). For a
  civic-truth tool that is an audit trail + time-travel + scenario branching over
  the reconstruction graph.

## Checklist

| ID | Task | Grounding | Acceptance | Risk |
|---|---|---|---|---|
| RR-1 | Version-bump the Civic-Atlas `RustyRed` Railway service to RustyRed-Graph-Database main (SearchService + GraphDatabase + Dolt/Prolly/Git, one HTTP+gRPC port) | Civic-Atlas project `RustyRed` svc; `rustyred-server/main.rs` | `rustyred-production` serves `GraphDatabase.Health` + `SearchService` over gRPC; graph-version RPCs answer | data/schema migration on version bump; confirm snapshot compatibility (recent commits: "tolerate orphan edges in snapshots/recovery") |
| RR-2 | Repoint `civicResearch`: connect the `SearchServiceClient` to `RUSTYRED_URL` (not `THESEUS_BRIDGE_URL`); call `Search(mode=CIVIC_ATLAS, query, bbox, time_range)` | `civic-atlas-server/src/lib.rs:261-276`; `theseus-client` has `SearchServiceClient` | `civicResearch` returns real `prior_knowledge`+`new_evidence`+`gap_closures` from RustyRed; bridge no longer called | auth: pass `RUSTYRED_API_TOKEN` + tenant on the gRPC metadata |
| RR-3 | Retire `THESEUS_BRIDGE_URL` + the Django bridge dependency for search (keep the graceful `unavailable` if RustyRed is down) | task #9 (now obsoleted by this path) | `THESEUS_BRIDGE_URL` unset and `civicResearch` still works; no `bridge_server.py` deploy needed | none (this removes the cross-project bridge problem) |
| RR-4 | Extend `rustyred-client` to wrap `SearchService` (Search/GapWalk/SourcePair/Provenance) + GraphDatabase `SpatialRadius`/`SpatialBoundingBox`/`FulltextSearch`/`EpistemicNeighbors` | `rustyred-client/src/lib.rs` (only health+vector today) | typed client methods exist + unit-tested against a RustyRed instance | proto/codegen wiring in the crate |
| RR-5 | Native Atlas search surfaces: search box -> `Search` with `bbox` from map viewport + `time_range` from timeline; geo lookups -> `SpatialRadius`/`BoundingBox`; expose `gap_closures` + `Provenance` as the "shows its work" UI | frontend GraphQL + `SearchService`/`GraphDatabase` | a query in the live Atlas returns spatial+temporal-scoped results with provenance; no demo route | GraphQL field design for search results |
| RR-6 | Acquisition -> attributes: use `SourcePair`/`CIVIC_ATLAS` results as the evidence feed into the reconstruction OCR/ingestion (Phase 3 of the wiring plan) | `../reconstruction-wiring-and-engine/implementation-plan.md` | a parcel+year search yields sources that OCR turns into real `material/bays/use` attributes | depends on the OCR pipeline (separate plan) |
| RR-7 | (Optional) Graph versioning surface: expose Dolt/Prolly/Git versioning for reconstruction audit-trail + scenario branches | RustyRed `graph_version_*` RPCs | a reconstruction edit is diffable/branchable in the graph | scope; later phase |

## Sequence

RR-1 (version bump) -> RR-2 (repoint civicResearch) -> RR-3 (retire bridge) is the
critical path that makes civic-research real with zero Django bridge. RR-4/RR-5
turn the same engine into the Atlas's native search. RR-6 ties search to the
reconstruction-data lever. RR-7 is later.

## Supersedes

- `THESEUS_BRIDGE_URL` (task #9) and the `bridge_server.py` deploy
  (`docs/plans/.../the Theseus Django bridge`): not needed. RustyRed implements
  `theseus_search.v1.SearchService` natively; civic-atlas-server points at it.
- Folds into `../reconstruction-wiring-and-engine/implementation-plan.md` Phase 2
  (good data) and Phase 3 (OCR): SearchService is the acquisition engine.
