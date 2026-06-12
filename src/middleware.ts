/**
 * PorchFest host routing.
 *
 * flint.ourcivicatlas.org keeps the canonical Civic Atlas paths under
 * /porchfest. porchfestflint.com is the public brand domain: clean public
 * paths rewrite into this same Next app without changing the browser URL.
 */

import { NextResponse, type NextRequest } from "next/server";

const PORCHFEST_HOSTS = new Set([
  "porchfest.ourcivicatlas.org",
  "porchfest.localhost:3000",
]);
const PORCHFEST_FLINT_HOSTS = new Set([
  "porchfestflint.com",
  "www.porchfestflint.com",
  "porchfestflint.localhost:3000",
]);
const FLINT_ATLAS_HOSTS = new Set(["flint.ourcivicatlas.org"]);

const PORCHFEST_FLINT_PATHS: ReadonlyMap<string, string> = new Map([
  ["/", "/porchfest-public"],
  ["/apply", "/porchfest/apply"],
  ["/sponsors", "/porchfest-public/sponsors"],
  ["/board", "/porchfest-public/board"],
  ["/planning", "/porchfest"],
  ["/workspace", "/porchfest/workspace"],
  // Board-facing Observable Framework dashboard. The route renders an iframe
  // to /porchfest-dashboard/index.html (a static asset under public/), and
  // those asset requests fall through the FLINT_PATHS lookup to NextResponse
  // .next() below, so they serve normally on this host.
  ["/dashboard", "/porchfest/dashboard"],
]);

const FLINT_ATLAS_PORCHFEST_REDIRECTS: ReadonlyMap<string, string> = new Map([
  ["/porchfest", "/planning"],
  ["/porchfest/", "/planning"],
  ["/porchfest/apply", "/apply"],
  ["/porchfest/workspace", "/workspace"],
  ["/porchfest/dashboard", "/dashboard"],
  ["/porchfest-public", "/"],
  ["/porchfest-public/sponsors", "/sponsors"],
  ["/porchfest-public/board", "/board"],
]);

function canonicalPorchfestPath(pathname: string): string {
  return pathname.startsWith("/porchfest") ? pathname : "/porchfest";
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (FLINT_ATLAS_HOSTS.has(host)) {
    const targetPath = FLINT_ATLAS_PORCHFEST_REDIRECTS.get(req.nextUrl.pathname);
    if (targetPath) {
      const target = new URL(`https://porchfestflint.com${targetPath}`);
      target.search = req.nextUrl.search;
      return NextResponse.redirect(target, 308);
    }
  }

  if (PORCHFEST_FLINT_HOSTS.has(host)) {
    if (req.nextUrl.pathname === "/porchfest/workspace") {
      const target = req.nextUrl.clone();
      target.pathname = "/workspace";
      return NextResponse.redirect(target, 308);
    }

    const targetPath = PORCHFEST_FLINT_PATHS.get(req.nextUrl.pathname);
    if (!targetPath) {
      return NextResponse.next();
    }
    const target = req.nextUrl.clone();
    target.pathname = targetPath;
    return NextResponse.rewrite(target);
  }

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
