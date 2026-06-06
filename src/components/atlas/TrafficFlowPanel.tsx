"use client";

import { Activity, Gauge, RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import type {
  TrafficRealtimeSnapshot,
  TrafficSegmentFeature,
} from "@/lib/api/openFlintAtlas";

type TrafficFlowPanelProps = {
  snapshot: TrafficRealtimeSnapshot | null;
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
};

function formatAge(iso: string | null | undefined): string {
  if (!iso) return "waiting";
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(deltaMs)) return "waiting";
  if (deltaMs < 60_000) return "just now";
  const minutes = Math.floor(deltaMs / 60_000);
  return `${minutes}m ago`;
}

function formatBasis(segment: TrafficSegmentFeature): string {
  if (segment.properties.source_status === "live") {
    return "Live source";
  }
  if (segment.properties.source_status === "pending_live_source") {
    return "Live source pending";
  }
  if (segment.properties.estimate_basis === "live_feed") {
    return "Fixture shaped like a feed";
  }
  if (segment.properties.estimate_basis === "hourly_pattern") {
    return "Fixture time pattern";
  }
  return "scenario model";
}

function statusLabel(snapshot: TrafficRealtimeSnapshot): string {
  if (snapshot.status === "live") return "Live feed";
  if (snapshot.status === "fixture_fallback") {
    return "Fixture estimate - not a live feed";
  }
  return "Unavailable";
}

function statusNote(snapshot: TrafficRealtimeSnapshot): string {
  if (snapshot.status === "live") {
    return `${snapshot.source_label} is supplying measured segment readings.`;
  }
  if (snapshot.status === "fixture_fallback") {
    return "Preview flow uses Flint road geometry and time-of-day estimates until the measured traffic source is connected.";
  }
  return "Traffic source is unavailable right now.";
}

function congestionLabel(ratio: number): string {
  if (ratio >= 0.5) return "heavy";
  if (ratio >= 0.28) return "building";
  return "moving";
}

const CONGESTION_LEGEND = [
  { label: "Moving", color: "rgb(45, 166, 153)" },
  { label: "Building", color: "rgb(217, 162, 59)" },
  { label: "Heavy", color: "rgb(193, 74, 44)" },
] as const;

const SOURCE_OPACITY_LEGEND = [
  { label: "Live source", opacity: 0.95 },
  { label: "Source pending", opacity: 0.62 },
  { label: "Fixture estimate", opacity: 0.4 },
] as const;

function selectedOrFirst(
  snapshot: TrafficRealtimeSnapshot | null,
  selectedSegmentId: string | null,
) {
  if (!snapshot) return null;
  return (
    snapshot.segments.features.find(
      (segment) => segment.properties.segment_id === selectedSegmentId,
    ) ??
    snapshot.segments.features[0] ??
    null
  );
}

export function TrafficFlowPanel({
  snapshot,
  selectedSegmentId,
  onSegmentSelect,
}: TrafficFlowPanelProps) {
  const selected = selectedOrFirst(snapshot, selectedSegmentId);

  if (!snapshot) {
    return (
      <section className="control-dossier-card w-full px-4 py-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Traffic
        </p>
        <p
          className="mt-2 text-[12px] leading-[1.5]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          Waiting for the traffic feed.
        </p>
      </section>
    );
  }

  return (
    <section className="control-dossier-card w-full px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            Traffic
          </p>
          <h2
            className="m-0 text-[16px] font-medium leading-[1.25]"
            style={{ color: "var(--ctx-ink)" }}
          >
            Corridor speed and flow for Flint streets.
          </h2>
        </div>
        <div
          className="max-w-[13rem] rounded-full px-2.5 py-1 text-right font-mono text-[10px] uppercase leading-[1.25] tracking-[0.08em]"
          style={{
            color: "var(--ctx-ink)",
            background: "rgba(31, 31, 35, 0.06)",
          }}
        >
          {statusLabel(snapshot)}
        </div>
      </div>
      <p
        className="mt-3 text-[11px] leading-[1.5]"
        style={{ color: "var(--ctx-ink-soft)" }}
      >
        {statusNote(snapshot)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <TrafficMetric
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Avg speed"
          value={`${snapshot.summary.average_speed_mph} mph`}
        />
        <TrafficMetric
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Slow spots"
          value={String(snapshot.summary.congested_segments)}
        />
        <TrafficMetric
          icon={<RadioTower className="h-3.5 w-3.5" />}
          label="Updated"
          value={formatAge(snapshot.generated_at)}
        />
      </div>

      <div
        className="mt-4 grid gap-2 rounded-[6px] px-3 py-2.5"
        style={{
          background: "rgba(255, 255, 255, 0.26)",
          border: "1px solid var(--ctx-rule-soft)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {CONGESTION_LEGEND.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 text-[10px] leading-[1.3]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              <i
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {SOURCE_OPACITY_LEGEND.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 text-[10px] leading-[1.3]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              <i
                aria-hidden="true"
                className="inline-block w-5"
                style={{
                  borderTop: "2px solid var(--ctx-ink-soft)",
                  opacity: item.opacity,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid max-h-[180px] gap-2 overflow-y-auto pr-1">
        {snapshot.segments.features.map((segment) => {
          const active =
            segment.properties.segment_id === selected?.properties.segment_id;
          return (
            <button
              key={segment.properties.segment_id}
              type="button"
              onClick={() => onSegmentSelect(segment.properties.segment_id)}
              className="rounded-[5px] px-3 py-3 text-left transition-colors"
              style={{
                border: active
                  ? "1.5px solid rgba(193, 74, 44, 0.74)"
                  : "1px solid var(--ctx-rule-soft)",
                background: active
                  ? "rgba(193, 74, 44, 0.08)"
                  : "rgba(255, 255, 255, 0.34)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="m-0 truncate text-[13px] font-medium leading-[1.35]"
                    style={{ color: "var(--ctx-ink)" }}
                  >
                    {segment.properties.corridor_name}
                  </p>
                  <p
                    className="m-0 mt-1 text-[11px] leading-[1.45]"
                    style={{ color: "var(--ctx-ink-soft)" }}
                  >
                    {segment.properties.speed_mph} mph ·{" "}
                    {segment.properties.volume_per_hour.toLocaleString()} veh/hr
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
                  style={{
                    color: "var(--ctx-ink)",
                    background: "rgba(42, 36, 25, 0.06)",
                  }}
                >
                  {congestionLabel(segment.properties.congestion_ratio)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div
          className="mt-4 rounded-[6px] px-3.5 py-3.5"
          style={{
            background: "rgba(255, 255, 255, 0.34)",
            border: "1px solid var(--ctx-rule-soft)",
          }}
        >
          <p
            className="m-0 text-[15px] font-medium leading-[1.35]"
            style={{ color: "var(--ctx-ink)" }}
          >
            {selected.properties.corridor_name}
          </p>
          <p
            className="m-0 mt-1 text-[12px] leading-[1.5]"
            style={{ color: "var(--ctx-ink-soft)" }}
          >
            {selected.properties.direction_label}
          </p>

          <div className="mt-3 grid gap-2 text-[12px] leading-[1.5]">
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>Basis:</strong>{" "}
              {formatBasis(selected)}
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>Traffic:</strong>{" "}
              {congestionLabel(selected.properties.congestion_ratio)} at{" "}
              {selected.properties.speed_mph} mph of{" "}
              {selected.properties.free_flow_speed_mph} mph free-flow, about{" "}
              {selected.properties.volume_per_hour.toLocaleString()} vehicles/hour.
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              <strong style={{ color: "var(--ctx-ink)" }}>Support:</strong>{" "}
              {Math.round(selected.properties.confidence * 100)}%
            </p>
            <p className="m-0" style={{ color: "var(--ctx-ink-soft)" }}>
              {selected.properties.support_note}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TrafficMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[color:var(--ctx-ink-mute)]">
        {icon}
        <p className="font-mono text-[9px] uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>
      <p className="mt-1 text-[12px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
        {value}
      </p>
    </div>
  );
}
