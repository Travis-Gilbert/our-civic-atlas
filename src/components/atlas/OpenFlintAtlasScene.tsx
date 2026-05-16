"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AtlasSceneChrome,
  type AtlasSceneSearchResult,
} from "@/components/atlas/AtlasSceneChrome";
import { ControlDossier, type LayerPreset } from "@/components/atlas/ControlDossier";
import { LayerControls } from "@/components/atlas/LayerControls";
import { PlaceDossierPanel } from "@/components/atlas/PlaceDossier";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import {
  fetchPlaces,
  fetchEvents,
  fetchProvenance,
  fetchSignals,
  type FreshSignal,
  type PlacesCollection,
  type ProvenanceEdge,
  type ProvenanceNode,
  type SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import { loadAtlasTables, eventStartIso } from "@/lib/atlas/atlas-data";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import { getNodeHorizonEntries } from "@/lib/atlas/node-horizon";
import {
  getAtlasRendererBridge,
  type AtlasRendererMode,
} from "@/lib/atlas/renderer-bridge";
import { getAtlasSceneDetailPolicy } from "@/lib/atlas/scene-detail-policy";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import { DEFAULT_VIEW_MODE_BY_LENS } from "@/lib/atlas/scene-view";

const ProvenancePanel = dynamic(
  () =>
    import("@/components/atlas/CosmosProvenancePanel").then(
      (m) => m.CosmosProvenancePanel,
    ),
  { ssr: false },
);

const AtlasTimelineHistogram = dynamic(
  () =>
    import("@/components/atlas/AtlasTimelineHistogram").then(
      (m) => m.AtlasTimelineHistogram,
    ),
  { ssr: false },
);

const AtlasMap = dynamic(
  () =>
    import("@/components/atlas/ResponsiveAtlasMap").then(
      (m) => m.ResponsiveAtlasMap,
    ),
  { ssr: false },
);
const AtlasThreeScene = dynamic(
  () =>
    import("@/components/atlas/AtlasThreeScene").then(
      (m) => m.AtlasThreeScene,
    ),
  { ssr: false },
);

const DEFAULT_LAYERS: Record<string, boolean> = {
  places: true,
  events: true,
  wards: true,
  infrastructure: true,
};

function initialRendererMode(): AtlasRendererMode {
  if (typeof window === "undefined") return "baseline";
  const renderer = new URLSearchParams(window.location.search).get("renderer");
  return renderer === "scene" || renderer === "r3f" ? "scene" : "baseline";
}

export function OpenFlintAtlasScene(props: {
  initialLens?: AtlasLensId;
  initialCompareAtlasId?: string | null;
}) {
  const { initialLens = "explore" } = props;
  const router = useRouter();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);
  const [viewMode, setViewMode] =
    useState<AtlasSceneViewModeId>(DEFAULT_VIEW_MODE_BY_LENS[initialLens]);
  const [activeLens, setActiveLens] =
    useState<AtlasLensId>(initialLens);
  const [searchValue, setSearchValue] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [rendererMode, setRendererMode] =
    useState<AtlasRendererMode>("baseline");
  const [sceneCameraDistance, setSceneCameraDistance] = useState<number | null>(
    null,
  );

  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [signals, setSignals] = useState<FreshSignal[]>([]);
  const [provNodes, setProvNodes] = useState<ProvenanceNode[]>([]);
  const [provEdges, setProvEdges] = useState<ProvenanceEdge[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [mosaic, setMosaic] = useState<AtlasMosaic | null>(null);
  const [atlasTablesVersion, setAtlasTablesVersion] = useState(0);
  const [filteredEventIds, setFilteredEventIds] = useState<Set<string> | null>(
    null,
  );
  const horizonNodes = useMemo(() => getNodeHorizonEntries(), []);
  const rendererBridge = useMemo(
    () => getAtlasRendererBridge(rendererMode),
    [rendererMode],
  );
  const focusPolicy = useMemo(
    () =>
      getAtlasSceneDetailPolicy({
        activeLens,
        cameraDistance: rendererMode === "scene" ? sceneCameraDistance : null,
        isMobileViewport,
        viewMode,
      }),
    [activeLens, isMobileViewport, rendererMode, sceneCameraDistance, viewMode],
  );

  useEffect(() => {
    setActiveLens(initialLens);
    setViewMode(DEFAULT_VIEW_MODE_BY_LENS[initialLens]);
  }, [initialLens]);

  useEffect(() => {
    setRendererMode(initialRendererMode());
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [placesRes, eventsRes, signalsRes] = await Promise.all([
        fetchPlaces(),
        fetchEvents(),
        fetchSignals({ limit: 24 }),
      ]);

      if (cancelled) return;
      if (placesRes.ok) setPlaces(placesRes.data);
      if (eventsRes.ok) setEvents(eventsRes.data.events);
      if (signalsRes.ok) {
        setSignals(signalsRes.data.signals);
        setSelectedSignalId((current) => current ?? signalsRes.data.signals[0]?.signal_id ?? null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /* Initialize Mosaic + DuckDB-WASM once on mount. The singleton in
     getAtlasMosaic guards against double-init under React strict mode. */
  useEffect(() => {
    let cancelled = false;
    getAtlasMosaic()
      .then((m) => {
        if (!cancelled) setMosaic(m);
      })
      .catch((err) => {
        // Mosaic is enhancement, not load-bearing for the map; log
        // and continue without cross-filter.
        console.warn("Atlas Mosaic init failed; cross-filter disabled.", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* When the data lands AND Mosaic is ready, load tables. */
  useEffect(() => {
    if (!mosaic) return;
    let cancelled = false;
    loadAtlasTables(mosaic, places, events)
      .then(() => {
        if (!cancelled) setAtlasTablesVersion((version) => version + 1);
      })
      .catch((err) => {
        console.warn("loadAtlasTables failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [mosaic, places, events]);

  /* Subscribe to the timeFilter Selection so the map can render only
     events within the brushed range. We don't roundtrip to DuckDB for
     this read: each crossfilter clause carries the brushed
     ``[min, max]`` value directly on the JS object, so we filter the
     in-memory ``events`` array against the range and produce a Set of
     surviving event_ids. The histogram itself still hits DuckDB via
     the vgplot ``rectY(from('atlas_events'))`` spec — that part of
     the cross-filter loop stays in SQL. */
  useEffect(() => {
    if (!mosaic) return;
    const tf = mosaic.timeFilter;

    function recompute() {
      const clauses = (tf as unknown as { clauses?: unknown[] }).clauses ?? [];
      if (!Array.isArray(clauses) || clauses.length === 0) {
        setFilteredEventIds(null);
        return;
      }
      // intervalX clauses carry a ``value`` of [min, max] as Date or number.
      let rangeMin: number | null = null;
      let rangeMax: number | null = null;
      for (const c of clauses) {
        const value = (c as { value?: unknown }).value;
        if (Array.isArray(value) && value.length === 2) {
          const a = value[0] instanceof Date ? value[0].getTime() : Number(value[0]);
          const b = value[1] instanceof Date ? value[1].getTime() : Number(value[1]);
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            rangeMin = Math.min(a, b);
            rangeMax = Math.max(a, b);
            break;
          }
        }
      }
      if (rangeMin == null || rangeMax == null) {
        setFilteredEventIds(null);
        return;
      }

      const ids = new Set<string>();
      for (const e of events) {
        const startIso = eventStartIso(e);
        if (!startIso) continue;
        const t = new Date(startIso).getTime();
        if (!Number.isNaN(t) && t >= rangeMin && t <= rangeMax) {
          ids.add(e.event_id);
        }
      }
      setFilteredEventIds(ids);
    }

    const unlisten = tf.addEventListener("value", recompute) as unknown;
    recompute();
    return () => {
      if (typeof unlisten === "function") unlisten();
    };
  }, [mosaic, events]);

  /* Derive the visible event slice for the map. When no filter is
     active (null) or the brush hasn't been used (full coverage), show
     everything. */
  const visibleEvents =
    filteredEventIds == null
      ? events
      : events.filter((e) => filteredEventIds.has(e.event_id));

  const selectedPlaceName = useMemo(() => {
    if (!selectedPlaceId || !places) return null;
    const selected = places.features.find(
      (feature) => feature.properties.place_id === selectedPlaceId,
    );
    return selected?.properties.name ?? null;
  }, [places, selectedPlaceId]);

  const searchResults = useMemo<AtlasSceneSearchResult[]>(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query || !places) return [];

    return places.features
      .filter((feature) => {
        const name = feature.properties.name.toLowerCase();
        const type = feature.properties.place_type.toLowerCase();
        return name.includes(query) || type.includes(query);
      })
      .slice(0, 6)
      .map((feature) => ({
        id: feature.properties.place_id,
        name: feature.properties.name,
        type: feature.properties.place_type.replaceAll("_", " "),
      }));
  }, [places, searchValue]);

  const handlePlaceSelect = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
  }, []);

  const handleSignalSelect = useCallback((signalId: string) => {
    setSelectedSignalId(signalId);
  }, []);

  const handleLayerChange = useCallback((key: string, visible: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: visible }));
  }, []);

  const handleLensChange = useCallback((lens: AtlasLensId) => {
    setActiveLens(lens);
    setViewMode(DEFAULT_VIEW_MODE_BY_LENS[lens]);
    setLayerVisibility((prev) => ({
      ...prev,
      events: lens !== "explore" || prev.events !== false,
      places: true,
    }));
    router.push(lens === "explore" ? "/open-flint-atlas" : `/open-flint-atlas/${lens}`);
  }, [router]);

  const handleSearchResultSelect = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
    setSearchValue("");
  }, []);

  useEffect(() => {
    if (!selectedPlaceId) {
      setProvNodes([]);
      setProvEdges([]);
      setProvLoading(false);
      return;
    }

    let cancelled = false;
    setProvLoading(true);

    fetchProvenance(selectedPlaceId ? { place_id: selectedPlaceId } : undefined)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setProvNodes(result.data.nodes);
          setProvEdges(result.data.edges);
        } else {
          setProvNodes([]);
          setProvEdges([]);
        }
      })
      .finally(() => {
        if (!cancelled) setProvLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlaceId]);

  const handleProvenanceNodeSelect = useCallback(
    (nodeId: string) => {
      const node = provNodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      if (node.labels.includes("Place")) {
        setSelectedPlaceId(nodeId);
        return;
      }
      const linkedPlaceId =
        typeof node.properties.place_id === "string"
          ? node.properties.place_id
          : null;
      if (linkedPlaceId) setSelectedPlaceId(linkedPlaceId);
    },
    [provNodes],
  );

  const controlDossierPresets: LayerPreset[] = [
    {
      id: "places",
      name: "Places",
      extension: "geojson",
      controls: (
        <div className="space-y-2">
          <p className="text-[11px] leading-[1.5]">
            Wards, neighborhoods, landmarks, and addresses. {places?.features.length ?? 0}{" "}
            features loaded.
          </p>
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: "var(--ctx-ink-mute)" }}>
              Filter type
            </label>
            <select
              defaultValue="all"
              className="flex-1 px-2 py-1 text-[11px] rounded-[2px] bg-transparent"
              style={{ border: "1px solid var(--ctx-rule-soft)", color: "var(--ctx-ink)" }}
            >
              <option value="all">All</option>
              <option value="ward">Wards only</option>
              <option value="landmark">Landmarks only</option>
              <option value="address">Addresses only</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "events",
      name: "Events",
      extension: "ndjson",
      controls: (
        <div className="space-y-2">
          <p className="text-[11px] leading-[1.5]">
            Civic events, observations, and metrics with temporal extent.
            {events.length} events loaded.
          </p>
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: "var(--ctx-ink-mute)" }}>
              Resolution
            </label>
            <select
              defaultValue="all"
              className="flex-1 px-2 py-1 text-[11px] rounded-[2px] bg-transparent"
              style={{ border: "1px solid var(--ctx-rule-soft)", color: "var(--ctx-ink)" }}
            >
              <option value="all">All</option>
              <option value="exact_reviewed">Exact (reviewed)</option>
              <option value="approximate">Approximate</option>
              <option value="neighborhood_only">Neighborhood only</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "wards",
      name: "Ward Boundaries",
      extension: "geojson",
      controls: (
        <div className="space-y-2">
          <p className="text-[11px] leading-[1.5]">
            City ward polygons. Toggle outlines or filled fills.
          </p>
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: "var(--ctx-ink-mute)" }}>
              Style
            </label>
            <select
              defaultValue="outline"
              className="flex-1 px-2 py-1 text-[11px] rounded-[2px] bg-transparent"
              style={{ border: "1px solid var(--ctx-rule-soft)", color: "var(--ctx-ink)" }}
            >
              <option value="outline">Outline only</option>
              <option value="fill">Filled</option>
              <option value="both">Outline + fill</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "infrastructure",
      name: "Infrastructure",
      extension: "geojson",
      controls: (
        <div className="space-y-2">
          <p className="text-[11px] leading-[1.5]">
            Water mains, sewer lines, road segments, transit stops.
          </p>
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: "var(--ctx-ink-mute)" }}>
              Categories
            </label>
            <select
              defaultValue="all"
              className="flex-1 px-2 py-1 text-[11px] rounded-[2px] bg-transparent"
              style={{ border: "1px solid var(--ctx-rule-soft)", color: "var(--ctx-ink)" }}
            >
              <option value="all">All</option>
              <option value="water">Water</option>
              <option value="roads">Roads</option>
              <option value="transit">Transit</option>
            </select>
          </div>
        </div>
      ),
    },
  ];
  const provenancePanel = (
    <ProvenancePanel
      nodes={provNodes}
      edges={provEdges}
      loading={provLoading}
      onNodeSelect={handleProvenanceNodeSelect}
    />
  );

  return (
    <div
      className="h-screen w-full overflow-hidden"
      data-scene-view={viewMode}
      data-active-lens={activeLens}
      data-renderer-mode={rendererMode}
      data-analytical-renderer={rendererBridge.analyticalLayerRenderer}
      data-dense-layer-fallback={rendererBridge.denseLayerFallback}
      data-selection-key={rendererBridge.selectionKey}
    >
      <AtlasShell
        showTabs={false}
        showTimeline={activeLens === "memory"}
        showProvenance={!isMobileViewport && !!selectedPlaceId}
        dossier={
          <ControlDossier
            presets={controlDossierPresets}
            visibility={layerVisibility}
            onToggle={handleLayerChange}
            defaultOpenId={selectedPlaceId ? "places" : undefined}
          />
        }
        timeline={
          <AtlasTimelineHistogram
            mosaic={mosaic}
            dataVersion={atlasTablesVersion}
          />
        }
        provenance={provenancePanel}
        layers={
          <LayerControls
            visibility={layerVisibility}
            onChange={handleLayerChange}
            visible
          />
        }
      >
        <div className="relative h-full w-full">
          {rendererMode === "baseline" ? (
            <AtlasMap
              places={places}
              events={visibleEvents}
              signals={signals}
              onPlaceSelect={handlePlaceSelect}
              onSignalSelect={handleSignalSelect}
              selectedPlaceId={selectedPlaceId}
              selectedSignalId={selectedSignalId}
              layerVisibility={layerVisibility}
              viewMode={viewMode}
              activeLens={activeLens}
              className="w-full h-full"
            />
          ) : (
            <AtlasThreeScene
              places={places}
              events={visibleEvents}
              onPlaceSelect={handlePlaceSelect}
              selectedPlaceId={selectedPlaceId}
              layerVisibility={layerVisibility}
              isMobileViewport={isMobileViewport}
              viewMode={viewMode}
              activeLens={activeLens}
              horizonNodes={horizonNodes}
              onSceneCameraDistanceChange={setSceneCameraDistance}
              className="w-full h-full"
            />
          )}
          <AtlasSceneChrome
            activeLens={activeLens}
            onLensChange={handleLensChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            searchResults={searchResults}
            onSearchResultSelect={handleSearchResultSelect}
            selectedPlaceName={selectedPlaceName}
            placesCount={places?.features.length ?? 0}
            eventsCount={visibleEvents.length}
            horizonNodes={horizonNodes}
            isMobileViewport={isMobileViewport}
            selectedPlaceId={selectedPlaceId}
            focusCameraBand={focusPolicy.cameraDistanceBand}
            focusDetailLevel={focusPolicy.detailLevel}
            onClearSelection={() => setSelectedPlaceId(null)}
            dossierContent={
              <PlaceDossierPanel
                placeId={selectedPlaceId}
                onClose={() => setSelectedPlaceId(null)}
                showCloseButton={false}
              />
            }
          />
        </div>
      </AtlasShell>
    </div>
  );
}
