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
  variant?: "floating" | "island";
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
  variant = "floating",
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

  if (variant === "island") {
    // The dynamic island shell IS the card. Sections inside are separated
    // by hairline rules, not by their own card chrome. The prior layout
    // nested half a dozen bordered+tinted subdivs (hero / segments /
    // compare / chips / slider / kpis / kpi-cells), producing the
    // cards-inside-cards-inside-cards stack the rebuild brief called out.
    //
    // The "SCENARIO / [name]" eyebrow + giant h2 are gone: the dynamic
    // island's tab label already names the surface, and the segmented
    // control below shows which scenario is active. The envelope-type
    // legend chips are gone too — they're a render setting that belongs
    // in the Layers panel, not a scenario property. (Follow-up: surface
    // the same counts inside Layers > Building fabric.)
    return (
      <section
        className="atlas-scenario-island"
        aria-label="Scenario controls"
      >
        <div className="atlas-scenario-island__header">
          <div
            className="atlas-scenario-island__segments"
            role="group"
            aria-label="Active scenario"
          >
            {scenarios.map((scenario) => (
              <button
                key={scenario.scenarioId}
                type="button"
                data-active={scenario.scenarioId === activeScenarioId ? "true" : "false"}
                onClick={() => onActiveScenarioChange(scenario.scenarioId)}
              >
                {scenario.name}
              </button>
            ))}
          </div>
          <span className="atlas-scenario-island__count">
            {comparisonLabel}
          </span>
        </div>

        <div className="atlas-scenario-island__compare">
          <label className="atlas-scenario-island__check">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(event) => onCompareEnabledChange(event.target.checked)}
            />
            <span>Compare</span>
          </label>
          <select
            aria-label="Compare scenario"
            value={compareScenarioId}
            onChange={(event) => onCompareScenarioChange(event.target.value)}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.scenarioId} value={scenario.scenarioId}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>

        <div className="atlas-scenario-island__slider">
          <div className="atlas-scenario-island__section-title">
            <Building2 className="h-3.5 w-3.5" />
            <span>Draft height</span>
            <strong>{draftHeightBoostM.toFixed(1)} m</strong>
          </div>
          <input
            aria-label="Height boost"
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={draftHeightBoostM}
            onChange={(event) =>
              onDraftHeightBoostChange(Number(event.target.value))
            }
          />
        </div>

        <div className="atlas-scenario-island__kpis">
          <div className="atlas-scenario-island__section-title">
            <Route className="h-3.5 w-3.5" />
            <span>{selectedPlaceName ?? "City"} KPIs</span>
          </div>
          <div className="atlas-scenario-island__kpi-grid">
            {kpiBundle.metrics.map((metric) => {
              const delta = kpiDelta.metrics.find(
                (candidate) => candidate.kpiId === metric.kpiId,
              );
              return (
                <div key={metric.kpiId} className="atlas-scenario-island__kpi">
                  <span>{metric.label}</span>
                  <strong>{formatMetricCompact(metric.value, metric.unit)}</strong>
                  {compareEnabled && delta ? (
                    <em>{formatSignedMetricCompact(delta.value, metric.unit)}</em>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

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

function formatMetricCompact(value: number, unit: string): string {
  if (unit === "usd/year") {
    return `$${Math.round(value / 1000).toLocaleString()}k/y`;
  }
  if (unit === "people") {
    return `${Math.round(value).toLocaleString()} ppl`;
  }
  if (unit === "index") {
    return `${Number(value.toFixed(2))}x`;
  }
  return formatMetric(value, unit);
}

function formatSignedMetricCompact(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMetricCompact(value, unit)}`;
}
