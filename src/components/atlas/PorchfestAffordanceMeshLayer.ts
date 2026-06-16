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

import { ScenegraphLayer, SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { IconLayer, TextLayer } from "@deck.gl/layers";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { GLTFLoader } from "@loaders.gl/gltf";

import { getPorchfestAffordanceGeometry } from "@/lib/atlas/procedural-porchfest-meshes";
import {
  FIGURE_LIBRARY,
  getFigureGeometry,
  type FigureLibraryEntry,
} from "@/lib/atlas/porchfest-figure-library";
import { isCivicFigureKey } from "@/lib/civic/civic-figure-resolver";
import type { CivicFigureKey } from "@/lib/civic/civic-object-schema";
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
  /** Optional data-driven emphasis, e.g. run-of-show active acts. */
  readonly getScaleMultiplier?: (
    placement: AtlasEventPlannerPlacement,
  ) => number;
  /** Optional opacity dimming for inactive time-aware figures. */
  readonly getOpacityMultiplier?: (
    placement: AtlasEventPlannerPlacement,
  ) => number;
  readonly animated?: boolean;
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

/* ------------------------------------------------------------------ */
/*  Bucket planning (pure, validator-testable).                        */
/*                                                                     */
/*  A bucket is one renderable group: all placements sharing a         */
/*  category + figure-key combination. Placements without a valid      */
/*  figureKey (every GraphQL placement today) fall into their plain    */
/*  category bucket and render exactly as before. Placements carrying  */
/*  a figureKey (civic objects, resolved override-first by             */
/*  civic-map-binding) get a per-figure bucket whose geometry and size */
/*  come from the figure library: SimpleMeshLayer for procedural       */
/*  entries, ScenegraphLayer for GLB entries. Color stays per category */
/*  in both paths (the spec keeps category color as the figure's hue). */
/* ------------------------------------------------------------------ */

export interface AffordanceBucket {
  /** Stable layer id suffix: `cat:<category>` or `fig:<category>:<key>`. */
  readonly id: string;
  readonly category: AtlasEventPlannerCategory | string;
  readonly figureKey: CivicFigureKey | null;
  /** Library entry for figure buckets; null for plain category buckets. */
  readonly entry: FigureLibraryEntry | null;
  readonly placements: AtlasEventPlannerPlacement[];
}

export function planAffordanceBuckets(
  placements: readonly AtlasEventPlannerPlacement[],
  library: Record<CivicFigureKey, FigureLibraryEntry> = FIGURE_LIBRARY,
): AffordanceBucket[] {
  const buckets = new Map<string, AffordanceBucket>();
  for (const placement of placements) {
    if (!readPointPosition(placement)) continue;
    const figureKey = isCivicFigureKey(placement.figureKey)
      ? placement.figureKey
      : null;
    const id = figureKey
      ? `fig:${placement.category}:${figureKey}`
      : `cat:${placement.category}`;
    const existing = buckets.get(id);
    if (existing) {
      existing.placements.push(placement);
      continue;
    }
    buckets.set(id, {
      id,
      category: placement.category,
      figureKey,
      entry: figureKey ? library[figureKey] : null,
      placements: [placement],
    });
  }
  // Stable, sorted layer ids so they don't shuffle between renders.
  return [...buckets.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Plan buckets and emit one mesh layer per bucket. Returns an empty
 * array when there are no Point placements.
 */
export function buildPorchfestAffordanceMeshLayers({
  placements,
  visibility,
  selectedPlacementId = null,
  layerIdPrefix = "porchfest-affordance",
  getBearingDeg,
  getScaleMultiplier,
  getOpacityMultiplier,
  animated = true,
  onClickPlacement,
}: PorchfestAffordanceMeshLayerOptions): Layer[] {
  if (placements.length === 0) return [];

  const layers: Layer[] = [];
  for (const bucket of planAffordanceBuckets(placements)) {
    const cat = bucket.category as AtlasEventPlannerCategory;
    const size: readonly [number, number, number] =
      bucket.entry?.sizeM ?? AFFORDANCE_SIZE_M[cat] ?? FALLBACK_SIZE_M;
    const baseColor = CATEGORY_COLOR[cat] ?? FALLBACK_COLOR;
    const visible = visibility?.[cat] ?? true;
    const heightM = size[2];

    // Shared accessors: both layer kinds keep the picking payload, the
    // selected lift + brighten, the compass-bearing yaw, and the
    // base-on-ground translation identical, so a figure behaves exactly
    // like its category sibling (acceptance 4).
    const shared = {
      data: bucket.placements,
      visible,
      pickable: true,
      getPosition: (placement: AtlasEventPlannerPlacement) =>
        readPointPosition(placement) ?? ([0, 0] as [number, number]),
      // The unit form has its base at z = -0.5; after scaling by heightM
      // the base sits at z = -heightM/2. Translate up by heightM/2 so the
      // base rests on the ground (z = 0). Selected placements lift a
      // little so the chosen form pops above its neighbors.
      getTranslation: (placement: AtlasEventPlannerPlacement) => {
        const scale = getScaleMultiplier?.(placement) ?? 1;
        const scaledHeight = heightM * scale;
        const lift =
          placement.id === selectedPlacementId ? scaledHeight * 0.25 : 0;
        return [0, 0, scaledHeight * 0.5 + lift] as [
          number,
          number,
          number,
        ];
      },
      // Compass bearing converts to deck yaw via yaw = 90 - bearing.
      // Default orientation turns the form slightly off-axis so it reads
      // as three-dimensional in the oblique view rather than face-on.
      getOrientation: (placement: AtlasEventPlannerPlacement) => {
        const bearing = getBearingDeg?.(placement);
        const yaw = bearing == null ? -30 : 90 - bearing;
        return [0, yaw, 0] as [number, number, number];
      },
      getColor: (placement: AtlasEventPlannerPlacement) => {
        const color =
          placement.id === selectedPlacementId
            ? brighten(baseColor)
            : ([baseColor[0], baseColor[1], baseColor[2], baseColor[3]] as [
                number,
                number,
                number,
                number,
              ]);
        const opacity = Math.max(
          0.1,
          Math.min(1, getOpacityMultiplier?.(placement) ?? 1),
        );
        return [color[0], color[1], color[2], Math.round(color[3] * opacity)] as [
          number,
          number,
          number,
          number,
        ];
      },
      parameters: {
        depthCompare: "less-equal" as const,
        depthWriteEnabled: true,
      },
      onClick: (info: PickingInfo) => {
        if (!onClickPlacement) return false;
        const placement = info.object as AtlasEventPlannerPlacement | undefined;
        if (!placement) return false;
        onClickPlacement(placement, info);
        return true;
      },
      updateTriggers: {
        getColor: [selectedPlacementId, getOpacityMultiplier],
        getTranslation: [selectedPlacementId, getScaleMultiplier],
        getOrientation: getBearingDeg,
        getScale: getScaleMultiplier,
      },
    };
    const getScale = (placement: AtlasEventPlannerPlacement) => {
      const multiplier = Math.max(0.2, getScaleMultiplier?.(placement) ?? 1);
      return [
        size[0] * multiplier,
        size[1] * multiplier,
        size[2] * multiplier,
      ] as [number, number, number];
    };
    const transitions = animated
      ? {
          getColor: 220,
          getScale: 260,
          getTranslation: 260,
        }
      : undefined;

    if (bucket.entry?.kind === "glb") {
      // GLB authoring convention: a unit-scale asset (~1m extents around
      // the origin, base at the origin's z=-0.5 plane like the procedural
      // forms) so sizeM scales it the same way.
      layers.push(
        new ScenegraphLayer<AtlasEventPlannerPlacement>({
          id: `${layerIdPrefix}-${bucket.id}`,
          scenegraph: bucket.entry.url,
          loaders: [GLTFLoader],
          sizeScale: 1,
          getScale,
          transitions,
          _lighting: "pbr",
          ...shared,
        }),
      );
      continue;
    }

    const mesh = bucket.figureKey
      ? getFigureGeometry(bucket.figureKey)
      : getPorchfestAffordanceGeometry(cat);
    layers.push(
      new SimpleMeshLayer<AtlasEventPlannerPlacement>({
        id: `${layerIdPrefix}-${bucket.id}`,
        mesh: mesh ?? getPorchfestAffordanceGeometry(cat),
        sizeScale: 1,
        getScale,
        transitions,
        material: DEFAULT_MATERIAL,
        ...shared,
      }),
    );
  }
  return layers;
}

/* ------------------------------------------------------------------ */
/*  Per-submission decoration (Feature 1 deliverable 5).               */
/*                                                                     */
/*  Civic-object placements (the ones carrying a figureKey) get a      */
/*  small name label above the figure so a specific vendor reads as    */
/*  itself, not only as its category archetype. When the submission's  */
/*  link fields hold a direct raster-image URL, an IconLayer billboard */
/*  joins the label; otherwise the label + category-colored figure is  */
/*  the whole decoration (the spec's no-image fallback). Labels render */
/*  in the Observable register: near-black ink on a white chip, IBM    */
/*  Plex Sans, pixel-sized so zoom does not blow them up.              */
/* ------------------------------------------------------------------ */

const LABEL_INK: [number, number, number, number] = [28, 28, 28, 235];
const LABEL_CHIP: [number, number, number, number] = [255, 255, 255, 210];

export interface PorchfestFigureDecorationOptions {
  readonly placements: readonly AtlasEventPlannerPlacement[];
  readonly visibility?: Partial<Record<AtlasEventPlannerCategory, boolean>>;
  readonly selectedPlacementId?: string | null;
  readonly layerIdPrefix?: string;
  /**
   * Per-placement opacity, shared with the mesh layer so a dimmed figure's
   * name label and billboard dim with it instead of staying bright.
   */
  readonly getOpacityMultiplier?: (
    placement: AtlasEventPlannerPlacement,
  ) => number;
}

export function buildPorchfestFigureDecorations({
  placements,
  visibility,
  selectedPlacementId = null,
  layerIdPrefix = "porchfest-affordance",
  getOpacityMultiplier,
}: PorchfestFigureDecorationOptions): Layer[] {
  const opacityFor = (placement: AtlasEventPlannerPlacement): number =>
    Math.max(0.1, Math.min(1, getOpacityMultiplier?.(placement) ?? 1));
  const decorated = placements.filter(
    (placement) =>
      isCivicFigureKey(placement.figureKey) &&
      readPointPosition(placement) !== null &&
      (visibility?.[placement.category as AtlasEventPlannerCategory] ?? true),
  );
  if (decorated.length === 0) return [];

  const layers: Layer[] = [];
  const withImages = decorated.filter(
    (placement) =>
      typeof placement.imageUrl === "string" && placement.imageUrl !== "",
  );

  if (withImages.length > 0) {
    layers.push(
      new IconLayer<AtlasEventPlannerPlacement>({
        id: `${layerIdPrefix}-figure-billboards`,
        data: withImages,
        pickable: false,
        billboard: true,
        getPosition: (placement) => readPointPosition(placement) ?? [0, 0],
        // Per-object icon URLs use deck.gl's auto-packing path; 128px is
        // the rasterization budget per image, displayed at 36px.
        getIcon: (placement) => ({
          url: placement.imageUrl as string,
          width: 128,
          height: 128,
        }),
        // Tint white so RGB is preserved while the alpha carries the dim.
        getColor: (placement) =>
          [255, 255, 255, Math.round(255 * opacityFor(placement))] as [
            number,
            number,
            number,
            number,
          ],
        getSize: (placement) =>
          placement.id === selectedPlacementId ? 44 : 36,
        sizeUnits: "pixels",
        getPixelOffset: [0, -30],
        updateTriggers: {
          getSize: selectedPlacementId,
          getColor: getOpacityMultiplier,
        },
      }),
    );
  }

  layers.push(
    new TextLayer<AtlasEventPlannerPlacement>({
      id: `${layerIdPrefix}-figure-labels`,
      data: decorated,
      pickable: false,
      billboard: true,
      getPosition: (placement) => readPointPosition(placement) ?? [0, 0],
      getText: (placement) => placement.label,
      getSize: 11,
      getColor: (placement) =>
        [LABEL_INK[0], LABEL_INK[1], LABEL_INK[2], Math.round(LABEL_INK[3] * opacityFor(placement))] as [
          number,
          number,
          number,
          number,
        ],
      background: true,
      getBackgroundColor: (placement) =>
        [LABEL_CHIP[0], LABEL_CHIP[1], LABEL_CHIP[2], Math.round(LABEL_CHIP[3] * opacityFor(placement))] as [
          number,
          number,
          number,
          number,
        ],
      backgroundPadding: [4, 2, 4, 2],
      fontFamily: '"IBM Plex Sans", "Plex Sans", system-ui, sans-serif',
      characterSet: "auto",
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      // Sit above the figure; leave headroom for the billboard when the
      // submission carries one, and lift with the selected figure's pop so
      // the label tracks the mesh's selection lift.
      getPixelOffset: (placement) => {
        const base = placement.imageUrl ? -52 : -18;
        return [0, placement.id === selectedPlacementId ? base - 8 : base];
      },
      updateTriggers: {
        getPixelOffset: selectedPlacementId,
        getColor: getOpacityMultiplier,
        getBackgroundColor: getOpacityMultiplier,
      },
    }),
  );

  return layers;
}
