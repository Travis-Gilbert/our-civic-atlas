import type { Layer, PickingInfo } from "@deck.gl/core";
import { IconLayer } from "@deck.gl/layers";

import type { PlannerTaskNode, PlannerTaskPriority } from "@/lib/atlas/planner-phase4";

interface PlannerTaskLayerDatum {
  readonly task: PlannerTaskNode;
  readonly variant: "compact" | "detail";
  readonly offset: readonly [number, number];
}

export interface PlannerTaskLayerOptions {
  readonly tasks: readonly PlannerTaskNode[];
  readonly visible: boolean;
  readonly zoom: number;
  readonly selectedTaskId: string | null;
  readonly onClickTask?: (task: PlannerTaskNode, info: PickingInfo) => void;
}

const PRIORITY_FILL: Record<PlannerTaskPriority, string> = {
  0: "#b3ad9e",
  1: "#d8b05d",
  2: "#df8457",
  3: "#c14a2c",
};

const OWNER_FILL = "#6b2c33";
const TASK_STROKE = "#1c1c1c";

const iconCache = new Map<string, { url: string; width: number; height: number; anchorY: number }>();

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function truncateTitle(title: string, maxLength: number): string {
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title;
}

function buildTaskIcon(
  task: PlannerTaskNode,
  variant: PlannerTaskLayerDatum["variant"],
  selected: boolean,
) {
  const cacheKey = [
    task.id,
    variant,
    selected ? "selected" : "default",
    task.title,
    task.ownerDisplay ?? "",
    task.priority,
    task.status,
    Math.round(task.completionPct * 100),
  ].join("|");
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const width = variant === "detail" ? 216 : 52;
  const height = variant === "detail" ? 52 : 34;
  const progressWidth = Math.max(8, Math.round((width - 12) * clampPercent(task.completionPct)));
  const title = truncateTitle(task.title, variant === "detail" ? 24 : 10);
  const ownerInitial = escapeXml((task.ownerDisplay ?? "P").slice(0, 1).toUpperCase());
  const background = selected ? "#fff8ef" : "#fbf7ee";
  const stroke = selected ? "#005186" : TASK_STROKE;
  const progressFill = PRIORITY_FILL[task.priority];
  const chevron = task.childIds.length > 0 ? "▾" : "";

  const svg = variant === "detail"
    ? `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" fill="${background}" stroke="${stroke}" stroke-width="${selected ? 2 : 1.25}" />
        <circle cx="20" cy="18" r="11" fill="${OWNER_FILL}" />
        <text x="20" y="22" font-size="11" text-anchor="middle" fill="#f7efe3" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700">${ownerInitial}</text>
        <circle cx="${width - 18}" cy="14" r="5" fill="${PRIORITY_FILL[task.priority]}" />
        <text x="38" y="19" font-size="13" fill="#1c1c1c" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700">${escapeXml(title)}</text>
        <text x="${width - 28}" y="20" font-size="10" fill="#5a5246" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(chevron)}</text>
        <rect x="8" y="${height - 10}" width="${width - 16}" height="4" rx="2" fill="#d8d1c2" />
        <rect x="8" y="${height - 10}" width="${progressWidth}" height="4" rx="2" fill="${progressFill}" />
      </svg>
    `
    : `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${background}" stroke="${stroke}" stroke-width="${selected ? 2 : 1.25}" />
        <circle cx="16" cy="14" r="8" fill="${OWNER_FILL}" />
        <text x="16" y="17" font-size="8" text-anchor="middle" fill="#f7efe3" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700">${ownerInitial}</text>
        <circle cx="${width - 12}" cy="11" r="4" fill="${PRIORITY_FILL[task.priority]}" />
        <rect x="7" y="${height - 8}" width="${width - 14}" height="3" rx="1.5" fill="#d8d1c2" />
        <rect x="7" y="${height - 8}" width="${Math.max(6, Math.round((width - 14) * clampPercent(task.completionPct)))}" height="3" rx="1.5" fill="${progressFill}" />
      </svg>
    `;

  const icon = {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    width,
    height,
    anchorY: height,
  };
  iconCache.set(cacheKey, icon);
  return icon;
}

function buildLayerData(tasks: readonly PlannerTaskNode[]): PlannerTaskLayerDatum[] {
  const countsByPlacement = new Map<string, number>();
  return tasks.map((task) => {
    if (task.geoAnchorKind !== "placement" || !task.effectivePlacementId) {
      return {
        task,
        variant: "detail",
        offset: [0, 0] as const,
      };
    }
    const seen = countsByPlacement.get(task.effectivePlacementId) ?? 0;
    countsByPlacement.set(task.effectivePlacementId, seen + 1);
    return {
      task,
      variant: "detail",
      offset: [12 + seen * 10, 10 + seen * 8] as const,
    };
  });
}

function createIconLayer(
  id: string,
  data: readonly PlannerTaskLayerDatum[],
  visible: boolean,
  selectedTaskId: string | null,
  onClickTask?: (task: PlannerTaskNode, info: PickingInfo) => void,
): IconLayer<PlannerTaskLayerDatum> {
  return new IconLayer<PlannerTaskLayerDatum>({
    id,
    data,
    visible,
    pickable: true,
    billboard: true,
    sizeUnits: "pixels",
    getPosition: (datum) =>
      (datum.task.effectiveGeometry?.coordinates ?? [0, 0]) as [number, number],
    getPixelOffset: (datum) => datum.offset,
    getSize: (datum) => (datum.variant === "detail" ? 42 : 30),
    getIcon: (datum) =>
      buildTaskIcon(datum.task, datum.variant, datum.task.id === selectedTaskId),
    onClick: (info) => {
      const datum = info.object;
      if (!datum || !onClickTask) return false;
      onClickTask(datum.task, info);
      return true;
    },
    updateTriggers: {
      getIcon: selectedTaskId,
    },
  });
}

export function createPlannerTaskLayers({
  tasks,
  visible,
  zoom,
  selectedTaskId,
  onClickTask,
}: PlannerTaskLayerOptions): Layer[] {
  if (!visible || tasks.length === 0) return [];

  const layerData = buildLayerData(tasks);
  const detailData = layerData.map((datum) => ({ ...datum, variant: "detail" as const }));
  const compactData = layerData.map((datum) => ({ ...datum, variant: "compact" as const }));

  return [
    createIconLayer(
      "planner-task-layer-compact",
      compactData,
      zoom < 16.8,
      selectedTaskId,
      onClickTask,
    ),
    createIconLayer(
      "planner-task-layer-detail",
      detailData,
      zoom >= 16.8,
      selectedTaskId,
      onClickTask,
    ),
  ];
}
