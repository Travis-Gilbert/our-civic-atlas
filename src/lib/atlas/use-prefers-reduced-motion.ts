"use client";

import { useEffect, useState } from "react";

/**
 * usePrefersReducedMotion - shared accessibility primitive.
 *
 * Returns true when the user has requested reduced motion via the OS
 * (`prefers-reduced-motion: reduce`). SSR-safe: returns false on the server and
 * for the first client paint, then syncs to the media query and tracks changes.
 *
 * Consumers MUST stop continuous / looping motion when this is true. For the
 * traffic flow layer that means pausing the particle tick and falling back to a
 * static congestion-coloured render: the flow still reads via colour and the
 * panel's numbers, so nothing is communicated by motion alone. This is the
 * project's vestibular-safety posture (cf. the atelier choreographer) applied to
 * the realtime traffic animation. See
 * docs/plans/traffic-domain-realtime/README.md (TR-10) and
 * docs/design/traffic-realtime-visual-register-proposal.md (accessibility).
 *
 * Note: AtlasMap.tsx already uses `window.matchMedia` for `(hover: hover)` and
 * `(max-width: 767px)`; this hook adds the missing motion query in one place so
 * the traffic tick and any future looping motion can share it.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersReducedMotion(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}
