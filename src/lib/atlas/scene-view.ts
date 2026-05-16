import {
  getAtlasCameraPreset,
  getAtlasViewCamera,
  type AtlasCameraPresetId,
} from "@/lib/atlas/atlas-boundary";

export type AtlasSceneViewModeId = "atlas" | "oblique" | "street" | "section";

export type AtlasLensId =
  | "explore"
  | "memory"
  | "safety"
  | "interventions"
  | "evidence";

export type AtlasCameraState = {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type AtlasSceneViewMode = {
  id: AtlasSceneViewModeId;
  label: string;
  shortLabel: string;
  description: string;
  camera: AtlasCameraState;
  extrusionScale: number;
};

export type AtlasLens = {
  id: AtlasLensId;
  label: string;
  shortLabel: string;
  description: string;
};

export const ATLAS_CAMERA_PRESET_IDS: AtlasCameraPresetId[] = [
  "county",
  "city",
  "neighborhood",
  "corridor",
  "parcel",
];

export const ATLAS_CAMERA_PRESETS = Object.fromEntries(
  ATLAS_CAMERA_PRESET_IDS.map((id) => [id, getAtlasCameraPreset(id)]),
) as Record<AtlasCameraPresetId, AtlasCameraState>;

export const ATLAS_SCENE_VIEW_MODES: AtlasSceneViewMode[] = [
  {
    id: "atlas",
    label: "Atlas",
    shortLabel: "2D",
    description: "Flat civic map for scanning boundaries, layers, and source coverage.",
    camera: getAtlasViewCamera("atlas"),
    extrusionScale: 0,
  },
  {
    id: "oblique",
    label: "Oblique",
    shortLabel: "3D",
    description: "Angled city model for civic objects, heat, and place relationships.",
    camera: getAtlasViewCamera("oblique"),
    extrusionScale: 1,
  },
  {
    id: "street",
    label: "Street",
    shortLabel: "Street",
    description: "Low camera for corridor and street-level review.",
    camera: getAtlasViewCamera("street"),
    extrusionScale: 1.35,
  },
  {
    id: "section",
    label: "Section",
    shortLabel: "Section",
    description: "Cutaway-like view for comparing layers, time, and source strata.",
    camera: getAtlasViewCamera("section"),
    extrusionScale: 0.72,
  },
];

export const ATLAS_SCENE_VIEW_MODE_LOOKUP = Object.fromEntries(
  ATLAS_SCENE_VIEW_MODES.map((mode) => [mode.id, mode]),
) as Record<AtlasSceneViewModeId, AtlasSceneViewMode>;

export const ATLAS_LENSES: AtlasLens[] = [
  {
    id: "explore",
    label: "Explore",
    shortLabel: "Map",
    description: "Places, wards, landmarks, and source-backed civic objects.",
  },
  {
    id: "memory",
    label: "Memory",
    shortLabel: "Time",
    description: "Historical events, vanished places, and temporal building records.",
  },
  {
    id: "safety",
    label: "Safety",
    shortLabel: "Risk",
    description: "Street safety, infrastructure stress, and caveated public trends.",
  },
  {
    id: "interventions",
    label: "Interventions",
    shortLabel: "Work",
    description: "Public projects, promises, funding, actors, and outcomes.",
  },
  {
    id: "evidence",
    label: "Sources",
    shortLabel: "Source",
    description: "Sources, claims, confidence, provenance, and review state.",
  },
];

export const ATLAS_LENS_LOOKUP = Object.fromEntries(
  ATLAS_LENSES.map((lens) => [lens.id, lens]),
) as Record<AtlasLensId, AtlasLens>;

export const DEFAULT_VIEW_MODE_BY_LENS: Record<
  AtlasLensId,
  AtlasSceneViewModeId
> = {
  explore: "oblique",
  memory: "section",
  safety: "street",
  interventions: "oblique",
  evidence: "section",
};

export const VISUAL_GRAMMAR_TOKENS = [
  {
    id: "current_confirmed",
    label: "Current",
    detail: "reviewed civic object",
    color: "#2f6f64",
  },
  {
    id: "current_low_confidence",
    label: "Low confidence",
    detail: "current object still under review",
    color: "#c08a3a",
  },
  {
    id: "vanished_confirmed",
    label: "Vanished",
    detail: "reviewed former place or building",
    color: "#7d5b49",
  },
  {
    id: "vanished_inferred",
    label: "Inferred loss",
    detail: "likely former place or building",
    color: "#b88168",
  },
  {
    id: "historical_event",
    label: "Event",
    detail: "time-stamped civic record",
    color: "#c14a2c",
  },
  {
    id: "public_intervention",
    label: "Intervention",
    detail: "public project, promise, or funding record",
    color: "#3e6f93",
  },
  {
    id: "community_observation_pending",
    label: "Pending observation",
    detail: "community note awaiting review",
    color: "#bf8d2b",
  },
  {
    id: "community_observation_reviewed",
    label: "Reviewed observation",
    detail: "community note accepted into the atlas",
    color: "#4f7f63",
  },
  {
    id: "disputed_claim",
    label: "Disputed",
    detail: "public disagreement still unresolved",
    color: "#8b5163",
  },
  {
    id: "model_prediction",
    label: "Proposal",
    detail: "advisory model output, never public fact",
    color: "#6d63a8",
  },
  {
    id: "source_stale",
    label: "Stale source",
    detail: "source package needs a freshness check",
    color: "#776f68",
  },
  {
    id: "source_high_confidence",
    label: "Source",
    detail: "high-support source",
    color: "#5f6fa3",
  },
  {
    id: "brush_reconstruction",
    label: "Reconstruction",
    detail: "scene-factory or Brush reconstruction",
    color: "#7d68a4",
  },
  {
    id: "ifc_semantic_model",
    label: "IFC model",
    detail: "semantic building model import",
    color: "#3f7180",
  },
] as const;
