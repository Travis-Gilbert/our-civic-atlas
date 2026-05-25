/**
 * Subdomain rewrite for the Porchfest Planner.
 *
 * The atlas serves a single Next app, but Phase 1 wants
 * `porchfest.ourcivicatlas.org` to feel like its own site that
 * happens to live inside the atlas. The cleanest path on Vercel is
 * a middleware that rewrites those hostnames into the
 * `/open-flint-atlas/plan/porchfest-2026` route path while leaving
 * the user-visible URL unchanged.
 *
 * Local testing: add `127.0.0.1 porchfest.localhost` to /etc/hosts
 * so the dev server can be hit at porchfest.localhost:3000.
 *
 * Production wiring (HUMAN-IN-THE-LOOP, see Vercel + DNS notes):
 *   1. Add `porchfest.ourcivicatlas.org` as a domain alias on the
 *      Vercel project (Settings -> Domains -> Add).
 *   2. CNAME at the DNS registrar: porchfest -> cname.vercel-dns.com
 *
 * The matcher excludes static assets and API routes so they keep
 * resolving normally on the porchfest host (the planner client
 * still calls /api/* for its own data when wiring lands in Phase 2).
 */

import { NextResponse, type NextRequest } from "next/server";

const PORCHFEST_HOSTS = new Set([
  "porchfest.ourcivicatlas.org",
  "porchfest.localhost:3000",
]);

// The slug rewrites map to. Phase 1 has one event; Phase 2 may add
// `porchfest-2026-dryrun` etc., at which point this can become a
// hostname-to-slug map.
const DEFAULT_PORCHFEST_SLUG = "porchfest-2026";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (!PORCHFEST_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();

  // If the URL already targets the plan path, leave it alone. This
  // lets server-side fetches inside the route (e.g., the GraphQL
  // client) come back through without re-rewriting.
  if (url.pathname.startsWith("/open-flint-atlas/plan/")) {
    return NextResponse.next();
  }

  // Preserve any trailing path so future routes like
  // `porchfest.ourcivicatlas.org/about` map to
  // `/open-flint-atlas/plan/<slug>/about` if/when we add them.
  const tail = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/open-flint-atlas/plan/${DEFAULT_PORCHFEST_SLUG}${tail}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
