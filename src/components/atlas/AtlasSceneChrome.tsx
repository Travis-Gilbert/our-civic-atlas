"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AtlasDynamicIsland } from "@/components/atlas/AtlasDynamicIsland";
import type {
  AtlasSceneCameraBand,
  AtlasSceneDetailLevel,
} from "@/lib/atlas/scene-detail-policy";
import type { AtlasLensId, AtlasSceneViewModeId } from "@/lib/atlas/scene-view";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import type { SelectedBuilding } from "@/lib/atlas/selected-building";

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
  visibleHistoricalReconstructionCount?: number | null;
  totalHistoricalReconstructionCount?: number;
  dossierContent: ReactNode;
  /**
   * Currently selected building, if any. Spec PR 1: drives the Place
   * tab dossier and the collapsed-island title fallback chain.
   */
  selectedBuilding?: SelectedBuilding | null;
  /** Fired when the user clears the building selection (Clear button or
   * empty-area click). Spec PR 1. */
  onClearBuilding?: () => void;
  layerControlsContent: ReactNode;
  scenarioControlsContent: ReactNode;
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
  visibleHistoricalReconstructionCount = null,
  totalHistoricalReconstructionCount = 0,
  dossierContent,
  selectedBuilding = null,
  onClearBuilding,
  layerControlsContent,
  scenarioControlsContent,
}: AtlasSceneChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1400]">
      {/*
        Top-strip chrome ships on every viewport. Mobile gets a tighter
        version via the @media (max-width: 767px) block in atlas.css
        (smaller wordmark, condensed nav). Without this, the mobile
        experience drops to a bare URL bar with only the dynamic
        island for navigation, which the real-reconstruction plan
        (docs/plans/atelier-real-reconstruction-plan.md, Task H)
        flagged as a regression from the desktop chrome.
      */}
      <header className="atlas-scene-header pointer-events-auto absolute left-5 right-5 top-4">
        <div className="atlas-scene-top-strip">
          <Link href="/open-flint-atlas" className="atlas-scene-wordmark">
            Flint Atlas
          </Link>
          <nav aria-label="Flint Atlas links" className="atlas-scene-top-actions">
            <Link href="/open-flint-atlas/sources">About</Link>
            <Link href="/open-flint-atlas/methodology">Methodology</Link>
            <Link
              href="/open-flint-atlas/atelier/building%3Acarriage-town%3A1/1925"
              aria-label="Open the Atelier on the Whaley House circa 1925"
            >
              Atelier
            </Link>
            <Link href="/open-flint-atlas/contribute" data-commit="true">
              Contribute
            </Link>
          </nav>
        </div>
      </header>

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
        visibleHistoricalReconstructionCount={
          visibleHistoricalReconstructionCount
        }
        totalHistoricalReconstructionCount={
          totalHistoricalReconstructionCount
        }
        dossierContent={dossierContent}
        selectedBuilding={selectedBuilding}
        onClearBuilding={onClearBuilding}
        layerControlsContent={layerControlsContent}
        scenarioControlsContent={scenarioControlsContent}
      />
    </div>
  );
}
