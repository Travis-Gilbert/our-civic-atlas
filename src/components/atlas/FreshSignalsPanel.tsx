"use client";

import { Tag } from "antd";
import type { AtlasSource, FreshSignal } from "@/lib/api/openFlintAtlas";

function relativeTime(iso: string | null): string {
  if (!iso) return "time unknown";

  const deltaMs = Date.now() - new Date(iso).getTime();
  if (deltaMs < 60_000) return "just now";

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatStamp(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString();
}

const REVIEW_TAG: Record<string, string> = {
  accepted: "green",
  candidate: "gold",
  needs_review: "gold",
  reviewable_proposal: "gold",
  needs_more_evidence: "orange",
  rejected: "red",
};

const CONFIDENCE_TAG: Record<string, string> = {
  reviewed: "green",
  high: "blue",
  moderate: "gold",
  medium: "gold",
  low: "default",
};

type FreshSignalsPanelProps = {
  signals: FreshSignal[];
  sources: AtlasSource[];
  selectedSignalId: string | null;
  onSignalSelect: (signalId: string) => void;
  onPlaceJump: (placeId: string) => void;
  includeCandidates: boolean;
  onIncludeCandidatesChange: (value: boolean) => void;
};

export function FreshSignalsPanel({
  signals,
  sources,
  selectedSignalId,
  onSignalSelect,
  onPlaceJump,
  includeCandidates,
  onIncludeCandidatesChange,
}: FreshSignalsPanelProps) {
  const selected =
    signals.find((signal) => signal.signal_id === selectedSignalId) ??
    signals[0] ??
    null;
  const selectedSource = selected?.source_id
    ? sources.find((source) => source.source_id === selected.source_id) ?? null
    : null;
  const selectedPlaceHref = selected?.place_id
    ? `/open-flint-atlas/place/${encodeURIComponent(selected.place_id)}`
    : null;
  const signalJsonHref = selected
    ? `/api/v2/theseus/open-flint-atlas/signals/${encodeURIComponent(selected.signal_id)}/`
    : null;

  return (
    <section className="control-dossier-card w-full px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            Fresh Signals
          </p>
          <h2
            className="m-0 text-[16px] font-medium leading-[1.25]"
            style={{ color: "var(--ctx-ink)" }}
          >
            Source-labeled updates for the public atlas surface.
          </h2>
        </div>
        <div
          className="rounded-full px-2.5 py-1 font-mono text-[11px]"
          style={{
            color: "var(--ctx-ink)",
            background: "rgba(31, 31, 35, 0.06)",
          }}
        >
          {signals.length}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-[12px] leading-[1.4]">
        <input
          type="checkbox"
          checked={includeCandidates}
          onChange={(event) => onIncludeCandidatesChange(event.target.checked)}
        />
        <span style={{ color: "var(--ctx-ink-soft)" }}>
          Show candidate signals behind the advanced toggle
        </span>
      </label>

      <div className="mt-4 grid max-h-[220px] gap-2 overflow-y-auto pr-1">
        {signals.length > 0 ? (
          signals.map((signal) => {
            const active = signal.signal_id === selected?.signal_id;
            return (
              <button
                key={signal.signal_id}
                type="button"
                onClick={() => onSignalSelect(signal.signal_id)}
                className="rounded-[5px] px-3 py-3 text-left transition-colors"
                style={{
                  border: active
                    ? "1.5px solid var(--ctx-accent)"
                    : "1px solid var(--ctx-rule-soft)",
                  background: active
                    ? "rgba(58, 79, 92, 0.08)"
                    : "rgba(255, 255, 255, 0.34)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className="m-0 text-[13px] font-medium leading-[1.4]"
                      style={{ color: "var(--ctx-ink)" }}
                    >
                      {signal.title}
                    </p>
                    <p
                      className="m-0 mt-1 text-[11px] leading-[1.45]"
                      style={{ color: "var(--ctx-ink-soft)" }}
                    >
                      {signal.source_label} · {relativeTime(signal.received_at)}
                    </p>
                  </div>
                  <Tag color={REVIEW_TAG[signal.review_status] ?? "default"}>
                    {signal.review_status.replaceAll("_", " ")}
                  </Tag>
                </div>
              </button>
            );
          })
        ) : (
          <div
            className="rounded-[5px] px-3 py-3 text-[12px] leading-[1.5]"
            style={{
              color: "var(--ctx-ink-soft)",
              border: "1px dashed var(--ctx-rule-soft)",
              background: "rgba(255, 255, 255, 0.28)",
            }}
          >
            No signals matched the current public/candidate filter.
          </div>
        )}
      </div>

      {selected && (
        <div
          className="mt-4 rounded-[6px] px-3.5 py-3.5"
          style={{
            background: "rgba(255, 255, 255, 0.34)",
            border: "1px solid var(--ctx-rule-soft)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="m-0 text-[15px] font-medium leading-[1.35]"
                style={{ color: "var(--ctx-ink)" }}
              >
                {selected.title}
              </p>
              <p
                className="m-0 mt-1 text-[12px] leading-[1.5]"
                style={{ color: "var(--ctx-ink-soft)" }}
              >
                {selected.summary}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Tag color={REVIEW_TAG[selected.review_status] ?? "default"}>
              {selected.review_status.replaceAll("_", " ")}
            </Tag>
            <Tag color={CONFIDENCE_TAG[selected.confidence_label] ?? "default"}>
              {selected.confidence_label}
            </Tag>
            <Tag>{selected.resolution_level.replaceAll("_", " ")}</Tag>
          </div>

          <div className="mt-3 grid gap-2 text-[12px] leading-[1.5]">
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>Published:</strong>{" "}
              {formatStamp(selected.published_at)}
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>Received:</strong>{" "}
              {formatStamp(selected.received_at)}
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>
                Mapped here because:
              </strong>{" "}
              {selected.why_mapped_here || "Current fixture payload did not include a placement note."}
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>
                Related place:
              </strong>{" "}
              {selected.place_label ?? "Flint citywide"}
            </p>
            {selected.warning_copy && (
              <p
                className="m-0 rounded-[5px] px-2.5 py-2"
                style={{
                  color: "var(--ctx-ink)",
                  background: "rgba(192, 138, 58, 0.12)",
                }}
              >
                {selected.warning_copy}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selected.place_id && (
              <button
                type="button"
                onClick={() => onPlaceJump(selected.place_id as string)}
                className="cursor-pointer rounded-[4px] px-3 py-2 text-[12px]"
                style={{
                  border: "1px solid var(--ctx-rule)",
                  background: "transparent",
                  color: "var(--ctx-ink)",
                }}
              >
                Pin place on map
              </button>
            )}
            {selectedPlaceHref && (
              <a
                href={selectedPlaceHref}
                className="rounded-[4px] px-3 py-2 text-[12px] no-underline"
                style={{
                  border: "1px solid var(--ctx-rule)",
                  color: "var(--ctx-ink)",
                }}
              >
                Open place dossier
              </a>
            )}
            {signalJsonHref && (
              <a
                href={signalJsonHref}
                className="rounded-[4px] px-3 py-2 text-[12px] no-underline"
                style={{
                  border: "1px solid var(--ctx-rule)",
                  color: "var(--ctx-ink)",
                }}
              >
                Open signal JSON
              </a>
            )}
            {selectedSource?.homepage_url && (
              <a
                href={selectedSource.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[4px] px-3 py-2 text-[12px] no-underline"
                style={{
                  border: "1px solid var(--ctx-rule)",
                  color: "var(--ctx-ink)",
                }}
              >
                Visit source
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
