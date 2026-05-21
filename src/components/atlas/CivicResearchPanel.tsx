"use client";

/**
 * CivicResearchPanel
 *
 * Atlas chrome surface that exposes Theseus's gap-driven fractal-expansion
 * algorithm to the user. A textarea collects a research query; submit
 * POSTs to /api/v2/theseus/civic-research which proxies to the harness.
 *
 * Per the 2026-05-21 visual iteration session, this is the highest-benefit
 * design layer: real algorithm output populates the atlas so the designer
 * (and the visitor) can judge the structure the algorithm produces. No
 * mock data, no fake UI — when THESEUS_API_TOKEN is unset, the surface
 * displays the honest 503 "not configured" message returned by the route.
 *
 * Visual vocabulary follows the existing LayerControls + Year card cards:
 * rounded corners, paper background tint, uppercase mono section label.
 * Result rendering is a minimal preview (run id + result count + json
 * peek); injection into the live map state is a follow-on iteration.
 */
import { useCallback, useState } from "react";

type ResearchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; configured: boolean }
  | { kind: "ok"; runId: string; result: Record<string, unknown> };

type CivicResearchResponse = {
  run_id?: string;
  skill?: string;
  search?: Record<string, unknown>;
  error?: string;
  detail?: string;
  configured?: boolean;
};

const RESEARCH_ENDPOINT = "/api/v2/theseus/civic-research";

function statusLine(status: ResearchStatus): string {
  switch (status.kind) {
    case "idle":
      return "Ask the algorithm.";
    case "loading":
      return "Running fractal expansion…";
    case "error":
      return status.configured
        ? `Run failed: ${status.message}`
        : "Theseus is not configured for this deployment.";
    case "ok":
      return `Returned run ${status.runId.slice(0, 8)}.`;
  }
}

function ResultPreview({
  runId,
  result,
}: {
  runId: string;
  result: Record<string, unknown>;
}) {
  const pretty = JSON.stringify(result, null, 2);
  const truncated =
    pretty.length > 1400 ? `${pretty.slice(0, 1400)}\n…` : pretty;
  return (
    <div
      className="mt-2 rounded-[5px] px-2 py-2 overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.50)",
        border: "1px solid var(--ctx-rule-soft)",
      }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Run · {runId}
      </div>
      <pre
        className="font-mono text-[11px] leading-[1.4] whitespace-pre-wrap break-words m-0"
        style={{ color: "var(--ctx-ink)", maxHeight: 220, overflow: "auto" }}
      >
        {truncated}
      </pre>
    </div>
  );
}

export function CivicResearchPanel() {
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<ResearchStatus>({ kind: "idle" });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length === 0) return;
      setStatus({ kind: "loading" });
      try {
        const response = await fetch(RESEARCH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });
        const payload = (await response.json()) as CivicResearchResponse;
        if (!response.ok) {
          setStatus({
            kind: "error",
            message: payload.error ?? `HTTP ${response.status}`,
            configured: payload.configured ?? false,
          });
          return;
        }
        if (!payload.run_id || !payload.search) {
          setStatus({
            kind: "error",
            message: "Theseus returned an unexpected shape.",
            configured: payload.configured ?? true,
          });
          return;
        }
        setStatus({
          kind: "ok",
          runId: payload.run_id,
          result: payload.search,
        });
      } catch (cause) {
        setStatus({
          kind: "error",
          message: cause instanceof Error ? cause.message : String(cause),
          configured: true,
        });
      }
    },
    [query],
  );

  const isLoading = status.kind === "loading";

  return (
    <div
      data-civic-research-panel="true"
      className="rounded-[6px] px-3 py-3 flex flex-col gap-2 pointer-events-auto"
      style={{
        width: 260,
        background: "rgba(248, 244, 234, 0.85)",
        border: "1px solid var(--ctx-rule-soft)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Research
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.10em]"
          style={{
            color:
              status.kind === "error"
                ? "var(--ctx-accent)"
                : "var(--ctx-ink-mute)",
          }}
        >
          {status.kind === "loading"
            ? "running"
            : status.kind === "error"
              ? "error"
              : status.kind === "ok"
                ? "ok"
                : "idle"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Research a place, person, era, or claim in Flint history."
          rows={3}
          maxLength={2000}
          className="rounded-[4px] px-2 py-2 text-[13px] leading-[1.35] resize-y"
          style={{
            background: "rgba(255, 255, 255, 0.72)",
            border: "1px solid var(--ctx-rule-soft)",
            color: "var(--ctx-ink)",
            outline: "none",
            minHeight: 64,
            fontFamily: "inherit",
          }}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {statusLine(status)}
          </span>
          <button
            type="submit"
            disabled={isLoading || query.trim().length === 0}
            className="font-mono text-[11px] uppercase tracking-[0.12em] rounded-[3px] px-3 py-1.5 cursor-pointer transition-colors disabled:cursor-not-allowed"
            style={{
              background:
                isLoading || query.trim().length === 0
                  ? "rgba(193,74,44,0.10)"
                  : "var(--ctx-accent)",
              color:
                isLoading || query.trim().length === 0
                  ? "var(--ctx-ink-mute)"
                  : "var(--ctx-bg)",
              border: "1px solid var(--ctx-accent)",
            }}
          >
            {isLoading ? "Searching" : "Run"}
          </button>
        </div>
      </form>

      {status.kind === "ok" ? (
        <ResultPreview runId={status.runId} result={status.result} />
      ) : null}

      {status.kind === "error" && !status.configured ? (
        <div
          className="rounded-[5px] px-2 py-2 text-[12px] leading-[1.4]"
          style={{
            background: "rgba(255, 255, 255, 0.40)",
            border: "1px dashed var(--ctx-rule-soft)",
            color: "var(--ctx-ink-mute)",
          }}
        >
          Set <code className="font-mono text-[11px]">THESEUS_API_TOKEN</code>{" "}
          to enable the gap-driven research path. Until then this surface
          stays inert and reports an honest empty state.
        </div>
      ) : null}
    </div>
  );
}
