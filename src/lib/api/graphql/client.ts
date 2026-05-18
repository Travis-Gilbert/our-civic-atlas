/**
 * Civic Atlas GraphQL client.
 *
 * Talks to the Theseus Strawberry endpoint at
 *   $THESEUS_GRAPHQL_URL (default: Railway production)
 *
 * Field selection happens at the operation level — see `queries/*.graphql`.
 * The schema at `docs/design/flint-graphql-schema-v1.graphql` is the contract.
 * Off-schema content is not requestable and never returned.
 *
 * Two flavors:
 *   - createTheseusClient(): one-shot Client, use in server-side route
 *     handlers and RSC contexts.
 *   - registerUrqlClient/withUrqlClient via @urql/next for client-side
 *     React hooks (added when the first hook consumer ships).
 */

import { Client, cacheExchange, fetchExchange } from "urql";

const DEFAULT_ENDPOINT =
  "https://index-api-production-a5f7.up.railway.app/api/graphql/open-flint-atlas";

function getEndpoint(): string {
  return (
    process.env.NEXT_PUBLIC_THESEUS_GRAPHQL_URL ??
    process.env.THESEUS_GRAPHQL_URL ??
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
 * Reset the singleton — useful in tests or when the env var changes mid-run.
 */
export function resetTheseusClient(): void {
  _client = null;
}
