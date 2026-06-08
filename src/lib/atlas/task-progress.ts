/**
 * Task progress computation for the porchfest planner.
 *
 * Ported in spirit from the commonplace task system (travisgilbert.me commit
 * 152b09a), which computed per-item progress as completed-subtasks / total.
 * Porchfest tasks have no subtask field, but a task's NOTES (edited via
 * PlannerNotesEditor) can contain a markdown checklist -- so the checklist
 * doubles as the subtask list. When a task has no checklist, progress falls
 * back to a status-derived value.
 *
 * Unlike the commonplace original, the ratio math lives here once, shared by
 * the per-task bars and the rolled-up event bar, instead of being inlined per
 * component.
 */

export interface ChecklistCount {
  readonly done: number;
  readonly total: number;
}

// GitHub-style task-list items: "- [ ] item", "- [x] item", "* [X] item",
// "1. [ ] item", with optional leading indentation (nested checklists). This
// is exactly what @tiptap/markdown serializes TaskList/TaskItem nodes to.
const CHECKBOX_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\][ \t]+\S/gm;

/**
 * Count checked / total task-list checkboxes in a markdown notes string.
 * Returns null when the notes contain no checkboxes at all.
 */
export function checklistProgress(
  notes: string | null | undefined,
): ChecklistCount | null {
  if (!notes) return null;
  let total = 0;
  let done = 0;
  for (const match of notes.matchAll(CHECKBOX_RE)) {
    total += 1;
    if (match[1] !== " ") done += 1;
  }
  return total > 0 ? { done, total } : null;
}

// Progress fraction for a task that has no checklist, derived from its
// lifecycle status. Mirrors the planner's status vocabulary.
const STATUS_FRACTION: Record<string, number> = {
  done: 1,
  complete: 1,
  completed: 1,
  in_progress: 0.5,
  blocked: 0,
  deferred: 0,
  open: 0,
  todo: 0,
};

export interface TaskProgressLike {
  readonly status: string;
  readonly notes?: string | null;
}

/**
 * Progress fraction in [0, 1] for a single task. Prefers the notes checklist
 * (checked / total); falls back to the status-derived value.
 */
export function taskProgress(task: TaskProgressLike): number {
  const checklist = checklistProgress(task.notes);
  if (checklist) {
    return checklist.total > 0 ? checklist.done / checklist.total : 0;
  }
  return STATUS_FRACTION[task.status] ?? 0;
}

export interface EventProgress {
  /** Mean of every task's progress fraction, in [0, 1]. */
  readonly fraction: number;
  /** Tasks at 100% (a fully checked checklist, or status done). */
  readonly tasksDone: number;
  readonly tasksTotal: number;
}

/**
 * Roll up per-task progress into a single event-level figure. The bar uses the
 * mean fraction (so in-progress work and partial checklists count); the caption
 * uses the concrete fully-done count.
 */
export function eventProgress(
  tasks: readonly TaskProgressLike[],
): EventProgress {
  const tasksTotal = tasks.length;
  if (tasksTotal === 0) {
    return { fraction: 0, tasksDone: 0, tasksTotal: 0 };
  }
  let sum = 0;
  let tasksDone = 0;
  for (const task of tasks) {
    const fraction = taskProgress(task);
    sum += fraction;
    if (fraction >= 1) tasksDone += 1;
  }
  return { fraction: sum / tasksTotal, tasksDone, tasksTotal };
}
