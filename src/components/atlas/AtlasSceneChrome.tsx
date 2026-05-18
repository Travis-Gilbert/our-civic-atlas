"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { AtlasDynamicIsland } from "@/components/atlas/AtlasDynamicIsland";
import type {
  AtlasSceneCameraBand,
  AtlasSceneDetailLevel,
} from "@/lib/atlas/scene-detail-policy";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";

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
  isMobileViewport?: boolean;
  selectedPlaceId: string | null;
  focusCameraBand: AtlasSceneCameraBand;
  focusDetailLevel: AtlasSceneDetailLevel;
  /** Live MapLibre bearing in degrees, clockwise from north. */
  cameraBearing?: number;
  /** Fired when the compass control is clicked. Should ease the
   * map's bearing back to 0. */
  onResetCompass?: () => void;
  /** Active atlas year (4-digit). When set, the chrome displays it
   * prominently and the renderer is in time-travel mode. */
  atlasYear?: number | null;
  onClearSelection: () => void;
  dossierContent: ReactNode;
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
  isMobileViewport = false,
  selectedPlaceId,
  focusCameraBand,
  focusDetailLevel,
  cameraBearing = 0,
  onResetCompass,
  atlasYear = null,
  onClearSelection,
  dossierContent,
}: AtlasSceneChromeProps) {
  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];

  return (
    <div className="pointer-events-none absolute inset-0 z-[1400]">
      {!isMobileViewport ? (
        <header className="atlas-scene-header pointer-events-auto absolute left-4 right-4 top-4 flex flex-col gap-3 md:left-5 md:right-5 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="atlas-scene-glass atlas-scene-brand hidden min-w-[260px] max-w-[360px] px-4 py-3 md:block">
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

          <div className="atlas-scene-glass atlas-scene-search-shell relative w-full px-3 py-2 md:min-w-[min(520px,44vw)] md:max-w-[620px]">
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
                placeholder="Search places, wards, landmarks — or type a year (1925)"
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
      ) : null}

      <AtlasDynamicIsland
        activeLens={activeLens}
        onLensChange={onLensChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        searchResults={searchResults}
        onSearchResultSelect={onSearchResultSelect}
        selectedPlaceId={selectedPlaceId}
        selectedPlaceName={selectedPlaceName}
        focusDetailLevel={focusDetailLevel}
        focusCameraBand={focusCameraBand}
        placesCount={placesCount}
        eventsCount={eventsCount}
        horizonNodes={horizonNodes}
        isMobileViewport={isMobileViewport}
        cameraBearing={cameraBearing}
        onResetCompass={onResetCompass}
        atlasYear={atlasYear}
        dossierContent={dossierContent}
        onClearSelection={onClearSelection}
      />
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
