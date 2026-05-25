/**
 * Civic Atlas GraphQL client.
 *
 * Talks directly to the Axum civic-atlas-server's native GraphQL
 * endpoint. No Node sidecar in the middle.
 *
 * Default endpoint is http://127.0.0.1:4001/graphql, which is where
 * the Axum service binds its HTTP listener in local dev (see
 * crates/civic-atlas-server/src/main.rs in our-civic-atlas-backend).
 * Production endpoints override via NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL.
 *
 * Architecture in effect (post-sidecar-removal):
 *
 *   Frontend urql GraphQL
 *     -> Axum civic-atlas-server (native async-graphql)
 *        -> internal Rust services (in-process gRPC handlers for
 *           ReconstructionService, CivicAtlasService, etc.)
 *           -> Postgres / PostGIS via sqlx
 *           -> Theseus harness via the bridge URL for civic research
 *
 * The frontend deployment ships no Theseus tokens, no service-tier
 * credentials of any kind. All such auth lives on the Axum process
 * per the project's "Service-Tier Auth Stays Server-Side" rule
 * (CLAUDE.md / AGENTS.md). The browser only ever sees what GraphQL
 * exposes.
 *
 * Override the endpoint per environment:
 *   - NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL: production URL of the
 *     deployed Axum service (Railway, etc.).
 *   - CIVIC_ATLAS_GRAPHQL_URL: server-side equivalent for RSC + Route
 *     Handler contexts.
 *
 * Historical: an earlier slice routed traffic through a Node
 * graphql-server sidecar at port 4010 (apps/graphql-server in the
 * backend repo). That sidecar was a transitional BFF that let the
 * Rust backend stabilize while keeping the GraphQL contract intact.
 * Once both sides matured the sidecar became a deployable we did
 * not need; the Axum service implements the same schema natively
 * via async-graphql.
 *
 * Field selection happens at the operation level (see
 * `queries/*.graphql`). The schema at
 * `docs/design/flint-graphql-schema-v1.graphql` is the contract.
 * Off-schema content is not requestable and never returned.
 *
 * Two flavors:
 *   - createTheseusClient(): one-shot Client, use in server-side
 *     route handlers and RSC contexts.
 *   - registerUrqlClient/withUrqlClient via @urql/next for
 *     client-side React hooks (added when the first hook consumer
 *     ships).
 */

import { Client, cacheExchange, fetchExchange } from "urql";

const DEFAULT_ENDPOINT = "http://127.0.0.1:4001/graphql";

function getEndpoint(): string {
  return (
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL ??
    process.env.CIVIC_ATLAS_GRAPHQL_URL ??
    DEFAULT_ENDPOINT
  );
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.THESEUS_AUTH_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

let _client: Client | null = null;

/**
 * Lazy singleton client. Server-side use only. Browser side should use
 * @urql/next's `useClient` once the provider is wired into the app shell.
 */
export function getTheseusClient(): Client {
  if (!_client) {
    _client = new Client({
      url: getEndpoint(),
      exchanges: [cacheExchange, fetchExchange],
      fetchOptions: () => ({
        headers: {
          "content-type": "application/json",
          ...getAuthHeaders(),
        },
      }),
      requestPolicy: "cache-and-network",
    });
  }
  return _client;
}

/**
 * Reset the singleton. Useful in tests or when the env var changes mid-run.
 */
export function resetTheseusClient(): void {
  _client = null;
}
