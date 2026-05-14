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

export function AtlasShell({
  children,
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
  showDossier = true,
  showTimeline = true,
  showProvenance = true,
}: {
  /** Map/canvas area (deck.gl, MapLibre, etc.) */
  children: ReactNode;
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
  /** Render the dossier/control panel. */
  showDossier?: boolean;
  /** Render the timeline panel. */
  showTimeline?: boolean;
  /** Render the provenance panel. */
  showProvenance?: boolean;
}) {
  const [dossierOpen] = useState(true);
  const [timelineOpen] = useState(true);
  const [provenanceOpen] = useState(true);
  const [layersOpen] = useState(false);
  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(
    tabs[0]?.id ?? "atlas",
  );

  const activeTabId = activeTabIdProp ?? internalActiveTabId;
  const leftPanelOffsetClass = showTabs ? "left-4" : "left-[76px]";
  const rightPanelOffsetClass = showTabs ? "right-4" : "right-4 xl:right-[320px]";
  const timelineOffsetClass = showTabs ? "bottom-4" : "bottom-[72px]";
  const handleTabChange = useCallback(
    (id: string) => {
      if (onTabChange) onTabChange(id);
      else setInternalActiveTabId(id);
    },
    [onTabChange],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
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
          {layersOpen && layers}
          {captureOpenProp && capture}
        </div>

        {/* LEFT: Dossier — floating sticky panel, vertically centered.
            Width sizes to content (max 340 to keep map area legible). */}
        {showDossier && dossierOpen && (
          <aside
            className={`atlas-panel absolute ${leftPanelOffsetClass} top-1/2 -translate-y-1/2 w-fit max-w-[340px] max-h-[calc(100%-2rem)] overflow-y-auto pointer-events-auto z-10`}
            data-fade-source
          >
            {dossier ?? (
              <div className="px-5 py-6">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  Dossier
                </p>
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  Select a parcel or ward on the map to view its dossier.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* RIGHT: Provenance — floating sticky panel, vertically centered. */}
        {showProvenance && provenanceOpen && (
          <aside
            className={`atlas-panel absolute ${rightPanelOffsetClass} top-1/2 -translate-y-1/2 w-[320px] max-h-[calc(100%-2rem)] overflow-y-auto pointer-events-auto z-10`}
            data-fade-source
          >
            {provenance ?? (
              <div className="px-5 py-6">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  Provenance
                </p>
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  Data lineage and source graph will appear here.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* BOTTOM: Timeline — floating sticky strip, horizontally centered. */}
        {showTimeline && timelineOpen && (
          <div
            className={`atlas-panel absolute left-1/2 -translate-x-1/2 ${timelineOffsetClass} w-[min(720px,80%)] max-h-[180px] overflow-hidden pointer-events-auto z-10`}
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
            <div className="max-h-[140px] overflow-y-auto">
              {timeline ?? (
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
