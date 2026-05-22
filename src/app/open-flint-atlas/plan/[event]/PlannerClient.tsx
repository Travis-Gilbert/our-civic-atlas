"use client";

/**
 * Porchfest Planner client wrapper, Phase 2.
 *
 * Server fetch still happens in page.tsx; this component takes the
 * initial data plus the live urql client (via PlannerClientProvider)
 * and adds:
 *
 *   - Edit-mode toggle (drag/draw vs. view) in the top chrome
 *   - PlannerEditableLayer for drag + drop new pins
 *   - PlannerPalette (bottom-right) for category selection + delete
 *   - PlannerLayerControls (left rail) for visibility toggles
 *   - PlannerTaskRail (right rail) with filters, edit, delete, new
 *   - SSE-driven refetch via usePlannerStream
 *   - Camera fly-to wired through the MapRef onMapReady passthrough
 *
 * Optimistic-concurrency staleWrite responses surface as a small
 * toast at the top-center of the map.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "urql";
import type { MapRef } from "react-map-gl/maplibre";

import { AtlasMap } from "@/components/atlas/AtlasMap";
import {
  createAtlasEventPlannerLayers,
  type AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";
import {
  buildPlannerEditableLayer,
  type PlannerEditMode,
} from "@/components/atlas/PlannerEditableLayer";
import {
  PlannerPalette,
  type PaletteMode,
} from "@/components/atlas/PlannerPalette";
import {
  DEFAULT_PLANNER_VISIBILITY,
  PlannerLayerControls,
  type PlannerLayerVisibility,
} from "@/components/atlas/PlannerLayerControls";
import { PlannerTaskRail } from "@/components/atlas/PlannerTaskRail";
import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import { usePlannerStream } from "@/lib/atlas/plannerStream";
import {
  CreateEventTaskDocument,
  CreatePlacementDocument,
  DeleteEventTaskDocument,
  DeletePlacementDocument,
  EventLayersDocument,
  EventPlacementsDocument,
  EventTasksListDocument,
  UpdateEventTaskDocument,
  UpdatePlacementDocument,
  type EventLayersQuery,
  type EventPlacementsQuery,
  type EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";

type EventLayer = NonNullable<EventLayersQuery["eventLayers"]>[number];
type Placement = EventPlacementsQuery["placements"][number];
type EventTask = EventTasksListQuery["eventTasks"][number];

interface PlannerClientProps {
  readonly eventSlug: string;
  readonly layer: EventLayer | null;
  readonly placements: readonly Placement[];
  readonly tasks: readonly EventTask[];
}

const CARRIAGE_TOWN_BOUNDS: [[number, number], [number, number]] = [
  [-83.7125, 43.0145],
  [-83.6925, 43.0265],
];

const TENANT_SLUG = "flint";

export function PlannerClient(props: PlannerClientProps) {
  return (
    <PlannerClientProvider>
      <PlannerClientInner {...props} />
    </PlannerClientProvider>
  );
}

function PlannerClientInner({
  eventSlug,
  layer: initialLayer,
  placements: initialPlacements,
  tasks: initialTasks,
}: PlannerClientProps) {
  // Hydrate from the server-rendered props on the first render, then
  // let urql take over for live updates. The cache-and-network policy
  // means the queries refetch in the background while we render the
  // initial data.
  const [layersResult] = useQuery({
    query: EventLayersDocument,
    variables: { tenantSlug: TENANT_SLUG },
  });
  const [placementsResult] = useQuery({
    query: EventPlacementsDocument,
    variables: { tenantSlug: TENANT_SLUG, eventSlug },
  });
  const [tasksResult] = useQuery({
    query: EventTasksListDocument,
    variables: { tenantSlug: TENANT_SLUG, eventSlug },
  });

  const layer =
    layersResult.data?.eventLayers.find((l) => l.slug === eventSlug) ??
    initialLayer;
  const placements = placementsResult.data?.placements ?? initialPlacements;
  const tasks = tasksResult.data?.eventTasks ?? initialTasks;

  // Live refetch on row changes.
  usePlannerStream({ tenantSlug: TENANT_SLUG, eventSlug });

  // Mutations.
  const [, createPlacement] = useMutation(CreatePlacementDocument);
  const [, updatePlacement] = useMutation(UpdatePlacementDocument);
  const [, deletePlacement] = useMutation(DeletePlacementDocument);
  const [, createTask] = useMutation(CreateEventTaskDocument);
  const [, updateTask] = useMutation(UpdateEventTaskDocument);
  const [, deleteTask] = useMutation(DeleteEventTaskDocument);

  // UI state.
  const [editEnabled, setEditEnabled] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>({ kind: "drag" });
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    null,
  );
  const [visibility, setVisibility] = useState<PlannerLayerVisibility>(
    DEFAULT_PLANNER_VISIBILITY,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  // When edit is off, the palette should idle in view mode.
  useEffect(() => {
    if (!editEnabled) {
      setPaletteMode({ kind: "view" });
    } else if (paletteMode.kind === "view") {
      setPaletteMode({ kind: "drag" });
    }
  }, [editEnabled, paletteMode.kind]);

  // Auto-dismiss toasts after 6 s.
  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 6_000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  // For now we treat the page as authenticated if the urql sidecar
  // accepted a non-error mutation. The actual `canEdit` boolean
  // gets refined by attempting a no-op probe; simpler: expose a
  // signed-in flag through a dedicated query later. For Phase 2 we
  // optimistically enable edit-mode UI and surface the
  // "this mutation requires a signed-in planner" GraphQL error as a
  // toast on the first attempt.
  const canEdit = true;

  // Convert the urql Placement rows into the AtlasEventPlannerLayer
  // shape. Memoize to keep deck.gl layer identity stable across
  // unrelated renders.
  const plannerPlacements = useMemo<
    (AtlasEventPlannerPlacement & { version: number })[]
  >(
    () =>
      placements.map((p) => ({
        id: p.id,
        eventLayerId: p.eventLayerId,
        category: p.category,
        sublabel: p.sublabel,
        label: p.label,
        geometry: p.geometry,
        status: p.status,
        notes: p.notes,
        version: p.version,
      })),
    [placements],
  );

  const placementById = useMemo(() => {
    const map = new Map<string, (typeof plannerPlacements)[number]>();
    for (const p of plannerPlacements) map.set(p.id, p);
    return map;
  }, [plannerPlacements]);

  const placementCountByCategory = useMemo<
    ReadonlyArray<readonly [string, number]>
  >(() => {
    const buckets = new Map<string, number>();
    for (const p of plannerPlacements) {
      buckets.set(p.category, (buckets.get(p.category) ?? 0) + 1);
    }
    return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [plannerPlacements]);

  const handleClickPlacement = useCallback(
    (placement: AtlasEventPlannerPlacement) => {
      if (paletteMode.kind === "delete") {
        const current = placementById.get(placement.id);
        if (!current) return;
        if (!window.confirm(`Delete placement "${current.label}"?`)) return;
        void deletePlacement({
          input: {
            placementId: current.id,
            expectedVersion: current.version,
          },
        }).then((result) => {
          if (result.error) {
            setToast(result.error.message);
            return;
          }
          if (result.data?.deletePlacement.staleWrite) {
            setToast(
              `${current.label} changed since you last loaded it — refreshed`,
            );
          }
        });
        return;
      }
      setSelectedPlacementId(placement.id);
    },
    [paletteMode, placementById, deletePlacement],
  );

  // Editable-layer commits.
  const handleTranslate = useCallback(
    (placementId: string, expectedVersion: number, geometry: Record<string, unknown>) => {
      void updatePlacement({
        input: { placementId, expectedVersion, geometry },
      }).then((result) => {
        if (result.error) {
          setToast(result.error.message);
          return;
        }
        if (result.data?.updatePlacement.staleWrite) {
          setToast("Another planner moved that pin first — refreshed");
        }
      });
    },
    [updatePlacement],
  );

  const handleDraw = useCallback(
    (
      category: string,
      sublabel: string | undefined,
      geometry: Record<string, unknown>,
    ) => {
      void createPlacement({
        input: {
          eventSlug,
          category,
          sublabel: sublabel ?? "",
          label: `New ${category.replace(/_/g, " ")} (click to name)`,
          geometry,
          status: "placed",
          notes: "",
        },
      }).then((result) => {
        if (result.error) {
          setToast(result.error.message);
          return;
        }
        const created = result.data?.createPlacement.placement;
        if (created) {
          setSelectedPlacementId(created.id);
        }
        // Drop back into translate after each draw so the planner
        // can immediately move the new pin.
        setPaletteMode({ kind: "drag" });
      });
    },
    [createPlacement, eventSlug],
  );

  // Map the palette mode -> editable-layer edit mode.
  const editMode: PlannerEditMode = useMemo(() => {
    if (!editEnabled) return { type: "off" };
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
  }, [editEnabled, paletteMode]);

  const editableLayer = useMemo(() => {
    return buildPlannerEditableLayer({
      placements: plannerPlacements,
      mode: editMode,
      selectedPlacementId,
      onTranslate: handleTranslate,
      onDraw: handleDraw,
    });
  }, [
    plannerPlacements,
    editMode,
    selectedPlacementId,
    handleTranslate,
    handleDraw,
  ]);

  // Read-only category layers always render; the editable layer sits
  // on top when active.
  const readOnlyLayers = useMemo(() => {
    return createAtlasEventPlannerLayers({
      placements: plannerPlacements.filter(
        (p) =>
          visibility[p.category as keyof PlannerLayerVisibility] !== false,
      ),
      onClickPlacement: handleClickPlacement,
    });
  }, [plannerPlacements, visibility, handleClickPlacement]);

  const extraDeckLayers = useMemo(
    () => (editableLayer ? [...readOnlyLayers, editableLayer] : readOnlyLayers),
    [readOnlyLayers, editableLayer],
  );

  const flyTo = useCallback(
    (placementId: string) => {
      const placement = placementById.get(placementId);
      const geometry = placement?.geometry as
        | { type?: string; coordinates?: number[] }
        | null
        | undefined;
      if (!mapRef || !geometry || geometry.type !== "Point") return;
      const [lng, lat] = geometry.coordinates ?? [];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      mapRef.easeTo({ center: [lng, lat], zoom: 19, duration: 800 });
      setSelectedPlacementId(placementId);
    },
    [mapRef, placementById],
  );

  return (
    <div className="planner-shell relative flex h-full w-full">
      <aside
        aria-label="Event layer controls"
        className="planner-left-rail z-[6] flex w-64 shrink-0 flex-col gap-3 border-r border-stone-300/60 bg-amber-50/85 p-4 backdrop-blur"
      >
        <header>
          <p className="text-xs uppercase tracking-wider text-stone-500">
            Event layer
          </p>
          <h1 className="mt-1 text-lg font-semibold text-stone-800">
            {layer?.title ?? eventSlug}
          </h1>
          {layer?.startsAt ? (
            <p className="mt-1 text-xs text-stone-600">
              {new Date(layer.startsAt).toLocaleString()}
            </p>
          ) : null}
        </header>
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-stone-300 bg-white/70 px-3 py-2 text-sm text-stone-700">
          <span>Edit mode</span>
          <input
            type="checkbox"
            checked={editEnabled}
            onChange={() => setEditEnabled((prev) => !prev)}
            className="h-3.5 w-3.5 accent-stone-700"
          />
        </label>
        <PlannerLayerControls
          visibility={visibility}
          setVisibility={setVisibility}
          placementCountByCategory={placementCountByCategory}
        />
        <p className="mt-auto text-[10px] text-stone-500">
          Edits write to Postgres and broadcast over SSE. Other planners see
          your moves within a second.
        </p>
      </aside>

      <div className="planner-map relative flex-1">
        <AtlasMap
          places={null}
          events={[]}
          onPlaceSelect={() => {}}
          selectedPlaceId={null}
          layerVisibility={{ osmBuildings: false, places: false }}
          initialBounds={CARRIAGE_TOWN_BOUNDS}
          viewMode="atlas"
          onMapReady={(ref) => setMapRef(ref)}
          extraDeckLayers={extraDeckLayers}
        />
        {editEnabled ? (
          <PlannerPalette
            mode={paletteMode}
            setMode={setPaletteMode}
            canEdit={canEdit}
          />
        ) : null}
        {toast ? (
          <div
            role="status"
            className="planner-toast pointer-events-none absolute left-1/2 top-4 z-[30] -translate-x-1/2 rounded-md bg-stone-900/95 px-4 py-2 text-sm text-amber-50 shadow"
          >
            {toast}
          </div>
        ) : null}
      </div>

      <PlannerTaskRail
        tasks={tasks}
        placements={placements}
        selectedPlacementId={selectedPlacementId}
        canEdit={canEdit}
        onFlyToPlacement={flyTo}
        onCreateTask={(input) => {
          void createTask({
            input: {
              eventSlug,
              title: input.title,
              placementId: input.placementId ?? "",
              status: "open",
            },
          }).then((result) => {
            if (result.error) setToast(result.error.message);
          });
        }}
        onUpdateTask={(taskId, version, patch) => {
          void updateTask({
            input: {
              taskId,
              expectedVersion: version,
              ...patch,
            },
          }).then((result) => {
            if (result.error) {
              setToast(result.error.message);
              return;
            }
            if (result.data?.updateTask.staleWrite) {
              setToast("Another planner updated that task first — refreshed");
            }
          });
        }}
        onDeleteTask={(taskId, version) => {
          if (!window.confirm("Delete this task?")) return;
          void deleteTask({
            input: { taskId, expectedVersion: version },
          }).then((result) => {
            if (result.error) {
              setToast(result.error.message);
              return;
            }
            if (result.data?.deleteTask.staleWrite) {
              setToast("Task changed since you last loaded it — refreshed");
            }
          });
        }}
      />
    </div>
  );
}
