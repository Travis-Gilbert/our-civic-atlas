"use client";

import { useEffect, useState } from "react";
import { print as printGraphql } from "graphql";
import type { CombinedError } from "urql";

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  LayersDocument,
  type LayerKind,
  type LayerLifecycleState,
  type LayersQuery,
  type LayersQueryVariables,
} from "@/lib/api/graphql/generated/graphql";

export type UseLayersState = {
  layers: LayersQuery["layers"];
  loading: boolean;
  error: string | null;
};

export type UseLayersOptions = {
  tenantSlug?: string;
  kinds?: LayerKind[];
  lifecycleState?: LayerLifecycleState | null;
};

function combinedErrorMessage(error: CombinedError): string {
  return (
    error.networkError?.message ??
    error.graphQLErrors[0]?.message ??
    error.message
  );
}

export function useLayers(options: UseLayersOptions = {}): UseLayersState {
  const { tenantSlug = "flint", kinds, lifecycleState = null } = options;
  const [state, setState] = useState<UseLayersState>({
    layers: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const client = getTheseusClient();
    const variables: LayersQueryVariables = {
      tenantSlug,
      kinds: kinds?.length ? kinds : null,
      lifecycleState,
    };

    setState((prev) => ({ ...prev, loading: true, error: null }));

    client
      .query<LayersQuery, LayersQueryVariables>(
        printGraphql(LayersDocument),
        variables,
      )
      .toPromise()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState({
            layers: [],
            loading: false,
            error: combinedErrorMessage(result.error),
          });
          return;
        }
        setState({
          layers: result.data?.layers ?? [],
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          layers: [],
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, kinds, lifecycleState]);

  return state;
}
