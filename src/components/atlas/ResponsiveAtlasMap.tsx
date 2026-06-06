"use client";

/**
 * ResponsiveAtlasMap — thin viewport-aware wrapper around `AtlasMap`.
 *
 * Historical note: this component used to dispatch between the desktop
 * MapLibre + deck.gl `AtlasMap` and a Leaflet `MobileAtlasMap` for
 * phone-class devices. As of the deck.gl promotion (`mobile-runtime-
 * profile.json` → `current_status: "promoted"`), `AtlasMap` is the sole
 * render path across every viewport. The Leaflet `MobileAtlasMap` has
 * been deleted; this wrapper is retained because:
 *
 *   1. `AtlasMap` is dynamic-imported (it loads MapLibre / WebGL at
 *      module evaluation, which must not run server-side).
 *   2. The pre-hydration empty container prevents layout shift when
 *      the WebGL canvas mounts.
 *
 * If a future viewport split is reintroduced (for instance: very small
 * phones get a 2D-only layer set while tablets stay 3D), the routing
 * logic returns here. Until then, this is a passthrough.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapRef } from "react-map-gl/maplibre";
import type {
  FreshSignal,
  PlacesCollection,
  SpatialEvent,
  TrafficRealtimeSnapshot,
} from "@/lib/api/openFlintAtlas";
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import type { SelectedBuilding } from "@/lib/atlas/selected-building";
import type { HistoricalReconstruction } from "@/lib/atlas/historical-reconstruction";
import type {
  ScenarioDeltaProperties,
  ScenarioEnvelopeProperties,
} from "@/lib/atlas/scenario-model";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { Layer } from "@deck.gl/core";
import type { UrbanDesignMaterialMode } from "./AtlasMap";

const AtlasMap = dynamic(
  () => import("./AtlasMap").then((m) => m.AtlasMap),
  { ssr: false },
);

export type ResponsiveAtlasMapProps = {
  places: PlacesCollection | null;
  events: SpatialEvent[];
  signals: FreshSignal[];
  trafficSnapshot?: TrafficRealtimeSnapshot | null;
  onPlaceSelect: (placeId: string) => void;
  onSignalSelect: (signalId: string) => void;
  onTrafficSegmentSelect?: (segmentId: string) => void;
  selectedPlaceId: string | null;
  selectedSignalId: string | null;
  selectedTrafficSegmentId?: string | null;
  /**
   * Selected building, if any. Separate from `selectedPlaceId` (which
   * carries civic places: wards, parcels, addresses). Spec PR 1.
   */
  selectedBuilding?: SelectedBuilding | null;
  /**
   * Fired when a building is picked on the map. Pass `null` to clear
   * the selection (e.g. when the user clicks empty map area). Spec PR 1.
   */
  onBuildingSelect?: (building: SelectedBuilding | null) => void;
  layerVisibility: Record<string, boolean>;
  /**
   * Kept for backward compatibility with callers that still pass it.
   * The value is no longer used at runtime — `AtlasMap` is the only
   * render path.
   */
  mobileSurface?: MobileRuntimeSurfaceId;
  initialBounds?: [[number, number], [number, number]] | null;
  viewMode?: AtlasSceneViewModeId;
  activeLens?: AtlasLensId;
  className?: string;
  onMapReady?: (map: MapRef | null) => void;
  atlasYear?: number | null;
  /** Optional override for Lost Flint reconstruction data. See
   * `AtlasMap.historicalReconstructions` for the contract; this is a
   * pure passthrough. */
  historicalReconstructions?: HistoricalReconstruction[];
  scenarioEnvelopeFeatures?: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    ScenarioEnvelopeProperties
  >;
  scenarioDeltaFeatures?: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    ScenarioDeltaProperties
  >;
  scenarioCompareEnabled?: boolean;
  urbanDesignMaterialMode?: UrbanDesignMaterialMode;
  extraDeckLayers?: Layer[];
  mapDragPanEnabled?: boolean;
  dragPanBlockLayerIds?: readonly string[];
};

function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export function ResponsiveAtlasMap(props: ResponsiveAtlasMapProps) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return <div className={props.className} />;
  }
  return <AtlasMap {...props} />;
}
