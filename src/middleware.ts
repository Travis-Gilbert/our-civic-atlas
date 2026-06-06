/**
 * Canonical Porchfest redirect.
 *
 * The public Porchfest surface lives at
 * `flint.ourcivicatlas.org/porchfest`. The older Porchfest subdomain
 * remains attached only so bookmarked links can land on the canonical
 * Flint route instead of rendering a separate planner route.
 */

import { NextResponse, type NextRequest } from "next/server";

const PORCHFEST_HOSTS = new Set([
  "porchfest.ourcivicatlas.org",
  "porchfest.localhost:3000",
]);

function canonicalPorchfestPath(pathname: string): string {
  return pathname.startsWith("/porchfest") ? pathname : "/porchfest";
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (!PORCHFEST_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const target = new URL(
    host === "porchfest.localhost:3000"
      ? "http://localhost:3000"
      : "https://flint.ourcivicatlas.org",
  );
  target.pathname = canonicalPorchfestPath(req.nextUrl.pathname);
  target.search = req.nextUrl.search;

  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
