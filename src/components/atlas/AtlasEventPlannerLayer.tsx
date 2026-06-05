/**
 * Porchfest / Event Planner deck.gl layer factory.
 *
 * Phase 1 of the planner just renders last year's pin map. The
 * factory takes a list of GraphQL Placement rows and emits one
 * `GeoJsonLayer` per category. Per-category layers cost more than
 * one fat layer (deck.gl creates a separate buffer + draw call per
 * `Layer` instance), but the dataset is small (~80 pins) and
 * splitting by category lets Phase 2 toggle visibility with a
 * single `visible: false` per category — no re-binning required.
 *
 * Colors stay close to the existing Porchfest brand and the warm
 * atlas palette (`atlas.css` defines the broader stage). Tuned
 * against the carriage-town basemap so each category reads cleanly
 * against the cream OSM background.
 *
 * Click handling: a single `onClickPlacement(placement, info)`
 * callback gets invoked when any per-category layer is picked. The
 * caller decides what to do with it (open a dossier panel, scroll
 * the right rail to that placement, etc.). For Phase 1 the route
 * just logs to the console.
 *
 * The factory does NOT memoize internally — call it inside a
 * `useMemo` keyed on the placements array. AtlasMap's main layer
 * `useMemo` then concatenates the returned layers via the new
 * `extraDeckLayers` prop.
 */

import { GeoJsonLayer } from "@deck.gl/layers";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { FeatureCollection, Feature, Point } from "geojson";

/**
 * Shape of the placements the factory consumes. Matches the
 * generated `EventPlacementsQuery` row (geometry is `unknown` at
 * the GraphQL boundary, so the caller is responsible for ensuring
 * it is a GeoJSON object). Phase 1 only handles Point geometries;
 * polygons / lines pass through unchanged but render as outlines.
 */
export interface AtlasEventPlannerPlacement {
  readonly id: string;
  readonly eventLayerId: string;
  readonly category: string;
  readonly sublabel: string | null;
  readonly label: string;
  readonly geometry: Record<string, unknown>;
  readonly status: string;
  readonly notes: string | null;
}

export type AtlasEventPlannerCategory =
  | "vendor"
  | "music"
  | "parking"
  | "restroom"
  | "kid_zone"
  | "food_court"
  | "rest_area"
  | "after_party"
  | "amenity";

/**
 * Per-category fill colors. RGBA with alpha. Order in this map is
 * not load-bearing; categories not in the map fall back to the
 * `amenity` color so unknown categories never render invisible.
 */
export const CATEGORY_COLOR: Record<AtlasEventPlannerCategory, [number, number, number, number]> = {
  vendor: [99, 56, 142, 220],
  music: [217, 162, 59, 220],
  parking: [193, 74, 44, 220],
  restroom: [56, 132, 95, 220],
  kid_zone: [193, 74, 44, 220],
  food_court: [50, 110, 158, 220],
  rest_area: [50, 110, 158, 200],
  after_party: [120, 30, 60, 220],
  amenity: [120, 120, 130, 200],
};

const FALLBACK_COLOR = CATEGORY_COLOR.amenity;

/**
 * Stroke color sits at a uniform dark brown so every category reads
 * against the warm basemap. Per-category line variation lives in
 * the fill color; pulling the stroke into the same earth tone keeps
 * the map quiet at zoomed-out scales.
 */
const STROKE_COLOR: [number, number, number, number] = [42, 28, 16, 220];

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

export interface AtlasEventPlannerLayerOptions {
  readonly placements: readonly AtlasEventPlannerPlacement[];
  /**
   * Called when a placement is picked. Receives the placement that
   * was hit plus the underlying deck.gl PickingInfo (lng/lat,
   * layer id, viewport, etc.). Optional — when omitted, the layers
   * are still pickable but no callback fires.
   */
  readonly onClickPlacement?: (
    placement: AtlasEventPlannerPlacement,
    info: PickingInfo,
  ) => void;
  /**
   * Optional layer id prefix so multiple instances can coexist
   * (e.g., compare two event layers side by side). Defaults to
   * `atlas-event-planner`.
   */
  readonly layerIdPrefix?: string;
  /**
   * Visibility map keyed by category. Missing entries default to
   * visible. Phase 2 will wire this to the left-rail toggles; Phase
   * 1 leaves it undefined so every category is on.
   */
  readonly visibility?: Partial<Record<AtlasEventPlannerCategory, boolean>>;
  /**
   * Phase 3 — pop pins above extruded OSM buildings in oblique
   * (3D) mode. Default "flat" keeps pins at z=0 for backward
   * compatibility.
   */
  readonly viewMode?: "flat" | "oblique";
}

interface PlacementFeatureProperties {
  placement_id: string;
  event_layer_id: string;
  category: string;
  sublabel: string | null;
  label: string;
  status: string;
  notes: string | null;
}

/**
 * Group placements by category and emit a per-category GeoJsonLayer.
 * Returns an empty array when there are no placements (deck.gl
 * accepts an empty layer list cleanly; we avoid an empty Layer
 * instance entirely to skip the binding work).
 */
export function createAtlasEventPlannerLayers({
  placements,
  onClickPlacement,
  layerIdPrefix = "atlas-event-planner",
  visibility,
  viewMode = "flat",
}: AtlasEventPlannerLayerOptions): Layer[] {
  if (placements.length === 0) return [];

  // In oblique (3D) mode, extruded OSM buildings can rise tens of
  // meters above ground. Lifting the pins by a small constant above
  // the tallest expected building keeps them visible from any
  // camera angle. The lift is applied via a 3D coordinate on each
  // Point's `coordinates` ([lng, lat, z]); deck.gl's GeoJsonLayer
  // honors that as elevation in meters.
  const POINT_LIFT_METERS = viewMode === "oblique" ? 60 : 0;

  const byCategory = new Map<string, AtlasEventPlannerPlacement[]>();
  for (const placement of placements) {
    const bucket = byCategory.get(placement.category);
    if (bucket) {
      bucket.push(placement);
    } else {
      byCategory.set(placement.category, [placement]);
    }
  }

  // Stable ordering so layer ids don't shuffle between renders. Keep
  // the alphabetical sort because the ids become DOM/HTML ids that
  // a future debug panel may reference.
  const categories = [...byCategory.keys()].sort();

  return categories.map((category) => {
    const bucket = byCategory.get(category) ?? [];
    const featureCollection: FeatureCollection<Point, PlacementFeatureProperties> = {
      type: "FeatureCollection",
      features: bucket
        .filter((placement) => {
          const geom = placement.geometry as { type?: string } | null;
          return geom?.type === "Point";
        })
        .map((placement) => {
          const sourceGeom = placement.geometry as unknown as Point;
          const [lng, lat] = sourceGeom.coordinates as [number, number, number?];
          // Apply the oblique-mode lift to every point. Keeps the
          // input geometry immutable (creates a new array).
          const liftedGeometry: Point = {
            ...sourceGeom,
            coordinates: [lng, lat, POINT_LIFT_METERS],
          };
          return {
            type: "Feature",
            geometry: liftedGeometry,
            properties: {
              placement_id: placement.id,
              event_layer_id: placement.eventLayerId,
              category: placement.category,
              sublabel: placement.sublabel,
              label: placement.label,
              status: placement.status,
              notes: placement.notes,
            },
          };
        }),
    };

    const color =
      CATEGORY_COLOR[category as AtlasEventPlannerCategory] ?? FALLBACK_COLOR;
    const visible = visibility?.[category as AtlasEventPlannerCategory] ?? true;

    return new GeoJsonLayer<PlacementFeatureProperties>({
      id: `${layerIdPrefix}-${category}`,
      data: featureCollection,
      pickable: true,
      visible,
      stroked: true,
      filled: true,
      pointType: "circle",
      // A 6 px radius reads as a clear pin against the cream basemap
      // without crowding when neighborhood-block dense. We pin the
      // unit to pixels (vs meters) so the map remains legible
      // regardless of zoom — the Phase 1 view stays roughly fixed,
      // but the next phases pan and zoom freely.
      getPointRadius: 6,
      pointRadiusUnits: "pixels",
      pointRadiusMinPixels: 4,
      pointRadiusMaxPixels: 12,
      getFillColor: () => color,
      getLineColor: () => STROKE_COLOR,
      lineWidthMinPixels: 1,
      onClick: (info) => {
        if (!onClickPlacement) return false;
        const props = (info.object as Feature<Point, PlacementFeatureProperties> | undefined)
          ?.properties;
        if (!props) return false;
        const placement = bucket.find((row) => row.id === props.placement_id);
        if (!placement) return false;
        onClickPlacement(placement, info);
        // Returning true tells deck.gl to stop bubbling the event
        // through underlying layers — we handled it.
        return true;
      },
      updateTriggers: {
        // The color closure captures `category`, which is stable for
        // the lifetime of this layer instance, so no triggers are
        // needed. Kept as an empty object so a future call site can
        // add triggers without re-introducing the prop.
      },
    });
  });
}
