import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Board Dashboard | PorchFest",
  description:
    "Board-facing PorchFest dashboard: money raised against goal, submissions by category, mapped progress, and what is left. Figures are precomputed at build time and refresh on a schedule.",
};

/**
 * The board dashboard is an Observable Framework static site built OUTSIDE the
 * Next tree (see dashboard/ and scripts/build-dashboard.mjs) and staged into
 * public/porchfest-dashboard/. We mount it here by a same-origin iframe, the
 * same isolation pattern the BlockSuite workspace bundle uses: the dashboard
 * keeps its own build, its own rebuild cadence, and its precomputed data,
 * while the route gives it a home and a frame of chrome.
 *
 * Same-origin (served from our own public/) means no CORS and no credential -
 * the static output only ever contains the loaders' precomputed JSON.
 */

const DASHBOARD_INDEX = "/porchfest-dashboard/index.html";

export default function PorchfestDashboardPage() {
  // In local dev the static output may not be built yet. The public/ filesystem
  // is reliable locally, so only gate on it in development; in production we
  // always frame it (the deploy's build step staged it).
  const builtLocally =
    process.env.NODE_ENV !== "development" ||
    existsSync(
      join(process.cwd(), "public", "porchfest-dashboard", "index.html"),
    );

  return (
    <div className="civic-atlas flex h-full w-full flex-col bg-[var(--ctx-paper)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--ctx-rule)] px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-[var(--ctx-ink)]">
            PorchFest board
          </h1>
          <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--ctx-ink-soft,#6b6b6b)]">
            Where the festival stands
          </span>
        </div>
        <nav className="flex items-center gap-4 text-[13px]">
          <Link
            href="/porchfest"
            className="text-[var(--ctx-accent)] hover:underline"
          >
            Planner
          </Link>
          <Link
            href="/porchfest/workspace"
            className="text-[var(--ctx-accent)] hover:underline"
          >
            Workspace
          </Link>
        </nav>
      </header>

      {builtLocally ? (
        <iframe
          src={DASHBOARD_INDEX}
          title="PorchFest board dashboard"
          className="min-h-0 w-full flex-1 border-0"
          // Same-origin static content we control. Allow scripts (the Framework
          // runtime) and same-origin; nothing else is needed.
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <p className="text-[15px] text-[var(--ctx-ink)]">
              The board dashboard has not been built yet.
            </p>
            <p className="mt-2 text-[13px] text-[var(--ctx-ink-soft,#6b6b6b)]">
              Run{" "}
              <code className="rounded bg-[var(--ctx-rule)] px-1.5 py-0.5">
                npm run build:dashboard
              </code>{" "}
              to compile the Observable Framework site into{" "}
              <code className="rounded bg-[var(--ctx-rule)] px-1.5 py-0.5">
                public/porchfest-dashboard/
              </code>
              , then reload.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
