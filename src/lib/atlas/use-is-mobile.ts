"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is phone-sized.
 *
 * SSR-safe: starts false (the desktop assumption) so the server render and
 * the first client paint agree and there is no hydration mismatch, then
 * updates on mount and whenever the viewport crosses the breakpoint. 768px
 * matches the atlas isMobileViewport break, so the porchfest chrome folds
 * into the Dynamic Island at the same width the atlas does.
 */
export function useIsMobile(maxWidth = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [maxWidth]);

  return isMobile;
}
