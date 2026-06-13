import { type Layer } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";

import {
  activeRunOfShowPerformances,
  type RunOfShowPerformance,
  type RunOfShowTrip,
} from "@/lib/porchfest/run-of-show";

export interface PorchfestRunOfShowLayerOptions {
  readonly visible: boolean;
  readonly currentTime: number;
  readonly performances: readonly RunOfShowPerformance[];
  readonly trips: readonly RunOfShowTrip[];
  readonly reducedMotion: boolean;
}

export function buildPorchfestRunOfShowLayers({
  visible,
  currentTime,
  performances,
  trips,
  reducedMotion,
}: PorchfestRunOfShowLayerOptions): Layer[] {
  if (!visible) return [];

  const active = activeRunOfShowPerformances(performances, currentTime);
  const pulse = reducedMotion ? 0 : Math.max(0, Math.sin(currentTime / 4)) * 4;

  return [
    new TripsLayer<RunOfShowTrip>({
      id: "porchfest-run-of-show-trips",
      data: trips,
      getPath: (trip) => trip.path as [number, number][],
      getTimestamps: (trip) => trip.timestamps as number[],
      getColor: [0, 81, 134, 210],
      currentTime,
      trailLength: 28,
      capRounded: true,
      jointRounded: true,
      widthMinPixels: 4,
      opacity: 0.9,
      pickable: false,
    }) as unknown as Layer,
    new ScatterplotLayer<RunOfShowPerformance>({
      id: "porchfest-run-of-show-density",
      data: active,
      getPosition: (performance) => performance.point as [number, number],
      getRadius: () => 28 + pulse,
      radiusUnits: "meters",
      stroked: true,
      filled: true,
      getFillColor: [0, 81, 134, 34],
      getLineColor: [0, 81, 134, 190],
      lineWidthMinPixels: 1.4,
      pickable: false,
      transitions: reducedMotion
        ? undefined
        : {
            getRadius: 180,
            getFillColor: 180,
            getLineColor: 180,
          },
      updateTriggers: {
        getRadius: [currentTime, reducedMotion],
      },
    }),
  ];
}
