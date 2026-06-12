"use client";

/**
 * Forecast weather overlay data + layers (Lane 4 Tier 2).
 *
 * Loads WeatherLayers Cloud forecast frames (GFS wind + precipitation) and
 * builds the deck.gl ParticleLayer (wind) and RasterLayer (precipitation) for
 * the active forecast datetime. The heavy weatherlayers-gl runtime is pulled
 * in with a dynamic import() ONLY when the overlay is enabled with a token, so
 * the planner bundle stays lean for the common case (no token, overlay off).
 *
 * Without a WeatherLayers Cloud token the hook returns available=false and no
 * layers; the planner shows an honest "needs a data token" note instead. The
 * data path is therefore inert in production until the subscription token is
 * configured, matching the repo's honest-degradation convention.
 */

import { useEffect, useState } from "react";
import type { Layer } from "@deck.gl/core";
import {
  WEATHERLAYERS_TOKEN,
  WEATHERLAYERS_WIND_DATASET,
  WEATHERLAYERS_PRECIP_DATASET,
  hasWeatherLayersToken,
} from "@/lib/porchfest/weatherlayers-config";

const nowIso = (): string => new Date().toISOString();

// setLibrary registers geotiff globally for the data loader; once is enough.
let geotiffRegistered = false;

export interface PorchfestWeatherState {
  /** A WeatherLayers Cloud token is configured. */
  readonly available: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  /** Forecast datetimes (ISO) offered by the dataset. */
  readonly datetimes: readonly string[];
  /** Active forecast datetime the layers render. */
  readonly datetime: string | null;
  readonly setDatetime: (datetime: string) => void;
  /** Built wind + precipitation layers for the active datetime. */
  readonly layers: Layer[];
}

export function usePorchfestWeather(enabled: boolean): PorchfestWeatherState {
  const available = hasWeatherLayersToken();
  const [datetimes, setDatetimes] = useState<string[]>([]);
  const [datetime, setDatetime] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discover the forecast datetimes when first enabled with a token.
  useEffect(() => {
    if (!enabled || !available) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { Client, setLibrary, getClosestStartDatetime } = await import(
          "weatherlayers-gl/client"
        );
        if (!geotiffRegistered) {
          const geotiff = await import("geotiff");
          setLibrary("geotiff", geotiff);
          geotiffRegistered = true;
        }
        const client = new Client({ accessToken: WEATHERLAYERS_TOKEN });
        const windDataset = await client.loadDataset(WEATHERLAYERS_WIND_DATASET);
        if (cancelled) return;
        const dts = windDataset.datetimes;
        setDatetimes(dts);
        setDatetime(
          (current) =>
            current ?? getClosestStartDatetime(dts, nowIso()) ?? dts[0] ?? null,
        );
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, available]);

  // Load the data for the active datetime and build the layers.
  useEffect(() => {
    if (!enabled || !available || !datetime) {
      setLayers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [clientModule, deckModule] = await Promise.all([
          import("weatherlayers-gl/client"),
          import("weatherlayers-gl"),
        ]);
        const { Client } = clientModule;
        const { ParticleLayer, RasterLayer } = deckModule;
        const client = new Client({ accessToken: WEATHERLAYERS_TOKEN });
        const [windDataset, precipDataset] = await Promise.all([
          client.loadDataset(WEATHERLAYERS_WIND_DATASET),
          client.loadDataset(WEATHERLAYERS_PRECIP_DATASET),
        ]);
        const [wind, precip] = await Promise.all([
          client.loadDatasetData(WEATHERLAYERS_WIND_DATASET, datetime),
          client.loadDatasetData(WEATHERLAYERS_PRECIP_DATASET, datetime),
        ]);
        if (cancelled) return;
        const built: Layer[] = [
          new RasterLayer({
            id: "porchfest-weather-precip",
            image: precip.image,
            image2: precip.image2,
            imageWeight: precip.imageWeight,
            imageType: precip.imageType,
            imageUnscale: precip.imageUnscale,
            bounds: precip.bounds,
            palette: precipDataset.palette,
            opacity: 0.42,
          }) as unknown as Layer,
          new ParticleLayer({
            id: "porchfest-weather-wind",
            image: wind.image,
            image2: wind.image2,
            imageWeight: wind.imageWeight,
            imageType: wind.imageType,
            imageUnscale: wind.imageUnscale,
            bounds: wind.bounds,
            numParticles: 3500,
            maxAge: 25,
            speedFactor: 3,
            width: 1.6,
            color: [255, 255, 255, 120],
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
  }, [enabled, available, datetime]);

  // Drop the layers when the overlay is suspended (toggle off or zoomed out).
  useEffect(() => {
    if (!enabled) setLayers([]);
  }, [enabled]);

  return {
    available,
    loading,
    error,
    datetimes,
    datetime,
    setDatetime,
    layers,
  };
}
