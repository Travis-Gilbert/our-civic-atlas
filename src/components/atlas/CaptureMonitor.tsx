"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCaptureSources,
  fetchArtifacts,
  fetchCrawlJobStatus,
  previewCrawlPlan,
  enqueueCrawlJob,
  promoteArtifact,
  type CaptureSource,
  type RawArtifact,
  type CrawlJobResponse,
  type CrawlPlanPreview,
} from "@/lib/api/openFlintAtlas";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const DownloadIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M7 2v7" />
    <path d="M4 6.5L7 9.5l3-3" />
    <path d="M2.5 12h9" />
  </svg>
);
const FileIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M4 1.5h4l3 3v8H4z" />
    <path d="M8 1.5v3h3" />
  </svg>
);
const CheckIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
    <path d="M3 7.5l3 3 5-6" />
  </svg>
);
const RefreshIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M2.5 7a4.5 4.5 0 018-2.8" />
    <path d="M11.5 7a4.5 4.5 0 01-8 2.8" />
    <path d="M10 2v2.5h-2.5" />
    <path d="M4 12v-2.5h2.5" />
  </svg>
);
const AlertIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M7 1.5L1.5 12h11z" />
    <path d="M7 6v2.5" />
    <circle cx="7" cy="10" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Tab type                                                           */
/* ------------------------------------------------------------------ */

type Tab = "sources" | "jobs" | "artifacts";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "sources", label: "Sources" },
    { key: "jobs", label: "Jobs" },
    { key: "artifacts", label: "Artifacts" },
  ];

  return (
    <div className="flex gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--ctx-rule-soft)" }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className="px-3 py-1 rounded-[3px] font-mono text-[10px] uppercase tracking-[0.1em] cursor-pointer transition-colors"
          style={{
            color: active === t.key ? "var(--ctx-accent)" : "var(--ctx-ink-mute)",
            background: active === t.key ? "rgba(193,74,44,0.08)" : "transparent",
            border: "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SourceRow({
  source,
  onPreview,
}: {
  source: CaptureSource;
  onPreview: (id: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <FileIcon className="w-[14px] h-[14px] shrink-0 mt-0.5" style={{ color: "var(--ctx-ink-mute)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-tight truncate" style={{ color: "var(--ctx-ink)" }}>
          {source.name}
        </p>
        <p className="font-mono text-[10px] mt-1 truncate" style={{ color: "var(--ctx-ink-mute)" }}>
          {source.id}
        </p>
        {source.seed_urls.length > 0 && (
          <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: "var(--ctx-ink-soft)" }}>
            {source.seed_urls[0]}
            {source.seed_urls.length > 1 ? ` +${source.seed_urls.length - 1}` : ""}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onPreview(source.id)}
        className="shrink-0 px-2 py-1 rounded-[3px] font-mono text-[10px] uppercase tracking-[0.06em] cursor-pointer transition-colors"
        style={{
          color: "var(--ctx-accent)",
          background: "transparent",
          border: "1px solid var(--ctx-accent)",
        }}
      >
        Plan
      </button>
    </div>
  );
}

function PlanPreview({
  plan,
  onEnqueue,
  submitting,
}: {
  plan: CrawlPlanPreview;
  onEnqueue: (freshnessReason: string, rightsNote: string) => void;
  submitting: boolean;
}) {
  const [freshnessReason, setFreshnessReason] = useState(plan.freshness_reason ?? "");
  const [rightsNote, setRightsNote] = useState("");

  const canSubmit = freshnessReason.trim().length > 0 && rightsNote.trim().length > 0 && !submitting;

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--ctx-rule-soft)", background: "rgba(193,74,44,0.03)" }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: "var(--ctx-accent)" }}>
        Crawl Plan Preview
      </p>
      <div className="space-y-1.5 mb-3">
        <Row label="Source" value={plan.source_name} />
        <Row label="Budget" value={`${plan.page_budget} pages`} />
        <Row label="Fetcher" value={plan.fetcher} />
        <Row label="Robots" value={plan.robots_policy} />
        <Row label="Rights" value={plan.public_use_policy} />
      </div>
      <div className="space-y-2 mb-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--ctx-ink-mute)" }}>
            Freshness reason (required)
          </span>
          <input
            type="text"
            value={freshnessReason}
            onChange={(e) => setFreshnessReason(e.target.value)}
            placeholder="Why capture now?"
            className="block w-full mt-1 px-2 py-1.5 rounded-[3px] font-mono text-[11px] bg-transparent outline-none"
            style={{
              color: "var(--ctx-ink)",
              border: "1px solid var(--ctx-rule-soft)",
            }}
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--ctx-ink-mute)" }}>
            Rights note (required)
          </span>
          <input
            type="text"
            value={rightsNote}
            onChange={(e) => setRightsNote(e.target.value)}
            placeholder="Public record, fair use, etc."
            className="block w-full mt-1 px-2 py-1.5 rounded-[3px] font-mono text-[11px] bg-transparent outline-none"
            style={{
              color: "var(--ctx-ink)",
              border: "1px solid var(--ctx-rule-soft)",
            }}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onEnqueue(freshnessReason.trim(), rightsNote.trim())}
        className="px-3 py-1.5 rounded-[3px] font-mono text-[10px] uppercase tracking-[0.06em] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
        style={{
          color: "#fff",
          background: canSubmit ? "var(--ctx-accent)" : "var(--ctx-ink-mute)",
          border: "none",
        }}
      >
        {submitting ? "Submitting..." : "Enqueue Crawl"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] shrink-0" style={{ color: "var(--ctx-ink-mute)", width: 60 }}>
        {label}
      </span>
      <span className="font-mono text-[11px] truncate" style={{ color: "var(--ctx-ink)" }}>
        {value}
      </span>
    </div>
  );
}

function JobRow({ job, onRefresh }: { job: CrawlJobResponse; onRefresh: (id: string) => void }) {
  const statusColor =
    job.status === "completed"
      ? "#4a7a4a"
      : job.status === "running"
        ? "var(--ctx-accent)"
        : job.status === "failed"
          ? "#b44a2d"
          : "var(--ctx-ink-mute)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ background: statusColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] truncate" style={{ color: "var(--ctx-ink)" }}>
          {job.job_id}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--ctx-ink-mute)" }}>
          {job.source_id} · {job.page_budget} pages · {job.status}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRefresh(job.job_id)}
        className="shrink-0 p-1 cursor-pointer"
        style={{ color: "var(--ctx-ink-mute)", background: "none", border: "none" }}
        aria-label="Refresh job status"
      >
        <RefreshIcon className="w-[12px] h-[12px]" />
      </button>
    </div>
  );
}

function ArtifactRow({
  artifact,
  onPromote,
}: {
  artifact: RawArtifact;
  onPromote: (id: string) => void;
}) {
  const isReviewed = artifact.review_metadata !== null;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <FileIcon
        className="w-[13px] h-[13px] shrink-0 mt-0.5"
        style={{ color: isReviewed ? "#4a7a4a" : "var(--ctx-ink-mute)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-tight truncate" style={{ color: "var(--ctx-ink)" }}>
          {artifact.canonical_url}
        </p>
        <p className="font-mono text-[10px] mt-1" style={{ color: "var(--ctx-ink-mute)" }}>
          {artifact.source_id} · {artifact.content_type} · {formatBytes(artifact.byte_size)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[2px]"
            style={{
              color: artifact.candidate_status === "accepted" ? "#4a7a4a" : "var(--ctx-ink-mute)",
              background: artifact.candidate_status === "accepted" ? "rgba(74,122,74,0.1)" : "rgba(128,128,128,0.08)",
            }}
          >
            {artifact.candidate_status}
          </span>
          <span className="font-mono text-[9px]" style={{ color: "var(--ctx-ink-mute)" }}>
            {artifact.privacy_class}
          </span>
        </div>
      </div>
      {!isReviewed && artifact.candidate_status !== "accepted" && (
        <button
          type="button"
          onClick={() => onPromote(artifact.artifact_id)}
          className="shrink-0 p-1 rounded-[3px] cursor-pointer transition-colors"
          style={{
            color: "var(--ctx-accent)",
            background: "transparent",
            border: "1px solid var(--ctx-accent)",
          }}
          aria-label="Promote artifact"
        >
          <CheckIcon className="w-[12px] h-[12px]" />
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  CaptureMonitor                                                     */
/* ------------------------------------------------------------------ */

export type CaptureMonitorProps = {
  visible: boolean;
};

export function CaptureMonitor({ visible }: CaptureMonitorProps) {
  const [tab, setTab] = useState<Tab>("sources");
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [artifacts, setArtifacts] = useState<RawArtifact[]>([]);
  const [jobs, setJobs] = useState<CrawlJobResponse[]>([]);
  const [activePlan, setActivePlan] = useState<CrawlPlanPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchCaptureSources();
    if (res.ok) {
      setSources(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  const loadArtifacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchArtifacts({ limit: 100 });
    if (res.ok) {
      setArtifacts(res.data.artifacts);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (tab === "sources") loadSources();
    if (tab === "artifacts") loadArtifacts();
  }, [visible, tab, loadSources, loadArtifacts]);

  const handlePreview = useCallback(async (sourceId: string) => {
    setError(null);
    const res = await previewCrawlPlan(sourceId);
    if (res.ok) {
      setActivePlan(res.data);
    } else {
      setError(res.error);
    }
  }, []);

  const handleEnqueue = useCallback(
    async (freshnessReason: string, rightsNote: string) => {
      if (!activePlan) return;
      setSubmitting(true);
      setError(null);
      const res = await enqueueCrawlJob(
        activePlan.source_id,
        activePlan.page_budget,
        freshnessReason,
        rightsNote,
      );
      if (res.ok) {
        setJobs((prev) => [res.data, ...prev]);
        setActivePlan(null);
        setTab("jobs");
      } else {
        setError(res.error);
      }
      setSubmitting(false);
    },
    [activePlan],
  );

  const handleRefreshJob = useCallback(async (jobId: string) => {
    const res = await fetchCrawlJobStatus(jobId);
    if (res.ok) {
      setJobs((prev) => prev.map((j) => (j.job_id === jobId ? res.data : j)));
    }
  }, []);

  const handlePromote = useCallback(
    async (artifactId: string) => {
      setError(null);
      const res = await promoteArtifact(artifactId, "candidate_extraction");
      if (res.ok) {
        await loadArtifacts();
      } else {
        setError(res.error);
      }
    },
    [loadArtifacts],
  );

  if (!visible) return null;

  return (
    <div
      className="absolute top-2 right-2 z-20 flex flex-col rounded-[6px] shadow-lg overflow-hidden"
      style={{
        width: 380,
        maxHeight: "calc(100% - 16px)",
        background: "var(--ctx-paper)",
        border: "1px solid var(--ctx-rule-soft)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "var(--ctx-rule-soft)" }}>
        <DownloadIcon className="w-[13px] h-[13px]" style={{ color: "var(--ctx-accent)" }} />
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Capture Monitor
        </span>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "var(--ctx-rule-soft)", background: "rgba(180,74,45,0.06)" }}>
          <AlertIcon className="w-[12px] h-[12px] shrink-0" style={{ color: "#b44a2d" }} />
          <p className="font-mono text-[10px]" style={{ color: "#b44a2d" }}>
            {error}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="font-mono text-[11px]" style={{ color: "var(--ctx-ink-mute)" }}>
              Loading...
            </p>
          </div>
        )}

        {!loading && tab === "sources" && (
          <>
            {activePlan && (
              <PlanPreview
                plan={activePlan}
                onEnqueue={handleEnqueue}
                submitting={submitting}
              />
            )}
            {sources.length === 0 ? (
              <EmptyState message="No capture sources configured" />
            ) : (
              sources.map((s) => (
                <SourceRow key={s.id} source={s} onPreview={handlePreview} />
              ))
            )}
          </>
        )}

        {!loading && tab === "jobs" && (
          <>
            {jobs.length === 0 ? (
              <EmptyState message="No crawl jobs in this session" />
            ) : (
              jobs.map((j) => (
                <JobRow key={j.job_id} job={j} onRefresh={handleRefreshJob} />
              ))
            )}
          </>
        )}

        {!loading && tab === "artifacts" && (
          <>
            {artifacts.length === 0 ? (
              <EmptyState message="No raw artifacts captured" />
            ) : (
              artifacts.map((a) => (
                <ArtifactRow key={a.artifact_id} artifact={a} onPromote={handlePromote} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="font-mono text-[11px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-mute)" }}>
        {message}
      </p>
    </div>
  );
}
