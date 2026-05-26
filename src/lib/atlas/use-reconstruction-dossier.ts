/**
 * useReconstructionDossier - PT-103
 *
 * Fetches the atelier's one-shot dossier payload via the GraphQL resolver
 * `reconstructionDossier(reconstructionId)`. Falls back to the in-repo
 * fixture synthesizer (see `atelier-fallback-synthesizer.ts`) only when:
 *
 *   - the resolver returns a schema error (backend hasn't implemented
 *     the new fields yet; the request error mentions `Cannot query field
 *     "reconstructionDossier"` or similar)
 *   - the network fails entirely (dev without the sidecar running)
 *
 * Operational GraphQL errors from a real resolver are not masked by fixture
 * fallback. If the engine fails, the user should see the engine failure.
 *
 * The fallback path is opt-in via `{ fallback: true }` and intended for
 * development. Production paths pass `{ fallback: false }` so backend
 * outages surface as honest errors rather than silently masked fixture
 * data.
 *
 * Caller contract: hook returns `{ dossier, loading, error, source }`.
 * `source` is `"graphql" | "fallback" | "none"`; `none` means the
 * reconstructionId did not exist in either the GraphQL response or the
 * fixture.
 *
 * Mirrors the existing `useHistoricalReconstructions` pattern at
 * `src/lib/atlas/use-historical-reconstructions.ts`.
 */

"use client";

import { useEffect, useState } from "react";
import { print as printGraphql } from "graphql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  ReconstructionDossierDocument,
  type ReconstructionDossierQuery,
  type ReconstructionDossierQueryVariables,
} from "@/lib/api/graphql/generated/graphql";
import { synthesizeDossierFromFixture } from "@/lib/atlas/atelier-fallback-synthesizer";

export type AtelierDossier =
  ReconstructionDossierQuery["reconstructionDossier"];

export type UseReconstructionDossierState = {
  dossier: AtelierDossier | null;
  loading: boolean;
  error: string | null;
  source: "graphql" | "fallback" | "none";
};

export type UseReconstructionDossierOptions = {
  /** When true, fall back to the in-repo fixture synthesizer on any
   * resolver / network error. Dev-only. Default false. */
  fallback?: boolean;
};

function looksLikeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cannot query field") ||
    lower.includes('unknown field "reconstructiondossier"') ||
    lower.includes('unknown field "evidenceforreconstruction"') ||
    lower.includes("unknown argument") ||
    lower.includes("unknown type") ||
    lower.includes("undefined field")
  );
}

export function useReconstructionDossier(
  reconstructionId: string | null,
  options: UseReconstructionDossierOptions = {},
): UseReconstructionDossierState {
  const { fallback = false } = options;
  const [state, setState] = useState<UseReconstructionDossierState>({
    dossier: null,
    loading: reconstructionId !== null,
    error: null,
    source: "none",
  });

  useEffect(() => {
    if (reconstructionId === null) {
      setState({ dossier: null, loading: false, error: null, source: "none" });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const client = getTheseusClient();
    const variables: ReconstructionDossierQueryVariables = { reconstructionId };

    client
      .query<
        ReconstructionDossierQuery,
        ReconstructionDossierQueryVariables
      >(printGraphql(ReconstructionDossierDocument), variables)
      .toPromise()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          const message =
            result.error.networkError?.message ??
            result.error.graphQLErrors[0]?.message ??
            result.error.message;
          const isSchemaError = looksLikeSchemaError(message);
          const isNetworkError = Boolean(result.error.networkError);

          if (fallback && (isSchemaError || isNetworkError)) {
            const synthesized = synthesizeDossierFromFixture(reconstructionId);
            if (synthesized) {
              setState({
                dossier: synthesized,
                loading: false,
                error: null,
                source: "fallback",
              });
              return;
            }
          }

          setState({
            dossier: null,
            loading: false,
            error: message,
            source: "none",
          });
          return;
        }

        const dossier = result.data?.reconstructionDossier ?? null;
        if (!dossier) {
          if (fallback) {
            const synthesized = synthesizeDossierFromFixture(reconstructionId);
            if (synthesized) {
              setState({
                dossier: synthesized,
                loading: false,
                error: null,
                source: "fallback",
              });
              return;
            }
          }
          setState({
            dossier: null,
            loading: false,
            error: "Reconstruction not found.",
            source: "none",
          });
          return;
        }

        setState({
          dossier,
          loading: false,
          error: null,
          source: "graphql",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);

        if (fallback) {
          const synthesized = synthesizeDossierFromFixture(reconstructionId);
          if (synthesized) {
            setState({
              dossier: synthesized,
              loading: false,
              error: message,
              source: "fallback",
            });
            return;
          }
        }

        setState({
          dossier: null,
          loading: false,
          error: message,
          source: "none",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reconstructionId, fallback]);

  return state;
}
