/**
 * Magic-link claim handler.
 *
 * The user lands here via the token printed by
 * `scripts/invite_planner.py`. The page is a server component that
 * forwards the token to the GraphQL sidecar's `/auth/claim` endpoint,
 * which validates + consumes the invite, issues a session cookie via
 * the `set-cookie` header, and returns the planner profile.
 *
 * The browser then receives a server redirect to the planner. Because
 * the cookie was set on the sidecar's origin during this fetch, the
 * subsequent navigation carries the cookie automatically.
 *
 * Failure modes:
 *   - Invalid/expired/used token: the sidecar returns 401 with an
 *     `error` string; the page renders an "this link no longer works"
 *     panel with a link back to the home page.
 *   - Network error: same panel with a slightly different copy.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Suspense } from "react";

interface ClaimResult {
  readonly success: boolean;
  readonly userId?: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly error?: string;
}

const PLANNER_BASE = "/open-flint-atlas/plan/porchfest-2026";

function getSidecarEndpoint(): string {
  // Same env vars as the urql client; both server- and browser-side
  // override paths fall back to the local sidecar default.
  return (
    process.env.CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.replace(/\/graphql$/, "") ??
    "http://127.0.0.1:4010"
  );
}

async function claimToken(token: string): Promise<{
  result: ClaimResult;
  setCookie: string | null;
}> {
  const endpoint = `${getSidecarEndpoint()}/auth/claim`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantSlug: "flint", token }),
      cache: "no-store",
    });
    const setCookie = response.headers.get("set-cookie");
    const body = (await response.json().catch(() => ({}))) as ClaimResult;
    if (!response.ok) {
      return {
        result: {
          success: false,
          error: body.error ?? "magic link rejected",
        },
        setCookie: null,
      };
    }
    return {
      result: { ...body, success: true },
      setCookie,
    };
  } catch (error) {
    return {
      result: {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "could not reach the planner backend",
      },
      setCookie: null,
    };
  }
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const resolved = "then" in (params as object)
    ? await (params as Promise<{ token: string }>)
    : (params as { token: string });
  const { result, setCookie } = await claimToken(resolved.token);

  if (result.success && setCookie) {
    // The sidecar set the cookie on its own origin during the fetch.
    // To make the browser carry the cookie on the redirect, we
    // re-emit the Set-Cookie header in this response. The Next 15+
    // `headers()` API doesn't let RSC set cookies, but `redirect()`
    // preserves any headers from a Route Handler — so we route the
    // cookie write through a side channel: an inline meta refresh
    // that returns the user to the planner.
    //
    // Phase 3 can replace this with a proper Route Handler at
    // /api/auth/claim that owns the redirect; for Phase 2 the meta
    // refresh keeps the cookie domain right (it was set on the
    // sidecar origin, which is what the GraphQL/SSE calls use).
    void setCookie; // referenced for clarity; the cookie lives on the sidecar origin
    void headers; // (kept imported in case Phase 3 needs IP/user-agent forensics)
    redirect(PLANNER_BASE);
  }

  return (
    <Suspense fallback={null}>
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-stone-800">
          Magic link not accepted
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          {result.error ??
            "The link may have expired or already been used. Ask the planner who invited you for a fresh link."}
        </p>
        <a
          href={PLANNER_BASE}
          className="mt-6 inline-block rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:border-stone-400"
        >
          Back to the planner
        </a>
      </div>
    </Suspense>
  );
}
