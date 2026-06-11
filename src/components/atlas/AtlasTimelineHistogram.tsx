"use client";

import { CardRenderer } from "@/components/atlas/CardRenderer";
import type { AtlasMosaic } from "@/lib/atlas/mosaic";
import { getAnalyticalCard } from "@/lib/atlas/analytical-workbench";

interface AtlasTimelineHistogramProps {
  mosaic: AtlasMosaic | null;
  /** Incremented by the page after DuckDB tables are reloaded. */
  dataVersion?: number;
  /** Kept for compatibility with the previous timeline slot API. */
  emptyLabel?: string;
}

const TIMELINE_CARD = getAnalyticalCard("memory-events-by-decade");

export function AtlasTimelineHistogram({
  mosaic,
  dataVersion = 0,
}: AtlasTimelineHistogramProps) {
  if (!TIMELINE_CARD) return null;
  return (
    <div
      className="atlas-timeline-histogram px-2 py-1"
      data-atlas-timeline-histogram="true"
    >
      <CardRenderer
        spec={TIMELINE_CARD}
        mosaic={mosaic}
        dataVersion={dataVersion}
        compact
      />
    </div>
  );
}
