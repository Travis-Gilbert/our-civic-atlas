# Coordination Note: GraphQL Home Migration

To: Codex (and anyone working in `Index-API`, `our-civic-atlas-backend`, or `Open-Flint-Atlas-main-release`)
From: 2026-05-22 orchestrate run in `Open-Flint-Atlas-main-release`
Status: foundation landed (civicResearch end-to-end); full schema port + transport hardening open

## Why this note exists

The Civic Atlas GraphQL contract was previously hosted as a scaffold on
Theseus (`Index-API/apps/open_flint_atlas_graphql/`, Strawberry, 540 lines
of stubbed resolvers). The frontend hit Theseus's URL directly. That was
the same anti-pattern named by the project's "Service-Tier Auth Stays
Server-Side" CLAUDE.md rule: the frontend was talking directly to an
upstream service tier (Theseus) instead of going through the canonical
Civic Atlas backend.

The canonical wiring (also from CLAUDE.md):

```
Browser (Civic Atlas frontend)
  + GraphQL (urql)
Node sidecar (apps/graphql-server, port 4010)
  + gRPC (currently JSON-over-HTTP to tonic-web; native gRPC pending)
Rust Axum (civic-atlas-server, port 4001)
  + gRPC (native, tonic)
Theseus bridge_server.py (Index-API, port 50061)
  + in-process Python
Theseus internal services (search_kernel, harness, embeddings)
```

This note captures the migration that moved the GraphQL surface off
Theseus and onto the sidecar + Axum chain, and names the work still
open.

## What this 2026-05-22 run landed

### Proto contracts

- Added `FractalExpansion` RPC to
  `our-civic-atlas-backend/proto/theseus_bridge/v1/bridge.proto`.
  Request carries TenantContext + query + JSON budget/scope + optional
  session/folio. Response carries run_id + skill + results_json (a JSON
  string matching the public `SearchResults` GraphQL type so the sidecar
  passes it through unchanged).
- Added `CivicResearch` RPC to
  `our-civic-atlas-backend/proto/civic_atlas/v1/civic_atlas.proto`.
  Mirrors the FractalExpansion shape but exposes Axum's outward face
  for the Node sidecar; lets Axum decorate the response with civic
  data (geometry hydration, RustyRed augmentation) before returning.

### Theseus side (Index-API)

- `apps/notebook/grpc/bridge_server.py` extended with
  `TheseusBridgeAdapter.fractal_expansion` + the matching
  `TheseusBridgeService.FractalExpansion` gRPC method. The adapter
  opens a harness run via `apps.orchestrate.api.harness._harness()`,
  calls `run_search` with the fractal_expansion scope, normalizes the
  harness `SearchResult` into the public `SearchResults` JSON shape.
- `apps/open_flint_atlas_graphql/` deleted entirely. URL mount removed
  from `config/urls.py`. App removed from `INSTALLED_APPS` in
  `config/settings.py`. Comments left in both files documenting the
  migration.

### Rust Axum side (`our-civic-atlas-backend`)

- `crates/civic-atlas-server/Cargo.toml` gains a `theseus-client`
  workspace dependency.
- `crates/civic-atlas-server/src/lib.rs` implements
  `CivicAtlasService::civic_research`: requires TenantContext,
  reads `THESEUS_BRIDGE_URL` env var, dials the bridge on demand,
  calls `TheseusBridgeClient::fractal_expansion`, returns the
  response. Failure modes: `Status::unauthenticated` (no tenant),
  `Status::unavailable` (env unset or bridge unreachable),
  `Status::internal` (bridge returned an error).
- Connection model is dial-per-call. The expected call volume (one
  per user research query) makes the dial cost acceptable for V1.
  Hold a long-lived `TheseusClient` on `AtlasState` when volume
  grows.

### Node sidecar (`our-civic-atlas-backend/apps/graphql-server`)

- `src/grpcClient.ts` gains a `civicResearch(tenant, input)` method
  matching the existing `listPlaces` JSON-over-HTTP pattern.
- `src/schema.ts` gains: scalar JSON / DateTime / GeoJSON / LatLng;
  `TimeRange`, `SearchResults`, `CivicResearchInput`,
  `CivicResearchPayload` types; `Mutation.civicResearch` resolver
  that parses Axum's `resultsJson` into the SearchResults shape
  before returning to the browser.

### Frontend (`Open-Flint-Atlas-main-release`)

- `src/lib/api/graphql/client.ts` default endpoint changed from
  the (now-deleted) Theseus Strawberry path to
  `http://127.0.0.1:4010/graphql`. Override via
  `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`.
- The frontend's `CivicResearchPanel` is unchanged; its urql
  mutation now reaches the sidecar instead of the deleted stub.

## What's still open (post-foundation work)

### Schema completion

The Node sidecar now implements `civicResearch` plus `placesList` plus
`health`. The full
`Open-Flint-Atlas-main-release/docs/design/flint-graphql-schema-v1.graphql`
contract includes ~30 types and ~12 query/mutation fields. Each needs:

1. A typedef block in `apps/graphql-server/src/schema.ts`.
2. A resolver wired to the appropriate Axum RPC.
3. An Axum RPC (in `civic_atlas.proto` or a sibling) backing it.
4. A Theseus bridge RPC if the resolver needs harness data.

Items still missing on the sidecar: `searchAtlas` query,
`Mutation.submitObservation`, `manifest`, `places(id)`, `events`,
`signals`, `sources`, `provenance`, `historicalReconstructions`,
`atlasNode`, `nodeCatalog`, `dossier`, and the supporting types
(`Place`, `Source`, `Signal`, `SpatialEvent`,
`HistoricalReconstruction`, `Provenance*`, `Dossier*`,
`ContributionReceipt`).

### Transport hardening (sidecar to Axum)

The sidecar currently POSTs JSON to `tonic-web` URLs on Axum
(`/civic_atlas.v1.CivicAtlasService/CivicResearch`). That's a
gRPC-Web JSON simulation, not native gRPC. The two reasonable next
moves:

- **Native gRPC**: switch the sidecar to `@grpc/grpc-js` or
  `nice-grpc`, drop `tonic-web` from Axum, gain real protobuf wire
  format and HTTP/2 multiplexing. Requires proto codegen for
  TypeScript.
- **Connect protocol**: use `@connectrpc/connect-node` against
  Axum's tonic-web endpoint. Cleaner client API than hand-rolled
  fetch. Requires `buf generate` setup for the sidecar.

Either is fine; pick when the transport's overhead becomes
measurable. JSON-over-HTTP works for the expected call volume.

### Theseus bridge deployment

`bridge_server.py` runs as `python -m apps.notebook.grpc.bridge_server`.
No Dockerfile, no Railway config, no Procfile entry. To make
`civicResearch` work end-to-end, Index-API needs a second deployable
service (or a second process in the existing image). The Axum side
needs `THESEUS_BRIDGE_URL` pointed at it.

### Frontend env

After the bridge is deployed, set:

- `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL` on Vercel pointing at the
  sidecar's production URL.
- `CIVIC_ATLAS_GRPC_WEB_URL` on the sidecar pointing at Axum's
  production URL.
- `THESEUS_BRIDGE_URL` on Axum pointing at the bridge's gRPC port.

## Auth and tenancy

- Frontend deployment ships no Theseus token. Confirmed.
- `TenantContext` flows from sidecar to Axum to bridge_server on every
  call. Axum's resolver rejects requests without TenantContext via
  `Status::unauthenticated`.
- Multi-tenancy invariant (per CLAUDE.md): every harness run is
  tenant-scoped via the `scope` parameter the bridge passes.

## Relationship to existing coordination notes

This note supersedes the narrow
`civic-research-graphql-coordination.md` from 2026-05-22 morning.
That earlier note described what the backend needed in order for
the frontend's `civicResearch` mutation to work. The implementation
landed in this run; the architecture is broader than that single
mutation. Keep the earlier note for historical context.

## XRL items

This work corresponds to a new XRL phase G added to
`docs/plans/cross-repo-launch-plan-2026-05-20.md`. Specifically:

- **XRL-G-001** (done): Foundation. `civicResearch` end-to-end
  (proto contracts + bridge resolver + Axum impl + sidecar
  resolver + frontend env flip + Strawberry deletion).
- **XRL-G-002** (open): Full schema port. Implement remaining
  ~25 types and ~10 fields on the sidecar.
- **XRL-G-003** (open): Transport hardening. Native gRPC or
  Connect on the sidecar to Axum hop.
- **XRL-G-004** (open): Theseus bridge deployment.
  Dockerize / Railway-ize bridge_server.py.

## Mirroring

This note should be mirrored into:

- `our-civic-atlas-backend/docs/orchestrate/graphql-home-migration.md`
- `Index-API/docs/plans/civic-atlas-graphql-home-migration.md` (optional)

Mirror with the additive frontmatter pattern from the proto-USD
parity-audit mirror (`mirror_note`, `mirrored_from_commit`,
`mirrored_on`) so provenance stays trackable.
