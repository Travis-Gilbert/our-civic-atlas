"use client";

/**
 * PorchFest planner client.
 *
 * Composes the deployed event-planner GraphQL surface into a working
 * drag-drop-and-3D planning tool:
 *
 *   - Placements load client-side via urql (EventPlacements) so they
 *     refresh `version` for optimistic concurrency and so mutations +
 *     SSE update one live cache. SSR `initialPlacements` carry version
 *     when the server GraphQL read succeeded, so editing can unlock on
 *     first paint.
 *   - Affordance meshes (PorchfestAffordanceMeshLayer) render each
 *     placement as a recognizable 3D form.
 *   - The editable layer (PlannerEditableLayer) handles drag/draw and
 *     commits via updatePlacement / createPlacement.
 *   - Palette, layer controls, task rail, and bookmarks are the existing
 *     Phase 2/3 components wired to their queries + mutations.
 *   - An optional EventSource consumer applies planner_change events by
 *     refetching, so the five planners see each other's edits.
 *
 * Backend boundary: every write goes through the GraphQL contract
 * (docs/design/flint-graphql-schema-v1.graphql), resolved by the sibling
 * Axum service. When that service is unreachable the queries error, the
 * client falls back to the SSR fixture for display, and editing degrades
 * honestly (no version -> no drag) with a visible "backend pending" note.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useMutation, useQuery } from "urql";
import type { MapRef } from "react-map-gl/maplibre";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { ListChecks } from "lucide-react";
import { useIsMobile } from "@/lib/atlas/use-is-mobile";
import { useNetworkStatus } from "@/lib/atlas/use-network-status";
import { useTrafficRealtime } from "@/lib/atlas/use-traffic-realtime";
import type { DeckLayerPointerDragHandler } from "@/components/atlas/AtlasMap";

import { ResponsiveAtlasMap } from "@/components/atlas/ResponsiveAtlasMap";
import { BuildingAddressEditor } from "@/components/atlas/BuildingAddressEditor";
import type { SelectedBuilding } from "@/lib/atlas/selected-building";
import {
  type AtlasEventPlannerCategory,
  type AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";
import {
  buildPorchfestAffordanceMeshLayers,
  buildPorchfestFigureDecorations,
} from "@/components/atlas/PorchfestAffordanceMeshLayer";
import {
  buildPlannerEditableLayer,
  type PlannerEditMode,
  type PlannerEditablePlacement,
} from "@/components/atlas/PlannerEditableLayer";
import { createPlannerTaskLayers } from "@/components/atlas/PlannerTaskLayer";
import { buildPorchfestFlowLayers } from "@/components/atlas/PorchfestFlowLayer";
import type { PlannerTaskNode, PlannerTaskStatus } from "@/lib/atlas/planner-phase4";
import { taskProgress } from "@/lib/atlas/task-progress";
import {
  PlannerEditModeToggle,
  PlannerPalette,
  CATEGORY_COLOR,
  PLANNER_CATEGORY_DRAG_TYPE,
  type PlannerCategoryDragPayload,
  type PaletteMode,
} from "@/components/atlas/PlannerPalette";
import { PorchfestIsland } from "@/components/atlas/PorchfestIsland";
import {
  PlannerTaskRail,
  type NewTaskInput,
  type TaskPatch,
} from "@/components/atlas/PlannerTaskRail";
import { PlannerBookmarks } from "@/components/atlas/PlannerBookmarks";
import { PlannerImportPanel } from "@/components/atlas/PlannerImportPanel";
import { PorchfestForecastCard } from "@/components/atlas/PorchfestForecastCard";
import { PorchfestWeatherTimeline } from "@/components/atlas/PorchfestWeatherTimeline";
import { PORCHFEST_EVENT_SITE } from "@/lib/porchfest/porchfest-event";
import { usePorchfestWeather } from "@/lib/porchfest/use-porchfest-weather";
import { WEATHER_MIN_ZOOM } from "@/lib/porchfest/weatherlayers-config";
import { PorchfestPlannerSidebar } from "@/components/atlas/PorchfestPlannerSidebar";
import type { KmlEventFeature } from "@/lib/civic/kml-event-layer-rules";
import {
  PlannerLayerControls,
  DEFAULT_PLANNER_VISIBILITY,
  type PlannerLayerVisibility,
} from "@/components/atlas/PlannerLayerControls";
import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import {
  CreateEventTaskDocument,
  CreatePlacementDocument,
  DeleteEventTaskDocument,
  DeletePlacementDocument,
  EventPlacementsDocument,
  EventTasksListDocument,
  UpdateEventTaskDocument,
  UpdatePlacementDocument,
  type EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";
import {
  fetchEvents,
  fetchPlaces,
  fetchSignals,
  type FreshSignal,
  type PlacesCollection,
  type SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import {
  openCivicStore,
  type CivicStoreApi,
} from "@/lib/civic/civic-editor-loader";
import {
  bindCivicRowsToMap,
  pointGeometryToCivicLocation,
  type CivicMapRow,
} from "@/lib/civic/civic-map-binding";
import {
  CIVIC_FIGURE_KEYS,
  type CivicObjectFields,
} from "@/lib/civic/civic-object-schema";
import { reconcileAddressLocation } from "@/lib/civic/civic-address-sync";
import {
  isCivicFigureKey,
  resolveCivicFigureKey,
} from "@/lib/civic/civic-figure-resolver";

const TENANT_SLUG = "flint";
const EVENT_SLUG = "porchfest-2026";
const PLANNER_DRAG_BLOCK_LAYER_IDS = ["planner-editable-direct-drag"] as const;
/**
 * Sentinel version for civic-object placements inside the editable layer.
 * Civic objects live in the BlockSuite/Yjs store, not the GraphQL
 * placements table, so they carry no optimistic-concurrency version; drags
 * are intercepted by civic row id before the version branch runs.
 */
const CIVIC_PLACEMENT_VERSION = -1;

/**
 * Carriage Town extent. Frames the planning area and sets the street-
 * level zoom: the map fits this bbox on load so individual porches,
 * trucks, and tents are legible as distinct 3D forms.
 */
const CARRIAGE_TOWN_BOUNDS: [[number, number], [number, number]] = [
  [-83.7125, 43.0145],
  [-83.6925, 43.0265],
];

// Basemap layer visibility (buildings on so the 3D affordances read
// against the sketch-model neighborhood, events off to avoid clutter).
const DEFAULT_BASEMAP_LAYERS: Record<string, boolean> = {
  places: true,
  buildings: true,
  urbanDesignModel: true,
  buildingFabric: true,
  osmBuildings: false,
  events: false,
  wards: true,
  infrastructure: true,
  scenarioEnvelopes: false,
  // Realtime traffic flow: parity with /open-flint-atlas. The MDOT 2024 AADT
  // segments (honest HISTORIC_AVERAGE provenance) render under the planner
  // placements, so road-congestion context is visible while siting porches,
  // stages, and parking. The flow overlay is pointer-events-none and the deck
  // line layer sits below extraDeckLayers, so planner clicks are unaffected.
  traffic: true,
};

const MOBILE_BASEMAP_LAYERS: Record<string, boolean> = {
  ...DEFAULT_BASEMAP_LAYERS,
  places: false,
  wards: false,
  infrastructure: false,
  buildingFabric: false,
  events: false,
  traffic: false,
};

// The traffic network the realtime snapshot resolves. Matches
// OpenFlintAtlasScene so both routes show the same Flint traffic data.
const TRAFFIC_NETWORK_ID = "flint-downtown";

const CATEGORY_HUMAN_LABEL: Record<AtlasEventPlannerCategory, string> = {
  music: "Music",
  vendor: "Vendor",
  food_court: "Food",
  kid_zone: "Kid Zone",
  parking: "Parking",
  restroom: "Restroom",
  rest_area: "Rest Area",
  after_party: "After Party",
  amenity: "Amenity",
};

const CIVIC_APP_DRAG_TYPE = "application/x-civic-app";

function isPlannerCategory(value: string): value is AtlasEventPlannerCategory {
  return value in CATEGORY_HUMAN_LABEL;
}

function plannerCategoryLabel(category: string): string {
  return isPlannerCategory(category)
    ? CATEGORY_HUMAN_LABEL[category]
    : category.replace(/_/g, " ");
}

function civicCategoryToPlannerCategory(
  category: CivicMapRow["fields"]["category"],
): AtlasEventPlannerCategory {
  switch (category) {
    case "musician":
      return "music";
    case "vendor":
      return "vendor";
    case "entertainer":
    case "other":
    case "something_else":
    default:
      return "amenity";
  }
}

function hasDataTransferType(dataTransfer: DataTransfer, type: string): boolean {
  return Array.from(dataTransfer.types).includes(type);
}

function readPlannerCategoryDropPayload(
  dataTransfer: DataTransfer,
): PlannerCategoryDragPayload | null {
  const raw = dataTransfer.getData(PLANNER_CATEGORY_DRAG_TYPE).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerCategoryDragPayload>;
    if (typeof parsed.category === "string" && isPlannerCategory(parsed.category)) {
      return {
        category: parsed.category,
        label:
          typeof parsed.label === "string" && parsed.label.trim() !== ""
            ? parsed.label
            : CATEGORY_HUMAN_LABEL[parsed.category],
        sublabel:
          typeof parsed.sublabel === "string" ? parsed.sublabel : undefined,
      };
    }
  } catch {
    // Fall through: older drag sources may send the category as plain text.
  }
  if (!isPlannerCategory(raw)) return null;
  return { category: raw, label: CATEGORY_HUMAN_LABEL[raw] };
}

type SelectedIslandRow = {
  readonly label: string;
  readonly value: string;
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function textValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    const values = value
      .map((item) => textValue(item))
      .filter((item): item is string => item !== null);
    return values.length > 0 ? values.join(", ") : null;
  }
  return null;
}

function firstTextValue(...values: unknown[]): string | null {
  for (const value of values) {
    const text = textValue(value);
    if (text) return text;
  }
  return null;
}

function joinedTextValues(...values: unknown[]): string | null {
  const parts = values
    .map((value) => textValue(value))
    .filter((value): value is string => value !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function moneyValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return USD_FORMATTER.format(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? USD_FORMATTER.format(parsed) : trimmed;
  }
  return null;
}

function formatTaskDueAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type PlannerPlacementRow = {
  readonly id: string;
  readonly eventLayerId: string;
  readonly category: string;
  readonly sublabel: string | null;
  readonly label: string;
  readonly geometry: Record<string, unknown>;
  readonly status: string;
  readonly notes: string | null;
  readonly version: number;
};
type InitialPorchfestPlacement = AtlasEventPlannerPlacement & {
  readonly version?: number;
};
type PlacementOverrides = ReadonlyMap<string, PlannerEditablePlacement>;
type PlacementDragPreview = {
  readonly placementId: string;
  readonly geometry: Record<string, unknown>;
};
type PlannerDragFeature = {
  readonly properties?: {
    readonly placement_id?: string;
    readonly version?: number;
  };
};

function plannerDragFeature(object: unknown): PlannerDragFeature | null {
  if (!object || typeof object !== "object") return null;
  const feature = object as PlannerDragFeature;
  const placementId = feature.properties?.placement_id;
  const version = feature.properties?.version;
  if (typeof placementId !== "string" || typeof version !== "number") {
    return null;
  }
  return feature;
}

function pointGeometryFromCoordinate(
  coordinate: readonly [number, number],
): Record<string, unknown> {
  return { type: "Point", coordinates: [coordinate[0], coordinate[1]] };
}

function coordinateFromMapDrop(
  event: DragEvent<HTMLDivElement>,
  mapRef: MapRef | null,
): [number, number] | null {
  if (!mapRef) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const point = mapRef.unproject([
    event.clientX - rect.left,
    event.clientY - rect.top,
  ]);
  return [point.lng, point.lat];
}

function hasPlacementVersion(
  placement: InitialPorchfestPlacement,
): placement is InitialPorchfestPlacement & { readonly version: number } {
  return typeof placement.version === "number";
}

/** Map a GraphQL placement row to the renderer's placement shape. */
function toRenderPlacement(row: PlannerPlacementRow): AtlasEventPlannerPlacement {
  return {
    id: row.id,
    eventLayerId: row.eventLayerId,
    category: row.category,
    sublabel: row.sublabel ?? null,
    label: row.label,
    geometry: row.geometry as Record<string, unknown>,
    status: row.status,
    notes: row.notes ?? null,
  };
}

/** Map a GraphQL placement row to the editable-layer shape (+version). */
function toEditablePlacement(row: PlannerPlacementRow): PlannerEditablePlacement {
  return { ...toRenderPlacement(row), version: row.version };
}

function geometryMatches(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function applyPlacementOverrides<T extends AtlasEventPlannerPlacement>(
  placements: readonly T[],
  overrides: PlacementOverrides,
): readonly T[] {
  if (overrides.size === 0) return placements;
  return placements.map((placement) => {
    const override = overrides.get(placement.id);
    return override ? ({ ...placement, ...override } as T) : placement;
  });
}

function applyDragPreview<T extends AtlasEventPlannerPlacement>(
  placements: readonly T[],
  preview: PlacementDragPreview | null,
): readonly T[] {
  if (!preview) return placements;
  return placements.map((placement) =>
    placement.id === preview.placementId
      ? { ...placement, geometry: preview.geometry }
      : placement,
  );
}

function mapTaskStatus(status: string): PlannerTaskStatus {
  switch (status) {
    case "in_progress":
      return "in_progress";
    case "done":
      return "done";
    case "blocked":
      return "blocked";
    case "deferred":
      return "deferred";
    default:
      return "todo";
  }
}

/** Adapt GraphQL tasks to the deck.gl task-icon node contract. */
function tasksToNodes(
  tasks: readonly EventTasksListQuery["eventTasks"][number][],
  placementsById: Map<string, AtlasEventPlannerPlacement>,
): PlannerTaskNode[] {
  return tasks.map((task) => {
    const placement = task.placementId
      ? placementsById.get(task.placementId)
      : null;
    const geom = placement?.geometry as
      | { type?: string; coordinates?: [number, number] }
      | undefined;
    const coords =
      geom?.type === "Point" && geom.coordinates ? geom.coordinates : null;
    return {
      id: task.id,
      title: task.title,
      ownerDisplay: task.ownerDisplay ?? null,
      priority: 0,
      status: mapTaskStatus(task.status),
      // Granular progress: notes-checklist ratio, else status-derived. Unifies
      // the map icon's progress bar with the task rail and event bars.
      completionPct: taskProgress(task),
      childIds: [],
      geoAnchorKind: task.placementId ? "placement" : "unanchored",
      effectivePlacementId: task.placementId ?? null,
      effectiveGeometry: coords
        ? { type: "Point", coordinates: [coords[0], coords[1]] as const }
        : null,
    };
  });
}

/**
 * PlannerPalette's CATEGORY_COLOR carries the planner's category palette as
 * CSS "rgb(r g b)" strings (the legend swatch format); deck.gl wants numeric
 * RGBA. Parsing the one shared table keeps the imported-line stroke in
 * lockstep with the legend without a second color list.
 */
function categoryLineColor(
  category: string | undefined,
): [number, number, number, number] {
  const css =
    CATEGORY_COLOR[(category ?? "amenity") as AtlasEventPlannerCategory] ??
    CATEGORY_COLOR.amenity;
  const channels = css.match(/\d+/g);
  return [
    Number(channels?.[0] ?? 0),
    Number(channels?.[1] ?? 0),
    Number(channels?.[2] ?? 0),
    255,
  ];
}

type ImportedLineFeatureProperties = {
  readonly placement_id: string;
  readonly category: string;
};

/** Carriage Town boundary outline drawn under everything as a frame. */
function buildBoundaryLayer(): Layer {
  const [[west, south], [east, north]] = CARRIAGE_TOWN_BOUNDS;
  return new GeoJsonLayer({
    id: "porchfest-carriage-town-frame",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
              ],
            ],
          },
        },
      ],
    },
    stroked: true,
    filled: false,
    getLineColor: [120, 78, 44, 180],
    lineWidthUnits: "pixels",
    getLineWidth: 1.5,
    lineWidthMinPixels: 1,
    pickable: false,
  });
}

export function PorchfestPlannerClient(props: {
  readonly eventTitle: string;
  readonly initialPlacements: readonly InitialPorchfestPlacement[];
  readonly dataSource: "graphql" | "fixture";
}) {
  return (
    <PlannerClientProvider>
      <PorchfestPlannerWorkspace {...props} />
    </PlannerClientProvider>
  );
}

function PorchfestPlannerWorkspace({
  eventTitle,
  initialPlacements,
  dataSource,
}: {
  readonly eventTitle: string;
  readonly initialPlacements: readonly InitialPorchfestPlacement[];
  readonly dataSource: "graphql" | "fixture";
}) {
  // Internal five-person tool; magic-link auth is deferred per spec.
  const canEdit = true;

  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [signals, setSignals] = useState<FreshSignal[]>([]);
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const [mapZoom, setMapZoom] = useState(17);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>({ kind: "view" });
  const [visibility, setVisibility] = useState<PlannerLayerVisibility>(
    DEFAULT_PLANNER_VISIBILITY,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<PlacementDragPreview | null>(
    null,
  );
  const [placementOverrides, setPlacementOverrides] =
    useState<PlacementOverrides>(() => new Map());
  const [placementDragActive, setPlacementDragActive] = useState(false);
  const [htmlPlannerDragActive, setHtmlPlannerDragActive] = useState(false);
  const [mapDropActive, setMapDropActive] = useState(false);
  // The right task rail is collapsible and collapsed by default; the
  // island is the at-a-glance task surface, the rail is full management.
  const [taskRailOpen, setTaskRailOpen] = useState(false);
  // Step 3: mode-gated building address editing. When on, building clicks
  // open the address editor (otherwise clicks stay with the placement tools).
  const [addressEditMode, setAddressEditMode] = useState(false);
  const [buildingForEdit, setBuildingForEdit] = useState<SelectedBuilding | null>(
    null,
  );
  // On phones the whole chrome folds into the bottom island.
  const isMobile = useIsMobile();
  const networkOnline = useNetworkStatus();
  // Feature 2 drop target: a file dropped anywhere on the map wrapper opens
  // the import flow. Only the first file is read; the import panel detects
  // the kind (CSV vs KML vs GeoJSON) and owns the preview/commit UI.
  const [droppedFile, setDroppedFile] = useState<{
    name: string;
    text: string;
  } | null>(null);
  // Click-to-place arming for an unplaced application: while set, the next
  // map click writes that row's `location` into the civic store. The title
  // rides along so the banner and toast can name the row after the unplaced
  // list re-binds (the row leaves `civicBinding.unplaced` once placed).
  const [placementArm, setPlacementArm] = useState<{
    readonly armedRowId: string;
    readonly armedTitle: string;
  } | null>(null);

  // Realtime traffic flow, parity with /open-flint-atlas. Self-contained:
  // polls the trafficRealtime GraphQL resolver and falls back to the honest
  // fixture when the resolver is unreachable. The snapshot drives the same
  // AnimeTrafficFlowOverlay + deck line layer the atlas route uses, rendered
  // beneath the planner placements.
  const trafficRealtime = useTrafficRealtime(TRAFFIC_NETWORK_ID, {
    fallback: true,
  });
  const trafficSnapshot = trafficRealtime.snapshot;

  /* --- live planner data (urql) ----------------------------------- */

  const [placementsResult, refetchPlacements] = useQuery({
    query: EventPlacementsDocument,
    variables: { tenantSlug: TENANT_SLUG, eventSlug: EVENT_SLUG },
    requestPolicy: "cache-and-network",
  });
  const [tasksResult, refetchTasks] = useQuery({
    query: EventTasksListDocument,
    variables: { tenantSlug: TENANT_SLUG, eventSlug: EVENT_SLUG },
    requestPolicy: "cache-and-network",
  });

  const [, createPlacement] = useMutation(CreatePlacementDocument);
  const [, updatePlacement] = useMutation(UpdatePlacementDocument);
  const [, deletePlacement] = useMutation(DeletePlacementDocument);
  const [, createTask] = useMutation(CreateEventTaskDocument);
  const [, updateTask] = useMutation(UpdateEventTaskDocument);
  const [, deleteTask] = useMutation(DeleteEventTaskDocument);

  const liveRows = placementsResult.data?.placements ?? null;
  const liveTasks = useMemo(
    () => tasksResult.data?.eventTasks ?? [],
    [tasksResult.data],
  );

  /* --- civic-object store (Phase 5 two-way binding) ---------------- */

  // Headless handle on the shared BlockSuite/Yjs civic store: the same doc
  // the /porchfest/workspace editor edits, kept in sync across tabs by the
  // IndexedDB broadcast channel. Placed civic objects render through the
  // same layers as GraphQL placements; drag moves write `location` back to
  // the store, so the workspace table reflects them live (FR-010/011).
  const civicApiRef = useRef<CivicStoreApi | null>(null);
  // The same handle, mirrored into state for render-time consumers (the
  // import panel's commit gating). The ref stays for the drag handlers,
  // which need a stable identity without re-rendering per pointer move.
  const [civicApi, setCivicApi] = useState<CivicStoreApi | null>(null);
  const [civicRows, setCivicRows] = useState<
    ReturnType<CivicStoreApi["list"]>
  >([]);
  useEffect(() => {
    let disposed = false;
    let offChange: (() => void) | undefined;
    openCivicStore()
      .then((api) => {
        if (disposed) return;
        civicApiRef.current = api;
        setCivicApi(api);
        const refresh = () => setCivicRows(api.list());
        offChange = api.onChange(refresh);
        refresh();
      })
      .catch((error: unknown) => {
        // The planner stays fully functional on GraphQL placements alone.
        console.warn(
          "civic store unavailable; map shows GraphQL placements only:",
          error,
        );
      });
    return () => {
      disposed = true;
      offChange?.();
      civicApiRef.current = null;
    };
  }, []);

  const civicBinding = useMemo(() => bindCivicRowsToMap(civicRows), [civicRows]);
  const civicRowIdByPlacementId = useMemo(
    () =>
      new Map(
        civicBinding.placed.map((placement) => [
          placement.id,
          placement.civicRowId,
        ]),
      ),
    [civicBinding.placed],
  );

  // Address mirroring (organizer request). A placed object's `address` field
  // mirrors the nearest Carriage Town building (reverse), and editing the
  // address in the workspace moves the object to that building (forward). Both
  // are plain CRDT writes, never a Postgres relation. addressSeen tracks the
  // prior (address, location) per row so the two directions never loop: a
  // location change is a place/drag (refill the address), an address change is
  // an edit (move the object), and a value we just wrote is recorded so it is
  // not re-read as a fresh edit. Cold load only fills blank addresses; it never
  // reconciles an existing mismatch, since a drag and an edit are
  // indistinguishable without change history.
  const addressSeenRef = useRef<
    Map<string, { address: string; location: string }>
  >(new Map());
  useEffect(() => {
    const api = civicApiRef.current;
    if (!api) return;
    const seen = addressSeenRef.current;
    const live = new Set<string>();
    for (const row of civicRows) {
      live.add(row.rowId);
      const cur = {
        address: (row.fields.address ?? "").trim(),
        location: (row.fields.location ?? "").trim(),
      };
      const { writes, next } = reconcileAddressLocation(
        seen.get(row.rowId) ?? null,
        cur,
      );
      for (const write of writes) {
        api.update(row.rowId, write.field, write.value);
      }
      seen.set(row.rowId, next);
    }
    // Forget deleted rows so the tracking map does not grow without bound.
    for (const id of seen.keys()) {
      if (!live.has(id)) seen.delete(id);
    }
  }, [civicRows]);

  /* --- click-to-place for unplaced applications -------------------- */

  // One-shot by construction: the click handler disarms, which re-runs this
  // effect and detaches the listener. Every other disarm path (Escape, the
  // row's Cancel button, re-arming another row, edit-mode entry, unmount)
  // flows through the same cleanup, so a stale listener cannot survive.
  // Deck placement picks are not filtered: the maplibre click carries no
  // cheap signal that deck consumed it, so a click on an existing figure
  // places at that coordinate and the organizer drags to adjust.
  useEffect(() => {
    if (!placementArm) return;
    const { armedRowId, armedTitle } = placementArm;
    const handleMapClick = (event: {
      lngLat: { lng: number; lat: number };
    }) => {
      const location = pointGeometryToCivicLocation({
        type: "Point",
        coordinates: [event.lngLat.lng, event.lngLat.lat],
      });
      if (location) {
        civicApiRef.current?.update(armedRowId, "location", location);
        setToast(`Placed "${armedTitle}". Drag to adjust.`);
      }
      setPlacementArm(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlacementArm(null);
    };
    // Escape registers even before the map handle arrives, so arming is
    // always cancellable; the click listener attaches once mapRef exists.
    window.addEventListener("keydown", handleKeyDown);
    mapRef?.on("click", handleMapClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      mapRef?.off("click", handleMapClick);
    };
  }, [placementArm, mapRef]);

  // Draw/drag palette modes own map clicks; an armed placement would race
  // them for the same gesture, so entering edit mode disarms.
  useEffect(() => {
    if (paletteMode.kind !== "view") setPlacementArm(null);
  }, [paletteMode.kind]);

  const initialEditablePlacements = useMemo<PlannerEditablePlacement[] | null>(
    () => {
      if (dataSource !== "graphql") return null;
      if (!initialPlacements.every(hasPlacementVersion)) return null;
      return initialPlacements.map((placement) => ({
        ...placement,
        version: placement.version,
      }));
    },
    [dataSource, initialPlacements],
  );

  useEffect(() => {
    if (!liveRows || placementOverrides.size === 0) return;
    setPlacementOverrides((current) => {
      let next: Map<string, PlannerEditablePlacement> | null = null;
      for (const [placementId, override] of current) {
        const liveRow = liveRows.find((row) => row.id === placementId);
        if (!liveRow) continue;
        const liveGeometry = liveRow.geometry as Record<string, unknown>;
        const serverHasCaughtUp =
          liveRow.version > override.version ||
          (liveRow.version === override.version &&
            geometryMatches(liveGeometry, override.geometry));
        if (serverHasCaughtUp) {
          next ??= new Map(current);
          next.delete(placementId);
        }
      }
      return next ?? current;
    });
  }, [liveRows, placementOverrides]);

  // Editing needs version. Server-side GraphQL rows carry it for first
  // paint; the browser query replaces them when the live cache responds.
  const editablePlacementRows = useMemo<readonly PlannerEditablePlacement[] | null>(
    () =>
      liveRows ? liveRows.map(toEditablePlacement) : initialEditablePlacements,
    [liveRows, initialEditablePlacements],
  );
  // Civic objects join the editable set with a sentinel version so the
  // direct-drag layer picks them; their drags never reach the GraphQL
  // mutation (intercepted by civic row id in onDragEnd).
  const civicEditablePlacements = useMemo<readonly PlannerEditablePlacement[]>(
    () =>
      civicBinding.placed.map((placement) => ({
        ...placement,
        version: CIVIC_PLACEMENT_VERSION,
      })),
    [civicBinding.placed],
  );

  const editablePlacements = useMemo<readonly PlannerEditablePlacement[] | null>(
    () =>
      editablePlacementRows
        ? [
            ...applyPlacementOverrides(editablePlacementRows, placementOverrides),
            ...civicEditablePlacements,
          ]
        : null,
    [editablePlacementRows, placementOverrides, civicEditablePlacements],
  );

  // Rendered placements: live rows when present, else SSR fixture, plus
  // placed civic objects from the collaborative store.
  const baseRenderPlacements = useMemo<readonly AtlasEventPlannerPlacement[]>(
    () => [
      ...applyPlacementOverrides(
        liveRows ? liveRows.map(toRenderPlacement) : initialPlacements,
        placementOverrides,
      ),
      ...civicBinding.placed,
    ],
    [liveRows, initialPlacements, placementOverrides, civicBinding.placed],
  );
  const renderPlacements = useMemo<readonly AtlasEventPlannerPlacement[]>(
    () => applyDragPreview(baseRenderPlacements, dragPreview),
    [baseRenderPlacements, dragPreview],
  );
  const activeEditablePlacements = useMemo<
    readonly PlannerEditablePlacement[] | null
  >(
    () =>
      editablePlacements
        ? applyDragPreview(editablePlacements, dragPreview)
        : null,
    [editablePlacements, dragPreview],
  );

  const editingAvailable = editablePlacements != null && canEdit;
  const placementsLoaded = liveRows != null || initialEditablePlacements != null;
  const editModeEnabled = paletteMode.kind !== "view";
  const plannerModeLabel = editModeEnabled ? "Edit mode" : "View mode";

  const placementsById = useMemo(() => {
    const map = new Map<string, AtlasEventPlannerPlacement>();
    for (const p of renderPlacements) map.set(p.id, p);
    return map;
  }, [renderPlacements]);

  // Selected placement detail (label + category + address). Driven off
  // renderPlacements so it works in fixture/degrade mode too, where the
  // task rail has no live rows to look the address up from.
  const selectedPlacement = selectedPlacementId
    ? placementsById.get(selectedPlacementId) ?? null
    : null;

  // Figure override editing (Feature 1 acceptance 2): available when the
  // selection is civic-backed. The select writes `figureKey` straight to
  // the CRDT store; the store change event re-binds the map, so the
  // rendered figure swaps live with no reload.
  const selectedCivicRowId = selectedPlacementId
    ? civicRowIdByPlacementId.get(selectedPlacementId) ?? null
    : null;
  const selectedCivicFields = useMemo(
    () =>
      selectedCivicRowId
        ? civicRows.find((row) => row.rowId === selectedCivicRowId)?.fields ??
          null
        : null,
    [selectedCivicRowId, civicRows],
  );
  const selectedCivicAutoKey = selectedCivicFields
    ? resolveCivicFigureKey(selectedCivicFields)
    : null;
  const selectedCivicFigureOverride = isCivicFigureKey(
    selectedCivicFields?.figureKey,
  )
    ? selectedCivicFields.figureKey
    : null;
  const handleFigureOverrideChange = useCallback(
    (value: string) => {
      if (!selectedCivicRowId) return;
      civicApiRef.current?.update(selectedCivicRowId, "figureKey", value);
    },
    [selectedCivicRowId],
  );

  const selectedCategoryLabel = selectedPlacement
    ? plannerCategoryLabel(selectedPlacement.category)
    : undefined;
  const selectedPlacementTasks = useMemo(
    () =>
      selectedPlacementId
        ? liveTasks.filter((task) => task.placementId === selectedPlacementId)
        : [],
    [liveTasks, selectedPlacementId],
  );
  const selectedFieldRows = useMemo<SelectedIslandRow[]>(() => {
    if (!selectedPlacement) return [];
    const fields: Partial<CivicObjectFields> | null = selectedCivicFields;
    const publicName = fields
      ? firstTextValue(
          fields.artistName,
          fields.businessName,
          fields.actName,
          fields.orgName,
          fields.name,
        )
      : null;
    const contact = fields
      ? joinedTextValues(fields.name, fields.email, fields.phone)
      : null;
    const status = firstTextValue(fields?.status, selectedPlacement.status);
    const rows: SelectedIslandRow[] = [
      { label: "Category", value: plannerCategoryLabel(selectedPlacement.category) },
    ];
    if (publicName) rows.push({ label: "Name / business", value: publicName });
    if (fields?.setTime) rows.push({ label: "Time", value: fields.setTime });
    const feePaid = moneyValue(fields?.feePaid);
    if (feePaid) rows.push({ label: "Fee paid", value: feePaid });
    const paymentToBand = moneyValue(fields?.paymentToBand);
    if (paymentToBand) {
      rows.push({ label: "Payment", value: paymentToBand });
    }
    if (contact) rows.push({ label: "Contact", value: contact });
    if (status) {
      rows.push({ label: "Status", value: status.replace(/[-_]/g, " ") });
    }
    const notes = textValue(selectedPlacement.notes);
    if (notes) rows.push({ label: "Notes", value: notes });
    return rows;
  }, [selectedPlacement, selectedCivicFields]);

  const selectedIslandDetailsContent = selectedPlacement ? (
    <section className="space-y-3" aria-label="Selected placement details">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="planner-swatch"
            style={{
              backgroundColor:
                CATEGORY_COLOR[
                  selectedPlacement.category as AtlasEventPlannerCategory
                ] ?? CATEGORY_COLOR.amenity,
            }}
          />
          <p className="planner-kicker truncate">
            {selectedCategoryLabel ?? "Selected"}
          </p>
        </div>
        <button
          type="button"
          className="planner-control shrink-0 px-2 py-1 text-[11px] font-medium"
          onClick={() => setSelectedPlacementId(null)}
        >
          Clear
        </button>
      </div>

      {selectedFieldRows.length > 0 ? (
        <dl className="divide-y divide-[rgba(42,36,25,0.08)]">
          {selectedFieldRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 py-2 first:pt-0"
            >
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                {row.label}
              </dt>
              <dd className="min-w-0 text-[12px] leading-4 text-[color:var(--ctx-ink)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {selectedCivicRowId ? (
        <div className="space-y-1.5 border-t border-[rgba(42,36,25,0.08)] pt-3">
          <label
            htmlFor="planner-island-figure-override"
            className="planner-kicker block"
          >
            Figure
          </label>
          <select
            id="planner-island-figure-override"
            className="planner-tile w-full px-2 py-1.5 text-[12px] planner-ink"
            value={selectedCivicFigureOverride ?? ""}
            onChange={(event) =>
              handleFigureOverrideChange(event.target.value)
            }
          >
            <option value="">
              {selectedCivicAutoKey
                ? `Auto (${selectedCivicAutoKey})`
                : "Auto"}
            </option>
            {CIVIC_FIGURE_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectedPlacementTasks.length > 0 ? (
        <div className="space-y-1.5 border-t border-[rgba(42,36,25,0.08)] pt-3">
          <p className="planner-kicker">Linked tasks</p>
          <ul className="space-y-1.5">
            {selectedPlacementTasks.map((task) => {
              const dueAt = formatTaskDueAt(task.dueAt);
              return (
                <li key={task.id} className="planner-tile px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[12px] font-medium leading-4 text-[color:var(--ctx-ink)]">
                      {task.title}
                    </p>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {task.ownerDisplay || dueAt ? (
                    <p className="mt-1 text-[11px] leading-4 text-[color:var(--ctx-ink-mute)]">
                      {[task.ownerDisplay, dueAt ? `Due ${dueAt}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  ) : null;

  const placementCountByCategory = useMemo<[string, number][]>(() => {
    const counts = new Map<string, number>();
    for (const p of renderPlacements) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [renderPlacements]);

  /* --- ancillary atlas data --------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    async function loadAtlasData() {
      const [placesResult, eventsResult, signalsResult] = await Promise.all([
        fetchPlaces(),
        fetchEvents(),
        fetchSignals({ candidate_visibility: "with_candidates", limit: 30 }),
      ]);
      if (cancelled) return;
      if (placesResult.ok) setPlaces(placesResult.data);
      if (eventsResult.ok) setEvents(eventsResult.data.events);
      if (signalsResult.ok) setSignals(signalsResult.data.signals);
    }
    void loadAtlasData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --- track zoom for task-icon LOD ------------------------------- */

  useEffect(() => {
    if (!mapRef) return;
    const handle = () => setMapZoom(mapRef.getZoom());
    handle();
    mapRef.on("move", handle);
    return () => {
      mapRef.off("move", handle);
    };
  }, [mapRef]);

  /* --- initial camera focus: the festival cluster ----------------- */
  // Centre on the placement bbox and derive a street-level zoom from its
  // span so PorchFest fills the view on first paint, rather than the
  // whole-neighborhood framing. Computed from the stable SSR placements
  // so live data loading later does not re-jump the camera.
  const placementFocus = useMemo<{ center: [number, number]; zoom: number }>(() => {
    const pts: Array<[number, number]> = [];
    for (const placement of initialPlacements) {
      const geom = placement.geometry as {
        type?: string;
        coordinates?: number[];
      };
      if (geom?.type === "Point" && Array.isArray(geom.coordinates)) {
        const [lng, lat] = geom.coordinates;
        if (typeof lng === "number" && typeof lat === "number") {
          pts.push([lng, lat]);
        }
      }
    }
    const [[w, s], [e, n]] = CARRIAGE_TOWN_BOUNDS;
    if (pts.length === 0) {
      return { center: [(w + e) / 2, (s + n) / 2], zoom: 15.3 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sumX += x;
      sumY += y;
    }
    // Mean centroid for the centre (robust to a stray outlier like a far
    // parking lot or trail rest area), bbox span for the zoom.
    const center: [number, number] = [sumX / pts.length, sumY / pts.length];
    // Approximate web-mercator fit zoom for the wider span (latitude
    // weighted ~1.4x for the cos(lat) compression at Flint), biased
    // tighter (-1.0) for the oblique pitch, clamped to a street band so a
    // stray outlier cannot zoom the festival back out.
    const span = Math.max(maxX - minX, (maxY - minY) * 1.4, 1e-4);
    const fitZoom = Math.log2((1000 * 360) / (256 * span)) - 1.0;
    return { center, zoom: Math.min(16.8, Math.max(15.8, fitZoom)) };
  }, [initialPlacements]);

  /* --- frame Carriage Town on load -------------------------------- *
   * AtlasMap's desktop initialViewState is a static per-viewMode
   * lookup (Flint-wide oblique, zoom 12.35), so the `initialBounds`
   * prop only reaches the mobile fit path. On desktop the planning
   * affordances would render sub-pixel at the city-wide zoom. Frame
   * the planning bbox here, page-side, through the map handle so the
   * porch, truck, and tent meshes are legible as distinct 3D forms.
   * Oblique pitch/bearing match the "oblique" view mode; duration 0
   * so the framing is correct on first paint rather than animating
   * in from the city-wide default.
   */
  useEffect(() => {
    if (!mapRef) return;
    const frameCarriageTown = () => {
      // Start zoomed in on the festival itself: centre on the placement
      // cluster and use the span-derived street-level zoom (placementFocus)
      // instead of the whole-neighborhood view. Oblique pitch/bearing match
      // the "oblique" view mode; the place-select handler zooms to 18.5 to
      // inspect one.
      mapRef.jumpTo({
        center: placementFocus.center,
        zoom: placementFocus.zoom,
        pitch: 45,
        bearing: -24,
      });
    };
    // Apply immediately: maplibre camera moves are valid before the
    // style "load" event, and gating on "load" is unreliable (offline,
    // or when remote basemap tiles stall, "load" may never fire and the
    // camera would stay at the city-wide default).
    frameCarriageTown();
    // Re-apply once the style reports loaded so the framing survives a
    // late container resize on first paint. Idempotent (duration 0).
    mapRef.once("load", frameCarriageTown);
    return () => {
      mapRef.off("load", frameCarriageTown);
    };
  }, [mapRef, placementFocus]);

  /* --- transient toast ------------------------------------------- */

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const refreshPlacements = useCallback(() => {
    refetchPlacements({ requestPolicy: "network-only" });
  }, [refetchPlacements]);
  const refreshTasks = useCallback(() => {
    refetchTasks({ requestPolicy: "network-only" });
  }, [refetchTasks]);

  /* --- SSE realtime consumption (PP-8) ---------------------------- */
  // Connects only when an SSE endpoint is configured. On a planner_change
  // event it refetches both queries so other planners' edits land. No
  // endpoint -> no connection (honest: the FE never fakes live activity).
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CIVIC_ATLAS_SSE_URL;
    if (!base) return;
    const url = `${base}?tenant=${TENANT_SLUG}&event=${EVENT_SLUG}`;
    let source: EventSource | null = null;
    try {
      source = new EventSource(url);
    } catch {
      return;
    }
    const onChange = () => {
      refreshPlacements();
      refreshTasks();
    };
    source.addEventListener("planner_change", onChange);
    source.onerror = () => {
      source?.close();
    };
    return () => {
      source?.removeEventListener("planner_change", onChange);
      source?.close();
    };
  }, [refreshPlacements, refreshTasks]);

  /* --- placement mutation handlers -------------------------------- */

  const handleTranslate = useCallback(
    (placementId: string, expectedVersion: number, geometry: Record<string, unknown>) => {
      setDragPreview({ placementId, geometry });
      void updatePlacement({
        input: { placementId, expectedVersion, geometry },
      }).then((result) => {
        if (result.error) {
          setDragPreview(null);
          setToast(`Move failed: ${result.error.message}`);
          return;
        }
        const updateResult = result.data?.updatePlacement;
        if (updateResult?.staleWrite) {
          setDragPreview(null);
          setToast("Someone else moved this point. Reloaded the latest.");
          refreshPlacements();
          return;
        }
        if (!updateResult?.placement || updateResult.deleted) {
          setDragPreview(null);
          setToast("Move failed: placement is no longer available.");
          refreshPlacements();
          return;
        }
        const updatedPlacement = toEditablePlacement(updateResult.placement);
        setPlacementOverrides((current) => {
          const next = new Map(current);
          next.set(updatedPlacement.id, updatedPlacement);
          return next;
        });
        setDragPreview(null);
        refreshPlacements();
      });
    },
    [updatePlacement, refreshPlacements],
  );

  const handleTranslatePreview = useCallback(
    (placementId: string, geometry: Record<string, unknown> | null) => {
      setDragPreview((current) => {
        if (!geometry) {
          return current?.placementId === placementId ? null : current;
        }
        return { placementId, geometry };
      });
    },
    [],
  );
  const handleTranslateDragStateChange = useCallback((active: boolean) => {
    setPlacementDragActive(active);
  }, []);

  const plannerPointerDragHandler =
    useMemo<DeckLayerPointerDragHandler | null>(() => {
      if (!editingAvailable || paletteMode.kind !== "drag") return null;
      return {
        layerIds: PLANNER_DRAG_BLOCK_LAYER_IDS,
        pickingRadius: 28,
        onDragStart: ({ object }) => {
          const feature = plannerDragFeature(object);
          if (!feature) return;
          setSelectedPlacementId(feature.properties?.placement_id ?? null);
          handleTranslateDragStateChange(true);
        },
        onDrag: ({ object, coordinate }) => {
          const feature = plannerDragFeature(object);
          const placementId = feature?.properties?.placement_id;
          if (!placementId) return;
          handleTranslatePreview(
            placementId,
            pointGeometryFromCoordinate(coordinate),
          );
        },
        onDragEnd: ({ object, coordinate }) => {
          const feature = plannerDragFeature(object);
          const placementId = feature?.properties?.placement_id;
          // Civic objects first: their system of record is the CRDT store,
          // so the write is local-first (no version, no snap-back) and the
          // IndexedDB broadcast carries it to the workspace live.
          const civicRowId = placementId
            ? civicRowIdByPlacementId.get(placementId)
            : undefined;
          if (placementId && civicRowId) {
            const location = pointGeometryToCivicLocation(
              pointGeometryFromCoordinate(coordinate),
            );
            if (location) {
              civicApiRef.current?.update(civicRowId, "location", location);
            }
            setDragPreview(null);
            handleTranslateDragStateChange(false);
            return;
          }
          const version = feature?.properties?.version;
          if (placementId && typeof version === "number") {
            handleTranslate(
              placementId,
              version,
              pointGeometryFromCoordinate(coordinate),
            );
          }
          handleTranslateDragStateChange(false);
        },
      };
    }, [
      editingAvailable,
      paletteMode.kind,
      civicRowIdByPlacementId,
      handleTranslate,
      handleTranslateDragStateChange,
      handleTranslatePreview,
    ]);

  const handleDraw = useCallback(
    (category: string, sublabel: string | undefined, geometry: Record<string, unknown>) => {
      const human =
        CATEGORY_HUMAN_LABEL[category as AtlasEventPlannerCategory] ?? "Point";
      const existing = placementCountByCategory.find(([c]) => c === category);
      const nextIndex = (existing?.[1] ?? 0) + 1;
      void createPlacement({
        input: {
          eventSlug: EVENT_SLUG,
          category,
          sublabel,
          label: `${human} ${nextIndex}`,
          geometry,
        },
      }).then((result) => {
        if (result.error) {
          setToast(`Create failed: ${result.error.message}`);
          return;
        }
        refreshPlacements();
        setToast(`Created ${human} ${nextIndex}. Drag to adjust.`);
      });
    },
    [createPlacement, placementCountByCategory, refreshPlacements],
  );

  const handlePlannerSourceDragEnd = useCallback(() => {
    setHtmlPlannerDragActive(false);
    setMapDropActive(false);
  }, []);

  const handlePaletteCategoryDragStateChange = useCallback((active: boolean) => {
    setHtmlPlannerDragActive(active);
    if (!active) setMapDropActive(false);
  }, []);

  const handleApplicationDragStart = useCallback(
    (event: DragEvent<HTMLLIElement>, row: CivicMapRow) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(CIVIC_APP_DRAG_TYPE, row.rowId);
      event.dataTransfer.setData("text/plain", row.title);
      setPlacementArm(null);
      setHtmlPlannerDragActive(true);
    },
    [],
  );

  /* --- map drops: files, unplaced applications, and palette tools ---- */

  const handleMapDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    const dataTransfer = event.dataTransfer;
    const acceptsDrop =
      hasDataTransferType(dataTransfer, "Files") ||
      hasDataTransferType(dataTransfer, CIVIC_APP_DRAG_TYPE) ||
      hasDataTransferType(dataTransfer, PLANNER_CATEGORY_DRAG_TYPE);
    if (!acceptsDrop) return;
    event.preventDefault();
    setMapDropActive(true);
  }, []);

  const handleMapDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    // Without preventDefault the browser navigates away to the dropped file.
    const dataTransfer = event.dataTransfer;
    const acceptsDrop =
      hasDataTransferType(dataTransfer, "Files") ||
      hasDataTransferType(dataTransfer, CIVIC_APP_DRAG_TYPE) ||
      hasDataTransferType(dataTransfer, PLANNER_CATEGORY_DRAG_TYPE);
    if (!acceptsDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleMapDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const stillInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (stillInside) return;
    setMapDropActive(false);
  }, []);

  const handleMapDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setHtmlPlannerDragActive(false);
    setMapDropActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void file.text().then(
        (text) => setDroppedFile({ name: file.name, text }),
        () => setToast(`Could not read ${file.name}.`),
      );
      return;
    }

    const civicRowId = event.dataTransfer.getData(CIVIC_APP_DRAG_TYPE).trim();
    const categoryPayload = readPlannerCategoryDropPayload(event.dataTransfer);
    if (!civicRowId && !categoryPayload) return;

    const coordinate = coordinateFromMapDrop(event, mapRef);
    if (!coordinate) {
      setToast("Map is still loading. Try again.");
      return;
    }

    if (civicRowId) {
      const location = pointGeometryToCivicLocation(
        pointGeometryFromCoordinate(coordinate),
      );
      if (!location) {
        setToast("Could not place that application.");
        return;
      }
      const api = civicApiRef.current;
      if (!api) {
        setToast("Application store is still loading. Try again.");
        return;
      }
      const row = civicRows.find((candidate) => candidate.rowId === civicRowId);
      api.update(civicRowId, "location", location);
      setPlacementArm(null);
      setToast(`Placed "${row?.title ?? "application"}". Drag to adjust.`);
      return;
    }

    if (categoryPayload) {
      handleDraw(
        categoryPayload.category,
        categoryPayload.sublabel,
        pointGeometryFromCoordinate(coordinate),
      );
    }
  }, [civicRows, handleDraw, mapRef]);

  const consumeDroppedFile = useCallback(() => setDroppedFile(null), []);

  // Geometry commit for the import panel: imported KML/GeoJSON features
  // become ordinary GraphQL placements (the contract's geometry is GeoJSON,
  // lines included), so they share the selection, render, and realtime
  // paths with hand-drawn points.
  const handleCreateEventFeature = useCallback(
    async (feature: KmlEventFeature): Promise<boolean> => {
      const result = await createPlacement({
        input: {
          eventSlug: EVENT_SLUG,
          category: feature.category,
          label: feature.label,
          geometry: feature.geometry as unknown as Record<string, unknown>,
        },
      });
      if (result.error) return false;
      refreshPlacements();
      return true;
    },
    [createPlacement, refreshPlacements],
  );

  const handleDeletePlacement = useCallback(
    (placement: AtlasEventPlannerPlacement) => {
      const editable = editablePlacements?.find((p) => p.id === placement.id);
      if (!editable) {
        setToast("Cannot delete until placements load from the backend.");
        return;
      }
      if (!window.confirm(`Delete "${placement.label}"?`)) return;
      void deletePlacement({
        input: { placementId: placement.id, expectedVersion: editable.version },
      }).then((result) => {
        if (result.error) {
          setToast(`Delete failed: ${result.error.message}`);
          return;
        }
        if (result.data?.deletePlacement.staleWrite) {
          setToast("Someone else changed this point. Reloaded the latest.");
        }
        if (selectedPlacementId === placement.id) setSelectedPlacementId(null);
        refreshPlacements();
      });
    },
    [editablePlacements, deletePlacement, selectedPlacementId, refreshPlacements],
  );

  /* --- task mutation handlers ------------------------------------- */

  const handleCreateTask = useCallback(
    (input: NewTaskInput) => {
      // ownerDisplay is intentionally omitted. The deployed GraphQL backend's
      // TaskCreateInput predates the free-text `ownerDisplay` field this repo's
      // schema contract added, so sending it makes async-graphql reject the
      // whole mutation ("unknown field ownerDisplay of type TaskCreateInput")
      // and the task never persists. Sending only the supported fields restores
      // task persistence. Re-add ownerDisplay here and in handleUpdateTask once
      // the backend's TaskCreateInput/TaskUpdateInput accept it.
      void createTask({
        input: {
          eventSlug: EVENT_SLUG,
          title: input.title,
          placementId: input.placementId,
        },
      }).then((result) => {
        if (result.error) {
          setToast(`Task create failed: ${result.error.message}`);
          return;
        }
        refreshTasks();
      });
    },
    [createTask, refreshTasks],
  );

  const handleUpdateTask = useCallback(
    (taskId: string, version: number, patch: TaskPatch) => {
      // ownerDisplay is stripped from the patch: the deployed backend's
      // TaskUpdateInput rejects it (see handleCreateTask). Title, status, and
      // placement edits still persist; an owner-only change is a no-op until
      // the backend accepts ownerDisplay.
      void updateTask({
        input: {
          taskId,
          expectedVersion: version,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.placementId !== undefined
            ? { placementId: patch.placementId }
            : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        },
      }).then((result) => {
        if (result.error) {
          setToast(`Task update failed: ${result.error.message}`);
          return;
        }
        if (result.data?.updateTask.staleWrite) {
          setToast("Someone else changed this task. Reloaded the latest.");
        }
        refreshTasks();
      });
    },
    [updateTask, refreshTasks],
  );

  const handleDeleteTask = useCallback(
    (taskId: string, version: number) => {
      void deleteTask({ input: { taskId, expectedVersion: version } }).then(
        (result) => {
          if (result.error) {
            setToast(`Task delete failed: ${result.error.message}`);
            return;
          }
          refreshTasks();
        },
      );
    },
    [deleteTask, refreshTasks],
  );

  /* --- selection + camera ----------------------------------------- */

  const handleSelectPlacement = useCallback(
    (placement: AtlasEventPlannerPlacement) => {
      if (paletteMode.kind === "delete") {
        handleDeletePlacement(placement);
        return;
      }
      setSelectedPlacementId(placement.id);
    },
    [paletteMode.kind, handleDeletePlacement],
  );

  const handleFlyToPlacement = useCallback(
    (placementId: string) => {
      const placement = placementsById.get(placementId);
      const geom = placement?.geometry as
        | { type?: string; coordinates?: number[] }
        | undefined;
      if (!mapRef || geom?.type !== "Point") return;
      const [lng, lat] = geom.coordinates ?? [];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      mapRef.easeTo({ center: [lng, lat], zoom: 18.5, duration: 700 });
      setSelectedPlacementId(placementId);
    },
    [mapRef, placementsById],
  );

  /* --- deck.gl layer stack ---------------------------------------- */

  const editMode = useMemo<PlannerEditMode>(() => {
    if (!editingAvailable) return { type: "off" };
    if (paletteMode.kind === "draw") {
      return {
        type: "draw",
        category: paletteMode.category,
        sublabel: paletteMode.sublabel,
      };
    }
    if (paletteMode.kind === "drag") {
      return { type: "translate" };
    }
    return { type: "off" };
  }, [editingAvailable, paletteMode]);

  const taskNodes = useMemo(
    () => tasksToNodes(liveTasks, placementsById),
    [liveTasks, placementsById],
  );

  // Weather overlay (Lane 4 Tier 2): desktop only. The manifest + forecast
  // hours load whenever the overlay is active (so the time slider shows), but
  // the GPU layers only render once zoomed in past the suspend threshold.
  // Data is free self-hosted NOAA GFS (public/weather), no token.
  const weatherActive = visibility.weather && !isMobile;
  const weatherVisible = weatherActive && mapZoom >= WEATHER_MIN_ZOOM;
  const weather = usePorchfestWeather(weatherActive);

  const extraDeckLayers = useMemo<Layer[]>(() => {
    const layers: Layer[] = [buildBoundaryLayer()];

    // Non-Point placements (imported closures, barrier runs) have no mesh
    // form; one flat GeoJsonLayer strokes them in category color so line
    // imports stay visible and selectable. Pushed before the meshes so the
    // 3D forms draw over the ground-level strokes.
    const linePlacements = renderPlacements.filter((placement) => {
      const geom = placement.geometry as { type?: string } | null;
      return typeof geom?.type === "string" && geom.type !== "Point";
    });
    if (linePlacements.length > 0) {
      const lineData: FeatureCollection<
        Geometry,
        ImportedLineFeatureProperties
      > = {
        type: "FeatureCollection",
        features: linePlacements.map((placement) => ({
          type: "Feature",
          geometry: placement.geometry as unknown as Geometry,
          properties: {
            placement_id: placement.id,
            category: placement.category,
          },
        })),
      };
      layers.push(
        new GeoJsonLayer<ImportedLineFeatureProperties>({
          id: "porchfest-imported-lines",
          data: lineData,
          pickable: true,
          stroked: true,
          filled: false,
          lineWidthUnits: "pixels",
          getLineWidth: 3,
          getLineColor: (feature: unknown) =>
            categoryLineColor(
              (
                feature as Feature<Geometry, ImportedLineFeatureProperties>
              ).properties?.category,
            ),
          onClick: (info) => {
            const props = (
              info.object as
                | Feature<Geometry, ImportedLineFeatureProperties>
                | undefined
            )?.properties;
            if (!props) return false;
            const placement = linePlacements.find(
              (row) => row.id === props.placement_id,
            );
            if (!placement) return false;
            handleSelectPlacement(placement);
            return true;
          },
        }),
      );
    }

    layers.push(
      ...buildPorchfestAffordanceMeshLayers({
        placements: renderPlacements,
        visibility,
        selectedPlacementId,
        onClickPlacement: handleSelectPlacement,
      }),
    );

    if (!isMobile) {
      // Per-submission decoration: name labels (and image billboards when a
      // link field holds a raster URL) above civic-object figures. Phones
      // keep the colored figures but drop text/image chrome.
      layers.push(
        ...buildPorchfestFigureDecorations({
          placements: renderPlacements,
          visibility,
          selectedPlacementId,
        }),
      );
    }

    if (activeEditablePlacements && editMode.type !== "off") {
      const editable = buildPlannerEditableLayer({
        placements: activeEditablePlacements,
        mode: editMode,
        selectedPlacementId,
        onSelect: setSelectedPlacementId,
        onTranslate: handleTranslate,
        onTranslatePreview: handleTranslatePreview,
        onTranslateDragStateChange: handleTranslateDragStateChange,
        onDraw: handleDraw,
      });
      if (editable) layers.push(editable);
    }

    layers.push(
      ...createPlannerTaskLayers({
        tasks: taskNodes,
        visible: visibility.tasks,
        zoom: mapZoom,
        selectedTaskId,
        onClickTask: (task) => {
          setSelectedTaskId(task.id);
          if (task.effectivePlacementId) {
            handleFlyToPlacement(task.effectivePlacementId);
          }
        },
      }),
    );

    // Applicant origin flows (Lane 3): animated city-to-site flows from the
    // civic store. Off by default; drawn on top so the streamlines read over
    // the placement meshes when the storytelling view is toggled on.
    layers.push(
      ...buildPorchfestFlowLayers({
        civicRows,
        visible: visibility.flows,
        eventSite: PORCHFEST_EVENT_SITE,
      }),
    );

    // Forecast weather (Lane 4 Tier 2): wind particles + precipitation raster
    // for the active forecast hour, from self-hosted NOAA GFS GeoTIFFs.
    // weatherVisible folds in the toggle, the mobile gate, and the zoom-suspend
    // threshold; the layers simply drop out below the threshold.
    if (weatherVisible) layers.push(...weather.layers);

    return layers;
  }, [
    renderPlacements,
    visibility,
    selectedPlacementId,
    handleSelectPlacement,
    isMobile,
    activeEditablePlacements,
    editMode,
    handleTranslate,
    handleTranslatePreview,
    handleTranslateDragStateChange,
    handleDraw,
    taskNodes,
    mapZoom,
    selectedTaskId,
    handleFlyToPlacement,
    civicRows,
    weatherVisible,
    weather.layers,
  ]);

  const liveTasksForRail = liveTasks;
  const livePlacementsForRail = useMemo(
    () => liveRows ?? [],
    [liveRows],
  );
  const baseLayerVisibility = isMobile
    ? MOBILE_BASEMAP_LAYERS
    : DEFAULT_BASEMAP_LAYERS;

  // On mobile the chrome folds into the island. Build the folded surfaces
  // as content so the island stays a dumb container; passed only on mobile.
  const islandTasksContent = (
    <PlannerTaskRail
      embedded
      tasks={liveTasksForRail}
      placements={livePlacementsForRail}
      selectedPlacementId={selectedPlacementId}
      canEdit={canEdit}
      onFlyToPlacement={handleFlyToPlacement}
      onCreateTask={handleCreateTask}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
    />
  );
  const editDisabledMessage = placementsLoaded
    ? undefined
    : "Planner backend offline";
  const islandEditContent = (
    <div className="space-y-3">
      <PlannerEditModeToggle
        mode={paletteMode}
        setMode={setPaletteMode}
        canEdit={editingAvailable}
        disabledMessage={editDisabledMessage}
      />
      <PlannerPalette
        mode={paletteMode}
        setMode={setPaletteMode}
        canEdit={editingAvailable}
        disabledMessage={editDisabledMessage}
        onCategoryDragStateChange={handlePaletteCategoryDragStateChange}
        embedded
      />
    </div>
  );
  const islandMapKeyContent = (
    <PlannerLayerControls
      visibility={visibility}
      setVisibility={setVisibility}
      placementCountByCategory={placementCountByCategory}
    />
  );
  const islandInfoContent = (
    <div className="space-y-3">
      <div>
        <p className="planner-kicker">Our Civic Atlas</p>
        <h2 className="planner-ink mt-1 font-display text-[26px] leading-none">
          PorchFest
        </h2>
        <p className="planner-ink-soft mt-1 text-[14px] leading-5">
          {eventTitle}
        </p>
      </div>
      {!placementsLoaded ? (
        <p className="planner-note px-2 py-1 leading-4">
          Backend pending: showing fixture data. Editing unlocks when the
          planner GraphQL service responds.
        </p>
      ) : null}
      {!networkOnline ? (
        <p className="planner-note px-2 py-1 leading-4">
          Offline. Local workspace edits stay on this device and sync when the
          connection returns.
        </p>
      ) : null}
      <PorchfestForecastCard />
      <PlannerBookmarks
        eventSlug={EVENT_SLUG}
        mapRef={mapRef}
        canEdit={canEdit}
        onError={(message) => setToast(message)}
      />
      <a
        className="planner-control planner-ink mt-2 flex min-h-[36px] items-center justify-center px-3 py-2 text-[13px] font-semibold"
        href="/porchfest/workspace"
      >
        Workspace
      </a>
    </div>
  );

  /* --- desktop sidebar section bodies ------------------------------ */
  // The approved CivicAtlasSidebar treatment carried over (see
  // PorchfestPlannerSidebar.tsx). Composition only: these are the SAME
  // panels the old left column stacked, props and state owned here; the
  // sidebar adds rail navigation, search, and collapse around them.
  const sidebarPlannerContent = (
    <>
      <div>
        <h1 className="planner-ink m-0 font-display text-[26px] leading-none">
          PorchFest
        </h1>
        <p className="planner-ink-soft mt-1 text-[13px] leading-5">
          {eventTitle}
        </p>
      </div>
      {!placementsLoaded ? (
        <p className="planner-note px-2 py-1 leading-4">
          Backend pending: showing fixture data. Editing unlocks when the
          planner GraphQL service responds.
        </p>
      ) : null}
      <div>
        <p className="planner-kicker">Mode</p>
        <div className="mt-1.5 space-y-2">
          <PlannerEditModeToggle
            mode={paletteMode}
            setMode={setPaletteMode}
            canEdit={editingAvailable}
            disabledMessage={editDisabledMessage}
          />
          <PlannerPalette
            mode={paletteMode}
            setMode={setPaletteMode}
            canEdit={editingAvailable}
            disabledMessage={editDisabledMessage}
            onCategoryDragStateChange={handlePaletteCategoryDragStateChange}
            embedded
          />
        </div>
      </div>
      <PorchfestForecastCard />
      <div>
        <p className="planner-kicker">Camera</p>
        <div className="mt-1.5">
          <PlannerBookmarks
            eventSlug={EVENT_SLUG}
            mapRef={mapRef}
            canEdit={canEdit}
            onError={(message) => setToast(message)}
          />
        </div>
      </div>
    </>
  );

  const sidebarLayersContent = (
    <div className="space-y-3">
      <PlannerLayerControls
        visibility={visibility}
        setVisibility={setVisibility}
        placementCountByCategory={placementCountByCategory}
      />
      {visibility.weather ? (
        isMobile ? (
          <p className="planner-note px-2 py-1 leading-4">
            The weather overlay is a desktop view; the forecast card covers
            phones.
          </p>
        ) : mapZoom < WEATHER_MIN_ZOOM ? (
          <p className="planner-note px-2 py-1 leading-4">
            Zoom in to the regional frame to see the wind and rain.
          </p>
        ) : weather.available ? (
          <PorchfestWeatherTimeline
            datetimes={weather.datetimes}
            datetime={weather.datetime}
            loading={weather.loading}
            onChange={weather.setDatetime}
          />
        ) : weather.error ? (
          <p className="planner-note px-2 py-1 leading-4">
            Weather data unavailable. Run npm run weather:fetch to refresh the
            forecast frames.
          </p>
        ) : null
      ) : null}
    </div>
  );

  const sidebarImportContent = (
    <PlannerImportPanel
      civicRows={civicRows}
      civicApi={civicApi}
      onCreateEventFeature={handleCreateEventFeature}
      droppedFile={droppedFile}
      onConsumeDroppedFile={consumeDroppedFile}
      onToast={setToast}
    />
  );
  const islandImportContent = (
    <PlannerImportPanel
      civicRows={civicRows}
      civicApi={civicApi}
      onCreateEventFeature={handleCreateEventFeature}
      droppedFile={droppedFile}
      onConsumeDroppedFile={consumeDroppedFile}
      onToast={setToast}
      embedded
    />
  );

  // Applications render prop: the sidebar's search query narrows the
  // unplaced list; the Place/Cancel arming buttons keep their exact
  // wiring (placementArm state + the one-shot map-click effect above).
  const renderSidebarApplications = (query: string) => {
    if (civicRows.length === 0) {
      return (
        <p className="planner-ink-soft text-[12px] leading-4">
          No applications in the shared planning store yet. Submissions
          appear here once the workspace ingests them.
        </p>
      );
    }
    const normalized = query.trim().toLowerCase();
    const unplacedRows =
      normalized === ""
        ? civicBinding.unplaced
        : civicBinding.unplaced.filter(
            (row) =>
              row.title.toLowerCase().includes(normalized) ||
              (row.fields.category ?? "").toLowerCase().includes(normalized),
          );
    return (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <p className="planner-kicker">Unplaced</p>
          <span className="planner-ink-soft text-[11px] tabular-nums">
            {civicBinding.placed.length} placed ·{" "}
            {civicBinding.unplaced.length} unplaced
          </span>
        </div>
        {placementArm ? (
          <p className="planner-note px-2 py-1 leading-4">
            Click the map to place &quot;{placementArm.armedTitle}&quot;. Esc
            cancels.
          </p>
        ) : null}
        {unplacedRows.length > 0 ? (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {unplacedRows.map((row) => {
              const isArmed = placementArm?.armedRowId === row.rowId;
              const plannerCategory = civicCategoryToPlannerCategory(
                row.fields.category,
              );
              return (
                <li
                  key={row.rowId}
                  draggable
                  onDragStart={(event) => handleApplicationDragStart(event, row)}
                  onDragEnd={handlePlannerSourceDragEnd}
                  className="planner-drag-source flex items-center justify-between gap-2 rounded border border-[color:var(--ctx-rule)] px-2 py-1.5 text-[12px]"
                  title={`Drag ${row.title} to the map`}
                >
                  <span className="planner-ink min-w-0 flex-1 truncate">
                    {row.title}
                  </span>
                  <span className="planner-ink-soft flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide">
                    <span
                      aria-hidden="true"
                      className="planner-swatch"
                      style={{ backgroundColor: CATEGORY_COLOR[plannerCategory] }}
                    />
                    <span>{row.fields.category ?? "application"}</span>
                  </span>
                  <button
                    type="button"
                    aria-pressed={isArmed}
                    onClick={() =>
                      setPlacementArm(
                        isArmed
                          ? null
                          : {
                              armedRowId: row.rowId,
                              armedTitle: row.title,
                            },
                      )
                    }
                    className="planner-tile shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide planner-ink"
                  >
                    {isArmed ? "Cancel" : "Place"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : normalized !== "" ? (
          <p className="planner-ink-soft text-[12px]">
            No unplaced applications match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <p className="planner-ink-soft text-[12px]">
            Every application is placed on the map.
          </p>
        )}
        <p className="planner-ink-soft text-[11px] leading-4">
          Drag a placed marker to move it. Set a location in the{" "}
          <a
            className="underline underline-offset-2"
            href="/porchfest/workspace"
          >
            workspace
          </a>{" "}
          to place the rest.
        </p>
      </>
    );
  };

  return (
    <main className="planner-shell relative flex overflow-hidden">
      {/* The map wrapper doubles as the Feature 2 drop target: dropping a
          file anywhere on the map opens the import flow in the left panel. */}
      <div
        className={`planner-map-shell relative flex-1 ${mapDropActive ? "planner-map-drop-active" : ""}`}
        onDragEnter={handleMapDragEnter}
        onDragOver={handleMapDragOver}
        onDragLeave={handleMapDragLeave}
        onDrop={handleMapDrop}
      >
        <ResponsiveAtlasMap
          places={places}
          events={events}
          signals={signals}
          trafficSnapshot={trafficSnapshot}
          onPlaceSelect={() => {}}
          onSignalSelect={() => {}}
          selectedPlaceId={null}
          selectedSignalId={null}
          layerVisibility={baseLayerVisibility}
          initialBounds={CARRIAGE_TOWN_BOUNDS}
          viewMode={isMobile ? "atlas" : "oblique"}
          activeLens="explore"
          urbanDesignMaterialMode="sketch_model"
          extraDeckLayers={extraDeckLayers}
          mapDragPanEnabled={
            !editModeEnabled && !placementDragActive && !htmlPlannerDragActive
          }
          dragPanBlockLayerIds={PLANNER_DRAG_BLOCK_LAYER_IDS}
          deckLayerPointerDragHandler={plannerPointerDragHandler}
          className="h-full w-full"
          onMapReady={setMapRef}
          onBuildingSelect={addressEditMode ? setBuildingForEdit : undefined}
        />

        {/* Address editor (Step 3). Mode-gated: building clicks only open the
            editor while this mode is on, so the planner's placement tools keep
            the click otherwise. The same override store + resolver back the
            atlas building dossier and the map hover tooltip, so a correction
            here shows everywhere. */}
        {!isMobile ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 flex w-[min(300px,calc(100vw-2rem))] flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAddressEditMode((on) => !on);
              setBuildingForEdit(null);
            }}
            aria-pressed={addressEditMode}
            className="planner-panel pointer-events-auto px-3 py-1.5 text-[12px] font-medium text-[color:var(--ctx-ink)]"
          >
            {addressEditMode ? "Editing addresses · Done" : "Edit addresses"}
          </button>
          {addressEditMode && !buildingForEdit ? (
            <p className="planner-panel pointer-events-none px-2 py-1 text-[11px] leading-4 text-[color:var(--ctx-ink-soft)]">
              Click a building to edit its address.
            </p>
          ) : null}
          {buildingForEdit ? (
            <div className="pointer-events-auto w-full">
              <BuildingAddressEditor
                osmId={buildingForEdit.osm_id}
                osmAddress={buildingForEdit.address}
                onClose={() => setBuildingForEdit(null)}
              />
            </div>
          ) : null}
        </div>
        ) : null}

        {/* Left sidebar (desktop only; on mobile every control folds into
            the island, untouched). The approved CivicAtlasSidebar chrome:
            56px icon rail + 320px detail panel, collapse-to-rail. Section
            bodies compose the SAME panels the old left column stacked;
            props and state stay here. The floating bottom-right palette
            moved into the Planner section (embedded variant, beside the
            mode toggle), and the Workspace/Applications tiles became Links
            rows inside the sidebar. */}
        {!isMobile ? (
          <PorchfestPlannerSidebar
            className="hidden md:flex"
            plannerContent={sidebarPlannerContent}
            layersContent={sidebarLayersContent}
            applicationsContent={renderSidebarApplications}
            importContent={sidebarImportContent}
            importSignal={droppedFile}
          />
        ) : null}

        {/* Bottom-center PorchFest Dynamic Island: mirrors the site island
            (collapsed pill -> expanded tabbed glass panel). It now owns the
            selected-placement metadata readout, while shared search and
            task/place tabs remain additive to the sidebar and right rail. */}
        <PorchfestIsland
          placements={renderPlacements}
          tasks={liveTasks}
          onSelectPlacement={handleFlyToPlacement}
          mobile={isMobile}
          selectedPlacement={selectedPlacement}
          selectedCategoryLabel={selectedCategoryLabel}
          selectedDetailsContent={selectedIslandDetailsContent}
          tasksContent={isMobile ? islandTasksContent : undefined}
          editContent={isMobile ? islandEditContent : undefined}
          mapKeyContent={isMobile ? islandMapKeyContent : undefined}
          importContent={isMobile ? islandImportContent : undefined}
          infoContent={isMobile ? islandInfoContent : undefined}
          modeLabel={isMobile ? plannerModeLabel : undefined}
        />

        {/* Right rail reopen handle (desktop only; collapsed by default). */}
        {!isMobile && !taskRailOpen ? (
          <button
            type="button"
            onClick={() => setTaskRailOpen(true)}
            aria-expanded={false}
            aria-label="Show tasks"
            className="planner-panel pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-2 px-3 py-2 text-[13px] text-[color:var(--ctx-ink)]"
          >
            <ListChecks className="h-4 w-4 text-[color:var(--ctx-ink-mute)]" />
            Tasks
            {liveTasks.length > 0 ? (
              <span className="planner-muted font-mono text-[11px]">
                {liveTasks.length}
              </span>
            ) : null}
          </button>
        ) : null}

        {/* Transient toast */}
        {toast ? (
          <div
            className="planner-toast pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 px-4 py-2 text-[14px]"
            style={{
              bottom: isMobile
                ? "calc(max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) + 72px)"
                : "1.5rem",
            }}
          >
            {toast}
          </div>
        ) : null}
      </div>

      {/* Task rail (right column): desktop only; collapsed by default. */}
      {!isMobile && taskRailOpen ? (
        <PlannerTaskRail
          tasks={liveTasksForRail}
          placements={livePlacementsForRail}
          selectedPlacementId={selectedPlacementId}
          canEdit={canEdit}
          onFlyToPlacement={handleFlyToPlacement}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onCollapse={() => setTaskRailOpen(false)}
        />
      ) : null}
    </main>
  );
}
