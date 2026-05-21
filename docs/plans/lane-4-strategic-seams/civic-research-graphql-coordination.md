# Coordination Note: civicResearch GraphQL Mutation

To: Codex, working in `our-civic-atlas-backend` (Axum + theseus-client + GraphQL surface)
From: 2026-05-21 visual-iteration session in `Open-Flint-Atlas-main-release`
Status: frontend contract landed; backend resolver + gRPC bridge open

## Why this note exists

The 2026-05-21 visual iteration session named the gap-driven research tool
as the highest-benefit design layer. A first wiring attempt put a Next.js
route handler inside the frontend deployment that authenticated directly to
the Theseus harness with a `THESEUS_API_TOKEN` env var. That route was
deleted because it inverted the project's multi-tenancy invariant: every
public visitor's request would hit Theseus under the same shared frontend
account, with no `TenantContext` enforcement.

The canonical wiring is:

```
  Theseus harness (Index-API, Strawberry)
    +-- gRPC bridge (`theseus-client` crate in our-civic-atlas-backend)
        +-- Axum civic-atlas-server GraphQL resolver
            +-- GraphQL response to the Civic Atlas frontend
                +-- urql mutation in CivicResearchPanel
```

The frontend talks GraphQL only. Auth and `TenantContext` are owned by the
Axum service. The frontend deployment ships no Theseus token.

## What the frontend now ships

| Artifact | Path | Purpose |
|---|---|---|
| Schema | `docs/design/flint-graphql-schema-v1.graphql` | Adds `input CivicResearchInput`, `type CivicResearchPayload`, and `Mutation.civicResearch`. SearchResults reused as the evidence return shape so injection into existing state is trivial. |
| Operation | `src/lib/api/graphql/queries/civic-research.graphql` | The mutation field selection matches the existing `SearchAtlas` query. |
| Panel | `src/components/atlas/CivicResearchPanel.tsx` | Atlas chrome surface (left side, below Layers card). Fires the mutation via `getTheseusClient().mutation(...)`. Honest "backend resolver pending" state until the resolver lands. |

The frontend currently routes the mutation to the GraphQL endpoint named by
`NEXT_PUBLIC_THESEUS_GRAPHQL_URL` (default: the Strawberry endpoint on
Railway). When `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_PATH=node-sidecar` is set,
it routes to the Node sidecar instead. Either endpoint must implement the
mutation before the panel can return real data.

## What this asks the backend to land

### 1. GraphQL resolver

Where: the active civic-atlas-backend GraphQL surface (the Strawberry
endpoint today; the Node sidecar after XRL-D-001 cutover).

Signature (TypeScript / Strawberry Python pseudo-mix; Codex picks the real
binding):

```
civicResearch(input: CivicResearchInput!) -> CivicResearchPayload
```

Resolver responsibilities:

1. Extract `TenantContext` from the request (Axum middleware should already
   place it on the request extensions).
2. Open a Theseus harness run scoped to the tenant via the gRPC bridge.
3. Invoke `fractal_expansion` on that run with `query` + `budget` + `scope`
   (carrying through `session_id` and `folio_id` when supplied).
4. Receive the harness `SearchResult`.
5. Map the harness result into the public `SearchResults` GraphQL type.
   The harness emits richer fields than the contract exposes; map only
   what's already in `SearchResults`. Future versions of the contract can
   extend the type; do not silently leak harness internals here.
6. Return `CivicResearchPayload { runId, skill, results }`.

Errors:

- Auth failure to Theseus -> GraphQL `Error` with code
  `THESEUS_AUTH_FAILED`. The frontend surfaces this as a network-style
  error.
- Harness budget exceeded -> GraphQL `Error` with code
  `THESEUS_BUDGET_EXCEEDED`. Frontend surfaces the message verbatim.
- Harness backend unreachable -> GraphQL `Error` with code
  `THESEUS_UNAVAILABLE`. Frontend surfaces as network-style error.
- Resolver not yet implemented -> the existing default Strawberry behavior
  ("Cannot query field civicResearch on type Mutation") is acceptable; the
  frontend already recognizes that shape and renders the coordination-aware
  "pending" empty state.

### 2. gRPC client additions (`crates/theseus-client`)

The Theseus harness already exposes a REST surface at:

```
POST /api/v2/theseus/harness/runs/                   -> open a run
POST /api/v2/theseus/harness/runs/{run_id}/fractal-expansion/  -> run the skill
```

The `theseus-client` crate should expose two new typed methods:

```rust
impl TheseusClient {
    pub async fn open_harness_run(
        &self,
        tenant: &TenantContext,
        task: &str,
        scope: serde_json::Value,
    ) -> Result<HarnessRun, ClientError>;

    pub async fn fractal_expansion(
        &self,
        tenant: &TenantContext,
        run_id: &str,
        query: &str,
        budget: serde_json::Value,
        scope: serde_json::Value,
        session_id: Option<&str>,
        folio_id: Option<&str>,
    ) -> Result<SearchResult, ClientError>;
}
```

Open question: the Theseus harness today is REST-only. The user's intent is
a gRPC bridge. Two paths:

- **Path A (REST-now)**: implement these methods over the existing REST
  endpoints, with the credential held in a server-side secret (e.g.,
  `THESEUS_SERVICE_TOKEN`). Migrate to gRPC when Theseus exposes one.
- **Path B (gRPC-first)**: extend Theseus to emit a gRPC server for harness
  routes before wiring the resolver. Larger blast radius, longer lead time.

Recommend **Path A** for V1, with a note in this file when Path B lands.
Whichever Codex picks, the public GraphQL contract is unchanged.

### 3. Tenant model

Each call must carry `TenantContext`. Two surfaces care:

- The harness run's `scope` should record `tenant_id` so any harness-side
  caching, federation, or trail attribution is tenant-scoped.
- If Theseus eventually returns artifacts that live in shared corpora
  (e.g., Sanborn maps), the resolver should NOT cross-tenant-leak; it
  scopes the response to the caller's tenant unless the artifact is
  explicitly marked public.

The Flint launch is single-tenant, but the invariant must hold from day
one per project posture. The XRL-E-002 multi-tenant smoke depends on this.

### 4. Auth model

- Theseus harness credential lives in a backend-only secret store (e.g.,
  `THESEUS_SERVICE_TOKEN` in Railway/RunPod, never exposed to the frontend
  bundle).
- The frontend's urql client carries no Theseus token. The GraphQL
  endpoint may carry frontend-side cookies / origin checks; that is
  unchanged by this note.
- The Axum resolver attaches the service credential to the gRPC (or REST)
  call to Theseus.

## Acceptance criteria

Codex's work is done when:

1. `cargo check --workspace` and `cargo test` pass with the two new
   `theseus-client` methods.
2. A GraphQL mutation `civicResearch` is reachable on whichever endpoint
   `NEXT_PUBLIC_THESEUS_GRAPHQL_URL` (or `NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL`,
   depending on the feature flag) points at.
3. The resolver opens a real harness run when called against a configured
   Theseus instance.
4. The resolver returns a normalized `SearchResults` payload; the frontend
   panel's `ResultPreview` renders the JSON without manual remapping.
5. The resolver returns a structured error (not a 500) when the harness is
   unreachable; the frontend panel surfaces the message under
   `statusLine`'s graphql-error branch.
6. A unit test (Rust side) confirms a happy-path call against a mocked
   Theseus REST surface.
7. An integration test (frontend + backend) round-trips a Carriage Town
   research query end-to-end. Test docstring should name the smoke
   command and the expected place / event / source counts.

## What this note does not do

- Does not freeze the GraphQL field shape. The mutation can grow (e.g.,
  to expose harness `event_log` or partial-progress streaming) in
  contract v2; landing it as `civicResearch` v1 is enough for the
  highest-benefit design layer.
- Does not specify the Theseus-side gRPC server contract. That belongs in
  a separate Theseus / Index-API plan when Path B above is picked.
- Does not specify the result-injection step on the frontend (parsing
  `SearchResults` -> live atlas state). That is a follow-on iteration in
  the frontend repo once the resolver returns real data; the panel
  currently renders a JSON preview as a stand-in.

## Reciprocal artifact

When the resolver lands, the frontend follow-on is:

1. Replace `ResultPreview`'s JSON dump with typed renderings (place cards,
   event timeline rows, source thumbnails).
2. Wire result injection into the existing atlas state hooks
   (`useHistoricalReconstructions`, `placesList` consumer, events store)
   so the map updates live when a query returns.
3. Add a session-scoped pending-research card on the dynamic island so
   long-running fractal-expansion jobs are visible.

## Where this note belongs

Mirror this file into:

- `our-civic-atlas-backend/docs/orchestrate/civic-research-graphql-coordination.md`
- `Index-API/docs/plans/theseus-harness-civic-bridge/civic-research-graphql-coordination.md` (optional)

The mirror keeps the same content; the additive frontmatter pattern from
the proto-USD parity-audit mirror (`mirror_note`, `mirrored_from_commit`,
`mirrored_on`) is the canonical way to track provenance.
