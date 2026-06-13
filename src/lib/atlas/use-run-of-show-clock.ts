"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_FESTIVAL_WINDOW,
  type FestivalWindow,
  clampT,
  formatClock,
  snapMinutes,
  tToMinuteOfDay,
  windowDurationMinutes,
} from "./run-of-show-clock";

export interface RunOfShowClock {
  readonly t: number;
  readonly playing: boolean;
  readonly window: FestivalWindow;
  readonly minuteOfDay: number;
  readonly clockLabel: string;
  readonly progress: number;
  readonly setT: (t: number) => void;
  readonly scrubTo: (t: number) => void;
  readonly snapTo: (t: number) => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly stepBy: (deltaMinutes: number) => void;
}

export interface UseRunOfShowClockOptions {
  readonly window?: FestivalWindow;
  readonly initialT?: number;
  readonly playbackMinutesPerSecond?: number;
}

export function useRunOfShowClock(
  options?: UseRunOfShowClockOptions,
): RunOfShowClock {
  const festivalWindow = options?.window ?? DEFAULT_FESTIVAL_WINDOW;
  const duration = windowDurationMinutes(festivalWindow);
  const rate = options?.playbackMinutesPerSecond ?? 20;

  const [t, setTState] = useState<number>(() =>
    clampT(options?.initialT ?? 0, festivalWindow),
  );
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const setT = useCallback(
    (next: number) => setTState(clampT(next, festivalWindow)),
    [festivalWindow],
  );

  const pause = useCallback(() => setPlaying(false), []);

  const scrubTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setTState(clampT(next, festivalWindow));
    },
    [festivalWindow],
  );

  const snapTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setTState(clampT(snapMinutes(next), festivalWindow));
    },
    [festivalWindow],
  );

  const play = useCallback(() => {
    setTState((current) => (current >= duration ? 0 : current));
    setPlaying(true);
  }, [duration]);

  const toggle = useCallback(() => {
    setPlaying((current) => !current);
  }, []);

  const stepBy = useCallback(
    (deltaMinutes: number) => {
      setPlaying(false);
      setTState((current) =>
        clampT(snapMinutes(current + deltaMinutes), festivalWindow),
      );
    },
    [festivalWindow],
  );

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = timestamp;
      if (last !== null) {
        const elapsedSeconds = (timestamp - last) / 1000;
        setTState((current) =>
          Math.min(duration, current + elapsedSeconds * rate),
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [duration, playing, rate]);

  useEffect(() => {
    if (playing && t >= duration) setPlaying(false);
  }, [duration, playing, t]);

  const minuteOfDay = tToMinuteOfDay(t, festivalWindow);

  return {
    t,
    playing,
    window: festivalWindow,
    minuteOfDay,
    clockLabel: formatClock(minuteOfDay),
    progress: duration > 0 ? clampT(t, festivalWindow) / duration : 0,
    setT,
    scrubTo,
    snapTo,
    play,
    pause,
    toggle,
    stepBy,
  };
}
