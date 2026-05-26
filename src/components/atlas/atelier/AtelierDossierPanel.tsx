"use client";

/**
 * AtelierDossierPanel - PT-404
 *
 * Right-anchored side panel rendering the reconstruction's per-part spec.
 * Civic-language labels per Lost Flint brainstorm T6 (Mass -> "Shape and
 * size", Facade -> "Walls", Roof -> "Roof", GroundFloor -> "Street level").
 *
 * Sections per spec lines 197-235:
 *   - Header (subject name + circa year)
 *   - MASS / FACADE / ROOF / GROUND FLOOR rows with civic-language labels
 *   - Conflicts list (count + brief)
 *   - Sources list (per-type chip)
 *
 * Reads from `AtelierDossier` (the GraphQL `ReconstructionDossier` shape
 * after codegen) or the fixture synthesizer.
 */

import type { AtelierDossier } from "@/lib/atlas/use-reconstruction-dossier";
import {
  AtelierDossierControls,
} from "@/components/atlas/atelier/AtelierControls";

type AtelierDossierPanelProps = {
  dossier: AtelierDossier;
  year: number;
  source: "graphql" | "fallback" | "none";
  onReplay: () => void;
};

const PART_LABEL: Record<string, string> = {
  mass: "Shape and size",
  facade: "Walls",
  roof: "Roof",
  ground_floor: "Street level",
};

function formatConfidence(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value < 0.6) return "contested";
  if (value < 0.9) return `${Math.round(value * 100)}%`;
  return "documented";
}

function PartRow({
  label,
  value,
  confidence,
  citation,
}: {
  label: string;
  value: string;
  confidence?: number | null;
  citation?: string;
}) {
  return (
    <div className="atelier-dossier__row">
      <span className="atelier-dossier__row-label">{label}</span>
      <span className="atelier-dossier__row-value">
        {value}
        {confidence != null ? (
          <span className="atelier-dossier__row-citation" style={{ marginLeft: 6 }}>
            ({formatConfidence(confidence)})
          </span>
        ) : null}
        {citation ? (
          <span className="atelier-dossier__row-citation" style={{ marginLeft: 6 }}>
            {citation}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Empty state for a section where the spec wants per-part data but the
 * fixture / backend has not provided it yet. Honest about the gap
 * instead of inventing values. Per project CLAUDE.md no-fake-UI rule.
 */
function PartUndocumented({
  label,
  reason,
}: {
  label: string;
  reason?: string;
}) {
  return (
    <div className="atelier-dossier__row">
      <span className="atelier-dossier__row-label">{label}</span>
      <span
        className="atelier-dossier__row-citation"
        style={{ fontStyle: "italic" }}
      >
        {reason ?? "not documented"}
      </span>
    </div>
  );
}

/**
 * Compact list of evidence-item summaries that cite a part. Filters
 * the full evidence bundle by targetNodeId match. Used as a per-part
 * footer so the user sees WHICH sources back each row.
 */
function CitedBy({
  evidence,
  partTokens,
}: {
  evidence: AtelierDossier["evidence"];
  partTokens: readonly string[];
}) {
  const matched = evidence.items.filter((item) => {
    if (!item.targetNodeId) return false;
    return partTokens.some((token) => item.targetNodeId?.endsWith(`:${token}`));
  });
  if (matched.length === 0) return null;
  return (
    <p
      className="atelier-dossier__row-citation"
      style={{ marginTop: 6, opacity: 0.75 }}
    >
      Cited by: {matched.map((item) => item.source.name).join(", ")}
    </p>
  );
}

export function AtelierDossierPanel({
  dossier,
  year,
  source,
  onReplay,
}: AtelierDossierPanelProps) {
  const { reconstruction, conflicts, evidence, summary } = dossier;
  const sourceCount = evidence.totalCount;
  const conflictCount = conflicts.length;

  return (
    <div>
      <header className="atelier-dossier__header">
        <h2 className="atelier-dossier__title">Reconstruction</h2>
        <p className="atelier-dossier__subtitle">
          {reconstruction.name} · circa {year}
        </p>
        <p className="atelier-dossier__caption">{summary}</p>
        {source === "fallback" ? (
          <p
            className="atelier-dossier__caption"
            style={{ marginTop: 8, fontStyle: "italic", opacity: 0.7 }}
          >
            Preview from checked-in public records.
          </p>
        ) : null}
      </header>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>{PART_LABEL.mass}</span>
        </p>
        <PartRow
          label="Footprint"
          value={`${reconstruction.footprint.widthMeters.toFixed(0)} m × ${reconstruction.footprint.depthMeters.toFixed(0)} m`}
        />
        <PartRow
          label="Height"
          value={`${reconstruction.heightMeters.toFixed(1)} m`}
          confidence={reconstruction.confidence}
        />
        <CitedBy
          evidence={evidence}
          partTokens={["mass", "level:0", "building"]}
        />
      </section>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>{PART_LABEL.facade}</span>
        </p>
        <PartRow
          label="Confidence"
          value={formatConfidence(
            reconstruction.facadeConfidence ?? reconstruction.confidence,
          )}
          confidence={reconstruction.facadeConfidence ?? reconstruction.confidence}
        />
        <PartUndocumented label="Material" />
        <PartUndocumented label="Color" />
        <PartUndocumented label="Bays" />
        <CitedBy
          evidence={evidence}
          partTokens={["facade", "opening_grid"]}
        />
      </section>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>{PART_LABEL.roof}</span>
        </p>
        <PartRow
          label="Form"
          value={reconstruction.roofForm?.toLowerCase() ?? "flat"}
          confidence={reconstruction.roofConfidence ?? reconstruction.confidence}
        />
        <PartUndocumented label="Material" />
        <CitedBy evidence={evidence} partTokens={["roof"]} />
      </section>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>{PART_LABEL.ground_floor}</span>
        </p>
        <PartRow
          label="Confidence"
          value={formatConfidence(
            reconstruction.groundFloorConfidence ?? reconstruction.confidence,
          )}
          confidence={
            reconstruction.groundFloorConfidence ?? reconstruction.confidence
          }
        />
        <PartUndocumented
          label="Use"
          reason="not in current fixture"
        />
        <CitedBy evidence={evidence} partTokens={["ground_floor"]} />
      </section>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>Conflicts</span>
          <span>{conflictCount}</span>
        </p>
        {conflictCount === 0 ? (
          <p className="atelier-dossier__caption">
            No conflicts. Sources agree on every documented part.
          </p>
        ) : (
          conflicts.map((conflict) => (
            <PartRow
              key={conflict.id}
              label={conflict.fieldLabel}
              value={conflict.resolvedValue}
              citation={conflict.resolutionExplanation}
            />
          ))
        )}
      </section>

      <section className="atelier-dossier__section">
        <p className="atelier-dossier__section-title">
          <span>Sources</span>
          <span>{sourceCount}</span>
        </p>
        {sourceCount === 0 ? (
          <p className="atelier-dossier__caption">
            No sources recorded. This reconstruction is provisional.
          </p>
        ) : (
          evidence.items.map((item) => (
            <PartRow
              key={item.id}
              label={item.source.name}
              value={item.sourceDateLabel ?? item.evidenceType.toLowerCase()}
              citation={item.summary ?? undefined}
            />
          ))
        )}
      </section>

      <AtelierDossierControls
        reconstructionId={reconstruction.id}
        year={year}
        onReplay={onReplay}
      />
    </div>
  );
}
