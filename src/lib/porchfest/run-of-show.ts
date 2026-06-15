import {
  PORCHFEST_EVENT_DATE,
  PORCHFEST_EVENT_TZ,
} from "@/lib/porchfest/porchfest-event";
import {
  DEFAULT_FESTIVAL_WINDOW,
  SNAP_STEP_MINUTES,
  clampT,
  formatClock,
  phaseTicks,
  tToMinuteOfDay,
  windowDurationMinutes,
} from "@/lib/atlas/run-of-show-clock";
import {
  DEFAULT_SET_MINUTES,
  parseSetTimeWindow,
} from "@/lib/atlas/run-of-show-schedule";

export const RUN_OF_SHOW_WINDOW = DEFAULT_FESTIVAL_WINDOW;
export const RUN_OF_SHOW_DURATION_MINUTES =
  windowDurationMinutes(RUN_OF_SHOW_WINDOW);
export const RUN_OF_SHOW_SNAP_MINUTES = SNAP_STEP_MINUTES;
export const RUN_OF_SHOW_DEFAULT_SET_LENGTH_MINUTES = DEFAULT_SET_MINUTES;
export const RUN_OF_SHOW_PUBLIC_START_MINUTE_OF_DAY = 17 * 60;
export const RUN_OF_SHOW_PUBLIC_END_MINUTE_OF_DAY = 22 * 60;
export const RUN_OF_SHOW_PUBLIC_START_MINUTE = clampT(
  RUN_OF_SHOW_PUBLIC_START_MINUTE_OF_DAY - RUN_OF_SHOW_WINDOW.startMinuteOfDay,
  RUN_OF_SHOW_WINDOW,
);
export const RUN_OF_SHOW_PUBLIC_END_MINUTE = clampT(
  RUN_OF_SHOW_PUBLIC_END_MINUTE_OF_DAY - RUN_OF_SHOW_WINDOW.startMinuteOfDay,
  RUN_OF_SHOW_WINDOW,
);

export type RunOfShowScheduleSource =
  | "set_time"
  | "placement_label"
  | "draft_stage";

export interface RunOfShowPlacementLike {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly sublabel?: string | null;
  readonly notes?: string | null;
  readonly geometry: Record<string, unknown>;
}

export interface RunOfShowCivicRowLike {
  readonly rowId: string;
  readonly title: string;
  readonly fields: {
    readonly sourceId?: string | null;
    readonly setTime?: string | null;
    readonly category?: string | null;
    readonly artistName?: string | null;
    readonly businessName?: string | null;
    readonly actName?: string | null;
    readonly orgName?: string | null;
    readonly name?: string | null;
  };
}

export interface RunOfShowTimedTaskLike {
  readonly id: string;
  readonly title: string;
  readonly status?: string | null;
  readonly startsAt?: string | null;
  readonly dueAt?: string | null;
}

export interface RunOfShowPerformance {
  readonly id: string;
  readonly actName: string;
  readonly placementId: string;
  readonly placementLabel: string;
  readonly startMinute: number;
  readonly endMinute: number;
  readonly point: readonly [number, number];
  readonly source: RunOfShowScheduleSource;
}

export interface RunOfShowTrip {
  readonly id: string;
  readonly fromPerformanceId: string;
  readonly toPerformanceId: string;
  readonly path: readonly (readonly [number, number])[];
  readonly timestamps: readonly number[];
}

export interface RunOfShowPhase {
  readonly minute: number;
  readonly label: string;
}

export const RUN_OF_SHOW_PHASES: readonly RunOfShowPhase[] = phaseTicks(
  RUN_OF_SHOW_WINDOW,
  RUN_OF_SHOW_SNAP_MINUTES,
).map((phase) => ({
  minute: phase.t,
  label: phase.isHour
    ? formatClock(phase.minuteOfDay, { meridiem: true }).replace(":00", "")
    : formatClock(phase.minuteOfDay, { meridiem: true }),
}));

function pointFromGeometry(
  geometry: Record<string, unknown>,
): readonly [number, number] | null {
  const coordinates = geometry.coordinates;
  if (
    geometry.type !== "Point" ||
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number"
  ) {
    return null;
  }
  return [coordinates[0], coordinates[1]];
}

export function parseRunOfShowTimeWindow(
  value: string | null | undefined,
): { startMinute: number; endMinute: number } | null {
  const window = parseSetTimeWindow(value, RUN_OF_SHOW_WINDOW);
  if (!window) return null;
  if (window.endMin <= 0 || window.startMin >= RUN_OF_SHOW_DURATION_MINUTES) {
    return null;
  }
  return {
    startMinute: clampRunOfShowTime(window.startMin),
    endMinute: clampRunOfShowTime(Math.max(window.startMin + 5, window.endMin)),
  };
}

export function clampRunOfShowTime(value: number): number {
  return clampT(value, RUN_OF_SHOW_WINDOW);
}

export function nearestRunOfShowSnap(value: number): number {
  return clampRunOfShowTime(
    Math.round(value / RUN_OF_SHOW_SNAP_MINUTES) *
      RUN_OF_SHOW_SNAP_MINUTES,
  );
}

export function formatRunOfShowClock(
  minute: number,
  options?: { readonly meridiem?: boolean },
): string {
  return formatClock(tToMinuteOfDay(minute, RUN_OF_SHOW_WINDOW), options);
}

export function runOfShowForecastHourKey(minute: number): string {
  const total = tToMinuteOfDay(minute, RUN_OF_SHOW_WINDOW);
  const hour24 = Math.floor(total / 60) % 24;
  return `${PORCHFEST_EVENT_DATE}T${String(hour24).padStart(2, "0")}:00`;
}

function actNameFor(row: RunOfShowCivicRowLike): string {
  return (
    row.fields.artistName?.trim() ||
    row.fields.businessName?.trim() ||
    row.fields.actName?.trim() ||
    row.fields.orgName?.trim() ||
    row.fields.name?.trim() ||
    row.title
  );
}

function byStartThenName(
  a: RunOfShowPerformance,
  b: RunOfShowPerformance,
): number {
  return (
    a.startMinute - b.startMinute ||
    a.endMinute - b.endMinute ||
    a.actName.localeCompare(b.actName)
  );
}

function draftStageStartMinute(index: number): number {
  const publicWindowMinutes = Math.max(
    RUN_OF_SHOW_DEFAULT_SET_LENGTH_MINUTES,
    RUN_OF_SHOW_PUBLIC_END_MINUTE - RUN_OF_SHOW_PUBLIC_START_MINUTE,
  );
  const slotCount = Math.max(
    1,
    Math.floor(publicWindowMinutes / RUN_OF_SHOW_DEFAULT_SET_LENGTH_MINUTES),
  );
  return Math.min(
    RUN_OF_SHOW_DURATION_MINUTES,
    RUN_OF_SHOW_PUBLIC_START_MINUTE +
      (index % slotCount) * RUN_OF_SHOW_DEFAULT_SET_LENGTH_MINUTES,
  );
}

export function buildRunOfShowPerformances({
  placements,
  civicRows,
}: {
  readonly placements: readonly RunOfShowPlacementLike[];
  readonly civicRows: readonly RunOfShowCivicRowLike[];
}): RunOfShowPerformance[] {
  const placementsById = new Map(placements.map((placement) => [placement.id, placement]));
  const performances: RunOfShowPerformance[] = [];
  const explicitPlacementIds = new Set<string>();

  for (const row of civicRows) {
    const window = parseRunOfShowTimeWindow(row.fields.setTime);
    const placementId = row.fields.sourceId?.trim() || `civic-row:${row.rowId}`;
    const placement = placementsById.get(placementId);
    const point = placement ? pointFromGeometry(placement.geometry) : null;
    if (!window || !placement || !point) continue;
    explicitPlacementIds.add(placementId);
    performances.push({
      id: `set-time:${row.rowId}`,
      actName: actNameFor(row),
      placementId,
      placementLabel: placement.label,
      point,
      source: "set_time",
      ...window,
    });
  }

  for (const placement of placements) {
    if (explicitPlacementIds.has(placement.id)) continue;
    const point = pointFromGeometry(placement.geometry);
    if (!point || placement.category !== "music") continue;
    const window = parseRunOfShowTimeWindow(
      placement.sublabel || placement.notes || "",
    );
    if (!window) continue;
    explicitPlacementIds.add(placement.id);
    performances.push({
      id: `placement-time:${placement.id}`,
      actName: placement.label,
      placementId: placement.id,
      placementLabel: placement.label,
      point,
      source: "placement_label",
      ...window,
    });
  }

  if (performances.length > 0) return performances.sort(byStartThenName);

  const draftStages = placements
    .filter((placement) => placement.category === "music")
    .map((placement) => ({ placement, point: pointFromGeometry(placement.geometry) }))
    .filter(
      (entry): entry is {
        readonly placement: RunOfShowPlacementLike;
        readonly point: readonly [number, number];
      } => entry.point !== null,
    )
    .sort((a, b) => a.placement.label.localeCompare(b.placement.label));

  return draftStages
    .map(({ placement, point }, index) => {
      const startMinute = draftStageStartMinute(index);
      return {
        id: `draft-stage:${placement.id}`,
        actName: placement.label,
        placementId: placement.id,
        placementLabel: placement.label,
        startMinute,
        endMinute: Math.min(
          RUN_OF_SHOW_DURATION_MINUTES,
          startMinute + RUN_OF_SHOW_DEFAULT_SET_LENGTH_MINUTES,
        ),
        point,
        source: "draft_stage" as const,
      };
    })
    .sort(byStartThenName);
}

export function activeRunOfShowPerformances(
  performances: readonly RunOfShowPerformance[],
  minute: number,
): RunOfShowPerformance[] {
  const t = clampRunOfShowTime(minute);
  return performances.filter(
    (performance) =>
      performance.startMinute <= t && t < performance.endMinute,
  );
}

function streetPath(
  from: readonly [number, number],
  to: readonly [number, number],
): readonly (readonly [number, number])[] {
  return [from, [to[0], from[1]], to];
}

export function buildRunOfShowTrips(
  performances: readonly RunOfShowPerformance[],
): RunOfShowTrip[] {
  const timed = [...performances]
    .filter((performance) => performance.point)
    .sort(byStartThenName);
  const trips: RunOfShowTrip[] = [];

  for (let index = 0; index < timed.length - 1; index += 1) {
    const current = timed[index];
    const next = timed[index + 1];
    if (!current || !next || current.placementId === next.placementId) {
      continue;
    }
    const depart = clampRunOfShowTime(current.endMinute - 8);
    const arrive = clampRunOfShowTime(Math.max(depart + 8, next.startMinute + 4));
    if (arrive <= depart) continue;
    trips.push({
      id: `trip:${current.id}->${next.id}`,
      fromPerformanceId: current.id,
      toPerformanceId: next.id,
      path: streetPath(current.point, next.point),
      timestamps: [depart, (depart + arrive) / 2, arrive],
    });
  }

  return trips;
}

function eventLocalParts(value: string): {
  date: string;
  minuteOfDay: number;
} | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const local = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
    if (!local) return null;
    return {
      date: local[1] ?? "",
      minuteOfDay: Number(local[2]) * 60 + Number(local[3]),
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PORCHFEST_EVENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minuteOfDay: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function runOfShowMinuteFromDateTime(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const parts = eventLocalParts(value);
  if (!parts || parts.date !== PORCHFEST_EVENT_DATE) return null;
  const minute = parts.minuteOfDay - RUN_OF_SHOW_WINDOW.startMinuteOfDay;
  if (minute < 0 || minute > RUN_OF_SHOW_DURATION_MINUTES) return null;
  return minute;
}

export function isTaskActiveAtRunOfShowTime(
  task: RunOfShowTimedTaskLike,
  minute: number,
  windowMinutes = 15,
): boolean {
  if (task.status === "done" || task.status === "Done") return false;

  const start = runOfShowMinuteFromDateTime(task.startsAt);
  const due = runOfShowMinuteFromDateTime(task.dueAt);
  const t = clampRunOfShowTime(minute);

  if (start != null && due != null && start <= t && t <= due) return true;
  const anchor = start ?? due;
  return anchor != null && Math.abs(anchor - t) <= windowMinutes;
}
