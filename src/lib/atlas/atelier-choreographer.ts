/**
 * Atelier choreographer - PT-301
 *
 * Deterministic timeline that drives the atelier's 8-stage animation.
 * Single source of truth for "which stage are we in, what's its
 * progress, has the user skipped, has the user replayed". Visual
 * components (evidence cards, provenance lines, conflict markers,
 * camera, dust motes) subscribe via `onStateChange` and interpolate
 * their state against the active stage and progress fraction.
 *
 * Source: `docs/plans/the-atelier/animation-choreography.md`.
 *
 * Playback contract:
 *   - 1.0x playback for the first atelier session in a tab (~7.5s total)
 *   - 1.5x auto-play for subsequent atelier opens in the same session
 *     (~5.0s total) via `sessionStorage`
 *   - Replay always plays at 1.0x regardless of session flag
 *   - prefers-reduced-motion collapses to ~1.75s while preserving the
 *     per-stage narrative
 *   - Skip jumps to "settled" stage with progress 1 immediately
 */

import {
  ATELIER_STAGE_BUDGETS,
  ATELIER_TOTAL_DURATION_MS,
  ATELIER_TOTAL_REDUCED_DURATION_MS,
  buildStageEndOffsets,
  type AtelierStageId,
} from "@/lib/atlas/atelier-stage-timings";

const SESSION_STORAGE_KEY = "atelier-has-seen-one-reconstruction";

export type ChoreographerState = {
  stage: AtelierStageId;
  /** [0..1] progress within the active stage. */
  stageProgress: number;
  /** [0..1] progress across the whole timeline. */
  totalProgress: number;
  /** True if user pressed skip; remains true after. */
  skipped: boolean;
  /** True if currently animating (false at idle/end). */
  playing: boolean;
  /** Whether prefers-reduced-motion is active. */
  prefersReducedMotion: boolean;
  /** Playback multiplier in effect (1.0 or 1.5). */
  playbackSpeed: number;
};

export type Choreographer = {
  start: () => void;
  skip: () => void;
  replay: () => void;
  dispose: () => void;
  /** Current state (synchronous snapshot). */
  getState: () => ChoreographerState;
};

export type CreateChoreographerOptions = {
  onStateChange: (state: ChoreographerState) => void;
  /** Caller-provided reduced-motion preference. The atelier surface
   * usually derives this from window.matchMedia and re-instantiates
   * the choreographer when the preference changes. */
  prefersReducedMotion?: boolean;
  /** Explicit playback speed override. When omitted, the choreographer
   * reads sessionStorage to decide between 1.0x (first session) and
   * 1.5x (subsequent). Replay always uses 1.0x regardless. */
  playbackSpeed?: 1.0 | 1.5;
};

function readSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSessionFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
  } catch {
    // sessionStorage write failed (private mode, quota); silent fallback.
  }
}

function resolvePlaybackSpeed(
  override: 1.0 | 1.5 | undefined,
): 1.0 | 1.5 {
  if (override) return override;
  return readSessionFlag() ? 1.5 : 1.0;
}

export function createChoreographer(
  options: CreateChoreographerOptions,
): Choreographer {
  const prefersReducedMotion = options.prefersReducedMotion ?? false;
  let playbackSpeed = resolvePlaybackSpeed(options.playbackSpeed);
  let rafId: number | null = null;
  let startedAtMs: number | null = null;
  let skipped = false;
  let playing = false;

  const baseTotalMs = prefersReducedMotion
    ? ATELIER_TOTAL_REDUCED_DURATION_MS
    : ATELIER_TOTAL_DURATION_MS;
  const stageOffsets = buildStageEndOffsets(prefersReducedMotion);

  function buildState(elapsedMs: number): ChoreographerState {
    if (skipped) {
      return {
        stage: "settled",
        stageProgress: 1,
        totalProgress: 1,
        skipped: true,
        playing: false,
        prefersReducedMotion,
        playbackSpeed,
      };
    }

    const scaledElapsed = Math.min(elapsedMs * playbackSpeed, baseTotalMs);
    const totalProgress = baseTotalMs === 0 ? 1 : scaledElapsed / baseTotalMs;

    let activeStage: AtelierStageId = "entry";
    let stageProgress = 0;
    for (const { stage, startMs, endMs } of stageOffsets) {
      if (scaledElapsed >= startMs && scaledElapsed < endMs) {
        activeStage = stage.id;
        const span = endMs - startMs;
        stageProgress = span === 0 ? 1 : (scaledElapsed - startMs) / span;
        break;
      }
      if (scaledElapsed >= endMs) {
        activeStage = stage.id;
        stageProgress = 1;
      }
    }

    return {
      stage: activeStage,
      stageProgress,
      totalProgress,
      skipped: false,
      playing,
      prefersReducedMotion,
      playbackSpeed,
    };
  }

  function emit(state: ChoreographerState) {
    try {
      options.onStateChange(state);
    } catch (error) {
      // Subscriber threw; do not crash the animation loop.
      console.warn("[atelier] onStateChange threw:", error);
    }
  }

  function tick(timestamp: number) {
    if (!playing || startedAtMs === null) return;
    const elapsedMs = timestamp - startedAtMs;
    const state = buildState(elapsedMs);
    emit(state);
    if (state.totalProgress >= 1 || skipped) {
      playing = false;
      writeSessionFlag();
      emit({ ...state, playing: false });
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    skipped = false;
    startedAtMs = null;
    playing = true;
    // Emit initial frame at stage "entry" / progress 0 so subscribers
    // mount with consistent initial state before the first rAF.
    emit({
      stage: "entry",
      stageProgress: 0,
      totalProgress: 0,
      skipped: false,
      playing: true,
      prefersReducedMotion,
      playbackSpeed,
    });
    rafId = requestAnimationFrame((firstFrame) => {
      startedAtMs = firstFrame;
      tick(firstFrame);
    });
  }

  function skip() {
    skipped = true;
    playing = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    writeSessionFlag();
    emit({
      stage: "settled",
      stageProgress: 1,
      totalProgress: 1,
      skipped: true,
      playing: false,
      prefersReducedMotion,
      playbackSpeed,
    });
  }

  function replay() {
    // Replay always plays at 1.0x regardless of session flag.
    playbackSpeed = 1.0;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    skipped = false;
    startedAtMs = null;
    playing = true;
    emit({
      stage: "entry",
      stageProgress: 0,
      totalProgress: 0,
      skipped: false,
      playing: true,
      prefersReducedMotion,
      playbackSpeed,
    });
    rafId = requestAnimationFrame((firstFrame) => {
      startedAtMs = firstFrame;
      tick(firstFrame);
    });
  }

  function dispose() {
    playing = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function getState(): ChoreographerState {
    if (!playing || startedAtMs === null) {
      return {
        stage: skipped ? "settled" : "entry",
        stageProgress: skipped ? 1 : 0,
        totalProgress: skipped ? 1 : 0,
        skipped,
        playing,
        prefersReducedMotion,
        playbackSpeed,
      };
    }
    const elapsedMs = performance.now() - startedAtMs;
    return buildState(elapsedMs);
  }

  return { start, skip, replay, dispose, getState };
}

/**
 * Convenience: total stage count (8). Exposed for telemetry strings.
 */
export const ATELIER_STAGE_COUNT = ATELIER_STAGE_BUDGETS.length;

/**
 * Convenience: returns the budget for a given stage id (or null when
 * the id is unknown).
 */
export function lookupStageBudget(stageId: AtelierStageId) {
  return ATELIER_STAGE_BUDGETS.find((stage) => stage.id === stageId) ?? null;
}
