// Tasks loader: what is left. Open vs done counts, a rollup percentage, and
// upcoming milestones.
//
// Source order:
//   - Preferred: the live Yjs task database at civic:tasks:porchfest-2026.
//     This is the row model organizers edit in the workspace.
//   - Fallback: the public GraphQL `eventTasks` read, for older deployments
//     or backend projections.
//
// The rollup math mirrors src/lib/atlas/task-progress.ts in the Next app: a
// task's notes can carry a markdown checklist, and the checked/total ratio is
// its progress; when there is no checklist, progress is derived from status.

import * as Y from "yjs";

import {
  graphql,
  TENANT_SLUG,
  EVENT_SLUG,
  nowIso,
  WORKSPACE_SYNC_URL,
} from "./_lib.js";

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

const TASKS_DOC_ID = "civic:tasks:porchfest-2026";
const TASK_COLUMN_ID_MAP_KEY = "civic:task-column-ids";
const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;

const TASK_FIELD_BY_COLUMN_NAME = {
  Status: "status",
  Priority: "priority",
  Owner: "owner",
  Due: "dueAt",
  Starts: "startsAt",
  Done: "done",
  Location: "location",
  Address: "address",
  Figure: "figureKey",
  Parent: "parentId",
  Notes: "notes",
};

// GitHub-style task-list items, matching task-progress.ts exactly:
// "- [ ] item", "- [x] item", "1. [X] item", with optional indentation.
const CHECKBOX_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\][ \t]+\S/gm;

const STATUS_FRACTION = {
  "to do": 0,
  todo: 0,
  doing: 0.5,
  done: 1,
  complete: 1,
  completed: 1,
  in_progress: 0.5,
  blocked: 0,
  deferred: 0,
  open: 0,
};

const DONE_STATUS_KEYS = new Set(["done", "complete", "completed"]);

function normalizeStatus(status) {
  const key = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (key === "to do") return "todo";
  if (key === "in progress") return "in_progress";
  return key;
}

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
  if (task.done) return 1;
  return STATUS_FRACTION[normalizeStatus(task.status)] ?? 0;
}

function isDone(task) {
  return (
    Boolean(task.done) ||
    taskProgress(task) >= 1 ||
    DONE_STATUS_KEYS.has(normalizeStatus(task.status))
  );
}

function pullWorkspaceDoc(docId) {
  if (typeof WebSocket === "undefined") {
    throw new Error("WebSocket is not available in this Node runtime");
  }
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const url = `${WORKSPACE_SYNC_URL.replace(/\/$/, "")}/${encodeURIComponent(
      docId,
    )}`;
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`workspace pull timeout: ${docId}`));
    }, 20000);

    ws.onopen = () => {
      const stateVector = Y.encodeStateVector(doc);
      const frame = new Uint8Array(1 + stateVector.length);
      frame[0] = TAG_PULL;
      frame.set(stateVector, 1);
      ws.send(frame);
    };

    ws.onmessage = (event) => {
      const frame = new Uint8Array(event.data);
      if (frame[0] !== TAG_PULL_REPLY) return;
      clearTimeout(timer);
      if (frame.length > 1) Y.applyUpdate(doc, frame.subarray(1));
      ws.close();
      resolve(doc);
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`workspace websocket error: ${docId}`));
    };
  });
}

function decodeCellValue(column, raw) {
  if (raw === null || raw === undefined) return undefined;

  const options = column?.data?.options;
  if (Array.isArray(options)) {
    const optionMap = Object.fromEntries(
      options.map((option) => [option.id, option.value]),
    );
    if (Array.isArray(raw)) return raw.map((id) => optionMap[id]).filter(Boolean);
    return optionMap[raw] ?? raw;
  }

  if (column?.type === "date") {
    const ms = typeof raw === "number" ? raw : Date.parse(String(raw));
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
  }

  if (column?.type === "checkbox") return Boolean(raw);
  return typeof raw === "string" ? raw : raw.toString();
}

function decodeWorkspaceTasks(doc) {
  const columnIdMap = doc.getMap(TASK_COLUMN_ID_MAP_KEY).toJSON();
  const fieldKeyByColumnId = Object.fromEntries(
    Object.entries(columnIdMap).map(([fieldKey, columnId]) => [
      columnId,
      fieldKey,
    ]),
  );

  const blocks = doc.getMap("blocks");
  let database = null;
  for (const [, block] of blocks) {
    if (block.get("sys:flavour") === "affine:database") {
      database = block;
      break;
    }
  }
  if (!database) throw new Error("no civic task database found");

  const columns = database.get("prop:columns").toJSON();
  const columnById = Object.fromEntries(columns.map((column) => [column.id, column]));
  for (const column of columns) {
    const fieldKey = TASK_FIELD_BY_COLUMN_NAME[column.name];
    if (fieldKey && !fieldKeyByColumnId[column.id]) {
      fieldKeyByColumnId[column.id] = fieldKey;
    }
  }

  const cells = database.get("prop:cells").toJSON();
  return database.get("sys:children").toArray().map((rowId) => {
    const rowBlock = blocks.get(rowId);
    const title = rowBlock?.get("prop:text")?.toString().trim() || "Untitled task";
    const fields = {};
    for (const [columnId, cell] of Object.entries(cells[rowId] ?? {})) {
      const fieldKey = fieldKeyByColumnId[columnId];
      if (!fieldKey) continue;
      const value = decodeCellValue(columnById[columnId], cell?.value);
      if (value !== undefined && value !== "") fields[fieldKey] = value;
    }
    return {
      id: rowId,
      title,
      status: fields.status ?? (fields.done ? "Done" : "To do"),
      notes: fields.notes ?? null,
      dueAt: fields.dueAt ?? null,
      done: Boolean(fields.done),
    };
  });
}

function rollup(tasks, source) {
  let sum = 0;
  let tasksDone = 0;
  const byStatusMap = new Map();
  for (const task of tasks) {
    const fraction = taskProgress(task);
    sum += fraction;
    if (isDone(task)) tasksDone += 1;
    const status = task.status ?? "open";
    byStatusMap.set(status, (byStatusMap.get(status) ?? 0) + 1);
  }
  const total = tasks.length;
  const open = total - tasksDone;
  const rollupFraction = total > 0 ? sum / total : 0;

  const milestones = tasks
    .filter((t) => t.dueAt && !isDone(t))
    .map((t) => ({
      title: t.title,
      status: t.status,
      dueAt: t.dueAt,
      progress: taskProgress(t),
    }))
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));

  return {
    status: "live",
    source,
    total,
    done: tasksDone,
    open,
    rollupFraction,
    rollupPercent: Math.round(rollupFraction * 100),
    byStatus: [...byStatusMap].map(([status, count]) => ({ status, count })),
    milestones,
    asOf: nowIso(),
  };
}

async function loadFromWorkspace() {
  const tasks = decodeWorkspaceTasks(await pullWorkspaceDoc(TASKS_DOC_ID));
  if (tasks.length === 0) {
    throw new Error("workspace task database returned zero rows");
  }
  return rollup(tasks, "workspace-yjs");
}

async function loadFromGraphql() {
  const data = await graphql(TASKS_QUERY, {
    tenantSlug: TENANT_SLUG,
    eventSlug: EVENT_SLUG,
  });
  return rollup(data.eventTasks ?? [], "graphql");
}

async function load() {
  try {
    return await loadFromWorkspace();
  } catch (error) {
    console.warn(
      `tasks: workspace path failed (${error.message}); using GraphQL fallback`,
    );
  }

  try {
    return await loadFromGraphql();
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
