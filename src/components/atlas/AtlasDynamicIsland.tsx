"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Footprints,
  Layers3,
  Map,
  Navigation,
  Route,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  addressSourceLabel,
  resolveBuildingAddressDetailed,
} from "@/lib/atlas/flint-building-addresses";
import {
  BuildingAddressEditor,
  useAddressOverride,
} from "@/components/atlas/BuildingAddressEditor";
import type {
  AtlasSceneCameraBand,
  AtlasSceneDetailLevel,
} from "@/lib/atlas/scene-detail-policy";
import type { AtlasLensId, AtlasSceneViewModeId } from "@/lib/atlas/scene-view";
import {
  ATLAS_LENS_LOOKUP,
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
} from "@/lib/atlas/scene-view";
import {
  ATLAS_TIME_MAX_YEAR,
  ATLAS_TIME_MIN_YEAR,
} from "@/lib/atlas/atlas-time";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import {
  buildingDisplayTitle,
  type SelectedBuilding,
} from "@/lib/atlas/selected-building";
import {
  FLINT_LOST_RECONSTRUCTIONS,
  buildAtelierHref,
  findNearestReconstruction,
  resolveAtelierEntryYear,
} from "@/lib/atlas/atelier-route";
import { reconstructionExistsInYear } from "@/lib/atlas/atlas-time";
import {
  CivicResearchPanel,
  type ResearchPromotionContext,
} from "@/components/atlas/CivicResearchPanel";
import { cn } from "@/lib/utils";

type IslandTab =
  | "ask"
  | "layers"
  | "scenarios"
  | "traffic"
  | "time"
  | "place"
  | "horizon";

type AtlasDynamicIslandProps = {
  activeLens: AtlasLensId;
  onLensChange: (lens: AtlasLensId) => void;
  viewMode: AtlasSceneViewModeId;
  onViewModeChange: (mode: AtlasSceneViewModeId) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  searchResults: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  onSearchResultSelect: (placeId: string) => void;
  selectedPlaceId: string | null;
  selectedPlaceName: string | null;
  focusDetailLevel: AtlasSceneDetailLevel;
  focusCameraBand: AtlasSceneCameraBand;
  placesCount: number;
  eventsCount: number;
  horizonNodes: NodeHorizonEntry[];
  isMobileViewport: boolean;
  /** Live MapLibre bearing in degrees, clockwise from north. The
   * compass control on the left of the island rotates inversely so
   * its "N" axis always points to true north. */
  cameraBearing?: number;
  /** Fired when the compass control is clicked. Should ease the
   * MapLibre camera back to bearing 0. */
  onResetCompass?: () => void;
  /** Active atlas year (4-digit). When set, the collapsed island
   * replaces its lens label with the year so the chrome
   * acknowledges that the renderer is in time-travel mode and the
   * search field is being read as a year, not a place query. */
  atlasYear?: number | null;
  visibleHistoricalReconstructionCount?: number | null;
  totalHistoricalReconstructionCount?: number;
  dossierContent?: ReactNode;
  /** Currently selected building, if any. Spec PR 1. When non-null the
   * Place tab is added to availableTabs and the collapsed-island title
   * falls through to `name → address → Building #<osm_id>`. */
  selectedBuilding?: SelectedBuilding | null;
  /** Fired when the user clears the building selection. Wired to the
   * Clear button in the Place tab header. Spec PR 1. */
  onClearBuilding?: () => void;
  layerControlsContent?: ReactNode;
  scenarioControlsContent?: ReactNode;
  trafficControlsContent?: ReactNode;
};

const lensIcons: Record<AtlasLensId, ComponentType<{ className?: string }>> = {
  explore: Map,
  memory: Building2,
  safety: ShieldAlert,
  interventions: Route,
  evidence: Search,
};

const viewModeIcons: Record<
  AtlasSceneViewModeId,
  ComponentType<{ className?: string }>
> = {
  atlas: Map,
  oblique: Boxes,
  street: Footprints,
  section: Layers3,
};

const islandTransition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.34,
} as const;

const TAB_LABELS: Record<IslandTab, string> = {
  ask: "Ask",
  layers: "Layers",
  scenarios: "Scenarios",
  traffic: "Traffic",
  time: "Time",
  place: "Place",
  horizon: "Horizon",
};

/**
 * Build a WKT POINT from a building's position.
 *
 * The GraphQL `LatLng` scalar is mapped to `[number, number]` by codegen, but
 * that is only a frontend assertion: a custom scalar has no compiler-checked
 * JSON shape. The live backend may serialize it as `null` or a `{ lat, lng }`
 * object, while the fixture path emits a real `[lng, lat]` tuple. Destructuring
 * a non-array as an array threw "position is not iterable" and crashed the
 * surface. Accept both shapes and degrade to `undefined` for anything else,
 * matching the existing contract of returning `undefined` on bad input. (Twin
 * of the guard in AtelierDossierPanel.tsx.)
 */
function pointWkt(
  position:
    | readonly [number, number]
    | { lat?: number; lng?: number; latitude?: number; longitude?: number }
    | null
    | undefined,
): string | undefined {
  if (!position) return undefined;
  let lng: number | undefined;
  let lat: number | undefined;
  if (Array.isArray(position)) {
    [lng, lat] = position as readonly [number, number];
  } else if (typeof position === "object") {
    const p = position as {
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    };
    lng = p.lng ?? p.longitude;
    lat = p.lat ?? p.latitude;
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return `POINT(${lng} ${lat})`;
}

export function AtlasDynamicIsland({
  activeLens,
  onLensChange,
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchValueChange,
  searchResults,
  onSearchResultSelect,
  selectedPlaceId,
  selectedPlaceName,
  focusDetailLevel,
  focusCameraBand,
  placesCount,
  eventsCount,
  horizonNodes,
  isMobileViewport,
  cameraBearing = 0,
  onResetCompass,
  atlasYear = null,
  visibleHistoricalReconstructionCount = null,
  totalHistoricalReconstructionCount = 0,
  dossierContent,
  selectedBuilding = null,
  onClearBuilding,
  layerControlsContent,
  scenarioControlsContent,
  trafficControlsContent,
}: AtlasDynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<IslandTab>("ask");
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(
    horizonNodes[0]?.atlasId ?? null,
  );

  // When the building selection or place selection clears, leave the
  // Place tab. The auto-expand effect below handles the inverse
  // direction (selection appears -> open Place).
  useEffect(() => {
    if (!selectedPlaceId && !selectedBuilding && activeTab === "place") {
      setActiveTab("ask");
    }
  }, [activeTab, selectedPlaceId, selectedBuilding]);

  // Auto-expand + switch to Place when a building is freshly selected.
  // Spec PR 1: clicking a building opens the island into the Place tab.
  // The PR 4 dossier rewrite removed the sub-tab state — the dossier
  // now renders all three sections vertically in one panel, so the
  // only thing to reset on a fresh selection is which top-level tab
  // is active.
  const lastBuildingIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    const nextId = selectedBuilding?.osm_id ?? null;
    if (nextId !== null && nextId !== lastBuildingIdRef.current) {
      setActiveTab("place");
      setIsExpanded(true);
    }
    lastBuildingIdRef.current = nextId;
  }, [selectedBuilding]);

  useEffect(() => {
    if (horizonNodes.length === 0) {
      setSelectedHorizonId(null);
      if (activeTab === "horizon") setActiveTab("ask");
      return;
    }
    if (!selectedHorizonId || !horizonNodes.some((node) => node.atlasId === selectedHorizonId)) {
      setSelectedHorizonId(horizonNodes[0]?.atlasId ?? null);
    }
  }, [activeTab, horizonNodes, selectedHorizonId]);

  const hasScenarioControls = scenarioControlsContent != null;
  const hasTrafficControls = trafficControlsContent != null;

  const availableTabs = useMemo<IslandTab[]>(() => {
    const tabs: IslandTab[] = ["ask", "layers"];
    if (hasScenarioControls) tabs.push("scenarios");
    if (hasTrafficControls) tabs.push("traffic");
    tabs.push("time");
    if (selectedPlaceId || selectedBuilding) tabs.push("place");
    if (horizonNodes.length > 0) tabs.push("horizon");
    return tabs;
  }, [
    hasScenarioControls,
    hasTrafficControls,
    horizonNodes.length,
    selectedPlaceId,
    selectedBuilding,
  ]);

  const selectedHorizonNode = useMemo(
    () =>
      horizonNodes.find((node) => node.atlasId === selectedHorizonId) ??
      horizonNodes[0] ??
      null,
    [horizonNodes, selectedHorizonId],
  );
  const researchPromotionContext = useMemo<ResearchPromotionContext | null>(() => {
    if (!selectedBuilding) return null;
    const geometry = pointWkt(selectedBuilding.position);
    if (!geometry) return null;
    return {
      anchorKind: "research",
      anchorGeometryWkt: geometry,
      sourceUseTags: ["other"],
      sourceUseNote: `Saved from atlas research for ${buildingDisplayTitle(selectedBuilding)}.`,
      reviewState: "accepted_for_reconstruction",
      anchorPayload: {
        selectedBuildingOsmId: String(selectedBuilding.osm_id),
        selectedBuildingName: buildingDisplayTitle(selectedBuilding),
      },
    };
  }, [selectedBuilding]);

  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  const activeLensInfo = ATLAS_LENS_LOOKUP[activeLens];
  // Title fallback chain. Spec PR 1: building name -> address ->
  // `Building #<osm_id>` when a building is selected; otherwise fall
  // through to the existing place selection, then to the default.
  const islandTitle = selectedBuilding
    ? buildingDisplayTitle(selectedBuilding)
    : (selectedPlaceName ?? "Flint, Michigan");
  const timeSliderYear =
    atlasYear ??
    Math.min(
      ATLAS_TIME_MAX_YEAR,
      Math.max(ATLAS_TIME_MIN_YEAR, new Date().getFullYear()),
    );
  // The collapsed island uses one unified compact layout on every
  // viewport. Slightly narrower on phones to leave room for thumb
  // gestures at the screen edges.
  const collapsedIslandWidth = isMobileViewport ? 316 : 360;
  const expandedIslandWidth = isMobileViewport ? 354 : 392;
  const expandedIslandHeight =
    activeTab === "scenarios"
      ? isMobileViewport ? 520 : 500
      : activeTab === "traffic"
        ? isMobileViewport ? 520 : 500
      : isMobileViewport ? 436 : 394;
  const collapsedSearchActive =
    !isExpanded && searchValue.trim().length > 0 && atlasYear === null;

  // PT-502: when the user types a year, show the matching
  // historical reconstructions as Atelier deep-links in a separate
  // dropdown. Mutually exclusive with the place-search dropdown.
  const atelierYearSuggestions = useMemo(() => {
    if (atlasYear === null) return [];
    return FLINT_LOST_RECONSTRUCTIONS.filter((reconstruction) =>
      reconstructionExistsInYear(reconstruction, atlasYear),
    ).slice(0, 6);
  }, [atlasYear]);
  const collapsedAtelierSuggestionsActive =
    !isExpanded && atlasYear !== null && atelierYearSuggestions.length > 0;

  function openIsland(tab?: IslandTab) {
    if (tab && availableTabs.includes(tab)) {
      setActiveTab(tab);
    } else if (
      (selectedBuilding || selectedPlaceId) &&
      availableTabs.includes("place")
    ) {
      setActiveTab("place");
    } else {
      setActiveTab("ask");
    }
    setIsExpanded(true);
  }

  return (
    <>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="atlas-island-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="pointer-events-auto absolute inset-0 z-[1410] bg-[rgba(246,244,238,0.08)] backdrop-blur-[3px]"
            onClick={() => setIsExpanded(false)}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute left-1/2 z-[1420] -translate-x-1/2"
        style={{
          width: isExpanded ? expandedIslandWidth : collapsedIslandWidth,
          /*
           * Safe-area-aware bottom inset. On iOS devices with a home
           * indicator, env(safe-area-inset-bottom) is ~34px; on devices
           * without one it evaluates to 0. Taking the max of the default
           * 20px gutter and the hardware inset means the island never
           * sits under the home bar. viewport-fit=cover in the atlas
           * layout.tsx makes this env() call non-zero on notch devices.
           */
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))",
        }}
      >
        {collapsedSearchActive ? (
          <div
            className="atlas-scene-search-results pointer-events-auto absolute bottom-[calc(100%+10px)] left-0 right-0"
            role="listbox"
            aria-label="Place search results"
          >
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-[13px]"
                  onClick={() => onSearchResultSelect(result.id)}
                  role="option"
                  aria-selected={false}
                >
                  <span className="truncate text-[color:var(--ctx-ink)]">{result.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                    {result.type}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[13px] text-[color:var(--ctx-ink-mute)]">
                No matches.
              </p>
            )}
          </div>
        ) : null}

        {collapsedAtelierSuggestionsActive && atlasYear !== null ? (
          <div
            className="atlas-scene-search-results pointer-events-auto absolute bottom-[calc(100%+10px)] left-0 right-0"
            role="listbox"
            aria-label={`Reconstructions visible in ${atlasYear}`}
          >
            <p className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
              Open Atelier · circa {atlasYear}
            </p>
            {atelierYearSuggestions.map((reconstruction) => (
              <Link
                key={reconstruction.id}
                href={buildAtelierHref(reconstruction, atlasYear)}
                className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-[13px]"
                role="option"
                aria-selected={false}
              >
                <span className="truncate text-[color:var(--ctx-ink)]">
                  {reconstruction.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--ctx-accent)]">
                  Reconstruct
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        <motion.div
          initial={false}
          animate={{
            width: isExpanded ? expandedIslandWidth : collapsedIslandWidth,
            height: isExpanded ? expandedIslandHeight : 58,
            borderRadius: isExpanded ? 24 : 999,
          }}
          transition={islandTransition}
          className="atlas-scene-glass pointer-events-auto relative overflow-hidden"
          style={{
            boxShadow: isExpanded
              ? "0 26px 54px -32px rgba(42,36,25,0.6)"
              : "0 18px 30px -24px rgba(42,36,25,0.44)",
          }}
        >
          {/* Unified collapsed-island layout. Compass on the left, lens
           * label centered, search field on the right. Same shape on
           * every viewport so visual identity travels from desktop to
           * phone without forking. Tapping the centered label opens
           * the expanded panel; the compass and search field are
           * stacked above so they receive their own clicks. */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 0 : 1,
              pointerEvents: isExpanded ? "none" : "auto",
            }}
            transition={islandTransition}
            className="absolute inset-0"
          >
            <div className="relative h-full w-full">
              <button
                type="button"
                className="absolute inset-0 flex flex-col items-center justify-center px-[112px] text-center"
                onClick={() => openIsland()}
                aria-label={
                  atlasYear !== null
                    ? `Time travel to ${atlasYear}, open controls`
                    : "Open controls"
                }
              >
                {atlasYear !== null ? (
                  <>
                    <span className="truncate font-mono text-[18px] font-semibold leading-none tracking-[0.04em] text-[color:var(--ctx-ink)]">
                      {atlasYear}
                    </span>
                    <span className="mt-1 truncate font-mono text-[9px] uppercase leading-none tracking-[0.18em] text-[color:var(--ctx-ink-mute)]">
                      {visibleHistoricalReconstructionCount !== null
                        ? `${visibleHistoricalReconstructionCount}/${totalHistoricalReconstructionCount} Lost Flint`
                        : "Time travel"}
                    </span>
                  </>
                ) : (
                  <span className="truncate text-[15px] font-medium leading-none text-[color:var(--ctx-ink)]">
                    {activeLensInfo.label}
                  </span>
                )}
              </button>

              <CompassControl
                bearing={cameraBearing}
                onReset={onResetCompass}
              />

              <label
                className="absolute right-3 top-1/2 z-10 flex h-10 w-[104px] -translate-y-1/2 items-center gap-2 rounded-full border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.36)] px-3 shadow-[0_10px_18px_-18px_rgba(42,36,25,0.6)]"
                aria-label="Search Flint Atlas places"
              >
                <Search className="h-4 w-4 shrink-0 text-[color:var(--ctx-ink-mute)]" />
                <input
                  value={searchValue}
                  onChange={(event) => onSearchValueChange(event.target.value)}
                  suppressHydrationWarning
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  placeholder=""
                  type="search"
                />
              </label>
            </div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? "auto" : "none",
            }}
            transition={islandTransition}
            className="absolute inset-0 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0">
                {atlasYear !== null ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
                    Mapping · {atlasYear}
                  </p>
                ) : null}
                <h2 className="truncate text-[20px] font-semibold leading-[1.05] text-[color:var(--ctx-ink)]">
                  {islandTitle}
                </h2>
              </div>
              <button
                type="button"
                className="atlas-dossier-close"
                aria-label="Close Atlas controls"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className="atlas-dossier-tab"
                    data-active={activeTab === tab ? "true" : "false"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {activeTab === "ask" ? (
                <CivicResearchPanel
                  promotionContext={researchPromotionContext}
                />
              ) : null}

              {activeTab === "layers" ? (
                <section className="space-y-4">
                  <div className="atlas-island-layer-dossier">
                    {layerControlsContent}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MetaPill label="Places" value={String(placesCount)} />
                    <MetaPill label="Events" value={String(eventsCount)} />
                    <MetaPill label="View" value={activeView.shortLabel} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      View
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(lensIcons).map(([lensId, Icon]) => {
                        const selected = lensId === activeLens;
                        return (
                          <button
                            key={lensId}
                            type="button"
                            className={cn(
                              "flex items-center gap-2 rounded-[12px] border px-3 py-3 text-left",
                              selected && "bg-[color:var(--ctx-ink)] text-[color:var(--ctx-paper)]",
                            )}
                            style={{
                              borderColor: selected
                                ? "rgba(42,36,25,0.8)"
                                : "rgba(42,36,25,0.1)",
                            }}
                            onClick={() => onLensChange(lensId as AtlasLensId)}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-[12px] font-medium">
                              {ATLAS_LENS_LOOKUP[lensId as AtlasLensId].label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      Camera
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(viewModeIcons).map(([modeId, Icon]) => {
                        const selected = modeId === viewMode;
                        return (
                          <button
                            key={modeId}
                            type="button"
                            className={cn(
                              "flex items-center gap-2 rounded-[12px] border px-3 py-3 text-left",
                              selected && "bg-[color:var(--ctx-ink)] text-[color:var(--ctx-paper)]",
                            )}
                            style={{
                              borderColor: selected
                                ? "rgba(42,36,25,0.8)"
                                : "rgba(42,36,25,0.1)",
                            }}
                            onClick={() => onViewModeChange(modeId as AtlasSceneViewModeId)}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-[12px] font-medium">
                              {ATLAS_SCENE_VIEW_MODE_LOOKUP[modeId as AtlasSceneViewModeId].label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "scenarios" ? (
                <section className="atlas-island-scenario-panel">
                  {scenarioControlsContent}
                </section>
              ) : null}

              {activeTab === "traffic" ? (
                <section className="atlas-island-traffic-panel">
                  {trafficControlsContent}
                </section>
              ) : null}

              {activeTab === "time" ? (
                /*
                 * Flat Time tab: no nested card chrome. The tab label
                 * already names this surface (the eyebrow "NOW / Time
                 * travel" was redundant), and the slider position +
                 * caption are the canonical year display (the
                 * giant 32px year heading was a second redundant
                 * display). The historical-reconstruction count is
                 * the one piece of context-only info worth surfacing,
                 * pinned right under the slider caption.
                 */
                <section className="space-y-3">
                  <label className="block">
                    <span className="sr-only">Set atlas year</span>
                    <input
                      type="range"
                      min={ATLAS_TIME_MIN_YEAR}
                      max={ATLAS_TIME_MAX_YEAR}
                      value={timeSliderYear}
                      onChange={(event) => onSearchValueChange(event.target.value)}
                      className="w-full"
                      style={{ accentColor: "var(--ctx-accent)" }}
                    />
                    <span className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      <span>{ATLAS_TIME_MIN_YEAR}</span>
                      <span className="text-[color:var(--ctx-ink)]">
                        {atlasYear ?? "Now"}
                      </span>
                      <span>{ATLAS_TIME_MAX_YEAR}</span>
                    </span>
                  </label>
                  {visibleHistoricalReconstructionCount !== null ? (
                    <p className="text-[12px] leading-[1.4] text-[color:var(--ctx-ink-soft)]">
                      {visibleHistoricalReconstructionCount} / {totalHistoricalReconstructionCount} Lost Flint reconstructions visible
                    </p>
                  ) : null}
                  <div className="grid grid-cols-4 gap-2">
                    {["Now", "1925", "1950", "1975"].map((year) => (
                      <button
                        key={year}
                        type="button"
                        className="atlas-horizon-action justify-center"
                        onClick={() =>
                          onSearchValueChange(year === "Now" ? "" : year)
                        }
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {activeTab === "place" ? (
                <section className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.24)]">
                  {selectedBuilding ? (
                    <BuildingDossier
                      building={selectedBuilding}
                      onClear={onClearBuilding}
                    />
                  ) : selectedPlaceId && dossierContent ? (
                    dossierContent
                  ) : (
                    <div className="px-4 py-4 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      Select a place to open its support, history, and nearby context here.
                    </div>
                  )}
                </section>
              ) : null}

              {activeTab === "horizon" ? (
                <section className="space-y-3">
                  {selectedHorizonNode ? (
                    <>
                      <div className="flex justify-center">
                        <div
                          className="atlas-horizon-compass atlas-horizon-compass-desktop"
                          role="list"
                          aria-label="Node Horizon bearings"
                        >
                          <span className="atlas-horizon-axis atlas-horizon-axis-n">N</span>
                          <span className="atlas-horizon-axis atlas-horizon-axis-e">E</span>
                          <span className="atlas-horizon-axis atlas-horizon-axis-s">S</span>
                          <span className="atlas-horizon-axis atlas-horizon-axis-w">W</span>
                          <span className="atlas-horizon-origin">Flint</span>
                          {horizonNodes.map((node) => (
                            <button
                              key={node.atlasId}
                              type="button"
                              role="listitem"
                              className={cn(
                                "atlas-horizon-point",
                                node.atlasId === selectedHorizonNode.atlasId && "is-active",
                              )}
                              data-relation={node.relation}
                              style={compassPointStyle(node)}
                              onClick={() => setSelectedHorizonId(node.atlasId)}
                              aria-label={`${node.name}, ${node.directionLabel || node.scopeLabel}`}
                            >
                              <span aria-hidden="true">{horizonBadge(node.name)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                          {selectedHorizonNode.relationLabel}
                        </p>
                        <p className="mt-1 text-[14px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
                          {selectedHorizonNode.name}
                        </p>
                        <p className="mt-1 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                          {selectedHorizonNode.directionLabel || selectedHorizonNode.scopeLabel}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-[10px] leading-[1.35] text-[color:var(--ctx-ink-mute)]">
                            {selectedHorizonNode.sourceCountLabel}
                            <br />
                            {selectedHorizonNode.freshnessLabel}
                          </span>
                          <Link href={selectedHorizonNode.detailHref} className="atlas-horizon-action">
                            Open
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      No neighboring atlases yet.
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            {activeTab === "scenarios" || activeTab === "traffic" ? null : (
              <div className="border-t border-[rgba(42,36,25,0.08)] px-4 py-3">
                <div className="grid grid-cols-4 gap-2">
                  <MetaPill label="View" value={activeView.label} />
                  <MetaPill label="Focus" value={focusDetailLabel(focusDetailLevel)} />
                  <MetaPill label="Band" value={focusBandLabel(focusCameraBand)} />
                  <div className="flex items-center justify-end">
                    <SceneFocusIndicator
                      cameraBand={focusCameraBand}
                      detailLevel={focusDetailLevel}
                      hasSelection={selectedPlaceId !== null}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

/**
 * Compass control on the left of the collapsed island. Replaces the
 * earlier lens-accent dot. The needle rotates counter to the live
 * MapLibre bearing so its `N` mark always points to true north;
 * clicking the button asks the parent to ease the map's bearing back
 * to zero. Falls back to a static needle when no `onReset` callback
 * is provided so the chrome still reads as a compass even outside
 * the full map context.
 */
function CompassControl({
  bearing,
  onReset,
}: {
  bearing: number;
  onReset?: () => void;
}) {
  const isInteractive = Boolean(onReset);
  // Needle rotates inversely so "N" stays true north regardless of
  // how the map is oriented. Wrap at ±180° so framer doesn't take
  // the long way around when bearing crosses the seam.
  const rotation = -bearing;
  const isAligned = Math.abs(bearing) < 0.5;

  const sharedClass =
    "absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(42,36,25,0.12)] bg-[rgba(255,255,255,0.46)] shadow-[0_10px_18px_-18px_rgba(42,36,25,0.6)]";

  const inner = (
    <>
      <motion.span
        initial={false}
        animate={{ rotate: rotation }}
        transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.32 }}
        className="flex h-full w-full items-center justify-center"
        aria-hidden="true"
      >
        <Navigation
          className="h-4 w-4 text-[color:var(--ctx-ink)]"
          fill="currentColor"
          strokeWidth={1.4}
        />
      </motion.span>
      <span className="sr-only">
        {isAligned
          ? "Compass aligned to north"
          : `Compass at ${Math.round(((bearing % 360) + 360) % 360)}°, click to reset to north`}
      </span>
    </>
  );

  if (!isInteractive) {
    return (
      <div className={sharedClass} aria-label="Compass">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={sharedClass}
      onClick={(event) => {
        // Don't bubble — the centered label button covers the rest
        // of the island and would otherwise also fire.
        event.stopPropagation();
        onReset?.();
      }}
      aria-label="Reset map bearing to north"
      data-aligned={isAligned ? "true" : "false"}
    >
      {inner}
    </button>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
        {value}
      </p>
    </div>
  );
}

function SceneFocusIndicator({
  cameraBand,
  detailLevel,
  hasSelection,
}: {
  cameraBand: AtlasSceneCameraBand;
  detailLevel: AtlasSceneDetailLevel;
  hasSelection: boolean;
}) {
  const bandIndex = {
    far: 0,
    mid: 1,
    near: 2,
  }[cameraBand];
  const detailOpacity = {
    city: 0.55,
    ward: 0.72,
    object: 0.94,
  }[detailLevel];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-end gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            initial={false}
            animate={{
              height: index === bandIndex ? 18 : 10,
              opacity: index === bandIndex ? 1 : 0.34,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[4px] rounded-full bg-[color:var(--ctx-ink)]"
          />
        ))}
      </div>
      <motion.span
        initial={false}
        animate={{
          scale: hasSelection ? 1 : 0.88,
          opacity: detailOpacity,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="grid h-7 w-7 place-items-center rounded-full border border-[rgba(42,36,25,0.1)] bg-[rgba(255,255,255,0.46)] font-mono text-[9px] font-semibold uppercase text-[color:var(--ctx-ink)]"
      >
        {detailLevel.slice(0, 1)}
      </motion.span>
    </div>
  );
}

function focusDetailLabel(detailLevel: AtlasSceneDetailLevel): string {
  return {
    city: "city field",
    ward: "ward field",
    object: "object focus",
  }[detailLevel];
}

function focusBandLabel(cameraBand: AtlasSceneCameraBand): string {
  return {
    far: "far band",
    mid: "mid band",
    near: "near band",
  }[cameraBand];
}

function horizonBadge(name: string): string {
  const words = name
    .replace(/\batlas\b/gi, "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return "AT";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function compassPointStyle(node: NodeHorizonEntry): { left: string; top: string } {
  const degrees = node.directionDegrees ?? 0;
  const angle = ((degrees - 90) * Math.PI) / 180;
  const orbit = node.normalizedDistance * 34;
  const x = 50 + Math.cos(angle) * orbit;
  const y = 50 + Math.sin(angle) * orbit;
  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

/* ------------------------------------------------------------------ */
/*  BuildingDossier (Spec PR 4 / map-body-and-discipline)              */
/*                                                                     */
/*  Three vertical sections, no sub-tabs:                              */
/*    1. "What it is" — noun-phrase typology + location descriptor.   */
/*       No confidence chip, no osm_id chip (unless name AND address  */
/*       are both missing, in which case osm_id renders as a small    */
/*       muted subtitle).                                              */
/*    2. EVIDENCE — empty state today; this is where the atelier      */
/*       eventually hooks source citations in.                         */
/*    3. EXPLORE — three placeholder buttons (Open dossier,            */
/*       Reconstruct historical view, Comments) that signal future    */
/*       capability without faking the implementation.                 */
/*                                                                     */
/*  Confidence-discipline rule: this card never editorialises the     */
/*  classifier's uncertainty. Once the typology was selected upstream,*/
/*  the chrome commits to it.                                          */
/* ------------------------------------------------------------------ */

const TYPOLOGY_NOUN_PHRASE: Record<string, string> = {
  residential: "Residence",
  residential_single: "Single-family house",
  residential_multi: "Multi-family residence",
  commercial: "Commercial building",
  industrial: "Industrial structure",
  civic: "Civic building",
  mixed_use: "Mixed-use building",
};

function nounPhraseFor(typologyClass: string | null): string {
  if (!typologyClass) return "Building";
  const key = typologyClass.toLowerCase();
  return TYPOLOGY_NOUN_PHRASE[key] ?? "Building";
}

function locationDescriptorFor(building: SelectedBuilding): string {
  // Address is the strongest descriptor when present. Resolve through the
  // override > City of Flint > OSM precedence so a saved edit shows here
  // immediately. Otherwise fall back to a city label — a proper nearest-
  // corridor / nearest-ward spatial join is a follow-up; "Flint, Michigan"
  // is the honest minimum that doesn't fake a precision we don't have.
  const resolved = resolveBuildingAddressDetailed(
    building.osm_id,
    building.address,
  );
  if (resolved) return resolved.text;
  return "Flint, Michigan";
}

function BuildingDossier({
  building,
  onClear,
}: {
  building: SelectedBuilding;
  onClear?: () => void;
}) {
  // Re-render when this building's override changes so the address line and
  // the editor's source chip stay live after a save.
  useAddressOverride(building.osm_id);
  const liveAddress = resolveBuildingAddressDetailed(
    building.osm_id,
    building.address,
  );
  const [editingAddress, setEditingAddress] = useState(false);

  const noun = nounPhraseFor(building.typology_class);
  const location = locationDescriptorFor(building);
  const hasName = Boolean(building.name?.trim());
  const hasAddress = Boolean(liveAddress);
  const showOsmIdSubtitle = !hasName && !hasAddress;

  // PT-501: find nearest historical reconstruction; if within range,
  // expose a real link to the Atelier instead of the disabled action.
  // Year resolution shared with PT-504 (right-click entry) via
  // `resolveAtelierEntryYear` in `atelier-route.ts`.
  const nearestReconstruction = findNearestReconstruction(building.position);
  const atelierYear = nearestReconstruction
    ? resolveAtelierEntryYear(nearestReconstruction)
    : null;
  const atelierHref =
    nearestReconstruction && atelierYear !== null
      ? buildAtelierHref(nearestReconstruction, atelierYear)
      : null;

  return (
    <div className="flex flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(42,36,25,0.08)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
            {noun}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.4] text-[color:var(--ctx-ink-soft)]">
            {location}
          </p>
          {showOsmIdSubtitle ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
              {`#${building.osm_id}`}
            </p>
          ) : null}
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-[8px] border border-[rgba(42,36,25,0.12)] bg-[rgba(255,255,255,0.55)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)] transition-colors hover:bg-[rgba(255,255,255,0.85)] hover:text-[color:var(--ctx-ink)]"
            aria-label="Clear building selection"
          >
            Clear
          </button>
        ) : null}
      </header>

      <section
        aria-labelledby="building-dossier-address-heading"
        className="border-b border-[rgba(42,36,25,0.08)] px-4 py-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3
            id="building-dossier-address-heading"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]"
          >
            Address
          </h3>
          {!editingAddress ? (
            <button
              type="button"
              onClick={() => setEditingAddress(true)}
              className="shrink-0 rounded-[8px] border border-[rgba(42,36,25,0.12)] bg-[rgba(255,255,255,0.55)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)] transition-colors hover:bg-[rgba(255,255,255,0.85)] hover:text-[color:var(--ctx-ink)]"
            >
              {liveAddress ? "Edit" : "Add"}
            </button>
          ) : null}
        </div>
        {editingAddress ? (
          <div className="mt-2">
            <BuildingAddressEditor
              osmId={building.osm_id}
              osmAddress={building.address}
              onClose={() => setEditingAddress(false)}
            />
          </div>
        ) : (
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p className="text-[13px] leading-[1.5] text-[color:var(--ctx-ink)]">
              {liveAddress ? liveAddress.text : "No address on record"}
            </p>
            {liveAddress ? (
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                {addressSourceLabel(liveAddress.source)}
              </span>
            ) : null}
          </div>
        )}
      </section>

      <section
        aria-labelledby="building-dossier-evidence-heading"
        className="border-b border-[rgba(42,36,25,0.08)] px-4 py-3"
      >
        <h3
          id="building-dossier-evidence-heading"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]"
        >
          Evidence
        </h3>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
          No evidence loaded yet.
        </p>
      </section>

      <section
        aria-labelledby="building-dossier-explore-heading"
        className="px-4 py-3"
      >
        <h3
          id="building-dossier-explore-heading"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]"
        >
          Explore
        </h3>
        <div className="mt-2 flex flex-col gap-1.5">
          <DossierDisabledAction label="Open dossier" />
          {atelierHref && nearestReconstruction ? (
            <Link
              href={atelierHref}
              className="flex w-full items-center justify-between rounded-[8px] border border-[rgba(193,74,44,0.5)] bg-[rgba(193,74,44,0.08)] px-3 py-2 text-left text-[12px] leading-[1.3] text-[color:var(--ctx-ink)] transition-colors hover:bg-[rgba(193,74,44,0.16)]"
              aria-label={`Open Atelier on ${nearestReconstruction.name} circa ${atelierYear}`}
            >
              <span>Reconstruct in Atelier</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-accent)]">
                {`Circa ${atelierYear}`}
              </span>
            </Link>
          ) : (
            <DossierDisabledAction label="Reconstruct historical view" />
          )}
          <DossierDisabledAction label="Comments" />
        </div>
      </section>
    </div>
  );
}

function DossierDisabledAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      aria-disabled="true"
      className="flex w-full items-center justify-between rounded-[8px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.4)] px-3 py-2 text-left text-[12px] leading-[1.3] text-[color:var(--ctx-ink-soft)] opacity-70 transition-colors cursor-not-allowed"
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
        Coming soon
      </span>
    </button>
  );
}
