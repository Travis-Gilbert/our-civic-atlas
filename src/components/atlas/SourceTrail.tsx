"use client";

import { Tag } from "antd";
import type { AtlasSource } from "@/lib/api/openFlintAtlas";

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Trust tier colors                                                  */
/* ------------------------------------------------------------------ */

const TRUST_DOT_COLOR: Record<string, string> = {
  official: "#52c41a",
  community: "#faad14",
  automated: "#8c8c8c",
};

const TRUST_TAG_COLOR: Record<string, string> = {
  official: "green",
  community: "gold",
  automated: "default",
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const LinkIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M6 8a3 3 0 004 .5l1.5-1.5a3 3 0 00-4.25-4.25L6 4" />
    <path d="M8 6a3 3 0 00-4-.5L2.5 7a3 3 0 004.25 4.25L8 10" />
  </svg>
);

const WarningIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M7 1.5L1 12.5h12L7 1.5z" />
    <path d="M7 6v3" />
    <circle cx="7" cy="11" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  SourceTrail                                                        */
/* ------------------------------------------------------------------ */

export type SourceTrailProps = {
  sources: AtlasSource[];
  selectedSourceId: string | null;
  onSourceSelect: (id: string) => void;
};

export function SourceTrail({
  sources,
  selectedSourceId,
  onSourceSelect,
}: SourceTrailProps) {
  if (sources.length === 0) {
    return (
      <div className="px-5 py-6">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Source Trail
        </p>
        <p
          className="text-[13px] leading-[1.55]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          No sources available for the current view.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Source Trail
      </p>

      <div className="flex flex-col gap-2">
        {sources.map((source) => {
          const isSelected = source.source_id === selectedSourceId;
          const dotColor = TRUST_DOT_COLOR[source.trust_tier] ?? "#8c8c8c";

          return (
            <div
              key={source.source_id}
              role="button"
              tabIndex={0}
              onClick={() => onSourceSelect(source.source_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSourceSelect(source.source_id);
                }
              }}
              className="rounded-[4px] px-3.5 py-3 cursor-pointer transition-colors"
              style={{
                background: "var(--ctx-paper)",
                border: isSelected
                  ? "1.5px solid var(--ctx-accent)"
                  : "1px solid var(--ctx-rule-soft)",
              }}
            >
              {/* Name row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: dotColor }}
                />
                <span
                  className="text-[13px] leading-[1.4] font-medium truncate"
                  style={{ color: "var(--ctx-ink)" }}
                >
                  {source.name}
                </span>

                {source.homepage_url && (
                  <a
                    href={source.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Visit ${source.name} homepage`}
                    className="shrink-0"
                    style={{ color: "var(--ctx-ink-mute)" }}
                  >
                    <LinkIcon className="w-[12px] h-[12px]" />
                  </a>
                )}

                {source.contains_personal_data && (
                  <span
                    className="shrink-0"
                    title="Contains personal data"
                    style={{ color: "#faad14" }}
                  >
                    <WarningIcon className="w-[12px] h-[12px]" />
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3">
                <Tag color={TRUST_TAG_COLOR[source.trust_tier] ?? "default"}>
                  {source.trust_tier}
                </Tag>
                <span
                  className="font-mono text-[10px] tracking-[0.06em]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  {relativeDate(source.last_checked)}
                </span>
              </div>

              {/* Known limits */}
              {source.known_limits.length > 0 && (
                <p
                  className="mt-2 text-[11px] leading-[1.5]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  {source.known_limits.join(". ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
