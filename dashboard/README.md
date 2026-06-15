# PorchFest board dashboard

A board-facing dashboard that shows where PorchFest stands: money raised against
the goal, the current workspace roster by category, and what is left.

This is an **[Observable Framework](https://observablehq.com/framework)** project
— a separate static-site build target, **not** a React component inside the Next
tree. `observable build` compiles `src/` into `dist/`: HTML, JS, theme CSS, and
refreshed JSON emitted by the build-time data loaders. The Next
app mounts that static output at `/porchfest/dashboard` by iframe, the same way
the BlockSuite workspace bundle is bridged into its route rather than imported.

It rebuilds on each deploy and on a scheduled CI rebuild, so the board sees
recent figures. A footer states the last refresh time.

## Layout

```
dashboard/
  observablehq.config.js   look + footer; Observable light theme, navy accent
  src/
    index.md               the single dashboard page (cards + Observable Plot)
    components/format.js    client-side formatting helpers
    data/
      _lib.js              shared loader config: Yjs + GraphQL + read-only Postgres
      money.json.js        raised vs goal            (read-only Postgres)
      submissions.json.js  workspace roster by category (Yjs, GraphQL/Postgres fallback)
      tasks.json.js        open/done + rollup        (GraphQL)
      meta.json.js         last-refresh timestamp
```

## Where the data comes from

Loaders run **only at build time, server-side**. The browser receives the JSON
output, never a connection string or token. This respects the project's
GraphQL-only-at-runtime boundary: a build-time loader is not the runtime
frontend.

- **RustyRed/Yjs read** (`submissions`) pulls the live planning workspace first,
  so organizer-entered vendors and category corrections are counted.
- **GraphQL reads** (`submissions` fallback, `tasks`) hit the public Axum
  endpoint the frontend already talks to. No credential.
- **Read-only Postgres** (`money`, and optionally the cheaper `submissions`
  aggregate) reads the ledger directly, because the schema exposes no money
  read query. Optional: without it, money shows an honest "pending" card and
  submissions fall back to GraphQL.

## Environment

All optional; the build is green without any of them (figures that need a source
show as pending).

| Variable | Purpose | Default |
|---|---|---|
| `PORCHFEST_DASHBOARD_GRAPHQL_URL` | GraphQL endpoint for the reads | the production Railway endpoint |
| `PORCHFEST_WORKSPACE_SYNC_URL` | RustyRed/Yjs sync endpoint for the workspace roster | the production RustyRed endpoint |
| `PORCHFEST_TENANT_SLUG` | Tenant for GraphQL reads | `flint` |
| `PORCHFEST_EVENT_SLUG` | Event layer slug | `porchfest-2026` |
| `PORCHFEST_READONLY_DATABASE_URL` | Read-only Postgres for the money ledger | unset → money pending |
| `PORCHFEST_TENANT_ID` | Flint tenant UUID, to set the RLS GUC for a non-BYPASSRLS read role | unset → assumes BYPASSRLS |
| `PORCHFEST_FUNDRAISING_GOAL_CENTS` | Fundraising goal in cents | unset → "goal not set" |

### Read-only Postgres + RLS

`event_applications` and `event_application_billing_requests` enforce row-level
security keyed on the `app.tenant_id` GUC. The dashboard's read role must be
**read-only** and either:

- `BYPASSRLS` (simplest for a reporting read role), or
- granted the tenant policy, with `PORCHFEST_TENANT_ID` set so the loader runs
  `set_config('app.tenant_id', <uuid>, true)` per transaction.

The money figure is, for now, the sum of Square billing requests with a non-null
`paid_at` (real money received) from migration 0023. When the richer income
ledger (completion-plan Workstream D: manual sponsor pledges, etc.) lands, extend
`money.json.js` to read it; the dashboard is its display surface either way.

## Develop

```
cd dashboard
npm install
npm run dev      # http://127.0.0.1:3000 (Framework preview)
npm run build    # -> dist/
```

## How it ships

`../scripts/build-dashboard.mjs` runs `npm install` + `npm run build` here, then
copies `dist/` into `../public/porchfest-dashboard/` (gitignored). That script is
chained into the Next app's `npm run build`, so every Vercel deploy rebuilds the
dashboard with fresh figures (on-deploy rebuild). The scheduled rebuild is a
GitHub Actions cron that POSTs a Vercel deploy hook
(`.github/workflows/porchfest-dashboard-rebuild.yml`).

## Design rationale (Path B register)

The look is Observable Framework's own light theme — the "Observable look" the
spec asks for — tinted to the Path B "Observable cool" register the atlas runs:
navy `#005186` is the single accent (links, progress fills, big numbers),
applied via `--theme-foreground-focus`. Data-semantic neutrals come from the
theme. Layout is the Framework card grid: big-number cards for the four
headline figures, Observable Plot bars for the breakdowns. This is a reporting
surface whose visual language is determined by the spec (Observable look) plus
the locked Path B accent, so it inherits rather than invents.
