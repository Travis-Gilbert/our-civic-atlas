"use client";

/**
 * Phase 2 right rail — full task list with filters, inline edit, and
 * camera fly-to from placement breadcrumbs.
 *
 * Filters:
 *   - status: open | in_progress | done | all
 *   - linkedPlacementId: when a pin is selected, the list narrows
 *     to that pin's tasks (the "tasks for BBQ Steve" affordance).
 *
 * Each row is a small card; clicking the breadcrumb calls the
 * parent's `onFlyTo(placementId)` which uses the existing MapRef.
 *
 * Optimistic UX: new tasks appear immediately with a soft pulse;
 * the urql mutation result reconciles with the server. Stale-write
 * toasts are owned by the parent — this component just hands its
 * inputs back via the props interface.
 */

import { useMemo, useState } from "react";

import type {
  EventPlacementsQuery,
  EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";

type Placement = EventPlacementsQuery["placements"][number];
type Task = EventTasksListQuery["eventTasks"][number];

const STATUS_OPTIONS = ["all", "open", "in_progress", "done"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

export interface PlannerTaskRailProps {
  readonly tasks: readonly Task[];
  readonly placements: readonly Placement[];
  readonly selectedPlacementId: string | null;
  readonly canEdit: boolean;
  readonly onFlyToPlacement: (placementId: string) => void;
  readonly onCreateTask: (input: NewTaskInput) => void;
  readonly onUpdateTask: (taskId: string, version: number, patch: TaskPatch) => void;
  readonly onDeleteTask: (taskId: string, version: number) => void;
}

export interface NewTaskInput {
  readonly title: string;
  readonly placementId: string | null;
}

export interface TaskPatch {
  readonly title?: string;
  readonly status?: string;
  readonly placementId?: string | null;
}

export function PlannerTaskRail({
  tasks,
  placements,
  selectedPlacementId,
  canEdit,
  onFlyToPlacement,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: PlannerTaskRailProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [restrictToSelection, setRestrictToSelection] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const placementsById = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const p of placements) map.set(p.id, p);
    return map;
  }, [placements]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (status !== "all" && task.status !== status) return false;
      if (
        restrictToSelection &&
        selectedPlacementId &&
        task.placementId !== selectedPlacementId
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, status, restrictToSelection, selectedPlacementId]);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    onCreateTask({
      title,
      placementId: restrictToSelection ? selectedPlacementId : null,
    });
    setNewTitle("");
  };

  return (
    <aside
      aria-label="Event task list"
      className="planner-right-rail z-[6] flex w-72 shrink-0 flex-col border-l border-stone-300/60 bg-amber-50/85 p-4 backdrop-blur"
    >
      <header className="mb-3">
        <p className="text-xs uppercase tracking-wider text-stone-500">Tasks</p>
        <p className="mt-0.5 text-xs text-stone-500">
          {filteredTasks.length} of {tasks.length}
        </p>
      </header>

      <div className="mb-3 flex items-center gap-1.5 text-xs text-stone-700">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded border px-1.5 py-0.5 transition-colors ${
              status === option
                ? "border-stone-900 bg-stone-900 text-amber-50"
                : "border-stone-300 bg-white/60 hover:border-stone-500"
            }`}
            aria-pressed={status === option}
          >
            {option.replace("_", " ")}
          </button>
        ))}
      </div>

      {selectedPlacementId ? (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-stone-700">
          <input
            type="checkbox"
            checked={restrictToSelection}
            onChange={() => setRestrictToSelection((prev) => !prev)}
            className="h-3.5 w-3.5 accent-stone-700"
          />
          Only show tasks linked to selected pin
        </label>
      ) : null}

      <ul className="-mx-1 flex-1 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <li className="px-1 text-sm text-stone-500">No tasks here yet.</li>
        ) : (
          filteredTasks.map((task) => {
            const placement = task.placementId
              ? placementsById.get(task.placementId)
              : null;
            return (
              <li
                key={task.id}
                className="mx-1 mb-2 rounded-md border border-stone-200/70 bg-white/80 p-3"
              >
                <p className="font-medium text-stone-800">{task.title}</p>
                {task.ownerDisplay ? (
                  <p className="mt-1 text-xs text-stone-600">
                    {task.ownerDisplay}
                  </p>
                ) : null}
                {task.dueAt ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Due {new Date(task.dueAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-stone-500">
                  status: {task.status}
                </p>
                {placement ? (
                  <button
                    type="button"
                    onClick={() => onFlyToPlacement(placement.id)}
                    className="mt-1 text-xs text-blue-700 underline-offset-2 hover:underline"
                  >
                    → {placement.label}
                  </button>
                ) : null}
                {canEdit ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onUpdateTask(task.id, task.version, {
                          status: e.target.value,
                        })
                      }
                      className="rounded border border-stone-300 bg-white px-1 py-0.5"
                      aria-label="Change task status"
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in_progress</option>
                      <option value="done">done</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id, task.version)}
                      className="ml-auto rounded border border-stone-300 px-1.5 py-0.5 text-stone-600 hover:border-red-500 hover:text-red-700"
                    >
                      delete
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      {canEdit ? (
        <div className="mt-3 border-t border-stone-300/60 pt-3">
          <label className="block text-xs text-stone-500" htmlFor="new-task-title">
            New task
          </label>
          <input
            id="new-task-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              selectedPlacementId
                ? "Title — will link to selected pin if box above is checked"
                : "Title…"
            }
            className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="mt-2 w-full rounded bg-stone-900 px-3 py-1.5 text-sm text-amber-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add task
          </button>
          <p className="mt-1 text-[10px] text-stone-500">
            cmd-enter to add
          </p>
        </div>
      ) : (
        <p className="mt-3 border-t border-stone-300/60 pt-3 text-xs text-stone-500">
          Sign in to add tasks.
        </p>
      )}
    </aside>
  );
}
