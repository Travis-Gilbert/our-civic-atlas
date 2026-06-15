// Submissions loader: total application/workspace rows and a breakdown by
// category, plus a submissions-over-time series so the board sees the shape of
// who has applied.
//
// Three interchangeable paths produce the same shape:
//   - Preferred: the live BlockSuite/Yjs planning workspace. This includes
//     organizer-entered rows, category corrections, and imported application
//     rows in the same place the planner and workspace edit.
//   - When a read-only DB is wired: a cheap SQL GROUP BY over the
//     event_applications ledger (no PII pulled, just counts).
//   - Default fallback: the public GraphQL `eventApplications` read,
//     selecting only category/status/createdAt. This needs no credential and
//     always works against the live backend.
//
// Categories are data-driven: whatever categories the live system returns are
// rendered, so "sponsor" appears automatically once Workstream A ships its
// form - no code change, just the next rebuild.

import {
  openDb,
  withTenant,
  graphql,
  TENANT_SLUG,
  EVENT_SLUG,
  nowIso,
  WORKSPACE_SYNC_URL,
} from "./_lib.js";
import * as Y from "yjs";

const SUBMISSIONS_QUERY = /* GraphQL */ `
  query DashboardSubmissions($tenantSlug: String!, $eventSlug: String!) {
    eventApplications(tenantSlug: $tenantSlug, eventSlug: $eventSlug) {
      category
      status
      createdAt
    }
  }
`;

const WORKSPACE_DOC_ID = "civic:porchfest-2026";
const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;

/** day-bucket an ISO timestamp to YYYY-MM-DD (UTC). Null-safe. */
function dayBucket(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Roll an array of {category, createdAt} rows into the loader's output shape. */
function rollup(rows, source) {
  const byCategoryMap = new Map();
  const byDayMap = new Map();
  for (const row of rows) {
    const category = row.category ?? "uncategorized";
    byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + 1);
    const day = dayBucket(row.createdAt);
    if (day) byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }
  const byCategory = [...byCategoryMap].map(([category, count]) => ({
    category,
    count,
  }));
  // Cumulative submissions over time, ascending by day.
  const days = [...byDayMap].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  let running = 0;
  const overTime = days.map(([day, count]) => {
    running += count;
    return { day, count, cumulative: running };
  });
  return {
    status: "live",
    source,
    total: rows.length,
    byCategory,
    overTime,
    asOf: nowIso(),
  };
}

function pullWorkspaceDoc() {
  if (typeof WebSocket === "undefined") {
    throw new Error("WebSocket is not available in this Node runtime");
  }
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const url = `${WORKSPACE_SYNC_URL.replace(/\/$/, "")}/${encodeURIComponent(
      WORKSPACE_DOC_ID,
    )}`;
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error("workspace pull timeout"));
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
      reject(new Error("workspace websocket error"));
    };
  });
}

function decodeWorkspaceRows(doc) {
  const columnIdMap = doc.getMap("civic:column-ids").toJSON();
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
  if (!database) throw new Error("no civic workspace database found");

  const optionValueByColumnId = {};
  for (const column of database.get("prop:columns").toJSON()) {
    const options = column?.data?.options;
    if (Array.isArray(options)) {
      optionValueByColumnId[column.id] = Object.fromEntries(
        options.map((option) => [option.id, option.value]),
      );
    }
  }

  const cells = database.get("prop:cells").toJSON();
  return database.get("sys:children").toArray().map((rowId) => {
    const rowCells = cells[rowId] ?? {};
    const fields = {};
    for (const [columnId, cell] of Object.entries(rowCells)) {
      const fieldKey = fieldKeyByColumnId[columnId];
      if (!fieldKey) continue;
      let value = cell?.value;
      if (value === null || value === undefined) continue;
      const optionMap = optionValueByColumnId[columnId];
      if (optionMap) {
        value = Array.isArray(value)
          ? value.map((id) => optionMap[id]).filter(Boolean)
          : (optionMap[value] ?? value);
      }
      fields[fieldKey] = value;
    }
    return {
      category: fields.category ?? "uncategorized",
      createdAt: fields.submittedAt,
    };
  });
}

async function loadFromWorkspace() {
  const rows = decodeWorkspaceRows(await pullWorkspaceDoc());
  if (rows.length === 0) {
    throw new Error("workspace returned zero civic rows");
  }
  return rollup(rows, "workspace-yjs");
}

async function loadFromGraphql() {
  const data = await graphql(SUBMISSIONS_QUERY, {
    tenantSlug: TENANT_SLUG,
    eventSlug: EVENT_SLUG,
  });
  return rollup(data.eventApplications ?? [], "graphql");
}

async function loadFromDb(sql) {
  // Pull only category + createdAt (no PII) and roll up in JS so the cumulative
  // series logic stays shared with the GraphQL path.
  const rows = await withTenant(sql, (tx) =>
    tx`
      select category, created_at as "createdAt"
      from event_applications
    `,
  );
  return rollup(
    rows.map((r) => ({ category: r.category, createdAt: r.createdAt })),
    "postgres",
  );
}

async function load() {
  try {
    return await loadFromWorkspace();
  } catch (error) {
    console.warn(
      `submissions: workspace path failed (${error.message}); using ledger fallback`,
    );
  }

  const sql = openDb();
  if (sql) {
    try {
      return await loadFromDb(sql);
    } catch (error) {
      // Fall through to GraphQL if the DB path fails for any reason.
      console.warn(`submissions: DB path failed (${error.message}); using GraphQL`);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
  try {
    return await loadFromGraphql();
  } catch (error) {
    return {
      status: "pending",
      reason: `Submissions read failed: ${error.message}`,
      total: 0,
      byCategory: [],
      overTime: [],
      asOf: nowIso(),
    };
  }
}

process.stdout.write(JSON.stringify(await load()));
