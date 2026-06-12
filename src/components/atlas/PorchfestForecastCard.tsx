"use client";

/**
 * Event-day forecast card (Lane 4, Tier 1). Mounts in the planner sidebar,
 * the mobile island info tab, and the workspace. Open-Meteo point forecast
 * for the festival site; no API key. Pins to the event day once it enters the
 * 16-day window, otherwise shows the live outlook with an honest note.
 */

import {
  PORCHFEST_EVENT_DATE,
  PORCHFEST_EVENT_DATE_LABEL,
  PORCHFEST_EVENT_SITE,
  PORCHFEST_EVENT_TZ,
} from "@/lib/porchfest/porchfest-event";
import {
  describeWeatherCode,
  usePorchfestForecast,
  type ForecastDay,
} from "@/lib/porchfest/use-porchfest-forecast";

const round = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value)}` : "--";

function EventDayHero({ day }: { day: ForecastDay }) {
  const { label, glyph } = describeWeatherCode(day.weatherCode);
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2.5">
        <span className="text-[26px] leading-none" aria-hidden>
          {glyph}
        </span>
        <div className="min-w-0">
          <p className="planner-ink text-[15px] font-semibold leading-none">
            {round(day.tempMaxF)}&deg; <span className="planner-muted">/ {round(day.tempMinF)}&deg;</span>
          </p>
          <p className="planner-ink-soft mt-0.5 truncate text-[12px] leading-4">
            {label}
          </p>
        </div>
      </div>
      <div className="planner-muted mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-4">
        <span>{round(day.precipProbMaxPct)}% rain</span>
        <span>{round(day.windMaxMph)} mph wind</span>
      </div>
    </div>
  );
}

function CurrentOutlook({
  tempF,
  windMph,
  weatherCode,
}: {
  tempF: number;
  windMph: number;
  weatherCode: number;
}) {
  const { label, glyph } = describeWeatherCode(weatherCode);
  return (
    <div className="mt-1.5 flex items-center gap-2.5">
      <span className="text-[24px] leading-none" aria-hidden>
        {glyph}
      </span>
      <div className="min-w-0">
        <p className="planner-ink text-[15px] font-semibold leading-none">
          {round(tempF)}&deg; <span className="planner-muted text-[12px]">now</span>
        </p>
        <p className="planner-ink-soft mt-0.5 truncate text-[12px] leading-4">
          {label} &middot; {round(windMph)} mph
        </p>
      </div>
    </div>
  );
}

export function PorchfestForecastCard() {
  const { now, days, loading, error } = usePorchfestForecast(
    PORCHFEST_EVENT_SITE.lat,
    PORCHFEST_EVENT_SITE.lon,
    PORCHFEST_EVENT_TZ,
  );
  const eventDay = days.find((day) => day.date === PORCHFEST_EVENT_DATE) ?? null;

  return (
    <div className="planner-panel px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="planner-kicker">Weather</p>
        <span className="planner-muted font-mono text-[10px] uppercase tracking-[0.1em]">
          {PORCHFEST_EVENT_DATE_LABEL}
        </span>
      </div>

      {loading ? (
        <p className="planner-muted mt-1.5 text-[12px] leading-4">
          Loading forecast&hellip;
        </p>
      ) : error ? (
        <p className="planner-note mt-1.5 px-2 py-1 leading-4">
          Forecast unavailable right now. It refreshes automatically.
        </p>
      ) : eventDay ? (
        <EventDayHero day={eventDay} />
      ) : (
        <>
          {now ? (
            <CurrentOutlook
              tempF={now.tempF}
              windMph={now.windMph}
              weatherCode={now.weatherCode}
            />
          ) : null}
          <p className="planner-muted mt-2 text-[11px] leading-4">
            Event-day forecast for {PORCHFEST_EVENT_DATE_LABEL} opens as the date
            enters the 16-day window.
          </p>
        </>
      )}
    </div>
  );
}
