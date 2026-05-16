"use client";

import { useMemo, useCallback } from "react";
import { Map, NavigationControl, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import type { PickingInfo } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import { ensurePmtilesProtocol } from "@/lib/atlas/pmtiles";
import type {
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
import { ATLAS_DECK_LAYER_IDS } from "@/lib/atlas/renderer-bridge";
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

/* ------------------------------------------------------------------ */
/*  Color palettes                                                     */
/* ------------------------------------------------------------------ */

/** RGBA tuples for place_type fill colors. */
const PLACE_TYPE_FILL: Record<string, [number, number, number, number]> = {
  ward: [59, 130, 246, 100], // blue
  parcel: [217, 162, 59, 80], // amber
  building: [140, 140, 150, 80], // gray
  infrastructure: [45, 166, 153, 90], // teal
};
const PLACE_TYPE_FILL_DEFAULT: [number, number, number, number] = [
  120, 120, 130, 60,
];

/** RGBA tuples for place_type line colors (stronger alpha). */
const PLACE_TYPE_LINE: Record<string, [number, number, number, number]> = {
  ward: [59, 130, 246, 180],
  parcel: [217, 162, 59, 160],
  building: [140, 140, 150, 140],
  infrastructure: [45, 166, 153, 160],
};
const PLACE_TYPE_LINE_DEFAULT: [number, number, number, number] = [
  120, 120, 130, 120,
];

/** Selected feature highlight. */
const SELECTED_LINE: [number, number, number, number] = [193, 74, 44, 240];

/** RGBA tuples for event_type dot colors. */
const EVENT_TYPE_COLOR: Record<string, [number, number, number]> = {
  infrastructure_change: [59, 130, 246],
  environmental: [45, 166, 153],
  policy: [217, 162, 59],
  health: [220, 80, 80],
  community: [160, 100, 220],
};
const EVENT_TYPE_COLOR_DEFAULT: [number, number, number] = [140, 140, 150];

const LENS_FILL_TINT: Record<AtlasLensId, [number, number, number, number]> = {
  explore: [193, 132, 58, 34],
  memory: [193, 74, 44, 44],
  safety: [56, 132, 128, 44],
  interventions: [82, 126, 82, 46],
};

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

function lensFillColor(
  placeType: string,
  activeLens: AtlasLensId,
): [number, number, number, number] {
  const base = PLACE_TYPE_FILL[placeType] ?? PLACE_TYPE_FILL_DEFAULT;
  const tint = LENS_FILL_TINT[activeLens];
  return [
    Math.round(base[0] * 0.72 + tint[0] * 0.28),
    Math.round(base[1] * 0.72 + tint[1] * 0.28),
    Math.round(base[2] * 0.72 + tint[2] * 0.28),
    Math.max(base[3], tint[3]),
  ];
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
  onPlaceSelect: (placeId: string) => void;
  selectedPlaceId: string | null;
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
  onPlaceSelect,
  selectedPlaceId,
  layerVisibility,
  viewMode = "oblique",
  activeLens = "explore",
  className,
}: AtlasMapProps) {
  ensurePmtilesProtocol();
  const camera = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].camera;

  const geometricPlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!places) return null;
    return {
      ...places,
      features: places.features.filter(hasGeometry),
    };
  }, [places]);

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

  /* ---- Selected feature (separate GeoJSON for highlight ring) ----- */
  const selectedFeatureCollection = useMemo<GeometricPlacesCollection | null>(() => {
    if (!selectedPlaceId || !geometricPlaces) return null;
    const feature = geometricPlaces.features.find(
      (f) => f.properties.place_id === selectedPlaceId,
    );
    if (!feature) return null;
    return { type: "FeatureCollection", features: [feature] };
  }, [selectedPlaceId, geometricPlaces]);

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
    const result: (GeoJsonLayer | ScatterplotLayer)[] = [];

    /* Places polygons/points */
    if (geometricPlaces && layerVisibility.places !== false) {
      result.push(
        new GeoJsonLayer({
          id: ATLAS_DECK_LAYER_IDS.places,
          data: geometricPlaces,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: viewMode !== "atlas",
          wireframe: viewMode !== "atlas",
          lineWidthMinPixels: viewMode === "atlas" ? 1 : 0.7,
          getLineWidth: 1,
          getElevation: (f) => {
            const ft = f as PlaceFeature;
            return placeElevation(ft.properties.place_type, viewMode);
          },
          getFillColor: (f) => {
            const ft = f as PlaceFeature;
            return lensFillColor(ft.properties.place_type, activeLens);
          },
          getLineColor: (f) => {
            const ft = f as PlaceFeature;
            return (
              PLACE_TYPE_LINE[ft.properties.place_type] ??
              PLACE_TYPE_LINE_DEFAULT
            );
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

    /* Selected place highlight */
    if (
      selectedFeatureCollection &&
      layerVisibility.places !== false
    ) {
      result.push(
        new GeoJsonLayer({
          id: ATLAS_DECK_LAYER_IDS.selected,
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

    /* Events as scatter dots */
    if (positionedEvents.length > 0 && layerVisibility.events !== false) {
      result.push(
        new ScatterplotLayer<
          SpatialEvent & { _position: [number, number] }
        >({
          id: ATLAS_DECK_LAYER_IDS.events,
          data: positionedEvents,
          pickable: true,
          opacity: 0.8,
          stroked: true,
          filled: true,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          getPosition: (d) => d._position,
          getRadius: 5,
          getFillColor: (d) =>
            EVENT_TYPE_COLOR[d.event_type] ?? EVENT_TYPE_COLOR_DEFAULT,
          getLineColor: [255, 255, 255],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          onClick: (info) => {
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

    return result;
  }, [
    geometricPlaces,
    positionedEvents,
    selectedFeatureCollection,
    layerVisibility,
    handleClick,
    onPlaceSelect,
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
