"use client";

/**
 * Left-rail layer toggles for the planner.
 *
 * Phase 1 used a static stub here. Phase 2 wires per-category
 * visibility toggles plus a "Tasks" badge toggle that controls
 * whether placement pins with attached tasks show a small dot.
 *
 * Visibility state is owned by the parent; this component is pure
 * UI plus a checkbox-driven dispatcher.
 */

import type { AtlasEventPlannerCategory } from "@/components/atlas/AtlasEventPlannerLayer";

export interface PlannerLayerVisibility {
  readonly vendor: boolean;
  readonly music: boolean;
  readonly parking: boolean;
  readonly restroom: boolean;
  readonly kid_zone: boolean;
  readonly food_court: boolean;
  readonly rest_area: boolean;
  readonly after_party: boolean;
  readonly amenity: boolean;
  readonly tasks: boolean;
}

export const DEFAULT_PLANNER_VISIBILITY: PlannerLayerVisibility = {
  vendor: true,
  music: true,
  parking: true,
  restroom: true,
  kid_zone: true,
  food_court: true,
  rest_area: true,
  after_party: true,
  amenity: true,
  tasks: true,
};

const CATEGORY_LABELS: ReadonlyArray<readonly [AtlasEventPlannerCategory, string]> = [
  ["vendor", "Vendors"],
  ["music", "Music"],
  ["parking", "Parking"],
  ["restroom", "Restrooms"],
  ["kid_zone", "Kid Zone"],
  ["food_court", "Food"],
  ["rest_area", "Rest Area"],
  ["after_party", "After Party"],
  ["amenity", "Other"],
];

export interface PlannerLayerControlsProps {
  readonly visibility: PlannerLayerVisibility;
  readonly setVisibility: (next: PlannerLayerVisibility) => void;
  readonly placementCountByCategory: ReadonlyArray<readonly [string, number]>;
}

export function PlannerLayerControls({
  visibility,
  setVisibility,
  placementCountByCategory,
}: PlannerLayerControlsProps) {
  const countMap = new Map(placementCountByCategory);

  const toggle = (key: keyof PlannerLayerVisibility) => () => {
    setVisibility({ ...visibility, [key]: !visibility[key] });
  };

  return (
    <section>
      <p className="text-xs uppercase tracking-wider text-stone-500">
        Categories
      </p>
      <ul className="mt-2 space-y-1 text-sm text-stone-700">
        {CATEGORY_LABELS.map(([category, label]) => {
          const checked = visibility[category];
          const count = countMap.get(category) ?? 0;
          return (
            <li key={category}>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-stone-200/40">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={toggle(category)}
                    className="h-3.5 w-3.5 accent-stone-700"
                  />
                  <span>{label}</span>
                </span>
                <span className="text-xs text-stone-500">{count}</span>
              </label>
            </li>
          );
        })}
        <li className="mt-2 border-t border-stone-300/60 pt-2">
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-stone-200/40">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibility.tasks}
                onChange={toggle("tasks")}
                className="h-3.5 w-3.5 accent-stone-700"
              />
              <span>Show task badges</span>
            </span>
          </label>
        </li>
      </ul>
    </section>
  );
}
