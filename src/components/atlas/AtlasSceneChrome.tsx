"use client";

import type { ReactNode } from "react";
import { AtlasDynamicIsland } from "@/components/atlas/AtlasDynamicIsland";
import { AtlasSceneHeader } from "@/components/atlas/AtlasSceneHeader";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import type {
  AtlasNodeSummary,
  NodeHorizonEntry,
} from "@/lib/atlas/node-horizon";

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
  currentNode: AtlasNodeSummary | null;
  compareNode: AtlasNodeSummary | null;
  horizonNodes: NodeHorizonEntry[];
  isMobileViewport?: boolean;
  selectedPlaceId: string | null;
  onClearSelection: () => void;
  onClearCompare: () => void;
  onCompareNodeSelect: (atlasId: string | null) => void;
  dossierContent?: ReactNode;
  timelineActive?: boolean;
  hideIsland?: boolean;
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
  currentNode,
  compareNode,
  horizonNodes,
  isMobileViewport = false,
  selectedPlaceId,
  onClearSelection,
  onClearCompare,
  onCompareNodeSelect,
  dossierContent,
  timelineActive = false,
  hideIsland = false,
}: AtlasSceneChromeProps) {
  const activeView = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode];

  return (
    <div className="pointer-events-none absolute inset-0 z-[1400]">
      {!isMobileViewport ? (
        <AtlasSceneHeader
          searchValue={searchValue}
          onSearchValueChange={onSearchValueChange}
          searchResults={searchResults}
          onSearchResultSelect={onSearchResultSelect}
          placesCount={placesCount}
          eventsCount={eventsCount}
          activeViewLabel={activeView.shortLabel}
          currentNode={currentNode}
          compareNode={compareNode}
          onClearCompare={onClearCompare}
        />
      ) : null}

      {!hideIsland ? (
        <AtlasDynamicIsland
          activeLens={activeLens}
          onLensChange={onLensChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          selectedPlaceId={selectedPlaceId}
          selectedPlaceName={selectedPlaceName}
          placesCount={placesCount}
          eventsCount={eventsCount}
          horizonNodes={horizonNodes}
          currentNode={currentNode}
          compareNode={compareNode}
          onCompareNodeSelect={onCompareNodeSelect}
          isMobileViewport={isMobileViewport}
          timelineActive={timelineActive}
          dossierContent={dossierContent}
          searchValue={searchValue}
          onSearchValueChange={onSearchValueChange}
          searchResults={searchResults}
          onSearchResultSelect={onSearchResultSelect}
          onClearSelection={onClearSelection}
        />
      ) : null}
    </div>
  );
}
