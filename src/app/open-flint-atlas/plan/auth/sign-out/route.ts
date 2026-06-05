/**
 * Planner sign-out bridge.
 *
 * Axum owns the planner session cookie, so the browser must visit the backend
 * sign-out endpoint for the cookie clear + session revoke to apply.
 */

import { NextResponse, type NextRequest } from "next/server";

const PLANNER_BASE = "/open-flint-atlas/plan/porchfest-2026";

function getPlannerBackendEndpoint(): string {
  return (
    process.env.CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    "http://127.0.0.1:4001"
  );
}

function currentOrigin(req: NextRequest): string {
  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim();

  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  const signOutUrl = new URL(`${getPlannerBackendEndpoint()}/auth/sign-out`);
  signOutUrl.searchParams.set("returnTo", `${currentOrigin(req)}${PLANNER_BASE}`);

  return NextResponse.redirect(signOutUrl);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
