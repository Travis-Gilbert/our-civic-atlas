import type { AtlasLensId } from "./scene-view";

export type AnalyticalRendererBoundaryId = "analytics";

export type AnalyticalSelectionId =
  | "timeFilter"
  | "placeFilter"
  | "eventTypeFacet"
  | "severityFacet"
  | "corridorFacet"
  | "sourceTierFacet"
  | "statusFacet";

export type CardChartType =
  | "rect"
  | "line"
  | "area"
  | "dot"
  | "staticSummary";

export type CardRendererKind = "vgplot" | "observablePlot";

export type CardDataSource =
  | {
      kind: "atlasTable";
      tableName: "atlas_events";
      layerId: "legacy:atlas-events";
      statusLabel: "PUBLIC_FIXTURE";
    }
  | {
      kind: "layerView";
      layerId: string;
    };

export type CardEncoding = {
  x: string;
  y?: "count" | "sum" | "avg" | string;
  bin?: "hour" | "day" | "year" | "decade";
  aggregate?: "count" | "sum" | "avg";
  colorField?: string;
  fields: string[];
  facetField?: string;
  numericField?: string;
};

export type CardScope = {
  modes: AtlasLensId[];
  requiresLayerPresent?: boolean;
  requiresPlaceSelection?: boolean;
  requiresNoPlaceSelection?: boolean;
  hideWhenEmpty?: boolean;
};

export type CardHonesty = {
  statusSource: "layerView" | "legacyPublicFixture";
  fixtureLabel?: string;
  inferredPolicy: "showStatus" | "markInferredPortion";
};

export type CardSpec = {
  id: string;
  title: string;
  layer: CardDataSource;
  rendererBoundaryId: AnalyticalRendererBoundaryId;
  renderer: CardRendererKind;
  chartType: CardChartType;
  encoding: CardEncoding;
  selections: {
    reads: AnalyticalSelectionId[];
    writes: AnalyticalSelectionId[];
  };
  scope: CardScope;
  honesty: CardHonesty;
  mobileStrategy: "compact";
};

export type CardScopeState = {
  activeMode: AtlasLensId;
  selectedPlaceId?: string | null;
  availableLayerIds?: Iterable<string>;
};

const LEGACY_EVENTS_LAYER: CardDataSource = {
  kind: "atlasTable",
  tableName: "atlas_events",
  layerId: "legacy:atlas-events",
  statusLabel: "PUBLIC_FIXTURE",
};

export const ANALYTICAL_CARD_REGISTRY: CardSpec[] = [
  {
    id: "memory-events-by-decade",
    title: "Historical events by decade",
    layer: LEGACY_EVENTS_LAYER,
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "time_start",
      y: "count",
      bin: "year",
      aggregate: "count",
      fields: ["event_id", "event_type", "place_id", "time_start", "time_end"],
      facetField: "event_type",
    },
    selections: {
      reads: ["timeFilter", "placeFilter"],
      writes: ["timeFilter"],
    },
    scope: {
      modes: ["memory"],
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "legacyPublicFixture",
      fixtureLabel: "public read-model events",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "memory-building-presence-intervals",
    title: "Building presence intervals",
    layer: { kind: "layerView", layerId: "layer:reconstruction:flint:historical" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "year_value",
      y: "count",
      bin: "decade",
      aggregate: "count",
      colorField: "status",
      fields: ["id", "place_id", "year_value", "decade", "status"],
    },
    selections: {
      reads: ["timeFilter", "placeFilter"],
      writes: ["timeFilter"],
    },
    scope: {
      modes: ["memory"],
      requiresLayerPresent: true,
      requiresPlaceSelection: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "markInferredPortion",
    },
    mobileStrategy: "compact",
  },
  {
    id: "safety-traffic-observations",
    title: "Traffic records by observation",
    layer: { kind: "layerView", layerId: "layer:traffic:flint-downtown" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "observed_ms",
      y: "count",
      bin: "hour",
      aggregate: "count",
      fields: ["id", "observed_ms", "corridor", "numeric_value", "confidence"],
    },
    selections: {
      reads: ["timeFilter", "corridorFacet"],
      writes: ["timeFilter"],
    },
    scope: {
      modes: ["safety"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      fixtureLabel: "historic average / fixture-backed traffic",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "safety-corridor-records",
    title: "Traffic by corridor",
    layer: { kind: "layerView", layerId: "layer:traffic:flint-downtown" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "corridor",
      y: "count",
      aggregate: "count",
      colorField: "corridor",
      fields: ["id", "corridor", "numeric_value", "confidence"],
      facetField: "corridor",
    },
    selections: {
      reads: ["timeFilter"],
      writes: ["corridorFacet"],
    },
    scope: {
      modes: ["safety"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      fixtureLabel: "historic average / fixture-backed traffic",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "safety-injury-severity",
    title: "Crash injury severity",
    layer: { kind: "layerView", layerId: "layer:safety:flint-crashes" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "severity",
      y: "count",
      aggregate: "count",
      colorField: "severity",
      fields: ["id", "severity", "year_value", "place_id"],
      facetField: "severity",
    },
    selections: {
      reads: ["timeFilter", "placeFilter"],
      writes: ["severityFacet"],
    },
    scope: {
      modes: ["safety"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "markInferredPortion",
    },
    mobileStrategy: "compact",
  },
  {
    id: "sources-freshness-histogram",
    title: "Source freshness",
    layer: { kind: "layerView", layerId: "layer:sources:flint" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "freshness",
      y: "count",
      aggregate: "count",
      colorField: "freshness",
      fields: ["id", "freshness", "source_tier", "status"],
    },
    selections: {
      reads: ["sourceTierFacet", "statusFacet"],
      writes: ["statusFacet"],
    },
    scope: {
      modes: ["evidence"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "sources-trust-tiers",
    title: "Source trust tiers",
    layer: { kind: "layerView", layerId: "layer:sources:flint" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "source_tier",
      y: "count",
      aggregate: "count",
      colorField: "source_tier",
      fields: ["id", "source_tier", "freshness", "status"],
      facetField: "source_tier",
    },
    selections: {
      reads: ["statusFacet"],
      writes: ["sourceTierFacet"],
    },
    scope: {
      modes: ["evidence"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "sources-coverage-summary",
    title: "Source coverage",
    layer: { kind: "layerView", layerId: "layer:sources:flint" },
    rendererBoundaryId: "analytics",
    renderer: "observablePlot",
    chartType: "staticSummary",
    encoding: {
      x: "category",
      y: "count",
      aggregate: "count",
      fields: ["id", "category", "source_tier", "place_id"],
    },
    selections: {
      reads: ["placeFilter", "sourceTierFacet"],
      writes: [],
    },
    scope: {
      modes: ["evidence"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
  {
    id: "interventions-project-timeline",
    title: "Project timeline",
    layer: { kind: "layerView", layerId: "layer:interventions:flint-projects" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "observed_ms",
      y: "count",
      bin: "year",
      aggregate: "count",
      colorField: "status",
      fields: ["id", "observed_ms", "status", "funding_status", "place_id"],
    },
    selections: {
      reads: ["placeFilter", "statusFacet"],
      writes: ["timeFilter"],
    },
    scope: {
      modes: ["interventions"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "markInferredPortion",
    },
    mobileStrategy: "compact",
  },
  {
    id: "interventions-status-distribution",
    title: "Project status",
    layer: { kind: "layerView", layerId: "layer:interventions:flint-projects" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "status",
      y: "count",
      aggregate: "count",
      colorField: "status",
      fields: ["id", "status", "funding_status", "place_id"],
      facetField: "status",
    },
    selections: {
      reads: ["placeFilter", "timeFilter"],
      writes: ["statusFacet"],
    },
    scope: {
      modes: ["interventions"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "markInferredPortion",
    },
    mobileStrategy: "compact",
  },
  {
    id: "interventions-funding-status",
    title: "Funding status",
    layer: { kind: "layerView", layerId: "layer:interventions:flint-projects" },
    rendererBoundaryId: "analytics",
    renderer: "observablePlot",
    chartType: "staticSummary",
    encoding: {
      x: "funding_status",
      y: "count",
      aggregate: "count",
      colorField: "funding_status",
      fields: ["id", "funding_status", "status", "place_id"],
    },
    selections: {
      reads: ["placeFilter", "statusFacet"],
      writes: [],
    },
    scope: {
      modes: ["interventions"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "markInferredPortion",
    },
    mobileStrategy: "compact",
  },
  {
    id: "interventions-event-surface-categories",
    title: "Event surface categories",
    layer: { kind: "layerView", layerId: "layer:event-surface:flint:porchfest-2026" },
    rendererBoundaryId: "analytics",
    renderer: "vgplot",
    chartType: "rect",
    encoding: {
      x: "category",
      y: "count",
      aggregate: "count",
      colorField: "category",
      fields: ["id", "category", "status", "place_id"],
      facetField: "event_type",
    },
    selections: {
      reads: ["placeFilter", "timeFilter"],
      writes: ["eventTypeFacet"],
    },
    scope: {
      modes: ["interventions"],
      requiresLayerPresent: true,
      hideWhenEmpty: true,
    },
    honesty: {
      statusSource: "layerView",
      inferredPolicy: "showStatus",
    },
    mobileStrategy: "compact",
  },
];

export function getAnalyticalCards(): CardSpec[] {
  return ANALYTICAL_CARD_REGISTRY;
}

export function getAnalyticalCard(cardId: string): CardSpec | undefined {
  return ANALYTICAL_CARD_REGISTRY.find((card) => card.id === cardId);
}

export function getAnalyticalCardsForScope(state: CardScopeState): CardSpec[] {
  const available = new Set(state.availableLayerIds ?? []);
  return ANALYTICAL_CARD_REGISTRY.filter((card) => {
    if (!card.scope.modes.includes(state.activeMode)) return false;
    if (card.scope.requiresPlaceSelection && !state.selectedPlaceId) return false;
    if (card.scope.requiresNoPlaceSelection && state.selectedPlaceId) return false;
    if (
      card.scope.requiresLayerPresent &&
      card.layer.kind === "layerView" &&
      !available.has(card.layer.layerId)
    ) {
      return false;
    }
    return true;
  });
}

export function layerIdsForCards(cards: Iterable<CardSpec>): string[] {
  return Array.from(
    new Set(
      Array.from(cards)
        .map((card) => (card.layer.kind === "layerView" ? card.layer.layerId : null))
        .filter((layerId): layerId is string => layerId !== null),
    ),
  );
}
