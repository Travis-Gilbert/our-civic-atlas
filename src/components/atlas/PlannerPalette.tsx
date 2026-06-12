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

import { type DragEvent, useCallback } from "react";

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

export const PLANNER_CATEGORY_DRAG_TYPE = "application/x-planner-category";

/**
 * The third drag payload (beside application and category). Dragging the Task
 * chip onto the map drops a geo-task whose anchor is decided by what is under
 * the cursor: a placed figure / line, a building, or open ground. The payload
 * carries no anchor — the drop handler resolves it (see `planner-drop-anchor`).
 */
export const PLANNER_TASK_DRAG_TYPE = "application/x-planner-task";

export interface PlannerCategoryDragPayload {
  readonly category: AtlasEventPlannerCategory;
  readonly label: string;
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
  readonly embedded?: boolean;
  readonly onCategoryDragStateChange?: (active: boolean) => void;
}

export interface PlannerEditModeToggleProps {
  readonly mode: PaletteMode;
  readonly setMode: (mode: PaletteMode) => void;
  readonly canEdit: boolean;
  readonly disabledMessage?: string;
  readonly className?: string;
}

export function PlannerEditModeToggle({
  mode,
  setMode,
  canEdit,
  disabledMessage,
  className = "",
}: PlannerEditModeToggleProps) {
  const isEditMode = mode.kind !== "view";
  // One toggle, not a two-button group: pressing Edit again returns to
  // view, and the active mode reads as a subtle navy glow (the single
  // accent doing its one job) rather than a second filled button.
  return (
    <button
      type="button"
      onClick={() => setMode(isEditMode ? { kind: "view" } : { kind: "drag" })}
      className={`planner-control min-h-[32px] w-full px-3 py-1.5 text-center text-[13px] ${
        isEditMode ? "is-active is-glowing" : ""
      } ${className}`}
      aria-pressed={isEditMode}
      disabled={!canEdit}
      title={!canEdit ? disabledMessage : undefined}
    >
      Edit
    </button>
  );
}

export function PlannerPalette({
  mode,
  setMode,
  canEdit,
  disabledMessage,
  embedded = false,
  onCategoryDragStateChange,
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

  const handleCategoryDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, button: PaletteCategoryButton) => {
      if (!canEdit) {
        event.preventDefault();
        return;
      }
      const payload: PlannerCategoryDragPayload = {
        category: button.category,
        label: button.label,
        sublabel: button.sublabel,
      };
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        PLANNER_CATEGORY_DRAG_TYPE,
        JSON.stringify(payload),
      );
      event.dataTransfer.setData("text/plain", button.label);
      onCategoryDragStateChange?.(true);
    },
    [canEdit, onCategoryDragStateChange],
  );

  const handleCategoryDragEnd = useCallback(() => {
    onCategoryDragStateChange?.(false);
  }, [onCategoryDragStateChange]);

  const handleTaskDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      if (!canEdit) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(PLANNER_TASK_DRAG_TYPE, "task");
      event.dataTransfer.setData("text/plain", "Task");
      onCategoryDragStateChange?.(true);
    },
    [canEdit, onCategoryDragStateChange],
  );

  if (!canEdit) {
    const disabledClassName = embedded
      ? "planner-muted px-1 py-1 text-[12px]"
      : "planner-panel planner-muted absolute bottom-6 right-6 z-[20] px-3 py-2 text-[12px]";
    return (
      <aside className={disabledClassName}>
        {disabledMessage ?? "Sign in to edit"}
      </aside>
    );
  }

  const className = embedded
    ? "grid grid-cols-2 gap-2 text-[12px]"
    : "planner-panel absolute bottom-6 right-6 z-[20] grid w-56 grid-cols-2 gap-2 p-2 text-[12px]";

  return (
    <aside
      className={className}
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
            draggable={canEdit}
            onDragStart={(event) => handleCategoryDragStart(event, button)}
            onDragEnd={handleCategoryDragEnd}
            className={`planner-control flex min-h-[28px] items-center gap-2 px-2 py-1.5 text-left ${
              isActive ? "is-active" : ""
            }`}
            aria-pressed={isActive}
            title={`Drag ${button.label} to the map, or click to place by map click`}
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
        draggable={canEdit}
        onDragStart={handleTaskDragStart}
        onDragEnd={handleCategoryDragEnd}
        className="planner-control col-span-2 flex min-h-[28px] cursor-grab items-center gap-2 px-2 py-1.5 text-left active:cursor-grabbing"
        title="Drag onto a band, a building, or open ground to attach a task"
      >
        <span
          aria-hidden="true"
          className="planner-swatch"
          style={{ backgroundColor: "#6b2c33" }}
        />
        <span>Task</span>
      </button>
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
