/**
 * useTrafficRealtime
 *
 * Canonical realtime-traffic data hook. Fetches the snapshot via the GraphQL
 * resolver `trafficRealtime(networkId)` (schema Extension 8) and returns it in
 * the existing map/panel view model (`TrafficRealtimeSnapshot` from
 * `openFlintAtlas.ts`), so the deck.gl render and `TrafficFlowPanel` consume it
 * unchanged.
 *
 * Per the 2026-06-05 GraphQL-canonical decision
 * (docs/plans/traffic-domain-realtime/decision-2026-06-05-graphql-canonical.md):
 *
 *   - GraphQL is the canonical public read seam.
 *   - The REST shim `fetchTrafficRealtime()` is demoted to a dev / resolver-not-
 *     ready fallback, used only when `{ fallback: true }` and the resolver
 *     returns a schema error (not implemented yet) or the network fails.
 *   - GraphQL returns SNAPSHOTS, not animation ticks: this hook only polls
 *     (every `refreshIntervalSeconds`). The map keeps animating particles
 *     locally between polls.
 *
 * Honesty contract: the adapter copies provenance straight through
 * (estimateBasis / sourceStatus / status / confidence / supportNote). Nothing is
 * fabricated; a fixture snapshot stays `fixture_fallback` and never reports a
 * live source.
 *
 * Mirrors the `useReconstructionDossier` pattern.
 */

"use client";

import { useEffect, useState } from "react";
import { print as printGraphql } from "graphql";
import type { CombinedError } from "urql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  TrafficRealtimeDocument,
  type TrafficRealtimeQuery,
  type TrafficRealtimeQueryVariables,
} from "@/lib/api/graphql/generated/graphql";
import {
  fetchTrafficRealtime,
  type TrafficRealtimeSnapshot,
  type TrafficSegmentFeature,
  type TrafficEstimateBasis as RestEstimateBasis,
  type TrafficSourceStatus as RestSourceStatus,
} from "@/lib/api/openFlintAtlas";

type GraphqlTrafficSnapshot = TrafficRealtimeQuery["trafficRealtime"];
type GraphqlTrafficSegment = GraphqlTrafficSnapshot["segments"][number];

export type UseTrafficRealtimeState = {
  /** The view model consumed by the map layer and TrafficFlowPanel. */
  snapshot: TrafficRealtimeSnapshot | null;
  loading: boolean;
  error: string | null;
  source: "graphql" | "fallback" | "none";
};

export type UseTrafficRealtimeOptions = {
  /** When true, fall back to the REST shim on a schema / network error. Dev-only. */
  fallback?: boolean;
  /** Override the poll interval (seconds). Default: the snapshot's
   * refreshIntervalSeconds, or 15s before the first snapshot arrives. */
  pollSeconds?: number;
};

const ESTIMATE_BASIS_TO_REST: Record<
  GraphqlTrafficSegment["estimateBasis"],
  RestEstimateBasis
> = {
  LIVE_FEED: "live_feed",
  HOURLY_PATTERN: "hourly_pattern",
  SCENARIO_MODEL: "scenario_model",
};

const SOURCE_STATUS_TO_REST: Record<
  GraphqlTrafficSegment["sourceStatus"],
  RestSourceStatus
> = {
  LIVE: "live",
  FIXTURE: "fixture",
  PENDING_LIVE_SOURCE: "pending_live_source",
};

const FEED_STATUS_TO_REST: Record<
  GraphqlTrafficSnapshot["status"],
  TrafficRealtimeSnapshot["status"]
> = {
  LIVE: "live",
  FIXTURE_FALLBACK: "fixture_fallback",
  UNAVAILABLE: "unavailable",
};

/**
 * Adapt the typed GraphQL snapshot into the existing GeoJSON view model the
 * map/panel render. A pure field rename + enum down-casing; no values invented.
 * Exported so the render can adapt a snapshot from any source if needed.
 */
export function adaptGraphqlTrafficSnapshot(
  gql: GraphqlTrafficSnapshot,
): TrafficRealtimeSnapshot {
  const features: TrafficSegmentFeature[] = gql.segments.map((segment) => ({
    type: "Feature",
    geometry: segment.geometry as unknown as GeoJSON.LineString,
    properties: {
      segment_id: segment.segmentId,
      corridor_name: segment.corridorName,
      direction_label: segment.directionLabel,
      estimate_basis: ESTIMATE_BASIS_TO_REST[segment.estimateBasis],
      source_status: SOURCE_STATUS_TO_REST[segment.sourceStatus],
      source_label: segment.sourceLabel,
      support_note: segment.supportNote,
      observed_at: segment.observedAt,
      expires_at: segment.expiresAt ?? segment.observedAt,
      speed_mph: segment.speedMph,
      free_flow_speed_mph: segment.freeFlowSpeedMph,
      volume_per_hour: segment.volumePerHour,
      congestion_ratio: segment.congestionRatio,
      confidence: segment.confidence,
    },
  }));

  return {
    feed_id: gql.feedId,
    source_label: gql.sourceLabel,
    source_url: gql.sourceUrl,
    status: FEED_STATUS_TO_REST[gql.status],
    generated_at: gql.generatedAt,
    refresh_interval_seconds: gql.refreshIntervalSeconds,
    summary: {
      segment_count: gql.summary.segmentCount,
      live_feed_segments: gql.summary.liveFeedSegments,
      inferred_segments: gql.summary.inferredSegments,
      congested_segments: gql.summary.congestedSegments,
      average_speed_mph: gql.summary.averageSpeedMph,
      average_congestion_ratio: gql.summary.averageCongestionRatio,
    },
    segments: { type: "FeatureCollection", features },
  };
}

function looksLikeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cannot query field") ||
    lower.includes('unknown field "trafficrealtime"') ||
    lower.includes("unknown argument") ||
    lower.includes("unknown type") ||
    lower.includes("undefined field")
  );
}

function combinedErrorMessage(error: CombinedError): string {
  return (
    error.networkError?.message ??
    error.graphQLErrors[0]?.message ??
    error.message
  );
}

const DEFAULT_POLL_SECONDS = 15;

export function useTrafficRealtime(
  networkId: string | null,
  options: UseTrafficRealtimeOptions = {},
): UseTrafficRealtimeState {
  const { fallback = false, pollSeconds } = options;
  const [state, setState] = useState<UseTrafficRealtimeState>({
    snapshot: null,
    loading: networkId !== null,
    error: null,
    source: "none",
  });

  useEffect(() => {
    if (networkId === null) {
      setState({ snapshot: null, loading: false, error: null, source: "none" });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const client = getTheseusClient();

    const apply = (
      snapshot: TrafficRealtimeSnapshot,
      source: "graphql" | "fallback",
    ) => {
      if (cancelled) return;
      setState({ snapshot, loading: false, error: null, source });
      const seconds =
        pollSeconds ?? snapshot.refresh_interval_seconds ?? DEFAULT_POLL_SECONDS;
      timer = setTimeout(run, Math.max(1, seconds) * 1000);
    };

    const fail = (message: string) => {
      if (cancelled) return;
      // Keep the last good snapshot on a transient re-poll failure; only clear
      // when we never had one.
      setState((prev) => ({
        snapshot: prev.snapshot,
        loading: false,
        error: message,
        source: prev.snapshot ? prev.source : "none",
      }));
      const seconds = pollSeconds ?? DEFAULT_POLL_SECONDS;
      timer = setTimeout(run, Math.max(1, seconds) * 1000);
    };

    const useRestFallback = async (reason: string) => {
      if (!fallback) {
        fail(reason);
        return;
      }
      try {
        const rest = await fetchTrafficRealtime();
        if (rest.ok) {
          apply(rest.data, "fallback");
        } else {
          fail(`${rest.error} (HTTP ${rest.status})`);
        }
      } catch (restError: unknown) {
        fail(restError instanceof Error ? restError.message : String(restError));
      }
    };

    const run = async () => {
      try {
        const variables: TrafficRealtimeQueryVariables = { networkId };
        const result = await client
          .query<TrafficRealtimeQuery, TrafficRealtimeQueryVariables>(
            printGraphql(TrafficRealtimeDocument),
            variables,
          )
          .toPromise();
        if (cancelled) return;

        if (result.error) {
          const message = combinedErrorMessage(result.error);
          const recoverable =
            looksLikeSchemaError(message) || Boolean(result.error.networkError);
          if (recoverable) {
            await useRestFallback(message);
          } else {
            fail(message);
          }
          return;
        }

        if (result.data?.trafficRealtime) {
          apply(adaptGraphqlTrafficSnapshot(result.data.trafficRealtime), "graphql");
        } else {
          await useRestFallback("Traffic snapshot not found.");
        }
      } catch (error: unknown) {
        if (cancelled) return;
        await useRestFallback(
          error instanceof Error ? error.message : String(error),
        );
      }
    };

    setState((prev) => ({ ...prev, loading: prev.snapshot === null }));
    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [networkId, fallback, pollSeconds]);

  return state;
}
