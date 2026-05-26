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
import { useCallback, useEffect, useMemo, useState } from "react";
import { gql } from "urql";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from "lucide-react";

import { getTheseusClient } from "@/lib/api/graphql/client";
import { useResearchArtifactPromotion } from "@/lib/atlas/use-research-artifact-promotion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ResearchSource = {
  id: string;
  name: string;
  sourceType: string;
  trustTier?: string | null;
};

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
  sources?: ResearchSource[];
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

type PromotionRowState =
  | { kind: "promoting" }
  | { kind: "ok"; artifactId: string; artifactKey: string; status: string }
  | {
      kind: "error";
      message: string;
      reason: "schema" | "network" | "graphql";
    };

export type ResearchPromotionContext = {
  parcelRef?: string;
  buildingId?: string;
  buildingPartId?: string;
  anchorKind?: string;
  anchorGeometryWkt?: string;
  anchorTimeStart?: string;
  anchorTimeEnd?: string;
  sourceUseTags?: string[];
  sourceUseNote?: string;
  reviewState?: string;
  anchorPayload?: Record<string, unknown>;
};

type CivicResearchPanelProps = {
  defaultQuery?: string;
  promotionContext?: ResearchPromotionContext | null;
};

function isResearchSource(value: unknown): value is ResearchSource {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sourceType === "string"
  );
}

function hasPromotionAnchor(
  promotionContext: ResearchPromotionContext | null | undefined,
): promotionContext is ResearchPromotionContext {
  return Boolean(
    promotionContext?.parcelRef?.trim() ||
      promotionContext?.buildingId?.trim() ||
      promotionContext?.buildingPartId?.trim() ||
      promotionContext?.anchorGeometryWkt?.trim(),
  );
}

function sourceUseTagsForSource(source: ResearchSource): string[] {
  const haystack = `${source.sourceType} ${source.name}`.toLowerCase();
  if (
    haystack.includes("sanborn") ||
    haystack.includes("map") ||
    haystack.includes("plat")
  ) {
    return ["footprint", "date"];
  }
  if (
    haystack.includes("photo") ||
    haystack.includes("image") ||
    haystack.includes("habs")
  ) {
    return ["facade", "date"];
  }
  if (
    haystack.includes("directory") ||
    haystack.includes("occupant") ||
    haystack.includes("storefront")
  ) {
    return ["ground_floor_use", "date"];
  }
  return ["other"];
}

function mergedSourceUseTags(
  promotionContext: ResearchPromotionContext,
  source: ResearchSource,
): string[] {
  return Array.from(
    new Set([
      ...(promotionContext.sourceUseTags ?? []),
      ...sourceUseTagsForSource(source),
    ]),
  );
}

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
/*  Source row with save-for-reconstruction action                     */
/* ------------------------------------------------------------------ */

function PromoteStatusLine({ state }: { state: PromotionRowState }) {
  if (state.kind === "promoting") {
    return (
      <span
        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        <span>Saving</span>
      </span>
    );
  }
  if (state.kind === "ok") {
    return (
      <span
        className="font-mono text-[10px] uppercase tracking-[0.12em] break-all"
        style={{ color: "var(--ctx-ink-mute)" }}
        title={`artifactId: ${state.artifactId}`}
      >
        Saved to reconstruction record
        {state.status !== "promoted" ? ` (${state.status})` : null}
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em]"
      style={{ color: "var(--ctx-warn, #b45a2d)" }}
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      <span>
        {state.reason === "schema"
          ? "Saving is not available yet"
          : state.reason === "network"
            ? `Network: ${state.message}`
            : `Failed: ${state.message}`}
      </span>
    </span>
  );
}

function SourceRow({
  source,
  runId,
  skill,
  promotionContext,
}: {
  source: ResearchSource;
  runId: string;
  skill: string;
  promotionContext?: ResearchPromotionContext | null;
}) {
  const { promote, state } = useResearchArtifactPromotion();

  const rowState: PromotionRowState | null = useMemo(() => {
    if (state.kind === "idle") return null;
    if (state.kind === "promoting") return { kind: "promoting" };
    if (state.kind === "ok") {
      return {
        kind: "ok",
        artifactId: state.result.artifactId,
        artifactKey: state.result.artifactKey,
        status: state.result.status,
      };
    }
    return {
      kind: "error",
      message: state.message,
      reason: state.reason,
    };
  }, [state]);

  const promoted = rowState?.kind === "ok";
  const promoting = rowState?.kind === "promoting";
  const canPromote = hasPromotionAnchor(promotionContext);
  const buttonDisabled = promoting || promoted || !canPromote;

  const handleClick = useCallback(() => {
    if (!canPromote) return;
    void promote({
      runId,
      sourceId: source.id,
      sourceType: source.sourceType,
      title: source.name,
      parcelRef: promotionContext.parcelRef,
      buildingId: promotionContext.buildingId,
      buildingPartId: promotionContext.buildingPartId,
      anchorKind: promotionContext.anchorKind ?? "research",
      anchorGeometryWkt: promotionContext.anchorGeometryWkt,
      anchorTimeStart: promotionContext.anchorTimeStart,
      anchorTimeEnd: promotionContext.anchorTimeEnd,
      sourceUseTags: mergedSourceUseTags(promotionContext, source),
      sourceUseNote:
        promotionContext.sourceUseNote ??
        "Saved from live research as source-backed reconstruction input.",
      reviewState:
        promotionContext.reviewState ?? "accepted_for_reconstruction",
      payload: {
        civicResearchRunId: runId,
        civicResearchSkill: skill,
        trustTier: source.trustTier ?? null,
      },
      anchorPayload: {
        ...(promotionContext.anchorPayload ?? {}),
        civicResearchRunId: runId,
        civicResearchSkill: skill,
        sourceId: source.id,
      },
    });
  }, [canPromote, promote, promotionContext, runId, skill, source]);

  return (
    <li className="rounded-[12px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] leading-[1.35] m-0"
            style={{ color: "var(--ctx-ink)" }}
          >
            {source.name}
          </p>
          <p
            className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] m-0"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {source.sourceType}
            {source.trustTier ? ` · ${source.trustTier}` : null}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={buttonDisabled}
          className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-[10px] px-2.5 py-1 cursor-pointer transition-colors disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
          style={{
            background:
              promoted || buttonDisabled
                ? "rgba(193,74,44,0.10)"
                : "var(--ctx-accent)",
            color:
              promoted || buttonDisabled
                ? "var(--ctx-ink-mute)"
                : "var(--ctx-paper)",
            border: "1px solid var(--ctx-accent)",
          }}
          aria-label={
            promoted
              ? `Saved ${source.name} for reconstruction`
              : canPromote
                ? `Save ${source.name} for reconstruction`
                : `Select an anchored place before saving ${source.name}`
          }
        >
          {promoted ? (
            <BookmarkCheck className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Bookmark className="h-3 w-3" aria-hidden="true" />
          )}
          <span>{promoted ? "Saved" : canPromote ? "Save" : "Needs place"}</span>
        </button>
      </div>
      {rowState ? (
        <div className="mt-2">
          <PromoteStatusLine state={rowState} />
        </div>
      ) : null}
    </li>
  );
}

function SourcesSection({
  sources,
  runId,
  skill,
  promotionContext,
}: {
  sources: ResearchSource[];
  runId: string;
  skill: string;
  promotionContext?: ResearchPromotionContext | null;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="space-y-2">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.12em] m-0"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Sources · {sources.length}
      </p>
      <ul className="space-y-2 list-none m-0 p-0">
        {sources.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            runId={runId}
            skill={skill}
            promotionContext={promotionContext}
          />
        ))}
      </ul>
    </div>
  );
}

function RawPayloadDetails({ payload }: { payload: CivicResearchPayload }) {
  const pretty = JSON.stringify(payload.results, null, 2);
  const truncated =
    pretty.length > 1400 ? `${pretty.slice(0, 1400)}\n…` : pretty;
  return (
    <details className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.18)] p-3">
      <summary
        className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Run · {payload.runId.slice(0, 8)} · {payload.skill} · raw payload
      </summary>
      <pre
        className="mt-2 font-mono text-[11px] leading-[1.4] whitespace-pre-wrap break-words m-0"
        style={{ color: "var(--ctx-ink)", maxHeight: 220, overflow: "auto" }}
      >
        {truncated}
      </pre>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel (embedded — renders inside AtlasDynamicIsland)               */
/* ------------------------------------------------------------------ */

export function CivicResearchPanel({
  defaultQuery = "",
  promotionContext = null,
}: CivicResearchPanelProps) {
  const [query, setQuery] = useState<string>(defaultQuery);
  const [status, setStatus] = useState<ResearchStatus>({ kind: "idle" });
  const client = useMemo(() => getTheseusClient(), []);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  const sources = useMemo<ResearchSource[]>(() => {
    if (status.kind !== "ok") return [];
    const raw = status.payload.results.sources;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isResearchSource);
  }, [status]);

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

      {status.kind === "ok" ? (
        <>
          <SourcesSection
            sources={sources}
            runId={status.payload.runId}
            skill={status.payload.skill}
            promotionContext={promotionContext}
          />
          <RawPayloadDetails payload={status.payload} />
        </>
      ) : null}

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
