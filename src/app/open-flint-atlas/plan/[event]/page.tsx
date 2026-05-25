/**
 * Porchfest Planner Phase 1 — read-only event layer page.
 *
 * Server component. Resolves the URL `[event]` slug against the
 * `eventLayers` query, validates the layer exists, and hands the
 * layer plus a flattened placements list to the client wrapper for
 * deck.gl rendering.
 *
 * Phase 1 fetches both queries server-side and passes them in as
 * props. That keeps the client bundle small and skips the
 * @urql/next provider setup, which Phase 2 will add when drag-to-
 * place editing arrives. The data is static per request so a
 * server fetch is the right shape today.
 */

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  EventLayersDocument,
  EventPlacementsDocument,
  EventTasksListDocument,
  type EventLayersQuery,
  type EventPlacementsQuery,
  type EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";
import { PlannerClient } from "./PlannerClient";

interface PlanPageParams {
  readonly event: string;
}

// Tenant slug is fixed to "flint" for Phase 1; the spec lives in
// the GraphQL schema default. Pull from CIVIC_ATLAS_DEFAULT_TENANT
// later when the multi-tenant runtime contract lands.
const TENANT_SLUG = "flint";

interface FetchResult {
  readonly layer: NonNullable<EventLayersQuery["eventLayers"]>[number] | null;
  readonly placements: EventPlacementsQuery["placements"];
  readonly tasks: EventTasksListQuery["eventTasks"];
}

async function fetchPlannerData(eventSlug: string): Promise<FetchResult> {
  const client = getTheseusClient();

  // Fan out the three queries in parallel. The GraphQL sidecar
  // forwards each to the Axum EventPlannerService; on a single
  // pool connection this is two extra round-trips wrapped in one
  // resolver request. Phase 2 can replace this with a single
  // composed query if the sidecar gains an `eventLayerBundle`
  // shape, but for read-only Phase 1 the separation is clearer.
  // urql's `client.query()` returns an `OperationResultSource`
  // (Wonka stream). `.toPromise()` resolves once the first result
  // is in — fine for our cache-and-network policy because we're in
  // a server context.
  const [layersResult, placementsResult, tasksResult] = await Promise.all([
    client
      .query<EventLayersQuery>(EventLayersDocument, {
        tenantSlug: TENANT_SLUG,
      })
      .toPromise(),
    client
      .query<EventPlacementsQuery>(EventPlacementsDocument, {
        tenantSlug: TENANT_SLUG,
        eventSlug,
      })
      .toPromise(),
    client
      .query<EventTasksListQuery>(EventTasksListDocument, {
        tenantSlug: TENANT_SLUG,
        eventSlug,
      })
      .toPromise(),
  ]);

  if (layersResult.error) {
    // Render an empty state rather than throw. A misconfigured
    // GraphQL endpoint should not 500 the route; the client will
    // still render with the basemap and a "no data yet" rail.
    console.warn(
      `[plan/${eventSlug}] eventLayers query failed:`,
      layersResult.error.message,
    );
  }

  const layer =
    layersResult.data?.eventLayers.find((l) => l.slug === eventSlug) ?? null;

  return {
    layer,
    placements: placementsResult.data?.placements ?? [],
    tasks: tasksResult.data?.eventTasks ?? [],
  };
}

export default async function PlanEventPage({
  params,
}: {
  // Next 15 made params async; we await the promise to stay future-
  // safe even on Next 14 deployments where it's still synchronous.
  params: Promise<PlanPageParams> | PlanPageParams;
}) {
  const resolved = "then" in (params as object)
    ? await (params as Promise<PlanPageParams>)
    : (params as PlanPageParams);
  const eventSlug = resolved.event;

  const { layer, placements, tasks } = await fetchPlannerData(eventSlug);

  // Always render the shell. If the backend is unreachable or the
  // slug is unknown, the basemap + empty rails are still useful —
  // Phase 2 will replace the empty-state copy with a proper "set
  // up your event layer" CTA. A 404 here would hide the fact that
  // the route is wired correctly, which is what Phase 1 needs to
  // prove on the preview deployment.
  return (
    <PlannerClient
      eventSlug={eventSlug}
      layer={layer}
      placements={placements}
      tasks={tasks}
    />
  );
}
