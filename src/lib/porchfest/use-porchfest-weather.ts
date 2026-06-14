"use client";

/**
 * Forecast weather overlay data + layers (Lane 4 Tier 2), self-hosted edition.
 *
 * Loads the static GFS manifest (scripts/fetch-gfs-weather.mjs output) and, for
 * the active forecast hour, loads the wind + precipitation GeoTIFF frames with
 * weatherlayers-gl's loadTextureData and builds the deck.gl ParticleLayer
 * (wind, VECTOR) and RasterLayer (precipitation, SCALAR). Free NOAA data, no
 * subscription or token.
 *
 * weatherlayers-gl is browser-only (it references Worker at import), so the
 * runtime is pulled in with a dynamic import() inside the client effect, never
 * during SSR, and only when the overlay is active. The frames are tiny GeoTIFFs
 * (~10 KB) so loading them per scrub is cheap.
 */

import { useEffect, useState } from "react";
import type { Layer } from "@deck.gl/core";
import { WEATHER_MANIFEST_URL } from "@/lib/porchfest/weatherlayers-config";

interface WeatherFrame {
  readonly datetime: string;
  readonly forecastHour: number;
  readonly wind: string;
  readonly precip: string;
}

interface WeatherManifest {
  readonly run: string;
  readonly generatedAt: string;
  readonly bounds: [number, number, number, number];
  readonly frames: WeatherFrame[];
}

const nowIso = (): string => new Date().toISOString();

// setLibrary registers geotiff globally for loadTextureData; once is enough.
let geotiffRegistered = false;

// Precipitation rate (PRATE, kg/m^2/s) -> color. Dry is transparent; the ramp
// climbs from a faint blue at drizzle to red at heavy rain. Domain values are
// in PRATE units (~0.0003 is light, ~0.004 is heavy).
const PRECIP_PALETTE: Array<[number, string]> = [
  [0, "#00000000"],
  [0.00005, "#9ec9ec70"],
  [0.0003, "#4a90d0b0"],
  [0.001, "#3257b8d0"],
  [0.003, "#6a3da6e6"],
  [0.006, "#c81e3cf2"],
];

function closestDatetime(datetimes: string[], target: string): string | null {
  if (datetimes.length === 0) return null;
  const t = Date.parse(target);
  let best = datetimes[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const dt of datetimes) {
    const diff = Math.abs(Date.parse(dt) - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = dt;
    }
  }
  return best;
}

export interface PorchfestWeatherState {
  /** The weather manifest loaded and has forecast frames. */
  readonly available: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly datetimes: readonly string[];
  readonly datetime: string | null;
  readonly setDatetime: (datetime: string) => void;
  /** Built wind + precipitation layers for the active datetime. */
  readonly layers: Layer[];
}

export function usePorchfestWeather(enabled: boolean): PorchfestWeatherState {
  const [manifest, setManifest] = useState<WeatherManifest | null>(null);
  const [datetime, setDatetime] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the manifest once when first active.
  useEffect(() => {
    if (!enabled || manifest) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(WEATHER_MANIFEST_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`weather manifest HTTP ${response.status}`);
        return response.json();
      })
      .then((data: WeatherManifest) => {
        if (cancelled) return;
        setManifest(data);
        const dts = data.frames.map((frame) => frame.datetime);
        setDatetime((current) => current ?? closestDatetime(dts, nowIso()));
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, manifest]);

  // Build the layers for the active forecast frame.
  useEffect(() => {
    if (!enabled || !manifest || !datetime) {
      setLayers([]);
      return;
    }
    const frame = manifest.frames.find((entry) => entry.datetime === datetime);
    if (!frame) {
      setLayers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const wl = await import("weatherlayers-gl");
        if (!geotiffRegistered) {
          const geotiff = await import("geotiff");
          wl.setLibrary("geotiff", geotiff);
          geotiffRegistered = true;
        }
        const [windTexture, precipTexture] = await Promise.all([
          wl.loadTextureData(frame.wind),
          wl.loadTextureData(frame.precip),
        ]);
        if (cancelled) return;
        const bounds = manifest.bounds;
        const built: Layer[] = [
          new wl.RasterLayer({
            id: "porchfest-weather-precip",
            image: precipTexture,
            imageType: wl.ImageType.SCALAR,
            imageUnscale: null,
            bounds,
            // RasterLayer parses the raw cpt2js palette array internally.
            palette: PRECIP_PALETTE,
            // Keep rain legible without turning the 3D planner mesh blue.
            opacity: 0.18,
          }) as unknown as Layer,
          new wl.ParticleLayer({
            id: "porchfest-weather-wind",
            image: windTexture,
            imageType: wl.ImageType.VECTOR,
            imageUnscale: null,
            bounds,
            numParticles: 4000,
            maxAge: 30,
            speedFactor: 4,
            width: 2,
            // Dark navy (Path B action color) so the streamlines read on the
            // light Observable basemap; white particles wash out on it.
            color: [0, 81, 134, 220],
            animate: true,
          }) as unknown as Layer,
        ];
        setLayers(built);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setLoading(false);
        setLayers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, manifest, datetime]);

  // Drop the layers when the overlay is suspended.
  useEffect(() => {
    if (!enabled) setLayers([]);
  }, [enabled]);

  return {
    available: (manifest?.frames.length ?? 0) > 0,
    loading,
    error,
    datetimes: manifest?.frames.map((frame) => frame.datetime) ?? [],
    datetime,
    setDatetime,
    layers,
  };
}
