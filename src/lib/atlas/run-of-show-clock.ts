/**
 * Run-of-show master clock (festival run-of-show spec, deliverable 1).
 *
 * The single time source for the planner's run-of-show mode: one cursor `t`,
 * measured in MINUTES FROM THE FESTIVAL START, that every time-aware layer
 * reads. There is one clock, not one per layer, so nothing drifts (spec
 * "do not break": the master clock is the single time source).
 *
 * This file is PURE math + types (no React, no "use client") so the
 * porchfest run-of-show derivation (src/lib/porchfest/run-of-show.ts, which
 * consumes this module) and any node validator can import it without pulling
 * the renderer. `t` is continuous so flow and weather interpolate smoothly;
 * the scrubber snaps to 30-minute marks and labels named phases along the
 * track from the festival's wall clock.
 *
 * Co-owned core (2026-06-13): Claude Code authored this clock + the schedule
 * derivation; Codex's run-of-show.ts integrates them as the foundation for the
 * porchfest-specific performance/trip/task logic and the panel/layer render.
 */

import {
  PORCHFEST_EVENT_DATE,
  PORCHFEST_EVENT_TZ,
} from "@/lib/porchfest/porchfest-event";

/**
 * The festival's time window in wall-clock terms. `t` is an offset into this
 * window; clock labels and the weather hour come from `start + t`.
 */
export interface FestivalWindow {
  /** Festival day, ISO 'YYYY-MM-DD' in the event's local time zone. */
  readonly date: string;
  /** IANA time zone for clock display and the Open-Meteo hourly lookup. */
  readonly timezone: string;
  /** Local clock minute-of-day the run-of-show opens (e.g. 09:00 -> 540). */
  readonly startMinuteOfDay: number;
  /** Local clock minute-of-day the run-of-show closes (e.g. 23:00 -> 1380). */
  readonly endMinuteOfDay: number;
}

/**
 * Default window: PorchFest 2026 (date + tz from the canonical event facts),
 * a full event-day coverage block from 9:00 AM -> 11:00 PM. The public festival
 * core remains 5:00 PM -> 10:00 PM; this wider window covers setup, arrivals,
 * teardown, and after-show tasks without hiding organizer work outside showtime.
 */
export const DEFAULT_FESTIVAL_WINDOW: FestivalWindow = {
  date: PORCHFEST_EVENT_DATE,
  timezone: PORCHFEST_EVENT_TZ,
  startMinuteOfDay: 9 * 60,
  endMinuteOfDay: 23 * 60,
};

/** The scrubber's snap granularity and the phase-tick spacing. */
export const SNAP_STEP_MINUTES = 30;

/** Total festival length in minutes; the upper bound of `t`. */
export function windowDurationMinutes(window: FestivalWindow): number {
  return Math.max(0, window.endMinuteOfDay - window.startMinuteOfDay);
}

/** Clamp a cursor into `[0, duration]`; non-finite input collapses to 0. */
export function clampT(t: number, window: FestivalWindow): number {
  if (!Number.isFinite(t)) return 0;
  const duration = windowDurationMinutes(window);
  return Math.min(duration, Math.max(0, t));
}

/** Snap a minute value to the nearest `step` (default 30-minute marks). */
export function snapMinutes(t: number, step: number = SNAP_STEP_MINUTES): number {
  if (step <= 0 || !Number.isFinite(t)) return t;
  return Math.round(t / step) * step;
}

/** Convert a cursor `t` into an absolute minute-of-day (festival wall clock). */
export function tToMinuteOfDay(t: number, window: FestivalWindow): number {
  return window.startMinuteOfDay + clampT(t, window);
}

/** Convert an absolute minute-of-day into a cursor `t` (clamped to the window). */
export function minuteOfDayToT(minuteOfDay: number, window: FestivalWindow): number {
  return clampT(minuteOfDay - window.startMinuteOfDay, window);
}

/**
 * Format a minute-of-day as a clock label. Default is a bare 12-hour label
 * ("5:00") to match the spec's phase labels; pass `meridiem` for "5:00 PM".
 * Wraps defensively so an out-of-range minute never throws.
 */
export function formatClock(
  minuteOfDay: number,
  options?: { readonly meridiem?: boolean },
): string {
  const total = (((Math.round(minuteOfDay) % 1440) + 1440) % 1440);
  const h24 = Math.floor(total / 60);
  const minutes = (total % 60).toString().padStart(2, "0");
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (options?.meridiem) {
    return `${h12}:${minutes} ${h24 < 12 ? "AM" : "PM"}`;
  }
  return `${h12}:${minutes}`;
}

/** A snap mark along the scrubber track; whole-hour marks read as named phases. */
export interface PhaseTick {
  /** Minutes from festival start. */
  readonly t: number;
  /** Absolute festival wall-clock minute-of-day. */
  readonly minuteOfDay: number;
  /** Clock label, e.g. "5:00". */
  readonly label: string;
  /** True on whole-hour marks (the prominent named-phase labels). */
  readonly isHour: boolean;
}

/**
 * The named phase labels along the track: one per snap step from start to end,
 * inclusive. Whole-hour marks are flagged so the scrubber can emphasize them
 * over the half-hour ticks.
 */
export function phaseTicks(
  window: FestivalWindow,
  step: number = SNAP_STEP_MINUTES,
): PhaseTick[] {
  const duration = windowDurationMinutes(window);
  const ticks: PhaseTick[] = [];
  const safeStep = step > 0 ? step : SNAP_STEP_MINUTES;
  for (let t = 0; t <= duration; t += safeStep) {
    const minuteOfDay = window.startMinuteOfDay + t;
    ticks.push({
      t,
      minuteOfDay,
      label: formatClock(minuteOfDay),
      isHour: minuteOfDay % 60 === 0,
    });
  }
  return ticks;
}

/**
 * The 30-minute phase containing `t`: its bounds and clock label. The scrubber
 * uses this to render each phase as a scene (what is playing, expected crowd,
 * weather, open tasks) rather than a bare number.
 */
export interface RunOfShowPhase {
  /** Phase start, minutes from festival start (a snap mark). */
  readonly startT: number;
  /** Phase end, minutes from festival start (next snap mark, clamped). */
  readonly endT: number;
  /** Clock label of the phase start, e.g. "5:30". */
  readonly label: string;
}

/** Resolve the phase (snap slot) that contains cursor `t`. */
export function phaseAt(
  t: number,
  window: FestivalWindow,
  step: number = SNAP_STEP_MINUTES,
): RunOfShowPhase {
  const duration = windowDurationMinutes(window);
  const safeStep = step > 0 ? step : SNAP_STEP_MINUTES;
  const clamped = clampT(t, window);
  const startT = Math.min(duration, Math.floor(clamped / safeStep) * safeStep);
  const endT = Math.min(duration, startT + safeStep);
  return {
    startT,
    endT,
    label: formatClock(window.startMinuteOfDay + startT),
  };
}
