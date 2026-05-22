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

// Same brand alignment as AtlasEventPlannerLayer's RGBA, in CSS form
// so the chip swatches in the palette match the map pins.
const BUTTONS: readonly PaletteCategoryButton[] = [
  { category: "vendor", label: "Vendor", color: "rgb(99 56 142)" },
  { category: "music", label: "Music", color: "rgb(217 162 59)" },
  { category: "parking", label: "Parking", color: "rgb(193 74 44)" },
  { category: "restroom", label: "Restroom", color: "rgb(56 132 95)" },
  { category: "kid_zone", label: "Kid Zone", color: "rgb(193 74 44)" },
  { category: "food_court", label: "Food", color: "rgb(50 110 158)" },
  { category: "rest_area", label: "Rest Area", color: "rgb(50 110 158)" },
  { category: "after_party", label: "After Party", color: "rgb(120 30 60)" },
];

export interface PlannerPaletteProps {
  readonly mode: PaletteMode;
  readonly setMode: (mode: PaletteMode) => void;
  readonly canEdit: boolean;
}

export function PlannerPalette({ mode, setMode, canEdit }: PlannerPaletteProps) {
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
      <aside className="planner-palette absolute bottom-6 right-6 z-[20] rounded-md border border-stone-300/80 bg-amber-50/95 px-3 py-2 text-xs text-stone-600 shadow">
        Sign in to edit
      </aside>
    );
  }

  return (
    <aside
      className="planner-palette absolute bottom-6 right-6 z-[20] grid w-56 grid-cols-2 gap-1.5 rounded-md border border-stone-300/80 bg-amber-50/95 p-2 text-xs shadow"
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
            className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-left transition-colors ${
              isActive
                ? "border-stone-900 bg-stone-900 text-amber-50"
                : "border-stone-300 bg-white/70 hover:border-stone-500"
            }`}
            aria-pressed={isActive}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: button.color }}
            />
            <span>{button.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={toggleDelete}
        className={`col-span-2 mt-1 rounded border px-2 py-1.5 text-center transition-colors ${
          mode.kind === "delete"
            ? "border-red-700 bg-red-700 text-white"
            : "border-stone-300 bg-white/70 hover:border-red-500"
        }`}
        aria-pressed={mode.kind === "delete"}
      >
        {mode.kind === "delete" ? "Click a pin to delete…" : "Delete mode"}
      </button>
    </aside>
  );
}
