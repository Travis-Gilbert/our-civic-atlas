/**
 * useAtelierChoreographer - React hook bridging `createChoreographer`
 * to component state.
 *
 * Component contract:
 *   const { state, start, skip, replay } = useAtelierChoreographer();
 *   useEffect(() => { start(); }, [start]);  // auto-play on mount
 *
 * `state` updates on every animation frame while the choreographer is
 * playing. Components that don't need per-frame updates can use
 * `state.stage` (which only changes on stage transitions) or
 * `state.skipped` instead of subscribing to `state.stageProgress`.
 *
 * prefers-reduced-motion is read from window.matchMedia once at mount;
 * if the user toggles the preference mid-session, the next replay
 * applies the new value.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createChoreographer,
  type Choreographer,
  type ChoreographerState,
} from "@/lib/atlas/atelier-choreographer";

const IDLE_STATE: ChoreographerState = {
  stage: "entry",
  stageProgress: 0,
  totalProgress: 0,
  skipped: false,
  playing: false,
  prefersReducedMotion: false,
  playbackSpeed: 1.0,
};

function detectReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useAtelierChoreographer(): {
  state: ChoreographerState;
  start: () => void;
  skip: () => void;
  replay: () => void;
} {
  const [state, setState] = useState<ChoreographerState>(IDLE_STATE);
  const choreographerRef = useRef<Choreographer | null>(null);

  useEffect(() => {
    const prefersReducedMotion = detectReducedMotion();
    const choreographer = createChoreographer({
      prefersReducedMotion,
      onStateChange: setState,
    });
    choreographerRef.current = choreographer;
    return () => {
      choreographer.dispose();
      choreographerRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    choreographerRef.current?.start();
  }, []);

  const skip = useCallback(() => {
    choreographerRef.current?.skip();
  }, []);

  const replay = useCallback(() => {
    choreographerRef.current?.replay();
  }, []);

  return { state, start, skip, replay };
}
