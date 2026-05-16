"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Boxes,
  Building2,
  Footprints,
  Layers3,
  Map,
  Network,
  Route,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ATLAS_LENSES,
  ATLAS_LENS_LOOKUP,
  ATLAS_SCENE_VIEW_MODES,
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import { cn } from "@/lib/utils";

type IslandPanel = "search" | "focus" | "navigate" | "dossier" | "horizon";

type AtlasDynamicIslandProps = {
  activeLens: AtlasLensId;
  onLensChange: (lens: AtlasLensId) => void;
  viewMode: AtlasSceneViewModeId;
  onViewModeChange: (mode: AtlasSceneViewModeId) => void;
  selectedPlaceId: string | null;
  selectedPlaceName: string | null;
  placesCount: number;
  eventsCount: number;
  horizonNodes: NodeHorizonEntry[];
  isMobileViewport: boolean;
  timelineActive?: boolean;
  dossierContent?: ReactNode;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  searchResults: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  onSearchResultSelect: (placeId: string) => void;
  onClearSelection: () => void;
};

const PANEL_LABELS: Record<IslandPanel, string> = {
  search: "Search",
  focus: "Focus",
  navigate: "Navigate",
  dossier: "Dossier",
  horizon: "Horizon",
};

const lensIcons: Record<AtlasLensId, ComponentType<{ className?: string }>> = {
  explore: Map,
  memory: Building2,
  safety: ShieldAlert,
  interventions: Route,
  evidence: Network,
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
  duration: 0.3,
} as const;

export function AtlasDynamicIsland({
  activeLens,
  onLensChange,
  viewMode,
  onViewModeChange,
  selectedPlaceId,
  selectedPlaceName,
  placesCount,
  eventsCount,
  horizonNodes,
  isMobileViewport,
  timelineActive = false,
  dossierContent,
  searchValue,
  onSearchValueChange,
  searchResults,
  onSearchResultSelect,
  onClearSelection,
}: AtlasDynamicIslandProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<IslandPanel>("focus");
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(
    horizonNodes[0]?.atlasId ?? null,
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hasDossierPanel = Boolean(selectedPlaceId && dossierContent);

  const availablePanels = useMemo<IslandPanel[]>(() => {
    const panels: IslandPanel[] = ["search", "focus", "navigate"];
    if (hasDossierPanel) panels.push("dossier");
    if (horizonNodes.length > 0) panels.push("horizon");
    return panels;
  }, [hasDossierPanel, horizonNodes.length]);

  useEffect(() => {
    if (!hasDossierPanel && activePanel === "dossier") {
      setActivePanel("focus");
    }
  }, [activePanel, hasDossierPanel]);

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

  useEffect(() => {
    if (!isMobileViewport || !hasDossierPanel) return;

    setActivePanel("dossier");
    setIsExpanded(true);
  }, [hasDossierPanel, isMobileViewport, selectedPlaceId]);

  useEffect(() => {
    if (!isExpanded || activePanel !== "search") return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activePanel, isExpanded]);

  const selectedHorizonNode = useMemo(
    () =>
      horizonNodes.find((node) => node.atlasId === selectedHorizonId) ??
      horizonNodes[0] ??
      null,
    [horizonNodes, selectedHorizonId],
  );

  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  const activeLensInfo = ATLAS_LENS_LOOKUP[activeLens];
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : islandTransition;
  const islandTitle = selectedPlaceName ?? focusHeadline(activeLensInfo.label);

  const collapsedWidth = isMobileViewport ? 302 : 356;
  const expandedWidth = isMobileViewport ? 388 : 468;
  const collapsedHeight = isMobileViewport ? 74 : 68;
  const expandedHeight =
    activePanel === "dossier"
      ? isMobileViewport
        ? 552
        : 452
      : activePanel === "search"
        ? isMobileViewport
          ? 408
          : 392
      : isMobileViewport
        ? 486
        : 430;
  const bottomOffset = isMobileViewport
    ? "calc(env(safe-area-inset-bottom, 0px) + 14px)"
    : timelineActive
      ? "214px"
      : "20px";

  function openIsland(panel?: IslandPanel) {
    if (panel && availablePanels.includes(panel)) {
      setActivePanel(panel);
    } else if (isMobileViewport && hasDossierPanel && availablePanels.includes("dossier")) {
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
          <motion.button
            key="atlas-island-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="pointer-events-auto absolute inset-0 z-[1410] bg-[rgba(246,244,238,0.12)] backdrop-blur-[3px]"
            aria-label="Close Atlas controls"
            onClick={() => setIsExpanded(false)}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute left-1/2 z-[1420] -translate-x-1/2"
        style={{ bottom: bottomOffset }}
      >
        <motion.div
          initial={false}
          animate={{
            width: isExpanded ? expandedWidth : collapsedWidth,
            height: isExpanded ? expandedHeight : collapsedHeight,
            borderRadius: isExpanded ? 28 : 999,
          }}
          transition={transition}
          className="atlas-scene-glass pointer-events-auto relative overflow-hidden"
          style={{
            boxShadow: isExpanded
              ? "0 30px 56px -34px rgba(42,36,25,0.62)"
              : "0 16px 28px -20px rgba(42,36,25,0.42)",
          }}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 0 : 1,
              pointerEvents: isExpanded ? "none" : "auto",
            }}
            transition={transition}
            className="absolute inset-0 flex w-full items-center gap-3 px-4"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-1 text-left"
              onClick={() => openIsland("focus")}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.46)]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: lensAccent(activeLens) }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium leading-[1.2] text-[color:var(--ctx-ink)]">
                  {islandTitle}
                </p>
              </div>
            </button>

            <button
              type="button"
              className="atlas-island-search-trigger"
              aria-label="Search Flint Atlas places"
              onClick={() => openIsland("search")}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>

          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? "auto" : "none",
            }}
            transition={transition}
            className="absolute inset-0 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
                  Atlas controls
                </p>
                <p className="truncate text-[15px] font-medium leading-[1.25] text-[color:var(--ctx-ink)]">
                  {islandTitle}
                </p>
              </div>
              <button
                type="button"
                className="atlas-dossier-close"
                aria-label="Close Atlas controls"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 pb-4">
              <div className="atlas-scroll-hidden flex gap-2 overflow-x-auto pb-1">
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

            <div className="atlas-island-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {activePanel === "search" ? (
                <section className="space-y-4">
                  <div className="rounded-[18px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.3)] p-4">
                    <label
                      className="atlas-island-search-field"
                      aria-label="Search Flint Atlas places"
                    >
                      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <input
                        ref={searchInputRef}
                        value={searchValue}
                        onChange={(event) => onSearchValueChange(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[15px] leading-none outline-none placeholder:text-[color:var(--ctx-ink-faint)]"
                        placeholder="Search places, wards, landmarks…"
                        type="search"
                        name="atlas-island-search"
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <div className="rounded-[18px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.22)] p-2">
                    {searchValue.trim().length > 0 ? (
                      searchResults.length > 0 ? (
                        <div className="space-y-1">
                          {searchResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              className="atlas-island-search-result"
                              onClick={() => {
                                onSearchResultSelect(result.id);
                                setActivePanel("focus");
                                setIsExpanded(false);
                              }}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-[color:var(--ctx-ink)]">
                                  {result.name}
                                </span>
                                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                                  {result.type}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-3 text-[13px] leading-[1.55] text-[color:var(--ctx-ink-soft)]">
                          No matching places in the current read model.
                        </p>
                      )
                    ) : (
                      <p className="px-3 py-3 text-[13px] leading-[1.55] text-[color:var(--ctx-ink-soft)]">
                        Search Flint places, wards, and landmarks from the island without leaving the map.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}

              {activePanel === "focus" ? (
                <section className="space-y-4">
                  <div className="rounded-[18px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.3)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                          On screen now
                        </p>
                        <p className="mt-1 text-[15px] font-medium leading-[1.25] text-[color:var(--ctx-ink)]">
                          {selectedPlaceName ?? "Flint civic field"}
                        </p>
                      </div>
                      <SceneFocusIndicator
                        viewMode={viewMode}
                        activeLens={activeLens}
                        hasSelection={selectedPlaceId !== null}
                        reducedMotion={prefersReducedMotion}
                      />
                    </div>
                    <p className="mt-4 text-[13px] leading-[1.6] text-[color:var(--ctx-ink-soft)]">
                      {selectedPlaceName
                        ? `${selectedPlaceName} is the current focus. The island keeps lens, view, and neighboring atlas context within reach.`
                        : focusSummary(activeLensInfo.label, activeView.label)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetaPill label="Lens" value={activeLensInfo.label} />
                    <MetaPill label="View" value={activeView.label} />
                    <MetaPill label="Places" value={String(placesCount)} />
                    <MetaPill label="Events" value={String(eventsCount)} />
                  </div>

                  {selectedPlaceId ? (
                    <div className="flex items-center gap-2">
                      {hasDossierPanel ? (
                        <button
                          type="button"
                          className="atlas-horizon-action"
                          onClick={() => setActivePanel("dossier")}
                        >
                          Inspect dossier
                        </button>
                      ) : null}
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
                <section className="space-y-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      Civic lenses
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {ATLAS_LENSES.map((lens) => {
                        const Icon = lensIcons[lens.id];
                        const selected = lens.id === activeLens;

                        return (
                          <button
                            key={lens.id}
                            type="button"
                            className="atlas-island-option"
                            data-active={selected ? "true" : "false"}
                            style={{
                              color: selected ? "var(--ctx-paper)" : "var(--ctx-ink)",
                            }}
                            onClick={() => onLensChange(lens.id)}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium leading-[1.2]">
                                {lens.label}
                              </span>
                              <span
                                className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em]"
                                style={{
                                  color: selected
                                    ? "color-mix(in srgb, var(--ctx-paper) 74%, transparent)"
                                    : "var(--ctx-ink-mute)",
                                }}
                              >
                                {lens.shortLabel}
                              </span>
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
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {ATLAS_SCENE_VIEW_MODES.map((mode) => {
                        const Icon = viewModeIcons[mode.id];
                        const selected = mode.id === viewMode;

                        return (
                          <button
                            key={mode.id}
                            type="button"
                            className="atlas-island-option"
                            data-active={selected ? "true" : "false"}
                            style={{
                              color: selected ? "var(--ctx-paper)" : "var(--ctx-ink)",
                            }}
                            onClick={() => onViewModeChange(mode.id)}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium leading-[1.2]">
                                {mode.label}
                              </span>
                              <span
                                className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em]"
                                style={{
                                  color: selected
                                    ? "color-mix(in srgb, var(--ctx-paper) 74%, transparent)"
                                    : "var(--ctx-ink-mute)",
                                }}
                              >
                                {mode.shortLabel}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {activePanel === "dossier" ? (
                <section className="rounded-[16px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)]">
                  {hasDossierPanel ? (
                    dossierContent
                  ) : (
                    <div className="px-4 py-4 text-[12px] leading-[1.55] text-[color:var(--ctx-ink-soft)]">
                      Select a place to open its support, history, and nearby context here.
                    </div>
                  )}
                </section>
              ) : null}

              {activePanel === "horizon" ? (
                <section className="space-y-3">
                  {selectedHorizonNode ? (
                    <>
                      <div className="atlas-horizon-shell rounded-[18px] border border-[rgba(42,36,25,0.08)] p-4">
                        <div className="mx-auto flex max-w-[180px] justify-center">
                          <div
                            className={cn(
                              "atlas-horizon-compass",
                              !isMobileViewport && "atlas-horizon-compass-desktop",
                            )}
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

                        <div className="mt-4 rounded-[14px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.32)] p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                            {selectedHorizonNode.relationLabel}
                          </p>
                          <p className="mt-1 text-[14px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
                            {selectedHorizonNode.name}
                          </p>
                          <p className="mt-1 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                            {selectedHorizonNode.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[10px] leading-[1.4] text-[color:var(--ctx-ink-mute)]">
                              {selectedHorizonNode.directionLabel || selectedHorizonNode.scopeLabel}
                              <br />
                              {selectedHorizonNode.sourceCountLabel}
                            </span>
                            <div className="flex items-center gap-2">
                              <Link
                                href={selectedHorizonNode.detailHref}
                                className="atlas-horizon-action"
                                aria-label={`Open ${selectedHorizonNode.name}`}
                              >
                                Open
                              </Link>
                              <button
                                type="button"
                                className="atlas-horizon-action"
                                disabled={!selectedHorizonNode.compareAvailable}
                                aria-label={`Compare Flint Atlas with ${selectedHorizonNode.name}`}
                              >
                                Compare
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {horizonNodes.map((node) => (
                          <button
                            key={node.atlasId}
                            type="button"
                            className="atlas-horizon-list-item"
                            data-active={node.atlasId === selectedHorizonNode.atlasId ? "true" : "false"}
                            onClick={() => setSelectedHorizonId(node.atlasId)}
                          >
                            <span className="atlas-horizon-list-badge" aria-hidden="true">
                              {horizonBadge(node.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-medium text-[color:var(--ctx-ink)]">
                                {node.name}
                              </span>
                              <span className="mt-1 block truncate text-[11px] text-[color:var(--ctx-ink-soft)]">
                                {node.directionLabel || node.scopeLabel}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px] leading-[1.55] text-[color:var(--ctx-ink-soft)]">
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

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
        {label}
      </p>
      <p className="mt-1.5 text-[13px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
        {value}
      </p>
    </div>
  );
}

function SceneFocusIndicator({
  viewMode,
  activeLens,
  hasSelection,
  reducedMotion,
}: {
  viewMode: AtlasSceneViewModeId;
  activeLens: AtlasLensId;
  hasSelection: boolean;
  reducedMotion: boolean;
}) {
  const activeIndex = ATLAS_SCENE_VIEW_MODES.findIndex((mode) => mode.id === viewMode);
  const glyph = hasSelection ? "S" : ATLAS_LENS_LOOKUP[activeLens].label.slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-1">
        {ATLAS_SCENE_VIEW_MODES.map((mode, index) => (
          <motion.span
            key={mode.id}
            initial={false}
            animate={{
              height: index === activeIndex ? 18 : 10,
              opacity: index === activeIndex ? 1 : 0.32,
              backgroundColor:
                index === activeIndex ? "var(--ctx-ink)" : "rgba(42,36,25,0.38)",
            }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
            className="w-[4px] rounded-full"
          />
        ))}
      </div>
      <motion.span
        initial={false}
        animate={{
          scale: hasSelection ? 1 : 0.92,
          opacity: hasSelection ? 1 : 0.78,
        }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
        className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(42,36,25,0.1)] bg-[rgba(255,255,255,0.48)] font-mono text-[10px] font-semibold uppercase text-[color:var(--ctx-ink)]"
        style={{
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.62), 0 8px 16px -14px ${lensAccent(activeLens)}`,
        }}
      >
        {glyph}
      </motion.span>
    </div>
  );
}

function focusHeadline(lensLabel: string): string {
  return `${lensLabel} civic field`;
}

function focusSummary(lensLabel: string, viewLabel: string): string {
  return `${lensLabel} is the active civic lens. ${viewLabel} keeps the current atlas reading mode in focus while the main map stays primary.`;
}

function lensAccent(lens: AtlasLensId): string {
  return (
    {
      explore: "rgba(47,127,120,0.38)",
      memory: "rgba(193,74,44,0.38)",
      safety: "rgba(157,94,38,0.38)",
      interventions: "rgba(92,106,160,0.38)",
      evidence: "rgba(88,118,191,0.38)",
    }[lens] ?? "rgba(42,36,25,0.3)"
  );
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
  const degrees = directionDegreesFromLabel(node.directionLabel);
  const angle = ((degrees - 90) * Math.PI) / 180;
  const orbit = normalizedOrbit(node);
  const x = 50 + Math.cos(angle) * orbit;
  const y = 50 + Math.sin(angle) * orbit;

  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

function directionDegreesFromLabel(label: string): number {
  const normalized = label.toLowerCase();

  if (normalized.includes("northeast")) return 45;
  if (normalized.includes("southeast")) return 135;
  if (normalized.includes("southwest")) return 225;
  if (normalized.includes("northwest")) return 315;
  if (normalized.includes("north")) return 0;
  if (normalized.includes("east")) return 90;
  if (normalized.includes("south")) return 180;
  if (normalized.includes("west")) return 270;

  return 0;
}

function normalizedOrbit(node: NodeHorizonEntry): number {
  const distanceMatch = node.directionLabel.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)/i);
  const distanceValue = distanceMatch ? Number(distanceMatch[1]) : null;

  if (distanceValue !== null && Number.isFinite(distanceValue)) {
    return Math.max(16, Math.min(34, 12 + distanceValue * 0.34));
  }

  return (
    {
      parent: 18,
      child: 22,
      neighbor: 30,
      self: 16,
    }[node.relation] ?? 24
  );
}
