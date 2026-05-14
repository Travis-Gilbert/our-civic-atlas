"use client";

import Link from "next/link";
import {
  Activity,
  Boxes,
  Building2,
  Footprints,
  Layers3,
  Map,
  Network,
  Route,
  Search,
  ShieldAlert,
  Telescope,
  Waypoints,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  ATLAS_LENSES,
  ATLAS_LENS_LOOKUP,
  ATLAS_SCENE_VIEW_MODES,
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  VISUAL_GRAMMAR_TOKENS,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import { cn } from "@/lib/utils";

export type AtlasSceneSearchResult = {
  id: string;
  name: string;
  type: string;
};

type AtlasSceneChromeProps = {
  activeLens: AtlasLensId;
  onLensChange: (lens: AtlasLensId) => void;
  viewMode: AtlasSceneViewModeId;
  onViewModeChange: (mode: AtlasSceneViewModeId) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  searchResults: AtlasSceneSearchResult[];
  onSearchResultSelect: (placeId: string) => void;
  selectedPlaceName: string | null;
  placesCount: number;
  eventsCount: number;
  horizonNodes: NodeHorizonEntry[];
  mobileDossierOpen?: boolean;
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

export function AtlasSceneChrome({
  activeLens,
  onLensChange,
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchValueChange,
  searchResults,
  onSearchResultSelect,
  selectedPlaceName,
  placesCount,
  eventsCount,
  horizonNodes,
  mobileDossierOpen = false,
}: AtlasSceneChromeProps) {
  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];
  const activeLensInfo = ATLAS_LENS_LOOKUP[activeLens];

  return (
    <div className="pointer-events-none absolute inset-0 z-[1400]">
      <header className="atlas-scene-header pointer-events-auto absolute left-5 right-5 top-4 flex items-start justify-between gap-4 md:right-[320px]">
        <div className="atlas-scene-glass atlas-scene-brand min-w-[260px] max-w-[360px] px-4 py-3">
          <p className="font-mono text-[10px] uppercase leading-none tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
            Our Civic Atlas
          </p>
          <h1 className="mt-1 text-[24px] font-semibold leading-none text-[color:var(--ctx-ink)]">
            Flint Atlas
          </h1>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <SceneMetric label="places" value={String(placesCount)} />
            <SceneMetric label="events" value={String(eventsCount)} />
            <SceneMetric label="view" value={activeView.shortLabel} />
          </div>
        </div>

        <div className="atlas-scene-glass atlas-scene-search-shell relative min-w-[min(520px,44vw)] px-3 py-2">
          <label
            className="flex items-center gap-2"
            aria-label="Search Flint Atlas places"
          >
            <Search className="h-4 w-4 shrink-0 text-[color:var(--ctx-ink-mute)]" />
            <input
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              suppressHydrationWarning
              className="h-9 w-full bg-transparent text-[14px] outline-none placeholder:text-[color:var(--ctx-ink-faint)]"
              placeholder="Search places, wards, landmarks"
              type="search"
            />
          </label>
          {searchValue.trim().length > 0 && (
            <div
              className="atlas-scene-search-results absolute left-0 right-0 top-[calc(100%+6px)]"
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
                    <span className="truncate text-[color:var(--ctx-ink)]">
                      {result.name}
                    </span>
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
          )}
        </div>
      </header>

      <nav
        className={cn(
          "atlas-scene-glass pointer-events-auto absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1 p-1",
          mobileDossierOpen && "hidden md:flex",
        )}
        aria-label="Atlas civic lenses"
      >
        {ATLAS_LENSES.map((lens) => {
          const Icon = lensIcons[lens.id];
          const selected = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              type="button"
              className={cn("atlas-scene-icon-button", selected && "is-active")}
              onClick={() => onLensChange(lens.id)}
              aria-pressed={selected}
              title={lens.description}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{lens.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="atlas-scene-glass atlas-scene-lens-card pointer-events-auto absolute bottom-5 left-5 w-[300px] px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[color:var(--ctx-accent)]" />
          <p className="text-[13px] font-medium leading-none text-[color:var(--ctx-ink)]">
            {activeLensInfo.label}
          </p>
        </div>
        <p className="mt-2 text-[12px] leading-[1.45] text-[color:var(--ctx-ink-soft)]">
          {activeLensInfo.description}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VISUAL_GRAMMAR_TOKENS.map((token) => (
            <div key={token.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: token.color }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium leading-none text-[color:var(--ctx-ink)]">
                  {token.label}
                </span>
                <span className="mt-0.5 block truncate text-[10px] leading-none text-[color:var(--ctx-ink-mute)]">
                  {token.detail}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div
        className={cn(
          "atlas-scene-glass pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 p-1",
          mobileDossierOpen && "hidden md:flex",
        )}
      >
        {ATLAS_SCENE_VIEW_MODES.map((mode) => {
          const Icon = viewModeIcons[mode.id];
          const selected = mode.id === viewMode;
          return (
            <button
              key={mode.id}
              type="button"
              className={cn("atlas-scene-camera-button", selected && "is-active")}
              onClick={() => onViewModeChange(mode.id)}
              aria-pressed={selected}
              aria-label={mode.label}
              title={mode.description}
            >
              <Icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <aside
        id="node-horizon"
        className="atlas-scene-glass pointer-events-auto absolute right-5 top-[88px] hidden max-h-[calc(100vh-196px)] w-[280px] overflow-y-auto px-4 py-3 md:block md:max-h-[calc(100vh-112px)]"
      >
        <div className="flex items-center gap-2">
          <Telescope className="h-4 w-4 text-[color:var(--ctx-accent)]" />
          <p className="text-[13px] font-medium leading-none text-[color:var(--ctx-ink)]">
            Node Horizon
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {horizonNodes.map((node) => (
            <div
              key={node.atlasId}
              className="atlas-horizon-node rounded-[4px] border border-[rgba(42,36,25,0.09)] bg-[rgba(255,255,255,0.26)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[12px] font-medium text-[color:var(--ctx-ink)]">
                  {node.name}
                </span>
                <Waypoints className="h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-mute)]" />
              </div>
              <p className="mt-1 text-[11px] leading-[1.35] text-[color:var(--ctx-ink-soft)]">
                {node.description}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--ctx-ink-mute)]">
                <span>{node.relationLabel}</span>
                <span>{node.statusLabel}</span>
                <span>{node.scopeLabel}</span>
                <span>{node.freshnessLabel}</span>
                <span>{node.sourceCountLabel}</span>
                <span>{node.directionLabel || "direction planned"}</span>
                <span className="col-span-2 truncate">
                  {node.maintainerLabel}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {node.capabilityLabels.map((label) => (
                  <span key={label} className="atlas-horizon-chip">
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] text-[color:var(--ctx-ink-mute)]">
                  {node.contributionStatus}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={node.detailHref}
                    className="atlas-horizon-action"
                    aria-label={`Open ${node.name}`}
                    title={
                      node.manifestAvailable
                        ? `Open ${node.name}`
                        : `${node.name} route is available; manifest is planned`
                    }
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="atlas-horizon-action"
                    disabled={!node.compareAvailable}
                    aria-label={`Compare Flint Atlas with ${node.name}`}
                    title={
                      node.compareAvailable
                        ? `Compare Flint Atlas with ${node.name}`
                        : `${node.name} comparison is planned`
                    }
                  >
                    Compare
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-[92px] right-[320px] max-w-[320px] text-right">
        <p className="atlas-scene-readout inline-block px-3 py-2 text-[12px] leading-[1.45]">
          {selectedPlaceName
            ? `${selectedPlaceName} is pinned to the evidence stack.`
            : `${activeView.label} view: ${activeView.description}`}
        </p>
      </div>
    </div>
  );
}

function SceneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[15px] font-semibold leading-none text-[color:var(--ctx-ink)]">
        {value}
      </span>
      <span className="mt-1 block font-mono text-[9px] uppercase leading-none tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
        {label}
      </span>
    </div>
  );
}
