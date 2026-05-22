"use client";

/**
 * CivicResearchPanel
 *
 * Atlas dynamic-island tab that exposes Theseus's gap-driven
 * fractal-expansion algorithm to the user.
 *
 * Wiring contract:
 *   panel  -> urql mutation  -> civic atlas GraphQL endpoint
 *          -> (resolver runs in `our-civic-atlas-backend`)
 *          -> gRPC bridge   -> Theseus harness fractal-expansion
 *
 * The frontend talks GraphQL only. Harness credentials live server-side
 * (Axum middleware, TenantContext-scoped) so this panel ships no token.
 * Until the backend resolver lands, the upstream GraphQL endpoint returns
 * a schema error (`Cannot query field "civicResearch" on type "Mutation"`),
 * which this panel surfaces as an honest "backend not implemented yet"
 * state per the project's no-fake-UI rule.
 *
 * Visual placement: this panel is consumed only by AtlasDynamicIsland as
 * the "research" tab. It does not render its own outer card; the island
 * already owns the chrome. Sub-cards follow the island's existing
 * conventions (rounded-[14px] cards with rgba paper backgrounds).
 *
 * State preservation: query + status are owned by this component. When
 * the user switches tabs mid-run, React unmounts the component and the
 * in-flight call is dropped. If state-preservation across tabs becomes
 * important, lift state to AtlasDynamicIsland or wrap with `hidden`
 * instead of conditional rendering.
 *
 * See also:
 *   docs/plans/lane-4-strategic-seams/civic-research-graphql-coordination.md
 *   docs/design/flint-graphql-schema-v1.graphql (Mutation.civicResearch)
 *   src/lib/api/graphql/queries/civic-research.graphql
 */
import { useCallback, useMemo, useState } from "react";
import { gql } from "urql";

import { getTheseusClient } from "@/lib/api/graphql/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SearchResultsPayload = {
  query?: string;
  totalResultCount?: number;
  reranked?: boolean;
  acceptedConfidenceFloor?: number;
  inferredTimeRange?: { start?: string; end?: string; label?: string } | null;
  places?: unknown[];
  signals?: unknown[];
  events?: unknown[];
  historicalReconstructions?: unknown[];
  sources?: unknown[];
};

type CivicResearchPayload = {
  runId: string;
  skill: string;
  results: SearchResultsPayload;
};

type CivicResearchMutationData = {
  civicResearch: CivicResearchPayload;
};

type ResearchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; reason: "schema" | "network" | "graphql" }
  | { kind: "ok"; payload: CivicResearchPayload };

/* ------------------------------------------------------------------ */
/*  GraphQL document                                                   */
/* ------------------------------------------------------------------ */

/**
 * Document mirrors `src/lib/api/graphql/queries/civic-research.graphql`. We
 * keep the document inline so this panel does not depend on codegen output;
 * codegen will pick the operation up from the `.graphql` file when it next
 * runs, and the inline string remains a valid `DocumentNode` either way.
 */
const CIVIC_RESEARCH_MUTATION = gql`
  mutation CivicResearch(
    $query: String!
    $budget: JSON
    $scope: JSON
    $sessionId: String
    $folioId: String
  ) {
    civicResearch(
      input: {
        query: $query
        budget: $budget
        scope: $scope
        sessionId: $sessionId
        folioId: $folioId
      }
    ) {
      runId
      skill
      results {
        query
        totalResultCount
        reranked
        acceptedConfidenceFloor
        inferredTimeRange {
          start
          end
          label
        }
        places {
          id
          name
          placeType
          centroid
          confidence
          temporalStatus
        }
        signals {
          id
          signalKind
          title
          summary
          publishedAt
          relativeTimeLabel
          confidence
          place {
            id
            name
          }
        }
        events {
          id
          title
          summary
          occurredAt
          confidence
          place {
            id
            name
          }
        }
        historicalReconstructions {
          id
          name
          description
          position
          confidence
          timeStart
          timeEnd
        }
        sources {
          id
          name
          sourceType
          trustTier
        }
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Schema-shape error: Theseus / sidecar GraphQL doesn't yet implement the
 * civicResearch mutation. We recognize this so the panel can render the
 * coordination-aware empty state instead of a generic "graphql error" line.
 */
function looksLikeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cannot query field") ||
    lower.includes('unknown field "civicresearch"') ||
    lower.includes("unknown argument") ||
    lower.includes("unknown type") ||
    lower.includes("undefined field")
  );
}

function summarizeResults(results: SearchResultsPayload): string {
  const parts: string[] = [];
  const sections = [
    ["place", results.places],
    ["event", results.events],
    ["signal", results.signals],
    ["reconstruction", results.historicalReconstructions],
    ["source", results.sources],
  ] as const;
  for (const [label, arr] of sections) {
    const count = Array.isArray(arr) ? arr.length : 0;
    if (count > 0) parts.push(`${count} ${label}${count === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return "no evidence returned";
  return parts.join(" · ");
}

function statusLine(status: ResearchStatus): string | null {
  switch (status.kind) {
    case "idle":
      // No idle copy. The textarea placeholder is the call to action; an
      // extra sub-label beneath it added visual noise without useful context.
      return null;
    case "loading":
      return "Running fractal expansion…";
    case "error":
      if (status.reason === "schema") {
        return "Backend resolver pending. Run will work once the GraphQL contract lands.";
      }
      if (status.reason === "network") {
        return `Network error: ${status.message}`;
      }
      return `Run failed: ${status.message}`;
    case "ok":
      return `Run ${status.payload.runId.slice(0, 8)} · ${summarizeResults(
        status.payload.results,
      )}.`;
  }
}

/* ------------------------------------------------------------------ */
/*  Result preview (island-styled card)                                */
/* ------------------------------------------------------------------ */

function ResultPreview({ payload }: { payload: CivicResearchPayload }) {
  const pretty = JSON.stringify(payload.results, null, 2);
  const truncated =
    pretty.length > 1400 ? `${pretty.slice(0, 1400)}\n…` : pretty;
  return (
    <div className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
        Run · {payload.runId} · {payload.skill}
      </p>
      <pre
        className="mt-2 font-mono text-[11px] leading-[1.4] whitespace-pre-wrap break-words m-0"
        style={{ color: "var(--ctx-ink)", maxHeight: 220, overflow: "auto" }}
      >
        {truncated}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel (embedded — renders inside AtlasDynamicIsland)               */
/* ------------------------------------------------------------------ */

export function CivicResearchPanel() {
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<ResearchStatus>({ kind: "idle" });
  const client = useMemo(() => getTheseusClient(), []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length === 0) return;
      setStatus({ kind: "loading" });

      try {
        const result = await client
          .mutation<CivicResearchMutationData>(CIVIC_RESEARCH_MUTATION, {
            query: trimmed,
          })
          .toPromise();

        if (result.error) {
          const networkError = result.error.networkError;
          if (networkError) {
            setStatus({
              kind: "error",
              message: networkError.message,
              reason: "network",
            });
            return;
          }
          const first = result.error.graphQLErrors[0]?.message ?? "GraphQL error";
          setStatus({
            kind: "error",
            message: first,
            reason: looksLikeSchemaError(first) ? "schema" : "graphql",
          });
          return;
        }

        if (!result.data?.civicResearch) {
          setStatus({
            kind: "error",
            message:
              "GraphQL response missing civicResearch payload. Verify the backend resolver shape.",
            reason: "graphql",
          });
          return;
        }

        setStatus({ kind: "ok", payload: result.data.civicResearch });
      } catch (cause) {
        setStatus({
          kind: "error",
          message: cause instanceof Error ? cause.message : String(cause),
          reason: "network",
        });
      }
    },
    [client, query],
  );

  const isLoading = status.kind === "loading";
  const showCoordinationHint =
    status.kind === "error" && status.reason === "schema";

  return (
    <section
      className="space-y-3"
      data-civic-research-panel="true"
    >
      <div className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about a place, person, era, or claim in Flint..."
            rows={3}
            maxLength={2000}
            className="rounded-[10px] px-2 py-2 text-[13px] leading-[1.35] resize-y"
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              border: "1px solid rgba(42,36,25,0.08)",
              color: "var(--ctx-ink)",
              outline: "none",
              minHeight: 72,
              fontFamily: "inherit",
            }}
            disabled={isLoading}
          />
          <div className="flex items-center justify-between gap-2">
            {statusLine(status) ? (
              <span
                className="text-[11px] leading-[1.4]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                {statusLine(status)}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <button
              type="submit"
              disabled={isLoading || query.trim().length === 0}
              className="font-mono text-[11px] uppercase tracking-[0.12em] rounded-[10px] px-3 py-1.5 cursor-pointer transition-colors disabled:cursor-not-allowed"
              style={{
                background:
                  isLoading || query.trim().length === 0
                    ? "rgba(193,74,44,0.10)"
                    : "var(--ctx-accent)",
                color:
                  isLoading || query.trim().length === 0
                    ? "var(--ctx-ink-mute)"
                    : "var(--ctx-paper)",
                border: "1px solid var(--ctx-accent)",
              }}
            >
              {isLoading ? "Searching" : "Run"}
            </button>
          </div>
        </form>
      </div>

      {status.kind === "ok" ? <ResultPreview payload={status.payload} /> : null}

      {showCoordinationHint ? (
        <div
          className="rounded-[14px] border border-dashed border-[rgba(42,36,25,0.16)] bg-[rgba(255,255,255,0.18)] p-3 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]"
        >
          GraphQL endpoint does not yet implement{" "}
          <code className="font-mono text-[11px]">Mutation.civicResearch</code>
          . The frontend contract is in place; the Axum resolver and Theseus
          gRPC bridge are coordinated in{" "}
          <code className="font-mono text-[11px]">
            docs/plans/lane-4-strategic-seams/civic-research-graphql-coordination.md
          </code>
          .
        </div>
      ) : null}
    </section>
  );
}
