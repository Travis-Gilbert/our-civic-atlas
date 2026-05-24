"use client";

/**
 * AtelierProvenanceLines - PT-403
 *
 * Renders terracotta SVG lines from each evidence card to the building's
 * scene center. Static representation of Stage 2 (direct extraction)
 * provenance: each line says "this source contributed evidence to that
 * building part".
 *
 * Atelier spec line 39: "Evidence-to-part connections render as
 * terracotta lines (`--ctx-accent`, the same accent the rest of the
 * atlas uses for selection) but at half opacity, drawn as if with a
 * fine architect's pen. The lines aren't decoration. They're
 * provenance made visible."
 *
 * Static draw at v1; PT-304 wires the choreographer to animate
 * stroke-dashoffset for the line-draw effect during Stage 2.
 *
 * Implementation notes:
 *   - SVG positioned absolute inset:0 inside the scene area
 *   - Card centers measured via getBoundingClientRect (cards are absolute
 *     positioned via placeholder layout in AtelierSurface)
 *   - Building anchor = scene center (until R3F scene at PT-204 provides
 *     real 3D building coords)
 *   - ResizeObserver triggers re-measure on viewport change
 *   - pointer-events: none so lines don't intercept card clicks
 */

import { useEffect, useRef, useState } from "react";
import type { ChoreographerState } from "@/lib/atlas/atelier-choreographer";

type Endpoint = { x: number; y: number };
type LineSegment = { id: string; from: Endpoint; to: Endpoint; length: number };

type AtelierProvenanceLinesProps = {
  /** CSS selector for the cards the lines originate from. */
  cardSelector?: string;
  /** Container the lines are positioned inside (the scene area). */
  containerSelector?: string;
  /** Choreographer state — lines draw on during direct_extraction stage. */
  choreographyState?: ChoreographerState;
};

export function AtelierProvenanceLines({
  cardSelector = ".atelier-source-card",
  containerSelector = ".atelier-surface__scene",
  choreographyState,
}: AtelierProvenanceLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [segments, setSegments] = useState<LineSegment[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    function measure() {
      const containerRect = container!.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      const buildingCenter: Endpoint = {
        x: width * 0.5,
        y: height * 0.5,
      };

      const cards = container!.querySelectorAll(cardSelector);
      const newSegments: LineSegment[] = [];
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter: Endpoint = {
          x: cardRect.left - containerRect.left + cardRect.width / 2,
          y: cardRect.top - containerRect.top + cardRect.height / 2,
        };
        const length = Math.hypot(
          buildingCenter.x - cardCenter.x,
          buildingCenter.y - cardCenter.y,
        );
        newSegments.push({
          id: `provenance-${index}`,
          from: cardCenter,
          to: buildingCenter,
          length,
        });
      });

      setSegments(newSegments);
      setDimensions({ width, height });
    }

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    container.querySelectorAll(cardSelector).forEach((card) => {
      resizeObserver.observe(card);
    });

    // Re-measure once after a tick so cards have laid out
    const tickTimeout = window.setTimeout(measure, 50);

    return () => {
      window.clearTimeout(tickTimeout);
      resizeObserver.disconnect();
    };
  }, [cardSelector, containerSelector]);

  if (dimensions.width === 0 || dimensions.height === 0) return null;

  // Per spec lines 78-96 + animation-choreography Stage 2: lines draw
  // on staggered during `direct_extraction`. Before that stage the
  // lines are invisible. After (block_subgraph onward, or skipped),
  // they are fully drawn.
  const stage = choreographyState?.stage;
  const stageProgress = choreographyState?.stageProgress ?? 1;
  const skipped = choreographyState?.skipped ?? false;

  function drawFraction(index: number, total: number): number {
    if (!stage || skipped) return 1;
    // Stages that complete the draw: direct_extraction onward (the
    // lines stay visible through Stage 3-7).
    const completedStages: ChoreographerState["stage"][] = [
      "block_subgraph",
      "pairformer_inference",
      "merge_conflicts",
      "asset_generation",
      "settled",
    ];
    if (completedStages.includes(stage)) return 1;
    if (stage !== "direct_extraction") return 0;
    // During Stage 2: stagger per line. Each line gets a 1/total window
    // with overlap.
    const start = (index * 0.6) / Math.max(total, 1);
    const end = start + 0.5;
    const t = (stageProgress - start) / (end - start);
    return Math.max(0, Math.min(1, t));
  }

  return (
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      {segments.map((segment, index) => {
        const fraction = drawFraction(index, segments.length);
        const dashOffset = segment.length * (1 - fraction);
        return (
          <line
            key={segment.id}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke="var(--atelier-accent)"
            strokeOpacity={0.5}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={segment.length}
            strokeDashoffset={dashOffset}
          />
        );
      })}
    </svg>
  );
}
