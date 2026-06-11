/**
 * PorchfestAffordanceMeshLayer: 3D affordance meshes for the PorchFest
 * planner.
 *
 * Sibling of `AtlasArchetypeMeshLayer.ts`. Where that module renders one
 * `SimpleMeshLayer` per building archetype, this renders one
 * `SimpleMeshLayer` per placement category, so each planning point shows
 * as a recognizable three-dimensional figure of what it is (a food truck
 * as a truck, a band as a figure with an instrument, a vendor as a tent)
 * instead of a flat colored dot. The planner reads the map by recognizing
 * shapes, not by decoding dot colors.
 *
 * The geometry catalog lives in
 * `src/lib/atlas/procedural-porchfest-meshes.ts`. This module is the thin
 * deck.gl wrapper that groups placements by category and emits one layer
 * per category, each carrying that category's unit-form geometry scaled
 * to a per-category size in meters.
 *
 * Composition: this mesh layer renders the affordance bodies; the
 * `PlannerEditableLayer` (TranslateMode) handles the drag and commits the
 * move. Both are keyed on the same placements and both go in the deck.gl
 * layer stack via the map's `extraDeckLayers`. The mesh is the body; the
 * editable layer is the muscle.
 */

import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import type { Layer, PickingInfo } from "@deck.gl/core";

import { getPorchfestAffordanceGeometry } from "@/lib/atlas/procedural-porchfest-meshes";
import {
  CATEGORY_COLOR,
  type AtlasEventPlannerCategory,
  type AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";

/* ------------------------------------------------------------------ */
/*  Per-category size (meters).                                         */
/*                                                                     */
/*  Placements do not carry their own dimensions the way buildings do, */
/*  so each category gets a fixed size in [widthX, depthY, heightZ]    */
/*  meters tuned so the forms read at street-level zoom without         */
/*  overlapping absurdly. A food truck is bigger than a restroom; a    */
/*  stage is bigger than a bench.                                      */
/* ------------------------------------------------------------------ */

const AFFORDANCE_SIZE_M: Record<
  AtlasEventPlannerCategory,
  [number, number, number]
> = {
  music: [3.5, 3.5, 2.4],
  vendor: [3.5, 3, 3.2],
  food_court: [9, 4, 4.5],
  kid_zone: [7, 6, 4],
  parking: [5, 2.5, 2.5],
  restroom: [2.5, 2.5, 4],
  rest_area: [5, 3, 3],
  after_party: [10, 7, 6.5],
  amenity: [2.5, 2.5, 4],
};

const FALLBACK_SIZE_M: [number, number, number] = AFFORDANCE_SIZE_M.amenity;
const FALLBACK_COLOR = CATEGORY_COLOR.amenity;

/**
 * Material tuned for the colored affordance bodies. Slightly more
 * diffuse than the chipboard building material so category color reads.
 */
const DEFAULT_MATERIAL = {
  ambient: 0.6,
  diffuse: 0.55,
  shininess: 24,
  specularColor: [255, 246, 230] as [number, number, number],
};

function readPointPosition(
  placement: AtlasEventPlannerPlacement,
): [number, number] | null {
  const geom = placement.geometry as
    | { type?: string; coordinates?: unknown }
    | null;
  if (!geom || geom.type !== "Point") return null;
  const coords = geom.coordinates as [number, number] | undefined;
  if (
    !coords ||
    typeof coords[0] !== "number" ||
    typeof coords[1] !== "number"
  ) {
    return null;
  }
  return [coords[0], coords[1]];
}

function brighten(
  color: readonly [number, number, number, number],
): [number, number, number, number] {
  return [
    Math.min(255, color[0] + 40),
    Math.min(255, color[1] + 40),
    Math.min(255, color[2] + 40),
    255,
  ];
}

export interface PorchfestAffordanceMeshLayerOptions {
  readonly placements: readonly AtlasEventPlannerPlacement[];
  /** Category visibility map. Missing entries default to visible. */
  readonly visibility?: Partial<Record<AtlasEventPlannerCategory, boolean>>;
  /** The currently selected placement id (highlighted + lifted). */
  readonly selectedPlacementId?: string | null;
  /** Layer id prefix so multiple instances can coexist. */
  readonly layerIdPrefix?: string;
  /**
   * Fixed orientation is the default. When provided, returns a compass
   * bearing in degrees (0 = north, 90 = east) for a placement that has a
   * meaningful facing (a stage faces its audience, a food truck's window
   * faces the street). Return null to keep the default orientation.
   */
  readonly getBearingDeg?: (
    placement: AtlasEventPlannerPlacement,
  ) => number | null;
  /**
   * Picking handler. Lands the same selection payload the flat layer
   * does, so picking an affordance selects its placement exactly as
   * picking a dot does today.
   */
  readonly onClickPlacement?: (
    placement: AtlasEventPlannerPlacement,
    info: PickingInfo,
  ) => void;
}

/**
 * Group placements by category and emit one SimpleMeshLayer per
 * category. Returns an empty array when there are no Point placements.
 */
export function buildPorchfestAffordanceMeshLayers({
  placements,
  visibility,
  selectedPlacementId = null,
  layerIdPrefix = "porchfest-affordance",
  getBearingDeg,
  onClickPlacement,
}: PorchfestAffordanceMeshLayerOptions): Layer[] {
  if (placements.length === 0) return [];

  const byCategory = new Map<string, AtlasEventPlannerPlacement[]>();
  for (const placement of placements) {
    if (!readPointPosition(placement)) continue;
    const bucket = byCategory.get(placement.category);
    if (bucket) {
      bucket.push(placement);
    } else {
      byCategory.set(placement.category, [placement]);
    }
  }

  // Stable, alphabetical layer ids so they don't shuffle between renders.
  const categories = [...byCategory.keys()].sort();

  return categories.map((category) => {
    const bucket = byCategory.get(category) ?? [];
    const cat = category as AtlasEventPlannerCategory;
    const size = AFFORDANCE_SIZE_M[cat] ?? FALLBACK_SIZE_M;
    const baseColor = CATEGORY_COLOR[cat] ?? FALLBACK_COLOR;
    const visible = visibility?.[cat] ?? true;
    const heightM = size[2];

    return new SimpleMeshLayer<AtlasEventPlannerPlacement>({
      id: `${layerIdPrefix}-${category}`,
      data: bucket,
      mesh: getPorchfestAffordanceGeometry(cat),
      visible,
      pickable: true,
      sizeScale: 1,
      getPosition: (placement) => readPointPosition(placement) ?? [0, 0],
      getScale: () => size,
      // The unit form has its base at z = -0.5; after scaling by heightM
      // the base sits at z = -heightM/2. Translate up by heightM/2 so the
      // base rests on the ground (z = 0). Selected placements lift a
      // little so the chosen form pops above its neighbors.
      getTranslation: (placement) => {
        const lift = placement.id === selectedPlacementId ? heightM * 0.25 : 0;
        return [0, 0, heightM * 0.5 + lift] as [number, number, number];
      },
      // Compass bearing converts to deck yaw via yaw = 90 - bearing.
      // Default orientation turns the form slightly off-axis so it reads
      // as three-dimensional in the oblique view rather than face-on.
      getOrientation: (placement) => {
        const bearing = getBearingDeg?.(placement);
        const yaw = bearing == null ? -30 : 90 - bearing;
        return [0, yaw, 0] as [number, number, number];
      },
      getColor: (placement) =>
        placement.id === selectedPlacementId
          ? brighten(baseColor)
          : ([baseColor[0], baseColor[1], baseColor[2], baseColor[3]] as [
              number,
              number,
              number,
              number,
            ]),
      material: DEFAULT_MATERIAL,
      parameters: {
        depthCompare: "less-equal",
        depthWriteEnabled: true,
      },
      onClick: (info) => {
        if (!onClickPlacement) return false;
        const placement = info.object as AtlasEventPlannerPlacement | undefined;
        if (!placement) return false;
        onClickPlacement(placement, info);
        return true;
      },
      updateTriggers: {
        getColor: selectedPlacementId,
        getTranslation: selectedPlacementId,
      },
    });
  });
}
