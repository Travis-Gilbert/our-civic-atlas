/**
 * Drop-anchor resolution contract shared by the map (which owns the deck.gl
 * picking buffer) and the planner client (whose drop handler lives outside the
 * map). When a task is dropped, the map resolves what is under the cursor in
 * the spec's priority order — a placed figure / imported line first, then a
 * building, then open ground — and hands the planner a single discriminated
 * anchor. The map exposes `resolvePlannerDropAnchor` upward the same way it
 * already hands up its `MapRef` via `onMapReady`.
 */

import type { SelectedBuilding } from "./selected-building";

export type PlannerDropAnchor =
  | {
      readonly kind: "placement";
      readonly placementId: string;
      readonly coordinate: readonly [number, number];
    }
  | {
      readonly kind: "building";
      readonly building: SelectedBuilding;
      readonly coordinate: readonly [number, number];
    }
  | { readonly kind: "point"; readonly coordinate: readonly [number, number] };

/**
 * Resolve the drop anchor at a viewport-relative client point.
 * `allowBuilding` is false while the address editor owns building clicks, so
 * the task-drop building pick stays mutually exclusive with address-edit mode
 * (spec "Do not break"); a drop over a building then falls through to a point.
 * Returns null only when the map/overlay is not ready.
 */
export type PlannerDropPicker = (
  clientX: number,
  clientY: number,
  options?: { readonly allowBuilding?: boolean },
) => PlannerDropAnchor | null;
