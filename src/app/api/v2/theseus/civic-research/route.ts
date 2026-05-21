/**
 * Civic Atlas research tool: proxy route to the Theseus harness
 * fractal-expansion algorithm.
 *
 * Intent:
 *   Per the 2026-05-21 visual iteration session, the highest-benefit
 *   design layer is wiring the gap-driven fractal-expansion algorithm so
 *   a designer or visitor can type a research query, watch Theseus crawl
 *   the web for historic information, and see the result populate the
 *   civic atlas. Procedural reconstruction consumes the same evidence
 *   downstream; the atlas surfaces the structure.
 *
 * Architecture:
 *   Frontend (this Next.js app) -> POST /api/v2/theseus/civic-research
 *                                -> route handler (this file)
 *                                -> Theseus harness REST
 *                                   1. POST /api/v2/theseus/harness/runs
 *                                      to open a new harness run.
 *                                   2. POST /api/v2/theseus/harness/runs
 *                                            /{run_id}/fractal-expansion
 *                                      with the user query.
 *
 * Auth:
 *   Theseus harness routes require an authenticated account. We pass an
 *   API token via the THESEUS_API_TOKEN env var as a bearer header. If
 *   THESEUS_API_BASE is unset the client falls back to the public
 *   Railway URL (same default as theseusClient.ts). If THESEUS_API_TOKEN
 *   is unset we return 503 with an explicit configuration message; we
 *   do NOT fall back to fixture data because (a) the value of this
 *   endpoint is real algorithm output, fake research results would
 *   defeat the purpose, and (b) project policy forbids fake UI on
 *   shipped surfaces.
 *
 * Future:
 *   The civic-atlas-backend Rust service should expose this same surface
 *   via gRPC so the frontend can authenticate once with TenantContext and
 *   delegate to Theseus server-to-server. XRL items for that move will
 *   land separately. This Next.js route is the in-frontend smoke wiring
 *   for the design-iteration loop.
 */

import { NextResponse } from "next/server";

type SearchScope = Record<string, unknown>;

type CivicResearchRequest = {
  query: string;
  budget?: Record<string, unknown>;
  scope?: SearchScope;
  session_id?: string;
  folio_id?: string;
};

type HarnessBeginRunResponse = {
  run: { run_id: string };
};

type HarnessFractalExpansionResponse = {
  skill: string;
  search: Record<string, unknown>;
};

const DEFAULT_THESEUS_BASE =
  "https://index-api-production-a5f7.up.railway.app";

function getBaseUrl(): string {
  return process.env.THESEUS_API_BASE ?? DEFAULT_THESEUS_BASE;
}

function getAuthToken(): string | null {
  const token = process.env.THESEUS_API_TOKEN;
  if (!token || token.trim().length === 0) return null;
  return token.trim();
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function harnessBeginRun(
  baseUrl: string,
  token: string,
  scope: SearchScope,
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v2/theseus/harness/runs/`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    cache: "no-store",
    body: JSON.stringify({
      task: "civic-atlas-research",
      actor: "civic-atlas-frontend",
      scope,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Theseus harness/runs returned ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await res.json()) as HarnessBeginRunResponse;
  if (!payload?.run?.run_id) {
    throw new Error("Theseus harness/runs response missing run.run_id.");
  }
  return payload.run.run_id;
}

async function harnessFractalExpansion(
  baseUrl: string,
  token: string,
  runId: string,
  body: CivicResearchRequest,
): Promise<HarnessFractalExpansionResponse> {
  const res = await fetch(
    `${baseUrl}/api/v2/theseus/harness/runs/${encodeURIComponent(runId)}/fractal-expansion/`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      cache: "no-store",
      body: JSON.stringify({
        query: body.query,
        budget: body.budget ?? {},
        scope: body.scope ?? {},
        session_id: body.session_id,
        folio_id: body.folio_id,
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Theseus fractal-expansion returned ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  return (await res.json()) as HarnessFractalExpansionResponse;
}

function validateBody(raw: unknown): CivicResearchRequest | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Body must be a JSON object." };
  }
  const candidate = raw as Record<string, unknown>;
  const query = candidate.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return { error: "Field `query` is required and must be a non-empty string." };
  }
  if (query.length > 2000) {
    return { error: "Field `query` is capped at 2000 characters." };
  }
  return {
    query: query.trim(),
    budget: (candidate.budget as Record<string, unknown> | undefined) ?? undefined,
    scope: (candidate.scope as SearchScope | undefined) ?? undefined,
    session_id:
      typeof candidate.session_id === "string" ? candidate.session_id : undefined,
    folio_id:
      typeof candidate.folio_id === "string" ? candidate.folio_id : undefined,
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (cause) {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
        detail: cause instanceof Error ? cause.message : String(cause),
      },
      { status: 400 },
    );
  }

  const validated = validateBody(rawBody);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const token = getAuthToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Theseus research is not configured for this deployment. Set the THESEUS_API_TOKEN env var to a bearer token authorized for the Theseus harness surface.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const baseUrl = getBaseUrl().replace(/\/+$/, "");

  try {
    const runId = await harnessBeginRun(baseUrl, token, validated.scope ?? {});
    const expansion = await harnessFractalExpansion(
      baseUrl,
      token,
      runId,
      validated,
    );
    return NextResponse.json({
      run_id: runId,
      skill: expansion.skill,
      search: expansion.search,
      configured: true,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json(
      {
        error:
          "Theseus harness call failed. See server logs for details.",
        detail: message,
        configured: true,
      },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      surface: "civic-research",
      method: "POST",
      body: {
        query: "string (required, max 2000 chars)",
        budget: "object (optional)",
        scope: "object (optional)",
        session_id: "string (optional)",
        folio_id: "string (optional)",
      },
      configured: !!getAuthToken(),
      upstream: getBaseUrl(),
    },
    { status: 200 },
  );
}
