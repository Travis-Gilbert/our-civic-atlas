import type { AtlasLensId } from "@/lib/atlas/scene-view";
import type { RenderMode } from "@/lib/atlas/contracts";

export type AtlasThreeAreaStyle = {
  fill: string;
  fillOpacity: number;
  line: string;
  lineOpacity: number;
  lineWidth: number;
  y: number;
};

export const ATLAS_THREE_LENS_TINTS: Record<AtlasLensId, string> = {
  explore: "#c1843a",
  memory: "#c14a2c",
  safety: "#388480",
  interventions: "#527e52",
};

export const ATLAS_THREE_MATERIALS = {
  base: {
    paper: "#efe9dc",
    paperDeep: "#ddd5c4",
    veil: "#d8d0bf",
    grid: "#d2c5af",
    rule: "#2a2419",
    water: "#6f9d9d",
    corridor: "#a97942",
    cityAnchor: "#5f6b7a",
  },
  areas: {
    ward: {
      fill: "#d3dcff",
      line: "#5876bf",
      selected: "#c14a2c",
    },
    park: {
      fill: "#78ad8d",
      line: "#3d8062",
      selected: "#4a8a5a",
    },
    default: {
      fill: "#aeb4c0",
      line: "#667085",
      selected: "#c14a2c",
    },
  },
  markers: {
    ward: "#3b82f6",
    parcel: "#d9a23b",
    building: "#8c8c96",
    infrastructure: "#2da699",
    park: "#4aa883",
    city: "#6b7280",
    corridor: "#9a7a42",
  },
  events: {
    infrastructure_change: "#3b82f6",
    environmental: "#2da699",
    policy: "#d9a23b",
    health: "#dc5050",
    community: "#a064dc",
  },
  selected: {
    glow: "#c14a2c",
    sourceHalo: "#6b78b8",
  },
} as const;

export const ATLAS_THREE_RENDER_MODE_STYLES = {
  current_confirmed: {
    color: "#2f6f64",
    opacity: 0.82,
    halo: "#5aa88f",
  },
  current_low_confidence: {
    color: "#c08a3a",
    opacity: 0.58,
    halo: "#d9b36f",
  },
  vanished_confirmed: {
    color: "#8f6e9f",
    opacity: 0.42,
    halo: "#b697c6",
  },
  vanished_inferred: {
    color: "#8f6e9f",
    opacity: 0.28,
    halo: "#c5b3d0",
  },
  historical_event: {
    color: "#c14a2c",
    opacity: 0.78,
    halo: "#e07a55",
  },
  public_intervention: {
    color: "#527e52",
    opacity: 0.74,
    halo: "#86a878",
  },
  community_observation_pending: {
    color: "#c08a3a",
    opacity: 0.44,
    halo: "#e1bd7a",
  },
  community_observation_reviewed: {
    color: "#4a8a82",
    opacity: 0.72,
    halo: "#7eb8ad",
  },
  disputed_claim: {
    color: "#9b4d4d",
    opacity: 0.64,
    halo: "#d47777",
  },
  model_prediction: {
    color: "#5f6fa3",
    opacity: 0.52,
    halo: "#9ca8d0",
  },
  source_stale: {
    color: "#8c8170",
    opacity: 0.42,
    halo: "#bdb3a2",
  },
  source_high_confidence: {
    color: "#5f6fa3",
    opacity: 0.76,
    halo: "#8f9bd2",
  },
  brush_reconstruction: {
    color: "#b86f54",
    opacity: 0.82,
    halo: "#e3a088",
  },
  ifc_semantic_model: {
    color: "#4a8a82",
    opacity: 0.72,
    halo: "#82b8b1",
  },
} as const satisfies Record<
  RenderMode,
  { color: string; opacity: number; halo: string }
>;

export function getAtlasThreeAreaStyle(
  placeType: string,
  activeLens: AtlasLensId,
  selected: boolean,
): AtlasThreeAreaStyle {
  const token =
    placeType === "ward"
      ? ATLAS_THREE_MATERIALS.areas.ward
      : placeType === "park"
        ? ATLAS_THREE_MATERIALS.areas.park
        : ATLAS_THREE_MATERIALS.areas.default;

  const fill = blendHex(
    token.fill,
    selected ? token.selected : ATLAS_THREE_LENS_TINTS[activeLens],
    selected ? 0.24 : 0.08,
  );

  return {
    fill,
    fillOpacity: selected ? 0.3 : placeType === "park" ? 0.13 : 0.09,
    line: selected ? token.selected : token.line,
    lineOpacity: selected ? 0.95 : placeType === "park" ? 0.42 : 0.68,
    lineWidth: selected ? 2 : 1,
    y: selected ? 0.1 : placeType === "park" ? 0.055 : 0.045,
  };
}

export function getAtlasThreePlaceColor(
  placeType: string,
  activeLens: AtlasLensId,
): string {
  return blendHex(
    ATLAS_THREE_MATERIALS.markers[
      placeType as keyof typeof ATLAS_THREE_MATERIALS.markers
    ] ?? "#787882",
    ATLAS_THREE_LENS_TINTS[activeLens],
    0.24,
  );
}

export function getAtlasThreeEventColor(
  eventType: string,
  activeLens: AtlasLensId,
): string {
  return blendHex(
    ATLAS_THREE_MATERIALS.events[
      eventType as keyof typeof ATLAS_THREE_MATERIALS.events
    ] ?? "#8c8c96",
    ATLAS_THREE_LENS_TINTS[activeLens],
    0.18,
  );
}

export function blendHex(base: string, tint: string, amount: number): string {
  const baseRgb = hexToRgb(base);
  const tintRgb = hexToRgb(tint);
  if (!baseRgb || !tintRgb) return base;

  const mixed = baseRgb.map((channel, index) =>
    Math.round(channel + (tintRgb[index] - channel) * amount),
  );

  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}
