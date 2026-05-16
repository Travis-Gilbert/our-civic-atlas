"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { LayerControls } from "@/components/atlas/LayerControls";
import { ControlDossier, type LayerPreset } from "@/components/atlas/ControlDossier";
import {
  AtlasSceneChrome,
  type AtlasSceneSearchResult,
} from "@/components/atlas/AtlasSceneChrome";
import {
  MobileDossierSheet,
  PlaceDossierPanel,
} from "@/components/atlas/PlaceDossier";
import { FreshSignalsPanel } from "@/components/atlas/FreshSignalsPanel";
import { SourceTrail } from "@/components/atlas/SourceTrail";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import { loadAtlasTables, eventStartIso } from "@/lib/atlas/atlas-data";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import { DEFAULT_VIEW_MODE_BY_LENS } from "@/lib/atlas/scene-view";
import { getNodeHorizonEntries } from "@/lib/atlas/node-horizon";

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
const ProvenancePanel = dynamic(
  () =>
    import("@/components/atlas/CosmosProvenancePanel").then(
      (m) => m.CosmosProvenancePanel,
    ),
  { ssr: false },
);
import {
  fetchEvents,
  fetchPlaces,
  fetchProvenance,
  fetchSignals,
  fetchSources,
  type AtlasSource,
  type FreshSignal,
  type PlacesCollection,
  type ProvenanceEdge,
  type ProvenanceNode,
  type SpatialEvent,
} from "@/lib/api/openFlintAtlas";

const DEFAULT_LAYERS: Record<string, boolean> = {
  places: true,
  events: true,
  freshSignals: true,
  wards: true,
  infrastructure: true,
};

export function OpenFlintAtlasScene({
  initialLens = "explore",
}: {
  initialLens?: AtlasLensId;
}) {
  const router = useRouter();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);
  const [viewMode, setViewMode] =
    useState<AtlasSceneViewModeId>(DEFAULT_VIEW_MODE_BY_LENS[initialLens]);
  const [activeLens, setActiveLens] =
    useState<AtlasLensId>(initialLens);
  const [searchValue, setSearchValue] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [includeCandidateSignals, setIncludeCandidateSignals] = useState(false);

  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [signals, setSignals] = useState<FreshSignal[]>([]);
  const [sources, setSources] = useState<AtlasSource[]>([]);
  const [provNodes, setProvNodes] = useState<ProvenanceNode[]>([]);
  const [provEdges, setProvEdges] = useState<ProvenanceEdge[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [mosaic, setMosaic] = useState<AtlasMosaic | null>(null);
  const [atlasTablesVersion, setAtlasTablesVersion] = useState(0);
  const [filteredEventIds, setFilteredEventIds] = useState<Set<string> | null>(
    null,
  );
  const horizonNodes = useMemo(() => getNodeHorizonEntries(), []);

  useEffect(() => {
    setActiveLens(initialLens);
    setViewMode(DEFAULT_VIEW_MODE_BY_LENS[initialLens]);
  }, [initialLens]);

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
      const [placesRes, eventsRes, sourcesRes] = await Promise.all([
        fetchPlaces(),
        fetchEvents(),
        fetchSources(),
      ]);

      if (cancelled) return;
      if (placesRes.ok) setPlaces(placesRes.data);
      if (eventsRes.ok) setEvents(eventsRes.data.events);
      if (sourcesRes.ok) setSources(sourcesRes.data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchSignals({
      candidate_visibility: includeCandidateSignals
        ? "with_candidates"
        : undefined,
      limit: 24,
    }).then((result) => {
      if (cancelled || !result.ok) return;

      setSignals(result.data.signals);
      setSelectedSignalId((previousSignalId) => {
        if (result.data.signals.length === 0) return null;
        if (
          previousSignalId &&
          result.data.signals.some(
            (signal) => signal.signal_id === previousSignalId,
          )
        ) {
          return previousSignalId;
        }
        return result.data.signals[0]?.signal_id ?? null;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [includeCandidateSignals]);

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

  useEffect(() => {
    if (!selectedPlaceId) {
      setProvNodes([]);
      setProvEdges([]);
      return;
    }

    let cancelled = false;
    setProvLoading(true);

    fetchProvenance({ place_id: selectedPlaceId })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setProvNodes(res.data.nodes);
          setProvEdges(res.data.edges);
        } else {
          setProvNodes([]);
          setProvEdges([]);
        }
      })
      .finally(() => {
        if (!cancelled) setProvLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedPlaceId]);

  const handlePlaceSelect = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
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

  const handleSignalSelect = useCallback(
    (signalId: string) => {
      const signal = signals.find((item) => item.signal_id === signalId);
      setSelectedSignalId(signalId);
      setSelectedPlaceId(signal?.place_id ?? null);
      setSelectedSourceId(signal?.source_id ?? null);
    },
    [signals],
  );

  const handleSearchResultSelect = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
    setSearchValue("");
  }, []);

  const handleSourceFocus = useCallback(
    (sourceId: string) => {
      setSelectedSourceId(sourceId);
      if (activeLens !== "evidence") {
        handleLensChange("evidence");
      }
    },
    [activeLens, handleLensChange],
  );

  const handleProvenanceNodeSelect = useCallback(
    (nodeId: string) => {
      const node = provNodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.labels.includes("Place")) {
        setSelectedPlaceId(nodeId);
      }
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
      id: "freshSignals",
      name: "Fresh Signals",
      extension: "json",
      controls: (
        <div className="space-y-2">
          <p className="text-[11px] leading-[1.5]">
            Public records stay on by default. Candidate signals only join the
            atlas when the advanced toggle is enabled above.
          </p>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.10em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {signals.length} signals loaded
          </p>
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

  const provenanceGraphPanel = (
    <ProvenancePanel
      nodes={provNodes}
      edges={provEdges}
      loading={provLoading}
      onNodeSelect={handleProvenanceNodeSelect}
    />
  );

  const evidencePanel = (
    <div className="flex flex-col gap-3">
      <SourceTrail
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSourceSelect={handleSourceFocus}
      />
      {provenanceGraphPanel}
    </div>
  );

  return (
    <div
      className="h-screen w-full overflow-hidden"
      data-scene-view={viewMode}
      data-active-lens={activeLens}
    >
      <AtlasShell
        showTabs={false}
        showTimeline={activeLens === "memory"}
        showProvenance={
          !isMobileViewport &&
          (activeLens === "evidence" || !!selectedPlaceId)
        }
        dossier={
          <div className="flex w-[320px] flex-col gap-3">
            <FreshSignalsPanel
              signals={signals}
              sources={sources}
              selectedSignalId={selectedSignalId}
              onSignalSelect={handleSignalSelect}
              onPlaceJump={handlePlaceSelect}
              includeCandidates={includeCandidateSignals}
              onIncludeCandidatesChange={setIncludeCandidateSignals}
            />
            <ControlDossier
              presets={controlDossierPresets}
              visibility={layerVisibility}
              onToggle={handleLayerChange}
              defaultOpenId={selectedPlaceId ? "places" : "freshSignals"}
            />
          </div>
        }
        timeline={
          <AtlasTimelineHistogram
            mosaic={mosaic}
            dataVersion={atlasTablesVersion}
          />
        }
        provenance={
          activeLens === "evidence" ? (
            evidencePanel
          ) : (
            <PlaceDossierPanel
              placeId={selectedPlaceId}
              onClose={() => setSelectedPlaceId(null)}
            />
          )
        }
        layers={
          <LayerControls
            visibility={layerVisibility}
            onChange={handleLayerChange}
            visible
          />
        }
      >
        <div className="relative h-full w-full">
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
            mobileDossierOpen={isMobileViewport && !!selectedPlaceId}
          />
          {isMobileViewport && activeLens === "evidence" && (
            <aside
              className="atlas-mobile-dossier-sheet atlas-mobile-provenance-sheet"
              aria-label="Evidence provenance"
              style={{ height: "54vh" }}
            >
              {evidencePanel}
            </aside>
          )}
          {isMobileViewport && activeLens !== "evidence" && (
            <MobileDossierSheet
              placeId={selectedPlaceId}
              onClose={() => setSelectedPlaceId(null)}
            />
          )}
        </div>
      </AtlasShell>
    </div>
  );
}
