"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { MapRef } from "react-map-gl/maplibre";
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
  fetchMobileCandidateSceneRuntime,
  fetchProvenance,
  fetchSignals,
  type FreshSignal,
  type AtlasLngLatBounds,
  type MobileCandidateSceneRuntime,
  type PlacesCollection,
  type ProvenanceEdge,
  type ProvenanceNode,
  type SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import { loadAtlasTables, eventStartIso } from "@/lib/atlas/atlas-data";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import { getNodeHorizonEntries } from "@/lib/atlas/node-horizon";
import type { MobileRuntimeSurfaceId } from "@/lib/atlas/contracts";
import {
  getAtlasRendererBridge,
  type AtlasRendererMode,
} from "@/lib/atlas/renderer-bridge";
import { getAtlasSceneDetailPolicy } from "@/lib/atlas/scene-detail-policy";
import type {
  AtlasLensId,
  AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import {
  ATLAS_CAMERA_BOOKMARK_LOOKUP,
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  DEFAULT_VIEW_MODE_BY_LENS,
  type AtlasCameraBookmarkId,
} from "@/lib/atlas/scene-view";
import { parseAtlasYear } from "@/lib/atlas/atlas-time";

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

function initialMobileSurface(
  defaultSurface: MobileRuntimeSurfaceId,
): MobileRuntimeSurfaceId {
  // The Leaflet path was deleted alongside `MobileAtlasMap` once deck.gl
  // was promoted to the sole render path. The URL-param escape hatch
  // here used to switch between Leaflet (`?mobile=leaflet`) and
  // deck (`?mobile=deck`) for diagnostic comparison; both branches now
  // resolve to the deck path. The function is preserved for two
  // reasons: (1) external links carrying `?mobile=...` should not 404,
  // and (2) reinstating a viewport-specific runtime is a real
  // possibility (e.g. a small-screen 2D-only mode) and we want the
  // hook to be here when that decision lands.
  if (typeof window === "undefined") return defaultSurface;
  return defaultSurface;
}

export function OpenFlintAtlasScene(props: {
  initialLens?: AtlasLensId;
  initialCompareAtlasId?: string | null;
  preferredMobileSurface?: MobileRuntimeSurfaceId;
  initialViewMode?: AtlasSceneViewModeId;
  /** Pre-applied camera bookmark. Wins over `?bookmark=` URL param when set. */
  initialBookmark?: AtlasCameraBookmarkId;
  /** Pre-fills the search input. Used by Phase 3 routes to seed a year-travel state. */
  initialSearchValue?: string;
}) {
  const {
    initialLens = "explore",
    preferredMobileSurface = "deck_mobile_candidate",
    initialViewMode,
    initialBookmark,
    initialSearchValue = "",
  } = props;
  const router = useRouter();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);
  const [viewMode, setViewMode] = useState<AtlasSceneViewModeId>(() => {
    if (initialBookmark) {
      const bookmark = ATLAS_CAMERA_BOOKMARK_LOOKUP[initialBookmark];
      if (bookmark) return bookmark.viewMode;
    }
    return initialViewMode ?? DEFAULT_VIEW_MODE_BY_LENS[initialLens];
  });
  const [activeLens, setActiveLens] =
    useState<AtlasLensId>(initialLens);
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [rendererMode, setRendererMode] =
    useState<AtlasRendererMode>("baseline");
  const [mobileSurface, setMobileSurface] =
    useState<MobileRuntimeSurfaceId>(() =>
      initialMobileSurface(preferredMobileSurface),
    );
  const [sceneCameraDistance, setSceneCameraDistance] = useState<number | null>(
    null,
  );
  // Live MapLibre camera bearing for the compass control in the
  // dynamic island. Initialised from the active view mode preset so
  // the compass renders correct even before the map's first `move`
  // event fires. Updated by a `move` listener installed once the
  // MapLibre instance becomes available.
  const [cameraBearing, setCameraBearing] = useState<number>(0);
  const mapRefRef = useRef<MapRef | null>(null);
  // `?bookmark=carriage-town` (etc.) seeds a one-shot camera fly
  // after the map is ready. Stored as state so the effect can clear
  // it once applied — preventing the bookmark from re-firing if the
  // user manually pans, zooms, or toggles a view mode after arrival.
  const [pendingBookmark, setPendingBookmark] =
    useState<AtlasCameraBookmarkId | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  /**
   * Tracks the most recently choreographed view mode so the
   * camera-choreography effect can distinguish initial mount (let
   * `initialViewState` handle the framing) from a real change made
   * mid-session by the user clicking a different view chip. Without
   * this guard the effect would race the bookmark-application
   * effect on first paint and yank the camera to the view-mode
   * preset before the bookmark gets to apply.
   */
  const lastChoreographedViewModeRef = useRef<string | null>(null);

  const [places, setPlaces] = useState<PlacesCollection | null>(null);
  const [events, setEvents] = useState<SpatialEvent[]>([]);
  const [signals, setSignals] = useState<FreshSignal[]>([]);
  const [mobileCandidateRuntime, setMobileCandidateRuntime] =
    useState<MobileCandidateSceneRuntime | null>(null);
  const [mobileCandidateBounds, setMobileCandidateBounds] =
    useState<AtlasLngLatBounds | null>(null);
  const [mobileRuntimePath, setMobileRuntimePath] =
    useState<"baseline" | "scene-packet-runtime" | "baseline-fallback">(
      "baseline",
    );
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
  const usesPacketCandidate = mobileSurface === "deck_mobile_candidate";
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
    // Bookmark resolution order:
    //   1. `initialBookmark` prop (used by Phase 3 routes like
    //      /open-flint-atlas/lost-flint/carriage-town to seed the
    //      scene with the right camera framing on first paint).
    //   2. `?bookmark=<id>` URL param (deep-link sharing).
    //   3. Lens default view mode.
    if (
      initialBookmark &&
      ATLAS_CAMERA_BOOKMARK_LOOKUP[initialBookmark]
    ) {
      const bookmark = ATLAS_CAMERA_BOOKMARK_LOOKUP[initialBookmark];
      setViewMode(bookmark.viewMode);
      setPendingBookmark(bookmark.id);
      return;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const bookmarkParam = params.get("bookmark");
      if (
        bookmarkParam &&
        ATLAS_CAMERA_BOOKMARK_LOOKUP[bookmarkParam as AtlasCameraBookmarkId]
      ) {
        const bookmark =
          ATLAS_CAMERA_BOOKMARK_LOOKUP[bookmarkParam as AtlasCameraBookmarkId];
        setViewMode(bookmark.viewMode);
        setPendingBookmark(bookmark.id);
        return;
      }
    }
    setViewMode(initialViewMode ?? DEFAULT_VIEW_MODE_BY_LENS[initialLens]);
  }, [initialLens, initialViewMode, initialBookmark]);

  /**
   * Camera choreography for view-mode changes. Lives in the scene
   * shell (not AtlasMap) so it can coordinate with the bookmark
   * application below — without this co-location, the choreography
   * raced `Map.onLoad` and yanked the camera off any pending
   * bookmark.
   *
   * On initial mount we record the active view mode but skip the
   * ease; the `<Map initialViewState>` prop already framed the
   * scene, and re-easing to the same coordinates wastes the budget
   * for vestibular-safety motion. Subsequent mode changes ease (or
   * jump if `prefers-reduced-motion`) to the new preset.
   *
   * The effect also yields immediately if a bookmark is still
   * pending — that flow owns the camera until it consumes itself.
   */
  useEffect(() => {
    if (!isMapReady) return;
    if (pendingBookmark) return;
    const previous = lastChoreographedViewModeRef.current;
    lastChoreographedViewModeRef.current = viewMode;
    if (previous === null) {
      // Initial mount: respect `initialViewState`, do not ease.
      return;
    }
    if (previous === viewMode) return;
    const map = mapRefRef.current;
    if (!map) return;
    const target = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].camera;
    const moveOptions = {
      center: [target.longitude, target.latitude] as [number, number],
      zoom: target.zoom,
      bearing: target.bearing,
      pitch: target.pitch,
    };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      map.jumpTo(moveOptions);
    } else {
      map.easeTo({ ...moveOptions, duration: 900 });
    }
  }, [isMapReady, viewMode, pendingBookmark]);

  /**
   * Apply a pending camera bookmark once the MapLibre instance is
   * ready. A short delay lets MapLibre paint at least one frame so
   * the easing animation reads as motion rather than a snap. The
   * bookmark is one-shot: cleared after the ease begins so any
   * subsequent view-mode change goes back to the normal preset.
   */
  useEffect(() => {
    if (!pendingBookmark || !isMapReady) return;
    const bookmark = ATLAS_CAMERA_BOOKMARK_LOOKUP[pendingBookmark];
    const timer = window.setTimeout(() => {
      const map = mapRefRef.current;
      if (!map) return;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const target = {
        center: [bookmark.camera.longitude, bookmark.camera.latitude] as [
          number,
          number,
        ],
        zoom: bookmark.camera.zoom,
        bearing: bookmark.camera.bearing,
        pitch: bookmark.camera.pitch,
      };
      if (reducedMotion) {
        map.jumpTo(target);
      } else {
        map.easeTo({ ...target, duration: 1200 });
      }
      // Mark the bookmark's view mode as already choreographed so
      // the view-mode effect doesn't run a redundant ease the next
      // time it fires.
      lastChoreographedViewModeRef.current = bookmark.viewMode;
      setPendingBookmark(null);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [pendingBookmark, isMapReady]);

  useEffect(() => {
    setRendererMode(initialRendererMode());
  }, []);

  useEffect(() => {
    setMobileSurface(initialMobileSurface(preferredMobileSurface));
  }, [preferredMobileSurface]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  /**
   * Receive the MapLibre instance from AtlasMap and subscribe to its
   * `move` event so the compass control in the island can track live
   * bearing. The ref is reset on view-mode change because AtlasMap
   * keys the inner `Map` on `viewMode` (forces remount when camera
   * preset changes drastically). We re-attach the listener on each
   * fresh instance.
   */
  const handleMapReady = useCallback((map: MapRef | null) => {
    mapRefRef.current = map;
    setIsMapReady(Boolean(map));
    if (!map) return;
    const sync = () => {
      const next = map.getBearing();
      setCameraBearing((prev) => (Math.abs(prev - next) < 0.05 ? prev : next));
    };
    sync();
    map.on("move", sync);
    // Development-only exposure so the compass + camera controls can
    // be exercised from the preview tool / browser console without
    // wiring per-test plumbing into the chrome. Stripped out
    // automatically by Next.js's production build because
    // `process.env.NODE_ENV` is statically replaced.
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      (window as Window & { __atlasMap?: MapRef }).__atlasMap = map;
    }
    // Cleanup happens implicitly when MapLibre's own `Map` unmounts —
    // the underlying emitter is GC'd. We don't return a cleanup from
    // useCallback (it's not an effect), so guard against duplicates
    // by sync-checking before subscribing again. MapLibre's `on`
    // dedupes identical listener identities, but `sync` is a fresh
    // closure on each map remount so we're safe.
  }, []);

  /**
   * Compass click → return north-up via an animated camera ease.
   * Skips when no map is mounted or bearing is already ~0.
   */
  const handleResetCompass = useCallback(() => {
    const map = mapRefRef.current;
    if (!map) return;
    if (Math.abs(map.getBearing()) < 0.1) return;
    map.easeTo({ bearing: 0, duration: 600 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBaseline(
      runtimePath: "baseline" | "baseline-fallback" = "baseline",
    ) {
      const [placesRes, eventsRes, signalsRes] = await Promise.all([
        fetchPlaces(),
        fetchEvents(),
        fetchSignals({ limit: 24 }),
      ]);

      if (cancelled) return;
      setPlaces(placesRes.ok ? placesRes.data : null);
      setEvents(eventsRes.ok ? eventsRes.data.events : []);
      if (signalsRes.ok) {
        setSignals(signalsRes.data.signals);
        setSelectedSignalId((current) => current ?? signalsRes.data.signals[0]?.signal_id ?? null);
      }
      setMobileCandidateRuntime(null);
      setMobileCandidateBounds(null);
      setMobileRuntimePath(runtimePath);
    }

    async function load() {
      setPlaces(null);
      setEvents([]);
      setMobileCandidateRuntime(null);
      setMobileCandidateBounds(null);

      if (usesPacketCandidate) {
        const candidateRuntime = await fetchMobileCandidateSceneRuntime();
        if (cancelled) return;

        if (!candidateRuntime.ok) {
          console.warn(
            "Mobile candidate runtime fell back to baseline data loading.",
            candidateRuntime.error,
          );
          await loadBaseline("baseline-fallback");
          return;
        } else {
          const runtimeData = candidateRuntime.data as MobileCandidateSceneRuntime;
          setPlaces(runtimeData.places);
          setEvents(runtimeData.events);
          setMobileCandidateRuntime(runtimeData);
          setMobileCandidateBounds(runtimeData.viewportBounds);
          setMobileRuntimePath("scene-packet-runtime");
          return;
        }
      }

      await loadBaseline();
    }

    load();
    return () => { cancelled = true; };
  }, [usesPacketCandidate]);

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
    // When the search value is a bare 4-digit year we treat it as a
    // time-travel trigger, not a place query — suppress the
    // place-search dropdown so the chrome doesn't compete with the
    // year filter for the user's attention.
    if (parseAtlasYear(searchValue) !== null) return [];

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

  /**
   * Derive the active atlas year from the search field. `null` means
   * "today" (default); a parsed year flips every feature layer into
   * its time-travel filter. The memo means we don't re-parse on
   * every render — only when the search value actually changes.
   */
  const atlasYear = useMemo(() => parseAtlasYear(searchValue), [searchValue]);

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
    const pathname =
      lens === "explore" ? "/open-flint-atlas" : `/open-flint-atlas/${lens}`;
    const suffix =
      mobileSurface === "deck_mobile_candidate" ? "?mobile=deck" : "";
    router.push(`${pathname}${suffix}`);
  }, [mobileSurface, router]);

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
      data-mobile-surface={mobileSurface}
      data-analytical-renderer={rendererBridge.analyticalLayerRenderer}
      data-dense-layer-fallback={rendererBridge.denseLayerFallback}
      data-selection-key={rendererBridge.selectionKey}
      data-mobile-runtime-path={mobileRuntimePath}
      data-mobile-packet-id={mobileCandidateRuntime?.scenePacket.packet_id ?? ""}
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
              mobileSurface={mobileSurface}
              initialBounds={mobileCandidateBounds}
              viewMode={viewMode}
              activeLens={activeLens}
              atlasYear={atlasYear}
              className="w-full h-full"
              onMapReady={handleMapReady}
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
            cameraBearing={cameraBearing}
            onResetCompass={handleResetCompass}
            atlasYear={atlasYear}
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
