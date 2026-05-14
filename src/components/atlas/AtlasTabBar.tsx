"use client";

/**
 * AtlasTabBar — replaces the atlas top chrome (formerly toolbar with
 * search/layers/capture/provenance/dossier toggles) with a tab strip.
 *
 * Each tab represents a saved view of the atlas: an analytical lens
 * the user has put together (which layers are on, what time range is
 * selected, which place dossier is pinned, what camera the map sits
 * at). v1 only renders the tab strip; switching tabs is a no-op on
 * map state. A follow-up will land per-tab state snapshots so that
 * switching tabs preserves and restores the full atlas configuration.
 *
 * The active-tab indicator uses framer-motion's `layoutId` to morph
 * smoothly between positions. This is the pattern the user supplied
 * from the gooey-filter tabs demo; the gooey SVG filter is omitted
 * here in favor of a cleaner sliding pill since the atlas chrome
 * already carries a lot of motion (proximity-fade dots, map pan).
 *
 * Title-rendering policy: uses the project's display face for the
 * tab labels so they read as document tabs rather than tool buttons.
 * Data-fade-source is set so the proximity-fade in CanvasBackground
 * softens the MT19937 dot field beneath the chrome.
 */

import { motion } from "framer-motion";

export interface AtlasTab {
  /** Stable identifier. Used as React key + future view-state key. */
  id: string;
  /** Display label. */
  title: string;
  /** Optional subtitle, rendered as a mono caption beneath the title. */
  subtitle?: string;
}

export interface AtlasTabBarProps {
  tabs: AtlasTab[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * Default tab set. A single root tab anchored on the left.
 *
 * v1 hard-codes "Flint, Michigan" as the canonical atlas view. v2 will
 * grow this list dynamically as the user adds filters or opens place
 * dossiers — each meaningful state change spawns a new tab to the
 * right whose title / subtitle reflect the filter (e.g. "Ward 4",
 * "Crash aggregates · 2018-2024"). The left-aligned single-tab layout
 * is intentional: it reads as "the first tab in a strip that's ready
 * to grow" rather than as a page title, so the dynamic-tab semantics
 * are visually anticipated.
 */
export const DEFAULT_ATLAS_TABS: AtlasTab[] = [
  { id: "flint-michigan", title: "Flint, Michigan" },
];

export function AtlasTabBar({ tabs, activeId, onChange }: AtlasTabBarProps) {
  return (
    <nav
      className="relative flex items-end justify-start w-full shrink-0 pt-2 px-3"
      role="tablist"
      aria-label="Atlas views"
      data-fade-source
      style={{
        /* Top chrome strip — same paper tone as the active-tab indicator,
           so the tab sits flush on a unified bar of paper rather than
           floating over the dot field. The strip is slightly more opaque
           than the tab itself; the active tab reads as a clarified tile
           lifted out of the strip by its rounded outline. */
        background: "rgba(246, 244, 238, 0.86)",
        backdropFilter: "blur(8px) saturate(108%)",
        WebkitBackdropFilter: "blur(8px) saturate(108%)",
        borderBottom: "1px solid rgba(42, 36, 25, 0.12)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className="relative flex items-center justify-center h-10 cursor-pointer transition-colors"
            style={{
              background: "transparent",
              border: "none",
              padding: "0 22px",
              minWidth: 0,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="atlas-active-tab"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "rgba(246, 244, 238, 0.9)",
                  borderRadius: "10px 10px 0 0",
                  border: "1px solid rgba(42, 36, 25, 0.18)",
                  borderBottom: "none",
                  backdropFilter: "blur(8px) saturate(108%)",
                  WebkitBackdropFilter: "blur(8px) saturate(108%)",
                  boxShadow:
                    "0 -1px 0 rgba(255,255,255,0.5) inset, 0 1px 2px rgba(60,40,12,0.05)",
                }}
                transition={{
                  type: "spring",
                  bounce: 0,
                  duration: 0.4,
                }}
              />
            )}
            <span
              className="relative z-10 font-display text-[14px] leading-none tracking-[-0.01em] whitespace-nowrap transition-colors"
              style={{
                color: isActive ? "var(--ctx-ink)" : "var(--ctx-ink-mute)",
              }}
            >
              {tab.title}
            </span>
            {tab.subtitle && (
              <span
                className="relative z-10 ml-2 font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap transition-colors"
                style={{
                  color: isActive ? "var(--ctx-ink-mute)" : "var(--ctx-ink-faint)",
                }}
              >
                · {tab.subtitle}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
