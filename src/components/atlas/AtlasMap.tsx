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
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import { PathStyleExtension } from "@deck.gl/extensions";
import difference from "@turf/difference";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import { ensurePmtilesProtocol } from "@/lib/atlas/pmtiles";
import {
  getAtlasBoundaryBbox,
  getAtlasBoundaryOutlineFeature,
} from "@/lib/atlas/atlas-boundary";
import osmBuildings from "@/data/open-flint-atlas/fixtures/osm-buildings.json";
import osmInfrastructure from "@/data/open-flint-atlas/fixtures/osm-infrastructure.json";
import { createLostFlintDeckLayers } from "@/components/atlas/AtlasLostFlintDeckLayer";
import { buildArchetypeMeshLayersFromCollection } from "@/components/atlas/AtlasArchetypeMeshLayer";
import type { HistoricalReconstruction } from "@/lib/atlas/historical-reconstruction";
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
} from "@/lib/api/openFlintAtlas";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import type { SelectedBuilding } from "@/lib/atlas/selected-building";
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
  | "highway_corridor";

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
const OSM_HIGHWAY_CORRIDORS = partitionInfrastructure("highway_corridor");

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

function urbanDesignLineColor(
  props: UrbanDesignModelProperties,
  materialMode: UrbanDesignMaterialMode,
): [number, number, number, number] {
  if (materialMode === "sketch_model") {
    const line =
      props.part_role === "party_wall" ? SKETCH_LINE_PARTY_WALL : SKETCH_LINE;
    return applyFabricCompletenessAlpha(props, line);
  }

  return applyFabricCompletenessAlpha(
    props,
    URBAN_PART_LINE[props.part_role] ?? URBAN_FORM_LINE[props.form_type],
  );
}

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
  scenarioEnvelopeFeatures,
  scenarioDeltaFeatures,
  scenarioCompareEnabled = false,
  urbanDesignMaterialMode = "typology",
  selectedBuilding = null,
  onBuildingSelect,
}: AtlasMapProps) {
  ensurePmtilesProtocol();
  const camera = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].camera;
  const mapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(camera.zoom);
  const appliedMobileFitKeyRef = useRef<string | null>(null);

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

  /* ---- Layers ----------------------------------------------------- */
  const layers = useMemo(() => {
    const result: Layer[] = [];

    /*
     * Bound-world vignette mask. Spec PR 3 introduced this; PR 4
     * (map-body-and-discipline) walks back its opacity so Flint is
     * "lit against something, not floating in nothing." Fill drops
     * from alpha 220 to 160 (surrounding basemap goes from ~14%
     * visible to ~37% visible — faint Frankenmuth / Mt Morris /
     * Burton / Clio labels readable as ghosts, Flint River trace
     * visible upstream and downstream, major highways outside Flint
     * barely visible). Boundary band line drops 180 to 140 (softer
     * feather). Still the poor-man's substitute for a true gaussian
     * edge, just dialed back.
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
          getFillColor: [242, 241, 236, 160],
          getLineColor: [242, 241, 236, 140],
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
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-parks",
          data: OSM_PARKS,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: [158, 184, 158, 140],
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
     * Water bodies. Spec PR 4 Change 3: `natural=water`. Cool slate
     * fill #6b8a9e at alpha 140 + stroke #5a7585 1px alpha 180. Pushed
     * after parks so water sits visibly above any park polygon it
     * overlaps with (e.g. ponds inside parks).
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
          getFillColor: [107, 138, 158, 140],
          getLineColor: [90, 117, 133, 180],
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
     * Waterways (Flint River system). Spec PR 4 Change 3:
     * `waterway=*`. Cool slate #6b8a9e at alpha 200, 2-3px line.
     * Should read as the second-most visible feature on the map after
     * the city boundary — currently nearly invisible without this
     * layer.
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
          getLineColor: [107, 138, 158, 200],
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
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-rail-active",
          data: OSM_RAIL_ACTIVE,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [122, 106, 82, 180],
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
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-rail-disused",
          data: OSM_RAIL_DISUSED,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [122, 106, 82, 180],
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
     * Highway corridors. Spec PR 4 Change 3: `highway=motorway|trunk`
     * at #b8a888 alpha 100, 4px line. For I-475, UAW Freeway,
     * Chevrolet-Buick Freeway. Reads as visible corridors against the
     * dialed-back vignette, not as basemap ghosts. No labels rendered
     * by this layer — the basemap raster handles those.
     */
    if (OSM_HIGHWAY_CORRIDORS.features.length > 0) {
      result.push(
        new GeoJsonLayer({
          id: "atlas-osm-highway-corridors",
          data: OSM_HIGHWAY_CORRIDORS,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: [184, 168, 136, 100],
          lineWidthMinPixels: 4,
          getLineWidth: 4,
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
    // At residential zoom (>= 15) we replace the flat GeoJsonLayer
    // mass extrusion with a procedural archetype mesh layer (gable,
    // hipped, sawtooth, parapet, storefront). The GeoJsonLayer reads
    // as "Lego brick" once individual houses are visible; the
    // procedural mesh carries roof profile.
    const useProceduralMesh =
      urbanDesignModelVisible &&
      urbanExtruded &&
      mapZoom >= BUILDING_FABRIC_LOD.proceduralMeshMinZoom;
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
      result.push(
        new GeoJsonLayer({
          id: ATLAS_DECK_LAYER_IDS.osmBuildings,
          data: visibleOsmBuildings,
          pickable: true,
          onClick: handleBuildingClick,
          onHover: handleBuildingHover,
          stroked: false,
          filled: true,
          extruded: true,
          opacity: atlasYear === null ? 1 : 0.42,
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
            atlasYear === null ? [122, 94, 74, 230] : [122, 94, 74, 132],
          getLineColor:
            atlasYear === null ? [82, 64, 50, 200] : [82, 64, 50, 118],
          material: {
            ambient: 0.58,
            diffuse: 0.48,
            shininess: 12,
            specularColor: [232, 215, 188],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear === null],
            getLineColor: [atlasYear === null],
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

    // GeoJsonLayer mass extrusion: renders the flat-topped building
    // body at mid-zoom (13 <= z < 15). At z >= 15 the procedural
    // archetype mesh layer (mounted below) takes over so individual
    // houses get real roof profiles instead of flat tops.
    if (
      urbanDesignModelVisible && !useProceduralMesh
    ) {
      result.push(
        new GeoJsonLayer<UrbanDesignModelProperties>({
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
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
          lineWidthMinPixels: viewMode === "atlas" ? 0.9 : 0.7,
          getLineWidth: viewMode === "atlas" ? 0.9 : 0.75,
          getElevation: (feature) =>
            urbanDesignModelElevation(feature.properties, viewMode),
          getFillColor: (feature) =>
            urbanDesignFillColor(
              feature.properties,
              atlasYear,
              urbanDesignMaterialMode,
            ),
          getLineColor: (feature) =>
            urbanDesignLineColor(
              feature.properties,
              urbanDesignMaterialMode,
            ),
          material: {
            ambient: 0.62,
            diffuse: 0.46,
            shininess: 18,
            specularColor: [240, 226, 202],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear, urbanDesignMaterialMode],
            getLineColor: [urbanDesignMaterialMode],
          },
        }),
      );
    }

    // Procedural archetype mesh layers (one per archetype). Takes over
    // from the GeoJsonLayer mass extrusion at zoom >= 15 so individual
    // buildings carry their typology's roof profile (gable, hipped,
    // sawtooth, parapet, storefront) instead of all reading as flat
    // boxes. See AtlasArchetypeMeshLayer for the per-archetype mesh
    // catalog and instance derivation.
    if (useProceduralMesh) {
      const meshLayers = buildArchetypeMeshLayersFromCollection(
        urbanDesignMassModel,
        {
          pickable: true,
          onClick: handleBuildingClick,
          onHover: handleBuildingHover,
        },
      );
      for (const meshLayer of meshLayers) {
        result.push(meshLayer);
      }
    }

    if (buildingFabricVisible && fabricOpacity > 0.01) {
      result.push(
        new GeoJsonLayer<UrbanDesignModelProperties>({
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
          parameters: {
            depthCompare: "always",
            depthWriteEnabled: false,
          },
          lineWidthMinPixels: viewMode === "atlas" ? 0.7 : 0.55,
          getLineWidth: viewMode === "atlas" ? 0.7 : 0.55,
          getElevation: (feature) =>
            urbanDesignModelElevation(feature.properties, viewMode),
          getFillColor: (feature) =>
            urbanDesignFillColor(
              feature.properties,
              atlasYear,
              urbanDesignMaterialMode,
            ),
          getLineColor: (feature) =>
            urbanDesignLineColor(
              feature.properties,
              urbanDesignMaterialMode,
            ),
          material: {
            ambient: 0.64,
            diffuse: 0.44,
            shininess: 14,
            specularColor: [236, 220, 192],
          },
          updateTriggers: {
            getElevation: [viewMode],
            getFillColor: [atlasYear, urbanDesignMaterialMode],
            getLineColor: [urbanDesignMaterialMode],
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
    urbanDesignMassModel,
    buildingFabricModel,
    urbanDesignMaterialMode,
    mapZoom,
    scenarioEnvelopeFeatures,
    scenarioCompareEnabled,
    scenarioDeltaFeatures,
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
        onMove={(event) => setMapZoom(event.viewState.zoom)}
        reuseMaps
      >
        <DeckGLOverlay layers={layers} onClick={handleEmptyAreaClick} />
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

      {/*
        Building hover tooltip. Spec PR 1: typology class + confidence
        percentage + address (or osm_id when no address). Rendered above
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
            (address or osm_id fallback). No confidence percentage —
            once the archetype was selected upstream, the chrome
            commits to it.
          */}
          <div className="text-[color:var(--ctx-ink)]">
            {hoverState.building.typology_class ?? "Unclassified"}
          </div>
          <div className="text-[color:var(--ctx-ink-soft)] normal-case tracking-[0.04em]">
            {hoverState.building.address ?? `Building #${hoverState.building.osm_id}`}
          </div>
        </div>
      ) : null}
    </div>
  );
}
