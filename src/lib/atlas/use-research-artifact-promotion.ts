/**
 * useResearchArtifactPromotion
 *
 * Exposes the `promoteResearchArtifact(input)` mutation. This is the small
 * bridge between a live civicResearch result and the durable PostGIS artifact
 * tables the reconstruction engine reads on future runs.
 *
 * No fallback path: promotion is a write, so failures stay visible.
 */

"use client";

import { useCallback, useState } from "react";
import { print as printGraphql } from "graphql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  PromoteResearchArtifactDocument,
  type PromoteResearchArtifactMutation,
  type PromoteResearchArtifactMutationVariables,
  type ResearchArtifactPromotionInput,
} from "@/lib/api/graphql/generated/graphql";

export type PromotedResearchArtifactResult =
  PromoteResearchArtifactMutation["promoteResearchArtifact"];

export type UseResearchArtifactPromotionState =
  | { kind: "idle" }
  | { kind: "promoting" }
  | { kind: "error"; message: string; reason: "schema" | "network" | "graphql" }
  | { kind: "ok"; result: PromotedResearchArtifactResult };

export type PromoteResearchArtifactArgs = {
  artifactKey?: string;
  runId?: string;
  sourceId?: string;
  candidateId?: string;
  sourceType: string;
  title: string;
  uri?: string;
  citation?: string;
  capturedAt?: string;
  payload?: Record<string, unknown>;
  sourceUseTags?: string[];
  sourceUseNote?: string;
  reviewState?: string;
  parcelRef?: string;
  buildingId?: string;
  buildingPartId?: string;
  anchorKind?: string;
  anchorGeometryWkt?: string;
  anchorTimeStart?: string;
  anchorTimeEnd?: string;
  anchorPayload?: Record<string, unknown>;
};

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function looksLikeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cannot query field") ||
    lower.includes('unknown field "promoteresearchartifact"') ||
    lower.includes("unknown argument") ||
    lower.includes("unknown type") ||
    lower.includes("undefined field")
  );
}

function toInput(args: PromoteResearchArtifactArgs): ResearchArtifactPromotionInput {
  return {
    artifactKey: optionalText(args.artifactKey),
    runId: optionalText(args.runId),
    sourceId: optionalText(args.sourceId),
    candidateId: optionalText(args.candidateId),
    sourceType: args.sourceType,
    title: args.title,
    uri: optionalText(args.uri),
    citation: optionalText(args.citation),
    capturedAt: optionalText(args.capturedAt),
    payload: args.payload ?? null,
    sourceUseTags: args.sourceUseTags ?? null,
    sourceUseNote: optionalText(args.sourceUseNote),
    reviewState: optionalText(args.reviewState),
    parcelRef: optionalText(args.parcelRef),
    buildingId: optionalText(args.buildingId),
    buildingPartId: optionalText(args.buildingPartId),
    anchorKind: optionalText(args.anchorKind),
    anchorGeometryWkt: optionalText(args.anchorGeometryWkt),
    anchorTimeStart: optionalText(args.anchorTimeStart),
    anchorTimeEnd: optionalText(args.anchorTimeEnd),
    anchorPayload: args.anchorPayload ?? null,
  };
}

export function useResearchArtifactPromotion(): {
  promote: (
    args: PromoteResearchArtifactArgs,
  ) => Promise<PromotedResearchArtifactResult | null>;
  state: UseResearchArtifactPromotionState;
  reset: () => void;
} {
  const [state, setState] = useState<UseResearchArtifactPromotionState>({
    kind: "idle",
  });

  const reset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const promote = useCallback(
    async (
      args: PromoteResearchArtifactArgs,
    ): Promise<PromotedResearchArtifactResult | null> => {
      setState({ kind: "promoting" });

      const variables: PromoteResearchArtifactMutationVariables = {
        input: toInput(args),
      };
      const client = getTheseusClient();

      try {
        const result = await client
          .mutation<
            PromoteResearchArtifactMutation,
            PromoteResearchArtifactMutationVariables
          >(printGraphql(PromoteResearchArtifactDocument), variables)
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

        const promoted = result.data?.promoteResearchArtifact;
        if (!promoted) {
          setState({
            kind: "error",
            message: "Artifact promotion returned no result.",
            reason: "graphql",
          });
          return null;
        }

        setState({ kind: "ok", result: promoted });
        return promoted;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        setState({ kind: "error", message, reason: "network" });
        return null;
      }
    },
    [],
  );

  return { promote, state, reset };
}
