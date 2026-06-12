// Tasks loader: what is left. Open vs done counts, a rollup percentage, and
// upcoming milestones.
//
// Source (spec named choice): the public GraphQL `eventTasks` read. The rollup
// math mirrors src/lib/atlas/task-progress.ts in the Next app: a task's notes
// can carry a markdown checklist, and the checked/total ratio is its progress;
// when there is no checklist, progress is derived from the lifecycle status.
// Keeping the same logic means the board's "what is left" figure matches the
// planner's task bars.

import { graphql, TENANT_SLUG, EVENT_SLUG, nowIso } from "./_lib.js";

const TASKS_QUERY = /* GraphQL */ `
  query DashboardTasks($tenantSlug: String!, $eventSlug: String!) {
    eventTasks(tenantSlug: $tenantSlug, eventSlug: $eventSlug) {
      id
      title
      status
      notes
      dueAt
    }
  }
`;

// GitHub-style task-list items, matching task-progress.ts exactly:
// "- [ ] item", "- [x] item", "1. [X] item", with optional indentation.
const CHECKBOX_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\][ \t]+\S/gm;

const STATUS_FRACTION = {
  done: 1,
  complete: 1,
  completed: 1,
  in_progress: 0.5,
  blocked: 0,
  deferred: 0,
  open: 0,
  todo: 0,
};

function checklistProgress(notes) {
  if (!notes) return null;
  let total = 0;
  let done = 0;
  for (const match of notes.matchAll(CHECKBOX_RE)) {
    total += 1;
    if (match[1] !== " ") done += 1;
  }
  return total > 0 ? { done, total } : null;
}

function taskProgress(task) {
  const checklist = checklistProgress(task.notes);
  if (checklist) return checklist.total > 0 ? checklist.done / checklist.total : 0;
  return STATUS_FRACTION[task.status] ?? 0;
}

const DONE_STATUSES = new Set(["done", "complete", "completed"]);

async function load() {
  try {
    const data = await graphql(TASKS_QUERY, {
      tenantSlug: TENANT_SLUG,
      eventSlug: EVENT_SLUG,
    });
    const tasks = data.eventTasks ?? [];

    let sum = 0;
    let tasksDone = 0;
    const byStatusMap = new Map();
    for (const task of tasks) {
      const fraction = taskProgress(task);
      sum += fraction;
      if (fraction >= 1 || DONE_STATUSES.has(task.status)) tasksDone += 1;
      const status = task.status ?? "open";
      byStatusMap.set(status, (byStatusMap.get(status) ?? 0) + 1);
    }
    const total = tasks.length;
    const open = total - tasksDone;
    const rollupFraction = total > 0 ? sum / total : 0;

    // Milestones: tasks that carry a due date, soonest first, not-yet-done.
    const milestones = tasks
      .filter((t) => t.dueAt && !DONE_STATUSES.has(t.status))
      .map((t) => ({
        title: t.title,
        status: t.status,
        dueAt: t.dueAt,
        progress: taskProgress(t),
      }))
      .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));

    return {
      status: "live",
      total,
      done: tasksDone,
      open,
      rollupFraction,
      rollupPercent: Math.round(rollupFraction * 100),
      byStatus: [...byStatusMap].map(([status, count]) => ({ status, count })),
      milestones,
      asOf: nowIso(),
    };
  } catch (error) {
    return {
      status: "pending",
      reason: `Tasks read failed: ${error.message}`,
      total: 0,
      done: 0,
      open: 0,
      rollupFraction: 0,
      rollupPercent: 0,
      byStatus: [],
      milestones: [],
      asOf: nowIso(),
    };
  }
}

process.stdout.write(JSON.stringify(await load()));
