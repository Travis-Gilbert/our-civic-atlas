"use client";

import { useMemo } from "react";
import { CardRenderer } from "@/components/atlas/CardRenderer";
import type { LayerView } from "@/lib/atlas/contracts";
import type { AtlasMosaic } from "@/lib/atlas/mosaic";
import type { AtlasLensId } from "@/lib/atlas/scene-view";
import {
  getAnalyticalCardsForScope,
  type CardSpec,
} from "@/lib/atlas/analytical-workbench";
import { useLayers } from "@/lib/atlas/use-layer-catalog";
import { useLayerView } from "@/lib/atlas/use-layer-view";

type AnalyticalWorkbenchPanelProps = {
  mosaic: AtlasMosaic | null;
  activeMode: AtlasLensId;
  selectedPlaceId?: string | null;
  atlasEventsVersion?: number;
  compact?: boolean;
};

export function AnalyticalWorkbenchPanel({
  mosaic,
  activeMode,
  selectedPlaceId = null,
  atlasEventsVersion = 0,
  compact = false,
}: AnalyticalWorkbenchPanelProps) {
  const { layers } = useLayers();
  const availableLayerIds = useMemo(
    () => new Set(layers.map((layer) => layer.id)),
    [layers],
  );
  const cards = useMemo(
    () =>
      getAnalyticalCardsForScope({
        activeMode,
        selectedPlaceId,
        availableLayerIds,
      }),
    [activeMode, selectedPlaceId, availableLayerIds],
  );

  if (!mosaic || cards.length === 0) return null;

  return (
    <section
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      data-analytical-workbench
      data-active-mode={activeMode}
    >
      {cards.map((card) =>
        card.layer.kind === "atlasTable" ? (
          <CardRenderer
            key={card.id}
            spec={card}
            mosaic={mosaic}
            dataVersion={atlasEventsVersion}
            selectedPlaceId={selectedPlaceId}
            compact={compact}
          />
        ) : (
          <LayerBackedCard
            key={card.id}
            card={card}
            mosaic={mosaic}
            selectedPlaceId={selectedPlaceId}
            compact={compact}
          />
        ),
      )}
    </section>
  );
}

function LayerBackedCard({
  card,
  mosaic,
  selectedPlaceId,
  compact,
}: {
  card: CardSpec;
  mosaic: AtlasMosaic;
  selectedPlaceId: string | null;
  compact: boolean;
}) {
  const layerId = card.layer.kind === "layerView" ? card.layer.layerId : null;
  const { view } = useLayerView(layerId, { includeRecipe: false });

  if (!view) return null;

  return (
    <CardRenderer
      spec={card}
      mosaic={mosaic}
      layerView={view as unknown as LayerView}
      selectedPlaceId={selectedPlaceId}
      compact={compact}
    />
  );
}
