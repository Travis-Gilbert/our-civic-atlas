// Money loader: raised against goal, for the fundraising card.
//
// Source (spec named choice): a read-only Postgres connection. There is no
// GraphQL read for money - the schema exposes only a billing *mutation* - so
// the fundraising figure must come from the database directly, at build time.
//
// The money ledger itself (Workstream D: a richer income ledger with manual
// sponsor pledges and a stored goal) is its own piece of work; this dashboard
// is its display surface. Until that ledger lands, the honest interim source
// of real money-in is the Square billing table (migration 0023): a billing
// request with a non-null paid_at is money actually received. The goal is read
// from configuration (PORCHFEST_FUNDRAISING_GOAL_CENTS) so the board can change
// the target without a code change.
//
// When no read-only database is configured, this emits a clearly marked source
// state and the page renders the funding source as unavailable instead of a
// fabricated number. Either way only the JSON below ships to the browser -
// never the connection string.

import { openDb, withTenant, GOAL_CENTS, nowIso } from "./_lib.js";

async function load() {
  const sql = openDb();

  if (!sql) {
    return {
      status: "pending",
      reason:
        "No read-only database configured (PORCHFEST_READONLY_DATABASE_URL unset).",
      raisedCents: 0,
      goalCents: GOAL_CENTS,
      currency: "USD",
      paidCount: 0,
      asOf: nowIso(),
    };
  }

  try {
    const rows = await withTenant(sql, (tx) =>
      tx`
        select
          coalesce(sum(amount_cents), 0)::bigint as raised_cents,
          count(*)::int                          as paid_count,
          coalesce(max(currency), 'USD')         as currency
        from event_application_billing_requests
        where paid_at is not null
      `,
    );
    const row = rows[0] ?? {};
    return {
      status: "live",
      raisedCents: Number(row.raised_cents ?? 0),
      goalCents: GOAL_CENTS,
      currency: row.currency ?? "USD",
      paidCount: Number(row.paid_count ?? 0),
      asOf: nowIso(),
    };
  } catch (error) {
    // Degrade honestly rather than fail the build: a money hiccup must not
    // take down the deploy. The page surfaces the reason.
    return {
      status: "pending",
      reason: `Money ledger read failed: ${error.message}`,
      raisedCents: 0,
      goalCents: GOAL_CENTS,
      currency: "USD",
      paidCount: 0,
      asOf: nowIso(),
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

process.stdout.write(JSON.stringify(await load()));
