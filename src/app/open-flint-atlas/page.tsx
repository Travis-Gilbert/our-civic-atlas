"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { LayerControls } from "@/components/atlas/LayerControls";
import { ControlDossier, type LayerPreset } from "@/components/atlas/ControlDossier";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import { loadAtlasTables, eventStartIso } from "@/lib/atlas/atlas-data";

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
  fetchPlaces,
  fetchEvents,
  fetchProvenance,
  type PlacesCollection,
  type SpatialEvent,
  type ProvenanceNode,
  type ProvenanceEdge,
} from "@/lib/api/openFlintAtlas";

const DEFAULT_LAYERS: Record<string, boolean> = {
  places: true,
  events: true,
  wards: true,
  infrastructure: true,
};

export default function OpenFlintAtlasPage() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);

  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [provNodes, setProvNodes] = useState<ProvenanceNode[]>([]);
  const [provEdges, setProvEdges] = useState<ProvenanceEdge[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [mosaic, setMosaic] = useState<AtlasMosaic | null>(null);
  const [atlasTablesVersion, setAtlasTablesVersion] = useState(0);
  const [filteredEventIds, setFilteredEventIds] = useState<Set<string> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [placesRes, eventsRes] = await Promise.all([
        fetchPlaces(),
        fetchEvents(),
      ]);

      if (cancelled) return;
      if (placesRes.ok) setPlaces(placesRes.data);
      if (eventsRes.ok) setEvents(eventsRes.data.events);
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

  return (
    <div className="h-screen w-full overflow-hidden">
      <AtlasShell
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
        provenance={
          <ProvenancePanel
            nodes={provNodes}
            edges={provEdges}
            loading={provLoading}
            onNodeSelect={handleProvenanceNodeSelect}
          />
        }
        layers={
          <LayerControls
            visibility={layerVisibility}
            onChange={handleLayerChange}
            visible
          />
        }
      >
        <AtlasMap
          places={places}
          events={visibleEvents}
          onPlaceSelect={handlePlaceSelect}
          selectedPlaceId={selectedPlaceId}
          layerVisibility={layerVisibility}
          className="w-full h-full"
        />
      </AtlasShell>
    </div>
  );
}
