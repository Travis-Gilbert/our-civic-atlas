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
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import type {
  AtlasSceneCameraBand,
  AtlasSceneDetailLevel,
} from "@/lib/atlas/scene-detail-policy";
import type { AtlasLensId, AtlasSceneViewModeId } from "@/lib/atlas/scene-view";
import {
  ATLAS_LENS_LOOKUP,
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
} from "@/lib/atlas/scene-view";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import { cn } from "@/lib/utils";

type IslandPanel = "focus" | "navigate" | "dossier" | "horizon";

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
  dossierContent?: ReactNode;
  onClearSelection: () => void;
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

const PANEL_LABELS: Record<IslandPanel, string> = {
  focus: "Focus",
  navigate: "Navigate",
  dossier: "Dossier",
  horizon: "Horizon",
};

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
  dossierContent,
  onClearSelection,
}: AtlasDynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<IslandPanel>("focus");
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(
    horizonNodes[0]?.atlasId ?? null,
  );

  useEffect(() => {
    if (!selectedPlaceId && activePanel === "dossier") {
      setActivePanel("focus");
    }
  }, [activePanel, selectedPlaceId]);

  useEffect(() => {
    if (horizonNodes.length === 0) {
      setSelectedHorizonId(null);
      if (activePanel === "horizon") setActivePanel("focus");
      return;
    }
    if (!selectedHorizonId || !horizonNodes.some((node) => node.atlasId === selectedHorizonId)) {
      setSelectedHorizonId(horizonNodes[0]?.atlasId ?? null);
    }
  }, [activePanel, horizonNodes, selectedHorizonId]);

  const availablePanels = useMemo<IslandPanel[]>(() => {
    const panels: IslandPanel[] = ["focus", "navigate"];
    if (selectedPlaceId) panels.push("dossier");
    if (horizonNodes.length > 0) panels.push("horizon");
    return panels;
  }, [horizonNodes.length, selectedPlaceId]);

  const selectedHorizonNode = useMemo(
    () =>
      horizonNodes.find((node) => node.atlasId === selectedHorizonId) ??
      horizonNodes[0] ??
      null,
    [horizonNodes, selectedHorizonId],
  );

  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  const activeLensInfo = ATLAS_LENS_LOOKUP[activeLens];
  const islandTitle = selectedPlaceName ?? focusHeadline(focusDetailLevel, activeLensInfo.label);
  // The collapsed island uses one unified compact layout on every
  // viewport. Slightly narrower on phones to leave room for thumb
  // gestures at the screen edges.
  const collapsedIslandWidth = isMobileViewport ? 316 : 360;
  const expandedIslandWidth = isMobileViewport ? 354 : 392;
  const collapsedSearchActive =
    !isExpanded && searchValue.trim().length > 0;

  function openIsland(panel?: IslandPanel) {
    if (panel && availablePanels.includes(panel)) {
      setActivePanel(panel);
    } else if (selectedPlaceId && availablePanels.includes("dossier")) {
      setActivePanel("dossier");
    } else {
      setActivePanel("focus");
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
        className="pointer-events-none absolute bottom-5 left-1/2 z-[1420] -translate-x-1/2"
        style={{ width: isExpanded ? expandedIslandWidth : collapsedIslandWidth }}
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
                No matching places in the current read model.
              </p>
            )}
          </div>
        ) : null}

        <motion.div
          initial={false}
          animate={{
            width: isExpanded ? expandedIslandWidth : collapsedIslandWidth,
            height: isExpanded ? (isMobileViewport ? 436 : 394) : 58,
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
                    ? `Time travel to ${atlasYear}, open Atlas focus panel`
                    : "Open Atlas focus panel"
                }
              >
                {atlasYear !== null ? (
                  <>
                    <span className="truncate font-mono text-[18px] font-semibold leading-none tracking-[0.04em] text-[color:var(--ctx-ink)]">
                      {atlasYear}
                    </span>
                    <span className="mt-1 truncate font-mono text-[9px] uppercase leading-none tracking-[0.18em] text-[color:var(--ctx-ink-mute)]">
                      Time travel
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
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
                  Atlas focus
                </p>
                <p className="truncate text-[14px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
                  {islandTitle}
                </p>
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
                {availablePanels.map((panel) => (
                  <button
                    key={panel}
                    type="button"
                    className="atlas-dossier-tab"
                    data-active={activePanel === panel ? "true" : "false"}
                    onClick={() => setActivePanel(panel)}
                  >
                    {PANEL_LABELS[panel]}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {activePanel === "focus" ? (
                <section className="space-y-3">
                  <div className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                          On screen now
                        </p>
                        <p className="mt-1 text-[14px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
                          {selectedPlaceName ?? "Flint civic field"}
                        </p>
                      </div>
                      <SceneFocusIndicator
                        cameraBand={focusCameraBand}
                        detailLevel={focusDetailLevel}
                        hasSelection={selectedPlaceId !== null}
                      />
                    </div>
                    <p className="mt-3 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      The island reflects what the current view is emphasizing as you switch camera modes and move between city, ward, and object focus.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MetaPill label="Lens" value={activeLensInfo.label} />
                    <MetaPill label="View" value={activeView.label} />
                    <MetaPill label="Focus" value={focusDetailLabel(focusDetailLevel)} />
                    <MetaPill label="Band" value={focusBandLabel(focusCameraBand)} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MetaPill label="Places" value={String(placesCount)} />
                    <MetaPill label="Events" value={String(eventsCount)} />
                  </div>

                  {selectedPlaceId ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="atlas-horizon-action"
                        onClick={() => setActivePanel("dossier")}
                      >
                        Inspect dossier
                      </button>
                      <button
                        type="button"
                        className="atlas-horizon-action"
                        onClick={onClearSelection}
                      >
                        Clear focus
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {activePanel === "navigate" ? (
                <section className="space-y-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      Civic lenses
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
                      Camera views
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

              {activePanel === "dossier" ? (
                <section className="rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.24)]">
                  {selectedPlaceId && dossierContent ? (
                    dossierContent
                  ) : (
                    <div className="px-4 py-4 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      Select a place to open its support, history, and nearby context here.
                    </div>
                  )}
                </section>
              ) : null}

              {activePanel === "horizon" ? (
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
                            Open atlas
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      No neighboring atlas nodes are published yet.
                    </div>
                  )}
                </section>
              ) : null}
            </div>
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

function focusHeadline(detailLevel: AtlasSceneDetailLevel, lensLabel: string): string {
  if (detailLevel === "object") return "Focused civic object";
  if (detailLevel === "ward") return `${lensLabel} ward field`;
  return "Flint civic field";
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
