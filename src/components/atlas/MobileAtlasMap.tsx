"use client";

/**
 * MobileAtlasMap — Leaflet-backed atlas map for phone-class devices.
 *
 * The default desktop ``AtlasMap`` runs MapLibre + deck.gl which is
 * great on a laptop GPU but heavy on a phone: WebGL2 with a deck.gl
 * overlay can stall low-end Android Chrome, drain battery, and ship
 * ~400 KB of GL plumbing the user does not need on a small screen.
 *
 * The mobile branch is much smaller:
 *   - ``react-leaflet`` over Leaflet 1.9.x — Canvas/SVG tile rendering,
 *     no GPU dependency, well-tested on iOS Safari + Android Chrome.
 *   - One ``TileLayer`` from CARTO Positron (same basemap as desktop, so
 *     the visual identity stays consistent across breakpoints).
 *   - ``GeoJSON`` layer for places using polygon style derived from
 *     place_type. Polygons stay interactive (tap-to-select).
 *   - ``CircleMarker`` per spatial event positioned at the place
 *     centroid; color comes from event_type, radius is fixed.
 *
 * The props interface is intentionally identical to ``AtlasMapProps``
 * so the page-level ``ResponsiveAtlasMap`` can swap implementations
 * without rippling changes through the rest of the atlas.
 *
 * SSR safety: Leaflet touches ``window`` at module evaluation, so any
 * caller MUST dynamic-import this component with ``ssr: false`` (see
 * ResponsiveAtlasMap.tsx). The component file itself does not guard;
 * it assumes a browser environment.
 */

import { useMemo, useCallback, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import {
  circleMarker as leafletCircleMarker,
  type LatLng,
  type LeafletMouseEvent,
  type PathOptions,
} from "leaflet";
import type {
  FreshSignal,
  PlacesCollection,
  PlaceFeature,
  PlaceProperties,
  SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import {
  getEventFillCss,
  getPlaceFillCss,
  getPlaceLineCss,
  getSignalFillCss,
} from "@/lib/atlas/visual-grammar";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FLINT_CENTER: [number, number] = [43.0125, -83.6875];
const DEFAULT_ZOOM = 11; // one level less than desktop to give the small
// viewport more context

const CARTO_POSITRON_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_POSITRON_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

type GeometricPlaceFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  PlaceProperties
>;
type GeometricPlacesCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  PlaceProperties
>;

const SELECTED_STROKE = "#c14a2c";

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

function geometryCentroid(
  geometry: GeoJSON.Geometry | null | undefined,
): [number, number] | null {
  if (!geometry) return null;

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as [number, number];
    return [lat, lng];
  }
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!ring?.length) return null;
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLat / ring.length, sumLng / ring.length];
  }
  if (geometry.type === "MultiPolygon") {
    return geometryCentroid({
      type: "Polygon",
      coordinates: geometry.coordinates[0],
    } as GeoJSON.Polygon);
  }
  return null;
}

function hasGeometry(feature: PlaceFeature): feature is GeometricPlaceFeature {
  return feature.geometry !== null;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type MobileAtlasMapProps = {
  places: PlacesCollection | null;
  events: SpatialEvent[];
  signals: FreshSignal[];
  onPlaceSelect: (placeId: string) => void;
  onSignalSelect: (signalId: string) => void;
  selectedPlaceId: string | null;
  selectedSignalId: string | null;
  layerVisibility: Record<string, boolean>;
  viewMode?: AtlasSceneViewModeId;
  activeLens?: AtlasLensId;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MobileAtlasMap({
  places,
  events,
  signals,
  onPlaceSelect,
  onSignalSelect,
  selectedPlaceId,
  selectedSignalId,
  layerVisibility,
  viewMode = "atlas",
  activeLens = "explore",
  className,
}: MobileAtlasMapProps) {
  const [mapInstanceKey] = useState(
    () => `mobile-atlas-${Math.random().toString(36).slice(2)}`,
  );
  const geometricPlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!places) return null;
    return {
      ...places,
      features: places.features.filter(hasGeometry),
    };
  }, [places]);

  /* Place centroid lookup so events render at their place's location. */
  const placeCentroids = useMemo(() => {
    const lookup = new globalThis.Map<string, [number, number]>();
    if (!geometricPlaces) return lookup;
    for (const feature of geometricPlaces.features) {
      const c = geometryCentroid(feature.geometry);
      if (c) lookup.set(feature.properties.place_id, c);
    }
    return lookup;
  }, [geometricPlaces]);

  /* Style each GeoJSON feature based on place_type + selection. */
  const styleForFeature = useCallback(
    (feature?: PlaceFeature): PathOptions => {
      const placeType = feature?.properties.place_type ?? "";
      const isSelected =
        !!selectedPlaceId &&
        feature?.properties.place_id === selectedPlaceId;
      return {
        color: isSelected
          ? SELECTED_STROKE
          : getPlaceLineCss(placeType),
        weight: isSelected ? 2.4 : 1.2,
        fillColor: getPlaceFillCss(placeType, activeLens),
        fillOpacity: 1, // the rgba already encodes the alpha
        opacity: 1,
      };
    },
    [activeLens, selectedPlaceId],
  );

  /* Attach a click handler per feature without rebuilding the whole
     GeoJSON layer on every render. */
  const onEachFeature = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (feature: any, layer: any) => {
      const placeId = feature?.properties?.place_id;
      if (!placeId) return;
      layer.on("click", (ev: LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation?.();
        onPlaceSelect(placeId);
      });
      if (feature?.properties?.name) {
        layer.bindTooltip(feature.properties.name, {
          direction: "top",
          opacity: 0.9,
        });
      }
    },
    [onPlaceSelect],
  );

  const pointToLayer = useCallback(
    (feature: GeoJSON.Feature, latlng: LatLng) =>
      leafletCircleMarker(latlng, {
        ...styleForFeature(feature as PlaceFeature),
        radius: 7,
      }),
    [styleForFeature],
  );

  /* Only render the GeoJSON layer when places are present AND visible. */
  const showPlaces = !!geometricPlaces && layerVisibility.places !== false;
  const showEvents = layerVisibility.events !== false;
  const showSignals = layerVisibility.freshSignals !== false;

  /* React-leaflet's GeoJSON memoizes by the data prop reference; key
     it by feature count so toggling layers actually rebuilds. */
  const placesKey = useMemo(
    () =>
      `places-${geometricPlaces?.features.length ?? 0}-${selectedPlaceId ?? ""}`,
    [geometricPlaces, selectedPlaceId],
  );

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden", className)}
      data-mobile-atlas-map="true"
      data-atlas-view-mode={viewMode}
      data-atlas-lens={activeLens}
    >
      <MapContainer
        key={mapInstanceKey}
        center={FLINT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        attributionControl
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution={CARTO_POSITRON_ATTRIBUTION}
          url={CARTO_POSITRON_TILE_URL}
          maxZoom={19}
        />

        {showPlaces && geometricPlaces && (
          <GeoJSON
            key={placesKey}
            data={geometricPlaces as GeoJSON.FeatureCollection}
            style={(feature?: GeoJSON.Feature) =>
              styleForFeature(feature as PlaceFeature)
            }
            onEachFeature={onEachFeature}
            pointToLayer={pointToLayer}
          />
        )}

        {showEvents &&
          events.map((event) => {
            const placeId = event.place?.place_id;
            const center = placeId ? placeCentroids.get(placeId) : null;
            if (!center) return null;
            const fill =
              getEventFillCss(event.event_type ?? "");
            return (
              <CircleMarker
                key={event.event_id}
                center={center}
                radius={6}
                pathOptions={{
                  color: fill,
                  weight: 1.5,
                  fillColor: fill,
                  fillOpacity: 0.7,
                  opacity: 1,
                }}
                eventHandlers={{
                  click: () => {
                    if (placeId) onPlaceSelect(placeId);
                  },
                }}
              >
                <Tooltip direction="top" opacity={0.9}>
                  {event.title}
                </Tooltip>
              </CircleMarker>
            );
          })}

        {showSignals &&
          signals.map((signal) => {
            const center =
              signal.geometry?.type === "Point" &&
              Array.isArray(signal.geometry.coordinates)
                ? ([
                    signal.geometry.coordinates[1],
                    signal.geometry.coordinates[0],
                  ] as [number, number])
                : signal.place_id
                  ? placeCentroids.get(signal.place_id)
                  : null;
            if (!center) return null;

            const stroke =
              getSignalFillCss(signal.signal_kind);

            return (
              <CircleMarker
                key={signal.signal_id}
                center={center}
                radius={signal.signal_id === selectedSignalId ? 7 : 6}
                pathOptions={{
                  color: stroke,
                  weight: signal.signal_id === selectedSignalId ? 2 : 1.5,
                  fillColor: stroke,
                  fillOpacity: 0.85,
                  opacity: 1,
                }}
                eventHandlers={{
                  click: () => {
                    onSignalSelect(signal.signal_id);
                  },
                }}
              >
                <Tooltip direction="top" opacity={0.9}>
                  {signal.title}
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
