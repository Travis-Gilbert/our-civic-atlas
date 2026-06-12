"use client";

/**
 * Event-day forecast for the planner and workspace (Lane 4, Tier 1).
 *
 * Open-Meteo point forecast for the event site. No API key, no service-tier
 * credential, so it is a plain client fetch (not a GraphQL boundary field):
 * the endpoint is public and the data is non-curated public weather.
 *
 * The free forecast horizon is 16 days, so a festival 30+ days out cannot be
 * shown on the event day yet. The hook returns the full daily strip plus the
 * matching event-day entry when the date enters the window; the card decides
 * how to present "in range" vs "opens nearer the date". Refreshes on mount,
 * every few hours, and when the tab regains focus with stale data.
 */

import { useEffect, useState } from "react";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours
const STALE_MS = 60 * 60 * 1000; // refetch on focus if older than 1 hour

export interface ForecastDay {
  /** ISO calendar date, e.g. "2026-07-17". */
  readonly date: string;
  readonly tempMaxF: number;
  readonly tempMinF: number;
  readonly precipProbMaxPct: number;
  readonly windMaxMph: number;
  readonly weatherCode: number;
}

export interface ForecastNow {
  readonly tempF: number;
  readonly windMph: number;
  readonly precipIn: number;
  readonly weatherCode: number;
}

export interface PorchfestForecast {
  readonly now: ForecastNow | null;
  readonly days: readonly ForecastDay[];
  readonly loading: boolean;
  readonly error: string | null;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
  };
}

/** WMO weather code to a short label and a single-glyph icon. */
export function describeWeatherCode(code: number): {
  label: string;
  glyph: string;
} {
  if (code === 0) return { label: "Clear", glyph: "☀️" };
  if (code === 1) return { label: "Mainly clear", glyph: "\u{1F324}️" };
  if (code === 2) return { label: "Partly cloudy", glyph: "⛅" };
  if (code === 3) return { label: "Overcast", glyph: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", glyph: "\u{1F32B}️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", glyph: "\u{1F326}️" };
  if (code >= 61 && code <= 67) return { label: "Rain", glyph: "\u{1F327}️" };
  if (code >= 71 && code <= 77) return { label: "Snow", glyph: "\u{1F328}️" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", glyph: "\u{1F326}️" };
  if (code === 85 || code === 86) return { label: "Snow showers", glyph: "\u{1F328}️" };
  if (code >= 95) return { label: "Thunderstorm", glyph: "⛈️" };
  return { label: "Mixed", glyph: "\u{1F324}️" };
}

function buildUrl(lat: number, lon: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: "temperature_2m,weather_code,wind_speed_10m,precipitation",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone,
    forecast_days: "16",
  });
  return `${ENDPOINT}?${params.toString()}`;
}

function parse(body: OpenMeteoResponse): {
  now: ForecastNow | null;
  days: ForecastDay[];
} {
  const now: ForecastNow | null = body.current
    ? {
        tempF: body.current.temperature_2m ?? Number.NaN,
        windMph: body.current.wind_speed_10m ?? Number.NaN,
        precipIn: body.current.precipitation ?? 0,
        weatherCode: body.current.weather_code ?? 0,
      }
    : null;

  const d = body.daily;
  const times = d?.time ?? [];
  const days: ForecastDay[] = times.map((date, i) => ({
    date,
    tempMaxF: d?.temperature_2m_max?.[i] ?? Number.NaN,
    tempMinF: d?.temperature_2m_min?.[i] ?? Number.NaN,
    precipProbMaxPct: d?.precipitation_probability_max?.[i] ?? 0,
    windMaxMph: d?.wind_speed_10m_max?.[i] ?? Number.NaN,
    weatherCode: d?.weather_code?.[i] ?? 0,
  }));
  return { now, days };
}

export function usePorchfestForecast(
  lat: number,
  lon: number,
  timezone: string,
): PorchfestForecast {
  const [state, setState] = useState<PorchfestForecast>({
    now: null,
    days: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let lastFetched = 0;
    const url = buildUrl(lat, lon, timezone);

    const load = async () => {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
        const body = (await response.json()) as OpenMeteoResponse;
        if (cancelled) return;
        const { now, days } = parse(body);
        lastFetched = Date.now();
        setState({ now, days, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetched > STALE_MS
      ) {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [lat, lon, timezone]);

  return state;
}
