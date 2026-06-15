"use client";

/**
 * One-way push of the run-of-show schedule from the planning CRDT into the
 * durable Postgres projection (`projectEventSetTimes`; schema Extension
 * "Run-of-show set-time projection" + backend migration 0027).
 *
 * The civic planning store (Yjs) stays the system of record; this is best-effort
 * durability for reporting and cross-system reads, so a missing or erroring
 * resolver is swallowed and never surfaced to the organizer (the resolver may be
 * unreached in a given environment). Only real, organizer-entered set times are
 * projected: synthetic `draft_stage` fallback performances are filtered out so
 * the durable schedule stays honest. The push is debounced and guarded by a
 * content signature, so it fires once per actual schedule change, never on a
 * scrub or a plain re-render.
 */

import { useEffect, useRef } from "react";
import { useClient } from "urql";

import { ProjectEventSetTimesDocument } from "@/lib/api/graphql/generated/graphql";
import type { RunOfShowPerformance } from "@/lib/porchfest/run-of-show";

export interface RunOfShowProjectionSyncOptions {
  readonly performances: readonly RunOfShowPerformance[];
  /** Run-of-show mode on: only push while the organizer is in the mode. */
  readonly enabled: boolean;
  readonly eventSlug: string;
}

export function useRunOfShowProjectionSync({
  performances,
  enabled,
  eventSlug,
}: RunOfShowProjectionSyncOptions): void {
  const client = useClient();
  const lastPushed = useRef<string | null>(null);

  // Only durable, organizer-entered set times reach the projection.
  const real = performances.filter((p) => p.source !== "draft_stage");
  const signature = real
    .map((p) => `${p.placementId}:${p.startMinute}:${p.endMinute}:${p.actName}`)
    .join("|");

  // The effect keys on the content signature; read the latest rows via a ref so
  // the rebuilt-every-render array does not re-arm the timer each render.
  const realRef = useRef(real);

  useEffect(() => {
    realRef.current = real;
  }, [real]);

  useEffect(() => {
    if (!enabled) return;
    if (realRef.current.length === 0) return;
    if (lastPushed.current === signature) return;

    const handle = window.setTimeout(() => {
      const projections = realRef.current.map((performance) => ({
        sourceKey: performance.placementId,
        actName: performance.actName,
        startMinute: performance.startMinute,
        endMinute: performance.endMinute,
      }));
      void client
        .mutation(ProjectEventSetTimesDocument, {
          input: { eventSlug, projections, pruneMissing: true },
        })
        .toPromise()
        .then((result) => {
          if (result.error) {
            console.warn(
              "[run-of-show] set-time projection push failed (backend may be pending):",
              result.error.message,
            );
            return;
          }
          lastPushed.current = signature;
        })
        .catch((error: unknown) => {
          console.warn(
            "[run-of-show] set-time projection push errored:",
            error,
          );
        });
    }, 1200);

    return () => window.clearTimeout(handle);
  }, [enabled, signature, client, eventSlug]);
}
