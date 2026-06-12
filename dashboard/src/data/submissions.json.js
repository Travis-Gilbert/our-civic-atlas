// Submissions loader: total applications and a breakdown by category, plus a
// submissions-over-time series so the board sees the shape of who has applied.
//
// Two interchangeable paths produce the same shape:
//   - Preferred when a read-only DB is wired: a cheap SQL GROUP BY over the
//     event_applications ledger (no PII pulled, just counts).
//   - Default everywhere else: the public GraphQL `eventApplications` read,
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
} from "./_lib.js";

const SUBMISSIONS_QUERY = /* GraphQL */ `
  query DashboardSubmissions($tenantSlug: String!, $eventSlug: String!) {
    eventApplications(tenantSlug: $tenantSlug, eventSlug: $eventSlug) {
      category
      status
      createdAt
    }
  }
`;

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
