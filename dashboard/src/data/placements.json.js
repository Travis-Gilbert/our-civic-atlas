// Placements loader: how many things are placed on the map, by category.
//
// Source (spec named choice): the public GraphQL `placements` read. The page
// joins this against the submissions-by-category counts to show "mapped
// progress" - e.g. vendors placed over vendors applied - the same rollup the
// planner uses.

import { graphql, TENANT_SLUG, EVENT_SLUG, nowIso } from "./_lib.js";

const PLACEMENTS_QUERY = /* GraphQL */ `
  query DashboardPlacements($tenantSlug: String!, $eventSlug: String!) {
    placements(tenantSlug: $tenantSlug, eventSlug: $eventSlug) {
      category
      status
    }
  }
`;

async function load() {
  try {
    const data = await graphql(PLACEMENTS_QUERY, {
      tenantSlug: TENANT_SLUG,
      eventSlug: EVENT_SLUG,
    });
    const placements = data.placements ?? [];
    const byCategoryMap = new Map();
    for (const p of placements) {
      const category = p.category ?? "uncategorized";
      byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + 1);
    }
    return {
      status: "live",
      total: placements.length,
      byCategory: [...byCategoryMap].map(([category, count]) => ({
        category,
        count,
      })),
      asOf: nowIso(),
    };
  } catch (error) {
    return {
      status: "pending",
      reason: `Placements read failed: ${error.message}`,
      total: 0,
      byCategory: [],
      asOf: nowIso(),
    };
  }
}

process.stdout.write(JSON.stringify(await load()));
