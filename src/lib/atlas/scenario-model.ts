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

const BASE_DELTAS: ScenarioDeltaFeature[] = [
  {
    type: "Feature",
    properties: {
      parcelKey: "40-01-154-012",
      label: "Carriage Town mixed-use envelope",
      heightDeltaM: 7.3,
      floorAreaDeltaM2: 640,
      unitsDelta: 8,
      bindingConstraint: "height",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-83.709354, 43.041493],
          [-83.709206, 43.041495],
          [-83.7092, 43.041192],
          [-83.709345, 43.041189],
          [-83.709354, 43.041493],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      parcelKey: "40-01-154-018",
      label: "Grand Traverse infill test",
      heightDeltaM: 4.2,
      floorAreaDeltaM2: 410,
      unitsDelta: 5,
      bindingConstraint: "far",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-83.70798, 43.04092],
          [-83.70771, 43.04092],
          [-83.70772, 43.04067],
          [-83.70799, 43.04068],
          [-83.70798, 43.04092],
        ],
      ],
    },
  },
];

export function getScenarioComparison(
  baseScenarioId: string,
  targetScenarioId: string,
  edits: ScenarioDraftEdits = { heightBoostM: 0 },
): ScenarioComparison {
  const features =
    targetScenarioId === baseScenarioId
      ? []
      : BASE_DELTAS.map((feature, index) => ({
          ...feature,
          properties: {
            ...feature.properties,
            heightDeltaM:
              feature.properties.heightDeltaM +
              (index === 0 ? edits.heightBoostM : 0),
            floorAreaDeltaM2:
              feature.properties.floorAreaDeltaM2 +
              (index === 0 ? edits.heightBoostM * 70 : 0),
            unitsDelta:
              feature.properties.unitsDelta +
              (index === 0 ? Math.max(0, Math.round(edits.heightBoostM)) : 0),
          },
        }));

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
