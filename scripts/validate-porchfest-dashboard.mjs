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

const dashboardRoute = read("src/app/porchfest/dashboard/page.tsx");
assertIncludes(
  dashboardRoute,
  'const DASHBOARD_INDEX = "/porchfest-dashboard/index.html";',
  "PorchFest dashboard route",
);
assertIncludes(dashboardRoute, "src={DASHBOARD_INDEX}", "dashboard iframe");

const dashboardCopy = read("dashboard/src/index.md");
const buildScript = read("scripts/build-dashboard.mjs");
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
  /PORCHFEST_[A-Z0-9_]+/,
]) {
  assertExcludes(boardFacingCopy, pattern, "PorchFest dashboard");
}

console.log("PorchFest dashboard wiring is connected to applications.");
