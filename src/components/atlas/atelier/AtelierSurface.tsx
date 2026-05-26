"use client";

/**
 * AtelierSurface - PT-203 (minimal scaffold)
 *
 * The takeover surface that mounts when the user navigates to
 * `/open-flint-atlas/atelier/[parcelId]/[year]`. Hosts the R3F scene
 * (placeholder until PT-204), the dossier side panel, and the top
 * chrome (RECONSTRUCTING label + Skip / Exit).
 *
 * v1 minimal scaffold ships these:
 *   - Atelier theme paper register (atelier.css `.atelier-theme`)
 *   - Chrome label per spec lines 56-60
 *   - Dossier panel with per-part rows + conflicts + sources
 *   - Skip / Exit controls (top chrome) + Replay / Save controls (dossier)
 *   - Real save wiring via `useReconstructionSave` (Decision 6)
 *   - Fallback synthesizer for the dossier when GraphQL resolver is down
 *
 * What lands in later checklist items:
 *   - PT-204: R3F scene replaces the placeholder
 *   - PT-301 to PT-311: choreographer + 8 animation stages
 *   - PT-401, PT-402, PT-403: source cards, conflict markers, provenance lines
 */

import { useEffect } from "react";

import { useReconstructionDossier } from "@/lib/atlas/use-reconstruction-dossier";
import { useAtelierChoreographer } from "@/lib/atlas/use-atelier-choreographer";
import { AtelierChromeLabel } from "@/components/atlas/atelier/AtelierChromeLabel";
import { AtelierTopControls } from "@/components/atlas/atelier/AtelierControls";
import { AtelierDossierPanel } from "@/components/atlas/atelier/AtelierDossierPanel";
import { AtelierEvidenceCard } from "@/components/atlas/atelier/AtelierEvidenceCard";
import { AtelierProvenanceLines } from "@/components/atlas/atelier/AtelierProvenanceLines";
import { AtelierR3FScene } from "@/components/atlas/atelier/AtelierR3FScene";

type AtelierSurfaceProps = {
  reconstructionId: string;
  parcelId: string;
  year: number;
};

/**
 * Card positioning with Stage 1 arrival animation. Cards animate in
 * from off-screen during `evidence_gathering` (spec lines 64-77).
 * After Stage 1 completes they hold at their resting positions.
 *
 * Geographic-provenance positioning per spec line 66 lands later
 * (depends on the R3F scene knowing card target coordinates in scene
 * space). For v1 the cards rest at alternating left/right margins.
 */
function cardPositionForStage(
  index: number,
  total: number,
  choreographyState: import("@/lib/atlas/atelier-choreographer").ChoreographerState,
): React.CSSProperties {
  const isLeft = index % 2 === 0;
  const verticalSlot = Math.floor(index / 2);
  const slotHeight = 160;
  const slotGap = 24;
  const topBase = 80;

  // Resting positions.
  const restTop =
    total <= 2
      ? topBase + index * (slotHeight + slotGap)
      : topBase + verticalSlot * (slotHeight + slotGap);
  const sideOffset = 32;

  // Stage 1 arrival animation. Per spec lines 64-77, cards arrive
  // staggered from off-screen and settle. During earlier stages (Stage 0
  // entry) cards are not yet in the scene; during Stage 2+ they are
  // settled.
  const stage = choreographyState.stage;
  const skipped = choreographyState.skipped;

  if (skipped) {
    return {
      top: restTop,
      [isLeft ? "left" : "right"]: sideOffset,
      opacity: 1,
    };
  }

  if (stage === "entry") {
    // Pre-arrival: cards are off-screen and invisible.
    return {
      top: restTop,
      [isLeft ? "left" : "right"]: -360,
      opacity: 0,
    };
  }

  if (stage === "evidence_gathering") {
    // Stagger: each card arrives at a different fraction of stage progress.
    const cardStart = (index * 0.6) / Math.max(total, 1);
    const cardEnd = cardStart + 0.4;
    const raw =
      (choreographyState.stageProgress - cardStart) / (cardEnd - cardStart);
    const t = Math.max(0, Math.min(1, raw));
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const startOffset = -360;
    const arrivalOffset = startOffset + (sideOffset - startOffset) * eased;
    return {
      top: restTop,
      [isLeft ? "left" : "right"]: arrivalOffset,
      opacity: eased,
    };
  }

  // Stage 2 onward: cards rest.
  return {
    top: restTop,
    [isLeft ? "left" : "right"]: sideOffset,
    opacity: 1,
  };
}

export function AtelierSurface({
  reconstructionId,
  parcelId,
  year,
}: AtelierSurfaceProps) {
  const { dossier, loading, error, source } = useReconstructionDossier(
    reconstructionId,
    { fallback: true, parcelId, year },
  );
  const { state: choreographyState, start, skip, replay } =
    useAtelierChoreographer();

  // Auto-start the choreographer once the dossier resolves. Replays
  // require explicit click (PT-310 contract).
  useEffect(() => {
    if (!dossier) return;
    start();
    // start identity is stable across renders (useCallback in the hook)
  }, [dossier, start]);

  const titleLine = dossier
    ? `${parcelId.toUpperCase()} · CIRCA ${year}`
    : `LOADING · ${parcelId.toUpperCase()}`;

  const eyebrow =
    choreographyState.stage === "settled" || choreographyState.skipped
      ? "RECONSTRUCTED"
      : "RECONSTRUCTING";

  return (
    <div
      className="atelier-surface"
      data-stage={choreographyState.stage}
      data-stage-progress={choreographyState.stageProgress.toFixed(3)}
      data-playing={choreographyState.playing ? "true" : "false"}
      data-skipped={choreographyState.skipped ? "true" : "false"}
    >
      <div className="atelier-surface__chrome">
        <AtelierChromeLabel eyebrow={eyebrow} title={titleLine} />
        <AtelierTopControls onSkip={skip} />
      </div>

      <div className="atelier-surface__scene">
        {dossier ? (
          <>
            <AtelierR3FScene
              reconstruction={dossier.reconstruction}
              conflicts={dossier.conflicts}
              choreographyState={choreographyState}
            />
            {dossier.evidence.items.map((item, index) => (
              <AtelierEvidenceCard
                key={item.id}
                item={item}
                style={cardPositionForStage(
                  index,
                  dossier.evidence.items.length,
                  choreographyState,
                )}
              />
            ))}
            <AtelierProvenanceLines choreographyState={choreographyState} />
            {/*
              Stage 4 pulse rings. Spec lines 106-110: a soft expanding
              ring radiates twice from the focus building. CSS-driven
              via .atelier-surface[data-stage="pairformer_inference"]
              attribute selector. Inert under reduced-motion (atelier.css
              hides the rings and the scene darken in that media query).
              aria-hidden because the inference event is already
              announced via the dossier label transition.
            */}
            <div
              className="atelier-surface__pulse-rings"
              aria-hidden="true"
            >
              <div className="atelier-surface__pulse-ring atelier-surface__pulse-ring--a" />
              <div className="atelier-surface__pulse-ring atelier-surface__pulse-ring--b" />
            </div>
          </>
        ) : null}
      </div>

      <div className="atelier-surface__dossier">
        {loading && !dossier ? (
          <p
            style={{
              color: "var(--atelier-ink-mute)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Loading reconstruction…
          </p>
        ) : null}

        {!loading && !dossier ? (
          <div>
            <p
              className="atelier-dossier__title"
              style={{ color: "var(--atelier-ink-mute)" }}
            >
              No reconstruction
            </p>
            <p
              className="atelier-dossier__caption"
              style={{ marginTop: 8 }}
            >
              {error ??
                "Reconstruction not found for this parcel and year."}
            </p>
          </div>
        ) : null}

        {dossier ? (
          <AtelierDossierPanel
            dossier={dossier}
            year={year}
            source={source}
            onReplay={replay}
          />
        ) : null}
      </div>
    </div>
  );
}
