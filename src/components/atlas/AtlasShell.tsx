"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  AtlasTabBar,
  DEFAULT_ATLAS_TABS,
  type AtlasTab,
} from "./AtlasTabBar";

/* ------------------------------------------------------------------ */
/*  AtlasShell                                                         */
/* ------------------------------------------------------------------ */

export function AtlasAppShell({
  children,
  leftRail,
  rightRail,
  bottomRail,
  dossier,
  timeline,
  provenance,
  layers,
  capture,
  captureOpen: captureOpenProp,
  tabs = DEFAULT_ATLAS_TABS,
  activeTabId: activeTabIdProp,
  onTabChange,
  showTabs = true,
  showLeftRail = true,
  showRightRail = true,
  showBottomRail = true,
  showDossier = true,
  showTimeline = true,
  showProvenance = true,
}: {
  /** Map/canvas area (deck.gl, MapLibre, etc.) */
  children: ReactNode;
  /** Named left shell region. */
  leftRail?: ReactNode;
  /** Named right shell region. */
  rightRail?: ReactNode;
  /** Named bottom shell region. */
  bottomRail?: ReactNode;
  /** Left dossier slot. */
  dossier?: ReactNode;
  /** Bottom timeline slot. */
  timeline?: ReactNode;
  /** Right provenance slot. */
  provenance?: ReactNode;
  /** Layer controls overlay (rendered when active). */
  layers?: ReactNode;
  /** Capture monitor overlay (rendered when active). */
  capture?: ReactNode;
  /** External flag controlling whether the capture overlay is visible. */
  captureOpen?: boolean;
  /** Top-chrome tab list. Defaults to DEFAULT_ATLAS_TABS. */
  tabs?: AtlasTab[];
  /** Externally-controlled active tab id. If omitted, the shell holds state. */
  activeTabId?: string;
  /** Notified when the user clicks a tab. */
  onTabChange?: (id: string) => void;
  /** Render the legacy saved-view tab strip. Atlas Scene can replace it. */
  showTabs?: boolean;
  /** Render the named left rail region. */
  showLeftRail?: boolean;
  /** Render the named right rail region. */
  showRightRail?: boolean;
  /** Render the named bottom rail region. */
  showBottomRail?: boolean;
  /** Render the dossier/control panel. */
  showDossier?: boolean;
  /** Render the timeline panel. */
  showTimeline?: boolean;
  /** Render the provenance panel. */
  showProvenance?: boolean;
}) {
  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(
    tabs[0]?.id ?? "atlas",
  );

  const activeTabId = activeTabIdProp ?? internalActiveTabId;
  const leftRailContent = leftRail ?? dossier;
  const rightRailContent = rightRail ?? provenance;
  const bottomRailContent = bottomRail ?? timeline;
  const leftRailVisible = showLeftRail && showDossier;
  const rightRailVisible = showRightRail && showProvenance;
  const bottomRailVisible = showBottomRail && showTimeline;
  const layersOpen = false;
  const leftPanelOffsetClass = showTabs ? "left-4" : "left-[76px]";
  const rightPanelOffsetClass = showTabs ? "right-4" : "right-4 xl:right-[320px]";
  const timelineOffsetClass = showTabs ? "bottom-4" : "bottom-[72px]";
  const dossierPanelPlacementClass = showTabs
    ? "top-1/2 -translate-y-1/2 max-h-[calc(100%-2rem)]"
    : "top-[156px] max-h-[calc(100%-180px)]";
  const provenancePanelPlacementClass = showTabs
    ? "top-1/2 -translate-y-1/2 max-h-[calc(100%-2rem)]"
    : "top-[88px] max-h-[calc(100%-112px)]";
  const handleTabChange = useCallback(
    (id: string) => {
      if (onTabChange) onTabChange(id);
      else setInternalActiveTabId(id);
    },
    [onTabChange],
  );

  return (
    <div className="atlas-app-shell relative flex h-full flex-col overflow-hidden">
      {/* -- Top chrome: tab strip. Each tab is a saved atlas view; v1
              switches the active indicator only, v2 will restore the
              full atlas state per tab (layers, time range, place,
              camera). The morph indicator is framer-motion's layoutId
              pattern. --- */}
      {showTabs && (
        <AtlasTabBar
          tabs={tabs}
          activeId={activeTabId}
          onChange={handleTabChange}
        />
      )}

      {/* -- Body: map is full-bleed; panels float over it as sticky,
              vertically-centered, transparent tiles. ----------------- */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Map fills the entire body. */}
        <div className="absolute inset-0">
          {children}
          {layersOpen ? layers : null}
          {captureOpenProp && capture}
        </div>

        {/* LEFT: Signals, controls, and future receipt/review surface. */}
        {leftRailVisible && (
          <aside
            className={`atlas-panel atlas-shell-left-rail absolute ${leftPanelOffsetClass} ${dossierPanelPlacementClass} w-fit max-w-[340px] overflow-y-auto pointer-events-auto z-10`}
            data-atlas-shell-region="left-rail"
            data-fade-source
          >
            {leftRailContent ?? (
              <div className="px-5 py-6">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  Atlas rail
                </p>
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  Signals, layers, and civic controls will appear here.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* RIGHT: Dossier and source/support surface. */}
        {rightRailVisible && (
          <aside
            className={`atlas-panel atlas-shell-right-rail absolute ${rightPanelOffsetClass} ${provenancePanelPlacementClass} w-[320px] overflow-y-auto pointer-events-auto z-10`}
            data-atlas-shell-region="right-rail"
            data-fade-source
          >
            {rightRailContent ?? (
              <div className="px-5 py-6">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  Sources
                </p>
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  Source history and supporting records will appear here.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* BOTTOM: Timeline and mosaic controls. */}
        {bottomRailVisible && (
          <div
            className={`atlas-panel atlas-shell-bottom-rail absolute left-1/2 -translate-x-1/2 ${timelineOffsetClass} w-[min(720px,80%)] max-h-[180px] overflow-hidden pointer-events-auto z-10`}
            data-atlas-shell-region="bottom-rail"
            data-fade-source
          >
            <div className="px-4 py-2">
              <span
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Timeline
              </span>
            </div>
            <div className="atlas-scroll-hidden max-h-[140px] overflow-y-auto">
              {bottomRailContent ?? (
                <div className="flex items-center justify-center h-[120px]">
                  <p
                    className="font-mono text-[11px] tracking-[0.04em]"
                    style={{ color: "var(--ctx-ink-mute)" }}
                  >
                    No temporal data loaded
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const AtlasShell = AtlasAppShell;
