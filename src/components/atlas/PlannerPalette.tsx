"use client";

/**
 * Bottom-right category palette for the planner.
 *
 * Each button stages the editable layer into DrawPointMode with a
 * pre-bound category + sublabel. The next map click drops a new
 * placement. A separate "Delete" toggle puts the planner into a
 * mode where clicking a pin opens a confirm-and-delete prompt.
 *
 * The palette communicates with the parent via the `mode` / `setMode`
 * pair and the `selectionAction` for delete. It owns no data of its
 * own; the parent decides which category is active.
 */

import { useCallback } from "react";

import type {
  AtlasEventPlannerCategory,
} from "@/components/atlas/AtlasEventPlannerLayer";

export type PaletteMode =
  | { kind: "view" }
  | { kind: "drag" }
  | { kind: "draw"; category: AtlasEventPlannerCategory; sublabel?: string }
  | { kind: "delete" };

interface PaletteCategoryButton {
  readonly category: AtlasEventPlannerCategory;
  readonly label: string;
  readonly color: string;
  readonly sublabel?: string;
}

// Brand alignment with AtlasEventPlannerLayer's pin RGBA, in CSS form, so
// the legend swatches, the palette chips, and the map pins read as one
// color key. Exported so PlannerLayerControls renders the same swatches.
export const CATEGORY_COLOR: Record<AtlasEventPlannerCategory, string> = {
  vendor: "rgb(99 56 142)",
  music: "rgb(217 162 59)",
  parking: "rgb(193 74 44)",
  restroom: "rgb(56 132 95)",
  kid_zone: "rgb(193 74 44)",
  food_court: "rgb(50 110 158)",
  rest_area: "rgb(50 110 158)",
  after_party: "rgb(120 30 60)",
  amenity: "rgb(168 156 132)",
};

const BUTTONS: readonly PaletteCategoryButton[] = [
  { category: "vendor", label: "Vendor", color: CATEGORY_COLOR.vendor },
  { category: "music", label: "Music", color: CATEGORY_COLOR.music },
  { category: "parking", label: "Parking", color: CATEGORY_COLOR.parking },
  { category: "restroom", label: "Restroom", color: CATEGORY_COLOR.restroom },
  { category: "kid_zone", label: "Kid Zone", color: CATEGORY_COLOR.kid_zone },
  { category: "food_court", label: "Food", color: CATEGORY_COLOR.food_court },
  { category: "rest_area", label: "Rest Area", color: CATEGORY_COLOR.rest_area },
  { category: "after_party", label: "After Party", color: CATEGORY_COLOR.after_party },
];

export interface PlannerPaletteProps {
  readonly mode: PaletteMode;
  readonly setMode: (mode: PaletteMode) => void;
  readonly canEdit: boolean;
  readonly disabledMessage?: string;
}

export function PlannerPalette({
  mode,
  setMode,
  canEdit,
  disabledMessage,
}: PlannerPaletteProps) {
  const toggleDraw = useCallback(
    (button: PaletteCategoryButton) => {
      if (mode.kind === "draw" && mode.category === button.category) {
        setMode({ kind: "drag" });
        return;
      }
      setMode({
        kind: "draw",
        category: button.category,
        sublabel: button.sublabel,
      });
    },
    [mode, setMode],
  );

  const toggleDelete = useCallback(() => {
    setMode(mode.kind === "delete" ? { kind: "drag" } : { kind: "delete" });
  }, [mode, setMode]);

  if (!canEdit) {
    return (
      <aside className="planner-panel planner-muted absolute bottom-6 right-6 z-[20] px-3 py-2 text-[12px]">
        {disabledMessage ?? "Sign in to edit"}
      </aside>
    );
  }

  return (
    <aside
      className="planner-panel absolute bottom-6 right-6 z-[20] grid w-56 grid-cols-2 gap-2 p-2 text-[12px]"
      aria-label="Placement palette"
    >
      {BUTTONS.map((button) => {
        const isActive =
          mode.kind === "draw" && mode.category === button.category;
        return (
          <button
            key={button.category}
            type="button"
            onClick={() => toggleDraw(button)}
            className={`planner-control flex min-h-[28px] items-center gap-2 px-2 py-1.5 text-left ${
              isActive ? "is-active" : ""
            }`}
            aria-pressed={isActive}
          >
            <span
              aria-hidden="true"
              className="planner-swatch"
              style={{ backgroundColor: button.color }}
            />
            <span>{button.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={toggleDelete}
        className={`planner-control is-danger col-span-2 mt-1 min-h-[28px] px-2 py-1.5 text-center ${
          mode.kind === "delete" ? "is-active" : ""
        }`}
        aria-pressed={mode.kind === "delete"}
      >
        {mode.kind === "delete" ? "Click a pin to delete" : "Delete mode"}
      </button>
    </aside>
  );
}
