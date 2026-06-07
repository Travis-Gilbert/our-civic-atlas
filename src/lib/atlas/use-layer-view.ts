"use client";

import { useEffect, useState } from "react";
import { print as printGraphql } from "graphql";
import type { CombinedError } from "urql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  LayerRecipeDocument,
  LayerViewDocument,
  type BboxInput,
  type LayerRecipeQuery,
  type LayerRecipeQueryVariables,
  type LayerViewQuery,
  type LayerViewQueryVariables,
  type TimeRangeInput,
} from "@/lib/api/graphql/generated/graphql";

export type UseLayerViewState = {
  view: LayerViewQuery["layerView"] | null;
  recipe: LayerRecipeQuery["layerRecipe"] | null;
  loading: boolean;
  error: string | null;
};

export type UseLayerViewOptions = {
  bbox?: BboxInput | null;
  timeRange?: TimeRangeInput | null;
  minConfidence?: number;
  includeRecipe?: boolean;
};

function combinedErrorMessage(error: CombinedError): string {
  return (
    error.networkError?.message ??
    error.graphQLErrors[0]?.message ??
    error.message
  );
}

export function useLayerView(
  layerId: string | null,
  options: UseLayerViewOptions = {},
): UseLayerViewState {
  const {
    bbox = null,
    timeRange = null,
    minConfidence = 0,
    includeRecipe = true,
  } = options;
  const [state, setState] = useState<UseLayerViewState>({
    view: null,
    recipe: null,
    loading: layerId !== null,
    error: null,
  });

  useEffect(() => {
    if (layerId === null) {
      setState({ view: null, recipe: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    const client = getTheseusClient();
    const viewVariables: LayerViewQueryVariables = {
      layerId,
      bbox,
      timeRange,
      minConfidence,
    };
    const recipeVariables: LayerRecipeQueryVariables = { layerId };

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const viewPromise = client
      .query<LayerViewQuery, LayerViewQueryVariables>(
        printGraphql(LayerViewDocument),
        viewVariables,
      )
      .toPromise();
    const recipePromise = includeRecipe
      ? client
          .query<LayerRecipeQuery, LayerRecipeQueryVariables>(
            printGraphql(LayerRecipeDocument),
            recipeVariables,
          )
          .toPromise()
      : Promise.resolve(null);

    Promise.all([viewPromise, recipePromise])
      .then(([viewResult, recipeResult]) => {
        if (cancelled) return;
        const error = viewResult.error ?? recipeResult?.error;
        if (error) {
          setState({
            view: null,
            recipe: null,
            loading: false,
            error: combinedErrorMessage(error),
          });
          return;
        }
        setState({
          view: viewResult.data?.layerView ?? null,
          recipe: recipeResult?.data?.layerRecipe ?? null,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          view: null,
          recipe: null,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [layerId, bbox, timeRange, minConfidence, includeRecipe]);

  return state;
}
