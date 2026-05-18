/**
 * Hook + fetcher for `HistoricalReconstruction[]` data.
 *
 * Today's source is a static JSON shim at
 * `/atlas/historical/<bookmark>.json` that mirrors the in-file fixture
 * `FLINT_LOST_RECONSTRUCTIONS`. The shim exists so the fetch path is
 * exercised end-to-end (fetch -> hook -> state -> deck.gl layer)
 * before the live GraphQL endpoint from our-civic-atlas-backend ships.
 *
 * Swap target when the backend GraphQL bridge lands:
 *   1. Point `HISTORICAL_RECONSTRUCTIONS_URL_PATTERN` at the GraphQL
 *      endpoint (or use the existing urql client and replace the
 *      `fetch()` call with a `query()`).
 *   2. Map the GraphQL response to `HistoricalReconstruction[]`. The
 *      reconstructions JSON shape was authored to match the
 *      `HistoricalReconstructionsAt` query in
 *      `src/lib/api/graphql/queries/historical.graphql` already, so
 *      the mapping is mostly a 1:1 field rename.
 *
 * Fallback on fetch failure: returns the in-file `FLINT_LOST_RECONSTRUCTIONS`
 * fixture so the layer keeps rendering. Errors are reported via the
 * `error` field for upstream telemetry but never prevent a render.
 */

"use client";

import { useEffect, useState } from "react";
import {
  FLINT_LOST_RECONSTRUCTIONS,
  type HistoricalReconstruction,
} from "@/lib/atlas/historical-reconstruction";

/**
 * Path template for the static JSON shim. The `{bookmark}` token is
 * substituted with the bookmark slug at fetch time. Same-origin keeps
 * CORS out of the loader path.
 */
const HISTORICAL_RECONSTRUCTIONS_URL_PATTERN =
  "/atlas/historical/{bookmark}.json";

type HistoricalShimDocument = {
  version: number;
  bookmark_id: string;
  reconstructions: HistoricalReconstruction[];
};

export type HistoricalReconstructionsState = {
  /** The resolved reconstruction array. Always populated — falls back
   * to `FLINT_LOST_RECONSTRUCTIONS` on fetch error so the consumer
   * never has to special-case an empty result. */
  reconstructions: HistoricalReconstruction[];
  /** True while the network request is in flight on first load. */
  loading: boolean;
  /** Populated when fetch / parse failed. Consumer can surface a
   * notice; render still proceeds with the fallback. */
  error: string | null;
  /** Source of the current reconstructions array. */
  source: "shim" | "fallback";
};

/**
 * Fetch the static shim for one bookmark + return loading state.
 *
 * Use case: `OpenFlintAtlasScene` for the `/lost-flint/<bookmark>`
 * routes loads its reconstruction data through this hook instead of
 * the in-file fixture, so the data path is wired identically to the
 * eventual GraphQL path.
 *
 * When `bookmarkId` is `null` the hook stays in fallback mode
 * (FLINT_LOST_RECONSTRUCTIONS) and never fires a request — useful for
 * routes that haven't picked a bookmark yet.
 */
export function useHistoricalReconstructions(
  bookmarkId: string | null,
): HistoricalReconstructionsState {
  const [state, setState] = useState<HistoricalReconstructionsState>({
    reconstructions: FLINT_LOST_RECONSTRUCTIONS,
    loading: bookmarkId !== null,
    error: null,
    source: "fallback",
  });

  useEffect(() => {
    if (bookmarkId === null) {
      setState({
        reconstructions: FLINT_LOST_RECONSTRUCTIONS,
        loading: false,
        error: null,
        source: "fallback",
      });
      return;
    }

    const controller = new AbortController();
    const url = HISTORICAL_RECONSTRUCTIONS_URL_PATTERN.replace(
      "{bookmark}",
      encodeURIComponent(bookmarkId),
    );

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(url, { signal: controller.signal, cache: "default" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `${response.status} ${response.statusText} fetching ${url}`,
          );
        }
        return response.json();
      })
      .then((payload: HistoricalShimDocument) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(payload?.reconstructions)) {
          throw new Error(
            `unexpected shim shape at ${url}: missing 'reconstructions' array`,
          );
        }
        setState({
          reconstructions: payload.reconstructions,
          loading: false,
          error: null,
          source: "shim",
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        // Fall back to the in-file fixture so the renderer keeps
        // working when the network is gone or the shim file is
        // missing. The error is reported but non-fatal.
        setState({
          reconstructions: FLINT_LOST_RECONSTRUCTIONS,
          loading: false,
          error: message,
          source: "fallback",
        });
      });

    return () => {
      controller.abort();
    };
  }, [bookmarkId]);

  return state;
}
