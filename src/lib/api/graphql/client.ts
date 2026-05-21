/**
 * Civic Atlas GraphQL client.
 *
 * Talks to the browser-facing Civic Atlas GraphQL endpoint.
 *
 * Default endpoint is the Node sidecar (`apps/graphql-server` in
 * `our-civic-atlas-backend`) at http://127.0.0.1:4010/graphql. The
 * sidecar speaks GraphQL outward and gRPC (JSON-over-HTTP today,
 * native gRPC after the transport migration lands) inward to the
 * Rust Axum service, which holds the only credentials for Theseus.
 *
 * The frontend deployment ships no Theseus tokens. All service-tier
 * auth lives on the Axum service per the project's "Service-Tier
 * Auth Stays Server-Side" rule.
 *
 * Override the endpoint per environment:
 *   - NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL: production URL of the
 *     sidecar / future Axum-native GraphQL surface.
 *   - CIVIC_ATLAS_GRAPHQL_URL: server-side equivalent (RSC + Route
 *     Handler contexts).
 *
 * Historical: the previous default pointed at a Strawberry-based
 * scaffold mounted on Theseus (Index-API) at
 * /api/graphql/open-flint-atlas. That scaffold has been deleted; the
 * canonical home for the GraphQL contract is the Node sidecar +
 * Axum stack in `our-civic-atlas-backend`. The Strawberry path no
 * longer exists in Theseus.
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

const DEFAULT_ENDPOINT = "http://127.0.0.1:4010/graphql";

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
