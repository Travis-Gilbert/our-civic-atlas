"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import {
  Map,
  NavigationControl,
  useControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import { ensurePmtilesProtocol } from "@/lib/atlas/pmtiles";
import osmBuildings from "@/data/open-flint-atlas/fixtures/osm-buildings.json";
import { createLostFlintDeckLayers } from "@/components/atlas/AtlasLostFlintDeckLayer";
import type { HistoricalReconstruction } from "@/lib/atlas/historical-reconstruction";
import { osmBuildingExistsInYear } from "@/lib/atlas/atlas-time";
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
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import { ATLAS_DECK_LAYER_IDS } from "@/lib/atlas/renderer-bridge";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Soft bounds for the Flint civic world. MapLibre uses these to
 * resist pans that try to drift off the stage. Set wider than the
 * city limits so users keep visible context for Burton, Mt Morris,
 * Flint Township, and the Genesee County frame — without ever fully
 * losing the city as the center of gravity. Coordinates are
 * `[[swLng, swLat], [neLng, neLat]]`, the format MapLibre expects.
 */
const ATLAS_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-83.92, 42.88],
  [-83.5, 43.18],
];

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
  evidence: [95, 111, 163, 42],
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

type BoundsAccumulator = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

function extendBounds(bounds: BoundsAccumulator, lng: number, lat: number) {
  bounds.minLng = Math.min(bounds.minLng, lng);
  bounds.minLat = Math.min(bounds.minLat, lat);
  bounds.maxLng = Math.max(bounds.maxLng, lng);
  bounds.maxLat = Math.max(bounds.maxLat, lat);
}

function collectCoordinateBounds(value: unknown, bounds: BoundsAccumulator) {
  if (!Array.isArray(value) || value.length === 0) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    extendBounds(bounds, Number(value[0]), Number(value[1]));
    return;
  }
  for (const entry of value) {
    collectCoordinateBounds(entry, bounds);
  }
}

function geometryBounds(
  geometry: GeoJSON.Geometry | null | undefined,
): [[number, number], [number, number]] | null {
  if (!geometry) return null;
  const bounds: BoundsAccumulator = {
    minLng: Number.POSITIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };

  if (geometry.type === "GeometryCollection") {
    for (const entry of geometry.geometries) {
      const entryBounds = geometryBounds(entry);
      if (!entryBounds) continue;
      extendBounds(bounds, entryBounds[0][0], entryBounds[0][1]);
      extendBounds(bounds, entryBounds[1][0], entryBounds[1][1]);
    }
  } else {
    collectCoordinateBounds(geometry.coordinates, bounds);
  }

  if (
    !Number.isFinite(bounds.minLng) ||
    !Number.isFinite(bounds.minLat) ||
    !Number.isFinite(bounds.maxLng) ||
    !Number.isFinite(bounds.maxLat)
  ) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}

function inflateBounds(
  bounds: [[number, number], [number, number]],
  lngRatio: number,
  latRatio: number,
): [[number, number], [number, number]] {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const lngPad = (maxLng - minLng || 0.01) * lngRatio;
  const latPad = (maxLat - minLat || 0.01) * latRatio;

  return [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
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

/** Default building height in meters when OSM tags are missing. */
const OSM_DEFAULT_HEIGHT_M = 6;
/** Hard cap for OSM heights. The Mott Foundation Building (Flint's tallest)
 * is ~65 m; anything taller is almost certainly an OSM tagging error
 * (warehouse with `levels=50`). */
const OSM_MAX_HEIGHT_M = 80;

type OsmFootprintProperties = {
  osm_id?: number;
  building?: string | null;
  name?: string | null;
  height_meters?: number | null;
  levels?: number | null;
  /**
   * Construction date from OSM tags (`start_date` /
   * `building:start_date`). Typed as `string | null` because the
   * fixture stores the raw OSM string ("1898", "c.1900", "1900s")
   * rather than a parsed number — `parseHistoricalYear` in
   * `atlas-time.ts` is the canonical reader for these values.
   */
  year_built?: string | null;
};

function osmBuildingHeight(props: OsmFootprintProperties): number {
  const raw =
    props.height_meters ??
    (props.levels != null ? props.levels * 3 : OSM_DEFAULT_HEIGHT_M);
  return Math.min(OSM_MAX_HEIGHT_M, Math.max(2, raw));
}

function osmBuildingElevation(
  props: OsmFootprintProperties,
  viewMode: AtlasSceneViewModeId,
): number {
  const mode = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  if (mode.extrusionScale === 0) return 0;
  return osmBuildingHeight(props) * mode.extrusionScale;
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
  mobileSurface?: MobileRuntimeSurfaceId;
  initialBounds?: [[number, number], [number, number]] | null;
  viewMode?: AtlasSceneViewModeId;
  activeLens?: AtlasLensId;
  className?: string;
  /**
   * Hand the underlying MapLibre `MapRef` to the parent so chrome
   * components (compass, view controls, scene focus) can read camera
   * state and dispatch imperative actions like `easeTo`. The ref is
   * stable for the lifetime of the map instance; callers should not
   * persist it across `viewMode` changes (the inner `Map` remounts
   * via its `key`).
   */
  onMapReady?: (map: MapRef | null) => void;
  /**
   * Active atlas year for time-travel rendering. `null` means
   * "today" (default): OSM buildings show in full, Lost Flint
   * reconstructions stay hidden. A number flips the renderer into
   * its time filter: OSM buildings built after `atlasYear` are
   * removed, and Lost Flint reconstructions whose lifespan covers
   * the year appear in their place. The chrome derives this from
   * a 4-digit year typed into the search field (`parseAtlasYear`).
   */
  atlasYear?: number | null;
  /**
   * Override for the Lost Flint reconstruction array. When omitted,
   * `createLostFlintDeckLayers` falls back to its in-file fixture
   * (`FLINT_LOST_RECONSTRUCTIONS`). Supplied by the Phase 3 routes
   * (`/lost-flint/<bookmark>`) via `useHistoricalReconstructions`,
   * which fetches `/atlas/historical/<bookmark>.json`. The data
   * path is wired identically to how the eventual GraphQL fetch
   * will work; swapping the source is a one-line change in the
   * hook.
   */
  historicalReconstructions?: HistoricalReconstruction[];
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
  mobileSurface = "leaflet_baseline",
  initialBounds = null,
  viewMode = "oblique",
  activeLens = "explore",
  className,
  onMapReady,
  atlasYear = null,
  historicalReconstructions,
}: AtlasMapProps) {
  ensurePmtilesProtocol();
  const camera = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].camera;
  const mapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const appliedMobileFitKeyRef = useRef<string | null>(null);

  const geometricPlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!places) return null;
    return {
      ...places,
      features: places.features.filter(hasGeometry),
    };
  }, [places]);

  const computedBounds = useMemo(() => {
    if (!geometricPlaces) return null;
    const bounds: BoundsAccumulator = {
      minLng: Number.POSITIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    };

    for (const feature of geometricPlaces.features) {
      const featureBounds = geometryBounds(feature.geometry);
      if (!featureBounds) continue;
      extendBounds(bounds, featureBounds[0][0], featureBounds[0][1]);
      extendBounds(bounds, featureBounds[1][0], featureBounds[1][1]);
    }

    if (
      !Number.isFinite(bounds.minLng) ||
      !Number.isFinite(bounds.minLat) ||
      !Number.isFinite(bounds.maxLng) ||
      !Number.isFinite(bounds.maxLat)
    ) {
      return null;
    }

    return [
      [bounds.minLng, bounds.minLat],
      [bounds.maxLng, bounds.maxLat],
    ] as [[number, number], [number, number]];
  }, [geometricPlaces]);

  const mobileContextBounds = initialBounds ?? computedBounds;

  useEffect(() => {
    // The map instance no longer remounts on `viewMode` change (the
    // `<Map>` key was removed in favour of smooth camera choreography
    // via `easeTo`). We still reset the mobile-fit applied key so the
    // bounds-fit logic re-runs for the new view's framing.
    appliedMobileFitKeyRef.current = null;
  }, [viewMode]);

  // Camera choreography on view-mode change is owned by the parent
  // (`OpenFlintAtlasScene`) so it can coordinate with camera
  // bookmarks and avoid racing with `Map.onLoad`. AtlasMap supplies
  // only the initial framing via `initialViewState`; all subsequent
  // camera moves arrive via the `MapRef` handed up through
  // `onMapReady`.

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    if (mobileSurface !== "deck_mobile_candidate") return;
    if (viewMode !== "atlas") return;
    if (!mobileContextBounds) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const fitKey = [
      viewMode,
      mobileContextBounds[0][0],
      mobileContextBounds[0][1],
      mobileContextBounds[1][0],
      mobileContextBounds[1][1],
    ].join(":");

    if (appliedMobileFitKeyRef.current === fitKey) {
      return;
    }

    mapRef.current.fitBounds(inflateBounds(mobileContextBounds, 0.08, 0.12), {
      padding: { top: 92, bottom: 112, left: 20, right: 20 },
      duration: 0,
      pitch: 0,
      bearing: 0,
      maxZoom: 10.75,
    });
    appliedMobileFitKeyRef.current = fitKey;
  }, [mapLoaded, mobileContextBounds, mobileSurface, viewMode]);

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

  /**
   * Year-filtered OSM building collection. When `atlasYear === null`
   * we hand the full fixture straight to deck.gl so no work happens
   * on the today-path. When a year is set we filter once per
   * year-change; deck.gl's GeoJsonLayer rebuilds its tessellation
   * against the smaller feature set, which is cheaper than passing
   * 21k features and discarding most of them in a shader filter.
   *
   * The data import has a `metadata` field on top of the standard
   * GeoJSON `FeatureCollection` shape, so we cast through `unknown`
   * to get back to a clean FeatureCollection without TypeScript
   * complaining about the extra field.
   */
  const visibleOsmBuildings = useMemo<GeoJSON.FeatureCollection>(() => {
    const source = osmBuildings as unknown as GeoJSON.FeatureCollection;
    if (atlasYear === null) return source;
    return {
      ...source,
      features: source.features.filter((feature) =>
        osmBuildingExistsInYear(
          feature.properties as OsmFootprintProperties,
          atlasYear,
        ),
      ),
    };
  }, [atlasYear]);

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
    const result: Layer[] = [];

    /* OSM building footprints — extruded in non-atlas (3D) view modes.
     * Renders 6671 Flint buildings from Carriage Town + downtown as warm
     * stone volumes. Heights come from OSM `height` or `building:levels * 3`,
     * capped at 80 m. */
    if (
      viewMode !== "atlas" &&
      layerVisibility.osmBuildings !== false &&
      layerVisibility.buildings !== false
    ) {
      result.push(
        new GeoJsonLayer({
          id: ATLAS_DECK_LAYER_IDS.osmBuildings,
          data: visibleOsmBuildings,
          pickable: true,
          stroked: false,
          filled: true,
          extruded: true,
          wireframe: false,
          getElevation: (f) =>
            osmBuildingElevation(
              (f as GeoJSON.Feature).properties as OsmFootprintProperties,
              viewMode,
            ),
          // In time-travel mode the OSM buildings represent "what
          // still existed in this year." We dim the saturation
          // slightly (lower alpha) so the ghost layer reads as the
          // foreground subject, with surviving OSM as the period
          // context behind it. Today-mode keeps the full warm-stone
          // alpha for solid presence.
          getFillColor:
            atlasYear === null ? [122, 94, 74, 230] : [122, 94, 74, 180],
          getLineColor: [82, 64, 50, 200],
          material: {
            ambient: 0.58,
            diffuse: 0.48,
            shininess: 12,
            specularColor: [232, 215, 188],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear === null],
          },
        }),
      );
    }

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

    /* Lost Flint historical reconstructions. Each reconstruction is
     * dispatched to a renderer by what artifact it carries:
     *   - geometry_url null → ConfidenceMixMeshLayer (procedural box
     *     with per-fragment faithful/porcelain scatter)
     *   - geometry_url .glb / .gltf → ScenegraphLayer
     *   - splat / ply assets fall through to the procedural box
     *     until a dedicated splat layer ships
     *
     * Lost Flint is gated on the active atlas year: by definition
     * these buildings no longer exist today, so the today-mode
     * (`atlasYear === null`) hides them entirely. Time-travel mode
     * filters reconstructions whose recorded lifespan covers the
     * typed year — that's the trigger Travis described: type a
     * year, watch the city as it stood. */
    if (
      viewMode !== "atlas" &&
      layerVisibility.lostFlint !== false &&
      atlasYear !== null
    ) {
      result.push(
        ...createLostFlintDeckLayers({
          viewMode,
          atlasYear,
          reconstructions: historicalReconstructions,
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
    atlasYear,
    historicalReconstructions,
    visibleOsmBuildings,
  ]);

  /* ---- Render ----------------------------------------------------- */
  return (
    <div
      className={cn("atlas-scene-map relative w-full h-full", className)}
      data-atlas-view-mode={viewMode}
      data-atlas-lens={activeLens}
      data-mobile-surface={mobileSurface}
    >
      <Map
        ref={(instance: MapRef | null) => {
          mapRef.current = instance;
          // Hand the live MapRef up so chrome components can read the
          // bearing/pitch/zoom and trigger imperative camera moves
          // (compass reset, fly-to bookmarks, etc.) without needing
          // their own ref into MapLibre.
          if (onMapReady) onMapReady(instance);
        }}
        initialViewState={camera}
        maxBounds={ATLAS_MAX_BOUNDS}
        maxPitch={75}
        minZoom={10.5}
        maxZoom={19}
        mapStyle={BASEMAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        onLoad={() => setMapLoaded(true)}
        reuseMaps
      >
        <DeckGLOverlay layers={layers} />
        <NavigationControl position="bottom-right" />
      </Map>

      {/*
        Civic-world vignette. A radial gradient sits above the basemap
        and below the chrome (z-index between the deck.gl overlay and
        the AtlasShell controls). The gradient fades from transparent
        at the screen centre to a warm earth-tone at the edges,
        giving Flint the visual identity of a stage rather than a
        slice of an infinite world map. Pointer-events:none so it
        never intercepts map gestures.
       */}
      <div
        aria-hidden="true"
        className="atlas-scene-vignette pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(circle at 50% 52%, rgba(246,244,238,0) 0%, rgba(246,244,238,0) 38%, rgba(46,34,22,0.08) 62%, rgba(34,24,14,0.22) 88%, rgba(28,20,12,0.32) 100%)",
        }}
      />
    </div>
  );
}
