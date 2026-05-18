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

/**
 * Named camera bookmarks — saved framings of specific civic places.
 *
 * Distinct from view modes (which choose `atlas` vs `oblique` vs
 * `street` vs `section`). A bookmark is a destination: somewhere
 * in Flint the camera can fly to. View mode answers "what kind of
 * shot"; bookmark answers "of where".
 *
 * Wire-up surface: today these are reachable via the URL search
 * param `?bookmark=<id>` and the planned bookmark drawer in the
 * dynamic island. The data lives here so additional bookmarks
 * (downtown, North End, Mott Park, etc.) can be added without
 * touching the renderer.
 */
export type AtlasCameraBookmarkId =
  | "carriage-town"
  | "downtown"
  | "north-end"
  | "mott-park";

export type AtlasCameraBookmark = {
  id: AtlasCameraBookmarkId;
  label: string;
  description: string;
  /** Preferred view mode when arriving at this bookmark. */
  viewMode: AtlasSceneViewModeId;
  camera: AtlasCameraState;
};

export const ATLAS_CAMERA_BOOKMARKS: AtlasCameraBookmark[] = [
  {
    id: "carriage-town",
    label: "Carriage Town close-up",
    description:
      "Oblique view of the Carriage Town historic district, where the Lost Flint reconstructions sit alongside surviving OSM building footprints.",
    viewMode: "street",
    camera: {
      longitude: -83.7035,
      latitude: 43.0185,
      zoom: 16.2,
      bearing: -18,
      pitch: 62,
    },
  },
  {
    id: "downtown",
    label: "Downtown core",
    description:
      "Frame the downtown commercial block — Saginaw Street, the Mott Foundation Building, Capitol Theatre.",
    viewMode: "oblique",
    camera: {
      longitude: -83.694,
      latitude: 43.013,
      zoom: 15.4,
      bearing: -12,
      pitch: 55,
    },
  },
  {
    id: "north-end",
    label: "North End",
    description:
      "Residential North End grid above the Flint River, north of downtown.",
    viewMode: "oblique",
    camera: {
      longitude: -83.6845,
      latitude: 43.046,
      zoom: 14.4,
      bearing: -8,
      pitch: 48,
    },
  },
  {
    id: "mott-park",
    label: "Mott Park",
    description:
      "Mott Park neighborhood and Mott Park Golf Course on Flint's west side.",
    viewMode: "oblique",
    camera: {
      longitude: -83.747,
      latitude: 43.0265,
      zoom: 14.6,
      bearing: -22,
      pitch: 54,
    },
  },
];

export const ATLAS_CAMERA_BOOKMARK_LOOKUP = Object.fromEntries(
  ATLAS_CAMERA_BOOKMARKS.map((bookmark) => [bookmark.id, bookmark]),
) as Record<AtlasCameraBookmarkId, AtlasCameraBookmark>;

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
