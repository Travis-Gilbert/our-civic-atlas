export type AtlasSceneViewModeId = "atlas" | "oblique" | "street" | "section";

export type AtlasLensId =
  | "explore"
  | "memory"
  | "safety"
  | "interventions";

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

export const ATLAS_SCENE_VIEW_MODES: AtlasSceneViewMode[] = [
  {
    id: "atlas",
    label: "Atlas",
    shortLabel: "2D",
    description: "Flat civic map for scanning boundaries, layers, and source coverage.",
    camera: {
      longitude: -83.6875,
      latitude: 43.0125,
      zoom: 11.6,
      bearing: 0,
      pitch: 0,
    },
    extrusionScale: 0,
  },
  {
    id: "oblique",
    label: "Oblique",
    shortLabel: "3D",
    description: "Angled city model for civic objects, heat, and place relationships.",
    camera: {
      longitude: -83.6875,
      latitude: 43.0125,
      zoom: 12.35,
      bearing: -24,
      pitch: 58,
    },
    extrusionScale: 1,
  },
  {
    id: "street",
    label: "Street",
    shortLabel: "Street",
    description: "Low camera for corridor and street-level review.",
    camera: {
      longitude: -83.6917,
      latitude: 43.0147,
      zoom: 14.55,
      bearing: -32,
      pitch: 72,
    },
    extrusionScale: 1.35,
  },
  {
    id: "section",
    label: "Section",
    shortLabel: "Slice",
    description: "Cutaway-like view for comparing layers, time, and source-support strata.",
    camera: {
      longitude: -83.697,
      latitude: 43.025,
      zoom: 12.85,
      bearing: 32,
      pitch: 46,
    },
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
    description: "Historical events, vanished places, and temporal building support.",
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
};

export const VISUAL_GRAMMAR_TOKENS = [
  {
    id: "current_confirmed",
    label: "Current",
    detail: "reviewed civic object",
    color: "#2f6f64",
  },
  {
    id: "needs_review",
    label: "Needs review",
    detail: "candidate or incomplete support",
    color: "#c08a3a",
  },
  {
    id: "historical_event",
    label: "Event",
    detail: "time-stamped civic record",
    color: "#c14a2c",
  },
  {
    id: "source_high_confidence",
    label: "Source",
    detail: "source-backed support",
    color: "#5f6fa3",
  },
] as const;
