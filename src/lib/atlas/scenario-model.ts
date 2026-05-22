export type ScenarioRecord = {
  scenarioId: string;
  name: string;
  description: string;
  state: "draft" | "published" | "archived";
  provenance: "actual" | "historical" | "future" | "proposed";
  baseScenarioId: string | null;
  updatedAt: string;
};

export type ScenarioDeltaProperties = {
  parcelKey: string;
  label: string;
  envelopeType: ScenarioEnvelopeType;
  heightDeltaM: number;
  floorAreaDeltaM2: number;
  unitsDelta: number;
  bindingConstraint: string;
};

export type ScenarioDeltaFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  ScenarioDeltaProperties
>;

export type ScenarioComparison = {
  baseScenarioId: string;
  targetScenarioId: string;
  changedParcelCount: number;
  deltaFeatureCollection: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    ScenarioDeltaProperties
  >;
};

export type ScenarioEnvelopeType =
  | "as_of_right"
  | "mixed_use_infill"
  | "missing_middle"
  | "adaptive_reuse"
  | "civic_anchor";

export type ScenarioEnvelopeProperties = {
  envelopeId: string;
  parcelKey: string;
  label: string;
  envelopeType: ScenarioEnvelopeType;
  currentHeightM: number;
  heightM: number;
  floorAreaM2: number;
  units: number;
  confidence: number;
};

export type ScenarioEnvelopeFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  ScenarioEnvelopeProperties
>;

export type ScenarioEnvelopeCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  ScenarioEnvelopeProperties
>;

export const SCENARIO_ENVELOPE_TYPE_LABELS: Record<
  ScenarioEnvelopeType,
  string
> = {
  adaptive_reuse: "Adaptive reuse",
  as_of_right: "As-of-right",
  civic_anchor: "Civic anchor",
  missing_middle: "Missing middle",
  mixed_use_infill: "Mixed-use infill",
};

export type KpiMetric = {
  kpiId: string;
  label: string;
  value: number;
  unit: string;
  uncertaintyLow: number | null;
  uncertaintyHigh: number | null;
  sourceSummary: string;
};

export type KpiBundle = {
  scenarioId: string;
  scope: "city" | "place";
  scopeId: string;
  computedAt: string;
  metrics: KpiMetric[];
};

export type ScenarioDraftEdits = {
  heightBoostM: number;
};

export const ATLAS_SCENARIOS: ScenarioRecord[] = [
  {
    scenarioId: "current",
    name: "Current Flint",
    description: "Present-day public atlas rows.",
    state: "published",
    provenance: "actual",
    baseScenarioId: null,
    updatedAt: "2026-05-22T00:00:00-04:00",
  },
  {
    scenarioId: "safe-routes-starter",
    name: "Safe routes starter",
    description:
      "A starter proposal with corridor improvements and selective parcel capacity changes.",
    state: "draft",
    provenance: "future",
    baseScenarioId: "current",
    updatedAt: "2026-05-22T00:00:00-04:00",
  },
];

const BASE_ENVELOPES: Array<
  Omit<ScenarioEnvelopeProperties, "heightM"> & {
    futureHeightM: number;
    geometry: GeoJSON.Polygon;
  }
> = [
  envelope(
    "env-downtown-saginaw-mixed-use",
    "40-01-154-101",
    "Saginaw mixed-use envelope",
    "mixed_use_infill",
    -83.69372,
    43.0132,
    0.00046,
    0.00034,
    9,
    21,
    2480,
    24,
  ),
  envelope(
    "env-downtown-point-infill",
    "40-01-154-102",
    "Downtown corner infill",
    "mixed_use_infill",
    -83.6939,
    43.01115,
    0.0005,
    0.00036,
    8,
    18,
    1820,
    18,
  ),
  envelope(
    "env-durant-adaptive-reuse",
    "40-01-154-103",
    "Durant adaptive reuse",
    "adaptive_reuse",
    -83.69418,
    43.02055,
    0.00062,
    0.00042,
    17,
    26,
    4260,
    36,
  ),
  envelope(
    "env-riverfront-civic-anchor",
    "40-01-154-104",
    "Riverfront civic anchor",
    "civic_anchor",
    -83.69336,
    43.01772,
    0.00078,
    0.00048,
    14,
    24,
    5400,
    0,
  ),
  envelope(
    "env-bervean-missing-middle",
    "40-01-154-105",
    "Bervean missing-middle envelope",
    "missing_middle",
    -83.69338,
    43.01368,
    0.00038,
    0.0003,
    8,
    15,
    1220,
    14,
  ),
  envelope(
    "env-children-services-missing-middle",
    "40-01-154-106",
    "Neighborhood services infill",
    "missing_middle",
    -83.69372,
    43.0148,
    0.00042,
    0.00032,
    7,
    14,
    980,
    10,
  ),
  envelope(
    "env-white-horse-as-of-right",
    "40-01-154-107",
    "White Horse as-of-right envelope",
    "as_of_right",
    -83.69418,
    43.00928,
    0.0004,
    0.00028,
    7,
    11,
    760,
    4,
  ),
  envelope(
    "env-carriage-town-row-infill",
    "40-01-154-108",
    "Carriage Town row infill",
    "missing_middle",
    -83.70518,
    43.04005,
    0.0007,
    0.0005,
    6,
    13,
    1600,
    18,
  ),
  envelope(
    "env-carriage-town-industrial-adaptive",
    "40-01-154-109",
    "Carriage Town adaptive reuse",
    "adaptive_reuse",
    -83.70556,
    43.03986,
    0.00072,
    0.00044,
    8,
    19,
    2100,
    12,
  ),
  envelope(
    "env-grand-traverse-mixed-use",
    "40-01-154-110",
    "Grand Traverse mixed-use test",
    "mixed_use_infill",
    -83.70786,
    43.0408,
    0.00058,
    0.00038,
    7,
    17,
    1740,
    16,
  ),
];

export function getScenarioComparison(
  baseScenarioId: string,
  targetScenarioId: string,
  edits: ScenarioDraftEdits = { heightBoostM: 0 },
): ScenarioComparison {
  const targetUsesFutureEnvelope = scenarioUsesFutureEnvelope(targetScenarioId);
  const features =
    targetScenarioId === baseScenarioId || !targetUsesFutureEnvelope
      ? []
      : BASE_ENVELOPES.map((feature, index) => {
          const boost = index < 2 ? edits.heightBoostM : 0;
          const heightDeltaM =
            feature.futureHeightM - feature.currentHeightM + boost;
          return {
            type: "Feature",
            geometry: feature.geometry,
            properties: {
              parcelKey: feature.parcelKey,
              label: feature.label,
              envelopeType: feature.envelopeType,
              heightDeltaM,
              floorAreaDeltaM2:
                feature.floorAreaM2 * Math.max(0.18, heightDeltaM / 24),
              unitsDelta:
                feature.units + (index < 2 ? Math.round(boost * 1.5) : 0),
              bindingConstraint:
                feature.envelopeType === "as_of_right" ? "setback" : "height",
            },
          } satisfies ScenarioDeltaFeature;
        });

  return {
    baseScenarioId,
    targetScenarioId,
    changedParcelCount: features.length,
    deltaFeatureCollection: {
      type: "FeatureCollection",
      features,
    },
  };
}

export function getScenarioEnvelopeCollection(
  scenarioId: string,
  edits: ScenarioDraftEdits = { heightBoostM: 0 },
): ScenarioEnvelopeCollection {
  const usesFutureEnvelope = scenarioUsesFutureEnvelope(scenarioId);
  const features = BASE_ENVELOPES.map((feature, index) => {
    const boost = usesFutureEnvelope && index < 2 ? edits.heightBoostM : 0;
    const heightM =
      usesFutureEnvelope ? feature.futureHeightM + boost : feature.currentHeightM;
    return {
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        envelopeId: feature.envelopeId,
        parcelKey: feature.parcelKey,
        label: feature.label,
        envelopeType: feature.envelopeType,
        currentHeightM: feature.currentHeightM,
        heightM,
        floorAreaM2: feature.floorAreaM2,
        units: feature.units,
        confidence: feature.confidence,
      },
    } satisfies ScenarioEnvelopeFeature;
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export function getKpiBundle(
  scenarioId: string,
  scope: "city" | "place" = "city",
  scopeId = "flint",
  edits: ScenarioDraftEdits = { heightBoostM: 0 },
): KpiBundle {
  const boost = scenarioId === "current" ? 0 : edits.heightBoostM;
  const current = [
    metric("population_capacity", "Population capacity", 142, "people", 122, 162),
    metric("tax_base_capacity", "Tax base capacity", 284000, "usd/year", 203000, 379000),
    metric("infrastructure_load", "Infrastructure load", 1.0, "index", 0.9, 1.15),
  ];
  const future = [
    metric("population_capacity", "Population capacity", 169 + boost * 2.1, "people", 145, 193),
    metric("tax_base_capacity", "Tax base capacity", 328100 + boost * 2940, "usd/year", 234400, 437500),
    metric("infrastructure_load", "Infrastructure load", 1.08 + boost * 0.01, "index", 0.98, 1.26),
  ];
  return {
    scenarioId,
    scope,
    scopeId,
    computedAt: "2026-05-22T00:00:00-04:00",
    metrics: scenarioId === "current" ? current : future,
  };
}

export function getKpiDelta(
  baseScenarioId: string,
  targetScenarioId: string,
  scope: "city" | "place" = "city",
  scopeId = "flint",
  edits: ScenarioDraftEdits = { heightBoostM: 0 },
): KpiBundle {
  const base = getKpiBundle(baseScenarioId, scope, scopeId, edits);
  const target = getKpiBundle(targetScenarioId, scope, scopeId, edits);
  return {
    scenarioId: `${targetScenarioId}-vs-${baseScenarioId}`,
    scope,
    scopeId,
    computedAt: "2026-05-22T00:00:00-04:00",
    metrics: target.metrics.map((targetMetric) => {
      const baseMetric = base.metrics.find(
        (candidate) => candidate.kpiId === targetMetric.kpiId,
      );
      return {
        ...targetMetric,
        value: targetMetric.value - (baseMetric?.value ?? 0),
        uncertaintyLow:
          targetMetric.uncertaintyLow != null && baseMetric?.uncertaintyHigh != null
            ? targetMetric.uncertaintyLow - baseMetric.uncertaintyHigh
            : null,
        uncertaintyHigh:
          targetMetric.uncertaintyHigh != null && baseMetric?.uncertaintyLow != null
            ? targetMetric.uncertaintyHigh - baseMetric.uncertaintyLow
            : null,
        sourceSummary: `Delta between ${targetScenarioId} and ${baseScenarioId}.`,
      };
    }),
  };
}

function scenarioUsesFutureEnvelope(scenarioId: string): boolean {
  const scenario = ATLAS_SCENARIOS.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  return Boolean(
    scenario &&
      scenario.scenarioId !== "current" &&
      scenario.provenance !== "actual",
  );
}

function metric(
  kpiId: string,
  label: string,
  value: number,
  unit: string,
  uncertaintyLow: number | null,
  uncertaintyHigh: number | null,
): KpiMetric {
  return {
    kpiId,
    label,
    value,
    unit,
    uncertaintyLow,
    uncertaintyHigh,
    sourceSummary: "Scenario-aware envelope aggregate with cited city-pack multipliers.",
  };
}

function envelope(
  envelopeId: string,
  parcelKey: string,
  label: string,
  envelopeType: ScenarioEnvelopeType,
  lng: number,
  lat: number,
  widthLng: number,
  heightLat: number,
  currentHeightM: number,
  futureHeightM: number,
  floorAreaM2: number,
  units: number,
): Omit<ScenarioEnvelopeProperties, "heightM"> & {
  futureHeightM: number;
  geometry: GeoJSON.Polygon;
} {
  const west = lng - widthLng / 2;
  const east = lng + widthLng / 2;
  const south = lat - heightLat / 2;
  const north = lat + heightLat / 2;
  return {
    envelopeId,
    parcelKey,
    label,
    envelopeType,
    currentHeightM,
    futureHeightM,
    floorAreaM2,
    units,
    confidence: 0.74,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}
