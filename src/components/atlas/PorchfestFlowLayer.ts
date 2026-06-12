/**
 * Applicant origin-flow overlay for the planner (Lane 3).
 *
 * Renders animated origin-to-site flows from every applicant's home city to
 * the festival site, using flowmap.gl (deck.gl v9 native). Origins come from
 * the civic store's `city` field, resolved to centroids by the static
 * Michigan table; the destination is the single event site. This is the
 * "drawn from across Michigan" storytelling view, gated behind the Flows
 * toggle and off by default.
 *
 * Builder pattern matches the rest of the planner layer stack: a pure
 * function returning Layer[] that the extraDeckLayers memo spreads in.
 */

import type { Layer } from "@deck.gl/core";
import { FlowmapLayer } from "@flowmap.gl/layers";
import {
  resolveCityCentroid,
  type CityCentroid,
} from "@/lib/porchfest/michigan-city-centroids";

interface FlowCivicRow {
  readonly fields: { readonly city?: string | null };
}

interface FlowLocation {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

interface FlowDatum {
  readonly origin: string;
  readonly dest: string;
  readonly count: number;
}

const SITE_ID = "__porchfest_site__";

// Sequential ramp from a quiet wash to the Path B navy action color, so the
// flow weight reads in the atlas register rather than flowmap's default teal.
const FLOW_COLOR_SCHEME = ["#dce9f3", "#9cc2de", "#4e8cbd", "#005186"];

export interface PorchfestFlowLayerOptions {
  readonly civicRows: ReadonlyArray<FlowCivicRow>;
  readonly visible: boolean;
  readonly eventSite: { readonly lat: number; readonly lon: number };
}

export function buildPorchfestFlowLayers({
  civicRows,
  visible,
  eventSite,
}: PorchfestFlowLayerOptions): Layer[] {
  if (!visible) return [];

  // Aggregate applicants by resolvable home city; unknown cities are skipped.
  const byCity = new Map<string, { centroid: CityCentroid; count: number }>();
  for (const row of civicRows) {
    const centroid = resolveCityCentroid(row.fields.city);
    if (!centroid) continue;
    const entry = byCity.get(centroid.name);
    if (entry) entry.count += 1;
    else byCity.set(centroid.name, { centroid, count: 1 });
  }
  if (byCity.size === 0) return [];

  const locations: FlowLocation[] = [
    { id: SITE_ID, name: "Festival site", lat: eventSite.lat, lon: eventSite.lon },
    ...[...byCity.entries()].map(([name, { centroid }]) => ({
      id: name,
      name,
      lat: centroid.lat,
      lon: centroid.lon,
    })),
  ];
  const flows: FlowDatum[] = [...byCity.entries()].map(([name, { count }]) => ({
    origin: name,
    dest: SITE_ID,
    count,
  }));

  return [
    new FlowmapLayer<FlowLocation, FlowDatum>({
      id: "porchfest-flows",
      data: { locations, flows },
      getLocationId: (location) => location.id,
      getLocationLat: (location) => location.lat,
      getLocationLon: (location) => location.lon,
      getLocationName: (location) => location.name,
      getFlowOriginId: (flow) => flow.origin,
      getFlowDestId: (flow) => flow.dest,
      getFlowMagnitude: (flow) => flow.count,
      animationEnabled: true,
      clusteringEnabled: true,
      clusteringAuto: true,
      locationsEnabled: true,
      locationTotalsEnabled: true,
      locationLabelsEnabled: false,
      adaptiveScalesEnabled: true,
      colorScheme: FLOW_COLOR_SCHEME,
      opacity: 0.92,
      pickable: true,
    }) as unknown as Layer,
  ];
}
