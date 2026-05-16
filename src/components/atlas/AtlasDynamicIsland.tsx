"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Footprints,
  Layers3,
  Map,
  Route,
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
  selectedPlaceId: string | null;
  selectedPlaceName: string | null;
  focusDetailLevel: AtlasSceneDetailLevel;
  focusCameraBand: AtlasSceneCameraBand;
  placesCount: number;
  eventsCount: number;
  horizonNodes: NodeHorizonEntry[];
  isMobileViewport: boolean;
  dossierContent?: ReactNode;
  onClearSelection: () => void;
};

const lensIcons: Record<AtlasLensId, ComponentType<{ className?: string }>> = {
  explore: Map,
  memory: Building2,
  safety: ShieldAlert,
  interventions: Route,
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
  selectedPlaceId,
  selectedPlaceName,
  focusDetailLevel,
  focusCameraBand,
  placesCount,
  eventsCount,
  horizonNodes,
  isMobileViewport,
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
  const islandSubtitle = `${focusDetailLabel(focusDetailLevel)} · ${focusBandLabel(focusCameraBand)} · ${activeView.shortLabel}`;

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

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-[1420] -translate-x-1/2">
        <motion.div
          initial={false}
          animate={{
            width: isExpanded ? (isMobileViewport ? 354 : 392) : (isMobileViewport ? 290 : 318),
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
          <motion.button
            type="button"
            initial={false}
            animate={{
              opacity: isExpanded ? 0 : 1,
              pointerEvents: isExpanded ? "none" : "auto",
            }}
            transition={islandTransition}
            className="absolute inset-0 flex w-full items-center gap-4 px-4 text-left"
            onClick={() => openIsland()}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.4)]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: lensAccent(activeLens) }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium leading-[1.2] text-[color:var(--ctx-ink)]">
                {islandTitle}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                {islandSubtitle}
              </p>
            </div>
            <SceneFocusIndicator
              cameraBand={focusCameraBand}
              detailLevel={focusDetailLevel}
              hasSelection={selectedPlaceId !== null}
            />
          </motion.button>

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

function lensAccent(lens: AtlasLensId): string {
  return (
    {
      explore: "#2f7f78",
      memory: "#c14a2c",
      safety: "#9d5e26",
      interventions: "#5c6aa0",
    }[lens] ?? "#2a2419"
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
