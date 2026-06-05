/**
 * Magic-link claim bridge.
 *
 * The planner backend owns the HttpOnly session cookie because the browser
 * GraphQL client posts to that Axum origin with credentials. This route only
 * preserves the friendly frontend magic-link URL, then sends the browser to
 * Axum so the cookie is set on the correct origin.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

const PLANNER_BASE = "/open-flint-atlas/plan/porchfest-2026";

function getPlannerBackendEndpoint(): string {
  return (
    process.env.CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    "http://127.0.0.1:4001"
  );
}

async function currentOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const hostHeader =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const host = hostHeader?.split(",")[0]?.trim();

  if (host) {
    const proto =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      "http";
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const resolved =
    "then" in (params as object)
      ? await (params as Promise<{ token: string }>)
      : (params as { token: string });

  const claimUrl = new URL(`${getPlannerBackendEndpoint()}/auth/claim`);
  claimUrl.searchParams.set("tenantSlug", "flint");
  claimUrl.searchParams.set("token", resolved.token);
  claimUrl.searchParams.set("returnTo", `${await currentOrigin()}${PLANNER_BASE}`);

  redirect(claimUrl.toString());
}
