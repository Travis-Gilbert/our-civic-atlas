"use client";

import { Building2, Layers3, Route } from "lucide-react";
import type {
  KpiBundle,
  ScenarioComparison,
  ScenarioEnvelopeType,
  ScenarioRecord,
} from "@/lib/atlas/scenario-model";

type ScenarioControlsProps = {
  scenarios: ScenarioRecord[];
  activeScenarioId: string;
  compareScenarioId: string;
  compareEnabled: boolean;
  draftHeightBoostM: number;
  comparison: ScenarioComparison;
  envelopeTypeCounts: Array<{
    count: number;
    label: string;
    type: ScenarioEnvelopeType;
  }>;
  kpiBundle: KpiBundle;
  kpiDelta: KpiBundle;
  selectedPlaceName: string | null;
  onActiveScenarioChange: (scenarioId: string) => void;
  onCompareScenarioChange: (scenarioId: string) => void;
  onCompareEnabledChange: (enabled: boolean) => void;
  onDraftHeightBoostChange: (heightBoostM: number) => void;
};

export function ScenarioControls({
  scenarios,
  activeScenarioId,
  compareScenarioId,
  compareEnabled,
  draftHeightBoostM,
  comparison,
  envelopeTypeCounts,
  kpiBundle,
  kpiDelta,
  selectedPlaceName,
  onActiveScenarioChange,
  onCompareScenarioChange,
  onCompareEnabledChange,
  onDraftHeightBoostChange,
}: ScenarioControlsProps) {
  const activeScenario = scenarios.find(
    (scenario) => scenario.scenarioId === activeScenarioId,
  );
  const comparisonLabel = `${comparison.changedParcelCount} changed parcel${
    comparison.changedParcelCount === 1 ? "" : "s"
  }`;

  return (
    <aside
      className="atlas-scenario-controls pointer-events-auto"
      aria-label="Scenario controls"
    >
      <div className="atlas-scenario-controls__header">
        <span className="atlas-scenario-controls__icon">
          <Layers3 className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="atlas-scenario-controls__eyebrow">Scenarios</p>
          <h2>{activeScenario?.name ?? activeScenarioId}</h2>
        </div>
      </div>

      <div className="atlas-scenario-controls__grid">
        <label>
          <span>Active</span>
          <select
            value={activeScenarioId}
            onChange={(event) => onActiveScenarioChange(event.target.value)}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.scenarioId} value={scenario.scenarioId}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Compare</span>
          <select
            value={compareScenarioId}
            onChange={(event) => onCompareScenarioChange(event.target.value)}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.scenarioId} value={scenario.scenarioId}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="atlas-scenario-controls__toggle">
        <input
          type="checkbox"
          checked={compareEnabled}
          onChange={(event) => onCompareEnabledChange(event.target.checked)}
        />
        <span>Compare envelopes</span>
        <strong>{comparisonLabel}</strong>
      </label>

      <div className="atlas-scenario-envelope-types">
        {envelopeTypeCounts
          .filter((item) => item.count > 0)
          .map((item) => (
            <span key={item.type} data-envelope-type={item.type}>
              <i aria-hidden="true" />
              {item.label}
              <strong>{item.count}</strong>
            </span>
          ))}
      </div>

      <div className="atlas-scenario-editor">
        <div className="atlas-scenario-editor__title">
          <Building2 className="h-3.5 w-3.5" />
          <span>Draft envelope edit</span>
        </div>
        <label>
          <span>Height boost</span>
          <input
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={draftHeightBoostM}
            onChange={(event) =>
              onDraftHeightBoostChange(Number(event.target.value))
            }
          />
          <output>{draftHeightBoostM.toFixed(1)} m</output>
        </label>
      </div>

      <div className="atlas-scenario-kpis">
        <div className="atlas-scenario-kpis__title">
          <Route className="h-3.5 w-3.5" />
          <span>{selectedPlaceName ?? "City"} KPIs</span>
        </div>
        {kpiBundle.metrics.map((metric) => {
          const delta = kpiDelta.metrics.find(
            (candidate) => candidate.kpiId === metric.kpiId,
          );
          return (
            <div key={metric.kpiId} className="atlas-scenario-kpi-row">
              <span>{metric.label}</span>
              <strong>{formatMetric(metric.value, metric.unit)}</strong>
              {compareEnabled && delta ? (
                <em>{formatSignedMetric(delta.value, metric.unit)}</em>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function formatMetric(value: number, unit: string): string {
  const rounded = Math.abs(value) >= 1000 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded.toLocaleString()} ${unit}`;
}

function formatSignedMetric(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMetric(value, unit)}`;
}
