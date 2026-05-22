/**
 * Sign-out route handler.
 *
 * Browser hits this on user click; the handler forwards the
 * planner's session cookie to the sidecar's `/auth/sign-out`
 * endpoint (which revokes the row from event_planner_sessions and
 * issues a Set-Cookie that clears the cookie on the sidecar origin),
 * then redirects the browser back to the planner page.
 */

import { NextResponse, type NextRequest } from "next/server";

function getSidecarEndpoint(): string {
  return (
    process.env.CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    "http://127.0.0.1:4010"
  );
}

const PLANNER_BASE = "/open-flint-atlas/plan/porchfest-2026";

export async function POST(req: NextRequest) {
  try {
    await fetch(`${getSidecarEndpoint()}/auth/sign-out`, {
      method: "POST",
      headers: {
        // Forward the cookie so the sidecar can identify which
        // session to revoke. Without this, the sidecar would clear
        // the cookie but leave the DB row alive.
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
  } catch {
    // Best-effort: even on network failure we still redirect the
    // user. The cookie is HttpOnly on the sidecar origin and will
    // age out naturally; revoking the row is a server-side cleanup
    // we'll retry on the next sign-out attempt.
  }
  return NextResponse.redirect(new URL(PLANNER_BASE, req.url));
}

export async function GET(req: NextRequest) {
  // Some browsers prefetch link targets; supporting GET keeps the
  // handler resilient when a planner is sent the URL via a chat
  // client that follows links.
  return POST(req);
}
