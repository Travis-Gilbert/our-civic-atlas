import type { RendererBoundary } from "@/lib/atlas/contracts";

export const ATLAS_RENDERER_BOUNDARIES: RendererBoundary[] = [
  {
    renderer_id: "geospatial_base",
    label: "MapLibre civic base",
    runtime: "maplibre",
    role: "Primary cartographic substrate for tiles, labels, bounds, and fallback geography.",
    owns: [
      "basemap tiles",
      "viewport projection",
      "place labels",
      "navigation controls",
      "mobile-safe fallback",
    ],
    must_not_own: [
      "review-only comments",
      "procedural civic scene assets",
      "offline scene foundry generation",
    ],
    default_surface: true,
    mobile_strategy: "default",
    status: "primary",
  },
  {
    renderer_id: "data_overlay",
    label: "deck.gl analytical overlay",
    runtime: "deck.gl",
    role: "High-volume overlay lane for places, events, signals, corridors, and aggregate safety layers.",
    owns: [
      "dense geospatial overlays",
      "extrusions",
      "event beacons",
      "selection highlights",
      "GPU-heavy layer blending",
    ],
    must_not_own: [
      "basemap labels",
      "browser chrome",
      "scene foundry assets",
    ],
    default_surface: true,
    mobile_strategy: "desktop_primary",
    status: "primary",
  },
  {
    renderer_id: "object_scene",
    label: "Three/R3F civic scene",
    runtime: "r3f",
    role: "Focused object and scene lane for reviewed assets, civic spatial drama, and selected-object context.",
    owns: [
      "reviewed scene objects",
      "selected-object focus",
      "ghost/historical overlays",
      "scene-specific labels",
      "authored spatial lighting",
    ],
    must_not_own: [
      "citywide basemap ownership",
      "basemap tiles",
      "viewport projection",
      "place labels",
      "mobile fallback routing",
      "primary public geography before parity",
    ],
    default_surface: false,
    mobile_strategy: "opt_in",
    status: "secondary",
  },
  {
    renderer_id: "analytics",
    label: "Mosaic and Plot analytics",
    runtime: "mosaic",
    role: "Chart, histogram, and cross-filter lane for analytical atlas reading.",
    owns: [
      "time histograms",
      "cross-filter feedback",
      "metric summaries",
      "data brush state",
    ],
    must_not_own: [
      "map projection",
      "scene geometry",
      "public write workflows",
    ],
    default_surface: true,
    mobile_strategy: "compact",
    status: "primary",
  },
  {
    renderer_id: "data_lab",
    label: "Kepler-compatible data lab",
    runtime: "kepler",
    role: "Recipe-driven export and exploratory layer composition lane for future public data lab work.",
    owns: [
      "layer recipes",
      "exploratory export configs",
      "dataset comparison presets",
    ],
    must_not_own: [
      "primary public map route",
      "review queues",
      "scene foundry assets",
    ],
    default_surface: false,
    mobile_strategy: "deferred",
    status: "planned",
  },
  {
    renderer_id: "foundry",
    label: "Scene Foundry asset generation",
    runtime: "offline",
    role: "Offline generation boundary for Brush, IFC, GLB, thumbnails, and reviewed scene outputs.",
    owns: [
      "asset generation",
      "scene export packaging",
      "thumbnail renders",
      "support-state derivation",
    ],
    must_not_own: [
      "live public routing",
      "browser-session interactions",
      "public contributor moderation decisions",
    ],
    default_surface: false,
    mobile_strategy: "not_applicable",
    status: "offline",
  },
];

export function getRendererBoundaries(): RendererBoundary[] {
  return ATLAS_RENDERER_BOUNDARIES;
}

export function getRendererBoundary(
  rendererId: string,
): RendererBoundary | undefined {
  return ATLAS_RENDERER_BOUNDARIES.find(
    (boundary) => boundary.renderer_id === rendererId,
  );
}
