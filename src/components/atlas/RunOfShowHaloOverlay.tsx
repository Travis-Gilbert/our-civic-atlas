"use client";

/**
 * anime.js halo pulse over active run-of-show stages (spec deliverable 3, the
 * optional halo). A DOM overlay positioned at each active performance's
 * projected map point: a soft navy ring that pulses to draw extra attention to
 * the stages playing at the cursor `t`, layered on top of the deck.gl figure
 * size emphasis (PorchfestAffordanceMeshLayer) and the density ring
 * (PorchfestRunOfShowLayer).
 *
 * Honors prefers-reduced-motion: under reduced motion the ring is a static,
 * non-animated highlight rather than a pulse (spec acceptance 6). The layer is
 * pointer-events-none so it never intercepts a map gesture. Modeled on the
 * AtlasMap anime traffic overlay: the same animejs v4 createScope idiom and the
 * same map.project re-sync on map "move" / "zoom".
 */

import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { animate, createScope } from "animejs";

import type { RunOfShowPerformance } from "@/lib/porchfest/run-of-show";

interface HaloPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface RunOfShowHaloOverlayProps {
  /** Performances active at the cursor `t` (the stages to halo). */
  readonly performances: readonly RunOfShowPerformance[];
  /** The planner map, for projecting stage points to screen + move sync. */
  readonly map: MapRef | null;
  /** Run-of-show mode on. */
  readonly visible: boolean;
  readonly prefersReducedMotion: boolean;
}

export function RunOfShowHaloOverlay({
  performances,
  map,
  visible,
  prefersReducedMotion,
}: RunOfShowHaloOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<HaloPoint[]>([]);

  // Stable signature of the active set. The active-performances array is
  // rebuilt on every cursor tick, but its members are stable within a phase, so
  // keying the move listener on the id set (not the array identity) avoids
  // re-subscribing every frame during playback. Stage points are fixed, so a
  // reprojection is only needed when the active set changes or the map moves.
  const setKey = performances.map((p) => p.placementId).join("|");
  const perfRef = useRef(performances);

  useEffect(() => {
    perfRef.current = performances;
  }, [performances]);

  useEffect(() => {
    if (!map || !visible || perfRef.current.length === 0) {
      setPoints([]);
      return;
    }
    const reproject = () => {
      setPoints(
        perfRef.current.map((perf) => {
          const screen = map.project([perf.point[0], perf.point[1]]);
          return { id: perf.placementId, x: screen.x, y: screen.y };
        }),
      );
    };
    reproject();
    map.on("move", reproject);
    map.on("zoom", reproject);
    return () => {
      map.off("move", reproject);
      map.off("zoom", reproject);
    };
  }, [map, visible, setKey]);

  // anime.js pulse on each ring; skipped entirely under reduced motion (the
  // ring then keeps its static inline style below).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion || points.length === 0) return;
    const scope = createScope({ root }).add(() => {
      root
        .querySelectorAll<HTMLElement>("[data-run-of-show-halo-ring]")
        .forEach((ring, index) => {
          animate(ring, {
            scale: [0.55, 1.9],
            opacity: [0.5, 0],
            ease: "outSine",
            duration: 1700,
            loop: true,
            delay: index * 160,
          });
        });
    });
    return () => scope.revert();
  }, [prefersReducedMotion, points.length]);

  if (!visible || points.length === 0) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[10] overflow-hidden"
      data-run-of-show-halo
    >
      {points.map((point) => (
        <span
          key={point.id}
          className="absolute"
          style={{ left: point.x, top: point.y }}
        >
          <span
            data-run-of-show-halo-ring
            className="absolute block rounded-full"
            style={{
              left: -24,
              top: -24,
              width: 48,
              height: 48,
              border: "2px solid var(--ctx-accent)",
              boxShadow: "0 0 14px -2px var(--ctx-accent-glow)",
              // Reduced motion: a static, faint highlight (no pulse). Otherwise
              // start invisible at rest and let anime drive scale + opacity.
              opacity: prefersReducedMotion ? 0.45 : 0,
              transform: prefersReducedMotion ? "scale(1.15)" : undefined,
            }}
          />
        </span>
      ))}
    </div>
  );
}
