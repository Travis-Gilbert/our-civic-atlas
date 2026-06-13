"use client";

import { Clock3, Pause, Play } from "lucide-react";

import {
  RUN_OF_SHOW_DURATION_MINUTES,
  RUN_OF_SHOW_PHASES,
  activeRunOfShowPerformances,
  clampRunOfShowTime,
  formatRunOfShowClock,
  nearestRunOfShowSnap,
  runOfShowForecastHourKey,
  type RunOfShowPerformance,
} from "@/lib/porchfest/run-of-show";
import {
  PORCHFEST_EVENT_SITE,
  PORCHFEST_EVENT_TZ,
} from "@/lib/porchfest/porchfest-event";
import {
  describeWeatherCode,
  usePorchfestForecast,
} from "@/lib/porchfest/use-porchfest-forecast";

export interface PorchfestRunOfShowPanelProps {
  readonly enabled: boolean;
  readonly time: number;
  readonly playing: boolean;
  readonly performances: readonly RunOfShowPerformance[];
  readonly activeTaskCount: number;
  readonly onEnabledChange: (enabled: boolean) => void;
  readonly onTimeChange: (time: number) => void;
  readonly onPlayingChange: (playing: boolean) => void;
}

function sourceLabel(performances: readonly RunOfShowPerformance[]): string {
  if (performances.length === 0) return "No set times";
  if (performances.some((performance) => performance.source === "set_time")) {
    return "Set times";
  }
  if (
    performances.some((performance) => performance.source === "placement_label")
  ) {
    return "Placement times";
  }
  return "Draft stage slots";
}

function weatherLabel(code: number): string {
  return describeWeatherCode(code).label;
}

function rounded(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "--";
}

export function PorchfestRunOfShowPanel({
  enabled,
  time,
  playing,
  performances,
  activeTaskCount,
  onEnabledChange,
  onTimeChange,
  onPlayingChange,
}: PorchfestRunOfShowPanelProps) {
  const forecast = usePorchfestForecast(
    PORCHFEST_EVENT_SITE.lat,
    PORCHFEST_EVENT_SITE.lon,
    PORCHFEST_EVENT_TZ,
  );
  const active = activeRunOfShowPerformances(performances, time);
  const forecastKey = runOfShowForecastHourKey(time);
  const weatherHour =
    forecast.hours.find((hour) => hour.time === forecastKey) ?? null;
  const currentPhase = formatRunOfShowClock(time);
  const activeNames = active
    .slice(0, 3)
    .map((performance) => performance.actName)
    .join(", ");

  return (
    <section className="space-y-3" aria-label="Run of show">
      <label className="planner-row flex cursor-pointer items-center justify-between gap-2 px-1.5 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-[color:var(--ctx-ink-mute)]" />
          <span className="min-w-0">
            <span className="planner-kicker block">Run of show</span>
            <span className="planner-muted block text-[11px]">
              {sourceLabel(performances)}
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            const checked = event.target.checked;
            onEnabledChange(checked);
            if (!checked) onPlayingChange(false);
          }}
          className="planner-check h-4 w-4"
        />
      </label>

      {enabled ? (
        <>
          <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-2">
            <button
              type="button"
              className="planner-button flex h-9 w-9 items-center justify-center p-0"
              onClick={() => onPlayingChange(!playing)}
              aria-label={playing ? "Pause run of show" : "Play run of show"}
              title={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="planner-kicker">{currentPhase}</p>
                <button
                  type="button"
                  className="planner-muted text-[10px] underline underline-offset-2"
                  onClick={() => onTimeChange(nearestRunOfShowSnap(time))}
                >
                  Snap
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={RUN_OF_SHOW_DURATION_MINUTES}
                step={1}
                value={clampRunOfShowTime(time)}
                list="porchfest-run-of-show-phases"
                onChange={(event) => onTimeChange(Number(event.target.value))}
                className="mt-1 w-full"
                style={{ accentColor: "var(--ctx-accent)" }}
                aria-label="Run of show time"
              />
              <datalist id="porchfest-run-of-show-phases">
                {RUN_OF_SHOW_PHASES.map((phase) => (
                  <option key={phase.minute} value={phase.minute} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {RUN_OF_SHOW_PHASES.filter((_, index) => index % 2 === 0).map(
              (phase) => (
                <button
                  key={phase.minute}
                  type="button"
                  className={`planner-control min-h-[26px] px-1.5 py-1 text-[11px] ${
                    nearestRunOfShowSnap(time) === phase.minute
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => onTimeChange(phase.minute)}
                >
                  {phase.label}
                </button>
              ),
            )}
          </div>

          <div className="planner-note space-y-1 px-2 py-1.5 leading-4">
            <p className="planner-ink text-[12px]">
              {active.length > 0
                ? `${active.length} active: ${activeNames}${
                    active.length > 3 ? "..." : ""
                  }`
                : "Transition window"}
            </p>
            <p className="planner-muted text-[11px]">
              Expected crowd at {active.length || 0} active stage
              {active.length === 1 ? "" : "s"} · {activeTaskCount} timed task
              {activeTaskCount === 1 ? "" : "s"}
            </p>
            <p className="planner-muted text-[11px]">
              {forecast.loading
                ? "Weather loading..."
                : forecast.error
                  ? "Weather unavailable"
                  : weatherHour
                    ? `${weatherLabel(weatherHour.weatherCode)} · ${rounded(
                        weatherHour.tempF,
                      )}° · ${rounded(
                        weatherHour.precipProbPct,
                      )}% rain · ${rounded(weatherHour.windMph)} mph wind`
                    : "Hourly forecast opens near event day"}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
