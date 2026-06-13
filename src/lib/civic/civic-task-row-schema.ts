/**
 * Task ROW schema (REVISION 2 of the unified task system).
 *
 * Tasks are first-class civic-object ROWS, not blocks: they ride the SAME
 * data-view table + kanban and the SAME bindCivicRowsToMap figure path as
 * applications, instead of a bespoke board. See
 * docs/plans/porchfest-planner/unified-task-system-plan.md (REVISION 2).
 *
 * This file is the column contract only (pure data; headless-safe). The
 * parallel DB module (civic-task-rows.ts) writes these columns into an
 * `affine:database` block exactly like civic-workspace.ts does for
 * applications; `ensureCivicViews` then groups the kanban by the `status`
 * column for free.
 *
 * Column shape reuses `CivicColumnSpec` so the same generic database plumbing
 * applies. `scope` is required by that contract; tasks have no shared/category
 * split, so every task column is `planning`.
 */

import {
  CIVIC_FIGURE_KEYS,
  type CivicColumnSpec,
} from './civic-object-schema';

export const CIVIC_TASKS_DOC_ID = 'civic:tasks:porchfest-2026';
export const CIVIC_TASKS_TITLE = 'Porchfest 2026 Tasks';

// Friendly option values double as the kanban column labels: the native
// data-view kanban renders the select option value verbatim as the group
// header, so the values ARE the display labels (TickTick-style).
export const TASK_ROW_STATUSES = ['To do', 'Doing', 'Blocked', 'Done'] as const;
export type TaskRowStatus = (typeof TASK_ROW_STATUSES)[number];

export const TASK_ROW_PRIORITIES = ['Low', 'Normal', 'High'] as const;
export type TaskRowPriority = (typeof TASK_ROW_PRIORITIES)[number];

/**
 * Task columns in workspace display order. `status` is the kanban grouping
 * column (ensureCivicViews groups the kanban by it). `location` mirrors the
 * civic-object encoding (JSON {lng,lat}) so the existing map figure path and
 * drag write-back apply unchanged; `figureKey` reuses the civic figure
 * registry; `parentId` carries subtask nesting as a row reference.
 */
// The task title is the database's built-in primary title column (the row
// text), set by insertTask via taskRowTitle, so it is NOT a separate column
// here. The kanban card header uses that primary title automatically.
export const TASK_COLUMNS: readonly CivicColumnSpec[] = [
  {
    key: 'status',
    name: 'Status',
    type: 'select',
    options: TASK_ROW_STATUSES,
    scope: 'planning',
    note: 'Kanban grouping column (ensureCivicViews groups by it).',
  },
  {
    key: 'priority',
    name: 'Priority',
    type: 'select',
    options: TASK_ROW_PRIORITIES,
    scope: 'planning',
  },
  {
    key: 'owner',
    name: 'Owner',
    type: 'text',
    scope: 'planning',
    note: 'Assignee display name.',
  },
  { key: 'dueAt', name: 'Due', type: 'date', scope: 'planning' },
  { key: 'startsAt', name: 'Starts', type: 'date', scope: 'planning' },
  { key: 'done', name: 'Done', type: 'checkbox', scope: 'planning' },
  {
    key: 'location',
    name: 'Location',
    type: 'text',
    scope: 'planning',
    note: 'JSON {"lng":number,"lat":number}; consumed by the map figure layer. Empty means unplaced.',
  },
  {
    key: 'address',
    name: 'Address',
    type: 'text',
    scope: 'planning',
    note: 'Mirrored nearest building address; placing or dragging the task refills it.',
  },
  {
    key: 'figureKey',
    name: 'Figure',
    type: 'select',
    options: CIVIC_FIGURE_KEYS,
    scope: 'planning',
    note: 'Map figure override; empty means auto.',
  },
  {
    key: 'parentId',
    name: 'Parent',
    type: 'text',
    scope: 'planning',
    note: 'Row id of the parent task (subtask nesting).',
  },
  { key: 'notes', name: 'Notes', type: 'text', scope: 'planning' },
] as const;

export type TaskFieldKey = (typeof TASK_COLUMNS)[number]['key'];

export interface TaskRowFields {
  title?: string;
  status?: TaskRowStatus;
  priority?: TaskRowPriority;
  owner?: string;
  dueAt?: string;
  startsAt?: string;
  done?: boolean;
  /** JSON {"lng","lat"} string; reuse parse/serializeCivicLocation. */
  location?: string;
  address?: string;
  figureKey?: string;
  /** Row id of the parent task, for subtask nesting. */
  parentId?: string;
  notes?: string;
}

/** Row title: the task title, or a stable fallback. */
export function taskRowTitle(fields: Partial<TaskRowFields>): string {
  const title = (fields.title ?? '').trim();
  return title !== '' ? title : 'Untitled task';
}
