/**
 * Planner SSE consumer.
 *
 * Opens an EventSource against the GraphQL sidecar's
 * `/sse/event-planner?tenantSlug=...&eventSlug=...` endpoint and
 * pokes the urql cache when a row changes. The payload only carries
 * IDs; the consumer invalidates list queries on INSERT/DELETE and
 * refetches the specific entity on UPDATE.
 *
 * The hook returns nothing — it is a side-effecting watcher that
 * runs while the component is mounted. Reconnection is automatic
 * via the browser's native EventSource behavior.
 */

"use client";

import { useEffect } from "react";
import { useClient } from "urql";

import {
  EventPlacementsDocument,
  EventTasksListDocument,
} from "@/lib/api/graphql/generated/graphql";

interface PlannerNotification {
  readonly op: "INSERT" | "UPDATE" | "DELETE";
  readonly table: string;
  readonly id: string;
  readonly event_layer_id: string;
  readonly tenant_id: string;
  readonly version: number | null;
}

function getSseEndpoint(): string {
  // Same env precedence as the urql client. We strip a trailing
  // /graphql so the SSE path can be appended cleanly.
  const base =
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    process.env.CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    "http://127.0.0.1:4010";
  return `${base}/sse/event-planner`;
}

export interface UsePlannerStreamOptions {
  readonly tenantSlug?: string;
  readonly eventSlug: string;
  /**
   * Optional override hook. When supplied, the hook calls this for
   * every notification instead of nudging the urql cache. Useful for
   * Phase 3 features that want to do something custom (e.g., camera
   * fly-to on a pending vendor INSERT).
   */
  readonly onChange?: (notification: PlannerNotification) => void;
}

export function usePlannerStream({
  tenantSlug = "flint",
  eventSlug,
  onChange,
}: UsePlannerStreamOptions) {
  const client = useClient();

  useEffect(() => {
    if (!eventSlug) return;

    const url = new URL(getSseEndpoint());
    url.searchParams.set("tenantSlug", tenantSlug);
    url.searchParams.set("eventSlug", eventSlug);

    const source = new EventSource(url.toString(), { withCredentials: true });

    const handler = (event: MessageEvent<string>) => {
      let payload: PlannerNotification;
      try {
        payload = JSON.parse(event.data) as PlannerNotification;
      } catch {
        return;
      }
      if (onChange) {
        onChange(payload);
        return;
      }
      // Refetch the affected list. urql's cache exchange invalidates
      // entries by re-running the document with network-only policy;
      // that's the simplest robust pattern for v1. Phase 3 can switch
      // to entity-level cache patches if the refetch traffic matters.
      const variables = { tenantSlug, eventSlug };
      if (payload.table === "event_placements") {
        client
          .query(EventPlacementsDocument, variables, {
            requestPolicy: "network-only",
          })
          .toPromise()
          .catch(() => {});
      } else if (payload.table === "event_tasks") {
        client
          .query(EventTasksListDocument, variables, {
            requestPolicy: "network-only",
          })
          .toPromise()
          .catch(() => {});
      }
    };

    source.addEventListener("planner_change", handler);

    return () => {
      source.removeEventListener("planner_change", handler);
      source.close();
    };
  }, [client, tenantSlug, eventSlug, onChange]);
}
