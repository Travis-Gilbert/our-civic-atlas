/**
 * AtlasArchetypeMeshLayer: procedural archetype mesh layers for the
 * Phase A.5 sketch-model render.
 *
 * The existing `urbanDesignModel` GeoJsonLayer extrudes each building's
 * mass as a flat-topped box. That reads as "Lego brick" at the
 * residential-zoom range where individual houses become visible. This
 * module replaces those flat extrusions with sloped-roof procedural
 * meshes via deck.gl SimpleMeshLayer:
 *
 *   - residential_single  -> gable-roofed house (Carriage Town).
 *   - present_civic       -> hipped pyramidal roof (civic anchor).
 *   - present_industrial  -> sawtooth roof (Buick factory pattern).
 *   - present_commercial  -> flat roof with raised parapet (downtown).
 *   - present_mixed_use   -> flat roof with recessed storefront band.
 *   - residential_multi   -> flat slab (apartment building default).
 *   - present_unknown     -> flat extruded box (identical to the prior
 *                            extrusion; the "no signal" fallback).
 *
 * The geometry catalog lives in
 * `src/lib/atlas/procedural-archetype-meshes.ts`. This module is the
 * thin deck.gl wrapper that groups urbanDesignModel features by
 * building (spec_id), computes per-building anchor metadata (centroid,
 * bounds, bearing), and emits one SimpleMeshLayer per archetype.
 *
 * One layer per archetype is the right granularity: SimpleMeshLayer is
 * one-mesh-many-instances. Each layer carries up to thousands of
 * instances of the same mesh, batched into a single draw call. Six
 * archetypes -> up to six draw calls. The cost scales with the number
 * of UNIQUE archetypes present, not with the number of buildings.
 */

import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import type { Layer, PickingInfo } from "@deck.gl/core";

import { getArchetypeGeometry } from "@/lib/atlas/procedural-archetype-meshes";
import { ATLAS_DECK_LAYER_IDS } from "@/lib/atlas/renderer-bridge";
import type { BuildingFabricArchetype } from "@/lib/atlas/building-fabric";
import type {
  UrbanDesignModelCollection,
  UrbanDesignModelFeature,
  UrbanDesignModelProperties,
} from "@/lib/atlas/urban-design-model";

/* ------------------------------------------------------------------ */
/*  Per-instance metadata                                              */
/* ------------------------------------------------------------------ */

/**
 * One mesh instance == one building. The dimensions, bearing, and
 * archetype come from the parent building's `BuildingFormSpec`; the
 * centroid comes from the bounds-union of the building's parts.
 */
export type ArchetypeMeshInstance = {
  /** Stable id (`spec_id` from urban-design-model). Used for picking. */
  building_id: string;
  /** Source OSM id. Available for joining back to assessor data. */
  source_osm_id: string;
  /** Archetype controls which Geometry the layer mounts. */
  archetype: BuildingFabricArchetype;
  /** Centroid in [longitude, latitude]. */
  position: [number, number];
  /** Front-edge bearing in compass degrees (0 = north, 90 = east). */
  bearingDeg: number;
  /** Building width along the front edge, in meters. */
  widthM: number;
  /** Building depth perpendicular to the front edge, in meters. */
  depthM: number;
  /** Building height in meters (above ground). */
  heightM: number;
  /** Effective confidence (min of typology + fabric completeness). */
  confidence: number;
  /** The feature this instance was anchored from (for picking payload). */
  anchorFeature: UrbanDesignModelFeature;
};

/* ------------------------------------------------------------------ */
/*  Instance derivation                                                */
/* ------------------------------------------------------------------ */

/** Local plane bounds in lng/lat plus their meter projection. */
type BuildingBoundsAccumulator = {
  west: number;
  south: number;
  east: number;
  north: number;
  archetype: BuildingFabricArchetype;
  source_osm_id: string;
  bearingDeg: number;
  heightM: number;
  confidence: number;
  anchorFeature: UrbanDesignModelFeature;
};

function ingestRingIntoBounds(
  acc: BuildingBoundsAccumulator,
  ring: GeoJSON.Position[],
): void {
  for (const [lng, lat] of ring) {
    if (lng < acc.west) acc.west = lng;
    if (lng > acc.east) acc.east = lng;
    if (lat < acc.south) acc.south = lat;
    if (lat > acc.north) acc.north = lat;
  }
}

function effectiveConfidence(props: UrbanDesignModelProperties): number {
  // Mirror the existing alpha rule in AtlasMap.tsx: the displayed
  // confidence is the min of the typology classifier's output and the
  // fabric completeness score. Buildings with low typology confidence
  // OR low completeness fade out together.
  const typology =
    props.typology_confidence === null || props.typology_confidence === undefined
      ? 1
      : props.typology_confidence;
  const fabric = props.fabric_feature_completeness ?? 1;
  return Math.max(0, Math.min(1, Math.min(typology, fabric)));
}

/**
 * Group urbanDesignModel features by spec_id and emit one
 * ArchetypeMeshInstance per building.
 *
 * Each building's bounds are the union of all its part polygons'
 * bboxes (which equals the original OSM footprint's bbox up to
 * floating-point error). Centroid is the bbox center; widthM/depthM
 * convert the bbox into meters using the building's centroid latitude.
 * Bearing, archetype, height, and confidence come from any part of
 * the building (they're identical for parts of the same spec).
 */
export function deriveArchetypeMeshInstances(
  collection: UrbanDesignModelCollection,
): ArchetypeMeshInstance[] {
  const byBuilding = new Map<string, BuildingBoundsAccumulator>();

  for (const feature of collection.features) {
    const props = feature.properties;
    const ring = feature.geometry.coordinates[0];
    if (!ring || ring.length === 0) continue;

    let acc = byBuilding.get(props.spec_id);
    if (!acc) {
      acc = {
        west: Number.POSITIVE_INFINITY,
        south: Number.POSITIVE_INFINITY,
        east: Number.NEGATIVE_INFINITY,
        north: Number.NEGATIVE_INFINITY,
        archetype: props.fabric_archetype,
        source_osm_id: props.source_osm_id,
        bearingDeg: props.fabric_front_edge_bearing_degrees,
        heightM: props.fabric_height_m,
        confidence: effectiveConfidence(props),
        anchorFeature: feature,
      };
      byBuilding.set(props.spec_id, acc);
    }
    ingestRingIntoBounds(acc, ring);
  }

  const instances: ArchetypeMeshInstance[] = [];
  byBuilding.forEach((acc, spec_id) => {
    if (
      !Number.isFinite(acc.west) ||
      !Number.isFinite(acc.east) ||
      !Number.isFinite(acc.south) ||
      !Number.isFinite(acc.north)
    ) {
      return;
    }
    const centerLng = (acc.west + acc.east) / 2;
    const centerLat = (acc.south + acc.north) / 2;
    const metersPerLat = 111_320;
    const metersPerLng = Math.cos((centerLat * Math.PI) / 180) * metersPerLat;
    const bboxWidthM = (acc.east - acc.west) * metersPerLng;
    const bboxHeightM = (acc.north - acc.south) * metersPerLat;

    // The bbox is axis-aligned to lng/lat. After SimpleMeshLayer rotates
    // by yaw = 90 - bearing_deg, the mesh's +x axis points along the
    // front edge. To make the rendered scale match the building's true
    // frontage/depth, we need the meter extents in the FRONT-EDGE
    // direction (along bearing) and PERPENDICULAR. We approximate
    // these by projecting the axis-aligned bbox onto the rotated frame
    // using |cos(bearing)| / |sin(bearing)| weights. This is correct
    // for rectangular footprints and reasonable for irregular ones.
    const bearingRad = (acc.bearingDeg * Math.PI) / 180;
    const cosB = Math.abs(Math.cos(bearingRad));
    const sinB = Math.abs(Math.sin(bearingRad));
    // bearing 0 (north) -> frontage runs north-south, so frontage = bboxHeightM.
    // bearing 90 (east) -> frontage runs east-west, so frontage = bboxWidthM.
    // Mix proportionally for in-between bearings.
    const widthM = Math.max(2, bboxWidthM * sinB + bboxHeightM * cosB);
    const depthM = Math.max(2, bboxWidthM * cosB + bboxHeightM * sinB);

    instances.push({
      building_id: spec_id,
      source_osm_id: acc.source_osm_id,
      archetype: acc.archetype,
      position: [centerLng, centerLat],
      bearingDeg: acc.bearingDeg,
      widthM,
      depthM,
      heightM: Math.max(2, acc.heightM),
      confidence: acc.confidence,
      anchorFeature: acc.anchorFeature,
    });
  });

  return instances;
}

/* ------------------------------------------------------------------ */
/*  Sketch tone (must match AtlasMap.tsx SKETCH_TONE_BY_DETAIL_LEVEL). */
/*                                                                     */
/*  We use the "mass" tone as the dominant chipboard color for the     */
/*  procedural mesh, and shade it slightly per archetype so the user   */
/*  can read building TYPE at a glance from the chipboard's tone       */
/*  variation without breaking the single-material discipline. The     */
/*  variation is intentionally subtle: 4-8 RGB units, not 30+. Anyone  */
/*  squinting at a real basswood massing model sees this kind of       */
/*  natural tonal variation from grain and finishing direction.         */
/* ------------------------------------------------------------------ */

const SKETCH_TONE_MASS: [number, number, number, number] = [236, 230, 218, 234];

const ARCHETYPE_TONE_NUDGE: Record<
  BuildingFabricArchetype,
  [number, number, number]
> = {
  // Residential leans warm (a touch yellower).
  present_residential_single: [4, 2, -4],
  present_residential_multi: [2, 0, -2],
  // Civic leans cool (slightly bluer).
  present_civic: [-2, 0, 6],
  // Industrial slightly darker + cooler.
  present_industrial: [-6, -4, 0],
  // Commercial neutral.
  present_commercial: [0, 0, 0],
  // Mixed-use a touch warmer.
  present_mixed_use: [2, 1, -1],
  // Unknown: no nudge, base chipboard tone.
  present_unknown: [0, 0, 0],
};

function archetypeColor(
  archetype: BuildingFabricArchetype,
  confidence: number,
): [number, number, number, number] {
  const nudge = ARCHETYPE_TONE_NUDGE[archetype];
  const r = Math.max(0, Math.min(255, SKETCH_TONE_MASS[0] + nudge[0]));
  const g = Math.max(0, Math.min(255, SKETCH_TONE_MASS[1] + nudge[1]));
  const b = Math.max(0, Math.min(255, SKETCH_TONE_MASS[2] + nudge[2]));
  // Confidence below 0.5 drops alpha down to 152 (matches the existing
  // applyFabricCompletenessAlpha curve), telling the eye "we're less
  // sure about this one." At full confidence we get the full SKETCH
  // alpha.
  const minAlpha = 152;
  const maxAlpha = SKETCH_TONE_MASS[3];
  const alpha = Math.round(
    minAlpha + (maxAlpha - minAlpha) * Math.max(0, Math.min(1, confidence)),
  );
  return [r, g, b, alpha];
}

/* ------------------------------------------------------------------ */
/*  Layer factory                                                      */
/* ------------------------------------------------------------------ */

export type ArchetypeMeshLayerOptions = {
  /**
   * Uniform scale applied to ALL instances. The instance per-axis
   * scale already carries meter dimensions, so this should be 1. A
   * value > 1 visibly oversizes every building for diagnostic
   * purposes; values < 1 are not meaningful.
   */
  sizeScale?: number;
  /**
   * Whether the layer is pickable. The picking payload is the
   * anchor feature (a UrbanDesignModelFeature), so picks land in the
   * same downstream handler as the GeoJsonLayer picks.
   */
  pickable?: boolean;
  /**
   * Material to pass to SimpleMeshLayer. Defaults to the urbanDesign
   * mass material for visual continuity with the GeoJsonLayer it
   * replaces.
   */
  material?: {
    ambient: number;
    diffuse: number;
    shininess: number;
    specularColor: [number, number, number];
  };
  /**
   * Per-layer pick handler. The picking payload is the
   * `ArchetypeMeshInstance`; the consumer reads `info.object.anchorFeature.properties`
   * to land in the same shape as a GeoJsonLayer pick on the urban
   * design model. Spec: PR 1 building click interactions.
   */
  onClick?: (info: PickingInfo) => boolean | void;
  /**
   * Per-layer hover handler. Same payload shape as `onClick`. Spec PR 1:
   * desktop-only hover hint outline + tooltip.
   */
  onHover?: (info: PickingInfo) => boolean | void;
};

const DEFAULT_MATERIAL: ArchetypeMeshLayerOptions["material"] = {
  ambient: 0.62,
  diffuse: 0.46,
  shininess: 18,
  specularColor: [240, 226, 202],
};

/**
 * Build one SimpleMeshLayer per archetype. Returns an array of layers
 * suitable for inclusion in the deck.gl `layers` array. The caller
 * controls visibility by including or excluding the result.
 *
 * If `instances` is empty, returns an empty array (no layers).
 */
export function buildArchetypeMeshLayers(
  instances: ArchetypeMeshInstance[],
  options: ArchetypeMeshLayerOptions = {},
): Layer[] {
  if (instances.length === 0) return [];

  const {
    sizeScale = 1,
    pickable = true,
    material = DEFAULT_MATERIAL,
    onClick,
    onHover,
  } = options;

  // Group by archetype so each layer carries one geometry.
  const byArchetype = new Map<BuildingFabricArchetype, ArchetypeMeshInstance[]>();
  for (const instance of instances) {
    let bucket = byArchetype.get(instance.archetype);
    if (!bucket) {
      bucket = [];
      byArchetype.set(instance.archetype, bucket);
    }
    bucket.push(instance);
  }

  const layers: Layer[] = [];
  byArchetype.forEach((bucket, archetype) => {
    layers.push(
      new SimpleMeshLayer<ArchetypeMeshInstance>({
        id: `${ATLAS_DECK_LAYER_IDS.urbanDesignModel}-mesh-${archetype}`,
        data: bucket,
        mesh: getArchetypeGeometry(archetype),
        sizeScale,
        pickable,
        onClick,
        onHover,
        // Centroid: SimpleMeshLayer treats [lng, lat] as the
        // instance origin. The mesh extends in [-0.5, +0.5] on each
        // axis BEFORE getScale; after scaling by [widthM, depthM,
        // heightM] the building occupies its real footprint extent.
        getPosition: (instance) => instance.position,
        // Non-uniform scale: width along x (frontage), depth along y
        // (front-to-back), height along z. SimpleMeshLayer accepts
        // [sx, sy, sz] and multiplies the unit mesh per-axis.
        getScale: (instance) =>
          [instance.widthM, instance.depthM, instance.heightM] as [
            number,
            number,
            number,
          ],
        // The unit mesh is centered around z=0 (extends from z=-0.5
        // to z=+0.5). After scaling by heightM, the mesh extends
        // from z=-heightM/2 to z=+heightM/2. Translate up by
        // heightM/2 so the base sits on the ground (z=0).
        getTranslation: (instance) =>
          [0, 0, instance.heightM * 0.5] as [number, number, number],
        // Yaw rotates around z. deck.gl convention: with yaw=0, the
        // mesh's +x axis points east. Our convention: +x points
        // along the front edge (bearing direction). Compass bearing
        // is measured clockwise from north; deck.gl yaw is measured
        // counter-clockwise from east. yaw = 90 - bearing_deg
        // converts compass-from-north to deck-from-east.
        getOrientation: (instance) =>
          [0, 90 - instance.bearingDeg, 0] as [number, number, number],
        getColor: (instance) =>
          archetypeColor(instance.archetype, instance.confidence),
        material,
        // Don't fight depth: we want sloped roofs to occlude things
        // behind them properly, unlike the depth-disabled
        // GeoJsonLayer extrusion.
        parameters: {
          depthCompare: "less-equal",
          depthWriteEnabled: true,
        },
        updateTriggers: {
          getColor: [],
        },
      }),
    );
  });

  return layers;
}

/* ------------------------------------------------------------------ */
/*  Convenience: end-to-end builder                                    */
/* ------------------------------------------------------------------ */

/**
 * One-shot helper: derive instances and build layers in a single
 * call. Useful from AtlasMap.tsx so the consumer doesn't have to
 * remember to call both functions.
 */
export function buildArchetypeMeshLayersFromCollection(
  collection: UrbanDesignModelCollection,
  options: ArchetypeMeshLayerOptions = {},
): Layer[] {
  return buildArchetypeMeshLayers(
    deriveArchetypeMeshInstances(collection),
    options,
  );
}
