import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label} is missing: ${needle}`);
  }
}

function assertExcludes(haystack, pattern, label) {
  if (pattern.test(haystack)) {
    throw new Error(`${label} contains board-facing test language: ${pattern}`);
  }
}

const submissionsLoader = read("dashboard/src/data/submissions.json.js");
assertIncludes(
  submissionsLoader,
  "WORKSPACE_DOC_ID = \"civic:porchfest-2026\"",
  "dashboard workspace submissions loader",
);
assertIncludes(
  submissionsLoader,
  'return rollup(rows, "workspace-yjs");',
  "dashboard workspace rollup",
);
assertIncludes(
  submissionsLoader,
  "eventApplications(tenantSlug: $tenantSlug, eventSlug: $eventSlug)",
  "dashboard submissions GraphQL loader",
);
assertIncludes(
  submissionsLoader,
  "from event_applications",
  "dashboard submissions database loader",
);
assertIncludes(
  submissionsLoader,
  'return rollup(data.eventApplications ?? [], "graphql");',
  "dashboard submissions GraphQL rollup",
);
assertIncludes(
  submissionsLoader,
  "return await loadFromWorkspace();",
  "dashboard workspace-first source order",
);

const tasksLoader = read("dashboard/src/data/tasks.json.js");
assertIncludes(
  tasksLoader,
  "TASKS_DOC_ID = \"civic:tasks:porchfest-2026\"",
  "dashboard task workspace loader",
);
assertIncludes(
  tasksLoader,
  "TASK_COLUMN_ID_MAP_KEY = \"civic:task-column-ids\"",
  "dashboard task column map decoder",
);
assertIncludes(
  tasksLoader,
  'return rollup(tasks, "workspace-yjs");',
  "dashboard task workspace rollup",
);
assertIncludes(
  tasksLoader,
  "eventTasks(tenantSlug: $tenantSlug, eventSlug: $eventSlug)",
  "dashboard task GraphQL fallback",
);
assertIncludes(
  tasksLoader,
  "return await loadFromWorkspace();",
  "dashboard task workspace-first source order",
);

const moneyLoader = read("dashboard/src/data/money.json.js");
assertIncludes(
  moneyLoader,
  "PORCHFEST_SPONSORSHIP_SHEET_ID",
  "dashboard money Google Sheets source",
);
assertIncludes(
  moneyLoader,
  "spreadsheets.values.get",
  "dashboard money Sheets values read",
);
assertIncludes(
  moneyLoader,
  "PORCHFEST_SPONSORSHIP_CSV_PATH",
  "dashboard money CSV seed source",
);
assertIncludes(
  moneyLoader,
  "PORCHFEST_SPONSORSHIP_CSV_BASE64",
  "dashboard money encrypted CSV seed source",
);
assertIncludes(
  moneyLoader,
  "sponsorshipRollup(rows",
  "dashboard money sponsorship aggregate",
);
assertIncludes(
  moneyLoader,
  "from event_application_billing_requests",
  "dashboard money Postgres fallback",
);

const dashboardRoute = read("src/app/porchfest/dashboard/page.tsx");
assertIncludes(
  dashboardRoute,
  'const DASHBOARD_INDEX = "/porchfest-dashboard/index.html";',
  "PorchFest dashboard route",
);
assertIncludes(dashboardRoute, "src={DASHBOARD_INDEX}", "dashboard iframe");

const dashboardCopy = read("dashboard/src/index.md");
const buildScript = read("scripts/build-dashboard.mjs");
assertIncludes(
  buildScript,
  "function publishStableDataFiles()",
  "dashboard stable data publisher",
);
assertIncludes(
  buildScript,
  '"path":"${stablePath}"',
  "dashboard index data-path rewrite",
);
const observableConfig = read("dashboard/observablehq.config.js");
const boardFacingCopy = [
  dashboardCopy,
  observableConfig,
  buildScript.match(/`<!doctype html>[\s\S]*?`/)?.[0] ?? "",
].join("\n");

for (const pattern of [
  /\btesting\b/i,
  /\btest data\b/i,
  /\bdemo\b/i,
  /\bsample\b/i,
  /\bmock\b/i,
  /\bsandbox\b/i,
  /\bnot live\b/i,
  /\bprecomputed\b/i,
  /\bledger pending\b/i,
  /\bfigures pending\b/i,
  /\bbuild-time snapshot\b/i,
  /\bOn the festival map\b/i,
  /PORCHFEST_[A-Z0-9_]+/,
]) {
  assertExcludes(boardFacingCopy, pattern, "PorchFest dashboard");
}

console.log("PorchFest dashboard wiring is connected to the workspace roster.");
