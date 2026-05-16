"use client";

import { useMemo, useCallback } from "react";
import { Map, NavigationControl, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import type { PickingInfo } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import { ensurePmtilesProtocol } from "@/lib/atlas/pmtiles";
import type {
  FreshSignal,
  PlacesCollection,
  PlaceFeature,
  PlaceProperties,
  SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import {
  getAtlasBoundaryMaskFeature,
  getAtlasBoundaryOutlineFeature,
  getAtlasContextBbox,
  getAtlasViewCamera,
} from "@/lib/atlas/atlas-boundary";
import {
  getEventFillColor,
  getPlaceFillColor,
  getPlaceLineColor,
  getSignalFillColor,
} from "@/lib/atlas/visual-grammar";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-base",
      type: "raster",
      source: "carto",
      paint: {
        "raster-opacity": 0.74,
        "raster-saturation": -0.18,
        "raster-contrast": 0.08,
      },
    },
  ],
};

type GeometricPlaceFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  PlaceProperties
>;
type GeometricPlacesCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  PlaceProperties
>;

type AtlasLabelPoint = {
  id: string;
  label: string;
  placeType: string;
  position: [number, number];
};
/** Selected feature highlight. */
const SELECTED_LINE: [number, number, number, number] = [193, 74, 44, 240];

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute a rough centroid for a GeoJSON geometry.
 * For points, returns the coordinates directly.
 * For polygons/multipolygons, averages the first ring.
 */
function geometryCentroid(
  geometry: GeoJSON.Geometry | null | undefined,
): [number, number] | null {
  if (!geometry) return null;

  if (geometry.type === "Point") {
    return geometry.coordinates as [number, number];
  }
  if (geometry.type === "Polygon" && geometry.coordinates[0]) {
    const ring = geometry.coordinates[0];
    let lngSum = 0;
    let latSum = 0;
    for (const [lng, lat] of ring) {
      lngSum += lng;
      latSum += lat;
    }
    return [lngSum / ring.length, latSum / ring.length];
  }
  if (geometry.type === "MultiPolygon" && geometry.coordinates[0]?.[0]) {
    const ring = geometry.coordinates[0][0];
    let lngSum = 0;
    let latSum = 0;
    for (const [lng, lat] of ring) {
      lngSum += lng;
      latSum += lat;
    }
    return [lngSum / ring.length, latSum / ring.length];
  }
  return null;
}

function hasGeometry(feature: PlaceFeature): feature is GeometricPlaceFeature {
  return feature.geometry !== null;
}

function placeElevation(placeType: string, viewMode: AtlasSceneViewModeId) {
  const mode = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  if (mode.extrusionScale === 0) return 0;

  const baseElevation =
    {
      ward: 38,
      parcel: 18,
      building: 92,
      infrastructure: 72,
    }[placeType] ?? 26;

  return baseElevation * mode.extrusionScale;
}

/* ------------------------------------------------------------------ */
/*  DeckGL overlay hook                                                */
/* ------------------------------------------------------------------ */

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay(props),
  );
  overlay.setProps(props);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AtlasMapProps = {
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
/*  AtlasMap                                                           */
/* ------------------------------------------------------------------ */

export function AtlasMap({
  places,
  events,
  signals,
  onPlaceSelect,
  onSignalSelect,
  selectedPlaceId,
  selectedSignalId,
  layerVisibility,
  viewMode = "oblique",
  activeLens = "explore",
  className,
}: AtlasMapProps) {
  ensurePmtilesProtocol();
  const camera = getAtlasViewCamera(viewMode);
  const contextBbox = getAtlasContextBbox();
  const boundaryMask = useMemo(() => getAtlasBoundaryMaskFeature(), []);
  const boundaryOutline = useMemo(() => getAtlasBoundaryOutlineFeature(), []);

  const geometricPlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!places) return null;
    return {
      ...places,
      features: places.features.filter(hasGeometry),
    };
  }, [places]);

  const visiblePlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!geometricPlaces) return null;

    return {
      ...geometricPlaces,
      features: geometricPlaces.features.filter((feature) => {
        const placeType = feature.properties.place_type;
        if (placeType === "ward") return layerVisibility.wards !== false;
        if (placeType === "corridor") {
          return layerVisibility.infrastructure !== false;
        }
        return layerVisibility.places !== false;
      }),
    };
  }, [geometricPlaces, layerVisibility]);

  /* ---- Build a place centroid lookup for positioning events -------- */
  const placeCentroids = useMemo(() => {
    const lookup: globalThis.Map<string, [number, number]> =
      new globalThis.Map();
    if (!geometricPlaces) return lookup;
    for (const feature of geometricPlaces.features) {
      const centroid = geometryCentroid(feature.geometry);
      if (centroid) {
        lookup.set(feature.properties.place_id, centroid);
      }
    }
    return lookup;
  }, [geometricPlaces]);

  const localLabels = useMemo<AtlasLabelPoint[]>(() => {
    if (!visiblePlaces) return [];

    return visiblePlaces.features
      .filter((feature) => {
        const placeType = feature.properties.place_type;
        if (placeType === "city" || placeType === "corridor") return true;
        if (placeType === "ward") return viewMode !== "street";
        return false;
      })
      .map((feature) => {
        const position = geometryCentroid(feature.geometry);
        if (!position) return null;

        return {
          id: feature.properties.place_id,
          label:
            feature.properties.place_type === "city"
              ? "Flint civic boundary"
              : feature.properties.name,
          placeType: feature.properties.place_type,
          position,
        };
      })
      .filter((value): value is AtlasLabelPoint => value !== null);
  }, [visiblePlaces, viewMode]);

  /* ---- Positioned events (only those whose place has geometry) ---- */
  const positionedEvents = useMemo(() => {
    return events
      .map((ev) => {
        const pos = placeCentroids.get(ev.place.place_id);
        if (!pos) return null;
        return { ...ev, _position: pos };
      })
      .filter(
        (e): e is SpatialEvent & { _position: [number, number] } =>
          e !== null,
      );
  }, [events, placeCentroids]);

  const positionedSignals = useMemo(() => {
    return signals
      .map((signal) => {
        if (
          signal.geometry?.type === "Point" &&
          Array.isArray(signal.geometry.coordinates)
        ) {
          const [lng, lat] = signal.geometry.coordinates as [number, number];
          return { ...signal, _position: [lng, lat] as [number, number] };
        }

        if (!signal.place_id) return null;
        const position = placeCentroids.get(signal.place_id);
        if (!position) return null;
        return { ...signal, _position: position };
      })
      .filter(
        (signal): signal is FreshSignal & { _position: [number, number] } =>
          signal !== null,
      );
  }, [signals, placeCentroids]);

  /* ---- Selected feature (separate GeoJSON for highlight ring) ----- */
  const selectedFeatureCollection = useMemo<GeometricPlacesCollection | null>(() => {
    if (!selectedPlaceId || !visiblePlaces) return null;
    const feature = visiblePlaces.features.find(
      (f) => f.properties.place_id === selectedPlaceId,
    );
    if (!feature) return null;
    return { type: "FeatureCollection", features: [feature] };
  }, [selectedPlaceId, visiblePlaces]);

  /* ---- Click handler ---------------------------------------------- */
  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) return;
      const props = (info.object as PlaceFeature).properties;
      if (props?.place_id) {
        onPlaceSelect(props.place_id);
      }
    },
    [onPlaceSelect],
  );

  /* ---- Layers ----------------------------------------------------- */
  const layers = useMemo(() => {
    const result: (GeoJsonLayer | ScatterplotLayer | TextLayer<AtlasLabelPoint>)[] = [];

    result.push(
      new GeoJsonLayer({
        id: "atlas-boundary-mask",
        data: boundaryMask,
        pickable: false,
        stroked: false,
        filled: true,
        getFillColor: [246, 244, 238, 138],
      }),
    );

    /* Places polygons/points */
    if (visiblePlaces && visiblePlaces.features.length > 0) {
      result.push(
        new GeoJsonLayer<GeometricPlaceFeature>({
          id: "atlas-places",
          data: visiblePlaces,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: viewMode !== "atlas",
          wireframe: viewMode !== "atlas",
          lineWidthMinPixels: viewMode === "atlas" ? 1 : 0.7,
          getLineWidth: 1,
          getElevation: (feature) => {
            const place = feature as unknown as PlaceFeature;
            return placeElevation(place.properties.place_type, viewMode);
          },
          getFillColor: (feature) => {
            const place = feature as unknown as PlaceFeature;
            return getPlaceFillColor(place.properties.place_type, activeLens);
          },
          getLineColor: (feature) => {
            const place = feature as unknown as PlaceFeature;
            return getPlaceLineColor(place.properties.place_type);
          },
          getPointRadius: 6,
          pointRadiusMinPixels: 4,
          pointRadiusMaxPixels: 12,
          material: {
            ambient: 0.62,
            diffuse: 0.42,
            shininess: 18,
            specularColor: [255, 239, 215],
          },
          onClick: handleClick,
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [activeLens],
            getLineColor: [],
          },
        }),
      );
    }

    result.push(
      new GeoJsonLayer({
        id: "atlas-boundary-outline",
        data: boundaryOutline,
        pickable: false,
        stroked: true,
        filled: false,
        lineWidthMinPixels: viewMode === "atlas" ? 2.6 : 2.2,
        getLineWidth: 2.6,
        getLineColor: [42, 36, 25, 186],
      }),
    );

    /* Selected place highlight */
    if (selectedFeatureCollection && layerVisibility.places !== false) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-selected",
          data: selectedFeatureCollection,
          pickable: false,
          stroked: true,
          filled: false,
          lineWidthMinPixels: 3,
          getLineWidth: 3,
          getLineColor: SELECTED_LINE,
          getPointRadius: 10,
          pointRadiusMinPixels: 6,
        }),
      );
    }

    if (localLabels.length > 0) {
      result.push(
        new TextLayer<AtlasLabelPoint>({
          id: "atlas-local-labels",
          data: localLabels,
          pickable: false,
          billboard: false,
          characterSet: "auto",
          getPosition: (label) => label.position,
          getText: (label) => label.label,
          getSize: (label) => {
            if (label.placeType === "city") return 18;
            if (label.placeType === "corridor") return 14;
            return 12;
          },
          getColor: (label) => {
            if (label.placeType === "city") return [42, 36, 25, 220];
            if (label.placeType === "corridor") return [193, 74, 44, 214];
            return [90, 84, 72, 188];
          },
          getAngle: (label) => (label.placeType === "corridor" ? -12 : 0),
          getTextAnchor: "middle",
          getAlignmentBaseline: "center",
          fontFamily: "var(--font-sans), sans-serif",
          fontWeight: 700,
          sizeUnits: "pixels",
          sizeMinPixels: 11,
          sizeMaxPixels: 24,
        }),
      );
    }

    /* Events as scatter dots */
    if (positionedEvents.length > 0 && layerVisibility.events !== false) {
      result.push(
        new ScatterplotLayer<
          SpatialEvent & { _position: [number, number] }
        >({
          id: "atlas-events",
          data: positionedEvents,
          pickable: true,
          opacity: 0.8,
          stroked: true,
          filled: true,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          getPosition: (event) => event._position,
          getRadius: 5,
          getFillColor: (event) =>
            getEventFillColor(event.event_type),
          getLineColor: [255, 255, 255],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          onClick: (
            info: PickingInfo<SpatialEvent & { _position: [number, number] }>,
          ) => {
            const ev = info.object as
              | (SpatialEvent & { _position: [number, number] })
              | undefined;
            if (ev?.place.place_id) {
              onPlaceSelect(ev.place.place_id);
            }
          },
          updateTriggers: {
            getFillColor: [],
          },
        }),
      );
    }

    if (positionedSignals.length > 0 && layerVisibility.freshSignals !== false) {
      result.push(
        new ScatterplotLayer<
          FreshSignal & { _position: [number, number] }
        >({
          id: "atlas-fresh-signals",
          data: positionedSignals,
          pickable: true,
          opacity: 0.92,
          stroked: true,
          filled: true,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          getPosition: (signal) => signal._position,
          getRadius: (signal) =>
            signal.signal_id === selectedSignalId ? 9 : 7,
          getFillColor: (signal) =>
            getSignalFillColor(signal.signal_kind),
          getLineColor: [255, 255, 255],
          getLineWidth: (signal) =>
            signal.signal_id === selectedSignalId ? 2 : 1,
          lineWidthMinPixels: 1,
          onClick: (
            info: PickingInfo<FreshSignal & { _position: [number, number] }>,
          ) => {
            const signal = info.object as
              | (FreshSignal & { _position: [number, number] })
              | undefined;
            if (!signal) return;
            onSignalSelect(signal.signal_id);
          },
        }),
      );
    }

    return result;
  }, [
    boundaryMask,
    boundaryOutline,
    visiblePlaces,
    positionedEvents,
    positionedSignals,
    selectedFeatureCollection,
    localLabels,
    layerVisibility,
    handleClick,
    onPlaceSelect,
    onSignalSelect,
    selectedSignalId,
    viewMode,
    activeLens,
  ]);

  /* ---- Render ----------------------------------------------------- */
  return (
    <div
      className={cn("atlas-scene-map relative w-full h-full", className)}
      data-atlas-view-mode={viewMode}
      data-atlas-lens={activeLens}
    >
      <Map
        key={viewMode}
        initialViewState={camera}
        maxBounds={[
          [contextBbox[0], contextBbox[1]],
          [contextBbox[2], contextBbox[3]],
        ]}
        minZoom={ATLAS_SCENE_VIEW_MODE_LOOKUP.atlas.camera.zoom - 1.15}
        maxZoom={16.8}
        maxPitch={75}
        mapStyle={BASEMAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
      >
        <DeckGLOverlay layers={layers} />
        <NavigationControl position="bottom-right" />
      </Map>
    </div>
  );
}
