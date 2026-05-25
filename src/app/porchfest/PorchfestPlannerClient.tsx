"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { ResponsiveAtlasMap } from "@/components/atlas/ResponsiveAtlasMap";
import {
  createAtlasEventPlannerLayers,
  type AtlasEventPlannerCategory,
  type AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";
import {
  fetchEvents,
  fetchPlaces,
  fetchSignals,
  type FreshSignal,
  type PlacesCollection,
  type SpatialEvent,
} from "@/lib/api/openFlintAtlas";

const CARRIAGE_TOWN_BOUNDS: [[number, number], [number, number]] = [
  [-83.7125, 43.0145],
  [-83.6925, 43.0265],
];

const DEFAULT_LAYERS: Record<string, boolean> = {
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

const CATEGORY_LABELS: ReadonlyArray<
  readonly [AtlasEventPlannerCategory, string]
> = [
  ["music", "Music"],
  ["vendor", "Vendors"],
  ["food_court", "Food"],
  ["kid_zone", "Kid Zone"],
  ["parking", "Parking"],
  ["restroom", "Restrooms"],
  ["rest_area", "Rest Area"],
  ["after_party", "After Party"],
  ["amenity", "Other"],
];

export function PorchfestPlannerClient({
  eventTitle,
  initialPlacements,
  dataSource,
}: {
  readonly eventTitle: string;
  readonly initialPlacements: readonly AtlasEventPlannerPlacement[];
  readonly dataSource: "graphql" | "fixture";
}) {
  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [signals, setSignals] = useState<FreshSignal[]>([]);
  const [selectedPlacement, setSelectedPlacement] =
    useState<AtlasEventPlannerPlacement | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<
    Partial<Record<AtlasEventPlannerCategory, boolean>>
  >({});
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

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

  const placementCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const placement of initialPlacements) {
      counts.set(placement.category, (counts.get(placement.category) ?? 0) + 1);
    }
    return counts;
  }, [initialPlacements]);

  const plannerLayers = useMemo(
    () =>
      createAtlasEventPlannerLayers({
        placements: initialPlacements,
        visibility: visibleCategories,
        onClickPlacement: setSelectedPlacement,
        viewMode: "flat",
      }),
    [initialPlacements, visibleCategories],
  );

  const handleToggleCategory = useCallback(
    (category: AtlasEventPlannerCategory) => {
      setVisibleCategories((current) => ({
        ...current,
        [category]: !(current[category] ?? true),
      }));
    },
    [],
  );

  const handleFlyTo = useCallback(
    (placement: AtlasEventPlannerPlacement) => {
      const geometry = placement.geometry as
        | { type?: string; coordinates?: number[] }
        | null;
      if (!mapRef || geometry?.type !== "Point") return;
      const [lng, lat] = geometry.coordinates ?? [];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      mapRef.easeTo({ center: [lng, lat], zoom: 18.7, duration: 700 });
      setSelectedPlacement(placement);
    },
    [mapRef],
  );

  return (
    <main className="relative h-screen overflow-hidden">
      <ResponsiveAtlasMap
        places={places}
        events={events}
        signals={signals}
        onPlaceSelect={() => {}}
        onSignalSelect={() => {}}
        selectedPlaceId={null}
        selectedSignalId={null}
        layerVisibility={DEFAULT_LAYERS}
        initialBounds={CARRIAGE_TOWN_BOUNDS}
        viewMode="atlas"
        activeLens="explore"
        urbanDesignMaterialMode="sketch_model"
        extraDeckLayers={plannerLayers}
        className="h-full w-full"
        onMapReady={setMapRef}
      />

      <section className="pointer-events-auto absolute left-4 top-4 z-10 w-[min(360px,calc(100vw-2rem))] rounded-[6px] border border-stone-300/70 bg-amber-50/88 p-4 shadow-lg backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
          Our Civic Atlas
        </p>
        <h1 className="mt-1 font-display text-4xl leading-none">
          PorchFest
        </h1>
        <p className="mt-2 text-sm leading-5 text-stone-700">
          {eventTitle}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {initialPlacements.length} mapped planning points · {dataSource}
        </p>
      </section>

      <aside className="pointer-events-auto absolute bottom-4 left-4 z-10 w-[min(360px,calc(100vw-2rem))] rounded-[6px] border border-stone-300/70 bg-amber-50/88 p-4 shadow-lg backdrop-blur md:bottom-auto md:top-[170px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
          Layers
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {CATEGORY_LABELS.map(([category, label]) => {
            const active = visibleCategories[category] ?? true;
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleToggleCategory(category)}
                className={`flex items-center justify-between rounded-[4px] border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "border-stone-500 bg-white/75 text-stone-900"
                    : "border-stone-200 bg-stone-100/60 text-stone-500"
                }`}
                aria-pressed={active}
              >
                <span>{label}</span>
                <span className="text-xs">{placementCountByCategory.get(category) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <aside className="pointer-events-auto absolute right-4 top-4 z-10 hidden w-80 rounded-[6px] border border-stone-300/70 bg-amber-50/88 p-4 shadow-lg backdrop-blur md:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
          Selected point
        </p>
        {selectedPlacement ? (
          <div className="mt-3">
            <h2 className="text-xl font-semibold leading-tight">
              {selectedPlacement.label}
            </h2>
            <p className="mt-1 text-sm capitalize text-stone-600">
              {selectedPlacement.category.replace(/_/g, " ")}
            </p>
            {selectedPlacement.notes ? (
              <p className="mt-3 text-sm leading-5 text-stone-700">
                {selectedPlacement.notes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-5 text-stone-600">
            Click a PorchFest point on the map.
          </p>
        )}
      </aside>

      <div className="pointer-events-auto absolute bottom-4 right-4 z-10 hidden max-h-[42vh] w-80 overflow-y-auto rounded-[6px] border border-stone-300/70 bg-amber-50/88 p-3 shadow-lg backdrop-blur lg:block">
        <ul className="space-y-1">
          {initialPlacements.map((placement) => (
            <li key={placement.id}>
              <button
                type="button"
                onClick={() => handleFlyTo(placement)}
                className="w-full rounded-[4px] px-2 py-1.5 text-left text-sm text-stone-700 transition-colors hover:bg-white/80 hover:text-stone-950"
              >
                {placement.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
