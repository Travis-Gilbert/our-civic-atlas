"use client";

/**
 * Client-side urql provider for the Porchfest Planner.
 *
 * Phase 1 fetched all planner data server-side; Phase 2's mutations
 * + SSE-driven refetch need a live urql client in the browser. This
 * provider mounts that client once at the top of PlannerClient so
 * every component inside can call useQuery / useMutation directly.
 *
 * The client uses `credentials: "include"` because the GraphQL
 * sidecar issues an HttpOnly session cookie on its own origin
 * (porchfest_planner_session). Without credentials:include, the
 * cookie wouldn't ride along on the cross-origin fetch in dev where
 * the sidecar lives on :4010 and the planner on :3000.
 */

import { useMemo, type ReactNode } from "react";
import {
  Client,
  Provider as UrqlProvider,
  cacheExchange,
  fetchExchange,
} from "urql";

const DEFAULT_ENDPOINT = "http://127.0.0.1:4010/graphql";

function endpoint(): string {
  return (
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL ?? DEFAULT_ENDPOINT
  );
}

export function PlannerClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new Client({
        url: endpoint(),
        exchanges: [cacheExchange, fetchExchange],
        fetchOptions: () => ({
          credentials: "include",
          headers: { "content-type": "application/json" },
        }),
        requestPolicy: "cache-and-network",
      }),
    [],
  );

  return <UrqlProvider value={client}>{children}</UrqlProvider>;
}
