export type AtlasRendererMode = "baseline" | "scene";

export type AtlasAnalyticalLayerId =
  | "atlas-places"
  | "atlas-selected"
  | "atlas-events";

export type AtlasRendererBridge = {
  mode: AtlasRendererMode;
  label: string;
  analyticalLayerRenderer: "deck.gl" | "r3f";
  denseLayerFallback: AtlasRendererMode;
  gpuNativeLayerIds: readonly AtlasAnalyticalLayerId[];
  selectionKey: "place_id";
};

export const ATLAS_DECK_LAYER_IDS = {
  places: "atlas-places",
  selected: "atlas-selected",
  events: "atlas-events",
} as const satisfies Record<string, AtlasAnalyticalLayerId>;

export const ATLAS_RENDERER_BRIDGES = {
  baseline: {
    mode: "baseline",
    label: "MapLibre/deck.gl baseline",
    analyticalLayerRenderer: "deck.gl",
    denseLayerFallback: "baseline",
    gpuNativeLayerIds: [
      ATLAS_DECK_LAYER_IDS.places,
      ATLAS_DECK_LAYER_IDS.selected,
      ATLAS_DECK_LAYER_IDS.events,
    ],
    selectionKey: "place_id",
  },
  scene: {
    mode: "scene",
    label: "R3F civic scene",
    analyticalLayerRenderer: "r3f",
    denseLayerFallback: "baseline",
    gpuNativeLayerIds: [
      ATLAS_DECK_LAYER_IDS.places,
      ATLAS_DECK_LAYER_IDS.selected,
      ATLAS_DECK_LAYER_IDS.events,
    ],
    selectionKey: "place_id",
  },
} as const satisfies Record<AtlasRendererMode, AtlasRendererBridge>;

export function getAtlasRendererBridge(
  mode: AtlasRendererMode,
): AtlasRendererBridge {
  return ATLAS_RENDERER_BRIDGES[mode];
}
