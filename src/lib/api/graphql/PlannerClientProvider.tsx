"use client";

/**
 * Client-side urql provider for the Porchfest Planner.
 *
 * Phase 1 fetched all planner data server-side; Phase 2's mutations
 * + SSE-driven refetch need a live urql client in the browser. This
 * provider mounts that client once at the top of PlannerClient so
 * every component inside can call useQuery / useMutation directly.
 *
 * Endpoint: the Axum civic-atlas-server's native GraphQL listener
 * (default http://127.0.0.1:4001/graphql in local dev), the same
 * boundary the server-side read client in `client.ts` talks to.
 * Production overrides via NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL.
 *
 * Historical: an earlier slice routed browser writes through a Node
 * graphql-server sidecar on :4010 that issued an HttpOnly session
 * cookie (so this provider sent `credentials: "include"`). That
 * sidecar was removed; the Axum service implements the same schema
 * natively. We now match the read client exactly: no credentials,
 * no service-tier token in the browser (service-tier auth stays
 * server-side per CLAUDE.md / AGENTS.md).
 */

import { useMemo, type ReactNode } from "react";
import {
  Client,
  Provider as UrqlProvider,
  cacheExchange,
  fetchExchange,
} from "urql";

import { resolveBrowserGraphqlEndpoint } from "./endpoints";

function endpoint(): string {
  return resolveBrowserGraphqlEndpoint();
}

export function PlannerClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new Client({
        url: endpoint(),
        exchanges: [cacheExchange, fetchExchange],
        fetchOptions: () => ({
          headers: { "content-type": "application/json" },
        }),
        requestPolicy: "cache-and-network",
      }),
    [],
  );

  return <UrqlProvider value={client}>{children}</UrqlProvider>;
}
