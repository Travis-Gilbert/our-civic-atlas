import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";

export type AtlasSceneDetailLevel = "city" | "ward" | "object";
export type AtlasSceneCameraBand = "far" | "mid" | "near";

export type AtlasSceneCameraPoint = readonly [number, number, number];

export const ATLAS_SCENE_LOD_THRESHOLDS = {
  nearMaxDistance: 45,
  midMaxDistance: 68,
} as const;

export type AtlasSceneDetailPolicy = {
  cameraDistance: number | null;
  cameraDistanceBand: AtlasSceneCameraBand;
  detailLevel: AtlasSceneDetailLevel;
  areaMinPointDistance: number;
  dpr: [number, number];
  eventLimit: number;
  placeLimit: number;
  showAnchorLabels: boolean;
  showAreaLabels: boolean;
  showEventBeacons: boolean;
  showHorizonPortals: boolean;
  showParkAreas: boolean;
};

export function getAtlasSceneDetailPolicy({
  activeLens,
  cameraDistance = null,
  isMobileViewport,
  viewMode,
}: {
  activeLens: AtlasLensId;
  cameraDistance?: number | null;
  isMobileViewport: boolean;
  viewMode: AtlasSceneViewModeId;
}): AtlasSceneDetailPolicy {
  const cameraDistanceBand = resolveAtlasSceneCameraBand(cameraDistance);
  const detailLevel = resolveDetailLevel(viewMode, cameraDistance);
  const memoryOrIntervention =
    activeLens === "memory" || activeLens === "interventions";
  const eventLimitBase =
    detailLevel === "object" ? 36 : detailLevel === "ward" ? 24 : 14;
  const placeLimitBase =
    detailLevel === "object" ? 140 : detailLevel === "ward" ? 82 : 24;

  return {
    cameraDistance,
    cameraDistanceBand,
    detailLevel,
    areaMinPointDistance: resolveAreaMinPointDistance(viewMode, isMobileViewport),
    dpr: isMobileViewport ? [1, 1.35] : [1, 1.85],
    eventLimit: isMobileViewport
      ? Math.min(10, eventLimitBase)
      : memoryOrIntervention
        ? Math.max(eventLimitBase, 24)
        : eventLimitBase,
    placeLimit: isMobileViewport ? Math.min(28, placeLimitBase) : placeLimitBase,
    showAnchorLabels: !isMobileViewport && detailLevel !== "city",
    showAreaLabels: !isMobileViewport && detailLevel !== "object",
    showEventBeacons: activeLens !== "explore" || viewMode !== "atlas",
    showHorizonPortals: !isMobileViewport || detailLevel !== "object",
    showParkAreas: detailLevel !== "city" || !isMobileViewport,
  };
}

export function measureAtlasSceneCameraDistance({
  lookAt,
  position,
}: {
  lookAt: AtlasSceneCameraPoint;
  position: AtlasSceneCameraPoint;
}): number {
  return Math.hypot(
    position[0] - lookAt[0],
    position[1] - lookAt[1],
    position[2] - lookAt[2],
  );
}

export function resolveAtlasSceneCameraBand(
  cameraDistance: number | null | undefined,
): AtlasSceneCameraBand {
  if (typeof cameraDistance !== "number") return "mid";
  if (cameraDistance <= ATLAS_SCENE_LOD_THRESHOLDS.nearMaxDistance) return "near";
  if (cameraDistance <= ATLAS_SCENE_LOD_THRESHOLDS.midMaxDistance) return "mid";
  return "far";
}

function resolveDetailLevel(
  viewMode: AtlasSceneViewModeId,
  cameraDistance: number | null,
): AtlasSceneDetailLevel {
  if (viewMode === "street" || viewMode === "section") return "object";
  const cameraBand = resolveAtlasSceneCameraBand(cameraDistance);
  if (cameraBand === "near") return "object";
  if (cameraBand === "mid") return "ward";
  return "city";
}

function resolveAreaMinPointDistance(
  viewMode: AtlasSceneViewModeId,
  isMobileViewport: boolean,
): number {
  if (isMobileViewport) return viewMode === "street" ? 0.055 : 0.12;
  if (viewMode === "street") return 0.035;
  if (viewMode === "atlas") return 0.11;
  return 0.075;
}
