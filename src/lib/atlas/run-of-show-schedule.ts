import {
  SNAP_STEP_MINUTES,
  type FestivalWindow,
} from "./run-of-show-clock";

export const DEFAULT_SET_MINUTES = SNAP_STEP_MINUTES;

interface ClockToken {
  readonly hour: number;
  readonly minute: number;
  readonly meridiem: "am" | "pm" | null;
}

function parseClockToken(raw: string): ClockToken | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return null;

  const match =
    /^(\d{1,2})(?::?(\d{2}))?\s*(a|p)\.?m?\.?$|^(\d{1,2})(?::(\d{2}))?$/.exec(
      trimmed,
    );
  if (!match) return null;

  const meridiem = match[3] === "p" ? "pm" : match[3] === "a" ? "am" : null;
  const hour = Number(match[1] ?? match[4]);
  const minute = Number(match[2] ?? match[5] ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour > 23 || minute > 59) return null;

  return { hour, minute, meridiem };
}

function tokenToMinuteOfDay(
  token: ClockToken,
  festivalWindow: FestivalWindow,
): number {
  const { hour, minute, meridiem } = token;
  if (meridiem) {
    let resolvedHour = hour % 12;
    if (meridiem === "pm") resolvedHour += 12;
    return resolvedHour * 60 + minute;
  }

  if (hour >= 13) return hour * 60 + minute;

  const am = hour * 60 + minute;
  const pm = ((hour % 12) + 12) * 60 + minute;
  const inWindow = (value: number) =>
    value >= festivalWindow.startMinuteOfDay &&
    value <= festivalWindow.endMinuteOfDay;
  if (inWindow(pm) && !inWindow(am)) return pm;
  if (inWindow(am) && !inWindow(pm)) return am;

  const middle =
    (festivalWindow.startMinuteOfDay + festivalWindow.endMinuteOfDay) / 2;
  return Math.abs(pm - middle) <= Math.abs(am - middle) ? pm : am;
}

export function parseSetTimeWindow(
  setTime: string | null | undefined,
  festivalWindow: FestivalWindow,
): { startMin: number; endMin: number } | null {
  if (!setTime) return null;

  const parts = setTime
    .replace(/[‒–—―]/g, "-")
    .replace(/\bto\b/gi, "-")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const startToken = parseClockToken(parts[0] ?? "");
  if (!startToken) return null;
  const startMinuteOfDay = tokenToMinuteOfDay(startToken, festivalWindow);

  const endToken = parts[1] ? parseClockToken(parts[1]) : null;
  const effectiveEnd =
    endToken?.meridiem === null && startToken.meridiem !== null
      ? { ...endToken, meridiem: startToken.meridiem }
      : endToken;
  const endMinuteOfDay = effectiveEnd
    ? tokenToMinuteOfDay(effectiveEnd, festivalWindow)
    : startMinuteOfDay + DEFAULT_SET_MINUTES;

  return {
    startMin: startMinuteOfDay - festivalWindow.startMinuteOfDay,
    endMin:
      endMinuteOfDay > startMinuteOfDay
        ? endMinuteOfDay - festivalWindow.startMinuteOfDay
        : startMinuteOfDay + DEFAULT_SET_MINUTES - festivalWindow.startMinuteOfDay,
  };
}
