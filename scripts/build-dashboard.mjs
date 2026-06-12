/**
 * Build the PorchFest board dashboard (Observable Framework) and stage it for
 * the Next app.
 *
 * Like build-civic-editor.mjs, this compiles a self-contained bundle OUTSIDE
 * the Next build and emits it into public/, where the route loads it as a
 * static asset (here: an iframe to public/porchfest-dashboard/index.html).
 *
 * The dashboard is its own Framework project in dashboard/ with its own
 * dependency tree, so this script installs those deps, runs `observable build`,
 * and copies dashboard/dist -> public/porchfest-dashboard.
 *
 * Build-time data loaders read the live system (GraphQL + read-only Postgres)
 * and bake JSON snapshots into the output, so each run refreshes the figures.
 * Loaders degrade to "pending" on their own when a source is unreachable, so a
 * data hiccup does not fail the build.
 *
 * Resilience: by default a hard failure here (npm/tooling) is NON-fatal to the
 * Next deploy - the dashboard is an auxiliary reporting surface and must not
 * gate the planner. On failure we write an honest fallback page and exit 0.
 * Set DASHBOARD_BUILD_STRICT=true to fail the deploy instead.
 *
 * Escape hatches:
 *   SKIP_DASHBOARD_BUILD=true   skip entirely (reuse whatever is in public/)
 *   DASHBOARD_BUILD_STRICT=true  rethrow on failure (fail the Next build)
 *
 * Run: npm run build:dashboard  (chained into npm run build)
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardDir = join(repoRoot, "dashboard");
const distDir = join(dashboardDir, "dist");
const publicOutDir = join(repoRoot, "public", "porchfest-dashboard");

const strict = process.env.DASHBOARD_BUILD_STRICT === "true";

function run(command, args, cwd) {
  console.log(`[dashboard] $ ${command} ${args.join(" ")}  (cwd: ${cwd})`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function writeFallback(message) {
  mkdirSync(publicOutDir, { recursive: true });
  const builtAt = new Date().toISOString();
  writeFileSync(
    join(publicOutDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PorchFest board - pending</title>
<style>
  :root { color-scheme: light; }
  body { font: 15px/1.5 system-ui, sans-serif; color: #1c1c1c; background: #fff;
         margin: 0; display: grid; place-items: center; min-height: 100vh; }
  .box { max-width: 32rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; }
  p { color: #555; }
  code { background: #f2f2f2; padding: 0.1rem 0.35rem; border-radius: 4px; }
</style></head><body><div class="box">
  <h1>PorchFest board dashboard is pending</h1>
  <p>The dashboard could not be built at <b>${builtAt}</b>. ${message}</p>
  <p>It will populate on the next successful rebuild. Run
  <code>npm run build:dashboard</code> locally to build it.</p>
</div></body></html>`,
  );
  console.warn(`[dashboard] wrote fallback page (${message})`);
}

if (process.env.SKIP_DASHBOARD_BUILD === "true") {
  console.log("[dashboard] SKIP_DASHBOARD_BUILD=true - skipping build.");
  if (!existsSync(join(publicOutDir, "index.html"))) {
    writeFallback("Build was skipped and no prior output exists.");
  }
  process.exit(0);
}

try {
  // 1. Install the dashboard's own deps (isolated from the Next tree).
  const hasLockfile = existsSync(join(dashboardDir, "package-lock.json"));
  if (!existsSync(join(dashboardDir, "node_modules"))) {
    run("npm", hasLockfile ? ["ci"] : ["install"], dashboardDir);
  } else {
    console.log("[dashboard] node_modules present - skipping install.");
  }

  // 2. Build the static site. Data loaders run here.
  run("npm", ["run", "build"], dashboardDir);

  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error("observable build produced no dist/index.html");
  }

  // 3. Stage into public/porchfest-dashboard (replace any prior output).
  rmSync(publicOutDir, { recursive: true, force: true });
  mkdirSync(publicOutDir, { recursive: true });
  cpSync(distDir, publicOutDir, { recursive: true });

  const fileCount = readdirSync(publicOutDir).length;
  console.log(
    `[dashboard] staged ${fileCount} top-level entries -> public/porchfest-dashboard/`,
  );
} catch (error) {
  console.error(`[dashboard] build failed: ${error.message}`);
  if (strict) {
    throw error;
  }
  writeFallback("See the build log for the cause.");
  process.exit(0);
}
