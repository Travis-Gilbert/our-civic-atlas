/**
 * Per-stage timing constants for the atelier reconstruction animation.
 *
 * Source of truth: `docs/plans/the-atelier/animation-choreography.md`.
 * Spec source: `SPEC-THE-ATELIER.md` lines 51-176 (6 to 8 second total
 * animation length; per-stage budgets enumerated below).
 *
 * The choreographer at `atelier-choreographer.ts` reads these to drive
 * the state machine. Per-stage components (evidence cards, provenance
 * lines, conflict markers, camera, dust motes) subscribe via the
 * choreographer's onStateChange and interpolate their state against
 * the active stage's progress.
 */

export type AtelierStageId =
  | "entry"
  | "evidence_gathering"
  | "direct_extraction"
  | "block_subgraph"
  | "pairformer_inference"
  | "merge_conflicts"
  | "asset_generation"
  | "settled";

export type AtelierStageBudget = {
  id: AtelierStageId;
  /** Stage duration in milliseconds at 1.0x playback. */
  durationMs: number;
  /** Reduced-motion duration in milliseconds. */
  reducedDurationMs: number;
  /** Human-readable label for telemetry and a11y announcements. */
  label: string;
  /** Spec line range for backreference. */
  specLines: string;
};

/**
 * Per-stage budgets at 1.0x playback. Total: 7500ms (within spec's
 * 6 to 8s tolerance). Subsequent reconstructions in the same session
 * play at 1.5x (PT-310); replay always plays at 1.0x.
 */
export const ATELIER_STAGE_BUDGETS: readonly AtelierStageBudget[] = [
  {
    id: "entry",
    durationMs: 500,
    reducedDurationMs: 0,
    label: "Entry",
    specLines: "51-62",
  },
  {
    id: "evidence_gathering",
    durationMs: 1000,
    reducedDurationMs: 150,
    label: "Evidence gathering",
    specLines: "64-77",
  },
  {
    id: "direct_extraction",
    durationMs: 1500,
    reducedDurationMs: 250,
    label: "Direct extraction",
    specLines: "78-96",
  },
  {
    id: "block_subgraph",
    durationMs: 800,
    reducedDurationMs: 200,
    label: "Block subgraph",
    specLines: "98-104",
  },
  {
    id: "pairformer_inference",
    durationMs: 1000,
    reducedDurationMs: 250,
    label: "Pairformer inference",
    specLines: "106-126",
  },
  {
    id: "merge_conflicts",
    durationMs: 1000,
    reducedDurationMs: 200,
    label: "Merge with conflict surfacing",
    specLines: "128-146",
  },
  {
    id: "asset_generation",
    durationMs: 1500,
    reducedDurationMs: 500,
    label: "Asset generation",
    specLines: "148-160",
  },
  {
    id: "settled",
    durationMs: 200,
    reducedDurationMs: 200,
    label: "Settled state",
    specLines: "162-170",
  },
] as const;

export const ATELIER_TOTAL_DURATION_MS = ATELIER_STAGE_BUDGETS.reduce(
  (sum, stage) => sum + stage.durationMs,
  0,
);

export const ATELIER_TOTAL_REDUCED_DURATION_MS = ATELIER_STAGE_BUDGETS.reduce(
  (sum, stage) => sum + stage.reducedDurationMs,
  0,
);

/**
 * Cumulative end-time for each stage in the timeline at 1.0x playback.
 * Used by the choreographer to determine which stage is active for a
 * given elapsed time.
 */
export function buildStageEndOffsets(
  reducedMotion: boolean,
): Array<{ stage: AtelierStageBudget; startMs: number; endMs: number }> {
  let cursor = 0;
  return ATELIER_STAGE_BUDGETS.map((stage) => {
    const duration = reducedMotion ? stage.reducedDurationMs : stage.durationMs;
    const entry = { stage, startMs: cursor, endMs: cursor + duration };
    cursor += duration;
    return entry;
  });
}
