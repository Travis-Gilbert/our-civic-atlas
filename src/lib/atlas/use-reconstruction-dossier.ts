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
import type { CombinedError } from "urql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  ReconstructionDossierDocument,
  ReconstructionForDocument,
  type ReconstructionDossierQuery,
  type ReconstructionDossierQueryVariables,
  type ReconstructionForQuery,
  type ReconstructionForQueryVariables,
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
  /** Prefer the live parcel/year pipeline query when the route has one. */
  parcelId?: string;
  year?: number;
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

function combinedErrorMessage(error: CombinedError): string {
  return (
    error.networkError?.message ??
    error.graphQLErrors[0]?.message ??
    error.message
  );
}

export function useReconstructionDossier(
  reconstructionId: string | null,
  options: UseReconstructionDossierOptions = {},
): UseReconstructionDossierState {
  const { fallback = false, parcelId, year } = options;
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

    const setFallbackOrError = (
      message: string,
      allowFixtureFallback: boolean,
    ) => {
      if (fallback && allowFixtureFallback) {
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
    };

    const setDossierOrMissing = (dossier: AtelierDossier | null) => {
      if (dossier) {
        setState({
          dossier,
          loading: false,
          error: null,
          source: "graphql",
        });
        return;
      }

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
    };

    const load = async () => {
      if (parcelId && year != null) {
        const variables: ReconstructionForQueryVariables = { parcelId, year };
        const result = await client
          .query<ReconstructionForQuery, ReconstructionForQueryVariables>(
            printGraphql(ReconstructionForDocument),
            variables,
          )
          .toPromise();
        if (cancelled) return;
        if (!result.error) {
          setDossierOrMissing(result.data?.reconstructionFor ?? null);
          return;
        }

        const message = combinedErrorMessage(result.error);
        const isSchemaError = looksLikeSchemaError(message);
        const isNetworkError = Boolean(result.error.networkError);
        if (!isSchemaError) {
          setFallbackOrError(message, isNetworkError);
          return;
        }
      }

      const variables: ReconstructionDossierQueryVariables = {
        reconstructionId,
      };
      const result = await client
        .query<ReconstructionDossierQuery, ReconstructionDossierQueryVariables>(
          printGraphql(ReconstructionDossierDocument),
          variables,
        )
        .toPromise();
      if (cancelled) return;
      if (result.error) {
        const message = combinedErrorMessage(result.error);
        const isSchemaError = looksLikeSchemaError(message);
        const isNetworkError = Boolean(result.error.networkError);
        setFallbackOrError(message, isSchemaError || isNetworkError);
        return;
      }

      setDossierOrMissing(result.data?.reconstructionDossier ?? null);
    };

    load().catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setFallbackOrError(message, true);
    });

    return () => {
      cancelled = true;
    };
  }, [reconstructionId, fallback, parcelId, year]);

  return state;
}
