/**
 * Civic Atlas and PorchFest host routing.
 *
 * flint.ourcivicatlas.org is the canonical Atlas host. porchfestflint.com is
 * the public event host. Both domains currently land on this same Next app, so
 * middleware keeps the public paths separated without duplicating route files.
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

const FLINT_ATLAS_CLEAN_PATH_PREFIXES = [
  "/atelier",
  "/contribute",
  "/explore",
  "/interventions",
  "/layer-lab",
  "/lost-flint",
  "/memory",
  "/methodology",
  "/mobile-candidate",
  "/node",
  "/object",
  "/place",
  "/plan",
  "/reconstruction-engine",
  "/safety",
  "/scene",
  "/sources",
] as const;

const FLINT_ATLAS_PORCHFEST_PATHS: ReadonlyMap<string, string> = new Map([
  ["/planning", "/planning"],
  ["/apply", "/apply"],
  ["/workspace", "/workspace"],
  ["/sponsors", "/sponsors"],
  ["/board", "/board"],
  ["/dashboard", "/dashboard"],
  ["/porchfest", "/planning"],
  ["/porchfest/", "/planning"],
  ["/porchfest/apply", "/apply"],
  ["/porchfest/workspace", "/workspace"],
  ["/porchfest/dashboard", "/dashboard"],
  ["/porchfest-public", "/"],
  ["/porchfest-public/sponsors", "/sponsors"],
  ["/porchfest-public/board", "/board"],
]);

function isPathInPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function atlasInternalPath(pathname: string): string | null {
  if (pathname === "/") return "/open-flint-atlas";
  if (pathname === "/open-flint-atlas") return null;
  if (pathname.startsWith("/open-flint-atlas/")) return null;

  const atlasPrefix = FLINT_ATLAS_CLEAN_PATH_PREFIXES.find((prefix) =>
    isPathInPrefix(pathname, prefix),
  );
  if (!atlasPrefix) return null;
  return `/open-flint-atlas${pathname}`;
}

function porchfestPathForFlintAtlasHost(pathname: string): string | null {
  const exactPath = FLINT_ATLAS_PORCHFEST_PATHS.get(pathname);
  if (exactPath) return exactPath;
  if (pathname.startsWith("/porchfest/")) return "/planning";
  if (pathname.startsWith("/porchfest-public/")) return "/";
  return null;
}

function atlasPathForPorchfestHost(pathname: string): string | null {
  if (pathname === "/open-flint-atlas" || pathname === "/open-flint-atlas/") {
    return "/";
  }
  if (!pathname.startsWith("/open-flint-atlas/")) return null;
  return pathname.slice("/open-flint-atlas".length);
}

function canonicalPorchfestPath(pathname: string): string {
  return pathname.startsWith("/porchfest") ? pathname : "/porchfest";
}

function redirectToHost(
  req: NextRequest,
  host: string,
  pathname: string,
): NextResponse {
  const target = new URL(`https://${host}${pathname}`);
  target.search = req.nextUrl.search;
  return NextResponse.redirect(target, 308);
}

function rewritePath(req: NextRequest, pathname: string): NextResponse {
  const target = req.nextUrl.clone();
  target.pathname = pathname;
  return NextResponse.rewrite(target);
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (FLINT_ATLAS_HOSTS.has(host)) {
    const porchfestPath = porchfestPathForFlintAtlasHost(req.nextUrl.pathname);
    if (porchfestPath) {
      return redirectToHost(req, "porchfestflint.com", porchfestPath);
    }

    const targetPath = atlasInternalPath(req.nextUrl.pathname);
    if (targetPath) {
      return rewritePath(req, targetPath);
    }
  }

  if (PORCHFEST_FLINT_HOSTS.has(host)) {
    const atlasPath = atlasPathForPorchfestHost(req.nextUrl.pathname);
    if (atlasPath) {
      return redirectToHost(req, "flint.ourcivicatlas.org", atlasPath);
    }

    if (req.nextUrl.pathname === "/porchfest/workspace") {
      const target = req.nextUrl.clone();
      target.pathname = "/workspace";
      return NextResponse.redirect(target, 308);
    }

    if (req.nextUrl.pathname === "/porchfest/apply") {
      const target = req.nextUrl.clone();
      target.pathname = "/apply";
      return NextResponse.redirect(target, 308);
    }

    const targetPath = PORCHFEST_FLINT_PATHS.get(req.nextUrl.pathname);
    if (!targetPath) {
      return NextResponse.next();
    }
    return rewritePath(req, targetPath);
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
