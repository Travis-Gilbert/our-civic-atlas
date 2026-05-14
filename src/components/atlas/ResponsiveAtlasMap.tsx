"use client";

/**
 * ResponsiveAtlasMap — dispatches between the desktop MapLibre + deck.gl
 * AtlasMap and the mobile Leaflet MobileAtlasMap based on viewport.
 *
 * Behavior:
 *   - `<768px` (Tailwind ``md`` breakpoint): MobileAtlasMap (Leaflet).
 *   - `>=768px`: AtlasMap (MapLibre + deck.gl).
 *   - SSR / first paint: renders nothing until viewport is known, to
 *     avoid hydration mismatch between the server (no window) and the
 *     client (which decides at mount time).
 *
 * Both branches are dynamic-imported with ``ssr: false`` because:
 *   - AtlasMap imports MapLibre which touches WebGL at module load.
 *   - MobileAtlasMap imports Leaflet which touches ``window`` at module
 *     load.
 *
 * The active branch swap on resize is intentional: rotating a tablet
 * across the breakpoint, or a desktop user dragging the window narrow,
 * will swap implementations. Map state (zoom, pan, selection) does not
 * persist across the swap; that's an acceptable trade-off for a
 * breakpoint that rarely fires in real sessions.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type {
  PlacesCollection,
  SpatialEvent,
} from "@/lib/api/openFlintAtlas";

const AtlasMap = dynamic(
  () => import("./AtlasMap").then((m) => m.AtlasMap),
  { ssr: false },
);

const MobileAtlasMap = dynamic(
  () => import("./MobileAtlasMap").then((m) => m.MobileAtlasMap),
  { ssr: false },
);

/** Tailwind ``md`` breakpoint — same boundary the rest of the atlas
    uses for hidden / md:block / md:flex / etc. */
const MOBILE_MAX_WIDTH = 768;

export type ResponsiveAtlasMapProps = {
  places: PlacesCollection | null;
  events: SpatialEvent[];
  onPlaceSelect: (placeId: string) => void;
  selectedPlaceId: string | null;
  layerVisibility: Record<string, boolean>;
  className?: string;
};

function useIsMobileViewport(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();

    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }

    // Safari < 14 fallback
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return isMobile;
}

export function ResponsiveAtlasMap(props: ResponsiveAtlasMapProps) {
  const isMobile = useIsMobileViewport();

  // Before the viewport is known (SSR + initial hydration), render an
  // empty container at the same size so layout doesn't reflow when the
  // chosen branch lands.
  if (isMobile === null) {
    return <div className={props.className} />;
  }

  return isMobile ? <MobileAtlasMap {...props} /> : <AtlasMap {...props} />;
}
