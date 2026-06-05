/**
 * Planner sign-out bridge.
 *
 * Axum owns the planner session cookie, so the browser must visit the backend
 * sign-out endpoint for the cookie clear + session revoke to apply.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveServerGraphqlEndpoint } from "@/lib/api/graphql/endpoints";

const PLANNER_BASE = "/open-flint-atlas/plan/porchfest-2026";

function getPlannerBackendEndpoint(): string {
  return resolveServerGraphqlEndpoint().replace(/\/graphql$/, "");
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
