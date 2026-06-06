"use client";

/**
 * PorchFest planner client.
 *
 * Composes the deployed event-planner GraphQL surface into a working
 * drag-drop-and-3D planning tool:
 *
 *   - Placements load client-side via urql (EventPlacements) so they
 *     carry `version` for optimistic concurrency and so mutations + SSE
 *     update one live cache. SSR `initialPlacements` seed first paint.
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "urql";
import type { MapRef } from "react-map-gl/maplibre";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { ListChecks } from "lucide-react";

import { ResponsiveAtlasMap } from "@/components/atlas/ResponsiveAtlasMap";
import {
  type AtlasEventPlannerCategory,
  type AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";
import { buildPorchfestAffordanceMeshLayers } from "@/components/atlas/PorchfestAffordanceMeshLayer";
import {
  buildPlannerEditableLayer,
  type PlannerEditMode,
  type PlannerEditablePlacement,
} from "@/components/atlas/PlannerEditableLayer";
import { createPlannerTaskLayers } from "@/components/atlas/PlannerTaskLayer";
import type { PlannerTaskNode, PlannerTaskStatus } from "@/lib/atlas/planner-phase4";
import { PlannerPalette, CATEGORY_COLOR, type PaletteMode } from "@/components/atlas/PlannerPalette";
import { PorchfestIsland } from "@/components/atlas/PorchfestIsland";
import {
  PlannerTaskRail,
  type NewTaskInput,
  type TaskPatch,
} from "@/components/atlas/PlannerTaskRail";
import { PlannerBookmarks } from "@/components/atlas/PlannerBookmarks";
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
  type EventPlacementsQuery,
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

const TENANT_SLUG = "flint";
const EVENT_SLUG = "porchfest-2026";

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
};

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

type LivePlacement = EventPlacementsQuery["placements"][number];

/** Map a live GraphQL placement row to the renderer's placement shape. */
function toRenderPlacement(row: LivePlacement): AtlasEventPlannerPlacement {
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

/** Map a live GraphQL placement row to the editable-layer shape (+version). */
function toEditablePlacement(row: LivePlacement): PlannerEditablePlacement {
  return { ...toRenderPlacement(row), version: row.version };
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
      completionPct: task.status === "done" ? 1 : 0,
      childIds: [],
      geoAnchorKind: task.placementId ? "placement" : "unanchored",
      effectivePlacementId: task.placementId ?? null,
      effectiveGeometry: coords
        ? { type: "Point", coordinates: [coords[0], coords[1]] as const }
        : null,
    };
  });
}

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
  readonly initialPlacements: readonly AtlasEventPlannerPlacement[];
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
}: {
  readonly eventTitle: string;
  readonly initialPlacements: readonly AtlasEventPlannerPlacement[];
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
  const [paletteMode, setPaletteMode] = useState<PaletteMode>({ kind: "drag" });
  const [visibility, setVisibility] = useState<PlannerLayerVisibility>(
    DEFAULT_PLANNER_VISIBILITY,
  );
  const [toast, setToast] = useState<string | null>(null);
  // The right task rail is collapsible and collapsed by default; the
  // island is the at-a-glance task surface, the rail is full management.
  const [taskRailOpen, setTaskRailOpen] = useState(false);

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

  // Editing needs version, which only the live query carries. When the
  // backend is unreachable we keep the SSR fixture for display but
  // editing is unavailable (honest degrade).
  const editablePlacements = useMemo<PlannerEditablePlacement[] | null>(
    () => (liveRows ? liveRows.map(toEditablePlacement) : null),
    [liveRows],
  );

  // Rendered placements: live rows when present, else SSR fixture.
  const renderPlacements = useMemo<readonly AtlasEventPlannerPlacement[]>(
    () => (liveRows ? liveRows.map(toRenderPlacement) : initialPlacements),
    [liveRows, initialPlacements],
  );

  const editingAvailable = editablePlacements != null && canEdit;
  const placementsLoaded = liveRows != null;

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
      void updatePlacement({
        input: { placementId, expectedVersion, geometry },
      }).then((result) => {
        if (result.error) {
          setToast(`Move failed: ${result.error.message}`);
          return;
        }
        if (result.data?.updatePlacement.staleWrite) {
          setToast("Someone else moved this point. Reloaded the latest.");
        }
        refreshPlacements();
      });
    },
    [updatePlacement, refreshPlacements],
  );

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
      });
    },
    [createPlacement, placementCountByCategory, refreshPlacements],
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
      void createTask({
        input: {
          eventSlug: EVENT_SLUG,
          title: input.title,
          placementId: input.placementId,
          ownerDisplay: input.ownerDisplay ?? null,
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
      void updateTask({
        input: { taskId, expectedVersion: version, ...patch },
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
    if (paletteMode.kind === "drag" && selectedPlacementId) {
      return { type: "translate" };
    }
    return { type: "off" };
  }, [editingAvailable, paletteMode, selectedPlacementId]);

  const taskNodes = useMemo(
    () => tasksToNodes(liveTasks, placementsById),
    [liveTasks, placementsById],
  );

  const extraDeckLayers = useMemo<Layer[]>(() => {
    const layers: Layer[] = [buildBoundaryLayer()];

    layers.push(
      ...buildPorchfestAffordanceMeshLayers({
        placements: renderPlacements,
        visibility,
        selectedPlacementId,
        onClickPlacement: handleSelectPlacement,
      }),
    );

    if (editablePlacements && editMode.type !== "off") {
      const editable = buildPlannerEditableLayer({
        placements: editablePlacements,
        mode: editMode,
        selectedPlacementId,
        onTranslate: handleTranslate,
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

    return layers;
  }, [
    renderPlacements,
    visibility,
    selectedPlacementId,
    handleSelectPlacement,
    editablePlacements,
    editMode,
    handleTranslate,
    handleDraw,
    taskNodes,
    mapZoom,
    selectedTaskId,
    handleFlyToPlacement,
  ]);

  const liveTasksForRail = liveTasks;
  const livePlacementsForRail = useMemo(
    () => liveRows ?? [],
    [liveRows],
  );

  return (
    <main className="relative flex h-screen overflow-hidden">
      <div className="relative flex-1">
        <ResponsiveAtlasMap
          places={places}
          events={events}
          signals={signals}
          onPlaceSelect={() => {}}
          onSignalSelect={() => {}}
          selectedPlaceId={null}
          selectedSignalId={null}
          layerVisibility={DEFAULT_BASEMAP_LAYERS}
          initialBounds={CARRIAGE_TOWN_BOUNDS}
          viewMode="oblique"
          activeLens="explore"
          urbanDesignMaterialMode="sketch_model"
          extraDeckLayers={extraDeckLayers}
          className="h-full w-full"
          onMapReady={setMapRef}
        />

        {/* Left column: identity card + layer controls in one flow stack.
            The container is pointer-transparent so the gap between panels
            does not block the map; each panel re-enables pointer events. */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-3">
          <section className="planner-panel planner-panel--primary pointer-events-auto p-4">
            <p className="planner-kicker">Our Civic Atlas</p>
            <h1 className="planner-ink mt-1 font-display text-[32px] leading-none">
              PorchFest
            </h1>
            <p className="planner-ink-soft mt-2 text-[14px] leading-5">
              {eventTitle}
            </p>
            {!placementsLoaded ? (
              <p className="planner-note mt-2 px-2 py-1 leading-4">
                Backend pending: showing fixture data. Editing unlocks when the
                planner GraphQL service responds.
              </p>
            ) : null}
            <div className="mt-3">
              <PlannerBookmarks
                eventSlug={EVENT_SLUG}
                mapRef={mapRef}
                canEdit={canEdit}
                onError={(message) => setToast(message)}
              />
            </div>
          </section>

          {selectedPlacement ? (
            <section className="planner-panel pointer-events-auto p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="planner-kicker">Selected</p>
                <button
                  type="button"
                  onClick={() => setSelectedPlacementId(null)}
                  className="planner-iconbtn flex h-6 w-6 items-center justify-center text-[12px]"
                  aria-label="Clear selection"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
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
                <p className="planner-ink text-[16px] font-medium leading-tight">
                  {selectedPlacement.label}
                </p>
              </div>
              <p className="planner-muted mt-1 text-[12px]">
                {CATEGORY_HUMAN_LABEL[
                  selectedPlacement.category as AtlasEventPlannerCategory
                ] ?? selectedPlacement.category}
              </p>
              {selectedPlacement.address ? (
                <p className="planner-ink-soft mt-2 text-[13px] leading-snug">
                  {selectedPlacement.address}
                </p>
              ) : (
                <p className="planner-faint mt-2 text-[12px]">Address pending</p>
              )}
            </section>
          ) : null}

          <aside className="planner-panel pointer-events-auto p-4">
            <PlannerLayerControls
              visibility={visibility}
              setVisibility={setVisibility}
              placementCountByCategory={placementCountByCategory}
            />
          </aside>
        </div>

        {/* Palette (bottom-right; component is self-positioned) */}
        <PlannerPalette
          mode={paletteMode}
          setMode={setPaletteMode}
          canEdit={editingAvailable}
          disabledMessage={
            placementsLoaded
              ? undefined
              : "Planner backend offline"
          }
        />

        {/* Bottom-center PorchFest Dynamic Island: mirrors the site island
            (collapsed pill -> expanded tabbed glass panel). Shared search
            over placements + tasks, a Tasks view, and a Places view. The
            left panels and the sidebar task rail stay; this is additive. */}
        <PorchfestIsland
          placements={renderPlacements}
          tasks={liveTasks}
          onSelectPlacement={handleFlyToPlacement}
        />

        {/* Right rail reopen handle (the rail is collapsed by default). */}
        {!taskRailOpen ? (
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
          <div className="planner-toast pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 px-4 py-2 text-[14px]">
            {toast}
          </div>
        ) : null}
      </div>

      {/* Task rail (right column): collapsible, collapsed by default. */}
      {taskRailOpen ? (
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
