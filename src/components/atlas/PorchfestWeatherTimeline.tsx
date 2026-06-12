"use client";

/**
 * Forecast time scrubber for the weather overlay (Lane 4 Tier 2). A plain
 * range input over the dataset's forecast datetimes, in the planner register.
 * Drives the active forecast hour the wind + precipitation layers render.
 */

import { PORCHFEST_EVENT_TZ } from "@/lib/porchfest/porchfest-event";

function formatDatetime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: PORCHFEST_EVENT_TZ,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export interface PorchfestWeatherTimelineProps {
  readonly datetimes: readonly string[];
  readonly datetime: string | null;
  readonly loading: boolean;
  readonly onChange: (datetime: string) => void;
}

export function PorchfestWeatherTimeline({
  datetimes,
  datetime,
  loading,
  onChange,
}: PorchfestWeatherTimelineProps) {
  if (datetimes.length === 0) {
    return (
      <div className="planner-panel px-3 py-2">
        <p className="planner-kicker">Forecast hour</p>
        <p className="planner-muted mt-1 text-[12px] leading-4">
          {loading ? "Loading forecast frames…" : "No forecast frames yet."}
        </p>
      </div>
    );
  }

  const index = Math.max(0, datetimes.indexOf(datetime ?? ""));

  return (
    <div className="planner-panel px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="planner-kicker">Forecast hour</p>
        <span className="planner-muted font-mono text-[10px] uppercase tracking-[0.1em]">
          {formatDatetime(datetime)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={datetimes.length - 1}
        step={1}
        value={index}
        onChange={(event) => {
          const next = datetimes[Number(event.target.value)];
          if (next) onChange(next);
        }}
        className="mt-2 w-full"
        style={{ accentColor: "var(--ctx-accent)" }}
        aria-label="Forecast hour"
      />
      <div className="planner-muted mt-1 flex justify-between text-[10px]">
        <span>{formatDatetime(datetimes[0])}</span>
        <span>{formatDatetime(datetimes[datetimes.length - 1])}</span>
      </div>
      {loading ? (
        <p className="planner-muted mt-1 text-[10px]">Loading frame…</p>
      ) : null}
    </div>
  );
}
