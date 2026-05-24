/**
 * useReconstructionSave - PT-103b
 *
 * Exposes the `saveReconstruction(input)` mutation from the Atelier
 * GraphQL contract (see `docs/plans/the-atelier/graphql-contract.md`
 * Extension 7).
 *
 * Smallest viable save: persist a reconstruction view (parcelId + year +
 * optional contributor email + optional caption) so the user can return
 * to it via the returned `shareUrl`. Follows the existing
 * `submitObservation`-consumer pattern (no auth required; optional email
 * for receipt; honest errors when the resolver is unreachable).
 *
 * NO fallback synthesizer. Writes MUST succeed against the real backend;
 * if the resolver is down, the save fails with a user-visible error so
 * the user knows their save did not persist. Project CLAUDE.md no-fake-UI
 * rule applies to write paths especially.
 *
 * Caller contract:
 *   const { save, state, reset } = useReconstructionSave();
 *   const saved = await save({ reconstructionId, year, email?, caption? });
 *   // saved is { id, shareUrl, savedAt, ... } on success, or null on error.
 */

"use client";

import { useCallback, useState } from "react";
import { print as printGraphql } from "graphql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  SaveReconstructionDocument,
  type SaveReconstructionMutation,
  type SaveReconstructionMutationVariables,
  type SaveReconstructionInput,
} from "@/lib/api/graphql/generated/graphql";

export type SavedReconstructionResult =
  SaveReconstructionMutation["saveReconstruction"];

export type UseReconstructionSaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string; reason: "schema" | "network" | "graphql" }
  | { kind: "ok"; result: SavedReconstructionResult };

export type SaveReconstructionArgs = {
  reconstructionId: string;
  year: number;
  contributorEmail?: string;
  caption?: string;
};

function looksLikeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cannot query field") ||
    lower.includes('unknown field "savereconstruction"') ||
    lower.includes("unknown argument") ||
    lower.includes("unknown type") ||
    lower.includes("undefined field")
  );
}

export function useReconstructionSave(): {
  save: (args: SaveReconstructionArgs) => Promise<SavedReconstructionResult | null>;
  state: UseReconstructionSaveState;
  reset: () => void;
} {
  const [state, setState] = useState<UseReconstructionSaveState>({
    kind: "idle",
  });

  const reset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const save = useCallback(
    async (
      args: SaveReconstructionArgs,
    ): Promise<SavedReconstructionResult | null> => {
      setState({ kind: "saving" });

      const input: SaveReconstructionInput = {
        reconstructionId: args.reconstructionId,
        year: args.year,
        contributorEmail: args.contributorEmail ?? null,
        caption: args.caption ?? null,
      };

      const variables: SaveReconstructionMutationVariables = { input };
      const client = getTheseusClient();

      try {
        const result = await client
          .mutation<
            SaveReconstructionMutation,
            SaveReconstructionMutationVariables
          >(printGraphql(SaveReconstructionDocument), variables)
          .toPromise();

        if (result.error) {
          const networkError = result.error.networkError;
          if (networkError) {
            setState({
              kind: "error",
              message: networkError.message,
              reason: "network",
            });
            return null;
          }
          const message =
            result.error.graphQLErrors[0]?.message ?? result.error.message;
          setState({
            kind: "error",
            message,
            reason: looksLikeSchemaError(message) ? "schema" : "graphql",
          });
          return null;
        }

        const saved = result.data?.saveReconstruction;
        if (!saved) {
          setState({
            kind: "error",
            message: "Save returned no result.",
            reason: "graphql",
          });
          return null;
        }

        setState({ kind: "ok", result: saved });
        return saved;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        setState({ kind: "error", message, reason: "network" });
        return null;
      }
    },
    [],
  );

  return { save, state, reset };
}
