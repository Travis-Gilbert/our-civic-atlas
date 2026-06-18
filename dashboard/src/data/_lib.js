// Shared helpers for the build-time data loaders.
//
// Framework ignores files whose names start with "_", so this module is never
// routed or shipped to the browser; it is imported only by the sibling
// *.json.js loaders, which run in Node during `observable build`.
//
// Three data planes, exactly as the product surfaces now use them:
//   - RustyRed/Yjs reads for the planner workspace roster. This is where
//     organizer-created rows and category corrections live.
//   - GraphQL reads (public Axum endpoint) for fallback submissions and tasks.
//     The endpoint is already public; no credential is involved.
//   - A read-only Postgres connection for the money ledger (and, when wired,
//     the cheaper submissions aggregate). The connection string is a
//     build-time secret that never reaches the browser, because only the
//     loader's JSON output is bundled.

import postgres from "postgres";

// ---------------------------------------------------------------------------
// Configuration (all overridable by environment, so the figures can change
// without a code change - spec acceptance criterion 3).
// ---------------------------------------------------------------------------

/** Public GraphQL endpoint. Same boundary the frontend already talks to. */
export const GRAPHQL_URL =
  process.env.PORCHFEST_DASHBOARD_GRAPHQL_URL ??
  process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL ??
  "https://our-civic-atlas-backend-production.up.railway.app/graphql";

export const TENANT_SLUG = process.env.PORCHFEST_TENANT_SLUG ?? "flint";
export const EVENT_SLUG = process.env.PORCHFEST_EVENT_SLUG ?? "porchfest-2026";
export const WORKSPACE_SYNC_URL =
  process.env.PORCHFEST_WORKSPACE_SYNC_URL ??
  process.env.RUSTYRED_SYNC_URL ??
  process.env.NEXT_PUBLIC_RUSTYRED_SYNC_URL ??
  "wss://rustyred-production-fc07.up.railway.app/v1/tenants/flint/sync/yjs";

/**
 * Read-only Postgres connection string. Optional: when absent (local dev, or a
 * build without DB access) the money loader degrades to an honest "pending"
 * state and the submissions loader falls back to GraphQL. The role behind this
 * URL should be read-only and either BYPASSRLS or matched by the tenant RLS
 * policy (see PORCHFEST_TENANT_ID below and the dashboard README).
 */
export const DATABASE_URL =
  process.env.PORCHFEST_READONLY_DATABASE_URL ?? null;

/**
 * Flint tenant UUID. The event_applications / billing tables enforce row-level
 * security keyed on the `app.tenant_id` GUC, so a non-BYPASSRLS read role must
 * set it per session. When unset we still attempt the query (works for a
 * BYPASSRLS role) and degrade on error.
 */
export const TENANT_ID = process.env.PORCHFEST_TENANT_ID ?? null;

/**
 * Fundraising goal in cents. The money ledger itself (Workstream D) is its own
 * piece of work; the goal is configuration here so the board can change the
 * target without a code change. Null => the page shows "goal not set".
 */
export const GOAL_CENTS = process.env.PORCHFEST_FUNDRAISING_GOAL_CENTS
  ? Number.parseInt(process.env.PORCHFEST_FUNDRAISING_GOAL_CENTS, 10)
  : null;

// Known PorchFest categories: display label + canonical order. Unknown
// categories returned by the live system still render (appended, title-cased),
// so a new category - e.g. "sponsor" once Workstream A ships its form - appears
// on the next rebuild with no code change.
export const CATEGORY_LABELS = {
  musician: "Musicians",
  vendor: "Vendors",
  entertainer: "Entertainers",
  sponsor: "Sponsors",
};
export const CATEGORY_ORDER = ["musician", "vendor", "entertainer", "sponsor"];

/** Title-case an unknown category key for display. */
export function labelFor(category) {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (!category) return "Uncategorized";
  return category
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Stable sort key: known categories first (in CATEGORY_ORDER), then the rest. */
export function categorySortKey(category) {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}

/**
 * Board grouping only: the "Goods and Services" intake lane (category value
 * "other") is a kind of vendor, so it counts under Vendors on the board rather
 * than as its own "Other" bucket. something_else stays the true catch-all and
 * sponsor stays its own bucket. This does NOT touch intake, storage, the map,
 * figures, or the workspace - it only changes how this dashboard groups
 * categories for display.
 */
export function dashboardCategory(category) {
  return category === "other" ? "vendor" : category;
}

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

/**
 * POST a GraphQL query to the public endpoint. Throws on transport or GraphQL
 * errors so callers can catch and degrade to a "pending" payload rather than
 * failing the whole build.
 */
export async function graphql(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Postgres (read-only, build-time only)
// ---------------------------------------------------------------------------

/** Open a read-only Postgres client, or return null when no URL is configured. */
export function openDb() {
  if (!DATABASE_URL) return null;
  return postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    // Defensive: never let a loader mutate. The role should be read-only too.
    prepare: false,
  });
}

/**
 * Run `fn(sql)` with the tenant RLS GUC set when TENANT_ID is known. Uses a
 * transaction so `set_config(..., true)` (local) scopes to these reads. When
 * TENANT_ID is null we run fn directly (works for a BYPASSRLS role).
 */
export async function withTenant(sql, fn) {
  if (!TENANT_ID) return fn(sql);
  return sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${TENANT_ID}, true)`;
    return fn(tx);
  });
}

/** ISO timestamp for "as of" stamps. */
export function nowIso() {
  return new Date().toISOString();
}
