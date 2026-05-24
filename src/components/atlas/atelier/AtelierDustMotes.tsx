"use client";

/**
 * AtelierDustMotes - PT-205
 *
 * Ambient particle field that drifts slowly through the atelier scene.
 * Per spec line 55: "A faint dust-mote ambient particle field drifts,
 * very slow."
 *
 * Implementation: R3F `<points>` with `BufferGeometry` updated in
 * `useFrame`. Particle count (40) and motion (vertical drift +
 * horizontal sin sway) per `animation-choreography.md` Stage 0 and
 * Decision 8 in the design proposal.
 *
 * Accessibility: prefers-reduced-motion removes the component entirely
 * (returns null). Static motes would read as dirt on the screen rather
 * than ambient atmosphere.
 *
 * Mounted inside `AtelierR3FScene` Canvas so the particles share the
 * camera + perspective with the building mesh.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Points } from "three";

type AtelierDustMotesProps = {
  /** Spatial extent (in scene units) the particle field spans on each
   * axis. Should comfortably surround the building. */
  extent: number;
  /** Vertical drift speed in scene units per second. Default matches
   * --atelier-motes-drift-y in atelier.css. */
  driftY?: number;
  /** Particle count. Default matches --atelier-motes-count. */
  count?: number;
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function AtelierDustMotes({
  extent,
  driftY = 0.05,
  count = 40,
}: AtelierDustMotesProps) {
  const reducedMotion = useReducedMotion();
  const pointsRef = useRef<Points>(null);

  // Initial particle state. Seeded with deterministic-ish randomness so
  // motes don't all snap to the same line on first frame.
  const { positions, swayPhases, swaySpeeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // Spread across extent x extent x extent, biased slightly toward
      // the camera-facing front so particles read against the dark
      // background.
      pos[i * 3] = (Math.random() - 0.5) * extent;
      pos[i * 3 + 1] = Math.random() * extent * 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * extent;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2x sway period
    }
    return { positions: pos, swayPhases: phases, swaySpeeds: speeds };
  }, [count, extent]);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.getAttribute("position") as BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = performance.now() * 0.001;

    for (let i = 0; i < count; i += 1) {
      // Vertical drift (upward by default; respawn at bottom when above
      // extent).
      arr[i * 3 + 1] += driftY * delta;
      if (arr[i * 3 + 1] > extent * 0.8) {
        arr[i * 3 + 1] = -extent * 0.1;
        arr[i * 3] = (Math.random() - 0.5) * extent;
        arr[i * 3 + 2] = (Math.random() - 0.5) * extent;
      }
      // Horizontal sin sway, period ~10s scaled by per-particle factor.
      arr[i * 3] += Math.sin(t * 0.628 * swaySpeeds[i] + swayPhases[i]) * 0.0004 * extent;
    }

    posAttr.needsUpdate = true;
  });

  if (reducedMotion) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={extent * 0.012}
        color="#cab8a0"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
