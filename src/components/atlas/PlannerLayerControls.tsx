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
import { CATEGORY_COLOR } from "@/components/atlas/PlannerPalette";

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
      <p className="planner-kicker">Categories</p>
      <ul className="planner-ink-soft mt-2 space-y-0.5 text-[14px]">
        {CATEGORY_LABELS.map(([category, label]) => {
          const checked = visibility[category];
          const count = countMap.get(category) ?? 0;
          return (
            <li key={category}>
              <label className="planner-row flex cursor-pointer items-center justify-between gap-2 px-1.5 py-1.5">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={toggle(category)}
                    className="planner-check h-3.5 w-3.5"
                  />
                  <span
                    aria-hidden="true"
                    className="planner-swatch"
                    style={{ backgroundColor: CATEGORY_COLOR[category] }}
                  />
                  <span>{label}</span>
                </span>
                <span className="planner-muted text-[12px]">{count}</span>
              </label>
            </li>
          );
        })}
        <li className="planner-divider mt-2 pt-2">
          <label className="planner-row flex cursor-pointer items-center justify-between gap-2 px-1.5 py-1.5">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibility.tasks}
                onChange={toggle("tasks")}
                className="planner-check h-3.5 w-3.5"
              />
              <span>Show task badges</span>
            </span>
          </label>
        </li>
      </ul>
    </section>
  );
}
