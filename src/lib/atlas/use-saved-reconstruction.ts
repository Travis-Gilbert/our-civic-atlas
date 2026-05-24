/**
 * useSavedReconstruction - PT-103c
 *
 * Queries `savedReconstruction(id)` to resolve a saved-id back to a
 * `SavedReconstruction` (reconstructionId + year). Used by the
 * `/open-flint-atlas/atelier/saved/[savedId]` route at PT-405b to
 * preload the atelier with the saved view.
 *
 * No fallback synthesizer: a "saved" record only exists if it was
 * actually persisted to the backend. A missing record is honest empty
 * state (404 at the route level).
 */

"use client";

import { useEffect, useState } from "react";
import { print as printGraphql } from "graphql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  SavedReconstructionDocument,
  type SavedReconstructionQuery,
  type SavedReconstructionQueryVariables,
} from "@/lib/api/graphql/generated/graphql";

export type SavedReconstruction =
  NonNullable<SavedReconstructionQuery["savedReconstruction"]>;

export type UseSavedReconstructionState = {
  saved: SavedReconstruction | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
};

export function useSavedReconstruction(
  savedId: string | null,
): UseSavedReconstructionState {
  const [state, setState] = useState<UseSavedReconstructionState>({
    saved: null,
    loading: savedId !== null,
    error: null,
    notFound: false,
  });

  useEffect(() => {
    if (savedId === null) {
      setState({ saved: null, loading: false, error: null, notFound: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null, notFound: false }));

    const client = getTheseusClient();
    const variables: SavedReconstructionQueryVariables = { id: savedId };

    client
      .query<
        SavedReconstructionQuery,
        SavedReconstructionQueryVariables
      >(printGraphql(SavedReconstructionDocument), variables)
      .toPromise()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          const message =
            result.error.networkError?.message ??
            result.error.graphQLErrors[0]?.message ??
            result.error.message;
          setState({
            saved: null,
            loading: false,
            error: message,
            notFound: false,
          });
          return;
        }

        const saved = result.data?.savedReconstruction ?? null;
        if (!saved) {
          setState({
            saved: null,
            loading: false,
            error: null,
            notFound: true,
          });
          return;
        }

        setState({ saved, loading: false, error: null, notFound: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({
          saved: null,
          loading: false,
          error: message,
          notFound: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [savedId]);

  return state;
}
