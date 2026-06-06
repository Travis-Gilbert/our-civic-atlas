"use client";

import {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Map,
  NavigationControl,
  useControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import {
  FillStyleExtension,
  PathStyleExtension,
  type FillStyleExtensionProps,
} from "@deck.gl/extensions";
import { animate, createScope, svg } from "animejs";
import buffer from "@turf/buffer";
import difference from "@turf/difference";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import { ensurePmtilesProtocol } from "@/lib/atlas/pmtiles";
import {
  getAtlasBoundaryBbox,
  getAtlasBoundaryOutlineFeature,
} from "@/lib/atlas/atlas-boundary";
import osmBuildings from "@/data/open-flint-atlas/fixtures/osm-buildings.json";
import osmInfrastructure from "@/data/open-flint-atlas/fixtures/osm-infrastructure.json";
import { useRouter } from "next/navigation";
import { createLostFlintDeckLayers } from "@/components/atlas/AtlasLostFlintDeckLayer";
import type { HistoricalReconstruction } from "@/lib/atlas/historical-reconstruction";
import {
  buildAtelierHref,
  resolveAtelierEntryYear,
} from "@/lib/atlas/atelier-route";
import type {
  ScenarioDeltaProperties,
  ScenarioEnvelopeProperties,
  ScenarioEnvelopeType,
} from "@/lib/atlas/scenario-model";
import {
  createUrbanDesignModelCollection,
  type UrbanDesignFormType,
  type UrbanDesignModelProperties,
} from "@/lib/atlas/urban-design-model";
import { BUILDING_FABRIC_LOD } from "@/lib/atlas/building-fabric";
import { osmBuildingExistsInYear } from "@/lib/atlas/atlas-time";
import type {
  PlacesCollection,
  PlaceFeature,
  PlaceProperties,
  SpatialEvent,
  TrafficRealtimeSnapshot,
  TrafficSegmentFeature,
  TrafficSegmentProperties,
} from "@/lib/api/openFlintAtlas";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import type { SelectedBuilding } from "@/lib/atlas/selected-building";
import { ATLAS_DECK_LAYER_IDS } from "@/lib/atlas/renderer-bridge";
import { usePrefersReducedMotion } from "@/lib/atlas/use-prefers-reduced-motion";
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
const EMPTY_DRAG_PAN_BLOCK_LAYER_IDS: readonly string[] = [];

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

/* ------------------------------------------------------------------ */
/*  Bound-world vignette (PR 3)                                        */
/*                                                                     */
/*  Spec docs/design-2026-05-atlas-feel-pass.md PR 3: Flint reads as   */
/*  a bound world floating on paper. The mask is a polygon shaped as  */
/*  (enclosing rect) MINUS (Flint city boundary). When rendered above  */
/*  the basemap raster and below the deck.gl building/place layers,   */
/*  it covers ~80% of the screen with a paper-tone fill, leaving      */
/*  Flint as a punched-through stage where the basemap stays visible. */
/*                                                                     */
/*  Computed once at module load (boundary fixture is static). The    */
/*  enclosing rectangle pads the Flint bbox by 0.5° on all sides —    */
/*  generous enough to cover any practical viewport, cheap enough     */
/*  that the mask polygon stays a handful of vertices.                */
/* ------------------------------------------------------------------ */
/* Cached terracotta boundary outline — the Flint city perimeter as a
 * stroke-only layer. Spec PR 3: terracotta at alpha 180/255, width
 * 1.5px. Module-level so we don't recompute it on every render.
 */
const FLINT_BOUNDARY_OUTLINE_FEATURE_COLLECTION =
  getAtlasBoundaryOutlineFeature();

/* ------------------------------------------------------------------ */
/*  Infrastructure layers (PR 4)                                       */
/*                                                                     */
/*  Parks, water bodies + waterways, rail (active and disused), and    */
/*  highway corridors. Sourced from OSM via                            */
/*  `scripts/fetch-osm-infrastructure.mjs`. Each feature carries a     */
/*  `properties.layer_class` tag so the renderer can partition by      */
/*  class without re-tag-matching every render. Partitioning happens   */
/*  once at module load (the fixture is static). Spec:                 */
/*  docs/design-2026-05-map-body-discipline.md Change 3.               */
/* ------------------------------------------------------------------ */

type InfrastructureLayerClass =
  | "park"
  | "water_body"
  | "water_way"
  | "rail_active"
  | "rail_disused"
  // Highway tiers introduced by PR 5 (buildings-as-sketch). Replaces
  // the prior single "highway_corridor" class with three tiers so
  // the streets layer can render at deliberate per-tier weights.
  | "highway_arterial"
  | "highway_collector"
  | "highway_local";

type InfrastructureFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.LineString,
  { osm_id: number; layer_class: InfrastructureLayerClass; name: string | null }
>;

const OSM_INFRASTRUCTURE = osmInfrastructure as unknown as GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.LineString,
  InfrastructureFeature["properties"]
>;

function partitionInfrastructure(
  klass: InfrastructureLayerClass,
): GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.LineString,
  InfrastructureFeature["properties"]
> {
  return {
    type: "FeatureCollection",
    features: OSM_INFRASTRUCTURE.features.filter(
      (f) => f.properties.layer_class === klass,
    ),
  };
}

const OSM_PARKS = partitionInfrastructure("park");
const OSM_WATER_BODIES = partitionInfrastructure("water_body");
const OSM_WATERWAYS = partitionInfrastructure("water_way");
const OSM_RAIL_ACTIVE = partitionInfrastructure("rail_active");
const OSM_RAIL_DISUSED = partitionInfrastructure("rail_disused");
const OSM_STREETS_ARTERIAL = partitionInfrastructure("highway_arterial");
const OSM_STREETS_COLLECTOR = partitionInfrastructure("highway_collector");
const OSM_STREETS_LOCAL = partitionInfrastructure("highway_local");

const BOUND_WORLD_MASK_FEATURE_COLLECTION = (():
  | GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  | null => {
  const [minLng, minLat, maxLng, maxLat] = getAtlasBoundaryBbox();
  const rect = turfPolygon([
    [
      [minLng - 0.5, minLat - 0.5],
      [maxLng + 0.5, minLat - 0.5],
      [maxLng + 0.5, maxLat + 0.5],
      [minLng - 0.5, maxLat + 0.5],
      [minLng - 0.5, minLat - 0.5],
    ],
  ]);
  const boundary = getAtlasBoundaryOutlineFeature();
  if (!boundary.features.length) return null;
  // Iteratively subtract each boundary feature so a MultiPolygon city
  // limit (rare, but possible) is fully accounted for. `difference`
  // accepts a 2-feature FeatureCollection in turf 7.x; we pass the
  // accumulating mask + the next subtractor on every iteration.
  let mask:
    | GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
    | null = rect;
  for (const feature of boundary.features) {
    if (!mask) break;
    const subtractor = feature as GeoJSON.Feature<
      GeoJSON.Polygon | GeoJSON.MultiPolygon
    >;
    mask = difference(featureCollection([mask, subtractor]));
  }
  if (!mask) return null;
  return { type: "FeatureCollection", features: [mask] };
})();


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

type ProjectedTrafficParticle = {
  id: string;
  pathId: string;
  offset: number;
  durationMs: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx: number;
  ry: number;
  opacity: number;
};

type ProjectedTrafficPath = {
  id: string;
  d: string;
  particles: ProjectedTrafficParticle[];
};

const TRAFFIC_FREE: [number, number, number, number] = [45, 166, 153, 210];
const TRAFFIC_BUILDING: [number, number, number, number] = [217, 162, 59, 226];
const TRAFFIC_HEAVY: [number, number, number, number] = [193, 74, 44, 236];
const TRAFFIC_SELECTED: [number, number, number, number] = [42, 36, 25, 245];
const TRAFFIC_FLOW_SPEED_SCALE = 0.4;
const TRAFFIC_MUTED_TARGET: [number, number, number] = [206, 199, 181];

const LENS_FILL_TINT: Record<AtlasLensId, [number, number, number, number]> = {
  explore: [193, 132, 58, 34],
  memory: [193, 74, 44, 44],
  safety: [56, 132, 128, 44],
  interventions: [82, 126, 82, 46],
  evidence: [95, 111, 163, 42],
};

const ENVELOPE_FILL: Record<ScenarioEnvelopeType, [number, number, number, number]> = {
  adaptive_reuse: [126, 93, 161, 152],
  as_of_right: [84, 112, 122, 118],
  civic_anchor: [193, 74, 44, 164],
  missing_middle: [217, 162, 59, 158],
  mixed_use_infill: [45, 166, 153, 162],
};

const ENVELOPE_LINE: Record<ScenarioEnvelopeType, [number, number, number, number]> = {
  adaptive_reuse: [96, 68, 132, 232],
  as_of_right: [65, 88, 96, 190],
  civic_anchor: [164, 52, 34, 238],
  missing_middle: [170, 119, 41, 232],
  mixed_use_infill: [24, 132, 122, 232],
};

const URBAN_FORM_FILL: Record<UrbanDesignFormType, [number, number, number, number]> = {
  civic_anchor: [184, 74, 52, 222],
  courtyard_compact: [64, 126, 88, 214],
  courtyard_open: [102, 148, 88, 208],
  industrial_shed: [112, 119, 124, 202],
  mixed_use_street_wall: [42, 147, 141, 218],
  row_infill: [202, 143, 56, 222],
  single_lot: [190, 106, 72, 226],
  slab: [86, 112, 150, 210],
  tower_podium: [126, 86, 150, 224],
  // Unknown is paper-faint in typology mode too — coloring an
  // unclassified building like it has a known form is precisely the
  // failure the prior hash-modulo classifier produced.
  unknown: [216, 211, 197, 196],
};

const URBAN_FORM_LINE: Record<UrbanDesignFormType, [number, number, number, number]> = {
  civic_anchor: [138, 46, 32, 240],
  courtyard_compact: [38, 91, 62, 238],
  courtyard_open: [70, 109, 57, 232],
  industrial_shed: [74, 82, 88, 228],
  mixed_use_street_wall: [20, 105, 100, 238],
  row_infill: [152, 98, 33, 240],
  single_lot: [124, 88, 58, 222],
  slab: [55, 80, 116, 232],
  tower_podium: [92, 59, 121, 242],
  unknown: [112, 104, 90, 220],
};

const URBAN_PART_FILL: Partial<
  Record<UrbanDesignModelProperties["part_role"], [number, number, number, number]>
> = {
  civic_entry: [202, 104, 72, 240],
  civic_roof: [156, 86, 64, 242],
  cornice_band: [196, 158, 98, 236],
  courtyard_yard: [74, 150, 96, 238],
  dormer: [118, 76, 58, 242],
  facade_rhythm: [238, 210, 150, 216],
  front_porch: [224, 178, 95, 238],
  parapet: [126, 100, 78, 238],
  party_wall: [70, 60, 52, 235],
  porch_or_rear_ell: [214, 150, 82, 226],
  porch_step: [228, 188, 118, 238],
  roof_monitor: [54, 92, 118, 238],
  roof_plane: [143, 77, 58, 244],
  roof_ridge: [76, 54, 44, 250],
  row_roof: [172, 88, 50, 246],
  sawtooth_roof: [84, 104, 112, 242],
  storefront_bay: [80, 148, 146, 228],
};

const URBAN_PART_LINE: Partial<
  Record<UrbanDesignModelProperties["part_role"], [number, number, number, number]>
> = {
  civic_entry: [145, 64, 45, 246],
  civic_roof: [102, 55, 43, 246],
  cornice_band: [136, 100, 48, 242],
  courtyard_yard: [44, 106, 66, 245],
  dormer: [72, 45, 34, 246],
  facade_rhythm: [162, 126, 62, 220],
  front_porch: [164, 111, 42, 242],
  parapet: [82, 62, 48, 246],
  party_wall: [48, 42, 37, 242],
  porch_or_rear_ell: [158, 94, 43, 230],
  porch_step: [164, 112, 50, 242],
  roof_monitor: [31, 67, 91, 246],
  roof_plane: [99, 50, 39, 248],
  roof_ridge: [42, 31, 26, 252],
  row_roof: [126, 57, 35, 248],
  sawtooth_roof: [48, 70, 78, 246],
  storefront_bay: [35, 112, 108, 232],
};

/**
 * Sketch-model palette: a single chipboard tone keyed by detail level, not
 * by form_type. The prior implementation stored nine beige tones per form
 * and seventeen per part role — a desaturated version of the same lie the
 * colored palette tells, since `form_type` itself was hash-derived. A real
 * physical massing model reads as ONE material, with subtle tonal layering
 * by part role (mass → facade → roof), not as a different color per form.
 *
 * Variation by height happens in the 3D lighting layer (deck.gl's
 * ambient/diffuse/specular), not in the base tone. Taller masses catch
 * more shadow naturally; we don't pre-bake that into the tone.
 */
const SKETCH_TONE_BY_DETAIL_LEVEL: Record<
  UrbanDesignModelProperties["fabric_detail_level"],
  [number, number, number, number]
> = {
  // Main basswood block: the warmest near-white.
  mass: [236, 230, 218, 234],
  // Relief carving against the mass: one tonal step darker, slightly cooler.
  facade: [220, 213, 198, 228],
  // Separate basswood plate stacked on top: two tonal steps darker so the
  // chipboard layering reads from camera distance.
  roof: [200, 191, 175, 232],
  // The model base — the only chromatic accent in the whole palette, a
  // muted sage that lets courtyard yards and lawns read as "ground" not
  // "building." Lower alpha so the substrate underneath still shows.
  site: [176, 188, 158, 202],
};

// Single uniform pencil line for every chipboard part. Architect's-pencil
// brown-gray, low enough alpha that crisp short edges don't dominate but
// long silhouette edges still read at zoom-out.
const SKETCH_LINE: [number, number, number, number] = [96, 90, 78, 204];

// Party walls deserve their own darker line because they read as a
// structural seam between row units, not a silhouette edge. This is the
// one part-role exception to the uniform-line rule — sparingly used.
const SKETCH_LINE_PARTY_WALL: [number, number, number, number] = [54, 50, 44, 234];

const BUILDING_PAPER_GRAIN_EXTENSION = new FillStyleExtension({
  pattern: true,
});
const BUILDING_PAPER_GRAIN_MAPPING: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  paper_grain: { x: 0, y: 0, width: 256, height: 256 },
};
const BUILDING_PAPER_GRAIN_PROPS: FillStyleExtensionProps = {
  fillPatternAtlas: "/textures/paper-grain.svg",
  fillPatternMapping: BUILDING_PAPER_GRAIN_MAPPING,
  fillPatternMask: true,
  getFillPattern: () => "paper_grain",
  getFillPatternScale: 0.095,
  getFillPatternOffset: [0, 0],
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
  asContext = false,
): [number, number, number, number] {
  const base = PLACE_TYPE_FILL[placeType] ?? PLACE_TYPE_FILL_DEFAULT;
  const tint = LENS_FILL_TINT[activeLens];
  const alpha = asContext
    ? {
        ward: 18,
        parcel: 26,
        building: 34,
        infrastructure: 30,
      }[placeType] ?? 22
    : Math.max(base[3], tint[3]);

  return [
    Math.round(base[0] * 0.72 + tint[0] * 0.28),
    Math.round(base[1] * 0.72 + tint[1] * 0.28),
    Math.round(base[2] * 0.72 + tint[2] * 0.28),
    alpha,
  ];
}

function envelopeFillColor(
  envelopeType: ScenarioEnvelopeType,
  compareEnabled: boolean,
): [number, number, number, number] {
  const color = ENVELOPE_FILL[envelopeType];
  return compareEnabled
    ? color
    : [color[0], color[1], color[2], Math.max(108, color[3] - 24)];
}

function envelopeLineColor(
  envelopeType: ScenarioEnvelopeType,
  compareEnabled: boolean,
): [number, number, number, number] {
  const color = ENVELOPE_LINE[envelopeType];
  return compareEnabled
    ? color
    : [color[0], color[1], color[2], Math.max(176, color[3] - 32)];
}

function urbanDesignModelElevation(
  props: UrbanDesignModelProperties,
  viewMode: AtlasSceneViewModeId,
): number {
  const mode = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  if (mode.extrusionScale === 0) return 0;
  return Math.max(2, props.height_m * mode.extrusionScale);
}

function urbanDesignFillColor(
  props: UrbanDesignModelProperties,
  atlasYear: number | null,
  materialMode: UrbanDesignMaterialMode,
): [number, number, number, number] {
  if (materialMode === "sketch_model") {
    return applyFabricCompletenessAlpha(
      props,
      urbanDesignSketchFillColor(props, atlasYear),
    );
  }

  const roleColor = URBAN_PART_FILL[props.part_role];
  if (roleColor) {
    return applyFabricCompletenessAlpha(props, [
      roleColor[0],
      roleColor[1],
      roleColor[2],
      atlasYear === null ? roleColor[3] : Math.max(128, roleColor[3] - 48),
    ]);
  }

  const color = URBAN_FORM_FILL[props.form_type];
  const partLift =
    props.part_role === "tower"
      ? 18
      : props.part_role === "rear_wing"
        ? -12
        : 0;
  const alpha = atlasYear === null ? color[3] : Math.max(108, color[3] - 54);
  return applyFabricCompletenessAlpha(props, [
    clampByte(color[0] + partLift),
    clampByte(color[1] + partLift),
    clampByte(color[2] + partLift),
    alpha,
  ]);
}

// `urbanDesignLineColor` (formerly here) computed per-typology line
// colors; PR 5 (buildings-as-sketch) replaced it with a uniform indigo
// edge (#7a8696) so buildings share one drawing edge. The helper is
// removed; the per-typology line-color palettes that fed it stay in
// place behind void references below so they can be reintroduced if
// per-typology lines come back later.
void URBAN_FORM_LINE;
void URBAN_PART_LINE;
void SKETCH_LINE;
void SKETCH_LINE_PARTY_WALL;

function urbanDesignSketchFillColor(
  props: UrbanDesignModelProperties,
  atlasYear: number | null,
): [number, number, number, number] {
  const color = SKETCH_TONE_BY_DETAIL_LEVEL[props.fabric_detail_level];
  return [
    color[0],
    color[1],
    color[2],
    atlasYear === null ? color[3] : Math.max(132, color[3] - 46),
  ];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Drop alpha when the effective confidence for this building is low.
 *
 * Effective confidence is the minimum of:
 *  - `fabric_feature_completeness`: 0-1 score from which OSM tags +
 *    parcel signals were available when the fabric spec was derived.
 *  - `typology_confidence`: Phase A classifier's softmax-max for this
 *    building. Null today — until the Phase A pipeline runs and the
 *    OSM fixture is enriched via `osm_id` join with
 *    `building_typology` rows — and treated as 1.0 (don't pull alpha
 *    down on its own absence) until then.
 *
 * Either signal being low pulls the alpha down so low-confidence
 * buildings render with the uncertainty signal, never silently as
 * confident. The threshold (0.5) matches Phase A spec §10 MUST.
 */
function applyFabricCompletenessAlpha(
  _props: UrbanDesignModelProperties,
  color: [number, number, number, number],
): [number, number, number, number] {
  // Spec PR 4 confidence-discipline rule: "Confidence shapes WHAT we
  // render, never HOW." Previously this function dimmed alpha when
  // typology_confidence or fabric_feature_completeness fell below
  // 0.5, letting the chrome editorialise about classifier uncertainty.
  // The new rule routes confidence to archetype selection upstream
  // (high confidence -> use predicted typology, low confidence ->
  // fall back to `unknown` as a plain chipboard mass). Once that
  // decision is made the building renders at full chrome alpha. Kept
  // as a pass-through so the five call-sites stay structurally
  // compatible; renaming it across the file is outside this PR's
  // render+chrome scope.
  return color;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function trafficColor(
  props: TrafficSegmentProperties,
  selected: boolean,
): [number, number, number, number] {
  if (selected) return TRAFFIC_SELECTED;
  const base =
    props.congestion_ratio >= 0.5
      ? TRAFFIC_HEAVY
      : props.congestion_ratio >= 0.28
        ? TRAFFIC_BUILDING
        : TRAFFIC_FREE;
  const mutedBase: [number, number, number] = [
    Math.round(base[0] + (TRAFFIC_MUTED_TARGET[0] - base[0]) * 0.28),
    Math.round(base[1] + (TRAFFIC_MUTED_TARGET[1] - base[1]) * 0.28),
    Math.round(base[2] + (TRAFFIC_MUTED_TARGET[2] - base[2]) * 0.28),
  ];
  const confidence = Math.max(0.45, Math.min(1, props.confidence ?? 0.72));
  const sourceOpacity =
    props.source_status === "live"
      ? Math.max(0.78, confidence * 0.9)
      : props.source_status === "historic_average"
        ? Math.max(0.56, confidence * 0.72)
        : props.source_status === "pending_live_source"
          ? Math.max(0.46, confidence * 0.62)
          : Math.max(0.32, confidence * 0.46);
  const alpha = Math.round(base[3] * sourceOpacity);
  return [mutedBase[0], mutedBase[1], mutedBase[2], alpha];
}

function trafficWidth(props: TrafficSegmentProperties): number {
  const volumeWidth = Math.min(7.5, Math.max(2.2, props.volume_per_hour / 250));
  return volumeWidth + props.congestion_ratio * 2.2;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function rgba(color: [number, number, number, number]): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp01(color[3] / 255)})`;
}

function trafficParticleCount(props: TrafficSegmentProperties): number {
  return Math.max(1, Math.min(5, Math.round(props.volume_per_hour / 1400)));
}

function trafficParticleDurationMs(props: TrafficSegmentProperties): number {
  const ratio = clamp01(
    props.speed_mph / Math.max(props.free_flow_speed_mph, 1),
  );
  const boundedRatio = Math.max(0.1, ratio);
  const durationMs = (2 + (1 - boundedRatio) * 7) * 1000;
  return Math.round(durationMs / TRAFFIC_FLOW_SPEED_SCALE);
}

function trafficParticleStyle(props: TrafficSegmentProperties): Pick<
  ProjectedTrafficParticle,
  "fill" | "stroke" | "strokeWidth" | "rx" | "ry" | "opacity"
> {
  const base = trafficColor(props, false);
  if (props.source_status === "live") {
    return {
      fill: rgba([base[0], base[1], base[2], Math.min(255, base[3] + 28)]),
      stroke: "rgba(255, 255, 255, 0.72)",
      strokeWidth: 1.2,
      rx: 5.4,
      ry: 2.5,
      opacity: 0.95,
    };
  }
  if (props.source_status === "historic_average") {
    return {
      fill: rgba([base[0], base[1], base[2], 184]),
      stroke: "rgba(255, 255, 255, 0.46)",
      strokeWidth: 0.9,
      rx: 4.8,
      ry: 2.1,
      opacity: 0.82,
    };
  }
  if (props.source_status === "pending_live_source") {
    return {
      fill: "rgba(255, 255, 255, 0.1)",
      stroke: rgba([base[0], base[1], base[2], 182]),
      strokeWidth: 1.4,
      rx: 4.5,
      ry: 2.0,
      opacity: 0.7,
    };
  }
  return {
    fill: rgba([base[0], base[1], base[2], 122]),
    stroke: "rgba(255, 255, 255, 0.38)",
    strokeWidth: 0.9,
    rx: 3.8,
    ry: 1.8,
    opacity: 0.58,
  };
}

function cssSafeTrafficId(segmentId: string): string {
  return `traffic-motion-${segmentId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function projectedTrafficPath(
  map: MapRef,
  feature: TrafficSegmentFeature,
): string | null {
  const projected = feature.geometry.coordinates
    .map(([lng, lat]) => map.project([lng, lat]))
    .filter(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    );
  if (projected.length < 2) return null;
  return projected
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
}

function AnimeTrafficFlowOverlay({
  map,
  mapLoaded,
  mapViewKey,
  segments,
  visible,
  prefersReducedMotion,
}: {
  map: MapRef | null;
  mapLoaded: boolean;
  mapViewKey: string;
  segments: TrafficSegmentFeature[];
  visible: boolean;
  prefersReducedMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const projected = useMemo(() => {
    if (!mapLoaded || !map || !visible || prefersReducedMotion) {
      return {
        width: 0,
        height: 0,
        revision: mapViewKey,
        paths: [] as ProjectedTrafficPath[],
      };
    }
    const canvas = map.getMap().getCanvas();
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    const paths = segments.flatMap((feature): ProjectedTrafficPath[] => {
      const d = projectedTrafficPath(map, feature);
      if (!d) return [];
      const pathId = cssSafeTrafficId(feature.properties.segment_id);
      const count = trafficParticleCount(feature.properties);
      const durationMs = trafficParticleDurationMs(feature.properties);
      const style = trafficParticleStyle(feature.properties);
      return [
        {
          id: pathId,
          d,
          particles: Array.from({ length: count }, (_, index) => ({
            id: `${pathId}-${index}`,
            pathId,
            offset: index / count,
            durationMs,
            ...style,
          })),
        },
      ];
    });
    return { width, height, revision: mapViewKey, paths };
  }, [
    mapLoaded,
    map,
    mapViewKey,
    prefersReducedMotion,
    segments,
    visible,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      !visible ||
      prefersReducedMotion ||
      projected.paths.length === 0
    ) {
      return;
    }

    const scope = createScope({ root }).add(() => {
      root
        .querySelectorAll<SVGEllipseElement>("[data-traffic-flow-particle]")
        .forEach((particle) => {
          const pathId = particle.dataset.pathId;
          if (!pathId) return;
          const path = root.querySelector<SVGPathElement>(
            `#${CSS.escape(pathId)}`,
          );
          if (!path) return;
          const duration = Number(particle.dataset.durationMs) || 5000;
          const offset = Number(particle.dataset.offset) || 0;
          animate(particle, {
            ease: "linear",
            duration,
            loop: true,
            ...svg.createMotionPath(path, offset),
          });
        });
    });

    return () => scope.revert();
  }, [prefersReducedMotion, projected.paths, visible]);

  if (
    !visible ||
    prefersReducedMotion ||
    projected.width <= 0 ||
    projected.height <= 0 ||
    projected.paths.length === 0
  ) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[4] overflow-hidden"
      data-traffic-renderer="animejs"
      data-map-view-key={projected.revision}
    >
      <svg
        className="h-full w-full"
        width={projected.width}
        height={projected.height}
        viewBox={`0 0 ${projected.width} ${projected.height}`}
      >
        <defs>
          {projected.paths.map((path) => (
            <path key={path.id} id={path.id} d={path.d} />
          ))}
        </defs>
        {projected.paths.flatMap((path) =>
          path.particles.map((particle) => (
            <ellipse
              key={particle.id}
              data-traffic-flow-particle="true"
              data-path-id={particle.pathId}
              data-duration-ms={particle.durationMs}
              data-offset={particle.offset}
              cx="0"
              cy="0"
              rx={particle.rx}
              ry={particle.ry}
              fill={particle.fill}
              stroke={particle.stroke}
              strokeWidth={particle.strokeWidth}
              opacity={particle.opacity}
            />
          )),
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DeckGL overlay hook                                                */
/* ------------------------------------------------------------------ */

function DeckGLOverlay(
  props: MapboxOverlayProps & { onReady?: (overlay: MapboxOverlay) => void },
) {
  const { onReady, ...overlayProps } = props;
  const onReadyRef = useRef(onReady);
  // Update the ref in an effect, not during render, to avoid React's
  // "Cannot update ref during render" rule. The latest onReady is
  // captured for the useEffect below to invoke once the overlay is
  // ready, then again if onReady itself changes.
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(overlayProps));
  overlay.setProps(overlayProps);
  // Fire onReady once the overlay control is available. The useControl
  // hook returns the same instance for the lifetime of the parent Map,
  // so a single notification is sufficient. PT-504 reads the overlay
  // out so a contextmenu/long-press handler can run `pickObject`
  // against the picking buffer without re-routing through layer
  // onClick (which is left-click only in deck.gl).
  useEffect(() => {
    onReadyRef.current?.(overlay);
  }, [overlay]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AtlasMapProps = {
  places: PlacesCollection | null;
  events: SpatialEvent[];
  trafficSnapshot?: TrafficRealtimeSnapshot | null;
  onPlaceSelect: (placeId: string) => void;
  onTrafficSegmentSelect?: (segmentId: string) => void;
  selectedPlaceId: string | null;
  selectedTrafficSegmentId?: string | null;
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
  mapDragPanEnabled?: boolean;
  dragPanBlockLayerIds?: readonly string[];
  /**
   * Optional deck.gl layers appended to the AtlasMap's built-in
   * layer stack. Used by overlay routes (porchfest planner, future
   * event surfaces) to drop in their own layers without forking
   * AtlasMap. Layers render on top of everything AtlasMap composes
   * itself, matching the deck.gl back-to-front draw order.
   *
   * The prop is purely additive: existing AtlasMap consumers pass
   * nothing and behave exactly as before.
   */
  extraDeckLayers?: Layer[];
  /**
   * Currently selected building, if any. Drives the terracotta
   * outline highlight layer. Distinct from `selectedPlaceId` which
   * carries civic places. Spec: docs/design-2026-05-atlas-feel-pass.md
   * PR 1.
   */
  selectedBuilding?: SelectedBuilding | null;
  /**
   * Fired when a building is picked on the map (osmBuildings,
   * urbanDesignModel, or the procedural archetype mesh layer). Pass
   * `null` to clear (called when the user clicks empty map area). Spec
   * PR 1.
   */
  onBuildingSelect?: (building: SelectedBuilding | null) => void;
};

export type UrbanDesignMaterialMode = "typology" | "sketch_model";

/* ------------------------------------------------------------------ */
/*  AtlasMap                                                           */
/* ------------------------------------------------------------------ */

export function AtlasMap({
  places,
  events,
  trafficSnapshot = null,
  onPlaceSelect,
  onTrafficSegmentSelect,
  selectedPlaceId,
  selectedTrafficSegmentId = null,
  layerVisibility,
  mobileSurface = "leaflet_baseline",
  initialBounds = null,
  viewMode = "oblique",
  activeLens = "explore",
  className,
  onMapReady,
  atlasYear = null,
  historicalReconstructions,
  scenarioEnvelopeFeatures,
  scenarioDeltaFeatures,
  scenarioCompareEnabled = false,
  urbanDesignMaterialMode = "typology",
  mapDragPanEnabled = true,
  dragPanBlockLayerIds = EMPTY_DRAG_PAN_BLOCK_LAYER_IDS,
  selectedBuilding = null,
  onBuildingSelect,
  extraDeckLayers = [],
}: AtlasMapProps) {
  ensurePmtilesProtocol();
  const prefersReducedMotion = usePrefersReducedMotion();
  const camera = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].camera;
  const mapRef = useRef<MapRef | null>(null);
  const [mapInstance, setMapInstance] = useState<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(camera.zoom);
  const [mapViewKey, setMapViewKey] = useState(() =>
    `${camera.longitude.toFixed(5)}:${camera.latitude.toFixed(5)}:${camera.zoom.toFixed(2)}:${camera.pitch.toFixed(1)}:${camera.bearing.toFixed(1)}`,
  );
  const appliedMobileFitKeyRef = useRef<string | null>(null);

  /*
   * Atelier entry (PT-504). Right-click on desktop or long-press on
   * touch over a Lost Flint reconstruction navigates to
   * `/open-flint-atlas/atelier/[parcelId]/[year]`.
   *
   * We bind native pointer events on the map container rather than
   * adding deck.gl layer-level `onContextMenu` (which the deck.gl
   * Layer API does not expose) and use the underlying
   * `MapboxOverlay.pickObject` call against the picking buffer. The
   * overlay is captured via `onReady` on `<DeckGLOverlay>`.
   *
   * The long-press contract: 600ms pointerdown without > 8px move and
   * without pointerup. That window is wide enough to feel intentional
   * on touch but short enough that desktop mouse users who hold the
   * left button briefly do not trigger it (they will pan first).
   */
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const handleOverlayReady = useCallback((overlay: MapboxOverlay) => {
    overlayRef.current = overlay;
  }, []);
  const setMapDragPan = useCallback((enabled: boolean) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (enabled) {
      map.dragPan.enable();
    } else {
      map.dragPan.disable();
    }
  }, []);
  useEffect(() => {
    setMapDragPan(mapDragPanEnabled);
  }, [mapDragPanEnabled, setMapDragPan]);
  const atlasYearRef = useRef<number | null>(atlasYear);
  useEffect(() => {
    atlasYearRef.current = atlasYear;
  }, [atlasYear]);

  const navigateToAtelierForPick = useCallback(
    (clientX: number, clientY: number): boolean => {
      const overlay = overlayRef.current;
      const container = mapContainerRef.current;
      if (!overlay || !container) return false;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return false;
      const info = overlay.pickObject({ x, y, radius: 12 });
      if (!info || !info.layer) return false;
      const layerId =
        typeof info.layer.id === "string" ? info.layer.id : null;
      if (!layerId || !layerId.startsWith(ATLAS_DECK_LAYER_IDS.lostFlint)) {
        return false;
      }
      const reconstruction = info.object as HistoricalReconstruction | undefined;
      if (!reconstruction || !reconstruction.civic_object_id) return false;
      const year = resolveAtelierEntryYear(
        reconstruction,
        atlasYearRef.current,
      );
      router.push(buildAtelierHref(reconstruction, year));
      return true;
    },
    [router],
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;

    const handleContextMenu = (event: MouseEvent) => {
      // Only intercept when the pick hits a Lost Flint reconstruction.
      // Empty-area right-click still allows the browser's default
      // context menu so users keep "Inspect", "Save image", etc.
      const handled = navigateToAtelierForPick(event.clientX, event.clientY);
      if (handled) event.preventDefault();
    };

    const LONG_PRESS_MS = 600;
    const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
    let longPressTimer: number | null = null;
    let longPressStart: { x: number; y: number; pointerId: number } | null =
      null;

    const cancelLongPress = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressStart = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Only touch / pen — mouse uses the contextmenu path.
      if (event.pointerType === "mouse") return;
      // Single-finger only; multi-touch is a map gesture.
      if (!event.isPrimary) return;
      cancelLongPress();
      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      longPressStart = { x: startX, y: startY, pointerId };
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        if (!longPressStart) return;
        const handled = navigateToAtelierForPick(
          longPressStart.x,
          longPressStart.y,
        );
        longPressStart = null;
        if (!handled) {
          // No reconstruction under the press: noop. The user gets the
          // map's default gesture handling (no haptic, no menu).
        }
      }, LONG_PRESS_MS);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!longPressStart || event.pointerId !== longPressStart.pointerId) {
        return;
      }
      const dx = event.clientX - longPressStart.x;
      const dy = event.clientY - longPressStart.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
        cancelLongPress();
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (longPressStart && event.pointerId !== longPressStart.pointerId) {
        return;
      }
      cancelLongPress();
    };

    container.addEventListener("contextmenu", handleContextMenu);
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerEnd);
    container.addEventListener("pointercancel", handlePointerEnd);
    container.addEventListener("pointerleave", handlePointerEnd);

    return () => {
      cancelLongPress();
      container.removeEventListener("contextmenu", handleContextMenu);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerEnd);
      container.removeEventListener("pointercancel", handlePointerEnd);
      container.removeEventListener("pointerleave", handlePointerEnd);
    };
  }, [navigateToAtelierForPick]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || dragPanBlockLayerIds.length === 0) return;

    let lockedPointerId: number | null = null;

    const restoreDragPan = () => {
      lockedPointerId = null;
      setMapDragPan(mapDragPanEnabled);
    };

    const pointerHitsBlockedLayer = (event: PointerEvent): boolean => {
      const overlay = overlayRef.current;
      if (!overlay) return false;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return false;
      const info = overlay.pickObject({ x, y, radius: 24 });
      const layerId =
        typeof info?.layer?.id === "string" ? info.layer.id : null;
      if (!layerId) return false;
      return dragPanBlockLayerIds.includes(layerId);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (!pointerHitsBlockedLayer(event)) return;
      lockedPointerId = event.pointerId;
      setMapDragPan(false);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (lockedPointerId == null || event.pointerId !== lockedPointerId) {
        return;
      }
      restoreDragPan();
    };

    container.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    container.addEventListener("pointerup", handlePointerEnd, {
      capture: true,
    });
    container.addEventListener("pointercancel", handlePointerEnd, {
      capture: true,
    });
    container.addEventListener("pointerleave", handlePointerEnd, {
      capture: true,
    });

    return () => {
      if (lockedPointerId != null) restoreDragPan();
      container.removeEventListener("pointerdown", handlePointerDown, true);
      container.removeEventListener("pointerup", handlePointerEnd, true);
      container.removeEventListener("pointercancel", handlePointerEnd, true);
      container.removeEventListener("pointerleave", handlePointerEnd, true);
    };
  }, [dragPanBlockLayerIds, mapDragPanEnabled, setMapDragPan]);

  /*
   * Hover capability detection. Spec PR 1: hover state (1px terracotta
   * outline + tooltip) is desktop-only. Touch devices treat the touch
   * event as the click and skip hover handling entirely.
   *
   * matchMedia(`(hover: hover)`) is the canonical test for "the primary
   * input device can hover" — true for mouse / trackpad, false for
   * touchscreens. Initialised to false on the server so SSR never
   * generates hover affordances that would be wrong on touch devices.
   */
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: hover)");
    setCanHover(mql.matches);
    const listener = (event: MediaQueryListEvent) => setCanHover(event.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  /*
   * Hover state for the building layers. Carries the resolved
   * `SelectedBuilding` payload (so the tooltip can render typology +
   * confidence + address without a second pick) and the cursor x/y
   * (PickingInfo screen-space coords, in CSS pixels relative to the
   * map container). Cleared whenever the cursor leaves a building
   * footprint. Spec PR 1.
   */
  type HoverState = {
    building: SelectedBuilding;
    x: number;
    y: number;
  };
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  const geometricPlaces = useMemo<GeometricPlacesCollection | null>(() => {
    if (!places) return null;
    return {
      ...places,
      features: places.features.filter(hasGeometry),
    };
  }, [places]);

  const flintWardMask = useMemo<GeoJSON.GeometryCollection | null>(() => {
    if (!geometricPlaces) return null;
    const geometries = geometricPlaces.features
      .filter((feature) => feature.properties.place_id.startsWith("ward:"))
      .map((feature) => feature.geometry)
      .filter(
        (geometry): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon =>
          geometry.type === "Polygon" || geometry.type === "MultiPolygon",
      );

    if (geometries.length === 0) return null;
    return {
      type: "GeometryCollection",
      geometries,
    };
  }, [geometricPlaces]);

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
    setMapZoom(camera.zoom);
  }, [camera.zoom, viewMode]);

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
    // Spec PR 5: inset every building footprint by 1.5 meters before
    // extrusion. Creates ground-level breathing room between buildings
    // and the streets layer so the street network reads as visible
    // space between buildings rather than implied gaps. Done once,
    // cached, downstream consumers (urban-design model, shadow,
    // selected/hovered outlines) all flow through this.
    //
    // turf.buffer with negative distance returns null for polygons
    // smaller than 2x the inset (corners would invert). Those tiny
    // structures drop out of the layer, which is acceptable for a
    // 1.5m inset on real building footprints.
    const yearFiltered =
      atlasYear === null
        ? source.features
        : source.features.filter((feature) =>
            osmBuildingExistsInYear(
              feature.properties as OsmFootprintProperties,
              atlasYear,
            ),
          );
    const inset: GeoJSON.Feature[] = [];
    for (const feature of yearFiltered) {
      if (
        !feature.geometry ||
        (feature.geometry.type !== "Polygon" &&
          feature.geometry.type !== "MultiPolygon")
      ) {
        continue;
      }
      const buffered = buffer(
        feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
        -1.5,
        { units: "meters" },
      );
      if (buffered && buffered.geometry) {
        inset.push({
          ...feature,
          geometry: buffered.geometry,
        });
      }
    }
    return {
      ...source,
      features: inset,
    };
  }, [atlasYear]);

  /*
   * Drop-shadow geometry. Spec PR 5 (buildings-as-sketch): each
   * building gets a soft shadow offset ~3m southeast at low alpha.
   * Computed as a translated copy of `visibleOsmBuildings` so the
   * shadow respects year filtering. The translation is constant in
   * lng/lat (3m / 111320m latitude, 3m / (111320 * cos(43 deg))
   * longitude) which is accurate within ~1% at Flint's latitude
   * across the city extent. Rendered as a SolidPolygonLayer below
   * the building layers; no extrusion, no stroke, just a filled
   * footprint at building-level z=0.
   */
  const buildingShadowFeatures = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Polygon>
  >(() => {
    // 3m south = -3 / 111320 latitude. 3m east = 3 / (111320 * cos(43))
    // longitude. Pre-computed for Flint's centroid; constant across
    // the city extent.
    const dLat = -3 / 111320;
    const dLng = 3 / (111320 * Math.cos((43 * Math.PI) / 180));
    const shift = (coords: GeoJSON.Position[][]): GeoJSON.Position[][] =>
      coords.map((ring) =>
        ring.map(([lng, lat]) => [lng + dLng, lat + dLat]),
      );
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    for (const f of visibleOsmBuildings.features) {
      if (!f.geometry) continue;
      if (f.geometry.type === "Polygon") {
        features.push({
          type: "Feature",
          properties: f.properties ?? {},
          geometry: {
            type: "Polygon",
            coordinates: shift(f.geometry.coordinates),
          },
        });
      }
    }
    return { type: "FeatureCollection", features };
  }, [visibleOsmBuildings]);

  const urbanDesignModel = useMemo(
    () =>
      createUrbanDesignModelCollection(visibleOsmBuildings, {
        clipGeometry: flintWardMask,
      }),
    [flintWardMask, visibleOsmBuildings],
  );
  const urbanDesignMassModel = useMemo<GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    UrbanDesignModelProperties
  >>(
    () => ({
      ...urbanDesignModel,
      features: urbanDesignModel.features.filter(
        (feature) => feature.properties.fabric_detail_level === "mass",
      ),
    }),
    [urbanDesignModel],
  );
  const buildingFabricModel = useMemo<GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    UrbanDesignModelProperties
  >>(
    () => ({
      ...urbanDesignModel,
      features: urbanDesignModel.features.filter(
        (feature) => feature.properties.fabric_detail_level !== "mass",
      ),
    }),
    [urbanDesignModel],
  );

  /* ---- Selected feature (separate GeoJSON for highlight ring) ----- */
  const selectedFeatureCollection = useMemo<GeometricPlacesCollection | null>(() => {
    if (!selectedPlaceId || !geometricPlaces) return null;
    const feature = geometricPlaces.features.find(
      (f) => f.properties.place_id === selectedPlaceId,
    );
    if (!feature) return null;
    return { type: "FeatureCollection", features: [feature] };
  }, [selectedPlaceId, geometricPlaces]);

  /*
   * Selected building footprint, derived by looking up the osm_id in
   * urbanDesignMassModel (preferred: carries fabric_archetype, typology
   * etc.) and falling back to the raw osmBuildings fixture. The
   * resulting FeatureCollection drives a stroke-only highlight layer
   * rendered above the building layers. Spec PR 1: terracotta outline
   * at `--ctx-accent` (#c14a2c), 2px width.
   */
  const selectedBuildingFeatureCollection = useMemo<GeoJSON.FeatureCollection<
    GeoJSON.Geometry
  > | null>(() => {
    if (!selectedBuilding) return null;
    const osmIdStr = String(selectedBuilding.osm_id);
    const fromUrbanModel = urbanDesignMassModel.features.find(
      (f) => String(f.properties.source_osm_id) === osmIdStr,
    );
    if (fromUrbanModel) {
      return { type: "FeatureCollection", features: [fromUrbanModel] };
    }
    const fromOsm = (
      visibleOsmBuildings as GeoJSON.FeatureCollection
    ).features.find(
      (f) =>
        String(
          (f.properties as OsmFootprintProperties | null)?.osm_id ?? "",
        ) === osmIdStr,
    );
    if (fromOsm) {
      return { type: "FeatureCollection", features: [fromOsm] };
    }
    return null;
  }, [selectedBuilding, urbanDesignMassModel, visibleOsmBuildings]);

  /*
   * Hovered-building footprint, used for the soft 1px hint outline.
   * Renders only when the hover target is distinct from the selected
   * building, so the heavier selection outline always wins. Same
   * lookup pattern as `selectedBuildingFeatureCollection`. Spec PR 1.
   */
  const hoveredBuildingFeatureCollection = useMemo<GeoJSON.FeatureCollection<
    GeoJSON.Geometry
  > | null>(() => {
    if (!hoverState) return null;
    if (
      selectedBuilding &&
      String(selectedBuilding.osm_id) === String(hoverState.building.osm_id)
    ) {
      return null;
    }
    const osmIdStr = String(hoverState.building.osm_id);
    const fromUrbanModel = urbanDesignMassModel.features.find(
      (f) => String(f.properties.source_osm_id) === osmIdStr,
    );
    if (fromUrbanModel) {
      return { type: "FeatureCollection", features: [fromUrbanModel] };
    }
    const fromOsm = (
      visibleOsmBuildings as GeoJSON.FeatureCollection
    ).features.find(
      (f) =>
        String(
          (f.properties as OsmFootprintProperties | null)?.osm_id ?? "",
        ) === osmIdStr,
    );
    if (fromOsm) {
      return { type: "FeatureCollection", features: [fromOsm] };
    }
    return null;
  }, [hoverState, selectedBuilding, urbanDesignMassModel, visibleOsmBuildings]);

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

  /*
   * Building click handler. Spec: docs/design-2026-05-atlas-feel-pass.md
   * PR 1. Normalises three pick payloads into a single `SelectedBuilding`:
   *
   *   1. osmBuildings GeoJsonLayer -> `GeoJSON.Feature` with
   *      `OsmFootprintProperties` (osm_id, name, building, levels…).
   *   2. urbanDesignModel / buildingFabric GeoJsonLayer ->
   *      `UrbanDesignModelFeature` with typology + archetype fields.
   *   3. Archetype SimpleMeshLayer -> `ArchetypeMeshInstance`, whose
   *      `anchorFeature` is the same UrbanDesignModelFeature.
   *
   * Returning `true` consumes the event so the top-level empty-area
   * handler (which clears the selection) does not also fire.
   */
  const handleBuildingClick = useCallback(
    (info: PickingInfo): boolean => {
      if (!onBuildingSelect) return false;
      if (!info.object) return false;

      // Unwrap mesh instance -> anchor feature when present.
      const candidate = info.object as {
        anchorFeature?: GeoJSON.Feature;
        properties?: Record<string, unknown>;
        geometry?: GeoJSON.Geometry;
      };
      const feature: GeoJSON.Feature | undefined = candidate.anchorFeature
        ? candidate.anchorFeature
        : candidate.properties
          ? (candidate as unknown as GeoJSON.Feature)
          : undefined;
      if (!feature || !feature.properties) return false;

      const props = feature.properties as Record<string, unknown>;
      const rawOsmId = props.osm_id ?? props.source_osm_id;
      if (rawOsmId === undefined || rawOsmId === null) return false;

      const name =
        typeof props.name === "string" && props.name.trim().length > 0
          ? props.name.trim()
          : null;
      const address =
        typeof props.address === "string" && props.address.trim().length > 0
          ? props.address.trim()
          : null;
      const typology_class =
        typeof props.typology_class === "string" ? props.typology_class : null;
      const typology_confidence =
        typeof props.typology_confidence === "number"
          ? props.typology_confidence
          : null;
      const fabric_archetype =
        typeof props.fabric_archetype === "string"
          ? props.fabric_archetype
          : null;

      const position =
        geometryCentroid(feature.geometry) ??
        (info.coordinate
          ? ([info.coordinate[0], info.coordinate[1]] as [number, number])
          : null);
      if (!position) return false;

      onBuildingSelect({
        osm_id: rawOsmId as string | number,
        name,
        address,
        typology_class,
        typology_confidence,
        fabric_archetype,
        position,
      });
      return true;
    },
    [onBuildingSelect],
  );

  /*
   * Overlay-level click. Per-layer onClick handlers run first; when a
   * building or place is picked they consume the event by returning
   * true. This handler only fires for picks that hit nothing — that's
   * the empty-area clear gesture for the building selection. Spec PR 1.
   */
  const handleEmptyAreaClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) return;
      if (!onBuildingSelect) return;
      onBuildingSelect(null);
    },
    [onBuildingSelect],
  );

  /*
   * Hover handler shared by all three building layers. Mirrors the
   * normalisation logic in `handleBuildingClick`. Updates the screen-
   * positioned tooltip + the 1px terracotta hint outline. Returning
   * `true` is unnecessary here — hover events don't propagate to a
   * top-level handler in the same way clicks do. Spec PR 1.
   */
  const handleBuildingHover = useCallback(
    (info: PickingInfo) => {
      if (!canHover) return;
      if (!info.object) {
        setHoverState(null);
        return;
      }
      const candidate = info.object as {
        anchorFeature?: GeoJSON.Feature;
        properties?: Record<string, unknown>;
        geometry?: GeoJSON.Geometry;
      };
      const feature: GeoJSON.Feature | undefined = candidate.anchorFeature
        ? candidate.anchorFeature
        : candidate.properties
          ? (candidate as unknown as GeoJSON.Feature)
          : undefined;
      if (!feature || !feature.properties) {
        setHoverState(null);
        return;
      }
      const props = feature.properties as Record<string, unknown>;
      const rawOsmId = props.osm_id ?? props.source_osm_id;
      if (rawOsmId === undefined || rawOsmId === null) {
        setHoverState(null);
        return;
      }
      const position =
        geometryCentroid(feature.geometry) ??
        (info.coordinate
          ? ([info.coordinate[0], info.coordinate[1]] as [number, number])
          : null);
      if (!position) {
        setHoverState(null);
        return;
      }
      setHoverState({
        building: {
          osm_id: rawOsmId as string | number,
          name:
            typeof props.name === "string" && props.name.trim().length > 0
              ? props.name.trim()
              : null,
          address:
            typeof props.address === "string" && props.address.trim().length > 0
              ? props.address.trim()
              : null,
          typology_class:
            typeof props.typology_class === "string"
              ? props.typology_class
              : null,
          typology_confidence:
            typeof props.typology_confidence === "number"
              ? props.typology_confidence
              : null,
          fabric_archetype:
            typeof props.fabric_archetype === "string"
              ? props.fabric_archetype
              : null,
          position,
        },
        x: info.x,
        y: info.y,
      });
    },
    [canHover],
  );

  // Clear hover state immediately if hover capability flips off (rare,
  // but happens when a paired Bluetooth mouse disconnects on a tablet).
  useEffect(() => {
    if (!canHover) setHoverState(null);
  }, [canHover]);

  const trafficSegments = useMemo(
    () => trafficSnapshot?.segments.features ?? [],
    [trafficSnapshot],
  );
  const animatedTrafficSegments = useMemo(
    () =>
      trafficSegments.filter(
        (segment) =>
          segment.properties.source_status === "live" ||
          segment.properties.source_status === "historic_average" ||
          segment.properties.source_status === "fixture",
      ),
    [trafficSegments],
  );

  /* ---- Layers ----------------------------------------------------- */
  const layers = useMemo(() => {
    const result: Layer[] = [];

    /*
     * Bound-world vignette mask. Spec PR 3 introduced this; PR 4
     * (map-body-and-discipline) walked it back to alpha 160. That made
     * the surrounding world too present, so this pass uses alpha 190 as
     * the middle value from Task E: Flint stays readable as the civic
     * stage while nearby context remains visible as a ghost.
     */
    if (BOUND_WORLD_MASK_FEATURE_COLLECTION) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-bound-world-vignette-mask",
          data: BOUND_WORLD_MASK_FEATURE_COLLECTION,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: [242, 241, 236, 190],
          getLineColor: [242, 241, 236, 165],
          lineWidthMinPixels: 14,
          getLineWidth: 14,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Parks and green space. Spec PR 4 Change 3: OSM features tagged
     * `leisure=park|garden`, `landuse=recreation_ground|cemetery`.
     * Sage green fill #9eb89e at alpha 140 + stroke #7d9a7d 0.5px
     * alpha 100. Pushed above the vignette mask so parks inside Flint
     * read as visibly green; parks outside Flint are muted by the
     * mask above the basemap.
     */
    if (OSM_PARKS.features.length > 0) {
      // Spec PR 5: parks fill alpha bumped 140 -> 200 so the green
      // holds against the washed basemap. Stroke unchanged.
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-parks",
          data: OSM_PARKS,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: [158, 184, 158, 200],
          getLineColor: [125, 154, 125, 100],
          lineWidthMinPixels: 0.5,
          getLineWidth: 0.5,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Water bodies. Cool slate #6b8a9e. Spec PR 4 originally pinned
     * fill alpha 140 + stroke alpha 180; user feedback was that the
     * water read too opaque against the rest of the body, so all
     * three water alphas drop 25%: fill 140→105, stroke 180→135,
     * waterway 200→150 (below). Pushed after parks so water sits
     * visibly above any park polygon it overlaps with.
     */
    if (OSM_WATER_BODIES.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-water-bodies",
          data: OSM_WATER_BODIES,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: [107, 138, 158, 105],
          getLineColor: [90, 117, 133, 135],
          lineWidthMinPixels: 1,
          getLineWidth: 1,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Waterways (Flint River system). `waterway=*`. Cool slate #6b8a9e
     * at alpha 150 (down from 200 — see the water-bodies comment
     * above for the 25%-reduction rationale). Still the second most
     * visible feature on the map after the city boundary, just less
     * saturated.
     */
    if (OSM_WATERWAYS.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-waterways",
          data: OSM_WATERWAYS,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [107, 138, 158, 150],
          lineWidthMinPixels: 2,
          lineWidthMaxPixels: 3,
          getLineWidth: 2.5,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Active rail lines. Spec PR 4 Change 3: `railway=rail` at
     * #7a6a52 alpha 180, 1.5px line. Renders solid (no dash).
     */
    if (OSM_RAIL_ACTIVE.features.length > 0) {
      // Spec PR 5: rail alpha bumped 180 -> 200.
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-rail-active",
          data: OSM_RAIL_ACTIVE,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [122, 106, 82, 200],
          lineWidthMinPixels: 1.5,
          getLineWidth: 1.5,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Disused / abandoned rail lines. Spec PR 4 Change 3: same warm
     * gray-brown #7a6a52 alpha 180 1.5px BUT dashed (4px on, 3px off)
     * via PathStyleExtension. Significant for Flint's industrial
     * history — abandoned beds carry meaning the active grid doesn't.
     */
    if (OSM_RAIL_DISUSED.features.length > 0) {
      // Spec PR 5: rail alpha bumped 180 -> 200 (matches active rail
      // for consistency). Dash pattern unchanged.
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-rail-disused",
          data: OSM_RAIL_DISUSED,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [122, 106, 82, 200],
          lineWidthMinPixels: 1.5,
          getLineWidth: 1.5,
          getDashArray: [4, 3],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Streets layer (PR 5 spec Change 3). Three tiers fed by the
     * regenerated OSM fixture's `highway_arterial|collector|local`
     * partitions. Promotes the street grid out of the baked CARTO
     * basemap raster so it renders at deliberate, consistent weights
     * at every zoom. Local tier first (most numerous, thinnest line),
     * then collector, then arterial on top so the hierarchy reads
     * unambiguously where tiers overlap at junctions.
     */
    const streetZoomScale = mapZoom < 13 ? 0.82 : mapZoom < 16 ? 1 : 1.16;
    const localStreetWidth = 0.7 * streetZoomScale;
    const collectorStreetWidth = 1.65 * streetZoomScale;
    const arterialStreetWidth = 3.05 * streetZoomScale;

    if (OSM_STREETS_LOCAL.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-streets-local",
          data: OSM_STREETS_LOCAL,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [168, 156, 132, 220],
          lineWidthMinPixels: localStreetWidth,
          lineWidthMaxPixels: localStreetWidth + 0.55,
          getLineWidth: localStreetWidth,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }
    if (OSM_STREETS_COLLECTOR.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-streets-collector",
          data: OSM_STREETS_COLLECTOR,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [168, 156, 132, 235],
          lineWidthMinPixels: collectorStreetWidth,
          lineWidthMaxPixels: collectorStreetWidth + 0.75,
          getLineWidth: collectorStreetWidth,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }
    if (OSM_STREETS_ARTERIAL.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-streets-arterial",
          data: OSM_STREETS_ARTERIAL,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [168, 156, 132, 245],
          lineWidthMinPixels: arterialStreetWidth,
          lineWidthMaxPixels: arterialStreetWidth + 1,
          getLineWidth: arterialStreetWidth,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Teal city perimeter. Prior versions of this surface ran a
     * terracotta line + a terracotta inner-glow halo to mark the
     * Flint boundary (PR 3, "Flint emerges from the paper" affordance);
     * in live use the terracotta-on-paper combination read as
     * vascular against the new infrastructure layers, so we retire
     * the inner-glow halo entirely and recolor the perimeter to the
     * existing infrastructure teal (#2DA699 = RGB 45, 166, 153) at
     * alpha 200, 1.5px. The boundary still suggests rather than
     * insists; the calmer hue lets the parks/water/rail layers carry
     * the chromatic weight of the map body.
     *
     * Pushed after the building stack so the perimeter wins the top
     * of the render — Flint reads as a contained shape without skyline
     * occluding its outline. Invoked by name below after the
     * buildingFabric block.
     */
    function pushBoundaryLayers() {
      if (FLINT_BOUNDARY_OUTLINE_FEATURE_COLLECTION.features.length === 0) {
        return;
      }
      result.push(
        new GeoJsonLayer({
          id: "atlas-flint-boundary-outline",
          data: FLINT_BOUNDARY_OUTLINE_FEATURE_COLLECTION,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [45, 166, 153, 200],
          lineWidthMinPixels: 1.5,
          getLineWidth: 1.5,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    const urbanDesignModelVisible =
      urbanDesignMassModel.features.length > 0 &&
      layerVisibility.urbanDesignModel !== false &&
      layerVisibility.buildings !== false;
    const buildingFabricVisible =
      urbanDesignModelVisible &&
      buildingFabricModel.features.length > 0 &&
      layerVisibility.buildingFabric !== false;
    const fabricFade = smoothstep(
      BUILDING_FABRIC_LOD.fabricFadeStartZoom,
      BUILDING_FABRIC_LOD.fabricFullZoom,
      mapZoom,
    );
    const massOpacity =
      mapZoom < BUILDING_FABRIC_LOD.blockRollupMaxZoom
        ? 0.58
        : 0.98 - fabricFade * 0.28;
    const fabricOpacity = buildingFabricVisible ? fabricFade : 0;
    const urbanExtruded =
      viewMode !== "atlas" && mapZoom >= BUILDING_FABRIC_LOD.extrusionMinZoom;
    // Spec PR 5: keep confident massing active at every zoom. Earlier
    // passes swapped into procedural archetype meshes at residential
    // zoom, but that reintroduced sawtooths, parapets, and storefront
    // geometry. The sketch read now comes from grain, edges, and
    // shadows instead of high-LOD sub-decomposition.
    const placesAsCivicContext =
      urbanDesignModelVisible && viewMode !== "atlas";

    /* OSM building footprints — extruded in non-atlas (3D) view modes.
     * Renders 6671 Flint buildings from Carriage Town + downtown as warm
     * stone volumes. Heights come from OSM `height` or `building:levels * 3`,
     * capped at 80 m. */
    if (
      viewMode !== "atlas" &&
      layerVisibility.osmBuildings !== false &&
      layerVisibility.buildings !== false
    ) {
      // Drop shadow first: rendered beneath the buildings so the
      // 3m southeast offset reads as a soft cast. Spec PR 5 (cheap
      // path): offset SolidPolygonLayer, not GPU shadow-mapping.
      // Filled at #3a3328 alpha 56 (~0.22), no stroke, no extrusion.
      result.push(
        new SolidPolygonLayer<GeoJSON.Feature<GeoJSON.Polygon>>({
          id: "atlas-building-drop-shadow",
          data: buildingShadowFeatures.features,
          pickable: false,
          filled: true,
          extruded: false,
          // Polygon coordinates are Position[][] (rings) — a valid
          // PolygonGeometry at runtime, but deck.gl's accessor return
          // type is the narrower `number[]`. Cast through unknown to
          // satisfy the type checker; runtime behavior is correct.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getPolygon: (feature) => feature.geometry.coordinates as any,
          getFillColor: [58, 51, 40, 56],
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
      result.push(
        new GeoJsonLayer({
          id: ATLAS_DECK_LAYER_IDS.osmBuildings,
          data: visibleOsmBuildings,
          pickable: true,
          onClick: handleBuildingClick,
          onHover: handleBuildingHover,
          // Edge lines: every building gets a 2px outline at
          // #7a8696 alpha 242 (warm gray with a slight indigo lean).
          // Spec PR 5: "polygons with edges read as drawings;
          // polygons without edges read as fills." This is the
          // single largest perceptual change in the PR.
          stroked: true,
          filled: true,
          extruded: true,
          opacity: atlasYear === null ? 1 : 0.42,
          wireframe: false,
          lineWidthMinPixels: 2,
          getLineWidth: 2,
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
            atlasYear === null ? [122, 94, 74, 230] : [122, 94, 74, 132],
          getLineColor: [122, 134, 150, 242],
          extensions: [BUILDING_PAPER_GRAIN_EXTENSION],
          ...BUILDING_PAPER_GRAIN_PROPS,
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
          extruded: viewMode !== "atlas" && !placesAsCivicContext,
          wireframe: viewMode !== "atlas" && !placesAsCivicContext,
          lineWidthMinPixels: placesAsCivicContext
            ? 1.15
            : viewMode === "atlas"
              ? 1
              : 0.7,
          getLineWidth: 1,
          getElevation: (f) => {
            if (placesAsCivicContext) return 0;
            const ft = f as PlaceFeature;
            return placeElevation(ft.properties.place_type, viewMode);
          },
          getFillColor: (f) => {
            const ft = f as PlaceFeature;
            return lensFillColor(
              ft.properties.place_type,
              activeLens,
              placesAsCivicContext,
            );
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
            getElevation: [placesAsCivicContext, viewMode],
            getFillColor: [activeLens, placesAsCivicContext],
            getLineColor: [],
          },
        }),
      );
    }

    // GeoJsonLayer mass extrusion: renders the building body at all
    // active sketch zooms so the texture and drawing edges stay
    // consistent instead of handing off to procedural high-LOD parts.
    if (urbanDesignModelVisible) {
      result.push(
        new GeoJsonLayer<UrbanDesignModelProperties, FillStyleExtensionProps>({
          id: ATLAS_DECK_LAYER_IDS.urbanDesignModel,
          data: urbanDesignMassModel,
          pickable: true,
          onClick: handleBuildingClick,
          onHover: handleBuildingHover,
          stroked: true,
          filled: true,
          extruded: urbanExtruded,
          wireframe: false,
          opacity: massOpacity,
          // Edge lines per spec PR 5: uniform #7a8696 alpha 242 at
          // 2px. Overrides the prior typology-based line color
          // (urbanDesignLineColor) — buildings now share one drawing
          // edge instead of per-typology stroke variation.
          lineWidthMinPixels: 2,
          getLineWidth: 2,
          getElevation: (feature) =>
            urbanDesignModelElevation(feature.properties, viewMode),
          getFillColor: (feature) =>
            urbanDesignFillColor(
              feature.properties,
              atlasYear,
              urbanDesignMaterialMode,
            ),
          getLineColor: [122, 134, 150, 242],
          extensions: [BUILDING_PAPER_GRAIN_EXTENSION],
          ...BUILDING_PAPER_GRAIN_PROPS,
          material: {
            ambient: 0.62,
            diffuse: 0.46,
            shininess: 18,
            specularColor: [240, 226, 202],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear, urbanDesignMaterialMode],
          },
        }),
      );
    }

    if (buildingFabricVisible && fabricOpacity > 0.01) {
      result.push(
        new GeoJsonLayer<UrbanDesignModelProperties, FillStyleExtensionProps>({
          id: ATLAS_DECK_LAYER_IDS.buildingFabric,
          data: buildingFabricModel,
          pickable: true,
          onClick: handleBuildingClick,
          onHover: handleBuildingHover,
          stroked: true,
          filled: true,
          extruded: urbanExtruded,
          wireframe: false,
          opacity: fabricOpacity,
          // Edge lines per spec PR 5: same uniform #7a8696 alpha 242
          // as the mass layer above. 2px across the board.
          lineWidthMinPixels: 2,
          getLineWidth: 2,
          getElevation: (feature) =>
            urbanDesignModelElevation(feature.properties, viewMode),
          getFillColor: (feature) =>
            urbanDesignFillColor(
              feature.properties,
              atlasYear,
              urbanDesignMaterialMode,
            ),
          getLineColor: [122, 134, 150, 242],
          extensions: [BUILDING_PAPER_GRAIN_EXTENSION],
          ...BUILDING_PAPER_GRAIN_PROPS,
          material: {
            ambient: 0.64,
            diffuse: 0.44,
            shininess: 14,
            specularColor: [236, 220, 192],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear, urbanDesignMaterialMode],
          },
        }),
      );
    }

    // Ground contact lines: flat (non-extruded) footprint outlines
    // rendered at z=0 with a darker ink so each building reads as
    // rooted to the ground plane rather than floating above it.
    // depthCompare:"always" prevents z-fighting with the extruded
    // base face that sits at the same elevation. One layer per
    // building source so conditional visibility stays consistent
    // with the extrusion layers above.
    const GROUND_CONTACT_COLOR: [number, number, number, number] = [42, 36, 25, 180];
    if (
      visibleOsmBuildings &&
      layerVisibility.osmBuildings !== false &&
      layerVisibility.buildings !== false
    ) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-building-ground-contact-osm",
          data: visibleOsmBuildings,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthMinPixels: 1,
          getLineWidth: 1,
          getLineColor: GROUND_CONTACT_COLOR,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }
    if (urbanDesignModelVisible) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-building-ground-contact-urban",
          data: urbanDesignMassModel,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthMinPixels: 1,
          getLineWidth: 1,
          getLineColor: GROUND_CONTACT_COLOR,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }
    if (buildingFabricVisible && fabricOpacity > 0.01) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-building-ground-contact-fabric",
          data: buildingFabricModel,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthMinPixels: 1,
          getLineWidth: 1,
          getLineColor: GROUND_CONTACT_COLOR,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    if (trafficSegments.length > 0 && layerVisibility.traffic !== false) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-traffic-flow-segments",
          data: {
            type: "FeatureCollection",
            features: trafficSegments,
          },
          pickable: true,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthUnits: "pixels",
          lineWidthMinPixels: 2,
          lineWidthMaxPixels: 11,
          getLineWidth: (
            feature: GeoJSON.Feature<GeoJSON.Geometry, TrafficSegmentProperties>,
          ) =>
            trafficWidth(feature.properties),
          getLineColor: (
            feature: GeoJSON.Feature<GeoJSON.Geometry, TrafficSegmentProperties>,
          ) =>
            trafficColor(
              feature.properties,
              feature.properties.segment_id === selectedTrafficSegmentId,
            ),
          onClick: (info) => {
            const segment = info.object as TrafficSegmentFeature | undefined;
            if (!segment) return false;
            onTrafficSegmentSelect?.(segment.properties.segment_id);
            return true;
          },
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
          updateTriggers: {
            getLineColor: [selectedTrafficSegmentId],
            getLineWidth: [trafficSnapshot?.generated_at],
          },
        }),
      );
    }

    // Spec PR 4 layer-order table: city boundary stroke + inner glow
    // render ABOVE the building stack. Pushed here, after the last
    // building layer (buildingFabric), so the terracotta perimeter
    // wins the top of the render and Flint reads as a lit island
    // emerging from the paper without skyline occlusion.
    pushBoundaryLayers();

    if (
      scenarioEnvelopeFeatures &&
      scenarioEnvelopeFeatures.features.length > 0 &&
      layerVisibility.scenarioEnvelopes !== false
    ) {
      result.push(
        new GeoJsonLayer<ScenarioEnvelopeProperties>({
          id: "scenario-envelope-volumes",
          data: scenarioEnvelopeFeatures,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: viewMode !== "atlas",
          wireframe: viewMode !== "atlas",
          opacity: 0.96,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
          lineWidthMinPixels: scenarioCompareEnabled ? 3.2 : 2.2,
          getLineWidth: scenarioCompareEnabled ? 3.4 : 2.4,
          getElevation: (feature) =>
            Math.max(12, feature.properties.heightM * 2.15),
          getFillColor: (feature) =>
            envelopeFillColor(
              feature.properties.envelopeType,
              scenarioCompareEnabled,
            ),
          getLineColor: (feature) =>
            envelopeLineColor(
              feature.properties.envelopeType,
              scenarioCompareEnabled,
            ),
          material: {
            ambient: 0.76,
            diffuse: 0.32,
            shininess: 24,
            specularColor: [255, 246, 220],
          },
          updateTriggers: {
            getElevation: [scenarioEnvelopeFeatures],
            getFillColor: [scenarioCompareEnabled],
            getLineColor: [scenarioCompareEnabled],
          },
        }),
      );
    }

    if (
      scenarioCompareEnabled &&
      scenarioDeltaFeatures &&
      scenarioDeltaFeatures.features.length > 0 &&
      layerVisibility.scenarioEnvelopes !== false
    ) {
      result.push(
        new GeoJsonLayer<ScenarioDeltaProperties>({
          id: "scenario-envelope-deltas",
          data: scenarioDeltaFeatures,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: viewMode !== "atlas",
          wireframe: viewMode !== "atlas",
          opacity: 0.92,
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
          lineWidthMinPixels: 2,
          getLineWidth: 2,
          getElevation: (feature) =>
            Math.max(12, feature.properties.heightDeltaM * 3.2),
          getFillColor: (feature) =>
            envelopeFillColor(feature.properties.envelopeType, true),
          getLineColor: [193, 74, 44, 220],
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

    /*
     * Selected building outline. Spec PR 1: 2px terracotta stroke
     * (`--ctx-accent`, #c14a2c -> RGB 193, 74, 44) on the picked
     * building's footprint. Renders above the building layers so the
     * highlight remains visible regardless of extrusion state.
     */
    if (selectedBuildingFeatureCollection) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-selected-building-outline",
          data: selectedBuildingFeatureCollection,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthMinPixels: 2,
          getLineWidth: 2,
          getLineColor: [193, 74, 44, 235],
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
        }),
      );
    }

    /*
     * Hover-hint outline. Spec PR 1: 1px terracotta at alpha 140 on the
     * currently hovered building. Lighter than the selection outline so
     * the two are visually distinguishable when the cursor moves over a
     * non-selected building. Desktop-only by virtue of `canHover` gating
     * `handleBuildingHover`.
     */
    if (hoveredBuildingFeatureCollection) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-hovered-building-outline",
          data: hoveredBuildingFeatureCollection,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          lineWidthMinPixels: 1,
          getLineWidth: 1,
          getLineColor: [193, 74, 44, 140],
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
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

    // Append caller-provided overlay layers last so they render on
    // top of everything AtlasMap composes itself. The planner route
    // hands its per-category placement layers in via this prop. Null
    // check guards against undefined (the prop is optional).
    if (extraDeckLayers && extraDeckLayers.length > 0) {
      result.push(...extraDeckLayers);
    }

    return result;
  }, [
    geometricPlaces,
    positionedEvents,
    selectedFeatureCollection,
    selectedBuildingFeatureCollection,
    hoveredBuildingFeatureCollection,
    layerVisibility,
    handleClick,
    handleBuildingClick,
    handleBuildingHover,
    onPlaceSelect,
    viewMode,
    activeLens,
    atlasYear,
    historicalReconstructions,
    visibleOsmBuildings,
    buildingShadowFeatures,
    urbanDesignMassModel,
    buildingFabricModel,
    urbanDesignMaterialMode,
    mapZoom,
    scenarioEnvelopeFeatures,
    scenarioCompareEnabled,
    scenarioDeltaFeatures,
    trafficSegments,
    trafficSnapshot?.generated_at,
    selectedTrafficSegmentId,
    onTrafficSegmentSelect,
    extraDeckLayers,
  ]);

  /* ---- Render ----------------------------------------------------- */
  return (
    <div
      ref={mapContainerRef}
      className={cn("atlas-scene-map relative w-full h-full", className)}
      data-atlas-view-mode={viewMode}
      data-atlas-lens={activeLens}
      data-mobile-surface={mobileSurface}
    >
      <Map
        ref={(instance: MapRef | null) => {
          mapRef.current = instance;
          setMapInstance(instance);
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
        dragPan={mapDragPanEnabled}
        attributionControl={false}
        onLoad={() => setMapLoaded(true)}
        onMove={(event) => {
          const { viewState } = event;
          setMapZoom(viewState.zoom);
          setMapViewKey(
            `${viewState.longitude.toFixed(5)}:${viewState.latitude.toFixed(5)}:${viewState.zoom.toFixed(2)}:${viewState.pitch.toFixed(1)}:${viewState.bearing.toFixed(1)}`,
          );
        }}
        reuseMaps
      >
        <DeckGLOverlay
          layers={layers}
          onClick={handleEmptyAreaClick}
          onReady={handleOverlayReady}
        />
        <NavigationControl position="bottom-right" />
      </Map>

      <AnimeTrafficFlowOverlay
        map={mapInstance}
        mapLoaded={mapLoaded}
        mapViewKey={mapViewKey}
        segments={animatedTrafficSegments}
        visible={
          animatedTrafficSegments.length > 0 &&
          layerVisibility.traffic !== false
        }
        prefersReducedMotion={prefersReducedMotion}
      />

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

      {/*
        Building hover tooltip. Spec PR 1 originally used typology class
        plus a support number. The confidence-discipline pass keeps the
        tooltip to a plain noun phrase and a public label. Rendered above
        the basemap and below the chrome (z-index between vignette and
        AtlasShell controls). Pointer-events:none so it never intercepts
        map gestures. Desktop-only via the `canHover` gate on
        `handleBuildingHover`; hoverState is never set on touch devices.
      */}
      {hoverState ? (
        <div
          aria-hidden="true"
          className="atlas-building-hover-tooltip pointer-events-none absolute z-[10] rounded-[10px] border border-[rgba(42,36,25,0.12)] bg-[rgba(255,255,255,0.92)] px-3 py-2 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.08em] text-[color:var(--ctx-ink)] shadow-[0_8px_18px_-12px_rgba(42,36,25,0.45)]"
          style={{
            left: Math.min(hoverState.x + 14, 2000),
            top: Math.max(hoverState.y - 56, 8),
            maxWidth: 220,
          }}
        >
          {/*
            Spec PR 4 confidence-discipline rule: hover tooltip shows
            what the building IS (the noun-phrase typology) and where
            (name/address/public fallback). No confidence percentage and
            no OSM id:
            once the archetype was selected upstream, the chrome
            commits to it.
          */}
          <div className="text-[color:var(--ctx-ink)]">
            {hoverState.building.typology_class ?? "Unclassified"}
          </div>
          <div className="text-[color:var(--ctx-ink-soft)] normal-case tracking-[0.04em]">
            {hoverState.building.name ?? hoverState.building.address ?? "Mapped building"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
