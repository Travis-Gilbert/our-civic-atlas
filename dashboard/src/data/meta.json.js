// Meta loader: the single source of truth for "last built". Stamped once at
// build time and rendered in the page footer so the board knows the age of
// what it is reading (spec: "a page footer states the last build time").

import { GRAPHQL_URL, TENANT_SLUG, EVENT_SLUG, DATABASE_URL } from "./_lib.js";

process.stdout.write(
  JSON.stringify({
    builtAt: new Date().toISOString(),
    tenantSlug: TENANT_SLUG,
    eventSlug: EVENT_SLUG,
    graphqlEndpoint: GRAPHQL_URL,
    // Boolean only - never the connection string itself.
    moneyLedgerConfigured: Boolean(DATABASE_URL),
  }),
);
