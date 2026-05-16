import type { AtlasLensId } from "@/lib/atlas/scene-view";

export type RgbaTuple = [number, number, number, number];
export type RgbTuple = [number, number, number];

export type AtlasSemanticStateId =
  | "current"
  | "review"
  | "historical"
  | "proposed"
  | "comment"
  | "poll"
  | "safety"
  | "source"
  | "live_signal";

export type AtlasSemanticState = {
  id: AtlasSemanticStateId;
  label: string;
  color_hex: string;
  outline_hex: string;
  fill_alpha: number;
  icon: string;
  pattern: string;
  stroke_style: "solid" | "dashed" | "dotted";
  elevation: number;
  animation: "none" | "pulse" | "drift";
  note: string;
};

type PlaceTypeVisual = {
  label: string;
  fill_hex: string;
  line_hex: string;
  fill_alpha: number;
  line_alpha: number;
};

type EventTypeVisual = {
  label: string;
  color_hex: string;
};

type SignalKindVisual = {
  label: string;
  color_hex: string;
  outline_hex: string;
};

const PLACE_TYPE_VISUALS: Record<string, PlaceTypeVisual> = {
  ward: {
    label: "Ward",
    fill_hex: "#6b7d8c",
    line_hex: "#5471b7",
    fill_alpha: 110,
    line_alpha: 180,
  },
  parcel: {
    label: "Parcel",
    fill_hex: "#b8893f",
    line_hex: "#8f6220",
    fill_alpha: 92,
    line_alpha: 162,
  },
  building: {
    label: "Building",
    fill_hex: "#7a7568",
    line_hex: "#59554b",
    fill_alpha: 88,
    line_alpha: 148,
  },
  infrastructure: {
    label: "Infrastructure",
    fill_hex: "#4a8a82",
    line_hex: "#2e6b65",
    fill_alpha: 96,
    line_alpha: 170,
  },
};

const DEFAULT_PLACE_TYPE_VISUAL: PlaceTypeVisual = {
  label: "Place",
  fill_hex: "#8a8e96",
  line_hex: "#656a75",
  fill_alpha: 72,
  line_alpha: 132,
};

const EVENT_TYPE_VISUALS: Record<string, EventTypeVisual> = {
  infrastructure_change: { label: "Infrastructure", color_hex: "#4f7fd5" },
  environmental: { label: "Environmental", color_hex: "#2f8f83" },
  policy: { label: "Policy", color_hex: "#ba8333" },
  health: { label: "Health", color_hex: "#bf5f52" },
  community: { label: "Community", color_hex: "#7a6294" },
};

const DEFAULT_EVENT_VISUAL: EventTypeVisual = {
  label: "Event",
  color_hex: "#7a7568",
};

const SIGNAL_KIND_VISUALS: Record<string, SignalKindVisual> = {
  public_record: {
    label: "Public record",
    color_hex: "#4a8a5a",
    outline_hex: "#295739",
  },
  candidate: {
    label: "Candidate",
    color_hex: "#c14a2c",
    outline_hex: "#87331d",
  },
};

const DEFAULT_SIGNAL_VISUAL: SignalKindVisual = {
  label: "Signal",
  color_hex: "#3a4f5c",
  outline_hex: "#263944",
};

const LENS_TINTS: Record<AtlasLensId, string> = {
  explore: "#c1843a",
  memory: "#c14a2c",
  safety: "#388480",
  interventions: "#527e52",
  evidence: "#5c6aa0",
};

export const ATLAS_SEMANTIC_STATES: Record<
  AtlasSemanticStateId,
  AtlasSemanticState
> = {
  current: {
    id: "current",
    label: "Current",
    color_hex: "#5471b7",
    outline_hex: "#314f90",
    fill_alpha: 104,
    icon: "●",
    pattern: "solid field",
    stroke_style: "solid",
    elevation: 42,
    animation: "none",
    note: "Reviewed present-day civic state.",
  },
  review: {
    id: "review",
    label: "Review",
    color_hex: "#ba8333",
    outline_hex: "#8e611f",
    fill_alpha: 96,
    icon: "◐",
    pattern: "angled hatch",
    stroke_style: "dashed",
    elevation: 18,
    animation: "pulse",
    note: "Needs corroboration or maintainer review.",
  },
  historical: {
    id: "historical",
    label: "Historical",
    color_hex: "#7a6294",
    outline_hex: "#5b4478",
    fill_alpha: 92,
    icon: "◌",
    pattern: "ghost wash",
    stroke_style: "dotted",
    elevation: 12,
    animation: "drift",
    note: "Past civic condition or memory layer.",
  },
  proposed: {
    id: "proposed",
    label: "Proposed",
    color_hex: "#4a8a82",
    outline_hex: "#2e6b65",
    fill_alpha: 88,
    icon: "▲",
    pattern: "banded field",
    stroke_style: "dashed",
    elevation: 24,
    animation: "pulse",
    note: "Public intervention or future-state proposal.",
  },
  comment: {
    id: "comment",
    label: "Comment",
    color_hex: "#8a6f42",
    outline_hex: "#6c552e",
    fill_alpha: 90,
    icon: "◇",
    pattern: "callout ring",
    stroke_style: "solid",
    elevation: 10,
    animation: "none",
    note: "Geo-anchored comment or annotation.",
  },
  poll: {
    id: "poll",
    label: "Poll",
    color_hex: "#5c6aa0",
    outline_hex: "#414d80",
    fill_alpha: 92,
    icon: "▣",
    pattern: "stacked bands",
    stroke_style: "solid",
    elevation: 16,
    animation: "pulse",
    note: "Civic question or participatory fork.",
  },
  safety: {
    id: "safety",
    label: "Safety",
    color_hex: "#bf5f52",
    outline_hex: "#8e4136",
    fill_alpha: 96,
    icon: "◆",
    pattern: "warning band",
    stroke_style: "solid",
    elevation: 20,
    animation: "pulse",
    note: "Street-safety or public-risk emphasis.",
  },
  source: {
    id: "source",
    label: "Source",
    color_hex: "#4a8a5a",
    outline_hex: "#295739",
    fill_alpha: 90,
    icon: "▥",
    pattern: "source hatch",
    stroke_style: "dashed",
    elevation: 8,
    animation: "none",
    note: "Visible provenance and source support.",
  },
  live_signal: {
    id: "live_signal",
    label: "Live signal",
    color_hex: "#c14a2c",
    outline_hex: "#87331d",
    fill_alpha: 98,
    icon: "✦",
    pattern: "glow ring",
    stroke_style: "solid",
    elevation: 22,
    animation: "pulse",
    note: "Fresh public or candidate signal.",
  },
};

export const ATLAS_STATE_LEGEND_ITEMS: AtlasSemanticState[] = [
  ATLAS_SEMANTIC_STATES.current,
  ATLAS_SEMANTIC_STATES.review,
  ATLAS_SEMANTIC_STATES.source,
  ATLAS_SEMANTIC_STATES.live_signal,
];

export function hexToRgb(hex: string): RgbTuple {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;
  const parsed = Number.parseInt(value, 16);
  return [
    (parsed >> 16) & 255,
    (parsed >> 8) & 255,
    parsed & 255,
  ];
}

export function rgbaTuple(hex: string, alpha: number): RgbaTuple {
  const [red, green, blue] = hexToRgb(hex);
  return [red, green, blue, alpha];
}

export function rgbaCss(hex: string, opacity: number): string {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function blendRgb(base: string, tint: string, ratio: number): RgbTuple {
  const [baseRed, baseGreen, baseBlue] = hexToRgb(base);
  const [tintRed, tintGreen, tintBlue] = hexToRgb(tint);
  const mix = (start: number, end: number) =>
    Math.round(start * (1 - ratio) + end * ratio);
  return [
    mix(baseRed, tintRed),
    mix(baseGreen, tintGreen),
    mix(baseBlue, tintBlue),
  ];
}

export function getPlaceTypeVisual(placeType: string): PlaceTypeVisual {
  return PLACE_TYPE_VISUALS[placeType] ?? DEFAULT_PLACE_TYPE_VISUAL;
}

export function getPlaceFillColor(
  placeType: string,
  activeLens: AtlasLensId,
): RgbaTuple {
  const visual = getPlaceTypeVisual(placeType);
  const [red, green, blue] = blendRgb(
    visual.fill_hex,
    LENS_TINTS[activeLens],
    0.28,
  );
  return [red, green, blue, visual.fill_alpha];
}

export function getPlaceLineColor(placeType: string): RgbaTuple {
  const visual = getPlaceTypeVisual(placeType);
  return rgbaTuple(visual.line_hex, visual.line_alpha);
}

export function getPlaceFillCss(
  placeType: string,
  activeLens: AtlasLensId,
): string {
  const [red, green, blue, alpha] = getPlaceFillColor(placeType, activeLens);
  return `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`;
}

export function getPlaceLineCss(placeType: string): string {
  const [red, green, blue, alpha] = getPlaceLineColor(placeType);
  return `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`;
}

export function getEventFillColor(eventType: string): RgbTuple {
  const visual = EVENT_TYPE_VISUALS[eventType] ?? DEFAULT_EVENT_VISUAL;
  return hexToRgb(visual.color_hex);
}

export function getEventFillCss(eventType: string): string {
  const visual = EVENT_TYPE_VISUALS[eventType] ?? DEFAULT_EVENT_VISUAL;
  return visual.color_hex;
}

export function getSignalFillColor(signalKind: string): RgbTuple {
  const visual = SIGNAL_KIND_VISUALS[signalKind] ?? DEFAULT_SIGNAL_VISUAL;
  return hexToRgb(visual.color_hex);
}

export function getSignalFillCss(signalKind: string): string {
  const visual = SIGNAL_KIND_VISUALS[signalKind] ?? DEFAULT_SIGNAL_VISUAL;
  return visual.color_hex;
}

export function getSignalOutlineCss(signalKind: string): string {
  const visual = SIGNAL_KIND_VISUALS[signalKind] ?? DEFAULT_SIGNAL_VISUAL;
  return visual.outline_hex;
}

export function getPlaceTypeTagColor(placeType: string): string {
  return (
    {
      city: "blue",
      corridor: "cyan",
      ward: "blue",
      parcel: "gold",
      building: "default",
      infrastructure: "cyan",
    }[placeType] ?? "default"
  );
}

export function getConfidenceTagColor(confidence: string): string {
  return (
    {
      high: "green",
      medium: "gold",
      moderate: "gold",
      low: "orange",
      unknown: "default",
      reviewed: "green",
    }[confidence] ?? "default"
  );
}

export function getTrustTierTagColor(trustTier: string): string {
  return (
    {
      official: "green",
      official_spatial: "green",
      official_statistical: "green",
      curated_public_reference: "blue",
      community: "gold",
      automated: "default",
    }[trustTier] ?? "default"
  );
}

export function getReviewTagColor(reviewState: string): string {
  return (
    {
      accepted: "green",
      candidate: "gold",
      needs_review: "gold",
      reviewable_proposal: "gold",
      needs_more_evidence: "orange",
      rejected: "red",
    }[reviewState] ?? "default"
  );
}
