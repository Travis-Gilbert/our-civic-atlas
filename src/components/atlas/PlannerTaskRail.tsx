"use client";

/**
 * Phase 2 + 3 right rail.
 *
 * Sections (top to bottom):
 *   1. Filters (status, restrict to selected pin)
 *   2. Task list with inline edit + delete
 *   3. New-task form
 *   4. (Phase 3) Notes thread for the selected placement
 *
 * Notes panel appears only when a placement is selected. It's the
 * conversation thread that lives with the pin — append-only by
 * design, with self-service delete for the author.
 *
 * Filters:
 *   - status: open | in_progress | done | all
 *   - linkedPlacementId: when a pin is selected, the list narrows
 *     to that pin's tasks (the "tasks for BBQ Steve" affordance).
 *
 * Each task row is a small card; clicking the breadcrumb calls the
 * parent's `onFlyTo(placementId)` which uses the existing MapRef.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "urql";
import { usePlannerOwners } from "@/lib/atlas/planner-owners";

import {
  CreatePlacementNoteDocument,
  DeletePlacementNoteDocument,
  PlacementNotesDocument,
  type EventPlacementsQuery,
  type EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";

type Placement = EventPlacementsQuery["placements"][number];
type Task = EventTasksListQuery["eventTasks"][number];

const STATUS_OPTIONS = ["all", "open", "in_progress", "done"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

// Humanize raw enum status for display; values stay raw on the wire.
const STATUS_LABEL: Record<string, string> = {
  all: "All",
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
  deferred: "Deferred",
  todo: "To do",
};

function statusLabel(value: string): string {
  return STATUS_LABEL[value] ?? value.replace(/_/g, " ");
}

export interface PlannerTaskRailProps {
  readonly tasks: readonly Task[];
  readonly placements: readonly Placement[];
  readonly selectedPlacementId: string | null;
  readonly canEdit: boolean;
  readonly onFlyToPlacement: (placementId: string) => void;
  readonly onCreateTask: (input: NewTaskInput) => void;
  readonly onUpdateTask: (taskId: string, version: number, patch: TaskPatch) => void;
  readonly onDeleteTask: (taskId: string, version: number) => void;
  readonly onCollapse?: () => void;
  /**
   * Render without the docked rail shell (no aside chrome, no fixed width,
   * no internal scroll) so the full task surface can live inside the mobile
   * island Tasks tab. The island provides the panel and the scroll.
   */
  readonly embedded?: boolean;
}

export interface NewTaskInput {
  readonly title: string;
  readonly placementId: string | null;
  readonly ownerDisplay?: string | null;
}

export interface TaskPatch {
  readonly title?: string;
  readonly status?: string;
  readonly placementId?: string | null;
  readonly ownerDisplay?: string | null;
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
  onCollapse,
  embedded = false,
}: PlannerTaskRailProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [restrictToSelection, setRestrictToSelection] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { owners, addOwner, renameOwner, removeOwner } = usePlannerOwners();
  const [newOwner, setNewOwner] = useState("");
  const [manageOwners, setManageOwners] = useState(false);

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
      ownerDisplay: newOwner || null,
    });
    setNewTitle("");
  };

  return (
    <aside
      aria-label="Event task list"
      className={
        embedded
          ? "flex flex-col"
          : "planner-rail z-[6] flex w-72 shrink-0 flex-col p-4"
      }
    >
      {embedded ? null : (
        <header className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="planner-kicker">Tasks</p>
            <p className="planner-muted mt-1 text-[12px]">
              {filteredTasks.length} of {tasks.length}
            </p>
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse tasks panel"
              className="planner-iconbtn flex h-7 w-7 items-center justify-center text-[16px] leading-none"
            >
              &rsaquo;
            </button>
          ) : null}
        </header>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`planner-control flex min-h-[24px] items-center px-2 py-1 ${
              status === option ? "is-active" : ""
            }`}
            aria-pressed={status === option}
          >
            {statusLabel(option)}
          </button>
        ))}
      </div>

      {selectedPlacementId ? (
        <label className="planner-ink-soft mb-3 flex cursor-pointer items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={restrictToSelection}
            onChange={() => setRestrictToSelection((prev) => !prev)}
            className="planner-check h-3.5 w-3.5"
          />
          Only show tasks linked to selected pin
        </label>
      ) : null}

      <ul className={embedded ? "-mx-1" : "-mx-1 flex-1 overflow-y-auto pr-1"}>
        {filteredTasks.length === 0 ? (
          <li className="planner-muted px-1 text-[14px]">
            {canEdit
              ? "No tasks yet. Add the first one below."
              : "No tasks here yet."}
          </li>
        ) : (
          filteredTasks.map((task) => {
            const placement = task.placementId
              ? placementsById.get(task.placementId)
              : null;
            const tone =
              task.status === "done"
                ? "is-done"
                : task.status === "blocked"
                  ? "is-blocked"
                  : "";
            return (
              <li
                key={task.id}
                className={`planner-tile mx-1 mb-2 p-3 ${tone}`}
              >
                <p className="planner-ink font-medium">{task.title}</p>
                {task.ownerDisplay ? (
                  <p className="planner-ink-soft mt-1 text-[12px]">
                    {task.ownerDisplay}
                  </p>
                ) : null}
                {task.dueAt ? (
                  <p className="planner-muted mt-1 text-[12px]">
                    Due {new Date(task.dueAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="planner-muted mt-1 text-[12px]">
                  Status: {statusLabel(task.status)}
                </p>
                {placement ? (
                  <button
                    type="button"
                    onClick={() => onFlyToPlacement(placement.id)}
                    className="planner-accent mt-1 inline-flex items-center gap-1 text-[12px] underline underline-offset-2"
                  >
                    <span aria-hidden="true">→</span> {placement.label}
                  </button>
                ) : null}
                {canEdit ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <select
                      value={task.ownerDisplay ?? ""}
                      onChange={(e) =>
                        onUpdateTask(task.id, task.version, {
                          ownerDisplay: e.target.value || null,
                        })
                      }
                      className="planner-input min-h-[24px] px-1.5 py-0.5"
                      aria-label="Assign owner"
                    >
                      <option value="">Unassigned</option>
                      {owners.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onUpdateTask(task.id, task.version, {
                          status: e.target.value,
                        })
                      }
                      className="planner-input min-h-[24px] px-1.5 py-0.5"
                      aria-label="Change task status"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id, task.version)}
                      className="planner-control is-danger ml-auto flex min-h-[24px] items-center px-2 py-0.5"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      {canEdit ? (
        <div className="planner-divider mt-3 pt-3">
          <label
            className="planner-muted block text-[12px]"
            htmlFor="new-task-title"
          >
            New task
          </label>
          <input
            id="new-task-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              selectedPlacementId
                ? "Title (links to the selected pin if the box above is checked)"
                : "Title"
            }
            className="planner-input mt-1 w-full px-2 py-1.5 text-[14px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <label
            className="planner-muted mt-2 block text-[12px]"
            htmlFor="new-task-owner"
          >
            Owner
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <select
              id="new-task-owner"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="planner-input min-h-[32px] flex-1 px-2 py-1 text-[14px]"
            >
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setManageOwners((value) => !value)}
              aria-expanded={manageOwners}
              className="planner-control flex min-h-[32px] items-center px-2 text-[12px]"
            >
              Manage
            </button>
          </div>
          {manageOwners ? (
            <PlannerOwnersManager
              owners={owners}
              onAdd={addOwner}
              onRename={renameOwner}
              onRemove={removeOwner}
            />
          ) : null}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="planner-button mt-2 w-full px-3 py-1.5 text-[14px] disabled:cursor-not-allowed"
          >
            Add task
          </button>
          <p className="planner-faint mt-1 text-[10px]">cmd-enter to add</p>
        </div>
      ) : (
        <p className="planner-divider planner-muted mt-3 pt-3 text-[12px]">
          Sign in to add tasks.
        </p>
      )}

      {selectedPlacementId ? (
        <PlacementNotesPanel
          placementId={selectedPlacementId}
          placementLabel={
            placements.find((p) => p.id === selectedPlacementId)?.label ?? ""
          }
          canEdit={canEdit}
          onError={(message) => {
            // Hook into the parent's toast system if needed in Phase 4;
            // for now log to console so dev tooling can pick it up.
            console.warn("[notes]", message);
          }}
        />
      ) : null}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase 3: placement notes panel                                     */
/* ------------------------------------------------------------------ */

interface PlacementNotesPanelProps {
  readonly placementId: string;
  readonly placementLabel: string;
  readonly canEdit: boolean;
  readonly onError: (message: string) => void;
}

function PlacementNotesPanel({
  placementId,
  placementLabel,
  canEdit,
  onError,
}: PlacementNotesPanelProps) {
  const [draft, setDraft] = useState("");
  const [notesResult] = useQuery({
    query: PlacementNotesDocument,
    variables: { tenantSlug: "flint", placementId },
    requestPolicy: "cache-and-network",
  });
  const [, createNote] = useMutation(CreatePlacementNoteDocument);
  const [, deleteNote] = useMutation(DeletePlacementNoteDocument);

  const notes = notesResult.data?.placementNotes ?? [];

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    void createNote({ input: { placementId, body } }).then((result) => {
      if (result.error) {
        onError(result.error.message);
        return;
      }
      setDraft("");
    });
  };

  return (
    <section className="planner-divider mt-3 pt-3">
      <header className="mb-2 flex items-baseline justify-between">
        <p className="planner-kicker">Notes</p>
        <p className="planner-muted text-[10px]">{placementLabel}</p>
      </header>

      {notes.length === 0 ? (
        <p className="planner-muted text-[12px]">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="planner-tile p-2 text-[12px]">
              <p className="planner-ink font-medium">{note.authorDisplay}</p>
              <p className="planner-muted mt-0.5 text-[10px]">
                {new Date(note.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Delete this note?")) return;
                    void deleteNote({
                      input: { noteId: note.id },
                    }).then((result) => {
                      if (result.error) onError(result.error.message);
                    });
                  }}
                  className="planner-iconbtn mt-1 inline-flex h-6 items-center px-1 text-[10px]"
                >
                  Delete
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note (cmd-enter to post)"
            rows={3}
            className="planner-input w-full resize-y px-2 py-1.5 text-[14px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                post();
              }
            }}
          />
          <button
            type="button"
            onClick={post}
            disabled={!draft.trim()}
            className="planner-button mt-1 w-full px-3 py-1.5 text-[14px] disabled:cursor-not-allowed"
          >
            Post note
          </button>
        </div>
      ) : (
        <p className="planner-muted mt-2 text-[12px]">Sign in to post notes.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Owner roster editor                                                */
/*                                                                     */
/*  Lets planners add, rename, and remove the crew names the owner     */
/*  dropdowns offer. Backed by usePlannerOwners (localStorage), so the */
/*  list survives reloads without a backend.                           */
/* ------------------------------------------------------------------ */

function PlannerOwnersManager({
  owners,
  onAdd,
  onRename,
  onRemove,
}: {
  readonly owners: readonly string[];
  readonly onAdd: (name: string) => void;
  readonly onRename: (oldName: string, newName: string) => void;
  readonly onRemove: (name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="planner-tile mt-2 p-2">
      <p className="planner-kicker">Owners</p>
      <ul className="mt-1.5 space-y-1">
        {owners.map((owner) => (
          <li key={owner} className="flex items-center gap-1.5">
            <input
              defaultValue={owner}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== owner) onRename(owner, next);
              }}
              aria-label={`Rename ${owner}`}
              className="planner-input min-h-[24px] flex-1 px-2 py-0.5 text-[12px]"
            />
            <button
              type="button"
              onClick={() => onRemove(owner)}
              aria-label={`Remove ${owner}`}
              className="planner-iconbtn flex h-6 w-6 items-center justify-center text-[12px]"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add owner"
          aria-label="New owner name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="planner-input min-h-[24px] flex-1 px-2 py-0.5 text-[12px]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="planner-button min-h-[24px] px-2 py-0.5 text-[12px] disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
