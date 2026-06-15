"use client";

/**
 * Event-day forecast as compact metadata (Lane 4, Tier 1). Weather is a quiet
 * secondary detail, never a centerpiece: a single muted line that sits under
 * the main content of whatever surface mounts it (planner sidebar, mobile
 * island, workspace). Open-Meteo point forecast for the festival site, no key.
 * Shows the event day once it enters the 16-day window, otherwise the live
 * "now" outlook.
 */

import type { ReactNode } from "react";
import {
  PORCHFEST_EVENT_DATE,
  PORCHFEST_EVENT_TZ,
  PORCHFEST_EVENT_SITE,
} from "@/lib/porchfest/porchfest-event";
import {
  describeWeatherCode,
  usePorchfestForecast,
} from "@/lib/porchfest/use-porchfest-forecast";

const round = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value)}` : "--";

const eventDayLabel = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: PORCHFEST_EVENT_TZ,
      month: "short",
      day: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
};

export function PorchfestForecastCard() {
  const { now, days, loading, error } = usePorchfestForecast(
    PORCHFEST_EVENT_SITE.lat,
    PORCHFEST_EVENT_SITE.lon,
    PORCHFEST_EVENT_TZ,
  );
  const eventDay = days.find((day) => day.date === PORCHFEST_EVENT_DATE) ?? null;

  let detail: ReactNode = null;
  if (loading) {
    detail = <span className="planner-muted">Loading&hellip;</span>;
  } else if (error) {
    detail = <span className="planner-muted">Unavailable</span>;
  } else if (eventDay) {
    const { label, glyph } = describeWeatherCode(eventDay.weatherCode);
    detail = (
      <>
        <span aria-hidden>{glyph}</span>
        <span className="planner-ink font-medium">
          {round(eventDay.tempMaxF)}&deg;/{round(eventDay.tempMinF)}&deg;
        </span>
        <span className="planner-muted truncate">
          {label} &middot; {round(eventDay.precipProbMaxPct)}% rain &middot;{" "}
          {eventDayLabel(eventDay.date)}
        </span>
      </>
    );
  } else if (now) {
    const { label, glyph } = describeWeatherCode(now.weatherCode);
    detail = (
      <>
        <span aria-hidden>{glyph}</span>
        <span className="planner-ink font-medium">{round(now.tempF)}&deg;</span>
        <span className="planner-muted truncate">
          now &middot; {label} &middot; {round(now.windMph)} mph
        </span>
      </>
    );
  } else {
    detail = (
      <span className="planner-muted truncate">
        Forecast opens near event day
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[12px] leading-4">
      <span className="planner-muted font-mono text-[10px] uppercase tracking-[0.12em]">
        Weather
      </span>
      <span className="flex min-w-0 items-center gap-1.5">{detail}</span>
    </div>
  );
}
