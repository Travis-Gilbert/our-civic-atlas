/**
 * EditableGeoJsonLayer wrapper for the planner.
 *
 * Two modes:
 *   - Direct drag: mouse down on a pin, drag, drop. Commits the new
 *     coordinates once via updatePlacement(geometry, expectedVersion).
 *   - DrawPointMode: the user clicked a category in the palette; the
 *     next map click drops a new placement of that category.
 *
 * Why TranslateMode and not ModifyMode: ModifyMode lets the user
 * drag individual vertices of polygons, which Phase 2 doesn't need
 * (every placement is a Point) and which would let a planner
 * accidentally turn a pin into a polygon.
 *
 * The onEdit callback fires on every frame of a drag. We only want
 * to commit the mutation when the user lets go, so we filter on
 * `editType === 'movePosition'` (the final frame); intermediate
 * `movePositionRunning` events stay local. For draws we commit on
 * `editType === 'addFeature'`.
 *
 * This module exports a pure builder, not a hook. Call it from the
 * parent's useMemo so the dependency tracking happens in one place.
 */

import {
  DrawPointMode,
  EditableGeoJsonLayer,
} from "@deck.gl-community/editable-layers";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Point } from "geojson";

import type { AtlasEventPlannerPlacement } from "@/components/atlas/AtlasEventPlannerLayer";

export type PlannerEditMode =
  | { type: "translate" }
  | { type: "draw"; category: string; sublabel?: string }
  | { type: "off" };

interface PlannerFeatureProperties {
  placement_id: string;
  event_layer_id: string;
  category: string;
  label: string;
  version: number;
}

export interface PlannerEditablePlacement extends AtlasEventPlannerPlacement {
  readonly version: number;
}

export interface PlannerEditableLayerOptions {
  readonly placements: readonly PlannerEditablePlacement[];
  readonly mode: PlannerEditMode;
  readonly selectedPlacementId: string | null;
  /**
   * Commit a drag. The layer hands back the moved feature's
   * placement_id + the new GeoJSON; we use them to fire
   * updatePlacement.
   */
  readonly onTranslate: (
    placementId: string,
    expectedVersion: number,
    geometry: Record<string, unknown>,
  ) => void;
  /**
   * Preview a drag before commit. The parent patches the displayed
   * geometry optimistically, then clears it after the mutation/refetch.
   */
  readonly onTranslatePreview?: (
    placementId: string,
    geometry: Record<string, unknown> | null,
  ) => void;
  /**
   * Select the placement currently being clicked or dragged.
   */
  readonly onSelect?: (placementId: string) => void;
  /**
   * Tell the map shell when a placement drag owns the pointer so the
   * basemap can pause camera panning until the marker is released.
   */
  readonly onTranslateDragStateChange?: (active: boolean) => void;
  /**
   * Commit a draw. The layer hands back the new Point geometry; we
   * fire createPlacement with the pre-bound category.
   */
  readonly onDraw: (
    category: string,
    sublabel: string | undefined,
    geometry: Record<string, unknown>,
  ) => void;
}

interface EditCallbackPayload {
  readonly editType: string;
  readonly editContext: {
    readonly featureIndexes?: number[];
  } | null;
  readonly updatedData: FeatureCollection<Point, PlannerFeatureProperties>;
}

type PlannerPointFeature = Feature<Point, PlannerFeatureProperties>;

function pointFromPickingCoordinate(
  coordinate: readonly number[] | undefined,
): Record<string, unknown> | null {
  if (!coordinate) return null;
  const [lng, lat] = coordinate;
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return { type: "Point", coordinates: [lng, lat] };
}

export function buildPlannerEditableLayer({
  placements,
  mode,
  selectedPlacementId,
  onTranslate,
  onTranslatePreview,
  onSelect,
  onTranslateDragStateChange,
  onDraw,
}: PlannerEditableLayerOptions): Layer | null {
  if (mode.type === "off") return null;

  const data: FeatureCollection<Point, PlannerFeatureProperties> = {
    type: "FeatureCollection",
    features: placements
      .filter((p) => {
        const geom = p.geometry as { type?: string } | null;
        return geom?.type === "Point";
      })
      .map((p) => ({
        type: "Feature",
        geometry: p.geometry as unknown as Point,
        properties: {
          placement_id: p.id,
          event_layer_id: p.eventLayerId,
          category: p.category,
          label: p.label,
          version: p.version,
        },
      })),
  };

  if (mode.type === "translate") {
    return new GeoJsonLayer<PlannerFeatureProperties>({
      id: "planner-editable-direct-drag",
      data,
      pickable: true,
      stroked: true,
      filled: true,
      pointType: "circle",
      pointRadiusUnits: "pixels",
      pointRadiusMinPixels: 8,
      pointRadiusMaxPixels: 14,
      getPointRadius: (feature) =>
        feature.properties.placement_id === selectedPlacementId ? 12 : 9,
      getFillColor: (feature) =>
        feature.properties.placement_id === selectedPlacementId
          ? [255, 255, 255, 190]
          : [255, 255, 255, 90],
      getLineColor: (feature) =>
        feature.properties.placement_id === selectedPlacementId
          ? [193, 74, 44, 255]
          : [42, 28, 16, 210],
      lineWidthUnits: "pixels",
      getLineWidth: 2,
      onClick: (info: PickingInfo<PlannerPointFeature>) => {
        const feature = info.object;
        if (!feature) return false;
        onSelect?.(feature.properties.placement_id);
        return true;
      },
      onDragStart: (info: PickingInfo<PlannerPointFeature>) => {
        const feature = info.object;
        if (!feature) return false;
        onSelect?.(feature.properties.placement_id);
        onTranslateDragStateChange?.(true);
        return true;
      },
      onDrag: (info: PickingInfo<PlannerPointFeature>) => {
        const feature = info.object;
        const geometry = pointFromPickingCoordinate(info.coordinate);
        if (!feature || !geometry) return false;
        onTranslatePreview?.(feature.properties.placement_id, geometry);
        return true;
      },
      onDragEnd: (info: PickingInfo<PlannerPointFeature>) => {
        const feature = info.object;
        const geometry = pointFromPickingCoordinate(info.coordinate);
        if (!feature || !geometry) {
          if (feature) onTranslatePreview?.(feature.properties.placement_id, null);
          onTranslateDragStateChange?.(false);
          return false;
        }
        onTranslate(
          feature.properties.placement_id,
          feature.properties.version,
          geometry,
        );
        onTranslateDragStateChange?.(false);
        return true;
      },
      updateTriggers: {
        getPointRadius: selectedPlacementId,
        getFillColor: selectedPlacementId,
        getLineColor: selectedPlacementId,
      },
    });
  }

  return new EditableGeoJsonLayer({
    id: "planner-editable",
    data,
    mode: DrawPointMode,
    selectedFeatureIndexes: [],
    pickable: true,
    pointRadiusMinPixels: 6,
    pointRadiusMaxPixels: 12,
    getEditHandlePointColor: [193, 74, 44, 255],
    getFillColor: [193, 74, 44, 220],
    getLineColor: [42, 28, 16, 255],
    onEdit: (payload: EditCallbackPayload) => {
      if (payload.editType === "movePosition") {
        const index = payload.editContext?.featureIndexes?.[0];
        if (index == null) return;
        const feature = payload.updatedData.features[index];
        if (!feature) return;
        onTranslate(
          feature.properties.placement_id,
          feature.properties.version,
          feature.geometry as unknown as Record<string, unknown>,
        );
        return;
      }
      if (payload.editType === "addFeature" && mode.type === "draw") {
        const newFeature =
          payload.updatedData.features[payload.updatedData.features.length - 1];
        if (!newFeature) return;
        onDraw(
          mode.category,
          mode.sublabel,
          newFeature.geometry as unknown as Record<string, unknown>,
        );
      }
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}
