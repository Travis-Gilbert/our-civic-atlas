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

export async function POST(req: NextRequest) {
  const signOutUrl = new URL(`${getPlannerBackendEndpoint()}/auth/sign-out`);
  signOutUrl.searchParams.set("returnTo", new URL(PLANNER_BASE, req.url).toString());

  return NextResponse.redirect(signOutUrl);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
