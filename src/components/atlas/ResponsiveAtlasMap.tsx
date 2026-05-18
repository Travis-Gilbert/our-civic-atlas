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
} from "@/lib/api/openFlintAtlas";
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";

const AtlasMap = dynamic(
  () => import("./AtlasMap").then((m) => m.AtlasMap),
  { ssr: false },
);

export type ResponsiveAtlasMapProps = {
  places: PlacesCollection | null;
  events: SpatialEvent[];
  signals: FreshSignal[];
  onPlaceSelect: (placeId: string) => void;
  onSignalSelect: (signalId: string) => void;
  selectedPlaceId: string | null;
  selectedSignalId: string | null;
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
